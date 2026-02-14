"""
Background Worker for Processing Queued Jobs

Handles asynchronous processing of background removal jobs from the queue.
Runs as a separate process/task to avoid blocking the API.
Integrates with image_processor for actual image processing pipeline.
"""

import asyncio
import logging
from typing import Callable, Optional
from queue_manager import QueueManager, JobStatus
from image_processor import ImageProcessor, UploadHandler, ZipHandler
import io
import json
import base64
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)


class JobWorker:
    """
    Worker that processes jobs from the queue.
    Handles single and batch image processing with error recovery.
    Integrates with ImageProcessor for background removal and face cropping.
    """
    
    def __init__(
        self,
        queue_manager: QueueManager,
        max_concurrent: int = 2,
        poll_interval: int = 2,
        upload_base_dir: str = "uploads"
    ):
        """
        Initialize job worker
        
        Args:
            queue_manager: QueueManager instance
            max_concurrent: Maximum concurrent jobs to process
            poll_interval: Seconds between queue polls
            upload_base_dir: Base directory for uploaded files
        """
        self.queue_manager = queue_manager
        self.max_concurrent = max_concurrent
        self.poll_interval = poll_interval
        self.upload_base_dir = upload_base_dir
        self.active_jobs = set()
        self.running = False
        self.image_processor = ImageProcessor()
        self.upload_handler = UploadHandler(storage_dir=upload_base_dir)
        self.zip_handler = ZipHandler()
        self.executor = ThreadPoolExecutor(max_workers=max_concurrent)
    
    async def start(self):
        """Start the worker loop"""
        self.running = True
        logger.info("Job worker started")
        
        try:
            while self.running:
                await self._process_batch()
                await asyncio.sleep(self.poll_interval)
        except Exception as e:
            logger.error(f"Worker error: {str(e)}", exc_info=True)
        finally:
            self.running = False
            logger.info("Job worker stopped")
    
    async def stop(self):
        """Stop the worker loop gracefully"""
        logger.info("Stopping job worker...")
        self.running = False
        # Wait for active jobs to complete
        if self.active_jobs:
            await asyncio.gather(*self.active_jobs, return_exceptions=True)
        # Shutdown executor
        self.executor.shutdown(wait=True)
        logger.info("Job worker stopped")
    
    async def _process_batch(self):
        """Process a batch of pending jobs"""
        if len(self.active_jobs) >= self.max_concurrent:
            return
        
        pending = self.queue_manager.get_pending_jobs(
            limit=self.max_concurrent - len(self.active_jobs)
        )
        
        if not pending:
            return
        
        for job in pending:
            task = asyncio.create_task(self._process_job(job['id']))
            self.active_jobs.add(task)
            task.add_done_callback(self.active_jobs.discard)
    
    async def _process_job(self, job_id: str):
        """
        Process a single job
        
        Args:
            job_id: ID of job to process
        """
        try:
            job = self.queue_manager.get_job(job_id)
            if not job:
                logger.error(f"Job {job_id} not found")
                return
            
            # Update status to processing
            self.queue_manager.update_job_status(job_id, JobStatus.PROCESSING)
            
            logger.info(f"Processing job {job_id} ({job['job_type']})")
            
            if job['job_type'] == 'single':
                await self._process_single(job_id, job)
            elif job['job_type'] == 'batch':
                await self._process_batch_job(job_id, job)
            
        except Exception as e:
            logger.error(f"Error processing job {job_id}: {str(e)}", exc_info=True)
            self.queue_manager.update_job_status(
                job_id,
                JobStatus.FAILED,
                error_message=str(e)
            )
    
    async def _process_single(self, job_id: str, job: dict):
        """
        Process a single image job
        
        Args:
            job_id: Job ID
            job: Job data
        """
        try:
            # Get processing options from metadata
            metadata = job.get('metadata', {})
            remove_bg = metadata.get('remove_bg', True)
            crop_face = metadata.get('crop_face', True)
            model = metadata.get('model', 'u2net')
            
            # Get uploaded file
            uploaded_file = job.get('uploaded_file')
            if not uploaded_file:
                raise ValueError("No uploaded file in job data")
            
            # Read file bytes
            file_path = Path(self.upload_base_dir) / uploaded_file
            if not file_path.exists():
                raise FileNotFoundError(f"Uploaded file not found: {file_path}")
            
            with open(file_path, 'rb') as f:
                image_bytes = f.read()
            
            logger.info(f"Processing single image: {uploaded_file}")
            
            # Process image in executor (non-blocking)
            loop = asyncio.get_event_loop()
            processed_bytes, proc_metadata = await loop.run_in_executor(
                self.executor,
                self.image_processor.process_image,
                image_bytes,
                remove_bg,
                crop_face,
                model
            )
            
            # Convert to base64 for storage
            processed_b64 = base64.b64encode(processed_bytes).decode('utf-8')
            
            # Store result
            results = {
                "filename": uploaded_file,
                "success": True,
                "processed_image": f"data:image/png;base64,{processed_b64}",
                "metadata": proc_metadata,
                "size_bytes": len(processed_bytes)
            }
            
            # Update job with results
            self.queue_manager.update_job_status(
                job_id,
                JobStatus.COMPLETED,
                processed_files=1,
                results=results
            )
            logger.info(f"Single job {job_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Error processing single image: {str(e)}", exc_info=True)
            self.queue_manager.update_job_status(
                job_id,
                JobStatus.FAILED,
                error_message=str(e)
            )
    
    async def _process_batch_job(self, job_id: str, job: dict):
        """
        Process a batch of images
        
        Args:
            job_id: Job ID
            job: Job data
        """
        try:
            # Get processing options from metadata
            metadata = job.get('metadata', {})
            remove_bg = metadata.get('remove_bg', True)
            crop_face = metadata.get('crop_face', True)
            model = metadata.get('model', 'u2net')
            
            filenames = job.get('filenames', [])
            if not filenames:
                raise ValueError("No filenames in batch job")
            
            results = []
            processed = 0
            failed = 0
            
            logger.info(f"Processing batch job {job_id} with {len(filenames)} images")
            
            for idx, filename in enumerate(filenames):
                try:
                    # Update progress
                    self.queue_manager.update_job_status(
                        job_id,
                        JobStatus.PROCESSING,
                        processed_files=processed,
                        failed_files=failed
                    )
                    
                    # Read file
                    file_path = Path(self.upload_base_dir) / filename
                    if not file_path.exists():
                        raise FileNotFoundError(f"File not found: {file_path}")
                    
                    with open(file_path, 'rb') as f:
                        image_bytes = f.read()
                    
                    logger.info(f"Processing batch item {idx+1}/{len(filenames)}: {filename}")
                    
                    # Process image in executor
                    loop = asyncio.get_event_loop()
                    processed_bytes, proc_metadata = await loop.run_in_executor(
                        self.executor,
                        self.image_processor.process_image,
                        image_bytes,
                        remove_bg,
                        crop_face,
                        model
                    )
                    
                    # Convert to base64 for storage
                    processed_b64 = base64.b64encode(processed_bytes).decode('utf-8')
                    
                    result = {
                        "index": idx,
                        "filename": filename,
                        "success": True,
                        "processed_image": f"data:image/png;base64,{processed_b64[:100]}...",  # Truncate in result list
                        "metadata": proc_metadata,
                        "size_bytes": len(processed_bytes)
                    }
                    results.append(result)
                    processed += 1
                    logger.info(f"Successfully processed: {filename}")
                
                except Exception as e:
                    logger.warning(f"Failed to process {filename}: {str(e)}")
                    failed += 1
                    results.append({
                        "index": idx,
                        "filename": filename,
                        "success": False,
                        "error": str(e)
                    })
            
            # Mark as completed
            summary = {
                "total": len(filenames),
                "successful": processed,
                "failed": failed,
                "success_rate": f"{(processed/len(filenames)*100):.1f}%"
            }
            
            self.queue_manager.update_job_status(
                job_id,
                JobStatus.COMPLETED,
                processed_files=processed,
                failed_files=failed,
                results={"items": results, "summary": summary}
            )
            logger.info(f"Batch job {job_id} completed: {processed} successful, {failed} failed")
            
        except Exception as e:
            logger.error(f"Error processing batch job: {str(e)}", exc_info=True)
            self.queue_manager.update_job_status(
                job_id,
                JobStatus.FAILED,
                error_message=str(e)
            )
    
    def process_image_bytes(
        self,
        image_bytes: bytes,
        model: str = "u2net"
    ) -> bytes:
        """
        Process image bytes (can be called from async context via executor)
        
        Args:
            image_bytes: Image file bytes
            model: Rembg model to use
        
        Returns:
            Processed image bytes
        """
        try:
            input_image = Image.open(io.BytesIO(image_bytes))
            
            if input_image.mode != 'RGB':
                input_image = input_image.convert('RGB')
            
            output_image = remove(input_image)
            
            if output_image.mode != 'RGBA':
                output_image = output_image.convert('RGBA')
            
            output_bytes = io.BytesIO()
            output_image.save(output_bytes, format='PNG')
            output_bytes.seek(0)
            
            return output_bytes.getvalue()
        
        except Exception as e:
            logger.error(f"Error processing image: {str(e)}")
            raise


# Global worker instance
_worker: Optional[JobWorker] = None


def init_worker(queue_manager: QueueManager, max_concurrent: int = 2):
    """Initialize the global worker instance"""
    global _worker
    _worker = JobWorker(queue_manager, max_concurrent=max_concurrent)
    return _worker


def get_worker() -> Optional[JobWorker]:
    """Get the global worker instance"""
    return _worker


async def start_worker():
    """Start the global worker"""
    if _worker:
        await _worker.start()


async def stop_worker():
    """Stop the global worker gracefully"""
    if _worker:
        await _worker.stop()
