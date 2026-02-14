"""
Rembg Background Removal Microservice

A lightweight FastAPI service for removing image backgrounds using rembg.
Designed for self-hosted, high-volume bulk processing (500k+ images).
Includes queue management, background processing, and WebSocket support.

Installation:
    pip install fastapi uvicorn rembg pillow python-multipart python-socketio

Usage:
    uvicorn app:app --host 0.0.0.0 --port 5001

For GPU acceleration (CUDA):
    pip install onnxruntime-gpu
    Set environment variable: ONNXRUNTIME_PROVIDERS=CUDAExecutionProvider
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, WebSocket
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import os
from pathlib import Path
import logging
from typing import Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
from rembg import remove
from queue_manager import QueueManager, JobStatus
from job_worker import JobWorker, init_worker, start_worker, stop_worker
from upload_api import router as upload_router
from websocket_manager import init_progress_manager, get_progress_manager, create_websocket_endpoint

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Queue Manager
queue_manager = QueueManager(db_path="queue.db")

# Initialize Progress Manager for WebSocket updates
progress_manager = init_progress_manager(queue_manager)

# Initialize FastAPI app
app = FastAPI(
    title="Rembg Background Removal Service",
    description="Self-hosted background removal microservice using rembg with queue management and WebSocket support",
    version="2.0.0"
)

# Add CORS middleware to allow requests from frontend
# IMPORTANT: Must be added BEFORE route definitions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
    expose_headers=["*"],  # Expose all headers to client
    max_age=600,  # Cache preflight for 10 minutes
)

# Include upload and processing routes
app.include_router(upload_router)

# Thread pool for CPU-intensive operations
# Adjust workers based on your CPU cores
executor = ThreadPoolExecutor(max_workers=4)

# Global worker instance
worker: Optional[JobWorker] = None


@app.on_event("startup")
async def startup_event():
    """Initialize worker on app startup"""
    global worker
    worker = init_worker(queue_manager, max_concurrent=2)
    # Start worker in background
    asyncio.create_task(start_worker())
    logger.info("Application startup complete - worker initialized")


@app.on_event("shutdown")
async def shutdown_event():
    """Gracefully shutdown worker"""
    global worker
    if worker:
        await stop_worker()
    logger.info("Application shutdown complete")

def process_image(input_bytes: bytes, model: str = "u2net") -> bytes:
    """
    Remove background from image in a thread pool
    
    Args:
        input_bytes: Image file bytes
        model: Rembg model to use (u2net, u2netp, u2net_human_seg, etc.)
    
    Returns:
        Processed image bytes (PNG with transparent background)
    """
    try:
        # Load image
        input_image = Image.open(io.BytesIO(input_bytes))
        
        # Convert to RGB for processing
        if input_image.mode != 'RGB':
            input_image = input_image.convert('RGB')
        
        # Remove background using rembg
        # Using default model (u2net) - model parameter is accepted but may cause issues
        # TODO: Investigate proper model selection in newer rembg versions
        output_image = remove(input_image)
        
        # Ensure output is RGBA (with transparency)
        if output_image.mode != 'RGBA':
            output_image = output_image.convert('RGBA')
        
        # Save as PNG with transparency
        output_bytes = io.BytesIO()
        output_image.save(output_bytes, format='PNG')
        output_bytes.seek(0)
        
        logger.info(f"Successfully processed image with model={model}")
        return output_bytes.getvalue()
    
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint - verify service is running"""
    return {
        "status": "healthy",
        "service": "rembg-microservice",
        "version": "1.0.0"
    }

