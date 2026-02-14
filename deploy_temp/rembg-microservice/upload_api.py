"""
Upload and Processing API Endpoints

Integrates file uploads with queue management and background processing.
Handles single photos, multiple photos, and zip archives.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from typing import List, Optional
import logging
import io
from pathlib import Path

from queue_manager import QueueManager, JobStatus
from image_processor import UploadHandler, ZipHandler, ImageProcessor

logger = logging.getLogger(__name__)

# Initialize components
upload_handler = UploadHandler(storage_dir="uploads")
zip_handler = ZipHandler()
queue_manager = QueueManager(db_path="queue.db")

# Create router
router = APIRouter(prefix="/api", tags=["Processing"])


@router.post("/upload-and-process")
async def upload_and_process(
    files: List[UploadFile] = File(...),
    remove_bg: bool = Query(True, description="Remove background"),
    crop_face: bool = Query(True, description="Crop face"),
    model: str = Query("u2net", description="Rembg model")
):
    """
    Upload photos and process in background
    
    Supports:
    - Single photo
    - Multiple photos
    - Zip archive containing photos
    
    Args:
        files: Photo(s) to upload
        remove_bg: Remove background
        crop_face: Crop face
        model: Rembg model (u2net, siluette, isnet-general-use)
    
    Returns:
        Job ID and processing details
    """
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        filenames = []
        extracted_files = []
        
        # Process uploaded files
        for file in files:
            if not file.content_type:
                raise HTTPException(status_code=400, detail="Invalid file type")
            
            file_bytes = await file.read()
            
            if len(file_bytes) == 0:
                raise HTTPException(status_code=400, detail=f"Empty file: {file.filename}")
            
            # Check if zip
            if file.content_type in ['application/zip', 'application/x-zip-compressed'] or \
               file.filename.endswith('.zip'):
                
                # Validate zip
                if not zip_handler.validate_zip(file_bytes):
                    raise HTTPException(status_code=400, detail="Invalid zip file")
                
                # Extract images
                extracted = zip_handler.extract_images_from_zip(
                    file_bytes,
                    upload_handler.storage_dir
                )
                
                if not extracted:
                    raise HTTPException(status_code=400, detail="No images found in zip")
                
                extracted_files.extend(extracted)
                filenames.append(f"{file.filename} ({len(extracted)} images)")
                
                logger.info(f"Extracted {len(extracted)} images from {file.filename}")
            
            elif file.content_type.startswith('image/'):
                # Regular image file
                saved_path = upload_handler.save_upload(file_bytes, file.filename)
                extracted_files.append({
                    "filename": file.filename,
                    "path": saved_path,
                    "bytes": file_bytes,
                    "size": len(file_bytes)
                })
                filenames.append(file.filename)
            
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type: {file.content_type}"
                )
        
        if not extracted_files:
            raise HTTPException(status_code=400, detail="No valid images found")
        
        # Create processing job
        job_id = queue_manager.create_job(
            job_type="batch" if len(extracted_files) > 1 else "single",
            filenames=[f["filename"] for f in extracted_files],
            model=model,
            metadata={
                "remove_bg": remove_bg,
                "crop_face": crop_face,
                "uploaded_files": filenames,
                "total_size": sum(f["size"] for f in extracted_files)
            }
        )
        
        # TODO: Enqueue for background processing
        logger.info(f"Created job {job_id} with {len(extracted_files)} images")
        
        return {
            "job_id": job_id,
            "status": "queued",
            "total_files": len(extracted_files),
            "uploaded_files": filenames,
            "settings": {
                "remove_background": remove_bg,
                "crop_face": crop_face,
                "model": model
            },
            "message": f"Processing {len(extracted_files)} image(s). Check status with /api/process-status/{job_id}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in upload-and-process: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


@router.get("/process-status/{job_id}")
async def get_process_status(job_id: str):
    """
    Get processing status and progress
    
    Args:
        job_id: Job ID from upload-and-process
    
    Returns:
        Job status with progress details
    """
    try:
        job = queue_manager.get_job(job_id)
        
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        result = queue_manager.export_job_results(job_id)
        
        # Add download links if completed
        if job['status'] == 'completed' and job['results']:
            result["download_available"] = True
            result["download_url"] = f"/api/download-results/{job_id}"
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/download-results/{job_id}")
async def download_results(job_id: str, format: str = Query("zip", description="zip or individual")):
    """
    Download processed results
    
    Args:
        job_id: Job ID
        format: 'zip' for archive or 'individual' for each file
    
    Returns:
        Processed images
    """
    try:
        job = queue_manager.get_job(job_id)
        
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        if job['status'] != 'completed':
            raise HTTPException(
                status_code=400,
                detail=f"Job not ready. Status: {job['status']}"
            )
        
        if not job['results']:
            raise HTTPException(status_code=400, detail="No results available")
        
        results = job['results']
        
        if format == "zip":
            # Create zip archive
            import zipfile
            zip_buffer = io.BytesIO()
            
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
                if 'items' in results:
                    for idx, item in enumerate(results['items']):
                        if item.get('success') and 'data_url' in item:
                            # Extract base64 data
                            import base64
                            data_url = item['data_url']
                            if ',' in data_url:
                                _, data = data_url.split(',', 1)
                                image_bytes = base64.b64decode(data)
                                
                                filename = item.get('filename', f"processed_{idx}.png")
                                zf.writestr(filename, image_bytes)
            
            zip_buffer.seek(0)
            
            return StreamingResponse(
                iter([zip_buffer.getvalue()]),
                media_type="application/zip",
                headers={"Content-Disposition": f"attachment; filename=processed_{job_id}.zip"}
            )
        
        else:
            # Return first image as individual download
            if 'items' in results and results['items']:
                item = results['items'][0]
                if item.get('success') and 'data_url' in item:
                    import base64
                    data_url = item['data_url']
                    if ',' in data_url:
                        _, data = data_url.split(',', 1)
                        image_bytes = base64.b64decode(data)
                        
                        filename = item.get('filename', 'processed.png')
                        return StreamingResponse(
                            iter([image_bytes]),
                            media_type="image/png",
                            headers={"Content-Disposition": f"attachment; filename={filename}"}
                        )
        
        raise HTTPException(status_code=400, detail="No valid results to download")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading results: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Download error: {str(e)}")


@router.get("/processing-info")
async def get_processing_info():
    """Get information about available processing options"""
    return {
        "upload_endpoint": "/api/upload-and-process",
        "status_endpoint": "/api/process-status/{job_id}",
        "download_endpoint": "/api/download-results/{job_id}",
        "features": {
            "background_removal": {
                "enabled": True,
                "description": "Remove background from images",
                "parameter": "remove_bg"
            },
            "face_crop": {
                "enabled": True,
                "description": "Detect and crop faces",
                "parameter": "crop_face"
            }
        },
        "supported_formats": {
            "single_image": ["JPEG", "PNG", "BMP", "GIF", "WebP"],
            "batch": "Zip archive containing multiple images"
        },
        "models": [
            {
                "name": "u2net",
                "speed": "2-3s per image",
                "quality": "High",
                "size": "176 MB",
                "description": "General purpose, best balance"
            },
            {
                "name": "siluette",
                "speed": "0.5s per image",
                "quality": "Good",
                "size": "167 KB",
                "description": "Fastest, lightweight"
            },
            {
                "name": "isnet-general-use",
                "speed": "1.5s per image",
                "quality": "Very High",
                "size": "167 MB",
                "description": "High quality results"
            }
        ],
        "workflow": [
            "1. Upload photo(s) or zip",
            "2. Specify processing options",
            "3. Get job ID immediately",
            "4. Poll status endpoint",
            "5. Download when complete"
        ]
    }
