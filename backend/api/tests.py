from django.test import TestCase
from PIL import Image
import tempfile
import os

from .models import ScanRecord, InfectedRegion
from .analyzer import analyze_leaf_image

class PlantAITestCase(TestCase):
    def setUp(self):
        # Create a temporary image file for analysis testing
        # We set delete=False and close it immediately so Windows doesn't lock it.
        self.temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
        self.temp_path = self.temp_file.name
        self.temp_file.close()

        # Save a simple green image to the path
        img = Image.new('RGB', (100, 100), color=(50, 180, 50))  # Green healthy leaf color
        img.save(self.temp_path)

    def tearDown(self):
        # Clean up temporary file
        if os.path.exists(self.temp_path):
            os.remove(self.temp_path)

    def test_analyzer_healthy_leaf(self):
        """Test that a healthy green image gets classified as healthy with high health score."""
        result = analyze_leaf_image(self.temp_path, 'tomato')
        self.assertIn('disease_name', result)
        self.assertIn('health_percentage', result)
        self.assertIn('bounding_boxes', result)
        self.assertGreaterEqual(result['health_percentage'], 90.0)
        self.assertEqual(result['severity'], 'Healthy')
        self.assertEqual(len(result['bounding_boxes']), 0)

    def test_scan_record_creation(self):
        """Test that ScanRecord and InfectedRegion models can be saved and retrieved."""
        scan = ScanRecord.objects.create(
            image=self.temp_path,
            crop_type='tomato',
            disease_name='Tomato Early Blight',
            severity='Medium',
            health_percentage=72.5,
            confidence_score=0.88,
            recommendation='Apply copper fungicide.'
        )
        self.assertEqual(ScanRecord.objects.count(), 1)
        
        region = InfectedRegion.objects.create(
            scan_record=scan,
            disease_name='Tomato Early Blight',
            x_min=0.1,
            y_min=0.2,
            width=0.3,
            height=0.4
        )
        self.assertEqual(InfectedRegion.objects.count(), 1)
        self.assertEqual(scan.infected_regions.count(), 1)
        self.assertEqual(scan.infected_regions.first().x_min, 0.1)

    def test_analyzer_non_leaf_image(self):
        """Test that an image with no green/infected leaf pixels returns a validation error."""
        # Create a plain white image (255, 255, 255)
        white_temp = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
        white_path = white_temp.name
        white_temp.close()
        try:
            img = Image.new('RGB', (100, 100), color=(255, 255, 255))
            img.save(white_path)
            result = analyze_leaf_image(white_path, 'tomato')
            self.assertIn('error', result)
            self.assertEqual(result['error'], 'No leaf detected in the center of the image. Please capture the leaf in the foreground and center of the frame.')
        finally:
            if os.path.exists(white_path):
                os.remove(white_path)

    def test_analyzer_skin_tone_image(self):
        """Test that an image with simulated human skin tone gets rejected."""
        # Create a simulated skin tone image (e.g. pinkish-tan: 200, 130, 100)
        skin_temp = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
        skin_path = skin_temp.name
        skin_temp.close()
        try:
            img = Image.new('RGB', (100, 100), color=(200, 130, 100))
            img.save(skin_path)
            result = analyze_leaf_image(skin_path, 'tomato')
            self.assertIn('error', result)
            self.assertIn('person or skin tones', result['error'])
        finally:
            if os.path.exists(skin_path):
                os.remove(skin_path)
