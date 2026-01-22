#!/usr/bin/env python3
"""
School ID Processor CLI Wrapper
Processes student photos into standardized school ID cards
Usage: python school_id_processor_cli.py <input_path> <output_path> [size]
"""

import sys
import os
import cv2
import numpy as np
from pathlib import Path

# Import the SchoolIDProcessor class
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from school_id_processor import SchoolIDProcessor

def main():
    """Main entry point for CLI usage"""
    if len(sys.argv) < 3:
        print("Usage: python school_id_processor_cli.py <input_path> <output_path> [size]", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    size = int(sys.argv[3]) if len(sys.argv) > 3 else 1024

    # Validate input
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    # Create output directory if needed
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    try:
        print(f"[School ID Processor] Input: {input_path}")
        print(f"[School ID Processor] Output: {output_path}")
        print(f"[School ID Processor] Size: {size}")

        # Initialize processor
        processor = SchoolIDProcessor(model_root=os.path.expanduser('~/.insightface'))

        # Process the image
        success = processor.process_id_photo(input_path, output_path, size=size)

        if success:
            print(f"[School ID Processor] Success: {output_path}")
            sys.exit(0)
        else:
            print("[School ID Processor] Processing failed", file=sys.stderr)
            sys.exit(1)

    except Exception as e:
        print(f"[School ID Processor] Error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
