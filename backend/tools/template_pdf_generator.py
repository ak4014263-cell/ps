#!/usr/bin/env python3
"""
Template-based PDF Generator matching the grid layout example
"""

import os
import sys
import json
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from PIL import Image as PILImage

class TemplatePDFGenerator:
    def __init__(self):
        self.page_width, self.page_height = A4
    
    def substitute_fields(self, text, record):
        """Substitute template fields with record data"""
        if not text or not isinstance(text, str):
            return text
        
        substitutions = {
            '{{name}}': record.get('displayName', ''),
            '{{firstName}}': record.get('data_json', {}).get('firstName', ''),
            '{{Name}}': record.get('data_json', {}).get('Name', ''),
            '{{record_number}}': str(record.get('record_number', '')),
            '{{class}}': record.get('data_json', {}).get('class', ''),
            '{{dob}}': record.get('data_json', {}).get('dob', ''),
            '{{id}}': record.get('id', ''),
        }
        
        result = text
        for placeholder, value in substitutions.items():
            result = result.replace(placeholder, str(value))
        return result
    
    def draw_id_card(self, c, record, x, y):
        """Draw single ID card matching the example layout"""
        card_width = 86 * mm
        card_height = 54 * mm
        
        # Card background
        c.setFillColor(HexColor('#ffffff'))
        c.rect(x, y, card_width, card_height, fill=1, stroke=1)
        
        # Blue header
        header_height = 16 * mm
        c.setFillColor(HexColor('#1e40af'))
        c.rect(x, y + card_height - header_height, card_width, header_height, fill=1)
        
        # School name in header
        c.setFillColor(HexColor('#ffffff'))
        c.setFont("Helvetica-Bold", 10)
        school_name = self.substitute_fields("SCHOOL NAME", record)
        text_width = c.stringWidth(school_name, "Helvetica-Bold", 10)
        c.drawString(x + (card_width - text_width) / 2, y + card_height - 8, school_name)
        
        # Photo frame
        photo_x = x + 5 * mm
        photo_y = y + 14 * mm
        photo_width = 30 * mm
        photo_height = 38 * mm
        
        c.setFillColor(HexColor('#f8f9fa'))
        c.rect(photo_x, photo_y, photo_width, photo_height, fill=1, stroke=1)
        
        # Student photo
        photo_url = record.get('photo_url') or record.get('school_id_url')
        if photo_url and os.path.exists(photo_url):
            try:
                c.drawImage(photo_url, photo_x + 1, photo_y + 1, 
                           photo_width - 2, photo_height - 2, 
                           preserveAspectRatio=True)
            except:
                pass
        
        # Student info
        info_x = x + 40 * mm
        info_y = y + card_height - 20 * mm
        
        c.setFillColor(HexColor('#000000'))
        c.setFont("Helvetica-Bold", 10)
        name = self.substitute_fields("{{name}}", record)
        c.drawString(info_x, info_y, name)
        
        c.setFont("Helvetica", 7)
        c.setFillColor(HexColor('#495057'))
        
        info_y -= 6 * mm
        class_text = self.substitute_fields("Class: {{class}}", record)
        c.drawString(info_x, info_y, class_text)
        
        info_y -= 5 * mm
        roll_text = self.substitute_fields("Roll No: {{record_number}}", record)
        c.drawString(info_x, info_y, roll_text)
        
        info_y -= 5 * mm
        dob_text = self.substitute_fields("DOB: {{dob}}", record)
        c.drawString(info_x, info_y, dob_text)
        
        # Valid until
        c.setFont("Helvetica", 6)
        c.setFillColor(HexColor('#6c757d'))
        c.drawString(x + 5 * mm, y + 8 * mm, "Valid Till: 2025-03-31")
        
        # Signature line
        c.setStrokeColor(HexColor('#6c757d'))
        c.setLineWidth(0.5)
        c.line(x + 5 * mm, y + 15 * mm, x + 35 * mm, y + 15 * mm)
        c.drawString(x + 20 * mm, y + 12 * mm, "Signature")
        
        # QR Code placeholder
        qr_x = x + 66 * mm
        qr_y = y + 8 * mm
        qr_size = 20 * mm
        
        c.setFillColor(HexColor('#f8f9fa'))
        c.rect(qr_x, qr_y, qr_size, qr_size, fill=1, stroke=1)
        
        # Simple QR code representation
        c.setFillColor(HexColor('#000000'))
        c.setFont("Helvetica", 4)
        qr_text = self.substitute_fields("ID: {{record_number}}", record)
        c.drawString(qr_x + 2, qr_y + qr_size/2, qr_text)
    
    def generate_pdf(self, data, output_path):
        """Generate PDF with grid layout like the example"""
        records = data.get('records', [])
        options = data.get('options', {})
        
        if not records:
            raise ValueError("No records to process")
        
        # Layout settings (matching the example)
        card_width = 86 * mm
        card_height = 54 * mm
        cards_per_row = 2
        cards_per_col = 4
        margin_x = 15 * mm
        margin_y = 15 * mm
        spacing_x = 10 * mm
        spacing_y = 8 * mm
        
        # Create canvas
        c = canvas.Canvas(output_path, pagesize=A4)
        
        current_row = 0
        current_col = 0
        cards_on_page = 0
        cards_per_page = cards_per_row * cards_per_col
        
        for i, record in enumerate(records):
            # Calculate position
            x = margin_x + current_col * (card_width + spacing_x)
            y = margin_y + (cards_per_col - current_row - 1) * (card_height + spacing_y)
            
            # Draw card
            self.draw_id_card(c, record, x, y)
            
            # Update position
            current_col += 1
            if current_col >= cards_per_row:
                current_col = 0
                current_row += 1
            
            cards_on_page += 1
            
            # New page if needed
            if cards_on_page >= cards_per_page or i == len(records) - 1:
                c.showPage()
                current_row = 0
                current_col = 0
                cards_on_page = 0
        
        c.save()
        return output_path

def main():
    if len(sys.argv) < 3:
        print("Usage: python template_pdf_generator.py <data_json> <output_pdf>")
        sys.exit(1)
    
    data_file = sys.argv[1]
    output_file = sys.argv[2]
    
    try:
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        generator = TemplatePDFGenerator()
        generator.generate_pdf(data, output_file)
        
        print(f"✅ Template PDF generated: {output_file}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
