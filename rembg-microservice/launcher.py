#!/usr/bin/env python
"""
Simple launcher for rembg microservice
Use: python launcher.py
"""
import os
import sys
import uvicorn

if __name__ == "__main__":
    # Set environment to use single worker (important for Windows)
    os.environ["WORKERS"] = "1"
    
    # Run the app
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=5000,
        reload=False,
        log_level="info"
    )
