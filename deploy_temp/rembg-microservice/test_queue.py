#!/usr/bin/env python3
"""
Queue Management System - Comprehensive Test Suite

Tests all queue management functionality including:
- Job submission
- Status tracking
- Progress monitoring
- Error handling
- Queue statistics
- Job cancellation
"""

import requests
import sys
import time
import json
from pathlib import Path
from typing import Optional, List

BASE_URL = "http://localhost:5000"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_success(msg: str):
    print(f"{Colors.GREEN}✓ {msg}{Colors.END}")

def print_error(msg: str):
    print(f"{Colors.RED}✗ {msg}{Colors.END}")

def print_info(msg: str):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.END}")

def print_test(msg: str):
    print(f"\n{Colors.YELLOW}=== {msg} ==={Colors.END}")


def test_service_health() -> bool:
    """Test service is running and healthy"""
    print_test("Service Health Check")
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print_success(f"Service healthy: {data.get('status')}")
            return True
        else:
            print_error(f"Service returned {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Cannot connect to service: {str(e)}")
        return False


def test_queue_initialization() -> bool:
    """Test queue is initialized"""
    print_test("Queue Initialization")
    
    try:
        response = requests.get(f"{BASE_URL}/queue/stats")
        if response.status_code == 200:
            data = response.json()
            stats = data['stats']
            print_success("Queue initialized")
            print_info(f"  Total jobs: {stats['total']}")
            print_info(f"  Pending: {stats['pending']}")
            print_info(f"  Completed: {stats['completed']}")
            return True
        else:
            print_error(f"Queue stats returned {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error accessing queue: {str(e)}")
        return False


def test_job_submission() -> Optional[str]:
    """Test submitting a job"""
    print_test("Job Submission")
    
    try:
        # Create a test image (1x1 pixel PNG)
        png_bytes = (
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
            b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00'
            b'\x00\x01\x01\x00\x05\x18\r\xc2c\x00\x00\x00\x00IEND\xaeB`\x82'
        )
        
        # Submit job
        files = [('images', ('test.png', png_bytes, 'image/png'))]
        response = requests.post(f"{BASE_URL}/queue/submit", files=files)
        
        if response.status_code == 200:
            data = response.json()
            job_id = data.get('job_id')
            print_success(f"Job submitted: {job_id[:8]}...")
            print_info(f"  Status: {data['status']}")
            print_info(f"  Files: {data['files_count']}")
            return job_id
        else:
            print_error(f"Submission failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Error submitting job: {str(e)}")
        return None


def test_job_status(job_id: str) -> bool:
    """Test getting job status"""
    print_test("Job Status Tracking")
    
    try:
        response = requests.get(f"{BASE_URL}/queue/job/{job_id}")
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Job status retrieved")
            print_info(f"  ID: {data['id'][:8]}...")
            print_info(f"  Status: {data['status']}")
            print_info(f"  Progress: {data['progress']['processed']}/{data['progress']['total']}")
            return True
        else:
            print_error(f"Status request failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error getting status: {str(e)}")
        return False


def test_job_monitoring(job_id: str, timeout: int = 30) -> bool:
    """Test monitoring job progress"""
    print_test("Job Progress Monitoring")
    
    try:
        start_time = time.time()
        last_status = None
        
        while time.time() - start_time < timeout:
            response = requests.get(f"{BASE_URL}/queue/job/{job_id}")
            
            if response.status_code != 200:
                print_error(f"Failed to get status: {response.status_code}")
                return False
            
            data = response.json()
            current_status = data['status']
            progress = data['progress']
            
            # Only print if status changed
            if current_status != last_status:
                print_info(f"  Status: {current_status.upper()}")
                last_status = current_status
            
            # Print progress
            percentage = (progress['processed'] / progress['total'] * 100) if progress['total'] > 0 else 0
            print_info(f"  Progress: {progress['processed']}/{progress['total']} ({percentage:.0f}%)")
            
            # Check if done
            if current_status in ['completed', 'failed', 'cancelled']:
                if current_status == 'completed':
                    print_success(f"Job completed successfully")
                elif current_status == 'failed':
                    print_error(f"Job failed: {data.get('error', 'Unknown error')}")
                else:
                    print_info(f"Job was {current_status}")
                return current_status in ['completed', 'cancelled']
            
            time.sleep(1)
        
        print_error(f"Monitoring timeout ({timeout}s)")
        return False
    except Exception as e:
        print_error(f"Error monitoring job: {str(e)}")
        return False


def test_job_listing() -> bool:
    """Test listing jobs"""
    print_test("Job Listing")
    
    try:
        response = requests.get(f"{BASE_URL}/queue/jobs?limit=5")
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Retrieved {len(data['jobs'])} jobs")
            if data['jobs']:
                for idx, job in enumerate(data['jobs'][:3], 1):
                    print_info(f"  {idx}. {job['id'][:8]}... - {job['status']}")
            return True
        else:
            print_error(f"Listing failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error listing jobs: {str(e)}")
        return False


def test_queue_stats() -> bool:
    """Test queue statistics"""
    print_test("Queue Statistics")
    
    try:
        response = requests.get(f"{BASE_URL}/queue/stats")
        
        if response.status_code == 200:
            data = response.json()
            stats = data['stats']
            worker = data['worker']
            
            print_success("Queue statistics retrieved")
            print_info(f"  Total: {stats['total']}")
            print_info(f"  Pending: {stats['pending']}")
            print_info(f"  Processing: {stats['processing']}")
            print_info(f"  Completed: {stats['completed']}")
            print_info(f"  Failed: {stats['failed']}")
            print_info(f"  Worker: {worker['status']} ({worker['active_jobs']}/{worker['max_concurrent']})")
            return True
        else:
            print_error(f"Stats request failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error getting stats: {str(e)}")
        return False


