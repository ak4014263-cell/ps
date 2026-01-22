#!/usr/bin/env python3
"""
Queue Management Example Script

Demonstrates how to use the queue management system for batch image processing.
"""

import requests
import sys
import time
import json
from pathlib import Path
from typing import List, Optional

BASE_URL = "http://localhost:5000"


def submit_job(image_paths: List[str], model: str = "u2net") -> Optional[str]:
    """
    Submit images for background removal to the queue
    
    Args:
        image_paths: List of paths to image files
        model: Rembg model to use
    
    Returns:
        Job ID or None if failed
    """
    try:
        files = []
        for path in image_paths:
            file_path = Path(path)
            if not file_path.exists():
                print(f"Error: File not found: {path}")
                continue
            files.append(('images', open(file_path, 'rb')))
        
        if not files:
            print("Error: No valid image files provided")
            return None
        
        response = requests.post(
            f"{BASE_URL}/queue/submit",
            params={"model": model},
            files=files
        )
        
        # Close files
        for _, file in files:
            file.close()
        
        if response.status_code != 200:
            print(f"Error: {response.status_code} - {response.text}")
            return None
        
        data = response.json()
        print(f"✓ Job submitted successfully")
        print(f"  Job ID: {data['job_id']}")
        print(f"  Type: {data['job_type']}")
        print(f"  Files: {data['files_count']}")
        print(f"  Model: {data['model']}")
        
        return data['job_id']
    
    except Exception as e:
        print(f"Error submitting job: {str(e)}")
        return None


def get_job_status(job_id: str) -> Optional[dict]:
    """
    Get current job status
    
    Args:
        job_id: Job ID to check
    
    Returns:
        Job details or None if failed
    """
    try:
        response = requests.get(f"{BASE_URL}/queue/job/{job_id}")
        
        if response.status_code == 404:
            print(f"Error: Job {job_id} not found")
            return None
        
        if response.status_code != 200:
            print(f"Error: {response.status_code} - {response.text}")
            return None
        
        return response.json()
    
    except Exception as e:
        print(f"Error fetching job status: {str(e)}")
        return None


def monitor_job(job_id: str, poll_interval: int = 2) -> bool:
    """
    Monitor job until completion
    
    Args:
        job_id: Job ID to monitor
        poll_interval: Seconds between status checks
    
    Returns:
        True if completed successfully
    """
    print(f"\nMonitoring job {job_id}...\n")
    
    while True:
        job = get_job_status(job_id)
        if not job:
            return False
        
        status = job['status']
        progress = job['progress']
        
        # Print status
        percentage = (progress['processed'] / progress['total'] * 100) if progress['total'] > 0 else 0
        print(f"Status: {status.upper():12} | Progress: {progress['processed']:3}/{progress['total']:3} ({percentage:5.1f}%)", end='\r')
        
        # Check if done
        if status in ['completed', 'failed', 'cancelled']:
            print()  # New line after progress
            
            if status == 'completed':
                print(f"\n✓ Job completed successfully!")
                print(f"  Processed: {progress['processed']}")
                print(f"  Failed: {progress['failed']}")
                if job['results']:
                    print(f"  Results: {json.dumps(job['results'], indent=2)}")
                return True
            
            elif status == 'failed':
                print(f"\n✗ Job failed!")
                if job['error']:
                    print(f"  Error: {job['error']}")
                return False
            
            elif status == 'cancelled':
                print(f"\n⊘ Job was cancelled")
                return False
        
        time.sleep(poll_interval)


