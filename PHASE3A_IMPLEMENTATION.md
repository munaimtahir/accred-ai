# Phase 3A Implementation: Manual Import of Offline Demo Data on Login

## Summary

Phase 3A has been successfully implemented to allow users to manually import offline demo data when they log in. The implementation follows all hard constraints: no backend changes, no automatic sync, no merging/overwriting, and user must explicitly choose what to import.

---

## Files Changed/Added

### New Files Created

1. **`frontend/src/offline/offlineStore.ts`**
   - Utility functions for reading, counting, and managing offline data
   - Import status tracking functions
   - Eligibility checking for import prompt

2. **`frontend/src/components/modals/ImportOfflineDataModal.tsx`**
   - Modal UI component for import workflow
   - Project selection with checkboxes
   - Import, Skip, and Delete actions
   - Error handling and retry functionality

### Files Modified

1. **`frontend/src/App.tsx`**
   - Added import modal state and trigger logic
   - Wired import modal to show after login transition
   - Added session-based check to prevent re-prompting

---

## Trigger Point

**Location:** `frontend/src/App.tsx`

**Implementation:**
- Uses `useEffect` hook that monitors `isAuthenticated` state
- Triggers when authentication transitions from `false` → `true` (login)
- Uses `hasCheckedImportRef` ref to ensure prompt appears only once per session
- Uses `previousAuthStateRef` to track auth state transitions
- Small 500ms delay to ensure auth state is fully settled before checking

**Code Location:**
```typescript
// Lines ~105-125 in App.tsx
useEffect(() => {
  const wasUnauthenticated = !previousAuthStateRef.current;
  const isNowAuthenticated = isAuthenticated;
  
  if (wasUnauthenticated && isNowAuthenticated && !hasCheckedImportRef.current) {
    hasCheckedImportRef.current = true;
    
    const timer = setTimeout(() => {
      if (shouldShowImportPrompt(isAuthenticated)) {
        setShowImportModal(true);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }
  
  previousAuthStateRef.current = isAuthenticated;
}, [isAuthenticated]);
```

---

## What Gets Imported

### Phase 3A Scope: Projects Only

**Imported:**
- ✅ Project name
- ✅ Project description
- ✅ Project indicators (all fields: section, standard, indicator, description, score, frequency, status)
- ❌ Evidence (NOT imported in Phase 3A - as per requirements)

**Rationale:**
- Projects and indicators can be reliably mapped to newly created backend projects
- Evidence mapping is more complex and requires careful association with indicators
- Phase 3A focuses on safe, straightforward import of core project data
- Evidence can be added manually or in a future phase if needed

**Import Process:**
1. User selects projects via checkboxes
2. Each selected project is created via `api.createProject()` (backend API)
3. Indicators are included in the project creation payload
4. Projects are created sequentially to avoid overwhelming the backend
5. Success/failure is tracked per project
6. Imported project IDs are stored in `accredify_offline_import_status`

**Conflict Handling:**
- If a project with the same name already exists, backend will create a new project
- No automatic renaming or merging occurs (per requirements)
- User can manually rename projects after import if needed

---

## Import Status Tracking

**localStorage Key:** `accredify_offline_import_status`

**Structure:**
```typescript
{
  import_completed?: boolean;
  suppressed?: boolean;
  imported_project_ids?: string[];
}
```

**Behavior:**
- `import_completed: true` - Import was completed (prevents re-prompting)
- `suppressed: true` - User selected "Don't ask again" (prevents re-prompting)
- `imported_project_ids` - Array of successfully imported project IDs

**Eligibility Check:**
Import prompt appears only when:
1. User is authenticated (ONLINE mode enforced)
2. Offline data exists with at least 1 project
3. Import status is not `completed` or `suppressed`

---

## Error Handling

### Import Failures
- Individual project failures are tracked separately
- Failed projects are shown with error messages
- "Retry" button allows re-attempting failed imports
- Successful imports are preserved even if some fail
- Offline data is only cleared if all selected projects succeed

### Network Errors
- Errors are caught per-project
- Error messages are displayed to user
- No automatic retry (user must click "Retry")
- Offline data remains intact on failure

### Safe Failure Behavior
- ✅ Shows error: "Some items failed to import. No data was overwritten."
- ✅ Does NOT clear offline data automatically
- ✅ Provides "Retry" option for failed items
- ✅ Preserves successful imports

---

## Acceptance Tests

### Test 1: Basic Import Flow
**Steps:**
1. Create 2 demo projects in offline mode (stored in `accredify_data`)
2. Log in with valid credentials
3. Import modal should appear
4. Select 1 project → Click "Import Selected"
5. Verify backend project created (check via API or UI)
6. Verify offline data remains (other project still in localStorage)

**Expected Result:** ✅ PASS
- Modal appears after login
- Selected project imported successfully
- Other project remains in offline storage

