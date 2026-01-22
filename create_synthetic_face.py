#!/usr/bin/env python3
"""Create a more realistic face image using numpy and PIL"""

from PIL import Image, ImageDraw, ImageFilter, ImageOps
import numpy as np
import random

def create_realistic_synthetic_face(output_path='synthetic_face.jpg', size=(600, 800)):
    """Create a more realistic synthetic face that passes face detection"""
    width, height = size
    
    # Create base image with skin tone gradient
    img = Image.new('RGB', (width, height), color=(220, 200, 180))
    pixels = img.load()
    
    # Create smoother gradient for skin tone
    for y in range(height):
        for x in range(width):
            # Add subtle variation for realism
            r = int(220 - (y / height) * 20 + random.randint(-5, 5))
            g = int(200 - (y / height) * 15 + random.randint(-5, 5))
            b = int(180 - (y / height) * 10 + random.randint(-5, 5))
            pixels[x, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))
    
    draw = ImageDraw.Draw(img)
    
    # Face outline - larger and more defined
    face_width = int(width * 0.5)
    face_height = int(height * 0.65)
    face_left = (width - face_width) // 2
    face_top = int(height * 0.1)
    face_right = face_left + face_width
    face_bottom = face_top + face_height
    
    # Draw face shape (slightly larger ellipse)
    draw.ellipse(
        [face_left - 20, face_top - 20, face_right + 20, face_bottom + 20],
        fill=(225, 200, 170),
        outline=(100, 80, 60),
        width=3
    )
    
    # Draw natural hair
    hair_color = (40, 30, 20)
    draw.ellipse(
        [face_left - 10, face_top - 80, face_right + 10, face_top + 30],
        fill=hair_color,
        outline=(20, 15, 10),
        width=2
    )
    
    # Add hair texture lines
    for i in range(5):
        x_offset = random.randint(-30, 30)
        draw.line(
            [(face_left + x_offset, face_top - 80 + i*15),
             (face_left + x_offset + 50, face_top - 70 + i*15)],
            fill=(30, 20, 10),
            width=2
        )
    
    # Eye positions
    eye_y = face_top + int(face_height * 0.35)
    left_eye_x = face_left + int(face_width * 0.3)
    right_eye_x = face_left + int(face_width * 0.7)
    eye_radius = int(face_width * 0.08)
    
    # Draw eyes - whites
    for eye_x in [left_eye_x, right_eye_x]:
        draw.ellipse(
            [eye_x - eye_radius, eye_y - eye_radius,
             eye_x + eye_radius, eye_y + eye_radius],
            fill='white',
            outline=(50, 50, 50),
            width=2
        )
        
        # Pupils - offset for realism
        pupil_offset_x = int(eye_radius * 0.2)
        pupil_offset_y = int(eye_radius * 0.1)
        pupil_radius = int(eye_radius * 0.5)
        draw.ellipse(
            [eye_x - pupil_radius + pupil_offset_x, eye_y - pupil_radius + pupil_offset_y,
             eye_x + pupil_radius + pupil_offset_x, eye_y + pupil_radius + pupil_offset_y],
            fill='black'
        )
        
        # Eye shine
        shine_radius = int(pupil_radius * 0.4)
        draw.ellipse(
            [eye_x - shine_radius + pupil_offset_x - 2, eye_y - shine_radius + pupil_offset_y - 2,
             eye_x + shine_radius + pupil_offset_x - 2, eye_y + shine_radius + pupil_offset_y - 2],
            fill='white'
        )
    
    # Eyebrows
    brow_y = eye_y - int(eye_radius * 1.3)
    brow_width = int(eye_radius * 1.5)
    
    # Left eyebrow
    draw.arc(
        [left_eye_x - brow_width, brow_y - 10,
         left_eye_x + brow_width, brow_y + 10],
        0, 180,
        fill=(30, 20, 10),
        width=3
    )
    # Right eyebrow
    draw.arc(
        [right_eye_x - brow_width, brow_y - 10,
         right_eye_x + brow_width, brow_y + 10],
        0, 180,
        fill=(30, 20, 10),
        width=3
    )
    
    # Nose
    nose_x = width // 2
    nose_y = face_top + int(face_height * 0.5)
    nose_width = int(face_width * 0.15)
    draw.polygon(
        [(nose_x, nose_y), 
         (nose_x - nose_width//2, nose_y + nose_width),
         (nose_x + nose_width//2, nose_y + nose_width)],
        fill=(200, 170, 150),
        outline=(150, 130, 110)
    )
    
    # Mouth
    mouth_y = face_top + int(face_height * 0.75)
    mouth_width = int(face_width * 0.25)
    # Upper lip
    draw.arc(
        [nose_x - mouth_width, mouth_y, nose_x + mouth_width, mouth_y + 20],
        0, 180,
        fill=(180, 100, 80),
        width=3
    )
    # Lower lip
    draw.arc(
        [nose_x - mouth_width, mouth_y + 10, nose_x + mouth_width, mouth_y + 30],
        0, 180,
        fill=(140, 70, 50),
        width=2
    )
    
    # Cheeks (blush)
    cheek_radius = int(face_width * 0.12)
    for cheek_x in [left_eye_x - int(face_width*0.2), right_eye_x + int(face_width*0.2)]:
        draw.ellipse(
            [cheek_x - cheek_radius, mouth_y - int(face_height*0.2) - cheek_radius,
             cheek_x + cheek_radius, mouth_y - int(face_height*0.2) + cheek_radius],
            fill=(240, 180, 170)
        )
    
    # Add slight blur for smoothness
    img = img.filter(ImageFilter.GaussianBlur(radius=0.5))
    
    img.save(output_path, quality=95)
    print(f"✓ Created realistic synthetic face: {output_path}")
    return output_path

if __name__ == '__main__':
    create_realistic_synthetic_face()
