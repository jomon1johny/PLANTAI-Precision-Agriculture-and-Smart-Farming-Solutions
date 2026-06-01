from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status, permissions
from django.db.models import Avg, Count
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

from .models import ScanRecord, InfectedRegion
from .serializers import ScanRecordSerializer
from .analyzer import analyze_leaf_image

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')

        if not username or not password:
            return Response({'error': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, email=email, password=password)
        token, created = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({'error': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=username, password=password)
        if not user:
            return Response({'error': 'Invalid username or password'}, status=status.HTTP_400_BAD_REQUEST)

        token, created = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            request.user.auth_token.delete()
            return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response({
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email
        }, status=status.HTTP_200_OK)


class ScanUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        crop_type = request.data.get('crop_type', 'other')
        image_file = request.FILES.get('image')

        if not image_file:
            return Response({'error': 'No image file provided'}, status=status.HTTP_400_BAD_REQUEST)

        # Create temporary ScanRecord to save the image to disk
        scan = ScanRecord(
            user=request.user,
            image=image_file,
            crop_type=crop_type,
            disease_name='Analyzing...',
            severity='Unknown',
            health_percentage=100.0,
            confidence_score=0.0
        )
        scan.save()

        # Run high-fidelity color analysis
        analysis = analyze_leaf_image(scan.image.path, crop_type)

        if 'error' in analysis:
            # Clean up the file from disk and delete the temporary scan record
            if scan.image:
                scan.image.delete(save=False)
            scan.delete()
            return Response({'error': analysis['error']}, status=status.HTTP_400_BAD_REQUEST)

        # Update ScanRecord with results
        scan.disease_name = analysis['disease_name']
        scan.severity = analysis['severity']
        scan.health_percentage = analysis['health_percentage']
        scan.confidence_score = analysis['confidence_score']
        scan.recommendation = analysis['recommendation']
        scan.save()

        # Save bounding boxes
        for box in analysis['bounding_boxes']:
            InfectedRegion.objects.create(
                scan_record=scan,
                disease_name=box['disease_name'],
                x_min=box['x_min'],
                y_min=box['y_min'],
                width=box['width'],
                height=box['height']
            )

        serializer = ScanRecordSerializer(scan)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ScanHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        scans = ScanRecord.objects.filter(user=request.user).prefetch_related('infected_regions').order_by('-timestamp')

        # Filters
        crop_type = request.query_params.get('crop_type')
        severity = request.query_params.get('severity')
        search = request.query_params.get('search')

        if crop_type:
            scans = scans.filter(crop_type=crop_type)
        if severity:
            scans = scans.filter(severity=severity)
        if search:
            scans = scans.filter(disease_name__icontains=search) | scans.filter(recommendation__icontains=search)

        serializer = ScanRecordSerializer(scans, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk, *args, **kwargs):
        try:
            scan = ScanRecord.objects.get(pk=pk, user=request.user)
            scan.delete()
            return Response({'message': 'Scan deleted successfully'}, status=status.HTTP_200_OK)
        except ScanRecord.DoesNotExist:
            return Response({'error': 'Scan not found'}, status=status.HTTP_404_NOT_FOUND)


class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        scans = ScanRecord.objects.filter(user=request.user)
        total_scans = scans.count()

        if total_scans == 0:
            return Response({
                'total_scans': 0,
                'average_health': 100.0,
                'active_diseases_count': 0,
                'crop_distribution': [],
                'disease_distribution': [],
                'recent_trends': []
            }, status=status.HTTP_200_OK)

        # Average crop health
        avg_health = scans.aggregate(Avg('health_percentage'))['health_percentage__avg'] or 100.0

        # Unique active diseases count (excluding healthy ones)
        active_diseases_count = scans.exclude(severity='Healthy').values('disease_name').distinct().count()

        # Distribution of crops
        crop_dist = scans.values('crop_type').annotate(count=Count('id')).order_by('-count')
        # Distribution of diseases
        disease_dist = scans.exclude(severity='Healthy').values('disease_name').annotate(count=Count('id')).order_by('-count')

        # Recent trends: Last 10 scans sorted chronologically
        recent_scans = scans.order_by('-timestamp')[:10]
        recent_trends = []
        for s in reversed(recent_scans):
            recent_trends.append({
                'id': s.id,
                'timestamp': s.timestamp.isoformat(),
                'crop_type': s.crop_type,
                'disease_name': s.disease_name,
                'health_percentage': s.health_percentage
            })

        return Response({
            'total_scans': total_scans,
            'average_health': round(avg_health, 1),
            'active_diseases_count': active_diseases_count,
            'crop_distribution': list(crop_dist),
            'disease_distribution': list(disease_dist),
            'recent_trends': recent_trends
        }, status=status.HTTP_200_OK)
