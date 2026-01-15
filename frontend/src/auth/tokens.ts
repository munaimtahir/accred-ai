/**
 * Token Management Utilities
 * 
 * API Contract (verified from backend source code):
 * 
 * LOGIN:
 *   Endpoint: POST /api/auth/login/
 *   Request: { username: string, password: string }
 *   Response: { access: string, refresh: string, user: {...} }
 *   Headers: None (AllowAny permission)
 *   Source: backend/api/views.py:58-63, backend/api/serializers.py:258-265
 *   Test: backend/api/tests/test_authentication.py:60-71
 * 
 * REFRESH:
 *   Endpoint: POST /api/auth/refresh/
 *   Request: { refresh: string }
 *   Response: { access: string }
 *   Headers: None (AllowAny permission)
 *   Source: backend/api/urls.py:18 (TokenRefreshView from rest_framework_simplejwt)
 *   Test: backend/api/tests/test_authentication.py:150-156
 * 
 * ME:
 *   Endpoint: GET /api/auth/me/
 *   Request: None
 *   Response: { id, username, email, firstName, lastName, role, isStaff }
 *   Headers: Authorization: Bearer <access>
 *   Source: backend/api/views.py:80-85
 *   Test: backend/api/tests/test_authentication.py:98-104
 * 
 * LOGOUT:
 *   Endpoint: POST /api/auth/logout/ (NOT USED - client-only logout)
 *   Note: Backend endpoint exists but requires IsAuthenticated + refresh_token in body.
 *   Frontend uses client-only logout (clearTokens) for simplicity.
 *   Source: backend/api/views.py:66-77
 */

const ACCESS_TOKEN_KEY = 'accredify_access_token';
const REFRESH_TOKEN_KEY = 'accredify_refresh_token';

export interface TokenPair {
  access: string;
  refresh: string;
}

/**
 * Get the current access token from localStorage
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get the current refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Store both access and refresh tokens in localStorage
 */
export function setTokens(tokens: TokenPair): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
}

/**
 * Clear both tokens from localStorage
 */
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Check if user is authenticated (has access token)
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}