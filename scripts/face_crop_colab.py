# Colab helper for face-crop pipeline: logo upload + overlay UI
# Works inside Google Colab. Falls back to ipywidgets FileUpload if not in Colab.

from ipywidgets import Button, Dropdown, HBox, VBox, Output, FileUpload
from IPython.display import display, clear_output
try:
    from google.colab import files as colab_files
    _IN_COLAB = True
except Exception:
    colab_files = None
    _IN_COLAB = False

import cv2
import numpy as np
from PIL import Image
import io

# Shared state
branding = {
    'logo': None,
    'logo_pos': 'Top Right'
}

out = Output()

# UI components
logo_pos = Dropdown(options=['Top Left', 'Top Right'], value='Top Right', description='Logo Pos')
logo_btn = Button(description="📁 Upload Logo", button_style='info')
image_btn = Button(description="📁 Upload Image", button_style='primary')
process_btn = Button(description="Apply Logo Overlay", button_style='success')

# Fallback FileUpload widgets for non-Colab environments
logo_upload_widget = FileUpload(accept='image/*', multiple=False)
image_upload_widget = FileUpload(accept='image/*', multiple=False)

# Helper to read uploaded bytes into OpenCV BGR image
def _bytes_to_bgr(bts):
    arr = np.frombuffer(bts, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError('Unable to decode image bytes')
    # Convert BGRA->BGR if alpha present
    if img.shape[-1] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
    return img

# Logo upload handler
def on_logo_up(_=None):
    if _IN_COLAB and colab_files is not None:
        uploaded = colab_files.upload()
        if not uploaded:
            return
        first = list(uploaded.values())[0]
        bts = first
    else:
        if not logo_upload_widget.value:
            with out:
                print('No logo selected')
            return
        first_key = list(logo_upload_widget.value.keys())[0]
        bts = logo_upload_widget.value[first_key]['content']

    try:
        img_bgr = _bytes_to_bgr(bts)
        # store as RGB for easier PIL display later
        branding['logo'] = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        with out:
            print('Logo uploaded successfully')
    except Exception as e:
        with out:
            print('Logo upload failed:', e)

# Image upload handler
current_image_rgb = [None]

def on_image_up(_=None):
    if _IN_COLAB and colab_files is not None:
        uploaded = colab_files.upload()
        if not uploaded:
            return
        first = list(uploaded.values())[0]
        bts = first
    else:
        if not image_upload_widget.value:
            with out:
                print('No image selected')
            return
        first_key = list(image_upload_widget.value.keys())[0]
        bts = image_upload_widget.value[first_key]['content']

    try:
        img_bgr = _bytes_to_bgr(bts)
        current_image_rgb[0] = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        with out:
            print('Image uploaded successfully')
    except Exception as e:
        with out:
            print('Image upload failed:', e)

# Apply logo overlay (expects final_rgb as HxWx3 RGB np.uint8)
def apply_logo_overlay(final_rgb, branding_local):
    if branding_local.get('logo') is None:
        return final_rgb

    logo = branding_local['logo']
    # Ensure logo is RGB uint8
    if logo.dtype != np.uint8:
        logo = (np.clip(logo, 0, 255)).astype(np.uint8)

    h, w = final_rgb.shape[:2]
    # scale logo relative to a 1024 reference (as original snippet)
    ref = 1024
    lh = int(ref * 0.18 * (h / ref))
    lw = int(ref * 0.18 * (w / ref))
    if lh <= 0 or lw <= 0:
        return final_rgb

    s_logo = cv2.resize(logo, (lw, lh), interpolation=cv2.INTER_AREA)

    # Determine position
    pos = branding_local.get('logo_pos', 'Top Right')
    y1 = 40
    x1 = w - lw - 40 if 'Right' in pos else 40

    # Blend logo onto final image (simple overwrite or alpha-aware if provided)
    if s_logo.shape[2] == 3:
        final_rgb[y1:y1+lh, x1:x1+lw] = s_logo
    else:
        # If logo has alpha channel (shouldn't here), handle it
        alpha = s_logo[:, :, 3] / 255.0
        for c in range(3):
            final_rgb[y1:y1+lh, x1:x1+lw, c] = (
                alpha * s_logo[:, :, c] + (1 - alpha) * final_rgb[y1:y1+lh, x1:x1+lw, c]
            ).astype(np.uint8)

    return final_rgb

# Process button handler: applies logo overlay to current image and displays it

def on_process_click(_=None):
    if current_image_rgb[0] is None:
        with out:
            print('No source image uploaded')
        return

    branding_local = {
        'logo': branding.get('logo'),
        'logo_pos': logo_pos.value
    }

    final = current_image_rgb[0].copy()
    final = apply_logo_overlay(final, branding_local)

    # Display result
    with out:
        clear_output()
        display(Image.fromarray(final))
        print('Logo applied at', branding_local['logo_pos'])


# Wire up UI
logo_btn.on_click(on_logo_up)
image_btn.on_click(on_image_up)
process_btn.on_click(on_process_click)
logo_pos.observe(lambda change: branding.update({'logo_pos': change['new']}), names='value')

controls = HBox([logo_btn, image_btn, logo_pos, process_btn])

# For non-colab, also show file upload widgets
if not _IN_COLAB:
    widgets_box = VBox([controls, HBox([logo_upload_widget, image_upload_widget]), out])
else:
    widgets_box = VBox([controls, out])

print('Colab helper loaded. Use the buttons to upload a logo and an image, then click "Apply Logo Overlay".')

display(widgets_box)
