# Phase 5 Implementation Report: Offline Fallback v1

## Executive Summary

Phase 5 successfully implements Offline Fallback v1 for AccrediFy as a continuity mode that allows authenticated users to continue working during server outages. The implementation provides read access to cached data, allows editing existing indicators while offline, tracks unsynced updates, and provides a manual sync flow when connectivity is restored.

**Status:** ✅ Complete and Ready for Testing

---

## Implementation Overview

### Core Functionality
- **Server Reachability Detection**: Monitors backend connectivity for authenticated users
- **Offline Cache**: Stores minimal snapshot of projects and indicators for offline read access
- **Update Queue**: Tracks unsynced indicator edits made while offline
- **Manual Sync Panel**: Provides user-driven sync flow when connectivity is restored
- **Sync State UI**: Visual indicators for synced/unsynced status and evidence pending reminders
- **Evidence Blocking**: Prevents evidence operations in offline fallback mode

---

## Files Created

### Frontend Services
- `frontend/src/services/connectivity.ts` - Server reachability detection and monitoring
- `frontend/src/services/offlineCache.ts` - Offline cache management for projects/indicators
- `frontend/src/services/updateQueue.ts` - Queue management for unsynced indicator updates

### Frontend Components
- `frontend/src/components/SyncPanel.tsx` - Manual sync panel for applying queued updates

---

## Files Modified

### Frontend
1. **`frontend/src/App.tsx`**
   - Integrated connectivity monitoring
   - Added offline fallback state management
   - Integrated offline cache reading/writing
   - Added sync panel display
   - Updated indicator update handler to queue edits when offline

2. **`frontend/src/components/Checklist.tsx`**
   - Added sync state badges (Synced/Unsynced)
   - Added evidence state badges (Evidence Linked/Evidence Pending)
   - Integrated offline fallback mode detection

3. **`frontend/src/components/modals/EvidenceModal.tsx`**
   - Added offline fallback mode detection
   - Blocks all evidence operations (upload, link, note, drive) when in offline fallback
   - Shows clear messaging about offline restrictions

---

## Key Features

### 1. Server Reachability Detection
- Uses `/api/auth/me/` endpoint as lightweight connectivity check
- Monitors connectivity:
  - On app load
  - After authentication
  - Every 30 seconds when authenticated
  - On `window.online` event
- Does not log users out on connectivity failures (only on auth failures)
- Provides global state: `isServerReachable` and `isOfflineFallbackActive`

### 2. Offline Cache
- **Storage Key**: `accredify_offline_cache`
- **Structure**:
  ```typescript
  {
    version: 1,
    timestamp: "ISO string",
    projects: [{
      id, name, description,
      indicators: [{
        id, project_id, section, standard, indicator,
        description, score, status, notes,
        evidence_count, last_updated
      }]
    }]
  }
  ```
- **Lightweight**: No evidence payloads, no file info
- **Auto-update**: Cached on successful online fetch
- **Merge**: Merges with queued updates when reading from cache

### 3. Update Queue
- **Storage Key**: `accredify_indicator_update_queue`
- **Structure**:
  ```typescript
  {
    version: 1,
    updated_at: "ISO string",
    updates: {
      "<indicator_id>": {
        indicator_id: string,
        fields: {
          status?: string,
          score?: number,
          remarks?: string,
          notes?: string
        },
        updated_at: "ISO string",
        source: "offline"
      }
    }
  }
  ```
- **Latest State Wins**: Overwrites previous update for same indicator
- **Allowed Fields**: Only status, score, notes/remarks (no evidence)

### 4. Manual Sync Panel
- **Display Conditions**:
  - Server is reachable
  - Queue has items
  - User is authenticated
- **Features**:
  - View list of unsynced updates (indicator name, changed fields, timestamp)
  - "Apply All Updates" button
  - "View Details" toggle
  - "Discard All" option (with confirmation)
  - Per-indicator sync status (pending/syncing/success/failed)
- **Sync Logic**:
  - Calls backend PATCH endpoint for each indicator
  - Sends only changed fields
  - Removes from queue on success
  - Marks as "Sync failed" on error (keeps in queue)

### 5. Sync State UI
- **Sync State Badges**:
  - **Synced** (green): No unsynced updates
  - **Unsynced** (amber): Has queued updates
  - **Sync Failed** (red): Sync attempt failed
- **Evidence State Badges**:
  - **Evidence Linked** (gray): Evidence count > 0
  - **Evidence Pending** (red): Status is "Completed"/"Compliant"/"Done" AND evidence count == 0 (online only)

### 6. Evidence Blocking
- **Offline Fallback Mode**: All evidence operations blocked
  - File upload
  - Note creation
  - Link addition
  - Drive linking
  - Digital log
- **Clear Messaging**: Users see "Offline Fallback Mode" banner explaining restrictions
- **Online-Only**: Evidence operations require server connectivity

