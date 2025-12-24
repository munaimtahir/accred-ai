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

// Support deployment under a subpath for Keystone
// When deployed under /{APP_SLUG}/, the frontend is accessed at http://VPS_IP/{APP_SLUG}/
// API calls need to be relative to the current base path
const BASE_PATH = import.meta.env.VITE_BASE_PATH || '';
// Construct API base URL: 
// - If BASE_PATH is empty or '/', result is '/api'
// - If BASE_PATH is '/accred-ai', result is '/accred-ai/api'
const API_BASE_URL = import.meta.env.VITE_API_URL || (() => {
  if (!BASE_PATH || BASE_PATH === '/') {
    return '/api';
  }
  return `${BASE_PATH}/api`;
})();

// Note: debugLog below uses hardcoded localhost:7254 for internal development diagnostics only.
// These calls are intentionally NOT routed through the app's base path as they're for 
// developer tooling/debugging, not production features. They fail silently if unavailable.
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

// Helper function for API requests
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
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
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }
  
  // Handle empty responses
  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

// Local storage fallback for offline/demo mode
const LOCAL_STORAGE_KEY = 'accredify_data';

function getLocalData(): { projects: Project[] } {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  return data ? JSON.parse(data) : { projects: [] };
}

function setLocalData(data: { projects: Project[] }): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
}

