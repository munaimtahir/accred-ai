/**
 * Offline Data Store Utilities
 * 
 * Handles reading, counting, and managing offline demo data stored in localStorage.
 * Used for Phase 3A: Manual import of offline demo data on login.
 */

import { Project } from '../types';

const OFFLINE_DATA_KEY = 'accredify_data';
const IMPORT_STATUS_KEY = 'accredify_offline_import_status';

export interface OfflineData {
  projects: Project[];
  indicators?: any[];
  evidence?: any[];
}

export interface ImportStatus {
  import_completed?: boolean;
  suppressed?: boolean;
  imported_project_ids?: string[];
}

/**
 * Read offline data from localStorage
 * @returns Parsed offline data object or null if not found/invalid
 */
export function readOfflineData(): OfflineData | null {
  try {
    const data = localStorage.getItem(OFFLINE_DATA_KEY);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    // Ensure it has the expected structure
    if (parsed && typeof parsed === 'object') {
      return {
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        indicators: Array.isArray(parsed.indicators) ? parsed.indicators : undefined,
        evidence: Array.isArray(parsed.evidence) ? parsed.evidence : undefined,
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to read offline data:', error);
    return null;
  }
}

/**
 * Count the number of offline projects
 * @returns Number of projects in offline storage
 */
export function countOfflineProjects(): number {
  const data = readOfflineData();
  return data?.projects?.length || 0;
}

/**
 * Clear all offline data from localStorage
 */
export function clearOfflineData(): void {
  try {
    localStorage.removeItem(OFFLINE_DATA_KEY);
  } catch (error) {
    console.error('Failed to clear offline data:', error);
  }
}

/**
 * Get the current import status
 * @returns Import status object or null if not set
 */
export function getImportStatus(): ImportStatus | null {
  try {
    const data = localStorage.getItem(IMPORT_STATUS_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read import status:', error);
    return null;
  }
}

/**
 * Mark import as completed
 * @param importedProjectIds Optional array of project IDs that were imported
 */
export function markImportDone(importedProjectIds?: string[]): void {
  try {
    const status: ImportStatus = {
      import_completed: true,
      imported_project_ids: importedProjectIds,
    };
    localStorage.setItem(IMPORT_STATUS_KEY, JSON.stringify(status));
  } catch (error) {
    console.error('Failed to mark import as done:', error);
  }
}

/**
 * Mark import prompt as suppressed (user selected "Don't ask again")
 */
export function markImportSuppressed(): void {
  try {
    const status: ImportStatus = {
      suppressed: true,
    };
    localStorage.setItem(IMPORT_STATUS_KEY, JSON.stringify(status));
  } catch (error) {
    console.error('Failed to mark import as suppressed:', error);
  }
}

/**
 * Check if import should be shown
 * @param isAuthenticated Whether user is currently authenticated
 * @returns true if import prompt should be shown
 */
export function shouldShowImportPrompt(isAuthenticated: boolean): boolean {
  // Only show if authenticated
  if (!isAuthenticated) return false;
  
  // Check if offline data exists with at least 1 project
  const projectCount = countOfflineProjects();
  if (projectCount === 0) return false;
  
  // Check import status
  const status = getImportStatus();
  if (status?.import_completed || status?.suppressed) return false;
  
  return true;
}

/**
 * Clear import status (useful for testing or reset)
 */
export function clearImportStatus(): void {
  try {
    localStorage.removeItem(IMPORT_STATUS_KEY);
  } catch (error) {
    console.error('Failed to clear import status:', error);
  }
}