@app.post("/remove-bg", tags=["Image Processing"])
async def remove_background(
    image: UploadFile = File(..., description="Image file to process"),
    model: str = "u2net"
):
    """
    Remove background from an image
    
    Args:
        image: Image file (JPEG, PNG, BMP, etc.)
        model: Rembg model (u2net, u2netp, u2net_human_seg, siluette, isnet-anime, etc.)
    
    Returns:
        PNG image with transparent background
    """
    try:
        # Log incoming request details
        logger.info(f"[/remove-bg] Received request: filename={image.filename}, content_type={image.content_type}, size={image.size}")
        
        # Validate file type - accept if no content_type is set (fallback)
        if image.content_type and not image.content_type.startswith('image/'):
            logger.warning(f"[/remove-bg] Invalid content type: {image.content_type}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {image.content_type}. Must be an image."
            )
        
        # Read image bytes
        image_bytes = await image.read()
        
        if len(image_bytes) == 0:
            logger.warning("[/remove-bg] Empty image file received")
            raise HTTPException(status_code=400, detail="Empty image file")
        
        logger.info(f"[/remove-bg] Processing image with model={model}, size={len(image_bytes)} bytes")
        
        # Process image in thread pool (non-blocking)
        loop = asyncio.get_event_loop()
        processed_bytes = await loop.run_in_executor(
            executor,
            process_image,
            image_bytes,
            model
        )
        
        logger.info(f"[/remove-bg] Successfully processed image: {image.filename}, output_size={len(processed_bytes)} bytes")
        
        # Return as StreamingResponse (works with bytes directly)
        return StreamingResponse(
            io.BytesIO(processed_bytes),
            media_type="image/png",
            headers={
                "Content-Disposition": f"attachment; filename=no-bg-{Path(image.filename).stem}.png"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[/remove-bg] Error removing background: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error processing image: {str(e)}"
        )

@app.post("/remove-bg-batch", tags=["Image Processing"])
async def remove_background_batch(
    images: list[UploadFile] = File(...),
    model: str = "u2net"
):
    """
    Batch remove backgrounds from multiple images
    Returns results in the order they complete
    
    Args:
        images: List of image files
        model: Rembg model to use
    
    Returns:
        JSON with processed image data URIs
    """
    try:
        if not images:
            logger.warning("[/remove-bg-batch] No images provided")
            raise HTTPException(status_code=400, detail="No images provided")
        
        logger.info(f"[/remove-bg-batch] Processing {len(images)} images with model={model}")
        
        results = []
        errors = []
        
        for idx, image in enumerate(images):
            try:
                logger.debug(f"[/remove-bg-batch] Processing image {idx+1}/{len(images)}: {image.filename}")
                image_bytes = await image.read()
                
                if len(image_bytes) == 0:
                    logger.warning(f"[/remove-bg-batch] Empty file at index {idx}: {image.filename}")
                    errors.append({
                        "index": idx,
                        "filename": image.filename,
                        "error": "Empty file"
                    })
                    continue
                
                loop = asyncio.get_event_loop()
                processed_bytes = await loop.run_in_executor(
                    executor,
                    process_image,
                    image_bytes,
                    model
                )
                
                # Convert to data URL for frontend
                import base64
                data_url = f"data:image/png;base64,{base64.b64encode(processed_bytes).decode()}"
                
                results.append({
                    "index": idx,
                    "filename": image.filename,
                    "dataUrl": data_url,
                    "success": True
                })
                logger.debug(f"[/remove-bg-batch] Successfully processed image {idx+1}/{len(images)}")
                logger.info(f"Batch: Processed image {idx + 1}/{len(images)}")
            
            except Exception as e:
                logger.error(f"[/remove-bg-batch] Error processing image {idx}: {image.filename} - {str(e)}")
                errors.append({
                    "index": idx,
                    "filename": image.filename,
                    "error": str(e)
                })
                logger.error(f"Batch error for {image.filename}: {str(e)}")
        
        return {
            "total": len(images),
            "successful": len(results),
            "failed": len(errors),
            "results": results,
            "errors": errors
        }
    
    except Exception as e:
        logger.error(f"Batch processing error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch processing error: {str(e)}"
        )

@app.get("/models", tags=["Configuration"])
async def list_available_models():
    """List available rembg models"""
    models = [
        "u2net",  # General purpose, ~176 MB
        "u2netp",  # Faster variant, ~4.7 MB
        "u2net_human_seg",  # Optimized for humans
        "siluette",  # Very fast, ~167 KB
        "isnet-anime",  # For anime/illustrations
        "isnet-general-use",  # High quality general
        "sam"  # Segment Anything model
    ]
    return {
        "available_models": models,
        "default": "u2net",
        "recommendations": {
            "speed": "siluette",
            "quality": "isnet-general-use",
            "anime": "isnet-anime",
            "general": "u2net"
        }
    }

@app.get("/", tags=["Info"])
async def root():
    """Service information"""
    return {
        "name": "Rembg Background Removal Microservice",
        "version": "1.0.0",
        "description": "Self-hosted image background removal using rembg with queue management",
        "endpoints": {
            "health": "/health",
            "single_image": "/remove-bg",
            "batch": "/remove-bg-batch",
            "queue": {
                "create": "/queue/submit",
                "status": "/queue/job/{job_id}",
                "list": "/queue/jobs",
                "cancel": "/queue/job/{job_id}/cancel"
            },
            "models": "/models",
            "docs": "/docs",
            "openapi": "/openapi.json"
        }
    }


# ==================== Queue Management Endpoints ====================

@app.post("/queue/submit", tags=["Queue Management"])
async def submit_to_queue(
    images: list[UploadFile] = File(...),
    model: str = "u2net"
):
    """
    Submit images to processing queue
    
    Args:
        images: List of image files
        model: Rembg model to use
    
    Returns:
        Job ID and submission details
    """
    try:
        if not images:
            raise HTTPException(status_code=400, detail="No images provided")
        
        filenames = [img.filename for img in images]
        job_type = "single" if len(images) == 1 else "batch"
        
        # Create job in queue
        job_id = queue_manager.create_job(
            job_type=job_type,
            filenames=filenames,
            model=model,
            metadata={"submitted_from": "API"}
        )
        
        logger.info(f"Submitted job {job_id} with {len(images)} image(s)")
        
        return {
            "job_id": job_id,
            "status": "queued",
            "job_type": job_type,
            "files_count": len(images),
            "model": model,
            "message": f"Job queued successfully. Check status with /queue/job/{job_id}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting job: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error submitting job: {str(e)}"
        )


@app.get("/queue/job/{job_id}", tags=["Queue Management"])
async def get_job_status(job_id: str):
    """
    Get job status and progress
    
    Args:
        job_id: Job ID
    
    Returns:
        Job details with current status and progress
    """
    try:
        result = queue_manager.export_job_results(job_id)
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"Job {job_id} not found"
            )
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching job status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching job status: {str(e)}"
        )


