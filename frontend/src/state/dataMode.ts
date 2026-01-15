/**
 * Data Mode State Management
 * 
 * Manages whether the app is in ONLINE (backend) or OFFLINE (localStorage) mode.
 * Rules:
 * - If authenticated: always ONLINE (cannot be overridden)
 * - If unauthenticated: can be OFFLINE (explicit offline demo mode)
 * - Preference stored in localStorage as 'accredify_data_mode'
 */

export enum DataMode {
  ONLINE = 'online',
  OFFLINE = 'offline',
}

const STORAGE_KEY = 'accredify_data_mode';

/**
 * Get the current data mode
 * @param isAuthenticated - Whether the user is currently authenticated
 * @returns The current data mode (ONLINE if authenticated, otherwise checks localStorage preference)
 */
export function getDataMode(isAuthenticated: boolean): DataMode {
  // If authenticated, always force ONLINE mode (no offline while logged in)
  if (isAuthenticated) {
    return DataMode.ONLINE;
  }
  
  // If not authenticated, check localStorage preference (default to OFFLINE)
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === DataMode.ONLINE || stored === DataMode.OFFLINE) {
    return stored as DataMode;
  }
  
  // Default to OFFLINE for unauthenticated users
  return DataMode.OFFLINE;
}

/**
 * Set the data mode preference
 * @param mode - The mode to set
 * @param isAuthenticated - Whether the user is currently authenticated
 * @returns The actual mode that was set (may differ if authenticated)
 */
export function setDataMode(mode: DataMode, isAuthenticated: boolean): DataMode {
  // If authenticated, force ONLINE and update storage (but it won't be used until logout)
  if (isAuthenticated) {
    localStorage.setItem(STORAGE_KEY, DataMode.ONLINE);
    return DataMode.ONLINE;
  }
  
  // If not authenticated, allow setting the mode
  localStorage.setItem(STORAGE_KEY, mode);
  return mode;
}

/**
 * Clear the data mode preference
 */
export function clearDataMode(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if the app should use backend API
 */
export function shouldUseBackend(isAuthenticated: boolean): boolean {
  return getDataMode(isAuthenticated) === DataMode.ONLINE;
}

/**
 * Check if the app should use localStorage
 */
export function shouldUseLocalStorage(isAuthenticated: boolean): boolean {
  return getDataMode(isAuthenticated) === DataMode.OFFLINE;
}
