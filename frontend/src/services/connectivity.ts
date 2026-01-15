/**
 * Connectivity Service
 * 
 * Detects server reachability for authenticated users.
 * Used to determine when offline fallback mode should be active.
 */

import { getAccessToken } from '../auth/tokens';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const HEALTH_CHECK_ENDPOINT = '/auth/me/';
const CHECK_INTERVAL_MS = 30000; // 30 seconds
const CHECK_TIMEOUT_MS = 5000; // 5 seconds

let connectivityCheckInterval: number | null = null;
let isServerReachable: boolean = true;
let connectivityListeners: Set<(reachable: boolean) => void> = new Set();

/**
 * Check if server is reachable
 * Uses /auth/me/ endpoint as lightweight connectivity check
 */
export async function checkServerReachability(): Promise<boolean> {
  const accessToken = getAccessToken();
  if (!accessToken) {
    // Not authenticated, can't check reachability
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    const response = await fetch(`${API_BASE_URL}${HEALTH_CHECK_ENDPOINT}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Consider 200-299 and 401 (auth issues) as "reachable"
    // 401 means server is reachable but token is invalid (different from network error)
    const reachable = response.status < 500;
    
    if (isServerReachable !== reachable) {
      isServerReachable = reachable;
      notifyListeners(reachable);
    }
    
    return reachable;
  } catch (error) {
    // Network error, timeout, or abort = server unreachable
    const reachable = false;
    if (isServerReachable !== reachable) {
      isServerReachable = reachable;
      notifyListeners(reachable);
    }
    return false;
  }
}

/**
 * Subscribe to connectivity changes
 */
export function onConnectivityChange(callback: (reachable: boolean) => void): () => void {
  connectivityListeners.add(callback);
  // Immediately call with current state
  callback(isServerReachable);
  
  // Return unsubscribe function
  return () => {
    connectivityListeners.delete(callback);
  };
}

/**
 * Notify all listeners of connectivity change
 */
function notifyListeners(reachable: boolean): void {
  connectivityListeners.forEach(callback => {
    try {
      callback(reachable);
    } catch (error) {
      console.error('Error in connectivity listener:', error);
    }
  });
}

/**
 * Start periodic connectivity checks
 * Only runs when authenticated
 */
export function startConnectivityMonitoring(isAuthenticated: boolean): void {
  stopConnectivityMonitoring();
  
  if (!isAuthenticated) {
    return;
  }

  // Initial check
  checkServerReachability();

  // Set up periodic checks
  connectivityCheckInterval = window.setInterval(() => {
    checkServerReachability();
  }, CHECK_INTERVAL_MS);

  // Also check on window online event
  window.addEventListener('online', () => {
    checkServerReachability();
  });
}

/**
 * Stop periodic connectivity checks
 */
export function stopConnectivityMonitoring(): void {
  if (connectivityCheckInterval !== null) {
    clearInterval(connectivityCheckInterval);
    connectivityCheckInterval = null;
  }
}

/**
 * Get current connectivity state (synchronous)
 */
export function getIsServerReachable(): boolean {
  return isServerReachable;
}
