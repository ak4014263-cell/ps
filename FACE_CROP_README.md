# Face Crop Utility using MTCNN

This utility detects faces in images using MTCNN (Multi-task Cascaded Convolutional Networks) and automatically crops them with configurable padding.

## Installation

The required packages are already installed:
- `mtcnn` - Multi-task Cascaded Convolutional Networks for face detection
- `opencv-python` (cv2) - Image processing
- `tensorflow` - Deep learning framework (required by MTCNN)

## Features

- 🎯 Automatic face detection in images
- ✂️ Intelligent face cropping with padding
- 📦 Batch processing of multiple images
- 📊 Detailed detection confidence scores
- 🔧 Configurable padding around detected faces

## Usage

### Single Image Crop

```bash
python backend/face-crop.py <image_path> -o <output_path> [-p padding]
```

**Example:**
```bash
python backend/face-crop.py photo.jpg -o cropped_photo.jpg -p 30
```

**Parameters:**
- `image_path`: Path to input image file
- `-o, --output`: Output path for cropped face (optional)
- `-p, --padding`: Pixels to add around face (default: 20)

**Output:**
```json
{
  "success": true,
  "faces_detected": 1,
  "face_index": 0,
  "confidence": 0.98,
  "original_size": {"width": 1280, "height": 720},
  "crop_box": {"x": 150, "y": 100, "width": 400, "height": 450},
  "cropped_size": {"width": 400, "height": 450},
  "saved_to": "cropped_photo.jpg"
}
```

### Batch Processing

```bash
python backend/face-crop.py <input_dir> --batch --output-dir <output_dir> [-p padding]
```

**Example:**
```bash
python backend/face-crop.py ./photos --batch --output-dir ./cropped_photos -p 20
```

**Parameters:**
- `input_dir`: Directory containing images
- `--batch`: Enable batch processing mode
- `--output-dir`: Directory to save cropped faces
- `-p, --padding`: Padding around face (default: 20)

**Output:**
```json
[
  {
    "success": true,
    "faces_detected": 1,
    "confidence": 0.97,
    "input_file": "photo1.jpg",
    "output_file": "cropped_photo1.jpg",
    "cropped_size": {"width": 350, "height": 400}
  },
  {
    "success": false,
    "error": "No faces detected",
    "input_file": "photo2.jpg",
    "output_file": null
  }
]
```

## Node.js Integration

Use the Node.js wrapper to call face cropping from your Express backend:

```javascript
import { cropFace, cropFaceBatch } from './lib/face-crop.js';

// Single image
try {
  const result = await cropFace('./uploads/original.jpg', './uploads/cropped.jpg', 20);
  console.log('Face cropped:', result);
} catch (error) {
  console.error('Crop failed:', error);
}

// Batch processing
try {
  const results = await cropFaceBatch('./uploads/input', './uploads/output', 20);
  console.log('Batch complete:', results);
} catch (error) {
  console.error('Batch failed:', error);
}
```

## API Endpoints (Future)

Planned endpoints for the backend:

```
POST /api/image-tools/crop-face
  Body: { imagePath, outputPath, padding }
  
POST /api/image-tools/crop-batch
  Body: { inputDir, outputDir, padding }
```

## How It Works

1. **Image Loading**: Loads image using OpenCV (supports JPG, PNG, BMP, etc.)
2. **Face Detection**: Uses MTCNN to detect all faces and their confidence scores
3. **Largest Face**: Selects the largest detected face by area
4. **Padding Addition**: Expands crop box by specified padding in all directions
5. **Boundary Clipping**: Ensures crop box stays within image boundaries
6. **Face Cropping**: Extracts the cropped face region
7. **File Saving**: Saves cropped face to output path (if provided)

## Parameters

### Padding
- **Default**: 20 pixels
- **Recommended**: 10-40 pixels
- **Higher values**: More context around face
- **Lower values**: Tighter crop focused on face

### Confidence Score
- **Range**: 0.0 to 1.0
- **Meaning**: How confident MTCNN is about the detection
- **Typical**: 0.95+ for good detections

## Troubleshooting

### "No faces detected"
- Ensure image has a clear, visible face
- Try adjusting lighting or image quality
- MTCNN may struggle with very small faces

### Module errors
- Run: `pip install -r requirements.txt`
- Or manually: `pip install mtcnn opencv-python tensorflow`

### Slow performance
- TensorFlow loads models on first run (may take 5-10 seconds)
- Subsequent crops are faster
- GPU acceleration available if CUDA is installed

## Performance

- **First Run**: 5-10 seconds (TensorFlow model loading)
- **Single Image**: 0.5-2 seconds (depends on image size)
- **Batch Processing**: Linear with image count

## Examples

### Web App Integration
```javascript
// Crop user-uploaded profile photos
app.post('/api/photos/crop', async (req, res) => {
  try {
    const result = await cropFace(req.body.imagePath, req.body.outputPath);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### Process Bulk Data
```javascript
// Auto-crop all photos in a dataset
const results = await cropFaceBatch('./dataset/raw', './dataset/cropped', 25);
const successful = results.filter(r => r.success).length;
console.log(`Cropped ${successful}/${results.length} photos`);
```

## License

MTCNN is licensed under MIT. OpenCV is licensed under BSD. TensorFlow is licensed under Apache 2.0.
