"""
Queue Management System for Rembg Microservice

Manages job queuing, tracking, and processing for background removal tasks.
Supports single and batch image processing with persistent storage and status tracking.
"""

import sqlite3
import json
import uuid
from datetime import datetime
from typing import Optional, Dict, List
from enum import Enum
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class JobStatus(str, Enum):
    """Job status enumeration"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class QueueManager:
    """
    Manages job queue with SQLite persistence.
    Tracks job status, results, and errors.
    """
    
    def __init__(self, db_path: str = "queue.db"):
        """
        Initialize queue manager
        
        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize SQLite database with job table"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    started_at TEXT,
                    completed_at TEXT,
                    job_type TEXT NOT NULL,
                    filenames TEXT,
                    total_files INTEGER,
                    processed_files INTEGER DEFAULT 0,
                    failed_files INTEGER DEFAULT 0,
                    model TEXT,
                    error_message TEXT,
                    results TEXT,
                    metadata TEXT
                )
            """)
            conn.commit()
            logger.info(f"Database initialized at {self.db_path}")
    
    def create_job(
        self,
        job_type: str,
        filenames: List[str],
        model: str = "u2net",
        metadata: Optional[Dict] = None
    ) -> str:
        """
        Create a new job in the queue
        
        Args:
            job_type: Type of job ("single" or "batch")
            filenames: List of filenames being processed
            model: Rembg model to use
            metadata: Additional metadata
        
        Returns:
            Job ID
        """
        job_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO jobs (
                    id, status, created_at, job_type, filenames,
                    total_files, model, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                job_id,
                JobStatus.PENDING.value,
                now,
                job_type,
                json.dumps(filenames),
                len(filenames),
                model,
                json.dumps(metadata or {})
            ))
            conn.commit()
        
        logger.info(f"Created job {job_id} with {len(filenames)} file(s)")
        return job_id
    
    def get_job(self, job_id: str) -> Optional[Dict]:
        """
        Get job details
        
        Args:
            job_id: Job ID
        
        Returns:
            Job dictionary or None if not found
        """
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
            row = cursor.fetchone()
        
        if not row:
            return None
        
        job = dict(row)
        # Parse JSON fields
        if job['filenames']:
            job['filenames'] = json.loads(job['filenames'])
        if job['results']:
            job['results'] = json.loads(job['results'])
        if job['metadata']:
            job['metadata'] = json.loads(job['metadata'])
        
        return job
    
    def update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        **kwargs
    ) -> bool:
        """
        Update job status
        
        Args:
            job_id: Job ID
            status: New status
            **kwargs: Additional fields to update (processed_files, failed_files, error_message, etc.)
        
        Returns:
            True if successful
        """
        updates = ["status = ?"]
        values = [status.value]
        
        # Handle status-specific fields
        if status == JobStatus.PROCESSING and not self._has_started(job_id):
            updates.append("started_at = ?")
            values.append(datetime.utcnow().isoformat())
        
        if status == JobStatus.COMPLETED:
            updates.append("completed_at = ?")
            values.append(datetime.utcnow().isoformat())
        
        # Add custom updates
        for key, value in kwargs.items():
            if key in ['processed_files', 'failed_files', 'error_message', 'results']:
                updates.append(f"{key} = ?")
                if key == 'results':
                    values.append(json.dumps(value) if isinstance(value, dict) else value)
                else:
                    values.append(value)
        
        values.append(job_id)
        query = f"UPDATE jobs SET {', '.join(updates)} WHERE id = ?"
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(query, values)
            conn.commit()
            success = cursor.rowcount > 0
        
        if success:
            logger.info(f"Job {job_id} status updated to {status.value}")
        
        return success
    
    def _has_started(self, job_id: str) -> bool:
        """Check if job has already started"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT started_at FROM jobs WHERE id = ?",
                (job_id,)
            )
            row = cursor.fetchone()
        
        return row and row[0] is not None
    
    def get_pending_jobs(self, limit: int = 10) -> List[Dict]:
        """
        Get pending jobs
        
        Args:
            limit: Maximum number of jobs to return
        
        Returns:
            List of pending jobs
        """
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT * FROM jobs
                WHERE status = ?
                ORDER BY created_at ASC
                LIMIT ?
            """, (JobStatus.PENDING.value, limit))
            rows = cursor.fetchall()
        
        jobs = []
        for row in rows:
            job = dict(row)
            if job['filenames']:
                job['filenames'] = json.loads(job['filenames'])
            jobs.append(job)
        
        return jobs
    
    def get_job_stats(self) -> Dict:
        """
        Get queue statistics
        
        Returns:
            Dictionary with queue stats
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT
                    status,
                    COUNT(*) as count
                FROM jobs
                GROUP BY status
            """)
            rows = cursor.fetchall()
        
        stats = {
            JobStatus.PENDING.value: 0,
            JobStatus.PROCESSING.value: 0,
            JobStatus.COMPLETED.value: 0,
            JobStatus.FAILED.value: 0,
            JobStatus.CANCELLED.value: 0,
            "total": 0
        }
        
        for status, count in rows:
            if status in stats:
                stats[status] = count
            stats["total"] += count
        
        return stats
    
    def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a job (only if not already processing/completed)
        
        Args:
            job_id: Job ID
        
        Returns:
            True if cancelled
        """
        job = self.get_job(job_id)
        if not job:
            return False
        
        if job['status'] in [JobStatus.PROCESSING.value, JobStatus.COMPLETED.value]:
            logger.warning(f"Cannot cancel job {job_id} with status {job['status']}")
            return False
        
        return self.update_job_status(job_id, JobStatus.CANCELLED)
    
    def cleanup_old_jobs(self, days: int = 7) -> int:
        """
        Clean up old completed jobs
        
        Args:
            days: Delete jobs older than this many days
        
        Returns:
            Number of jobs deleted
        """
        from datetime import timedelta
        cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                DELETE FROM jobs
                WHERE (status = ? OR status = ?)
                AND completed_at IS NOT NULL
                AND completed_at < ?
            """, (
                JobStatus.COMPLETED.value,
                JobStatus.FAILED.value,
                cutoff_date
            ))
            conn.commit()
            deleted = cursor.rowcount
        
        logger.info(f"Cleaned up {deleted} old jobs")
        return deleted
    
    def export_job_results(self, job_id: str) -> Optional[Dict]:
        """
        Export job results in a client-friendly format
        
        Args:
            job_id: Job ID
        
        Returns:
            Formatted job result or None
        """
        job = self.get_job(job_id)
        if not job:
            return None
        
        return {
            "id": job['id'],
            "status": job['status'],
            "type": job['job_type'],
            "created_at": job['created_at'],
            "started_at": job['started_at'],
            "completed_at": job['completed_at'],
            "progress": {
                "total": job['total_files'],
                "processed": job['processed_files'],
                "failed": job['failed_files']
            },
            "model": job['model'],
            "filenames": job['filenames'],
            "results": job['results'],
            "error": job['error_message']
        }
