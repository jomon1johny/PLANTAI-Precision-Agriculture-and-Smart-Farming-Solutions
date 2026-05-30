from django.db import models

class ScanRecord(models.Model):
    CROP_CHOICES = [
        ('tomato', 'Tomato'),
        ('apple', 'Apple'),
        ('grape', 'Grape'),
        ('potato', 'Potato'),
        ('other', 'Other'),
    ]

    image = models.ImageField(upload_to='scans/')
    timestamp = models.DateTimeField(auto_now_add=True)
    crop_type = models.CharField(max_length=50, choices=CROP_CHOICES, default='other')
    disease_name = models.CharField(max_length=100)
    severity = models.CharField(max_length=20, default='Low')  # Healthy, Low, Medium, High
    health_percentage = models.FloatField(default=100.0)      # 0 to 100
    confidence_score = models.FloatField(default=1.0)          # 0.0 to 1.0
    recommendation = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.crop_type} - {self.disease_name} ({self.timestamp.strftime('%Y-%m-%d %H:%M')})"


class InfectedRegion(models.Model):
    scan_record = models.ForeignKey(ScanRecord, related_name='infected_regions', on_delete=models.CASCADE)
    disease_name = models.CharField(max_length=100)
    
    # YOLO coordinates normalized (0.0 to 1.0) relative to image width/height
    x_min = models.FloatField()
    y_min = models.FloatField()
    width = models.FloatField()
    height = models.FloatField()

    def __str__(self):
        return f"{self.disease_name} Spot at ({self.x_min:.2f}, {self.y_min:.2f})"
