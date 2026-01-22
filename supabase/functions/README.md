# ⚠️ Deprecated: Supabase Edge Functions

These edge functions are **no longer used** by the application and should be replaced with backend API endpoints.

## Migration Status

| Function | Status | Reason | Replace With |
|----------|--------|--------|--------------|
| `create-admin-staff` | ❌ Deprecated | Supabase disconnected | `POST /api/staff/create` |
| `cloudinary-upload` | ❌ Deprecated | Supabase disconnected | `POST /api/upload` |
| `remove-bg` | ❌ Deprecated | Using rembg-microservice | `POST /api/remove-bg` |
| `generate-pdf` | ❌ Deprecated | Supabase disconnected | `POST /api/generate-pdf` |

## What to Do

### For Developers
1. Do NOT modify these files
2. They are kept for reference only
3. Build equivalent endpoints in `backend/routes/`

### For Cleanup
Delete this directory when:
- All backend API endpoints are implemented
- All references in frontend are removed
- All tests pass with new backend endpoints

## Current Approach

The application now uses:
- **Backend API**: Express.js server on port 5000
- **Database**: MySQL on port 3306
- **Frontend**: React/Vite on port 8080

All file uploads, PDF generation, and staff management should go through backend API endpoints instead of edge functions.

---
**Last Updated**: January 10, 2026
