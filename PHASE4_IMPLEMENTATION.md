# Phase 4 Implementation Report: Google Drive Evidence Linking

## Executive Summary

Phase 4 successfully implements Google Drive Evidence Linking using Google Picker API and Drive API. Evidence attachments can now be stored as Drive file IDs with optional auto-folder creation matching the app hierarchy. All non-negotiable constraints have been maintained: offline mode remains permanent, no auto-sync/merge, no destructive operations, and full backward compatibility.

**Status:** ✅ Complete and Ready for Testing

---

## Implementation Overview

### Core Functionality
- Users can link Google Drive files to Evidence records via Google Picker
- Drive file metadata (fileId, name, mimeType, webViewLink) is stored in Evidence model
- Automatic folder hierarchy creation: `AccrediFy Evidence / ProjectName / StandardName / IndicatorKey`
- Offline mode support with clear UX messaging
- Security-first approach with least-privilege scope (`drive.file`)

---

## Files Created

### Backend
- `backend/api/migrations/0003_add_drive_fields_to_evidence.py` - Database migration for new Drive fields

### Frontend
- `frontend/src/drive/driveAuth.ts` - Google OAuth token management (GIS)
- `frontend/src/drive/drivePicker.ts` - Google Picker API integration
- `frontend/src/drive/driveFolders.ts` - Drive folder hierarchy management

---

## Files Modified

### Backend
1. **`backend/api/models.py`**
   - Added `AttachmentProvider` and `AttachmentStatus` enums
   - Added 6 new nullable fields to Evidence model:
     - `drive_name`, `drive_mime_type`, `drive_web_view_link`, `drive_parent_folder_id`
     - `attachment_provider` (default: 'none')
     - `attachment_status` ('pending' | 'linked')
   - Added index on `drive_file_id`

2. **`backend/api/serializers.py`**
   - Updated `EvidenceSerializer` to include all new Drive fields

3. **`backend/api/views.py`**
   - Updated `EvidenceViewSet.create()` and `.update()` to auto-set `attachment_status="linked"` when `drive_file_id` is provided

### Frontend
1. **`frontend/src/types.ts`**
   - Added `AttachmentProvider` and `AttachmentStatus` types
   - Extended `Evidence` interface with Drive fields
   - Extended `CreateEvidenceData` interface with Drive fields

2. **`frontend/src/components/modals/EvidenceModal.tsx`**
   - Added "Google Drive" tab
   - Integrated Drive authentication and Picker flow
   - Added security banner and offline mode messaging
   - Added Drive file selection UI with error handling

3. **`frontend/src/components/Checklist.tsx`**
   - Updated `EvidenceItem` to display Drive links
   - Added "Open in Drive" button for Drive-linked evidence
   - Added "Pending attachment" status indicator
   - Added Cloud icon imports

4. **`frontend/src/components/DocumentLibrary.tsx`**
   - Added Drive link support in evidence display
   - Added Cloud icon import

5. **`frontend/src/App.tsx`**
   - Pass `projectName` prop to `EvidenceModal` for folder hierarchy

6. **`frontend/src/services/api.ts`**
   - Updated `createEvidence()` to handle Drive fields in JSON payload

---

## Key Features

### 1. Google OAuth Integration
- Uses Google Identity Services (GIS) for token management
- Scope: `https://www.googleapis.com/auth/drive.file` (least-privilege)
- In-memory token caching (not localStorage for security)
- Automatic token refresh handling

### 2. Google Picker Integration
- File selection via Google Picker API
- Returns: `fileId`, `name`, `mimeType`, `webViewLink`
- Opens in context of folder hierarchy when available

### 3. Folder Hierarchy Management
- Root folder: "AccrediFy Evidence" (stored in localStorage)
- Auto-creates: `root / ProjectName / StandardName / IndicatorKey`
- Search-before-create to reuse existing folders
- Folder verification before use

### 4. Offline Mode Support
- Clear messaging: "Link Drive file (requires sign-in)"
- Blocks Drive linking in offline mode
- Shows "Pending attachment" status for offline evidence with Drive metadata
- No forced prompts when user becomes authenticated

