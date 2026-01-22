#!/usr/bin/env python3
"""Debug face crop detection"""
import sys
import cv2
import numpy as np
from PIL import Image

if len(sys.argv) < 2:
    print("Usage: debug_crop.py <image_path>")
    sys.exit(1)

img_path = sys.argv[1]
img = Image.open(img_path).convert('RGB')
img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
h, w = img_cv.shape[:2]

print(f"Image size: {w}x{h}")

# Test different Haar parameters
cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
cascade = cv2.CascadeClassifier(cascade_path)

# Default parameters
faces1 = cascade.detectMultiScale(img_cv, scaleFactor=1.3, minNeighbors=4, minSize=(30, 30))
print(f"Default params (1.3, 4): {len(faces1)} faces")
for i, (x, y, fw, fh) in enumerate(faces1):
    print(f"  Face {i}: x={x}, y={y}, w={fw}, h={fh}, area={fw*fh}")

# Tighter parameters
faces2 = cascade.detectMultiScale(img_cv, scaleFactor=1.05, minNeighbors=5, minSize=(30, 30))
print(f"Tighter params (1.05, 5): {len(faces2)} faces")
for i, (x, y, fw, fh) in enumerate(faces2):
    print(f"  Face {i}: x={x}, y={y}, w={fw}, h={fh}, area={fw*fh}")

# Even tighter
faces3 = cascade.detectMultiScale(img_cv, scaleFactor=1.1, minNeighbors=6, minSize=(40, 40))
print(f"Even tighter (1.1, 6): {len(faces3)} faces")
for i, (x, y, fw, fh) in enumerate(faces3):
    print(f"  Face {i}: x={x}, y={y}, w={fw}, h={fh}, area={fw*fh}")
