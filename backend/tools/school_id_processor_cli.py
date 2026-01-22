#!/usr/bin/env python3
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'rembg-microservice'))

from school_id_processor import SchoolIDProcessor

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python school_id_processor_cli.py <input_path> <output_path>")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    print(f"[School ID Processor CLI] Processing: {input_path}")
    
    try:
        processor = SchoolIDProcessor(model_root='/root/.insightface')
        success = processor.process_id_photo(input_path, output_path)
        
        if success:
            print(f"[School ID Processor CLI] Success: {output_path}")
            sys.exit(0)
        else:
            print(f"[School ID Processor CLI] Failed: No face detected")
            sys.exit(2)
    except Exception as e:
        print(f"[School ID Processor CLI] Error: {e}")
        sys.exit(1)