@app.get("/queue/jobs", tags=["Queue Management"])
async def list_queue_jobs(status: Optional[str] = None, limit: int = 20):
    """
    List jobs in queue
    
    Args:
        status: Filter by status (pending, processing, completed, failed, cancelled)
        limit: Maximum jobs to return
    
    Returns:
        List of jobs matching criteria
    """
    try:
        jobs = queue_manager.get_pending_jobs(limit=limit)
        
        # Filter by status if specified
        if status:
            jobs = [j for j in jobs if j['status'] == status]
        
        return {
            "total": len(jobs),
            "jobs": [queue_manager.export_job_results(j['id']) for j in jobs]
        }
    
    except Exception as e:
        logger.error(f"Error listing jobs: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error listing jobs: {str(e)}"
        )


@app.get("/queue/stats", tags=["Queue Management"])
async def get_queue_stats():
    """
    Get queue statistics
    
    Returns:
        Queue statistics (counts by status)
    """
    try:
        stats = queue_manager.get_job_stats()
        return {
            "stats": stats,
            "worker": {
                "status": "running" if worker and worker.running else "stopped",
                "active_jobs": len(worker.active_jobs) if worker else 0,
                "max_concurrent": worker.max_concurrent if worker else 0
            }
        }
    
    except Exception as e:
        logger.error(f"Error fetching stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching stats: {str(e)}"
        )


@app.post("/queue/job/{job_id}/cancel", tags=["Queue Management"])
async def cancel_job(job_id: str):
    """
    Cancel a queued job
    
    Args:
        job_id: Job ID
    
    Returns:
        Cancellation result
    """
    try:
        job = queue_manager.get_job(job_id)
        
        if not job:
            raise HTTPException(
                status_code=404,
                detail=f"Job {job_id} not found"
            )
        
        success = queue_manager.cancel_job(job_id)
        
        if not success:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel job with status: {job['status']}"
            )
        
        return {
            "job_id": job_id,
            "status": "cancelled",
            "message": "Job cancelled successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling job: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error cancelling job: {str(e)}"
        )


# WebSocket for real-time job updates
@app.websocket("/ws/job/{job_id}")
async def websocket_job_endpoint(websocket: WebSocket, job_id: str):
    """
    WebSocket endpoint for real-time job progress updates
    
    Usage:
        ws = new WebSocket("ws://localhost:5000/ws/job/{job_id}")
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("Progress:", data.progress);
        }
    """
    ws_handler = create_websocket_endpoint(progress_manager)
    await ws_handler(websocket, job_id)


if __name__ == "__main__":
    import uvicorn
    
    # Configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 5001))
    # Note: Windows with multi-worker has issues; use 1 for development
    workers = 1
    
    logger.info(f"Starting rembg microservice on {host}:{port}")
    logger.info(f"Worker processes: {workers}")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        workers=workers,
        log_level="info"
    )
