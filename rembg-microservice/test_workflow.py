"""
Complete Workflow Test - Upload → Process → Download

Tests the entire pipeline from file upload through image processing to result download.
Includes test image generation and validation.
"""

import asyncio
import aiohttp
import os
import io
import json
import zipfile
from pathlib import Path
from PIL import Image
import time
import sys

# Test configuration
API_BASE = "http://localhost:5000/api"
TEST_OUTPUT_DIR = "test_results"
TEST_IMAGE_SIZE = (300, 300)


def create_test_image(filename: str, color: tuple = (255, 100, 150)) -> bytes:
    """
    Create a test image with solid color
    
    Args:
        filename: Name for the image
        color: RGB color tuple
    
    Returns:
        Image bytes in PNG format
    """
    img = Image.new("RGB", TEST_IMAGE_SIZE, color)
    
    # Add some variation - create a simple pattern
    pixels = img.load()
    for i in range(TEST_IMAGE_SIZE[0]):
        for j in range(TEST_IMAGE_SIZE[1]):
            if (i + j) % 2 == 0:
                pixels[i, j] = tuple(min(c + 50, 255) for c in color)
    
    # Add a simple circle in the middle
    from PIL import ImageDraw
    draw = ImageDraw.Draw(img)
    center = (TEST_IMAGE_SIZE[0] // 2, TEST_IMAGE_SIZE[1] // 2)
    radius = 50
    draw.ellipse(
        [(center[0] - radius, center[1] - radius),
         (center[0] + radius, center[1] + radius)],
        fill=(0, 0, 0)
    )
    
    # Save to bytes
    output = io.BytesIO()
    img.save(output, format="PNG")
    output.seek(0)
    return output.getvalue()


def create_test_zip(num_images: int = 3) -> bytes:
    """
    Create a test zip with multiple images
    
    Args:
        num_images: Number of test images to include
    
    Returns:
        Zip file bytes
    """
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        colors = [
            (255, 100, 150),  # Pink
            (100, 150, 255),  # Blue
            (150, 255, 100),  # Green
        ]
        
        for i in range(num_images):
            img_bytes = create_test_image(
                f"test_image_{i}.png",
                color=colors[i % len(colors)]
            )
            zf.writestr(f"test_image_{i}.png", img_bytes)
    
    zip_buffer.seek(0)
    return zip_buffer.getvalue()


async def test_single_image_upload():
    """Test uploading and processing a single image"""
    print("\n" + "="*60)
    print("TEST 1: Single Image Upload")
    print("="*60)
    
    try:
        # Create test image
        image_bytes = create_test_image("test.png")
        
        # Upload
        async with aiohttp.ClientSession() as session:
            data = aiohttp.FormData()
            data.add_field('files', io.BytesIO(image_bytes), filename='test.png')
            data.add_field('remove_bg', 'true')
            data.add_field('crop_face', 'true')
            data.add_field('model', 'u2net')
            
            print("📤 Uploading single image...")
            async with session.post(f"{API_BASE}/upload-and-process", data=data) as resp:
                if resp.status != 200:
                    print(f"❌ Upload failed: {resp.status}")
                    print(await resp.text())
                    return None
                
                result = await resp.json()
                job_id = result['job_id']
                print(f"✅ Uploaded! Job ID: {job_id[:8]}...")
                
                # Poll for completion
                return await poll_job_completion(session, job_id)
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


async def test_multiple_images_upload():
    """Test uploading and processing multiple images"""
    print("\n" + "="*60)
    print("TEST 2: Multiple Images Upload")
    print("="*60)
    
    try:
        async with aiohttp.ClientSession() as session:
            data = aiohttp.FormData()
            
            # Add 3 separate images
            for i in range(3):
                img_bytes = create_test_image(f"test_{i}.png")
                data.add_field('files', io.BytesIO(img_bytes), filename=f'test_{i}.png')
            
            data.add_field('remove_bg', 'true')
            data.add_field('crop_face', 'false')  # Test without face crop
            data.add_field('model', 'siluette')  # Faster model for testing
            
            print("📤 Uploading 3 images...")
            async with session.post(f"{API_BASE}/upload-and-process", data=data) as resp:
                if resp.status != 200:
                    print(f"❌ Upload failed: {resp.status}")
                    print(await resp.text())
                    return None
                
                result = await resp.json()
                job_id = result['job_id']
                print(f"✅ Uploaded! Job ID: {job_id[:8]}...")
                
                return await poll_job_completion(session, job_id)
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


async def test_zip_upload():
    """Test uploading and processing a zip file"""
    print("\n" + "="*60)
    print("TEST 3: ZIP File Upload")
    print("="*60)
    
    try:
        # Create test zip
        zip_bytes = create_test_zip(num_images=4)
        
        async with aiohttp.ClientSession() as session:
            data = aiohttp.FormData()
            data.add_field('files', io.BytesIO(zip_bytes), filename='test_images.zip')
            data.add_field('remove_bg', 'true')
            data.add_field('crop_face', 'true')
            data.add_field('model', 'u2net')
            
            print("📤 Uploading ZIP with 4 images...")
            async with session.post(f"{API_BASE}/upload-and-process", data=data) as resp:
                if resp.status != 200:
                    print(f"❌ Upload failed: {resp.status}")
                    print(await resp.text())
                    return None
                
                result = await resp.json()
                job_id = result['job_id']
                print(f"✅ Uploaded! Job ID: {job_id[:8]}...")
                
                return await poll_job_completion(session, job_id)
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


async def poll_job_completion(session, job_id: str, max_wait: int = 120) -> dict:
    """
    Poll a job until completion
    
    Args:
        session: aiohttp session
        job_id: Job ID to poll
        max_wait: Maximum seconds to wait
    
    Returns:
        Final job status
    """
    start_time = time.time()
    last_progress = -1
    
    while time.time() - start_time < max_wait:
        try:
            async with session.get(f"{API_BASE}/process-status/{job_id}") as resp:
                if resp.status != 200:
                    print(f"❌ Status check failed: {resp.status}")
                    return None
                
                job = await resp.json()
                status = job['status']
                
                # Update progress display
                progress = job.get('progress', {})
                processed = progress.get('processed', 0)
                total = progress.get('total', 0)
                
                if processed != last_progress and total > 0:
                    percentage = (processed / total) * 100
                    print(f"⏳ Processing: {processed}/{total} ({percentage:.0f}%)")
                    last_progress = processed
                
                # Check status
                if status == 'completed':
                    print(f"✅ Processing complete!")
                    
                    # Show summary
                    if progress:
                        print(f"   - Processed: {progress.get('processed', 0)}")
                        print(f"   - Failed: {progress.get('failed', 0)}")
                    
                    return job
                
                elif status == 'failed':
                    print(f"❌ Processing failed: {job.get('error', 'Unknown error')}")
                    return job
                
                elif status == 'processing':
                    await asyncio.sleep(2)
                
                else:
                    await asyncio.sleep(2)
        
        except Exception as e:
            print(f"❌ Error polling status: {e}")
            await asyncio.sleep(2)
    
    print(f"❌ Job timed out after {max_wait} seconds")
    return None


async def test_download(session, job_id: str, format: str = 'zip'):
    """
    Test downloading results
    
    Args:
        session: aiohttp session
        job_id: Job ID
        format: 'zip' or 'individual'
    """
    try:
        url = f"{API_BASE}/download-results/{job_id}?format={format}"
        async with session.get(url) as resp:
            if resp.status != 200:
                print(f"❌ Download failed: {resp.status}")
                return False
            
            # Save file
            Path(TEST_OUTPUT_DIR).mkdir(exist_ok=True)
            
            content = await resp.read()
            filename = f"{job_id[:8]}_{format}.{'zip' if format == 'zip' else 'png'}"
            filepath = Path(TEST_OUTPUT_DIR) / filename
            
            with open(filepath, 'wb') as f:
                f.write(content)
            
            size_kb = len(content) / 1024
            print(f"✅ Downloaded {format}: {filepath.name} ({size_kb:.1f} KB)")
            return True
    
    except Exception as e:
        print(f"❌ Download error: {e}")
        return False


async def run_all_tests():
    """Run all workflow tests"""
    print("\n🚀 Starting Complete Workflow Tests")
    print(f"API Base: {API_BASE}")
    print(f"Output Dir: {TEST_OUTPUT_DIR}")
    
    results = {
        "single_image": None,
        "multiple_images": None,
        "zip_file": None,
        "downloads": []
    }
    
    # Test 1: Single image
    job1 = await test_single_image_upload()
    if job1 and job1['status'] == 'completed':
        results["single_image"] = "✅ PASSED"
        # Test download
        async with aiohttp.ClientSession() as session:
            await test_download(session, job1['id'], 'individual')
    else:
        results["single_image"] = "❌ FAILED"
    
    await asyncio.sleep(1)
    
    # Test 2: Multiple images
    job2 = await test_multiple_images_upload()
    if job2 and job2['status'] == 'completed':
        results["multiple_images"] = "✅ PASSED"
        async with aiohttp.ClientSession() as session:
            await test_download(session, job2['id'], 'zip')
    else:
        results["multiple_images"] = "❌ FAILED"
    
    await asyncio.sleep(1)
    
    # Test 3: ZIP file
    job3 = await test_zip_upload()
    if job3 and job3['status'] == 'completed':
        results["zip_file"] = "✅ PASSED"
        async with aiohttp.ClientSession() as session:
            await test_download(session, job3['id'], 'zip')
    else:
        results["zip_file"] = "❌ FAILED"
    
    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    for test_name, result in results.items():
        print(f"{test_name:20} {result}")
    
    print("="*60)


if __name__ == "__main__":
    try:
        asyncio.run(run_all_tests())
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        sys.exit(1)