### Test 2: Skip Functionality
**Steps:**
1. Create 2 demo projects in offline mode
2. Log in
3. Import modal appears
4. Click "Skip"
5. Verify modal closes
6. Verify offline data remains in localStorage
7. Verify app continues in online mode

**Expected Result:** ✅ PASS
- Modal closes on Skip
- Offline data preserved
- App functions normally in online mode

### Test 3: Delete Offline Data
**Steps:**
1. Create 2 demo projects in offline mode
2. Log in
3. Import modal appears
4. Click "Delete Offline Demo Data"
5. Verify modal closes
6. Verify `accredify_data` is cleared from localStorage
7. Verify no import occurs

**Expected Result:** ✅ PASS
- Modal closes
- localStorage cleared
- No projects imported
- Import status marked as suppressed

### Test 4: Re-login After Import
**Steps:**
1. Complete Test 1 (import 1 project)
2. Log out
3. Log in again
4. Verify import modal does NOT reappear

**Expected Result:** ✅ PASS
- Modal does not appear (import_completed = true)
- App loads normally

### Test 5: Re-login After Skip with "Don't Ask Again"
**Steps:**
1. Create demo projects
2. Log in
3. Check "Don't ask again" checkbox
4. Click "Skip"
5. Log out
6. Log in again
7. Verify import modal does NOT reappear

**Expected Result:** ✅ PASS
- Modal does not appear (suppressed = true)
- App loads normally

---

## Testing Instructions

### Manual Testing Setup

1. **Prepare Offline Data:**
   ```javascript
   // In browser console (while logged out)
   const demoData = {
     projects: [
       {
         id: 'demo-1',
         name: 'Demo Project 1',
         description: 'Test project 1',
         indicators: [
           {
             id: 'ind-1',
             section: 'Section A',
             standard: 'STD-1',
             indicator: 'Indicator 1',
             description: 'Test indicator',
             score: 10,
             status: 'Not Started',
             evidence: []
           }
         ],
         createdAt: new Date().toISOString()
       },
       {
         id: 'demo-2',
         name: 'Demo Project 2',
         description: 'Test project 2',
         indicators: [],
         createdAt: new Date().toISOString()
       }
     ]
   };
   localStorage.setItem('accredify_data', JSON.stringify(demoData));
   ```

2. **Clear Import Status (if needed):**
   ```javascript
   localStorage.removeItem('accredify_offline_import_status');
   ```

3. **Test Login Flow:**
   - Navigate to login page
   - Enter credentials
   - After successful login, modal should appear

4. **Verify Import:**
   - Check backend via API: `GET /api/projects/`
   - Or check UI: Projects should appear in ProjectHub

5. **Verify Status:**
   ```javascript
   // Check import status
   JSON.parse(localStorage.getItem('accredify_offline_import_status'));
   
   // Check remaining offline data
   JSON.parse(localStorage.getItem('accredify_data'));
   ```

---

## Implementation Details

### Offline Data Structure
```typescript
{
  projects: Project[];
  indicators?: any[];  // Optional, not used in current implementation
  evidence?: any[];    // Optional, not used in current implementation
}
```

### Import Flow
1. User logs in → `isAuthenticated` becomes `true`
2. `useEffect` detects transition → checks `shouldShowImportPrompt()`
3. If eligible → shows `ImportOfflineDataModal`
4. User selects projects → clicks "Import Selected"
5. Modal calls `api.createProject()` for each selected project
6. Results tracked → success/failure displayed
7. Import status updated → offline data cleaned up
8. Projects reloaded → new projects appear in UI

### Modal States
- **Initial:** Project selection with checkboxes
- **Importing:** Loading state with spinner
- **Results:** Success/failure summary with retry option
- **Done:** Close button to dismiss

---

## Constraints Compliance

✅ **No backend changes** - All changes are frontend-only  
✅ **No automatic sync** - User must explicitly choose to import  
✅ **No merging or overwriting** - New projects created, no conflicts  
✅ **User must explicitly choose** - Modal requires user interaction  
✅ **Phase 2 invariants maintained** - Authenticated writes are backend-only; offline writes are localStorage-only

---

## Future Enhancements (Out of Scope for Phase 3A)

- Import evidence along with projects (requires careful mapping)
- Conflict resolution UI (rename/merge options)
- Batch import progress indicator
- Import history/audit log

---

## Deliverables Checklist

- [x] Files changed/added documented
- [x] Exact trigger point identified (App.tsx useEffect)
- [x] What gets imported documented (projects + indicators, no evidence)
- [x] Acceptance test scenarios documented
- [x] Error handling implemented
- [x] Import status tracking implemented
- [x] All hard constraints followed

---

**Implementation Date:** 2024  
**Status:** ✅ Complete and Ready for Testing
