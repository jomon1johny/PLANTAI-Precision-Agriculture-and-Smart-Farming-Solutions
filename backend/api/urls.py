from django.urls import path
from .views import ScanUploadView, ScanHistoryView, DashboardStatsView

urlpatterns = [
    path('scans/upload/', ScanUploadView.as_view(), name='scan-upload'),
    path('scans/history/', ScanHistoryView.as_view(), name='scan-history'),
    path('scans/history/<int:pk>/', ScanHistoryView.as_view(), name='scan-detail-delete'),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
]
