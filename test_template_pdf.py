#!/usr/bin/env python3
import json
import os
import sys

# Add backend tools to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend', 'tools'))

try:
    from template_pdf_generator import TemplatePDFGenerator
    
    # Create sample data
    sample_data = {
        'records': [
            {
                'id': '1',
                'record_number': '001',
                'photo_url': 'input_photos/sample1.jpg',
                'data_json': {
                    'firstName': 'John Doe',
                    'Name': 'John Doe',
                    'class': 'Grade 10',
                    'dob': '2008-05-15'
                },
                'displayName': 'John Doe'
            },
            {
                'id': '2',
                'record_number': '002', 
                'photo_url': 'input_photos/sample2.jpg',
                'data_json': {
                    'firstName': 'Jane Smith',
                    'Name': 'Jane Smith',
                    'class': 'Grade 11',
                    'dob': '2007-08-22'
                },
                'displayName': 'Jane Smith'
            }
        ],
        'options': {
            'pageSize': 'A4'
        }
    }

    # Test the generator
    generator = TemplatePDFGenerator()
    output_path = 'output/template_test.pdf'
    
    # Ensure output directory exists
    os.makedirs('output', exist_ok=True)
    
    generator.generate_pdf(sample_data, output_path)
    print(f'✅ Template PDF generated: {output_path}')
    
except ImportError as e:
    print(f'❌ Import error: {e}')
    print('Make sure reportlab is installed: pip install reportlab')
except Exception as e:
    print(f'❌ Error: {e}')