---

## Foundation Rules (Locked)

### Online-First Truth
- When authenticated and server reachable: **backend is the source of truth**
- Authenticated users operate in **ONLINE mode** by default
- Offline is a **fallback**, not a second app

### Offline Scope (Allowed)
- ✅ Update indicator: status, score, remarks/notes
- ✅ Optional: evidence_needed flag (metadata only)

### Offline Scope (Disallowed)
- ❌ Evidence linking/uploading
- ❌ Drive Picker offline
- ❌ Project creation offline
- ❌ Automatic sync/merge when returning online

### Return to Online Behavior
- Detect local unsynced updates
- Show manual sync panel
- Apply updates to backend in user-driven action
- Mark items as synced on success
- Show Evidence pending reminders (online-only)

### UI States
- **Sync state**: Synced vs Unsynced (independent)
- **Evidence state**: Evidence Linked vs Evidence Pending (independent)

---

## LocalStorage Keys

### Phase 5 Keys
- `accredify_offline_cache` - Last-known online snapshot
- `accredify_indicator_update_queue` - Unsynced indicator edits
- `accredify_offline_mode_reason` (optional) - UX messaging only

### Existing Keys (Unchanged)
- `accredify_data` - Offline demo data (Phase 3A)
- `accredify_offline_import_status` - Import status (Phase 3A)
- `accredify_data_mode` - Data mode preference
- `accredify_drive_root_folder_id` - Drive root folder (Phase 4)

---

## Configuration

No additional configuration required. The implementation uses existing API endpoints and authentication flow.

---

## Testing Checklist

### Acceptance Tests

- [ ] **Test 1: Online cache creation**
  - Login online
  - Open projects/indicators
  - Verify `accredify_offline_cache` exists with timestamp

- [ ] **Test 2: Offline fallback activation**
  - While logged in, simulate server down (block network or stop backend)
  - App shows "Offline fallback active" banner
  - Projects/indicators still load from cache

- [ ] **Test 3: Offline edits queue**
  - Edit 3 indicators while offline fallback active
  - Verify `accredify_indicator_update_queue` populated
  - UI shows "Unsynced" badge on edited indicators

- [ ] **Test 4: Manual sync**
  - Restore server connectivity
  - Sync panel appears
  - Click "Apply updates"
  - Backend reflects changes
  - Queue clears per successful sync
  - UI becomes "Synced"

- [ ] **Test 5: Evidence pending reminder**
  - Set an indicator to Completed/Compliant with zero evidence
  - UI shows "Evidence pending" badge
  - Evidence linking only possible online

- [ ] **Test 6: Evidence blocking**
  - While in offline fallback, try to add evidence
  - All evidence operations blocked with clear messaging

---

## Constraints Compliance

✅ **Online-first truth** - Backend is source of truth when reachable  
✅ **Offline is fallback** - Only for authenticated users during outages  
✅ **No evidence offline** - All evidence operations blocked in offline fallback  
✅ **No Drive Picker offline** - Drive linking blocked in offline fallback  
✅ **No auto-sync** - Manual sync only, user-driven  
✅ **No automatic merge** - No background sync or merging  
✅ **Lightweight cache** - No evidence payloads, minimal data  
✅ **Latest state wins** - Queue overwrites previous update for same indicator  

---

## Technical Notes

### Connectivity Detection
- Uses `/api/auth/me/` endpoint (lightweight, requires auth)
- 5-second timeout for connectivity checks
- 30-second interval for periodic checks
- Does not trigger on unauthenticated users

### Cache Management
- Cache updated on successful online fetch
- Cache read when server unreachable
- Cache merged with queued updates for display
- Circular dependency avoided with lazy require()

### Queue Management
- Per-indicator updates (latest state wins)
- Only allowed fields stored (status, score, notes)
- Queue cleared per indicator on successful sync
- Failed syncs remain in queue with error state

### Sync Flow
- User-driven only (no auto-sync)
- Per-indicator sync status tracking
- Batch sync with individual error handling
- Reload projects after successful sync

---

## Future Enhancements (Out of Scope)

- Project creation in offline fallback
- Conflict resolution for concurrent edits
- Background sync option
- Offline evidence storage (with sync)
- Sync retry with exponential backoff
- Sync history/audit log

---

## Dependencies

### Frontend
- No new dependencies (uses existing React, TypeScript, localStorage)

### Backend
- No changes required (uses existing endpoints)

---

## Implementation Date
January 2025

## Status
✅ **Complete** - All tasks implemented, ready for testing

---

## Next Steps

1. Test offline fallback activation (simulate server down)
2. Test offline indicator editing and queue population
3. Test manual sync flow when connectivity restored
4. Verify evidence blocking in offline fallback
5. Verify sync state and evidence pending UI badges
6. Run acceptance tests
