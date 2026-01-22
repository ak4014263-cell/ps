# Logo Upload Feature Implementation

## Overview
The client form now supports uploading company logo and signature logo images.

## Changes Made

### 1. Database Schema
Added two new columns to the `clients` table:
- `company_logo` (VARCHAR(500)) - stores base64 encoded image data
- `signature_logo` (VARCHAR(500)) - stores base64 encoded image data

**Migration SQL:**
```sql
ALTER TABLE clients ADD COLUMN company_logo VARCHAR(500) AFTER country;
ALTER TABLE clients ADD COLUMN signature_logo VARCHAR(500) AFTER company_logo;
```

### 2. Backend Updates (`backend/routes/clients.js`)
- Added `company_logo` and `signature_logo` to the request body destructuring in POST endpoint
- Updated INSERT statement to include both logo fields
- Updated PUT endpoint `allowedFields` array to allow updating logo fields
- Logos are stored as base64 encoded strings (data URLs)

**Key Changes:**
```javascript
// POST: Now accepts company_logo and signature_logo in request body
// PUT: Now allows updating logo fields
const allowedFields = [
  'client_name', 'email', 'phone', 'company',
  'address', 'city', 'state', 'postal_code', 'country', 'notes',
  'company_logo', 'signature_logo'  // ← NEW
];
```

### 3. Frontend Updates (`src/components/admin/AddClientForm.tsx`)

#### State Management
```typescript
const [formData, setFormData] = useState({
  // ... existing fields
  company_logo: null as File | null,
  signature_logo: null as File | null,
});

const [logoPreview, setLogoPreview] = useState({
  company_logo: '',
  signature_logo: '',
});
```

#### File Handler
```typescript
const handleFileChange = (field: 'company_logo' | 'signature_logo', file: File | null) => {
  if (file) {
    setFormData({ ...formData, [field]: file });
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview({ ...logoPreview, [field]: reader.result as string });
    };
    reader.readAsDataURL(file);
  } else {
    setFormData({ ...formData, [field]: null });
    setLogoPreview({ ...logoPreview, [field]: '' });
  }
};
```

#### Form Fields
Two new file input fields have been added:
1. **Company Logo** - File input for company logo (accepts image files)
2. **Signature Logo** - File input for signature logo (accepts image files)

Both fields:
- Show image previews after selection
- Accept only image file formats
- Are optional fields

#### Form Submission
The form submission now includes logo data:
```typescript
const submitData = {
  // ... existing fields
  company_logo: logoPreview.company_logo || null,
  signature_logo: logoPreview.signature_logo || null,
  vendor_id: vendorData.id,
};
```

## How It Works

1. **File Selection**: User selects an image file through the file input
2. **Preview Generation**: File is read and converted to base64 data URL
3. **Preview Display**: Base64 preview is shown immediately in the form
4. **Form Submission**: Base64 encoded image data is sent to backend
5. **Database Storage**: Base64 string is stored in the database
6. **Display**: Logos can be retrieved and displayed anywhere needed

## Supported Image Formats
- JPG/JPEG
- PNG
- GIF
- WebP
- And other common image formats (accept="image/*")

## File Size Considerations
- Base64 encoding increases data size by ~33%
- VARCHAR(500) may be limiting for large images
- Consider increasing to VARCHAR(2000) or using LONGTEXT for large logo files
- For production, consider using external storage (S3, etc.) instead of base64

## Future Enhancements
1. Add image size validation on the frontend
2. Implement image compression before upload
3. Add ability to view/edit logos in client list/detail views
4. Use external storage service instead of storing base64 in database
5. Add ability to remove previously uploaded logos

## Testing Steps
1. Navigate to add a new client
2. Fill in client details
3. Upload company logo and signature logo
4. Click "Add Client"
5. Verify client is created successfully with logos stored
6. Logos will be available for use in various parts of the application
