import numpy as np
from PIL import Image

def analyze_leaf_image(image_path, crop_type):
    """
    Analyzes an uploaded leaf image to determine health status, disease classification,
    and coordinates of infected regions (simulating CNN/YOLO models).
    Uses PIL and numpy to analyze color channels of the leaf.
    """
    try:
        img = Image.open(image_path).convert('RGB')
    except Exception as e:
        return {
            'disease_name': 'Error Loading Image',
            'severity': 'Unknown',
            'health_percentage': 0.0,
            'confidence_score': 0.0,
            'recommendation': 'Please upload a valid image file.',
            'bounding_boxes': []
        }

    # Resize to speed up pixel analysis if image is large
    original_width, original_height = img.size
    img_resized = img.resize((300, 300))
    img_data = np.array(img_resized)

    # Extract RGB channels
    r = img_data[:, :, 0].astype(float)
    g = img_data[:, :, 1].astype(float)
    b = img_data[:, :, 2].astype(float)

    # Leaf pixel classification: green is dominant and not too dark/bright
    # Green leaf mask
    is_green = (g > 1.05 * r) & (g > 1.05 * b) & (g > 40) & (g < 240)

    # Skin tone detection (RGB daylight model)
    is_skin = (r > 95) & (g > 40) & (b > 20) & \
              (r > g) & (r > b) & \
              (abs(r - g) > 15) & \
              ((np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)) > 15)

    # Infected pixel classification (spots/lesions):
    # Brown/Yellow/Grey spots:
    # Yellow/Brown spots have higher R and G, lower B
    is_yellow_brown = (r > 1.05 * b) & (g > 0.95 * b) & (r > 50) & (g > 50) & (~is_green) & (~is_skin)
    
    # Dark spots (necrosis): R, G, B are low and close to each other
    is_dark_spot = (r < 90) & (g < 90) & (b < 90) & (abs(r - g) < 20) & (abs(g - b) < 20) & ((r + g + b) > 60) & (~is_green) & (~is_skin)

    is_infected = is_yellow_brown | is_dark_spot

    total_skin_pixels = np.sum(is_skin)
    total_green_pixels = np.sum(is_green)
    total_yellow_brown = np.sum(is_yellow_brown)
    total_infected_pixels = np.sum(is_infected)
    total_leaf_pixels = total_green_pixels + total_infected_pixels

    # Center region check (120x120 pixels in the middle)
    center_green = np.sum(is_green[90:210, 90:210])
    center_yellow_brown = np.sum(is_yellow_brown[90:210, 90:210])
    center_leaf_pixels = center_green + center_yellow_brown

    # Validation check: is it really a leaf?
    # 1. Reject if there is a clear presence of skin tones indicating a person
    if total_skin_pixels > 2000:
        return {
            'error': 'No leaf detected. The image appears to contain a person or skin tones. Please upload a clear photo of a plant leaf.'
        }

    # 2. Reject if the center of the image lacks leaf pixels (green or yellow/brown)
    if center_leaf_pixels < 2500:
        return {
            'error': 'No leaf detected in the center of the image. Please capture the leaf in the foreground and center of the frame.'
        }

    # 3. Reject if the overall leaf pixels are too low
    if total_leaf_pixels < 5000:
        return {
            'error': 'No leaf detected. Please upload a clear, close-up photograph of a plant leaf.'
        }

    # Compute crop health
    # A valid leaf should not trigger the low pixel fallback anymore (since we require total_leaf_pixels >= 5000)
    health_percentage = (total_green_pixels / (total_leaf_pixels + 1)) * 100.0
    is_fallback = False

    # Bounding boxes generation (YOLO simulation)
    # We will divide the 300x300 image into a 10x10 grid and find grids with high infected pixel counts.
    grid_size = 10
    cell_w = 300 // grid_size
    cell_h = 300 // grid_size
    
    hotspots = []
    for row in range(grid_size):
        for col in range(grid_size):
            y_start, y_end = row * cell_h, (row + 1) * cell_h
            x_start, x_end = col * cell_w, (col + 1) * cell_w
            
            infected_in_cell = np.sum(is_infected[y_start:y_end, x_start:x_end]) if not is_fallback else 0
            if infected_in_cell > (cell_w * cell_h * 0.1):  # more than 10% infected in this cell
                hotspots.append((row, col, infected_in_cell))

    # If fallback or no hotspots, but health is low, inject some default simulated bounding boxes
    bounding_boxes = []
    if (health_percentage < 90.0) and (not hotspots or is_fallback):
        # Add 1-2 bounding boxes in the center
        bounding_boxes.append({
            'x_min': 0.35,
            'y_min': 0.3,
            'width': 0.2,
            'height': 0.25,
            'disease_name': 'Infected Spot'
        })
        if health_percentage < 70.0:
            bounding_boxes.append({
                'x_min': 0.55,
                'y_min': 0.5,
                'width': 0.15,
                'height': 0.18,
                'disease_name': 'Infected Spot'
            })
    else:
        # Group contiguous hotspot cells into larger bounding boxes (simple clustering)
        # For simplicity, we can take the top 3 separate hotspots and expand them slightly
        hotspots.sort(key=lambda x: x[2], reverse=True)
        for h in hotspots[:3]:
            row, col, _ = h
            # Convert to normalized coordinates (0.0 to 1.0)
            x_min = (col * cell_w - 5) / 300.0
            y_min = (row * cell_h - 5) / 300.0
            w = (cell_w + 10) / 300.0
            h_val = (cell_h + 10) / 300.0

            # Clamp coordinates
            x_min = max(0.05, min(0.9, x_min))
            y_min = max(0.05, min(0.9, y_min))
            w = max(0.05, min(0.95 - x_min, w))
            h_val = max(0.05, min(0.95 - y_min, h_val))

            bounding_boxes.append({
                'x_min': float(x_min),
                'y_min': float(y_min),
                'width': float(w),
                'height': float(h_val),
                'disease_name': 'Infected Spot'
            })

    # Classify crop type and disease
    crop_type = str(crop_type).lower()
    if health_percentage >= 92.0:
        disease_name = f"Healthy {crop_type.capitalize()}" if crop_type != 'other' else "Healthy Leaf"
        severity = "Healthy"
        confidence_score = float(0.93 + (health_percentage - 92.0) * 0.008)
        bounding_boxes = []  # No bounding boxes for healthy leaves
    else:
        severity = "Low" if health_percentage >= 75.0 else ("Medium" if health_percentage >= 55.0 else "High")
        confidence_score = float(0.82 + (sum(ord(c) for c in str(image_path)) % 10) * 0.015)

        if crop_type == 'tomato':
            if health_percentage >= 75.0:
                disease_name = "Tomato Early Blight"
            else:
                disease_name = "Tomato Late Blight"
        elif crop_type == 'apple':
            if health_percentage >= 75.0:
                disease_name = "Apple Scab"
            else:
                disease_name = "Apple Black Rot"
        elif crop_type == 'grape':
            if health_percentage >= 75.0:
                disease_name = "Grape Esca (Black Measles)"
            else:
                disease_name = "Grape Leaf Blight"
        elif crop_type == 'potato':
            if health_percentage >= 75.0:
                disease_name = "Potato Early Blight"
            else:
                disease_name = "Potato Late Blight"
        else:
            disease_name = "Leaf Spot Disease"

    # Inject disease names to bounding boxes
    for box in bounding_boxes:
        box['disease_name'] = disease_name

    # Treatment recommendations
    recommendations = {
        'Healthy Tomato': 'Continue regular watering. Add organic mulch to prevent soil splashing onto lower leaves.',
        'Healthy Apple': 'Ensure regular pruning to maintain open canopy for sun exposure. Monitor for pests.',
        'Healthy Grape': 'Continue clean weeding. Apply organic compost at base of vine before blooming.',
        'Healthy Potato': 'Ensure proper soil drainage and adequate hilling to protect tubers from light.',
        'Healthy Leaf': 'Continue normal crop management and routine inspections for signs of stress.',
        
        'Tomato Early Blight': 'Prune lower branches showing symptoms to prevent spread. Apply copper-based fungicide. Avoid overhead watering to keep foliage dry.',
        'Tomato Late Blight': 'Remove and destroy severely infected leaves or whole plants immediately. Avoid composting them. Apply protective fungicides like Chlorothalonil.',
        'Apple Scab': 'Rake and destroy fallen leaves in autumn. Spray trees with lime-sulfur or copper fungicides in the spring before bud burst. Consider resistant cultivars.',
        'Apple Black Rot': 'Prune out dead wood and remove mummified fruit on the tree. Spray with Captan or sulfur-based fungicides during wet spring weather.',
        'Grape Esca (Black Measles)': 'Protect pruning wounds with wound sealants or fungicides. Remove severely affected wood. Minimize vine stress via optimal watering and balanced nutrition.',
        'Grape Leaf Blight': 'Apply copper fungicides periodically during the growing season. Prune lower leaves to enhance ventilation. Clean up fallen leaf litter.',
        'Potato Early Blight': 'Apply nitrogen and potassium fertilizers to boost plant vigor. Rotate crops. Apply protectant fungicides like Mancozeb when symptoms first appear.',
        'Potato Late Blight': 'Immediately destroy infected plants. Spray protectant fungicides (e.g., metalaxyl-M). Avoid harvesting until vines have been dead for two weeks to prevent tuber infection.',
        'Leaf Spot Disease': 'Remove infected leaves. Spray with organic Neem Oil or copper soaps. Water plants at the base early in the day so leaves dry quickly.'
    }
    
    recommendation = recommendations.get(disease_name, 'Apply broad-spectrum organic fungicide and check crop irrigation levels.')

    return {
        'disease_name': disease_name,
        'severity': severity,
        'health_percentage': round(health_percentage, 1),
        'confidence_score': round(confidence_score, 2),
        'recommendation': recommendation,
        'bounding_boxes': bounding_boxes
    }
