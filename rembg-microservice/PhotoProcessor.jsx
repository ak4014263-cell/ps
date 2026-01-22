/**
 * Photo Processor Component (React with Hooks)
 * 
 * A complete photo processing interface with drag-drop upload,
 * real-time progress tracking, and result download.
 * 
 * Install dependencies:
 * npm install react axios react-dropzone
 */

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const WS_BASE = (process.env.REACT_APP_WS_URL || 'ws://localhost:5000') + '/ws';

/**
 * Main Photo Processor Component
 */
export const PhotoProcessor = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [processingOptions, setProcessingOptions] = useState({
    remove_bg: true,
    crop_face: true,
    model: 'u2net'
  });
  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const wsRef = useRef(null);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!currentJobId) return;

    const wsUrl = `${WS_BASE}/job/${currentJobId}`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected:', currentJobId);
        setError(null);
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        setJobStatus(data.status);
        if (data.progress) {
          setProgress(data.progress);
        }

        if (data.status === 'completed') {
          setSuccess('✅ Processing complete!');
          // Reconnect interval update
          setTimeout(() => {
            if (wsRef.current) wsRef.current.close();
          }, 1000);
        } else if (data.status === 'failed') {
          setError(`❌ Processing failed: ${data.error || 'Unknown error'}`);
          if (wsRef.current) wsRef.current.close();
        }
      };

      wsRef.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error - falling back to polling');
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
      };

      return () => {
        if (wsRef.current) wsRef.current.close();
      };
    } catch (e) {
      console.warn('WebSocket not available, using polling:', e);
      // Fallback to polling
      pollJobStatus(currentJobId);
    }
  }, [currentJobId]);

  // Polling fallback when WebSocket unavailable
  const pollJobStatus = async (jobId) => {
    const maxWait = 120000; // 2 minutes
    const startTime = Date.now();

    const pollInterval = setInterval(async () => {
      if (Date.now() - startTime > maxWait) {
        clearInterval(pollInterval);
        setError('Job timed out');
        return;
      }

      try {
        const response = await axios.get(`${API_BASE}/process-status/${jobId}`);
        const job = response.data;

        setJobStatus(job.status);
        if (job.progress) {
          setProgress(job.progress);
        }

        if (job.status === 'completed') {
          setSuccess('✅ Processing complete!');
          clearInterval(pollInterval);
        } else if (job.status === 'failed') {
          setError(`❌ Processing failed: ${job.error || 'Unknown error'}`);
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
  };

  // Handle file selection via input
  const handleFileInputChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.add('dragover');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.remove('dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.remove('dragover');
    setSelectedFiles(Array.from(e.dataTransfer.files));
  };

  // Submit files for processing
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      setError('Please select files');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('files', file));
      formData.append('remove_bg', processingOptions.remove_bg);
      formData.append('crop_face', processingOptions.crop_face);
      formData.append('model', processingOptions.model);

      const response = await axios.post(
        `${API_BASE}/upload-and-process`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log('Upload progress:', percentCompleted);
          }
        }
      );

      setCurrentJobId(response.data.job_id);
      setJobStatus('pending');
      setProgress({ processed: 0, total: selectedFiles.length });
      setSuccess(`Processing started! Job ID: ${response.data.job_id.substring(0, 8)}...`);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Upload failed'
      );
    } finally {
      setLoading(false);
    }
  };

  // Download results
  const handleDownload = (format = 'zip') => {
    if (!currentJobId) return;
    
    const url = `${API_BASE}/download-results/${currentJobId}?format=${format}`;
    const a = document.createElement('a');
    a.href = url;
    a.click();
  };

  // Reset form
  const handleReset = () => {
    setSelectedFiles([]);
    setCurrentJobId(null);
    setJobStatus(null);
    setProgress({ processed: 0, total: 0 });
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const progressPercentage = progress.total > 0 
    ? (progress.processed / progress.total) * 100 
    : 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📸 Photo Processor</h1>
        <p style={styles.subtitle}>
          Upload photos or zip file - automatic background removal & face crop
        </p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Drop Zone */}
        <div style={styles.section}>
          <label style={styles.label}>📁 Upload Photos</label>
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={styles.dropZone}
          >
            <div style={styles.dropZoneIcon}>📤</div>
            <div style={styles.dropZoneText}>
              Drop photos or zip file here, or <span style={styles.highlight}>click to select</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.bmp,.gif,.webp,.zip"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* File List */}
          {selectedFiles.length > 0 && (
            <div style={styles.fileList}>
              {selectedFiles.map((file, idx) => (
                <div key={idx} style={styles.fileItem}>
                  <span>{file.name}</span>
                  <span style={styles.fileSize}>{formatFileSize(file.size)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Options */}
        <div style={styles.section}>
          <label style={styles.label}>⚙️ Processing Options</label>

          <div style={styles.optionGroup}>
            <input
              type="checkbox"
              checked={processingOptions.remove_bg}
              onChange={(e) =>
                setProcessingOptions({
                  ...processingOptions,
                  remove_bg: e.target.checked
                })
              }
              style={styles.checkbox}
            />
            <label style={styles.optionLabel}>Remove Background</label>
          </div>

          <div style={styles.optionGroup}>
            <input
              type="checkbox"
              checked={processingOptions.crop_face}
              onChange={(e) =>
                setProcessingOptions({
                  ...processingOptions,
                  crop_face: e.target.checked
                })
              }
              style={styles.checkbox}
            />
            <label style={styles.optionLabel}>Crop Face</label>
          </div>

          <select
            value={processingOptions.model}
            onChange={(e) =>
              setProcessingOptions({
                ...processingOptions,
                model: e.target.value
              })
            }
            style={styles.select}
          >
            <option value="u2net">U2Net - Balanced (2-3s per image)</option>
            <option value="siluette">Siluette - Fast (0.5s per image)</option>
            <option value="isnet-general-use">ISNet - High Quality (1.5s per image)</option>
          </select>
        </div>

        {/* Buttons */}
        <div style={styles.buttonGroup}>
          <button
            type="submit"
            disabled={selectedFiles.length === 0 || loading}
            style={{
              ...styles.button,
              ...styles.primaryButton,
              opacity: selectedFiles.length === 0 || loading ? 0.5 : 1
            }}
          >
            🚀 Process
          </button>
          <button
            type="button"
            onClick={handleReset}
            style={{ ...styles.button, ...styles.secondaryButton }}
          >
            🔄 Clear
          </button>
        </div>
      </form>

      {/* Status Section */}
      {currentJobId && (
        <div style={styles.statusSection}>
          <div style={styles.statusHeader}>Processing Status</div>

          {/* Messages */}
          {error && (
            <div style={{ ...styles.message, ...styles.errorMessage }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ ...styles.message, ...styles.successMessage }}>
              {success}
            </div>
          )}

          {/* Job ID */}
          <div style={styles.jobId}>
            <strong>Job ID:</strong> <code>{currentJobId}</code>
          </div>

          {/* Status Badge */}
          <div
            style={{
              ...styles.badge,
              ...getBadgeStyle(jobStatus)
            }}
          >
            {jobStatus?.toUpperCase() || 'PENDING'}
          </div>

          {/* Progress Bar */}
          {progress.total > 0 && (
            <div style={styles.progressContainer}>
              <div style={styles.progressLabel}>
                <span>Progress</span>
                <span>{progress.processed}/{progress.total}</span>
              </div>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${progressPercentage}%`
                  }}
                >
                  {Math.round(progressPercentage)}%
                </div>
              </div>
            </div>
          )}

          {/* Download Buttons */}
          {jobStatus === 'completed' && (
            <div style={styles.downloadSection}>
              <button
                onClick={() => handleDownload('zip')}
                style={{ ...styles.button, ...styles.downloadButton }}
              >
                📥 Download as ZIP
              </button>
              <button
                onClick={() => handleDownload('individual')}
                style={{ ...styles.button, ...styles.downloadButton }}
              >
                📥 Download First Image
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Utility functions
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function getBadgeStyle(status) {
  const badgeStyles = {
    pending: { background: '#fff3cd', color: '#856404' },
    processing: { background: '#cfe2ff', color: '#084298' },
    completed: { background: '#d1e7dd', color: '#0f5132' },
    failed: { background: '#f8d7da', color: '#842029' }
  };
  return badgeStyles[status] || badgeStyles.pending;
}

// Styles object
const styles = {
  container: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    margin: 0
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    textAlign: 'center',
    padding: '20px',
    background: 'rgba(0,0,0,0.1)',
    color: 'white'
  },
  title: {
    fontSize: '28px',
    margin: '0 0 10px 0'
  },
  subtitle: {
    fontSize: '14px',
    margin: 0,
    opacity: 0.9
  },
  form: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    maxWidth: '500px',
    width: '100%',
    padding: '40px',
    marginTop: '100px'
  },
  section: {
    marginBottom: '25px'
  },
  label: {
    display: 'block',
    fontWeight: 600,
    color: '#333',
    marginBottom: '10px'
  },
  dropZone: {
    border: '2px dashed #667eea',
    borderRadius: '8px',
    padding: '30px',
    textAlign: 'center',
    cursor: 'pointer',
    background: '#f8f9ff',
    transition: 'all 0.3s ease',
    userSelect: 'none'
  },
  dropZoneIcon: {
    fontSize: '32px',
    marginBottom: '10px'
  },
  dropZoneText: {
    color: '#666',
    fontSize: '14px'
  },
  highlight: {
    color: '#667eea',
    fontWeight: 600
  },
  fileList: {
    marginTop: '15px',
    maxHeight: '150px',
    overflowY: 'auto'
  },
  fileItem: {
    padding: '8px',
    background: '#f8f9ff',
    borderRadius: '4px',
    marginBottom: '5px',
    fontSize: '12px',
    color: '#666',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  fileSize: {
    fontSize: '10px',
    background: '#667eea',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '3px',
    marginLeft: '8px'
  },
  optionGroup: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
    padding: '12px',
    background: '#f8f9ff',
    borderRadius: '6px'
  },
  checkbox: {
    width: '20px',
    height: '20px',
    marginRight: '12px',
    cursor: 'pointer'
  },
  optionLabel: {
    flex: 1,
    cursor: 'pointer',
    color: '#333',
    fontWeight: 500,
    margin: 0
  },
  select: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px'
  },
  button: {
    flex: 1,
    padding: '12px 20px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white'
  },
  secondaryButton: {
    background: '#f0f0f0',
    color: '#333'
  },
  downloadButton: {
    background: '#28a745',
    color: 'white',
    marginBottom: '8px'
  },
  statusSection: {
    marginTop: '25px',
    padding: '20px',
    background: '#f8f9ff',
    borderRadius: '8px',
    borderLeft: '4px solid #667eea'
  },
  statusHeader: {
    fontWeight: 600,
    color: '#333',
    marginBottom: '15px'
  },
  message: {
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '10px',
    fontSize: '13px'
  },
  errorMessage: {
    background: '#f8d7da',
    color: '#721c24',
    borderLeft: '3px solid #721c24'
  },
  successMessage: {
    background: '#d4edda',
    color: '#155724',
    borderLeft: '3px solid #155724'
  },
  jobId: {
    fontSize: '12px',
    color: '#666',
    wordBreak: 'break-all',
    marginBottom: '15px',
    padding: '10px',
    background: 'white',
    borderRadius: '4px'
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600
  },
  progressContainer: {
    marginTop: '15px'
  },
  progressLabel: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between'
  },
  progressBar: {
    width: '100%',
    height: '24px',
    background: 'white',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '11px',
    fontWeight: 600,
    transition: 'width 0.3s ease'
  },
  downloadSection: {
    marginTop: '15px'
  }
};

export default PhotoProcessor;
