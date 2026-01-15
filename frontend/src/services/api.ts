import { 
  Project, 
  Indicator, 
  Evidence, 
  CreateProjectData, 
  CreateEvidenceData,
  CategorizationResult,
  TaskSuggestion,
  IndicatorExplanation,
  FrequencyGroupingResult
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getAccessToken, getRefreshToken, setTokens, clearTokens, isAuthenticated as checkAuth } from '../auth/tokens';
import { shouldUseBackend, shouldUseLocalStorage, DataMode } from '../state/dataMode';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function debugLog(payload: {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId: string;
  runId: string;
}) {
  const entry = {
    ...payload,
    timestamp: Date.now(),
    sessionId: 'debug-session',
  };

  // #region agent log
  fetch('http://127.0.0.1:7254/ingest/45629900-3be2-4b80-aff1-669833300a36', {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(entry),
  }).catch(() => {});
  // #endregion

  // Fallback evidence channel when the ingest server is unreachable (e.g., app running in Docker)
  try {
    const key = 'accredify_debug';
    const existing = localStorage.getItem(key);
    const arr: unknown[] = existing ? JSON.parse(existing) : [];
    arr.push(entry);
    // cap growth
    if (arr.length > 200) arr.splice(0, arr.length - 200);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

function generateId(): string {
  const c: any = (globalThis as any).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  try {
    return uuidv4();
  } catch {
    // last-resort fallback (should be rare)
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

// Auth endpoints that should NOT include Authorization header
// Note: /auth/logout/ is not used (client-only logout), but included for completeness
const AUTH_ENDPOINTS = ['/auth/login/', '/auth/refresh/'];

/**
 * Check if an endpoint is an auth endpoint
 */
function isAuthEndpoint(endpoint: string): boolean {
  return AUTH_ENDPOINTS.some(authEp => endpoint.includes(authEp));
}

/**
 * Attempt to refresh the access token using the refresh token
 * Returns true if refresh succeeded, false otherwise
 */
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    if (data.access) {
      // Store new access token, keep existing refresh token
      const currentRefresh = getRefreshToken();
      if (currentRefresh) {
        setTokens({ access: data.access, refresh: currentRefresh });
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Helper function for API requests with authentication and 401 handling
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {},
  retryOn401: boolean = true
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const isAuth = isAuthEndpoint(endpoint);
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // Add Authorization header if not an auth endpoint and access token exists
  if (!isAuth) {
    const accessToken = getAccessToken();
    if (accessToken) {
      defaultHeaders['Authorization'] = `Bearer ${accessToken}`;
    }
  }
  
  // Don't set Content-Type for FormData (browser will set it with boundary)
  if (options.body instanceof FormData) {
    delete (defaultHeaders as Record<string, string>)['Content-Type'];
  }
  
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });
  } catch (err) {
    debugLog({
      location: 'frontend/src/services/api.ts:apiRequest',
      message: 'apiRequest:fetch_failed',
      data: {
        url,
        method: (options as any)?.method,
        isSecureContext: (globalThis as any).isSecureContext,
        protocol: (globalThis as any).location?.protocol,
      },
      hypothesisId: 'H2',
      runId: 'pre-fix',
    });
    throw err;
  }
  
  // Handle 401 Unauthorized: attempt token refresh and retry once (max 1 retry per request)
  // Loop protection: retryOn401 flag ensures we only retry once, and !isAuth ensures
  // auth endpoints (login/refresh) never trigger refresh logic
  if (response.status === 401 && retryOn401 && !isAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry the original request with new token (only once)
      const retryHeaders: HeadersInit = {
        ...defaultHeaders,
        'Authorization': `Bearer ${getAccessToken()}`,
        ...options.headers,
      };
      
      if (options.body instanceof FormData) {
        delete (retryHeaders as Record<string, string>)['Content-Type'];
      }
      
      const retryResponse = await fetch(url, {
        ...options,
        headers: retryHeaders,
      });
      
      if (!retryResponse.ok) {
        if (retryResponse.status === 401) {
          // Refresh failed or token still invalid, clear tokens
          clearTokens();
          const error = await retryResponse.json().catch(() => ({ error: 'Authentication failed' }));
          throw new Error(error.message || error.error || 'Authentication required');
        }
        const error = await retryResponse.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.message || error.error || `HTTP ${retryResponse.status}`);
      }
      
      const text = await retryResponse.text();
      return text ? JSON.parse(text) : ({} as T);
    } else {
      // Refresh failed, clear tokens and throw authentication error
      clearTokens();
      const error = await response.json().catch(() => ({ error: 'Authentication required' }));
      throw new Error(error.message || error.error || 'Authentication required');
    }
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    // Phase 6: Prioritize message field over error field for better user feedback
    const errorMessage = error.message || error.error || `HTTP ${response.status}`;
    throw new Error(errorMessage);
  }
  
  // Handle empty responses
  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

// Local storage fallback for offline/demo mode
// Behavior:
// - When API fails (network error, unreachable backend), fall back to localStorage
// - This provides offline functionality for unauthenticated users or when backend is down
// - No dual-write: if API call fails, we use localStorage only (no mixing of data sources)
const LOCAL_STORAGE_KEY = 'accredify_data';

function getLocalData(): { projects: Project[] } {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  return data ? JSON.parse(data) : { projects: [] };
}

function setLocalData(data: { projects: Project[] }): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
}

