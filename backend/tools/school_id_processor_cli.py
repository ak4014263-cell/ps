#!/usr/bin/env python3
"""
CLI wrapper for SchoolIDProcessor
Usage: python school_id_processor_cli.py <input_image> <output_image>
"""

import sys
import os

# Add rembg-microservice directory to path so we can import school_id_processor
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'rembg-microservice'))

try:
    from school_id_processor import SchoolIDProcessor
except ImportError as e:
    print(f"Error importing SchoolIDProcessor: {e}")
    sys.exit(1)

def main():
    if len(sys.argv) < 3:
        print("Usage: python school_id_processor_cli.py <input_image> <output_image>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    # Initialize processor
    processor = SchoolIDProcessor(model_root='/root/.insightface')

    # Process the image
    success = processor.process_id_photo(input_path, output_path)

    if success:
        print(f"Successfully processed: {output_path}")
        sys.exit(0)
    else:
        print(f"Failed to process: {input_path}")
        sys.exit(1)

if __name__ == "__main__":
    main()
