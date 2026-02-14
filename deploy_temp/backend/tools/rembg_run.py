#!/usr/bin/env python3
import sys
import os

try:
    from rembg import remove
except Exception as e:
    print('rembg not installed:', e, file=sys.stderr)
    sys.exit(2)

def main():
    if len(sys.argv) < 3:
        print('Usage: rembg_run.py <input_path> <output_path>', file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.exists(input_path):
        print('Input file does not exist', file=sys.stderr)
        sys.exit(1)

    try:
        with open(input_path, 'rb') as inf:
            input_bytes = inf.read()

        output_bytes = remove(input_bytes)

        with open(output_path, 'wb') as outf:
            outf.write(output_bytes)

        print('OK')
        sys.exit(0)
    except Exception as e:
        print('Error during rembg processing:', e, file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
