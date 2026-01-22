#!/usr/bin/env python3
"""Create a more realistic face image for testing"""

from PIL import Image, ImageDraw
import numpy as np

def create_face_image(output_path, width=400, height=500):
    """Create a face-like image that InsightFace can detect"""
    # Create white background
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)
    
    # Draw face outline (circle)
    face_left = 80
    face_top = 50
    face_right = 320
    face_bottom = 380
    draw.ellipse([face_left, face_top, face_right, face_bottom], fill='peachpuff', outline='black', width=3)
    
    # Draw ears
    draw.ellipse([30, 120, 60, 180], fill='peachpuff', outline='black', width=2)
    draw.ellipse([340, 120, 370, 180], fill='peachpuff', outline='black', width=2)
    
    # Draw hair (filled rectangle at top)
    draw.rectangle([60, 30, 340, 80], fill='saddlebrown')
    
    # Draw forehead shading
    for i in range(5):
        shade = 200 - i*20
        draw.rectangle([100+i*2, 70, 300-i*2, 85], fill=(int(shade*1.1), int(shade*0.9), shade))
    
    # Draw left eye
    left_eye_x, left_eye_y = 150, 150
    draw.ellipse([left_eye_x-15, left_eye_y-15, left_eye_x+15, left_eye_y+15], fill='white', outline='black', width=2)
    draw.ellipse([left_eye_x-8, left_eye_y-8, left_eye_x+8, left_eye_y+8], fill='black')
    draw.ellipse([left_eye_x-3, left_eye_y-5, left_eye_x+3, left_eye_y-1], fill='white')
    
    # Draw right eye
    right_eye_x, right_eye_y = 250, 150
    draw.ellipse([right_eye_x-15, right_eye_y-15, right_eye_x+15, right_eye_y+15], fill='white', outline='black', width=2)
    draw.ellipse([right_eye_x-8, right_eye_y-8, right_eye_x+8, right_eye_y+8], fill='black')
    draw.ellipse([right_eye_x-3, right_eye_y-5, right_eye_x+3, right_eye_y-1], fill='white')
    
    # Draw eyebrows
    draw.line([(140, 120), (160, 110)], fill='black', width=2)
    draw.line([(240, 110), (260, 120)], fill='black', width=2)
    
    # Draw nose
    draw.polygon([(200, 160), (190, 210), (210, 210)], fill='peachpuff', outline='black')
    
    # Draw nostrils
    draw.ellipse([190, 210, 195, 215], fill='black')
    draw.ellipse([205, 210, 210, 215], fill='black')
    
    # Draw mouth
    draw.arc([170, 220, 230, 260], 0, 180, fill='red', width=3)
    # Mouth fill
    for y in range(230, 245):
        draw.line([(175, y), (225, y)], fill='pink')
    
    # Draw cheeks (rosy)
    draw.ellipse([100, 200, 130, 230], fill='lightpink')
    draw.ellipse([270, 200, 300, 230], fill='lightpink')
    
    # Draw chin shading
    draw.ellipse([150, 320, 250, 380], fill='navajowhite')
    
    img.save(output_path)
    print(f"Created realistic face image: {output_path}")
    return output_path

if __name__ == '__main__':
    create_face_image('test_face.jpg')