/**
 * Check if we should fallback to localStorage
 * Returns true only if user is unauthenticated AND in offline mode
 */
function shouldFallbackToLocalStorage(): boolean {
  const authenticated = checkAuth();
  return shouldUseLocalStorage(authenticated);
}

/**
 * Create a network error for authenticated users
 */
function createNetworkError(operation: string, originalError: unknown): Error {
  const message = originalError instanceof Error ? originalError.message : String(originalError);
  return new Error(`Server unavailable. ${operation} failed. Changes not saved. ${message ? `(${message})` : ''}`);
}

/**
 * Check if AI features are available (must be online/authenticated)
 * Throws error if offline mode
 */
function requireAIFeatures(): void {
  if (shouldFallbackToLocalStorage()) {
    throw new Error('Sign in required for AI features');
  }
}

// API Functions
export const api = {
  // Projects
  async getProjects(): Promise<Project[]> {
    try {
      return await apiRequest<Project[]>('/projects/');
    } catch (error) {
      // Only fallback to localStorage if unauthenticated and in offline mode
      if (shouldFallbackToLocalStorage()) {
        console.warn('API unavailable, using local storage (offline mode):', error);
        return getLocalData().projects;
      }
      // If authenticated, throw error (no localStorage fallback)
      throw createNetworkError('Loading projects', error);
    }
  },

  async createProject(data: CreateProjectData): Promise<Project> {
    // #region agent log
    fetch('http://127.0.0.1:7254/ingest/45629900-3be2-4b80-aff1-669833300a36',{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify({location:'frontend/src/services/api.ts:createProject',message:'createProject:enter:nocors',data:{hasCrypto:typeof (globalThis as any).crypto !== 'undefined',hasRandomUUID:typeof (globalThis as any).crypto?.randomUUID === 'function',protocol:(globalThis as any).location?.protocol},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'Hlog'})}).catch(()=>{});
    // #endregion
    // #region agent log
    fetch('http://127.0.0.1:7254/ingest/45629900-3be2-4b80-aff1-669833300a36',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'frontend/src/services/api.ts:createProject',message:'createProject:enter',data:{apiBase:API_BASE_URL,hasCrypto:typeof (globalThis as any).crypto !== 'undefined',cryptoType:typeof (globalThis as any).crypto,hasRandomUUID:typeof (globalThis as any).crypto?.randomUUID === 'function',randomUUIDType:typeof (globalThis as any).crypto?.randomUUID,isSecureContext:(globalThis as any).isSecureContext,protocol:(globalThis as any).location?.protocol,userAgent:(globalThis as any).navigator?.userAgent},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    try {
      return await apiRequest<Project>('/projects/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      // Only fallback to localStorage if unauthenticated and in offline mode
      if (shouldFallbackToLocalStorage()) {
        // #region agent log
        fetch('http://127.0.0.1:7254/ingest/45629900-3be2-4b80-aff1-669833300a36',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'frontend/src/services/api.ts:createProject',message:'createProject:api_failed_using_local',data:{errName:(error as any)?.name,errMsg:String((error as any)?.message||error)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        console.warn('API unavailable, using local storage (offline mode):', error);
        const localData = getLocalData();
        // #region agent log
        fetch('http://127.0.0.1:7254/ingest/45629900-3be2-4b80-aff1-669833300a36',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'frontend/src/services/api.ts:createProject',message:'createProject:before_uuid',data:{hasCrypto:typeof (globalThis as any).crypto !== 'undefined',hasRandomUUID:typeof (globalThis as any).crypto?.randomUUID === 'function',randomUUIDType:typeof (globalThis as any).crypto?.randomUUID},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        debugLog({
          location: 'frontend/src/services/api.ts:createProject',
          message: 'createProject:offline_mode_id_strategy',
          data: {
            apiBase: API_BASE_URL,
            hasCrypto: typeof (globalThis as any).crypto !== 'undefined',
            hasRandomUUID: typeof (globalThis as any).crypto?.randomUUID === 'function',
            willUse: typeof (globalThis as any).crypto?.randomUUID === 'function' ? 'crypto.randomUUID' : 'uuid.v4',
          },
          hypothesisId: 'H1',
          runId: 'pre-fix',
        });
        const newProject: Project = {
          id: generateId(),
          name: data.name,
          description: data.description,
          indicators: (data.indicators || []).map((ind, index) => ({
            id: generateId(),
            section: ind.section || 'General',
            standard: ind.standard || `STD-${index + 1}`,
            indicator: ind.indicator || 'New Indicator',
            description: ind.description || '',
            score: ind.score || 10,
            status: ind.status || 'Not Started',
            evidence: [],
            ...ind,
          })) as Indicator[],
          createdAt: new Date().toISOString(),
        };
        // #region agent log
        fetch('http://127.0.0.1:7254/ingest/45629900-3be2-4b80-aff1-669833300a36',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'frontend/src/services/api.ts:createProject',message:'createProject:local_created',data:{projectIdType:typeof (newProject as any)?.id,indicatorsCount:Array.isArray((newProject as any)?.indicators)?(newProject as any).indicators.length:null},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        localData.projects.push(newProject);
        setLocalData(localData);
        return newProject;
      }
      // If authenticated, throw error (no localStorage fallback)
      throw createNetworkError('Creating project', error);
    }
  },

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    try {
      return await apiRequest<Project>(`/projects/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    } catch (error) {
      // Only fallback to localStorage if unauthenticated and in offline mode
      if (shouldFallbackToLocalStorage()) {
        console.warn('API unavailable, using local storage (offline mode):', error);
        const localData = getLocalData();
        const projectIndex = localData.projects.findIndex(p => p.id === id);
        if (projectIndex === -1) throw new Error('Project not found');
        localData.projects[projectIndex] = { ...localData.projects[projectIndex], ...data };
        setLocalData(localData);
        return localData.projects[projectIndex];
      }
      // If authenticated, throw error (no localStorage fallback)
      throw createNetworkError('Updating project', error);
    }
  },

  async deleteProject(id: string): Promise<void> {
    try {
      await apiRequest<void>(`/projects/${id}/`, {
        method: 'DELETE',
      });
    } catch (error) {
      // Only fallback to localStorage if unauthenticated and in offline mode
      if (shouldFallbackToLocalStorage()) {
        console.warn('API unavailable, using local storage (offline mode):', error);
        const localData = getLocalData();
        localData.projects = localData.projects.filter(p => p.id !== id);
        setLocalData(localData);
        return;
      }
      // If authenticated, throw error (no localStorage fallback)
      throw createNetworkError('Deleting project', error);
    }
  },

  // Indicators
  async updateIndicator(id: string, data: Partial<Indicator>): Promise<Indicator> {
    try {
      return await apiRequest<Indicator>(`/indicators/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    } catch (error) {
      // Only fallback to localStorage if unauthenticated and in offline mode
      if (shouldFallbackToLocalStorage()) {
        console.warn('API unavailable, using local storage (offline mode):', error);
        const localData = getLocalData();
        for (const project of localData.projects) {
          const indicatorIndex = project.indicators.findIndex(i => i.id === id);
          if (indicatorIndex !== -1) {
            project.indicators[indicatorIndex] = { 
              ...project.indicators[indicatorIndex], 
              ...data 
            };
            setLocalData(localData);
            return project.indicators[indicatorIndex];
          }
        }
        throw new Error('Indicator not found');
      }
      // If authenticated, throw error (no localStorage fallback)
      throw createNetworkError('Updating indicator', error);
    }
  },

  async quickLogIndicator(id: string): Promise<Indicator> {
    try {
      return await apiRequest<Indicator>(`/indicators/${id}/quick_log/`, {
        method: 'POST',
      });
    } catch (error) {
      // Only fallback to localStorage if unauthenticated and in offline mode
      if (shouldFallbackToLocalStorage()) {
        console.warn('API unavailable, using local storage (offline mode):', error);
        return this.updateIndicator(id, { 
          status: 'Compliant', 
          lastUpdated: new Date().toISOString() 
        });
      }
      // If authenticated, throw error (no localStorage fallback)
      throw createNetworkError('Quick logging indicator', error);
    }
  },

  // Evidence
  async createEvidence(data: CreateEvidenceData): Promise<Evidence> {
    try {
      let body: FormData | string;
      let headers: HeadersInit = {};

      if (data.file) {
        const formData = new FormData();
        formData.append('indicator', data.indicator);
        formData.append('type', data.type);
        formData.append('file', data.file);
        if (data.fileName) formData.append('fileName', data.fileName);
        body = formData;
      } else {
        // For Drive attachments or other non-file evidence, send as JSON
        body = JSON.stringify(data);
        headers['Content-Type'] = 'application/json';
      }

      return await apiRequest<Evidence>('/evidence/', {
        method: 'POST',
        body,
        headers,
      });
    } catch (error) {
      // Only fallback to localStorage if unauthenticated and in offline mode
      if (shouldFallbackToLocalStorage()) {
        console.warn('API unavailable, using local storage (offline mode):', error);
        const localData = getLocalData();
        const newEvidence: Evidence = {
          id: generateId(),
          dateUploaded: new Date().toISOString(),
          type: data.type,
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          content: data.content,
        };
        
        for (const project of localData.projects) {
          const indicator = project.indicators.find(i => i.id === data.indicator);
          if (indicator) {
            indicator.evidence.push(newEvidence);
            setLocalData(localData);
            return newEvidence;
          }
        }
        throw new Error('Indicator not found');
      }
      // If authenticated, throw error (no localStorage fallback)
      throw createNetworkError('Creating evidence', error);
    }
  },

  async deleteEvidence(id: string): Promise<void> {
    try {
      await apiRequest<void>(`/evidence/${id}/`, {
        method: 'DELETE',
      });
    } catch (error) {
      // Only fallback to localStorage if unauthenticated and in offline mode
      if (shouldFallbackToLocalStorage()) {
        console.warn('API unavailable, using local storage (offline mode):', error);
        const localData = getLocalData();
        for (const project of localData.projects) {
          for (const indicator of project.indicators) {
            indicator.evidence = indicator.evidence.filter(e => e.id !== id);
          }
        }
        setLocalData(localData);
        return;
      }
      // If authenticated, throw error (no localStorage fallback)
      throw createNetworkError('Deleting evidence', error);
    }
  },

  // Phase 6: Review evidence
  async reviewEvidence(id: string, action: 'accept' | 'reject', reason?: string): Promise<Evidence> {
    // Block review in offline mode (online-only feature)
    if (shouldFallbackToLocalStorage()) {
      throw new Error('Evidence review requires sign-in and online connection');
    }
    
    try {
      return await apiRequest<Evidence>(`/evidence/${id}/review/`, {
        method: 'POST',
        body: JSON.stringify({ action, reason }),
      });
    } catch (error) {
      throw createNetworkError('Reviewing evidence', error);
    }
  },

  // AI Services
  async analyzeChecklist(indicators: Partial<Indicator>[]): Promise<Partial<Indicator>[]> {
    // Block AI features in offline mode
    requireAIFeatures();
    
    try {
      const response = await apiRequest<{ indicators: Partial<Indicator>[] }>('/analyze-checklist/', {
        method: 'POST',
        body: JSON.stringify({ indicators }),
      });
      return response.indicators;
    } catch (error) {
      // If offline mode check passed but API failed, throw error (no fallback)
      throw createNetworkError('Analyzing checklist', error);
    }
  },

  async analyzeCategorization(indicators: Indicator[]): Promise<CategorizationResult> {
    // Block AI features in offline mode
    requireAIFeatures();
    
    try {
      return await apiRequest<CategorizationResult>('/analyze-categorization/', {
        method: 'POST',
        body: JSON.stringify({ indicators }),
      });
    } catch (error) {
      // If offline mode check passed but API failed, throw error (no fallback)
      throw createNetworkError('Analyzing categorization', error);
    }
  },

  async analyzeIndicatorExplanations(indicators: Indicator[]): Promise<Record<string, IndicatorExplanation>> {
    // Block AI features in offline mode
    requireAIFeatures();
    
    try {
      return await apiRequest<Record<string, IndicatorExplanation>>('/analyze-indicator-explanations/', {
        method: 'POST',
        body: JSON.stringify({ indicators }),
      });
    } catch (error) {
      // If offline mode check passed but API failed, throw error (no fallback)
      throw createNetworkError('Analyzing indicator explanations', error);
    }
  },

  async analyzeFrequencyGrouping(indicators: Indicator[]): Promise<FrequencyGroupingResult> {
    // Block AI features in offline mode
    requireAIFeatures();
    
    try {
      return await apiRequest<FrequencyGroupingResult>('/analyze-frequency-grouping/', {
        method: 'POST',
        body: JSON.stringify({ indicators }),
      });
    } catch (error) {
      // If offline mode check passed but API failed, throw error (no fallback)
      throw createNetworkError('Analyzing frequency grouping', error);
    }
  },

  async askAssistant(query: string, indicators?: Indicator[]): Promise<string> {
    // Block AI features in offline mode
    requireAIFeatures();
    
    try {
      const response = await apiRequest<{ response: string }>('/ask-assistant/', {
        method: 'POST',
        body: JSON.stringify({ query, indicators }),
      });
      return response.response;
    } catch (error) {
      // If offline mode check passed but API failed, throw error (no fallback)
      throw createNetworkError('AI assistant request', error);
    }
  },

  async generateReportSummary(indicators: Indicator[]): Promise<string> {
    // Block AI features in offline mode
    requireAIFeatures();
    
    try {
      const response = await apiRequest<{ summary: string }>('/report-summary/', {
        method: 'POST',
        body: JSON.stringify({ indicators }),
      });
      return response.summary;
    } catch (error) {
      // If offline mode check passed but API failed, throw error (no fallback)
      throw createNetworkError('Generating report summary', error);
    }
  },

  async convertDocument(documentText: string): Promise<string> {
    // Block AI features in offline mode
    requireAIFeatures();
    
    try {
      const response = await apiRequest<{ csv_content: string }>('/convert-document/', {
        method: 'POST',
        body: JSON.stringify({ document_text: documentText }),
      });
      return response.csv_content;
    } catch (error) {
      // If offline mode check passed but API failed, throw error (no fallback)
      throw createNetworkError('Converting document', error);
    }
  },

  async generateComplianceGuide(indicator: Indicator): Promise<string> {
    // Block AI features in offline mode
    requireAIFeatures();
    
    try {
      const response = await apiRequest<{ guide: string }>('/compliance-guide/', {
        method: 'POST',
        body: JSON.stringify({ indicator }),
      });
      return response.guide;
    } catch (error) {
      // If offline mode check passed but API failed, throw error (no fallback)
      throw createNetworkError('Generating compliance guide', error);
    }
  },

  async analyzeTasks(indicators: Indicator[]): Promise<TaskSuggestion[]> {
    // Block AI features in offline mode
    requireAIFeatures();
    
    try {
      return await apiRequest<TaskSuggestion[]>('/analyze-tasks/', {
        method: 'POST',
        body: JSON.stringify({ indicators }),
      });
    } catch (error) {
      // If offline mode check passed but API failed, throw error (no fallback)
      throw createNetworkError('Analyzing tasks', error);
    }
  },
};

export default api;
