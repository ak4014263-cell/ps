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

    try:
        print(f"[CLI] Input: {input_path}", flush=True)
        print(f"[CLI] Output: {output_path}", flush=True)
        print(f"[CLI] Initializing SchoolIDProcessor...", flush=True)
        
        # Initialize processor
        processor = SchoolIDProcessor(model_root='/root/.insightface')
        
        print(f"[CLI] Processor initialized, processing image...", flush=True)
        # Process the image
        success = processor.process_id_photo(input_path, output_path)

        if success:
            print(f"[CLI] Successfully processed: {output_path}", flush=True)
            sys.exit(0)
        else:
            # Return exit code 2 for "no face detected" (different from general failure)
            print(f"[CLI] No face detected or processing failed: {input_path}", flush=True)
            sys.exit(2)  # Special exit code for no face
    except Exception as e:
        print(f"[CLI] ERROR: {str(e)}", flush=True)
        import traceback
        traceback.print_exc(file=sys.stdout)
        sys.exit(1)

if __name__ == "__main__":
    main()
