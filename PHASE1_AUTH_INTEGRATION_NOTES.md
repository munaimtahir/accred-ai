# Phase 1.1 Auth Integration Notes

**Date:** Phase 1.1 Hardening  
**Status:** ✅ Complete

## Overview

This document confirms the authentication integration contract between frontend and backend, resolves inconsistencies, and documents the final implementation decisions.

---

## Verified API Contract (from Backend Source Code)

### 1. Login Endpoint

**Endpoint:** `POST /api/auth/login/`

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "access": "string",
  "refresh": "string",
  "user": {
    "id": number,
    "username": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "string",
    "isStaff": boolean
  }
}
```

**Headers:** None (AllowAny permission)

**Source Files:**
- `backend/api/views.py:58-63` - Login view
- `backend/api/serializers.py:258-265` - LoginSerializer extends TokenObtainPairSerializer
- `backend/api/tests/test_authentication.py:60-71` - Test confirms `username` field

**Frontend Implementation:**
- `frontend/src/auth/AuthContext.tsx:111-146` - Uses `{ username, password }` ✅

---

### 2. Refresh Endpoint

**Endpoint:** `POST /api/auth/refresh/`

**Request:**
```json
{
  "refresh": "string"
}
```

**Response:**
```json
{
  "access": "string"
}
```

**Headers:** None (AllowAny permission)

**Source Files:**
- `backend/api/urls.py:18` - Uses TokenRefreshView from rest_framework_simplejwt
- `backend/api/tests/test_authentication.py:150-156` - Test confirms `refresh` field

**Frontend Implementation:**
- `frontend/src/services/api.ts:78-110` - refreshAccessToken() uses `{ refresh }` ✅
- `frontend/src/auth/AuthContext.tsx:60-66` - refreshMe() uses `{ refresh }` ✅

---

### 3. Me Endpoint

**Endpoint:** `GET /api/auth/me/`

**Request:** None

**Response:**
```json
{
  "id": number,
  "username": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "role": "string",
  "isStaff": boolean
}
```

**Headers:** `Authorization: Bearer <access_token>`

**Source Files:**
- `backend/api/views.py:80-85` - Me view with IsAuthenticated permission
- `backend/api/tests/test_authentication.py:98-104` - Test confirms Authorization header required

**Frontend Implementation:**
- `frontend/src/auth/AuthContext.tsx:40-106` - refreshMe() includes Authorization header ✅

---

### 4. Logout Endpoint

**Endpoint:** `POST /api/auth/logout/`

**Status:** NOT USED (client-only logout implemented)

**Backend Contract (for reference):**
- Requires `IsAuthenticated` permission (Authorization header)
- Expects `refresh_token` in request body
- Blacklists refresh token

**Source Files:**
- `backend/api/views.py:66-77` - Logout view

**Frontend Decision:** Client-only logout (Option 1)
- Simply clears tokens from localStorage
- No backend call
- Simpler and avoids header contradiction
- Backend endpoint remains available for future use if server-side blacklisting is needed

**Frontend Implementation:**
- `frontend/src/auth/AuthContext.tsx:151-175` - Client-only logout ✅

---

## Resolved Inconsistencies

### 1. Login Payload Field ✅

**Issue:** Uncertainty about whether login uses `username` or `identifier`.

**Resolution:** Verified from backend source code and tests:
- Backend uses `TokenObtainPairSerializer` which expects `username` (not `identifier`)
- Test file confirms: `backend/api/tests/test_authentication.py:63` uses `{ username, password }`
- Frontend already correct: `AuthContext.tsx:118` uses `{ username, password }`

**Status:** ✅ Verified and correct

---

### 2. Logout Header Contradiction ✅

**Issue:** Contradiction about whether logout should include Authorization header.

**Resolution:** Implemented client-only logout (Option 1):
- Removed backend logout call from `AuthContext.tsx`
- Removed `/auth/logout/` from `AUTH_ENDPOINTS` list in `api.ts`
- Logout now simply clears tokens and resets user state
- No header contradiction because no backend call is made

**Status:** ✅ Resolved - consistent client-only behavior

---

## Refresh Loop Protection

**Implementation:** `frontend/src/services/api.ts:164-202`

**Protection Mechanisms:**
1. **Max 1 retry per request:** `retryOn401` flag ensures only one refresh attempt per request
2. **Auth endpoint exclusion:** `!isAuth` check ensures login/refresh endpoints never trigger refresh logic
3. **Failure handling:** If refresh fails, tokens are cleared and authentication error is thrown (no infinite loop)

**Flow:**
```
Request → 401 → Refresh attempt → Retry request (once) → Success or Clear tokens + Error
```

**Status:** ✅ Protected against infinite loops

---

## Offline Fallback Guardrails

**Implementation:** `frontend/src/services/api.ts:214-224` and all API functions

**Behavior:**
- When API call fails (network error, unreachable backend), functions fall back to localStorage
- No dual-write: if API fails, only localStorage is used (no mixing of data sources)
- Provides offline functionality for unauthenticated users or when backend is down

**Functions with offline fallback:**
- `getProjects()` - Falls back to localStorage on API failure
- `createProject()` - Falls back to localStorage on API failure
- `updateProject()` - Falls back to localStorage on API failure
- `deleteProject()` - Falls back to localStorage on API failure
- All other CRUD operations follow same pattern

**Status:** ✅ Deterministic - no dual-write, clear fallback behavior

---

## Integration Summary

### ✅ Core Integration Points

1. **JWT tokens stored** in localStorage with consistent keys:
   - `accredify_access_token`
   - `accredify_refresh_token`

2. **Authorization header injection** in `apiRequest()` for all non-auth endpoints

3. **401 → refresh → retry once** logic with loop protection

4. **`/api/auth/me/` used** to establish session on mount

5. **Offline fallback** (`accredify_data`) retained for unauthenticated/unreachable cases

### ✅ Verified Contracts

- Login: `{ username, password }` → `{ access, refresh, user }` ✅
- Refresh: `{ refresh }` → `{ access }` ✅
- Me: `Authorization: Bearer <access>` → User object ✅
- Logout: Client-only (no backend call) ✅

### ✅ Consistency

- No header contradictions
- No infinite refresh loops
- Deterministic offline fallback
- All contracts verified from backend source code

---

## Phase 1.1 Complete ✅

**Files Changed:**
1. `frontend/src/auth/tokens.ts` - Enhanced API contract documentation
2. `frontend/src/auth/AuthContext.tsx` - Client-only logout, enhanced comments
3. `frontend/src/services/api.ts` - Removed logout from AUTH_ENDPOINTS, enhanced comments
4. `PHASE1_AUTH_INTEGRATION_NOTES.md` - This document

**Backend Changes:** None (as required)

**Ready for:** Phase 1 closure and Phase 2 feature expansion
