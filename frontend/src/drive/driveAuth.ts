/**
 * Google Drive OAuth Authentication
 * 
 * Uses Google Identity Services (GIS) for OAuth token management.
 * Scope: https://www.googleapis.com/auth/drive.file (least-privilege)
 * 
 * Token caching: in-memory only (not localStorage) for security.
 */

// Google OAuth configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

// In-memory token cache
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

// Google Identity Services token client
let tokenClient: google.accounts.oauth2.TokenClient | null = null;

/**
 * Initialize Google Identity Services token client
 * Must be called after Google Identity Services library is loaded
 */
export function initializeDriveAuth(): void {
  if (!GOOGLE_CLIENT_ID) {
    console.warn('VITE_GOOGLE_CLIENT_ID not configured. Drive features will be unavailable.');
    return;
  }

  if (typeof google === 'undefined' || !google.accounts) {
    console.error('Google Identity Services library not loaded');
    return;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: DRIVE_SCOPE,
    callback: (response: google.accounts.oauth2.TokenResponse) => {
      if (response.error) {
        console.error('Google OAuth error:', response.error);
        cachedToken = null;
        tokenExpiry = null;
        return;
      }
      
      cachedToken = response.access_token;
      // Token expires in response.expires_in seconds
      tokenExpiry = Date.now() + (response.expires_in * 1000);
    },
  });
}

/**
 * Check if Google Identity Services is loaded
 */
export function isGoogleLoaded(): boolean {
  return typeof google !== 'undefined' && 
         typeof google.accounts !== 'undefined' && 
         typeof google.accounts.oauth2 !== 'undefined';
}

/**
 * Check if token is valid (exists and not expired)
 */
function isTokenValid(): boolean {
  if (!cachedToken) return false;
  if (tokenExpiry === null) return false;
  // Add 60 second buffer before expiry
  return Date.now() < (tokenExpiry - 60000);
}

// Store pending token request resolvers
let pendingTokenResolver: ((token: string | null) => void) | null = null;

/**
 * Request Google Drive access token
 * @returns Promise resolving to access token or null if user cancels/error
 */
export function requestDriveToken(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!GOOGLE_CLIENT_ID) {
      console.error('Google Client ID not configured');
      resolve(null);
      return;
    }

    if (!isGoogleLoaded()) {
      console.error('Google Identity Services not loaded');
      resolve(null);
      return;
    }

    // Initialize if not already done
    if (!tokenClient) {
      // Create a new token client with callback
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: (response: google.accounts.oauth2.TokenResponse) => {
          if (response.error) {
            console.error('Google OAuth error:', response.error);
            cachedToken = null;
            tokenExpiry = null;
            if (pendingTokenResolver) {
              pendingTokenResolver(null);
              pendingTokenResolver = null;
            }
            return;
          }
          
          cachedToken = response.access_token;
          // Token expires in response.expires_in seconds
          tokenExpiry = Date.now() + (response.expires_in * 1000);
          
          if (pendingTokenResolver) {
            pendingTokenResolver(cachedToken);
            pendingTokenResolver = null;
          }
        },
      });
    }

    // If we have a valid cached token, return it
    if (isTokenValid() && cachedToken) {
      resolve(cachedToken);
      return;
    }

    // Store resolver for callback
    pendingTokenResolver = resolve;

    // Request new token
    tokenClient!.requestAccessToken({ prompt: 'consent' });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (pendingTokenResolver === resolve) {
        pendingTokenResolver = null;
        resolve(null);
      }
    }, 30000);
  });
}

/**
 * Get current access token (if valid)
 * @returns Access token or null
 */
export function getDriveToken(): string | null {
  if (isTokenValid()) {
    return cachedToken;
  }
  return null;
}

/**
 * Clear cached token (e.g., on logout)
 */
export function clearDriveToken(): void {
  cachedToken = null;
  tokenExpiry = null;
}

/**
 * Check if user is authenticated with Google Drive
 */
export function isDriveAuthenticated(): boolean {
  return isTokenValid();
}