// API Functions
export const api = {
  // Projects
  async getProjects(): Promise<Project[]> {
    try {
      return await apiRequest<Project[]>('/projects/');
    } catch (error) {
      console.warn('API unavailable, using local storage:', error);
      return getLocalData().projects;
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
      // #region agent log
      fetch('http://127.0.0.1:7254/ingest/45629900-3be2-4b80-aff1-669833300a36',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'frontend/src/services/api.ts:createProject',message:'createProject:api_failed_using_local',data:{errName:(error as any)?.name,errMsg:String((error as any)?.message||error)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      console.warn('API unavailable, using local storage:', error);
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
  },

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    try {
      return await apiRequest<Project>(`/projects/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.warn('API unavailable, using local storage:', error);
      const localData = getLocalData();
      const projectIndex = localData.projects.findIndex(p => p.id === id);
      if (projectIndex === -1) throw new Error('Project not found');
      localData.projects[projectIndex] = { ...localData.projects[projectIndex], ...data };
      setLocalData(localData);
      return localData.projects[projectIndex];
    }
  },

  async deleteProject(id: string): Promise<void> {
    try {
      await apiRequest<void>(`/projects/${id}/`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('API unavailable, using local storage:', error);
      const localData = getLocalData();
      localData.projects = localData.projects.filter(p => p.id !== id);
      setLocalData(localData);
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
      console.warn('API unavailable, using local storage:', error);
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
  },

  async quickLogIndicator(id: string): Promise<Indicator> {
    try {
      return await apiRequest<Indicator>(`/indicators/${id}/quick_log/`, {
        method: 'POST',
      });
    } catch (error) {
      console.warn('API unavailable, using local storage:', error);
      return this.updateIndicator(id, { 
        status: 'Compliant', 
        lastUpdated: new Date().toISOString() 
      });
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
        body = JSON.stringify(data);
        headers['Content-Type'] = 'application/json';
      }

      return await apiRequest<Evidence>('/evidence/', {
        method: 'POST',
        body,
        headers,
      });
    } catch (error) {
      console.warn('API unavailable, using local storage:', error);
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
  },

  async deleteEvidence(id: string): Promise<void> {
    try {
      await apiRequest<void>(`/evidence/${id}/`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('API unavailable, using local storage:', error);
      const localData = getLocalData();
      for (const project of localData.projects) {
        for (const indicator of project.indicators) {
          indicator.evidence = indicator.evidence.filter(e => e.id !== id);
        }
      }
      setLocalData(localData);
    }
  },

  // AI Services
  async analyzeChecklist(indicators: Partial<Indicator>[]): Promise<Partial<Indicator>[]> {
    try {
      const response = await apiRequest<{ indicators: Partial<Indicator>[] }>('/analyze-checklist/', {
        method: 'POST',
        body: JSON.stringify({ indicators }),
      });
      return response.indicators;
    } catch (error) {
      console.warn('AI service unavailable:', error);
      // Return indicators with default enrichment
      return indicators.map(ind => ({
        ...ind,
        description: ind.description || `Compliance requirement for ${ind.indicator || 'this item'}`,
        frequency: ind.frequency || 'One-time',
        score: ind.score || 10,
      }));
    }
  },

  async analyzeCategorization(indicators: Indicator[]): Promise<CategorizationResult> {
    try {
      return await apiRequest<CategorizationResult>('/analyze-categorization/', {
        method: 'POST',
        body: JSON.stringify({ indicators }),
      });
    } catch (error) {
      console.warn('AI service unavailable:', error);
      // Default categorization
      const result: CategorizationResult = {
        ai_fully_manageable: [],
        ai_assisted: [],
        manual: [],
      };
      
      for (const ind of indicators) {
        const text = (ind.indicator + ' ' + ind.description).toLowerCase();
        if (text.includes('document') || text.includes('sop') || text.includes('procedure')) {
          result.ai_fully_manageable.push(ind.id);
        } else if (text.includes('log') || text.includes('form') || text.includes('checklist')) {
          result.ai_assisted.push(ind.id);
        } else {
          result.manual.push(ind.id);
        }
      }
      
      return result;
    }
  },

  async analyzeIndicatorExplanations(indicators: Indicator[]): Promise<Record<string, IndicatorExplanation>> {
    try {
      return await apiRequest<Record<string, IndicatorExplanation>>('/analyze-indicator-explanations/', {
        method: 'POST',
        body: JSON.stringify({ indicators }),
      });
    } catch (error) {
      console.warn('AI service unavailable:', error);
      // Default explanations
      const result: Record<string, IndicatorExplanation> = {};
      for (const ind of indicators) {
        result[ind.id] = {
          explanation: ind.description || `Compliance requirement: ${ind.indicator}`,
          requiredEvidence: ['document'],
          evidenceDescription: 'Documentation required to demonstrate compliance with this requirement.',
        };
      }
      return result;
    }
  },

  async analyzeFrequencyGrouping(indicators: Indicator[]): Promise<FrequencyGroupingResult> {
    try {
      return await apiRequest<FrequencyGroupingResult>('/analyze-frequency-grouping/', {
        method: 'POST',
        body: JSON.stringify({ indicators }),
      });
    } catch (error) {
      console.warn('AI service unavailable:', error);
      // Default grouping based on existing frequency
      const result: FrequencyGroupingResult = {
        one_time: [],
        daily: [],
        weekly: [],
        monthly: [],
        quarterly: [],
        annually: [],
      };
      
      for (const ind of indicators) {
        const freq = ind.frequency?.toLowerCase() || 'one-time';
        if (freq === 'one-time') {
          result.one_time.push(ind.id);
        } else if (freq === 'daily') {
          result.daily.push(ind.id);
        } else if (freq === 'weekly') {
          result.weekly.push(ind.id);
        } else if (freq === 'monthly') {
          result.monthly.push(ind.id);
        } else if (freq === 'quarterly') {
          result.quarterly.push(ind.id);
        } else if (freq === 'annually') {
          result.annually.push(ind.id);
        } else {
          result.one_time.push(ind.id);
        }
      }
      
      return result;
    }
  },

  async askAssistant(query: string, indicators?: Indicator[]): Promise<string> {
    try {
      const response = await apiRequest<{ response: string }>('/ask-assistant/', {
        method: 'POST',
        body: JSON.stringify({ query, indicators }),
      });
      return response.response;
    } catch (error) {
      console.warn('AI service unavailable:', error);
      return "I'm sorry, but the AI assistant is not available at the moment. Please ensure the backend server is running and the Gemini API key is configured.";
    }
  },

  async generateReportSummary(indicators: Indicator[]): Promise<string> {
    try {
      const response = await apiRequest<{ summary: string }>('/report-summary/', {
        method: 'POST',
        body: JSON.stringify({ indicators }),
      });
      return response.summary;
    } catch (error) {
      console.warn('AI service unavailable:', error);
      const total = indicators.length;
      const compliant = indicators.filter(i => i.status === 'Compliant').length;
      return `Compliance Summary:\n\nTotal Indicators: ${total}\nCompliant: ${compliant} (${Math.round(100 * compliant / total)}%)\n\nPlease configure the AI service for a detailed analysis.`;
    }
  },

  async convertDocument(documentText: string): Promise<string> {
    try {
      const response = await apiRequest<{ csv_content: string }>('/convert-document/', {
        method: 'POST',
        body: JSON.stringify({ document_text: documentText }),
      });
      return response.csv_content;
    } catch (error) {
      console.warn('AI service unavailable:', error);
      return 'section,standard,indicator,description,score,frequency\nGeneral,GEN-001,Sample Indicator,Please configure AI to parse documents,10,One-time';
    }
  },

  async generateComplianceGuide(indicator: Indicator): Promise<string> {
    try {
      const response = await apiRequest<{ guide: string }>('/compliance-guide/', {
        method: 'POST',
        body: JSON.stringify({ indicator }),
      });
      return response.guide;
    } catch (error) {
      console.warn('AI service unavailable:', error);
      return `# ${indicator.indicator}\n\n## Description\n${indicator.description}\n\n## Steps to Comply\n1. Review requirements\n2. Implement procedures\n3. Document evidence\n4. Verify completion`;
    }
  },

  async analyzeTasks(indicators: Indicator[]): Promise<TaskSuggestion[]> {
    try {
      return await apiRequest<TaskSuggestion[]>('/analyze-tasks/', {
        method: 'POST',
        body: JSON.stringify({ indicators }),
      });
    } catch (error) {
      console.warn('AI service unavailable:', error);
      return indicators.map(ind => ({
        indicatorId: ind.id,
        suggestion: `Review and address: ${ind.indicator}`,
        isActionableByAI: ind.indicator.toLowerCase().includes('document'),
      }));
    }
  },
};

export default api;
