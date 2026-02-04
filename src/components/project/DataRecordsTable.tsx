import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, MoreHorizontal, Pencil, Trash2, Users, X, Search, Download, Eraser, Loader2, Crop, Image } from 'lucide-react';
import { ImagePreviewDialog } from './ImagePreviewDialog';
import { ImageCropDialog } from './ImageCropDialog';
import { apiService } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { removeBackgroundBatch, getBackgroundRemovalConfig } from '@/lib/backgroundRemoval';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { cropImageToBlob, CropArea } from '@/lib/cropUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import * as XLSX from 'xlsx';
import { deleteCloudinaryPhotos } from '@/lib/cloudinaryDelete';

interface DataRecord {
  id: string;
  record_number: number;
  group_id: string | null;
  processing_status: string | null;
  data_json: Record<string, any>;
  photo_url?: string | null;
  original_photo_url?: string | null;
  cropped_photo_url?: string | null;
}

interface ProjectGroup {
  id: string;
  name: string;
}

interface DataRecordsTableProps {
  records: DataRecord[];
  projectId: string;
  groups?: ProjectGroup[];
  onEditRecord?: (record: DataRecord) => void;
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

export function DataRecordsTable({ records, projectId, groups = [], onEditRecord, onSelectionChange }: DataRecordsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<DataRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [bgRemovalProgress, setBgRemovalProgress] = useState(0);
  // Interactive crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropDialogImage, setCropDialogImage] = useState<{ url: string; recordId: string } | null>(null);
  const [cropDialogMode, setCropDialogMode] = useState<'passport' | 'idcard'>('idcard');
  const [imagePreview, setImagePreview] = useState<{
    open: boolean;
    imageUrl: string | null;
    originalPhotoUrl: string | null;
    recordId: string;
    recordName: string;
  }>({ open: false, imageUrl: null, originalPhotoUrl: null, recordId: '', recordName: '' });
  const queryClient = useQueryClient();

  // Get all unique column names from data_json across all records
  const columns = useMemo(() => {
    const columnSet = new Set<string>();
    records.forEach(record => {
      Object.keys(record.data_json).forEach(key => {
        if (key !== '_original' && key !== 'photo') {
          columnSet.add(key);
        }
      });
    });
    return Array.from(columnSet);
  }, [records]);

  // Get unique statuses
  const statuses = useMemo(() => {
    const statusSet = new Set(records.map(r => r.processing_status || 'pending'));
    return Array.from(statusSet);
  }, [records]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      if (statusFilter !== 'all' && record.processing_status !== statusFilter) {
        return false;
      }
      if (groupFilter !== 'all') {
        if (groupFilter === 'unassigned' && record.group_id !== null) {
          return false;
        } else if (groupFilter !== 'unassigned' && record.group_id !== groupFilter) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const dataValues = Object.values(record.data_json)
          .filter(v => v !== null && typeof v !== 'object')
          .map(v => String(v).toLowerCase());
        const matchesData = dataValues.some(v => v.includes(query));
        const matchesRecordNumber = record.record_number.toString().includes(query);
        return matchesData || matchesRecordNumber;
      }
      return true;
    });
  }, [records, searchQuery, statusFilter, groupFilter]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    const newSelected = checked ? new Set(filteredRecords.map(r => r.id)) : new Set();
    setSelectedIds(newSelected);
    onSelectionChange?.(newSelected);
  };

  const handleSelectRecord = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
    onSelectionChange?.(newSelected);
  };

  const isAllSelected = filteredRecords.length > 0 && filteredRecords.every(r => selectedIds.has(r.id));

  // Delete handlers
  const handleDeleteRecord = async (record: DataRecord) => {
    setRecordToDelete(record);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      // Delete photos from Cloudinary first
      await deleteCloudinaryPhotos([recordToDelete.id]);

      // Delete record via backend API
      await apiService.dataRecordsAPI.delete(recordToDelete.id);

      toast.success('Record and photos deleted');
      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setRecordToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const recordIds = Array.from(selectedIds);
      
      // Delete photos from Cloudinary first
      await deleteCloudinaryPhotos(recordIds);

      // Delete each record via backend API (no batch delete endpoint)
      await Promise.all(
        recordIds.map((id) => apiService.dataRecordsAPI.delete(id))
      );

      toast.success(`Deleted ${selectedIds.size} records and their photos`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
    } catch (error) {
      console.error('Error deleting records:', error);
      toast.error('Failed to delete records');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAssignGroup = async (groupId: string) => {
    if (selectedIds.size === 0) {
      toast.error('Please select records first');
      return;
    }

    try {
      const recordIds = Array.from(selectedIds);
      const newGroupId = groupId === 'none' ? null : groupId;
      
      console.log(`[AssignGroup] Starting: ${recordIds.length} records to group "${newGroupId}"`);
      
      // Update records with new group via backend API
      const results = await Promise.allSettled(
        recordIds.map(id =>
          apiService.dataRecordsAPI.update(id, { group_id: newGroupId })
        )
      );

      // Check results
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      console.log(`[AssignGroup] Results: ${fulfilled.length} success, ${failed.length} failed`);
      
      if (fulfilled.length > 0) {
        // Verify at least one update worked by checking the response data
        const successfulUpdates = fulfilled.map(r => r.value?.data?.group_id);
        console.log(`[AssignGroup] Successfully updated records with group_id:`, successfulUpdates);
        
        if (!successfulUpdates.includes(newGroupId)) {
          console.warn(`[AssignGroup] WARNING: Response shows group_id mismatch`);
        }
      }
      
      if (failed.length > 0) {
        console.error('[AssignGroup] Failed updates:', failed.map(r => r.reason));
        toast.error(`Failed to assign ${failed.length}/${recordIds.length} records`);
        return;
      }
      
      toast.success(`✓ ${recordIds.length} records assigned to group`);
      setSelectedIds(new Set());
      
      // Force a hard refresh
      console.log('[AssignGroup] Invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['project-records', projectId], exact: true });
      queryClient.invalidateQueries({ queryKey: ['project', projectId], exact: true });
      
    } catch (error) {
      console.error('[AssignGroup] Exception:', error);
      toast.error('Failed to assign group: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return 'N/A';
    const group = groups.find(g => g.id === groupId);
    return group?.name || 'N/A';
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setGroupFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || groupFilter !== 'all';

  // Get display name from record
  const getDisplayName = (record: DataRecord) => {
    const data = record.data_json;
    // Prefer first/last name when available
    const first =
      data.firstName ||
      data.FirstName;
    const last =
      data.lastName ||
      data.LastName;

    if (first && last) return `${first} ${last}`;
    if (first) return String(first);

    if (data.Name) return data.Name;
    if (data.name) return data.name;
    // Fallback to admission number if present
    if (data.admNo || data.AdmNo) return String(data.admNo || data.AdmNo);
    return `Record #${record.record_number}`;
  };

  const handleRemoveBackgroundBulk = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select records with photos');
      return;
    }

    setIsRemovingBackground(true);
    setBgRemovalProgress(0);

    try {
      // Check if rembg is configured
      const config = getBackgroundRemovalConfig();
      console.log('[BG Removal] Config:', config);
      
      if (config.provider !== 'rembg-local' && config.provider !== 'rembg-cloud') {
        toast.error('Background removal not available. Configure rembg first.');
        setIsRemovingBackground(false);
        return;
      }

      if (!config.apiUrl) {
        toast.error('rembg API URL not configured');
        setIsRemovingBackground(false);
        return;
      }

      // Test rembg connection before proceeding
      try {
        console.log(`[BG Removal] Testing connection to ${config.apiUrl}/health`);
        const healthCheck = await fetch(`${config.apiUrl}/health`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        if (!healthCheck.ok) {
          throw new Error(`Health check failed: ${healthCheck.status}`);
        }
        const healthData = await healthCheck.json();
        console.log('[BG Removal] Rembg service is healthy:', healthData);
      } catch (healthErr) {
        console.error('[BG Removal] Rembg service is not responding:', healthErr);
        toast.error('Background removal service not available. Make sure rembg microservice is running on port 5000.');
        setIsRemovingBackground(false);
        return;
      }

      const toastId = toast.loading(`Removing backgrounds from ${selectedIds.size} records...`);

      // Use getPhotoUrl to detect photos in `photo_url` or in `data_json` fields
      const selectedRecords = records.filter(r => selectedIds.has(r.id) && getPhotoUrl(r));

      if (selectedRecords.length === 0) {
        toast.dismiss(toastId);
        toast.error('Selected records have no photos');
        setIsRemovingBackground(false);
        return;
      }

      console.log(`[BG Removal] Starting for ${selectedRecords.length} records with photos`);

      // Fetch photo blobs using getPhotoUrl to resolve storage paths or data URLs
      let photoBlobs: { recordId: string; blob: Blob }[] = [];

      for (const record of selectedRecords) {
        const photoUrl = getPhotoUrl(record);
        if (photoUrl) {
          try {
            const blob = await fetchPhotoBlob(photoUrl);
            if (blob) {
              photoBlobs.push({ recordId: record.id, blob });
            } else {
              console.warn(`[BG Removal] Failed to fetch blob for record ${record.id}`);
            }
          } catch (fetchErr) {
            console.error(`[BG Removal] Error fetching blob for record ${record.id}:`, fetchErr);
          }
        }
      }

      console.log(`[BG Removal] Successfully fetched ${photoBlobs.length}/${selectedRecords.length} photos`);

      if (photoBlobs.length === 0) {
        toast.dismiss(toastId);
        toast.error(`Could not fetch photos from ${selectedRecords.length} records. Photos may not exist on server or are invalid URLs.`);
        setIsRemovingBackground(false);
        return;
      }

      // Process backgrounds directly without cropping
      console.log(`[BG Removal] Processing ${photoBlobs.length} photos with removeBackgroundBatch...`);
      
      let processedResults: { recordId: string; blob: Blob }[] = [];
      
      try {
        const batchResults = await removeBackgroundBatch(
          photoBlobs.map(p => p.blob),
          5
        );
        
        // Map processed blobs back to record IDs using the index from batch results
        const indexToRecordId = new Map<number, string>();
        photoBlobs.forEach((photo, idx) => {
          indexToRecordId.set(idx, photo.recordId);
        });
        
        for (const { index, blob } of batchResults) {
          const recordId = indexToRecordId.get(index);
          if (recordId) {
            processedResults.push({ recordId, blob });
          }
        }
      } catch (bgErr) {
        console.error('[BG Removal] Background removal batch failed:', bgErr);
        toast.dismiss(toastId);
        toast.error(`Failed to remove backgrounds: ${bgErr instanceof Error ? bgErr.message : String(bgErr)}`);
        setIsRemovingBackground(false);
        return;
      }

      console.log(`[BG Removal] Successfully processed ${processedResults.length} out of ${photoBlobs.length} photos`);
      
      if (!processedResults || processedResults.length === 0) {
        toast.dismiss(toastId);
        toast.error('No images were successfully processed. Check rembg microservice on port 5001.');
        setIsRemovingBackground(false);
        return;
      }

      // Upload processed photos and update records
      let updated = 0;
      const uploadErrors: string[] = [];
      
      // Records that were submitted but not processed
      const submittedIds = new Set(photoBlobs.map(p => p.recordId));
      const processedIds = new Set(processedResults.map(p => p.recordId));
      const failedRecords: string[] = [];
      for (const id of submittedIds) {
        if (!processedIds.has(id)) {
          failedRecords.push(id);
        }
      }
      
      for (const { recordId, blob: processedBlob } of processedResults) {

        try {
          // Validate blob before upload
          if (processedBlob.size === 0) {
            throw new Error('Processed blob is empty');
          }
          if (!processedBlob.type.startsWith('image/')) {
            throw new Error(`Invalid blob type: ${processedBlob.type}`);
          }

          console.log(`[BG Removal] Uploading processed photo for record ${recordId} (blob size: ${processedBlob.size} bytes)`);
          
          // Upload to Cloudinary
          let uploadResult: any;
          try {
            const { uploadToCloudinary } = await import('@/lib/cloudinary');
            uploadResult = await uploadToCloudinary(processedBlob, {
              folder: `project-photos/${projectId}`,
              publicId: `no-bg-${recordId}`,
              resourceType: 'image',
            });
            console.log(`[BG Removal] Successfully uploaded to Cloudinary: ${uploadResult.url}`);
          } catch (uploadErr: any) {
            const uploadErrMsg = uploadErr?.message || String(uploadErr);
            console.error(`[BG Removal] Cloudinary upload failed for record ${recordId}:`, uploadErr);
            throw new Error(`Cloudinary upload failed: ${uploadErrMsg}`);
          }

          // Update record with new URL
          try {
            console.log(`[BG Removal] Saving to database: record ${recordId}`);
            await apiService.dataRecordsAPI.update(recordId, {
              photo_url: uploadResult.url,
              background_removed: true,
              processing_status: 'processed',
              cloudinary_public_id: uploadResult.publicId
            });
            console.log(`[BG Removal] Successfully saved to database: record ${recordId}`);
          } catch (dbErr: any) {
            const dbErrMsg = dbErr?.message || String(dbErr);
            console.error(`[BG Removal] Database update failed for record ${recordId}:`, dbErr);
            throw new Error(`Database update failed: ${dbErrMsg}`);
          }

          updated++;
          setBgRemovalProgress(Math.round((updated / photoBlobs.length) * 100));
          console.log(`[BG Removal] Completed for record ${recordId} (${updated}/${photoBlobs.length})`);
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          console.error(`[BG Removal] Error processing record ${recordId}:`, err);
          uploadErrors.push(`Record ${recordId}: ${errMsg}`);
        }
      }

      toast.dismiss(toastId);
      if (updated > 0) {
        console.log(`[BG Removal] SUCCESS: ${updated}/${photoBlobs.length} photos processed`);
        if (failedRecords.length > 0 || uploadErrors.length > 0) {
          const failCount = Math.max(failedRecords.length, uploadErrors.length);
          toast.success(`Processed ${updated}/${photoBlobs.length} photos (${failCount} failed)`);
        } else {
          toast.success(`Removed backgrounds from ${updated} photos`);
        }
      } else {
        console.error(`[BG Removal] FAILED: No photos were updated. Failed: ${failedRecords.length}, Errors: ${uploadErrors.length}`);
        const details = uploadErrors.length > 0 
          ? uploadErrors.slice(0, 5).join('\n') + (uploadErrors.length > 5 ? `\n... and ${uploadErrors.length - 5} more` : '')
          : failedRecords.length > 0
          ? `${failedRecords.length} records could not be processed`
          : 'Unknown error';
        toast.error(`Background removal failed: ${details}`);
      }
      setSelectedIds(new Set());
      setBgRemovalProgress(0);
      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
    } catch (error: any) {
      console.error('[BG Removal] Fatal error:', error);
      toast.dismiss();
      const errorMsg = error?.message || String(error);
      toast.error(`Failed to remove backgrounds: ${errorMsg}`);
    } finally {
      setIsRemovingBackground(false);
    }
  };

  // Get role/designation from record
  const getRole = (record: DataRecord) => {
    const data = record.data_json;
    return data.role || data.Role || data.designation || data.Designation || data.type || data.Type || null;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get photo URL from record - check multiple fields and construct backend URL if needed
  const getPhotoUrl = (record: DataRecord) => {
    const data = record.data_json;
    const backendBase = 'http://localhost:3001';

    // Helper to fix localhost:5000 -> localhost:3001 in URLs
    const fixPortInUrl = (url: string): string => {
      return url.replace(/http:\/\/localhost:5000/g, backendBase);
    };

    // Prefer cropped photo when available (e.g. manual user crop)
    if (record.cropped_photo_url) {
      let url = record.cropped_photo_url;
      
      if (url.startsWith('data:')) {
        return url;
      }
      
      // Fix old port references
      if (url.includes('localhost:5000')) {
        url = fixPortInUrl(url);
      }
      
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }

      // If backend returns a relative API path, prefix backend base
      if (url.startsWith('/api/') || url.startsWith('/uploads/')) {
        return `${backendBase}${url}`;
      }

      return `${backendBase}/uploads/project-photos/${projectId}/${encodeURIComponent(url)}`;
    }
    
    // Check direct photo_url field
    if (record.photo_url) {
      let url = record.photo_url;
      
      if (url.startsWith('data:')) {
        console.log(`[PhotoDisplay] Using direct URL for record ${record.id.substring(0, 12)}: ${url.substring(0, 60)}`);
        return url;
      }
      
      // Fix old port references
      if (url.includes('localhost:5000')) {
        url = fixPortInUrl(url);
      }
      
      // If it's a full URL, return it
      if (url.startsWith('http://') || url.startsWith('https://')) {
        console.log(`[PhotoDisplay] Using direct URL for record ${record.id.substring(0, 12)}: ${url.substring(0, 60)}`);
        return url;
      }

      // If backend returns a relative API path, prefix backend base
      if (record.photo_url.startsWith('/api/') || record.photo_url.startsWith('/uploads/')) {
        return `${backendBase}${record.photo_url}`;
      }
      
      // Skip old failed photo paths from before migration
      if (record.photo_url.includes('uploads/photos/')) {
        console.log(`[PhotoDisplay] Skipping old failed path for record ${record.id.substring(0, 12)}`);
        return null; // Skip these - they were base64 attempts that failed
      }
      
      // If it already looks like a relative path to uploads (old format with project-photos), handle it
      if (record.photo_url.includes('uploads/')) {
        const url = `http://localhost:3001/${record.photo_url}`;
        console.log(`[PhotoDisplay] Using relative path for record ${record.id.substring(0, 12)}: ${url.substring(0, 80)}`);
        return url;
      }
      
      // Otherwise, construct backend URL for local files (new format - just filename)
      const finalUrl = `${backendBase}/uploads/project-photos/${projectId}/${encodeURIComponent(record.photo_url)}`;
      console.log(`[PhotoDisplay] Constructed URL for record ${record.id.substring(0, 12)}: photo_url="${record.photo_url.substring(0, 40)}..." → ${finalUrl.substring(0, 100)}`);
      return finalUrl;
    }
    
    // Check various photo field names in data_json (including profilePic from CSV)
    const photoFields = [
      'photo_url',
      'photoUrl',
      'imageUrl',
      'image_url',
      'profilePic',
      'ProfilePic',
      'profile_pic',
      'photo',
      'Photo',
      'image',
      'Image',
      'picture',
      'Picture',
    ];
    let photoValue: string | null = null;
    
    for (const field of photoFields) {
      if (data[field]) {
        photoValue = data[field];
        break;
      }
    }
    
    if (!photoValue) return null;
    
    // If it's already a full URL or data URL, return as is
    if (photoValue.startsWith('http://') || 
        photoValue.startsWith('https://') || 
        photoValue.startsWith('data:')) {
      return photoValue;
    }

    // If backend returns a relative API/uploads path, prefix backend base
    if (photoValue.startsWith('/api/') || photoValue.startsWith('/uploads/')) {
      return `${backendBase}${photoValue}`;
    }

    // Serve from backend uploads static route
    // Note: These files may not exist on disk if photos weren't properly uploaded
    return `${backendBase}/uploads/project-photos/${projectId}/${encodeURIComponent(photoValue)}`;
  };
  
  // Fetch photo with error handling
  const fetchPhotoBlob = async (photoUrl: string): Promise<Blob | null> => {
    if (!photoUrl) return null;
    try {
      const response = await fetch(photoUrl);
      if (response.ok) {
        return await response.blob();
      }
      // If 404 or other error, return null instead of throwing
      console.warn(`Photo fetch failed (${response.status}):`, photoUrl);
      return null;
    } catch (err) {
      console.warn('Photo fetch error:', err);
      return null;
    }
  };

  // Open crop dialog for a single record
  const handleOpenCropDialog = (record: DataRecord, mode: 'passport' | 'idcard') => {
    const photoUrl = getPhotoUrl(record);
    if (!photoUrl) {
      toast.error('No photo available for this record');
      return;
    }
    setCropDialogImage({ url: photoUrl, recordId: record.id });
    setCropDialogMode(mode);
    setCropDialogOpen(true);
  };

  // Handle crop completion from dialog
  const handleCropComplete = async (cropData: {
    blob: Blob;
    dataUrl: string;
    croppedDimensions: CropArea;
  }) => {
    if (!cropDialogImage) return;

    try {
      const record = records.find(r => r.id === cropDialogImage.recordId);
      if (!record) {
        toast.error('Record not found');
        return;
      }

      console.log('Starting crop save for record:', record.id);

      // Upload cropped image to Cloudinary
      console.log('Uploading to Cloudinary...');
      const uploadedUrl = await uploadToCloudinary(cropData.blob, {
        folder: `projects/${projectId}/cropped`,
        public_id: `crop-${record.record_number}-${Date.now()}`
      });
      console.log('Cloudinary upload success:', uploadedUrl);

      // Save to database
      console.log('Updating Supabase record...');
      const { data, error } = await supabase
        .from('data_records')
        .update({
          cropped_photo_url: uploadedUrl,
          face_crop_coordinates: {
            x: Math.round(cropData.croppedDimensions.x),
            y: Math.round(cropData.croppedDimensions.y),
            width: Math.round(cropData.croppedDimensions.width),
            height: Math.round(cropData.croppedDimensions.height)
          }
        })
        .eq('id', record.id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        toast.error(`Database error: ${error.message}`);
        return;
      }

      console.log('Supabase update success:', data);
      toast.success('Image cropped and saved successfully');
      queryClient.invalidateQueries({ queryKey: ['project-records', projectId] });
      setCropDialogOpen(false);
      setCropDialogImage(null);
    } catch (error) {
      console.error('Error saving cropped image:', error);
      toast.error(`Failed to save cropped image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Get specific field values with fallbacks
  const getFatherName = (record: DataRecord) => {
    const data = record.data_json;
    return data.fatherName || data.FatherName || data.father_name || data.Father_Name || 'N/A';
  };

  const getClassName = (record: DataRecord) => {
    const data = record.data_json;
    return data.className || data.ClassName || data.class_name || data.Class || data.class || 'N/A';
  };

  const getSection = (record: DataRecord) => {
    const data = record.data_json;
    return data.sec || data.Sec || data.section || data.Section || 'N/A';
  };

  const getAdmissionNo = (record: DataRecord) => {
    const data = record.data_json;
    return data.admNo || data.AdmNo || data.admission_no || data.AdmissionNo || data.admissionNumber || 'N/A';
  };

  // Export to Excel
  const exportToExcel = () => {
    const exportData = filteredRecords.map((record, index) => {
      const data = record.data_json;
      // Remove _original field and flatten data
      const cleanData: Record<string, any> = {};
      Object.entries(data).forEach(([key, value]) => {
        if (key !== '_original') {
          cleanData[key] = value;
        }
      });
      return {
        'S.No': index + 1,
        ...cleanData,
        'Group': getGroupName(record.group_id),
        'Status': record.processing_status || 'pending'
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student Data');
    XLSX.writeFile(wb, `student_data_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`Exported ${filteredRecords.length} records to Excel`);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or any field..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filter Button */}
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && <Badge className="ml-1 bg-primary text-primary-foreground">Active</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="start">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {statuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Group</label>
                  <Select value={groupFilter} onValueChange={setGroupFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Groups" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Groups ({records.length})</SelectItem>
                      <SelectItem value="unassigned">
                        Unassigned ({records.filter(r => !r.group_id).length})
                      </SelectItem>
                      {groups.map(group => {
                        const groupRecordCount = records.filter(r => r.group_id === group.id).length;
                        return (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name} ({groupRecordCount})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="w-full" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Results Info */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-normal px-3 py-1">
            Total Records: {records.length}
          </Badge>
          {filteredRecords.length !== records.length && (
            <Badge variant="secondary" className="font-normal">
              Showing: {filteredRecords.length}
            </Badge>
          )}
          {hasActiveFilters && (
            <Badge variant="outline" className="font-normal text-orange-600 border-orange-200">
              Filtered Results
            </Badge>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
        </div>

        <div className="flex items-center gap-2">
          {/* Clear Selection */}
          {selectedIds.size > 0 && (
            <Button 
              variant="default"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection
            </Button>
          )}

          {/* Selected Actions */}
          {selectedIds.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <MoreHorizontal className="h-4 w-4" />
                  Selected Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {groups.length > 0 && (
                  <>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Users className="h-4 w-4 mr-2" />
                        Assign to Group
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {groups.map((group) => (
                          <DropdownMenuItem 
                            key={group.id} 
                            onClick={() => handleAssignGroup(group.id)}
                          >
                            {group.name}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleAssignGroup('none')}>
                          Remove from Group
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem 
                  disabled={selectedIds.size === 0 || isRemovingBackground}
                  onClick={handleRemoveBackgroundBulk}
                >
                  {isRemovingBackground ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Removing BG... {bgRemovalProgress}%
                    </>
                  ) : (
                    <>
                      <Eraser className="h-4 w-4 mr-2" />
                      AI Image Background Remover
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Selection Info Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border rounded-lg">
          <span className="text-sm text-primary font-medium">
            All {selectedIds.size} records selected
          </span>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
              id="deselect-all"
            />
            <label htmlFor="deselect-all" className="text-sm cursor-pointer">
              Deselect all
            </label>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-16">S.No.</TableHead>
                <TableHead className="min-w-[200px]">Name</TableHead>
                {columns.map(col => (
                  <TableHead key={col} className="min-w-[120px]">{col}</TableHead>
                ))}
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="w-24">Group</TableHead>
                <TableHead className="w-20">Class</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 6} className="h-24 text-center">
                    <p className="text-muted-foreground">No records found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record, index) => (
                  <TableRow key={record.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(record.id)}
                        onCheckedChange={(checked) => handleSelectRecord(record.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar 
                          className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          onClick={() => setImagePreview({
                            open: true,
                            imageUrl: getPhotoUrl(record),
                            originalPhotoUrl: record.original_photo_url,
                            recordId: record.id,
                            recordName: getDisplayName(record),
                          })}
                        >
                          <AvatarImage src={getPhotoUrl(record) || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(getDisplayName(record))}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{getDisplayName(record)}</span>
                          <Badge 
                            variant={record.processing_status === 'completed' ? 'default' : 'secondary'} 
                            className="w-fit text-xs mt-0.5"
                          >
                            {record.processing_status?.toUpperCase() || 'PENDING'}
                          </Badge>
                          <span className="text-xs text-muted-foreground mt-0.5 font-mono">
                            {record.id.slice(0, 20)}...
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    {columns.map(col => (
                      <TableCell key={col}>
                        {record.data_json[col] || 'N/A'}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Badge 
                        variant={record.processing_status === 'completed' ? 'default' : 'secondary'}
                        className={record.processing_status === 'completed' ? 'bg-green-500' : ''}
                      >
                        {record.processing_status?.toUpperCase() || 'PENDING'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={record.group_id ? 'outline' : 'secondary'} className="text-xs">
                        {getGroupName(record.group_id)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getClassName(record)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onEditRecord && (
                            <DropdownMenuItem onClick={() => onEditRecord(record)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {getPhotoUrl(record) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <Crop className="h-4 w-4 mr-2" />
                                  Crop Image
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  <DropdownMenuItem onClick={() => handleOpenCropDialog(record, 'passport')}>
                                    Passport (Tight)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenCropDialog(record, 'idcard')}>
                                    ID Card (Wider)
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            </>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDeleteRecord(record)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Image Preview Dialog */}
      <ImagePreviewDialog
        open={imagePreview.open}
        onOpenChange={(open) => setImagePreview(prev => ({ ...prev, open }))}
        imageUrl={imagePreview.imageUrl}
        originalPhotoUrl={imagePreview.originalPhotoUrl}
        recordId={imagePreview.recordId}
        projectId={projectId}
        recordName={imagePreview.recordName}
      />

      {/* Interactive Crop Dialog */}
      {cropDialogImage && (
        <ImageCropDialog
          open={cropDialogOpen}
          imageUrl={cropDialogImage.url}
          mode={cropDialogMode}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setCropDialogOpen(false);
            setCropDialogImage(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {recordToDelete 
                ? `Delete Record #${recordToDelete.record_number}` 
                : `Delete ${selectedIds.size} Records`
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {recordToDelete
                ? 'Are you sure you want to delete this record? This action cannot be undone.'
                : `Are you sure you want to delete ${selectedIds.size} selected records? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={recordToDelete ? confirmDelete : handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
