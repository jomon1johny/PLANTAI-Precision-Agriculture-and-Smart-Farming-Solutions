from rest_framework import serializers
from .models import ScanRecord, InfectedRegion

class InfectedRegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InfectedRegion
        fields = ['id', 'disease_name', 'x_min', 'y_min', 'width', 'height']


class ScanRecordSerializer(serializers.ModelSerializer):
    infected_regions = InfectedRegionSerializer(many=True, read_only=True)
    
    class Meta:
        model = ScanRecord
        fields = [
            'id', 'image', 'timestamp', 'crop_type', 'disease_name', 
            'severity', 'health_percentage', 'confidence_score', 
            'recommendation', 'infected_regions'
        ]
