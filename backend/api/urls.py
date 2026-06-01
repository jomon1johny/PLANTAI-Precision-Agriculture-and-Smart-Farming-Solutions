from django.urls import path
from .views import (
    ScanUploadView, ScanHistoryView, DashboardStatsView,
    RegisterView, LoginView, LogoutView, UserView
)

urlpatterns = [
    path('scans/upload/', ScanUploadView.as_view(), name='scan-upload'),
    path('scans/history/', ScanHistoryView.as_view(), name='scan-history'),
    path('scans/history/<int:pk>/', ScanHistoryView.as_view(), name='scan-detail-delete'),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    
    # Auth endpoints
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/user/', UserView.as_view(), name='auth-user'),
]
