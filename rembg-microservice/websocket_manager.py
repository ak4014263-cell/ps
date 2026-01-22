"""
WebSocket Support for Real-time Job Status Updates

Enables real-time progress tracking without polling.
Clients subscribe to job updates and receive notifications as processing progresses.
"""

import asyncio
import json
import logging
from typing import Dict, Set, Callable
from queue_manager import QueueManager
import uuid

logger = logging.getLogger(__name__)


class JobProgressManager:
    """
    Manages WebSocket connections and broadcasts job progress updates
    """
    
    def __init__(self, queue_manager: QueueManager):
        """
        Initialize progress manager
        
        Args:
            queue_manager: QueueManager instance for job queries
        """
        self.queue_manager = queue_manager
        self.subscribers: Dict[str, Set[Callable]] = {}  # job_id -> set of callbacks
        self.active_connections: Dict[str, dict] = {}  # client_id -> connection info
    
    async def subscribe(self, job_id: str, client_id: str, send_callback: Callable):
        """
        Subscribe to job updates
        
        Args:
            job_id: Job ID to monitor
            client_id: Unique client identifier
            send_callback: Async callback to send updates to client
        """
        if job_id not in self.subscribers:
            self.subscribers[job_id] = set()
        
        self.subscribers[job_id].add(send_callback)
        self.active_connections[client_id] = {
            "job_id": job_id,
            "callback": send_callback,
            "subscribed_at": asyncio.get_event_loop().time()
        }
        
        logger.info(f"Client {client_id[:8]} subscribed to job {job_id[:8]}")
        
        # Send initial status
        job = self.queue_manager.get_job(job_id)
        if job:
            await send_callback(self._format_update(job, "subscribed"))
    
    async def unsubscribe(self, client_id: str):
        """
        Unsubscribe from job updates
        
        Args:
            client_id: Client identifier
        """
        if client_id in self.active_connections:
            conn = self.active_connections.pop(client_id)
            job_id = conn["job_id"]
            
            if job_id in self.subscribers:
                self.subscribers[job_id].discard(conn["callback"])
                
                # Clean up empty sets
                if not self.subscribers[job_id]:
                    del self.subscribers[job_id]
            
            logger.info(f"Client {client_id[:8]} unsubscribed from job {job_id[:8]}")
    
    async def broadcast_update(self, job_id: str, update_type: str = "progress"):
        """
        Broadcast job update to all subscribers
        
        Args:
            job_id: Job ID
            update_type: Type of update (progress, completed, failed, etc.)
        """
        if job_id not in self.subscribers:
            return
        
        job = self.queue_manager.get_job(job_id)
        if not job:
            logger.warning(f"Job {job_id} not found for broadcast")
            return
        
        message = self._format_update(job, update_type)
        
        # Send to all subscribers
        failed_callbacks = []
        for callback in list(self.subscribers[job_id]):
            try:
                await callback(message)
            except Exception as e:
                logger.error(f"Error sending update: {e}")
                failed_callbacks.append(callback)
        
        # Remove failed callbacks
        for callback in failed_callbacks:
            self.subscribers[job_id].discard(callback)
    
    def _format_update(self, job: dict, update_type: str) -> dict:
        """
        Format job update message
        
        Args:
            job: Job data from queue_manager
            update_type: Type of update
        
        Returns:
            Formatted update message
        """
        progress = job.get('progress', {})
        
        return {
            "type": update_type,
            "job_id": job['id'],
            "status": job['status'],
            "progress": {
                "processed": progress.get('processed', 0),
                "total": progress.get('total', 0),
                "percentage": (
                    (progress.get('processed', 0) / progress.get('total', 1)) * 100
                    if progress.get('total', 0) > 0 else 0
                )
            },
            "metadata": {
                "created_at": job.get('created_at'),
                "updated_at": job.get('updated_at'),
                "job_type": job.get('job_type'),
                "file_count": job.get('file_count', 0)
            },
            "error": job.get('error') if job['status'] == 'failed' else None
        }
    
    def get_connection_count(self) -> int:
        """Get active connection count"""
        return len(self.active_connections)
    
    def get_job_subscribers(self, job_id: str) -> int:
        """Get subscriber count for a job"""
        return len(self.subscribers.get(job_id, set()))
    
    async def cleanup_abandoned_subscriptions(self, timeout_seconds: int = 300):
        """
        Clean up abandoned subscriptions (clients that disconnected)
        
        Args:
            timeout_seconds: Timeout for active subscriptions
        """
        current_time = asyncio.get_event_loop().time()
        to_remove = []
        
        for client_id, conn in self.active_connections.items():
            age = current_time - conn["subscribed_at"]
            if age > timeout_seconds:
                to_remove.append(client_id)
        
        for client_id in to_remove:
            await self.unsubscribe(client_id)
            logger.info(f"Cleaned up abandoned subscription: {client_id[:8]}")


# Global instance
_progress_manager: JobProgressManager = None


def init_progress_manager(queue_manager: QueueManager):
    """Initialize the global progress manager"""
    global _progress_manager
    _progress_manager = JobProgressManager(queue_manager)
    return _progress_manager


def get_progress_manager() -> JobProgressManager:
    """Get the global progress manager"""
    return _progress_manager


# FastAPI WebSocket integration helper
from fastapi import WebSocket, WebSocketDisconnect
from contextlib import asynccontextmanager


class WebSocketJobTracker:
    """Helper class for managing WebSocket connections in FastAPI"""
    
    def __init__(self, progress_manager: JobProgressManager):
        """
        Initialize tracker
        
        Args:
            progress_manager: JobProgressManager instance
        """
        self.progress_manager = progress_manager
    
    @asynccontextmanager
    async def track(self, websocket: WebSocket, job_id: str):
        """
        Context manager for tracking a job via WebSocket
        
        Usage:
            async with tracker.track(websocket, job_id) as client_id:
                # WebSocket is now connected and subscribed
                # Handle messages, etc.
        
        Yields:
            client_id: Unique identifier for this connection
        """
        client_id = str(uuid.uuid4())
        
        try:
            await websocket.accept()
            
            async def send_to_client(message: dict):
                """Send message to WebSocket client"""
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending WebSocket message: {e}")
            
            # Subscribe to job updates
            await self.progress_manager.subscribe(job_id, client_id, send_to_client)
            
            yield client_id
            
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected: {client_id[:8]}")
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            # Cleanup on disconnect
            await self.progress_manager.unsubscribe(client_id)
            try:
                await websocket.close()
            except:
                pass


def create_websocket_endpoint(progress_manager: JobProgressManager):
    """
    Create a WebSocket endpoint handler
    
    Returns a handler function for FastAPI WebSocket route
    
    Usage in app.py:
        progress_mgr = get_progress_manager()
        
        @app.websocket("/ws/job/{job_id}")
        async def websocket_endpoint(websocket: WebSocket, job_id: str):
            handler = create_websocket_endpoint(progress_mgr)
            await handler(websocket, job_id)
    """
    tracker = WebSocketJobTracker(progress_manager)
    
    async def handler(websocket: WebSocket, job_id: str):
        async with tracker.track(websocket, job_id) as client_id:
            # Keep connection open and listen for client messages
            try:
                while True:
                    data = await websocket.receive_text()
                    
                    # Handle ping/keep-alive messages
                    if data == "ping":
                        await websocket.send_json({"type": "pong"})
                    else:
                        logger.debug(f"Received message from client: {data}")
            except WebSocketDisconnect:
                pass
    
    return handler
