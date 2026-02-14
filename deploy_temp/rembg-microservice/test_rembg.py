"""Quick test script for rembg microservice.
Performs:
 - GET /health
 - POST /auto-crop with a tiny embedded PNG
Saves returned PNG as `cropped_test.png` if image returned.
"""
import http.client
import base64
import sys

HOST = 'localhost'
PORT = 5000

# 1x1 PNG (white) base64
PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII="
)
PNG_BYTES = base64.b64decode(PNG_B64)

def get_health():
    try:
        conn = http.client.HTTPConnection(HOST, PORT, timeout=5)
        conn.request('GET', '/health')
        resp = conn.getresponse()
        data = resp.read()
        print('GET /health ->', resp.status, resp.reason)
        print(data.decode(errors='ignore'))
        conn.close()
    except Exception as e:
        print('Health check failed:', e)


def post_auto_crop():
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    crlf = '\r\n'
    parts = []

    # Image part
    part = []
    part.append('--' + boundary)
    part.append('Content-Disposition: form-data; name="image"; filename="test.png"')
    part.append('Content-Type: image/png')
    part.append('')
    body_start = crlf.join(part).encode()

    # mode part
    mode_part = crlf.join([
        '--' + boundary,
        'Content-Disposition: form-data; name="mode"',
        '',
        'passport'
    ]).encode()

    closing = (crlf + '--' + boundary + '--' + crlf).encode()

    # assemble
    body = bytearray()
    body.extend(body_start)
    body.extend(crlf.encode())
    body.extend(PNG_BYTES)
    body.extend(crlf.encode())
    body.extend(mode_part)
    body.extend(crlf.encode())
    body.extend(closing)

    headers = {
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'Content-Length': str(len(body))
    }

    try:
        conn = http.client.HTTPConnection(HOST, PORT, timeout=30)
        conn.request('POST', '/auto-crop', body=bytes(body), headers=headers)
        resp = conn.getresponse()
        status = resp.status
        print('POST /auto-crop ->', status, resp.reason)
        content_type = resp.getheader('Content-Type')
        data = resp.read()
        conn.close()

        if status == 200 and content_type and 'image' in content_type:
            out_file = 'cropped_test.png'
            with open(out_file, 'wb') as f:
                f.write(data)
            print('Saved cropped image to', out_file)
        else:
            print('Response content-type:', content_type)
            print('Response body:', data.decode(errors='ignore'))
    except Exception as e:
        print('Auto-crop request failed:', e)


if __name__ == '__main__':
    get_health()
    post_auto_crop()