### 5. Security & UX
- Security banner explaining Drive access scope
- Graceful token expiration handling
- User cancellation handling (no state changes)
- Explicit error messages for network failures
- No destructive operations (no delete/move)

---

## Configuration Required

### Environment Variable
Add to your `.env` file or environment:
```bash
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### Google Cloud Console Setup
1. Create OAuth 2.0 Client ID in Google Cloud Console
2. Add authorized JavaScript origins (your app domain)
3. Add authorized redirect URIs (if needed)
4. Enable Google Drive API and Google Picker API
5. Copy Client ID to `VITE_GOOGLE_CLIENT_ID`

---

## Database Migration

Run the migration to add new fields:
```bash
cd backend
python manage.py migrate
```

**Note:** Migration is backward-compatible. Existing evidence records continue to work normally.

---

## Testing Checklist

### Acceptance Tests

- [ ] **Test 1:** Online user links a Drive file → evidence stores `drive_file_id` and displays "Open in Drive"
- [ ] **Test 2:** Offline evidence shows "Pending attachment", linking blocked until sign-in
- [ ] **Test 3:** Folder structure is created once and reused
- [ ] **Test 4:** Existing evidence without Drive fields still renders normally
- [ ] **Test 5:** No background sync or merging behavior is introduced

### Manual Testing Steps

1. **Drive Linking Flow:**
   - Sign in to the app
   - Navigate to an indicator
   - Click "Add Evidence" → "Google Drive" tab
   - Click "Attach from Google Drive"
   - Authenticate with Google (if needed)
   - Select a file from Picker
   - Verify evidence is created with Drive metadata
   - Verify "Open in Drive" link works

2. **Offline Mode:**
   - Sign out or use offline mode
   - Try to add Drive evidence
   - Verify "Sign-in Required" message appears
   - Verify Drive button is disabled

3. **Folder Structure:**
   - Link multiple files from same project/standard/indicator
   - Verify folder structure in Google Drive: `AccrediFy Evidence / ProjectName / StandardName / IndicatorKey`
   - Verify folders are reused (not duplicated)

4. **Backward Compatibility:**
   - Verify existing evidence (without Drive fields) displays normally
   - Verify file upload, notes, and links still work

---

## Constraints Compliance

✅ **Offline mode permanent** - No changes to offline mode behavior  
✅ **No auto-sync/merge** - No background sync or merging introduced  
✅ **No destructive operations** - No delete/move operations on Drive  
✅ **Stable linkage via fileId** - Evidence linked via Drive fileId, not paths  
✅ **Backend compatibility** - Existing evidence continues to work  
✅ **drive.file scope** - Uses least-privilege scope  
✅ **Google Picker in web app** - Picker integrated in frontend  
✅ **OAuth via GIS** - Uses Google Identity Services  
✅ **Folder creation via Drive API** - Uses `parents` property  

---

## Technical Notes

### Token Management
- Tokens cached in-memory (not localStorage)
- Token expiration handled gracefully with re-auth
- Separate from JWT auth (AccrediFy backend session)

### Folder Storage
- Root folder ID stored in `localStorage` key: `accredify_drive_root_folder_id`
- Folder hierarchy created on-demand
- Folders searched before creation to avoid duplicates

### Error Handling
- Network errors show explicit messages
- User cancellation doesn't change state
- Token expiration triggers re-authentication
- All errors logged to console for debugging

---

## Future Enhancements (Out of Scope)

- Drive file upload (currently only linking)
- Drive file preview in-app
- Bulk Drive linking
- Drive folder management UI
- Drive sync status dashboard

---

## Dependencies

### Frontend
- Google Identity Services (loaded via script tag)
- Google Picker API (loaded via script tag)
- Google Drive API v3 (used for folder operations)

### Backend
- No new dependencies (uses existing Django REST Framework)

---

## Implementation Date
January 2025

## Status
✅ **Complete** - All phases implemented, ready for testing

---

## Next Steps

1. Configure `VITE_GOOGLE_CLIENT_ID` environment variable
2. Run database migration: `python manage.py migrate`
3. Test Drive linking flow with real Google account
4. Verify folder structure creation in Google Drive
5. Test offline mode behavior
6. Verify backward compatibility with existing evidence