def list_queue_jobs(status: Optional[str] = None, limit: int = 10) -> bool:
    """
    List jobs in queue
    
    Args:
        status: Filter by status (optional)
        limit: Maximum jobs to return
    
    Returns:
        True if successful
    """
    try:
        params = {"limit": limit}
        if status:
            params["status"] = status
        
        response = requests.get(f"{BASE_URL}/queue/jobs", params=params)
        
        if response.status_code != 200:
            print(f"Error: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        jobs = data['jobs']
        
        if not jobs:
            print(f"No jobs found")
            return True
        
        print(f"\n{data['total']} job(s) in queue:\n")
        
        for idx, job in enumerate(jobs, 1):
            progress = job['progress']
            print(f"{idx}. ID: {job['id'][:8]}...")
            print(f"   Status: {job['status'].upper()}")
            print(f"   Type: {job['type']}")
            print(f"   Progress: {progress['processed']}/{progress['total']}")
            print(f"   Model: {job['model']}")
            print()
        
        return True
    
    except Exception as e:
        print(f"Error listing jobs: {str(e)}")
        return False


def get_queue_stats() -> bool:
    """
    Get queue statistics
    
    Returns:
        True if successful
    """
    try:
        response = requests.get(f"{BASE_URL}/queue/stats")
        
        if response.status_code != 200:
            print(f"Error: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        stats = data['stats']
        worker = data['worker']
        
        print("\n=== Queue Statistics ===\n")
        print(f"Total Jobs:     {stats['total']}")
        print(f"  Pending:      {stats['pending']}")
        print(f"  Processing:   {stats['processing']}")
        print(f"  Completed:    {stats['completed']}")
        print(f"  Failed:       {stats['failed']}")
        print(f"  Cancelled:    {stats['cancelled']}")
        
        print(f"\n=== Worker Status ===\n")
        print(f"Status:         {worker['status'].upper()}")
        print(f"Active Jobs:    {worker['active_jobs']}/{worker['max_concurrent']}")
        
        return True
    
    except Exception as e:
        print(f"Error fetching stats: {str(e)}")
        return False


def cancel_job(job_id: str) -> bool:
    """
    Cancel a job
    
    Args:
        job_id: Job ID to cancel
    
    Returns:
        True if successful
    """
    try:
        response = requests.post(f"{BASE_URL}/queue/job/{job_id}/cancel")
        
        if response.status_code != 200:
            print(f"Error: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        print(f"✓ Job cancelled: {data['message']}")
        return True
    
    except Exception as e:
        print(f"Error cancelling job: {str(e)}")
        return False


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Queue Management CLI")
        print("\nUsage:")
        print("  python queue_example.py submit <image1> [image2] ...")
        print("  python queue_example.py status <job_id>")
        print("  python queue_example.py monitor <job_id>")
        print("  python queue_example.py list [status] [limit]")
        print("  python queue_example.py stats")
        print("  python queue_example.py cancel <job_id>")
        print("\nExamples:")
        print("  python queue_example.py submit image1.jpg image2.png")
        print("  python queue_example.py monitor 550e8400-e29b-41d4-a716-446655440000")
        print("  python queue_example.py list processing 5")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "submit":
        if len(sys.argv) < 3:
            print("Error: Please provide at least one image file")
            sys.exit(1)
        
        image_paths = sys.argv[2:]
        job_id = submit_job(image_paths)
        
        if job_id:
            print(f"\nMonitor this job with:")
            print(f"  python queue_example.py monitor {job_id}")
    
    elif command == "status":
        if len(sys.argv) < 3:
            print("Error: Please provide a job ID")
            sys.exit(1)
        
        job_id = sys.argv[2]
        job = get_job_status(job_id)
        
        if job:
            print(f"\nJob: {job['id']}")
            print(f"Status: {job['status'].upper()}")
            print(f"Type: {job['type']}")
            print(f"Progress: {job['progress']['processed']}/{job['progress']['total']}")
            print(f"Model: {job['model']}")
    
    elif command == "monitor":
        if len(sys.argv) < 3:
            print("Error: Please provide a job ID")
            sys.exit(1)
        
        job_id = sys.argv[2]
        success = monitor_job(job_id)
        sys.exit(0 if success else 1)
    
    elif command == "list":
        status = sys.argv[2] if len(sys.argv) > 2 else None
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 10
        list_queue_jobs(status, limit)
    
    elif command == "stats":
        get_queue_stats()
    
    elif command == "cancel":
        if len(sys.argv) < 3:
            print("Error: Please provide a job ID")
            sys.exit(1)
        
        job_id = sys.argv[2]
        cancel_job(job_id)
    
    else:
        print(f"Error: Unknown command '{command}'")
        sys.exit(1)


if __name__ == "__main__":
    main()