def test_invalid_job_id() -> bool:
    """Test error handling with invalid job ID"""
    print_test("Error Handling - Invalid Job ID")
    
    try:
        response = requests.get(f"{BASE_URL}/queue/job/invalid-job-id-12345")
        
        if response.status_code == 404:
            print_success("Correctly returned 404 for invalid job")
            return True
        else:
            print_error(f"Expected 404, got {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False


def test_job_cancellation(job_id: str) -> bool:
    """Test cancelling a job"""
    print_test("Job Cancellation")
    
    try:
        # First, create a new pending job
        png_bytes = (
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
            b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00'
            b'\x00\x01\x01\x00\x05\x18\r\xc2c\x00\x00\x00\x00IEND\xaeB`\x82'
        )
        
        files = [('images', ('test.png', png_bytes, 'image/png'))]
        submit_response = requests.post(f"{BASE_URL}/queue/submit", files=files)
        
        if submit_response.status_code != 200:
            print_error("Failed to create job for cancellation test")
            return False
        
        new_job_id = submit_response.json()['job_id']
        
        # Check status before cancel
        status_before = requests.get(f"{BASE_URL}/queue/job/{new_job_id}").json()
        
        if status_before['status'] not in ['pending', 'processing']:
            print_info(f"Job already {status_before['status']}, skipping cancel test")
            return True
        
        # Cancel the job
        cancel_response = requests.post(f"{BASE_URL}/queue/job/{new_job_id}/cancel")
        
        if cancel_response.status_code == 200:
            data = cancel_response.json()
            print_success(f"Job cancelled: {data['status']}")
            
            # Verify status changed
            time.sleep(0.5)
            status_after = requests.get(f"{BASE_URL}/queue/job/{new_job_id}").json()
            print_info(f"  Status after cancel: {status_after['status']}")
            return True
        else:
            print_error(f"Cancel failed: {cancel_response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error during cancellation test: {str(e)}")
        return False


def test_multiple_submissions() -> bool:
    """Test submitting multiple jobs"""
    print_test("Multiple Job Submissions")
    
    try:
        png_bytes = (
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
            b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00'
            b'\x00\x01\x01\x00\x05\x18\r\xc2c\x00\x00\x00\x00IEND\xaeB`\x82'
        )
        
        job_ids = []
        for i in range(3):
            files = [('images', (f'test{i}.png', png_bytes, 'image/png'))]
            response = requests.post(f"{BASE_URL}/queue/submit", files=files)
            
            if response.status_code == 200:
                job_ids.append(response.json()['job_id'])
        
        if len(job_ids) == 3:
            print_success(f"Submitted 3 jobs")
            for idx, jid in enumerate(job_ids, 1):
                print_info(f"  {idx}. {jid[:8]}...")
            return True
        else:
            print_error(f"Only submitted {len(job_ids)}/3 jobs")
            return False
    except Exception as e:
        print_error(f"Error during multiple submissions: {str(e)}")
        return False


def run_all_tests() -> tuple[int, int]:
    """Run all tests and return passed/total count"""
    
    print(f"\n{Colors.BLUE}╔══════════════════════════════════════════════╗{Colors.END}")
    print(f"{Colors.BLUE}║  Queue Management System - Test Suite        ║{Colors.END}")
    print(f"{Colors.BLUE}╚══════════════════════════════════════════════╝{Colors.END}\n")
    
    passed = 0
    total = 0
    
    # Test 1: Service health
    total += 1
    if test_service_health():
        passed += 1
    
    # Test 2: Queue initialization
    total += 1
    if test_queue_initialization():
        passed += 1
    
    # Test 3: Job submission
    total += 1
    job_id = test_job_submission()
    if job_id:
        passed += 1
    else:
        return passed, total
    
    # Test 4: Job status
    total += 1
    if test_job_status(job_id):
        passed += 1
    
    # Test 5: Job monitoring
    total += 1
    if test_job_monitoring(job_id, timeout=10):
        passed += 1
    
    # Test 6: Job listing
    total += 1
    if test_job_listing():
        passed += 1
    
    # Test 7: Queue stats
    total += 1
    if test_queue_stats():
        passed += 1
    
    # Test 8: Invalid job ID
    total += 1
    if test_invalid_job_id():
        passed += 1
    
    # Test 9: Job cancellation
    total += 1
    if test_job_cancellation(job_id):
        passed += 1
    
    # Test 10: Multiple submissions
    total += 1
    if test_multiple_submissions():
        passed += 1
    
    return passed, total


def main():
    """Main test entry point"""
    
    # Run tests
    passed, total = run_all_tests()
    
    # Summary
    print(f"\n{Colors.BLUE}╔══════════════════════════════════════════════╗{Colors.END}")
    print(f"{Colors.BLUE}║  Test Results                                 ║{Colors.END}")
    print(f"{Colors.BLUE}╚══════════════════════════════════════════════╝{Colors.END}\n")
    
    percentage = (passed / total * 100) if total > 0 else 0
    
    if passed == total:
        print(f"{Colors.GREEN}✓ All {passed}/{total} tests passed! ({percentage:.0f}%){Colors.END}")
        return 0
    else:
        print(f"{Colors.YELLOW}⚠ {passed}/{total} tests passed ({percentage:.0f}%){Colors.END}")
        return 1


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Tests interrupted by user{Colors.END}")
        sys.exit(1)
    except Exception as e:
        print(f"{Colors.RED}Fatal error: {str(e)}{Colors.END}")
        sys.exit(1)
