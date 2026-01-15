/**
 * Offline Cache Service
 * 
 * Manages caching of online data for offline fallback mode.
 * Stores minimal snapshot of projects and indicators for offline read access.
 */

import { Project, Indicator } from '../types';

const CACHE_KEY = 'accredify_offline_cache';

export interface OfflineCache {
  version: number;
  timestamp: string;
  projects: CachedProject[];
}

export interface CachedProject {
  id: string;
  name: string;
  description: string;
  indicators: CachedIndicator[];
}

export interface CachedIndicator {
  id: string;
  project_id: string;
  section: string;
  standard: string;
  indicator: string;
  description: string;
  score: number;
  status: string;
  notes?: string;
  evidence_count: number;
  last_updated?: string;
}

/**
 * Cache current projects/indicators snapshot
 */
export function cacheOnlineSnapshot(projects: Project[]): void {
  try {
    const cachedProjects: CachedProject[] = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      indicators: project.indicators.map(indicator => ({
        id: indicator.id,
        project_id: project.id,
        section: indicator.section,
        standard: indicator.standard,
        indicator: indicator.indicator,
        description: indicator.description,
        score: indicator.score,
        status: indicator.status,
        notes: indicator.notes,
        evidence_count: indicator.evidence?.length || 0,
        last_updated: indicator.lastUpdated,
      })),
    }));

    const cache: OfflineCache = {
      version: 1,
      timestamp: new Date().toISOString(),
      projects: cachedProjects,
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Failed to cache online snapshot:', error);
  }
}

/**
 * Read cached snapshot
 */
export function readCachedSnapshot(): OfflineCache | null {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    if (!data) return null;
    
    const cache = JSON.parse(data) as OfflineCache;
    
    // Validate structure
    if (!cache.version || !cache.timestamp || !Array.isArray(cache.projects)) {
      return null;
    }
    
    return cache;
  } catch (error) {
    console.error('Failed to read cached snapshot:', error);
    return null;
  }
}

/**
 * Convert cached snapshot to Project[] format for UI
 * Merges with any pending updates from the queue
 */
export function getCachedProjects(): Project[] {
  const cache = readCachedSnapshot();
  if (!cache) return [];

  // Lazy import to avoid circular dependency
  let queuedUpdates: Record<string, any> = {};
  try {
    // Dynamic import to avoid circular dependency
    const updateQueueModule = require('./updateQueue');
    queuedUpdates = updateQueueModule.getQueuedUpdates();
  } catch (error) {
    console.warn('Could not load update queue for cache merge:', error);
  }

  return cache.projects.map(cachedProject => {
    const indicators: Indicator[] = cachedProject.indicators.map(cachedIndicator => {
      // Check if this indicator has pending updates
      const update = queuedUpdates[cachedIndicator.id];
      
      return {
        id: cachedIndicator.id,
        section: cachedIndicator.section,
        standard: cachedIndicator.standard,
        indicator: cachedIndicator.indicator,
        description: cachedIndicator.description,
        score: update?.fields?.score ?? cachedIndicator.score,
        status: (update?.fields?.status ?? cachedIndicator.status) as any,
        notes: update?.fields?.remarks ?? update?.fields?.notes ?? cachedIndicator.notes,
        evidence: [], // No evidence in cache (lightweight)
        lastUpdated: update?.updated_at ?? cachedIndicator.last_updated,
      };
    });

    return {
      id: cachedProject.id,
      name: cachedProject.name,
      description: cachedProject.description,
      indicators,
      createdAt: cache.timestamp, // Use cache timestamp as fallback
    };
  });
}

/**
 * Clear cached snapshot
 */
export function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

/**
 * Get cache timestamp (for "Last synced at..." display)
 */
export function getCacheTimestamp(): string | null {
  const cache = readCachedSnapshot();
  return cache?.timestamp || null;
}
