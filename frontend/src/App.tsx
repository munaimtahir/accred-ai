import { useState, useEffect, useMemo, useCallback } from 'react';
import { Project, Indicator, View, ComplianceStats, CreateProjectData, CreateEvidenceData } from './types';
import { api } from './services/api';
import { useAuth } from './auth/AuthContext';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import ProjectHub from './components/ProjectHub';
import Dashboard from './components/Dashboard';
import Checklist from './components/Checklist';
import UpcomingTasks from './components/UpcomingTasks';
import AIAnalysis from './components/AIAnalysis';
import DocumentLibrary from './components/DocumentLibrary';
import AIAssistant from './components/AIAssistant';
import Reports from './components/Reports';
import Converter from './components/Converter';
import AddProjectModal from './components/modals/AddProjectModal';
import EditProjectModal from './components/modals/EditProjectModal';
import EvidenceModal from './components/modals/EvidenceModal';
import DeleteConfirmationModal from './components/modals/DeleteConfirmationModal';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  // Authentication
  const { isAuthenticated, loading: authLoading, logout, user } = useAuth();

  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('projects');
  
  // Modal states
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'project' | 'evidence'; id: string } | null>(null);
  
  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Computed values
  const activeProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  const activeIndicators = useMemo(() => 
    activeProject?.indicators || [],
    [activeProject]
  );

  const stats = useMemo((): ComplianceStats => {
    const indicators = activeIndicators;
    const total = indicators.length;
    if (total === 0) {
      return {
        total: 0,
        compliant: 0,
        nonCompliant: 0,
        inProgress: 0,
        notStarted: 0,
        notApplicable: 0,
        compliancePercentage: 0,
      };
    }

    const compliant = indicators.filter(i => i.status === 'Compliant').length;
    const nonCompliant = indicators.filter(i => i.status === 'Non-Compliant').length;
    const inProgress = indicators.filter(i => i.status === 'In Progress').length;
    const notStarted = indicators.filter(i => i.status === 'Not Started').length;
    const notApplicable = indicators.filter(i => i.status === 'Not Applicable').length;

    return {
      total,
      compliant,
      nonCompliant,
      inProgress,
      notStarted,
      notApplicable,
      compliancePercentage: Math.round((compliant / total) * 100),
    };
  }, [activeIndicators]);

  // Load projects on mount (only when authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
    }
  }, [isAuthenticated]);

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Event handlers
  const handleSaveProject = useCallback(async (data: CreateProjectData) => {
    setIsLoading(true);
    try {
      // #region agent log
      fetch('http://127.0.0.1:7254/ingest/45629900-3be2-4b80-aff1-669833300a36',{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify({location:'frontend/src/App.tsx:handleSaveProject',message:'handleSaveProject:enter:nocors',data:{nameLen:data?.name?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'Hlog'})}).catch(()=>{});
      // #endregion
      // #region agent log
      fetch('http://127.0.0.1:7254/ingest/45629900-3be2-4b80-aff1-669833300a36',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'frontend/src/App.tsx:handleSaveProject',message:'handleSaveProject:enter',data:{nameLen:data?.name?.length,descLen:data?.description?.length,indicatorsCount:Array.isArray((data as any)?.indicators)?(data as any).indicators.length:null},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H0'})}).catch(()=>{});
      // #endregion
      const newProject = await api.createProject(data);
      setProjects(prev => [...prev, newProject]);
      setActiveProjectId(newProject.id);
      setCurrentView('dashboard');
      setShowAddProjectModal(false);
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7254/ingest/45629900-3be2-4b80-aff1-669833300a36',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'frontend/src/App.tsx:handleSaveProject',message:'handleSaveProject:error',data:{errName:(err as any)?.name,errMsg:String((err as any)?.message||err)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H0'})}).catch(()=>{});
      // #endregion
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleUpdateProject = useCallback(async (id: string, data: Partial<Project>) => {
    // Optimistic update
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    
    try {
      await api.updateProject(id, data);
      setShowEditProjectModal(false);
    } catch (err) {
      // Rollback on error
      await loadProjects();
      setError(err instanceof Error ? err.message : 'Failed to update project');
    }
  }, []);

  const handleDeleteProject = useCallback(async (id: string) => {
    // Optimistic update
    const previousProjects = [...projects];
    setProjects(prev => prev.filter(p => p.id !== id));
    
    if (activeProjectId === id) {
      setActiveProjectId(null);
      setCurrentView('projects');
    }
    
    try {
      await api.deleteProject(id);
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (err) {
      // Rollback on error
      setProjects(previousProjects);
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  }, [projects, activeProjectId]);

  const handleUpdateIndicator = useCallback(async (id: string, data: Partial<Indicator>) => {
    // Optimistic update
    setProjects(prev => prev.map(p => ({
      ...p,
      indicators: p.indicators.map(i => i.id === id ? { ...i, ...data } : i)
    })));
    
    try {
      await api.updateIndicator(id, data);
    } catch (err) {
      // Rollback on error
      await loadProjects();
      setError(err instanceof Error ? err.message : 'Failed to update indicator');
    }
  }, []);

  const handleQuickLog = useCallback(async (id: string) => {
    // Optimistic update
    setProjects(prev => prev.map(p => ({
      ...p,
      indicators: p.indicators.map(i => 
        i.id === id 
          ? { ...i, status: 'Compliant' as const, lastUpdated: new Date().toISOString() } 
          : i
      )
    })));
    
    try {
      await api.quickLogIndicator(id);
    } catch (err) {
      await loadProjects();
      setError(err instanceof Error ? err.message : 'Failed to log indicator');
    }
  }, []);

  const handleAddEvidence = useCallback(async (data: CreateEvidenceData) => {
    try {
      const newEvidence = await api.createEvidence(data);
      setProjects(prev => prev.map(p => ({
        ...p,
        indicators: p.indicators.map(i => 
          i.id === data.indicator 
            ? { ...i, evidence: [...i.evidence, newEvidence] } 
            : i
        )
      })));
      setShowEvidenceModal(false);
      setSelectedIndicatorId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add evidence');
    }
  }, []);

  const handleDeleteEvidence = useCallback(async (evidenceId: string) => {
    // Optimistic update
    setProjects(prev => prev.map(p => ({
      ...p,
      indicators: p.indicators.map(i => ({
        ...i,
        evidence: i.evidence.filter(e => e.id !== evidenceId)
      }))
    })));
    
    try {
      await api.deleteEvidence(evidenceId);
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (err) {
      await loadProjects();
      setError(err instanceof Error ? err.message : 'Failed to delete evidence');
    }
  }, []);

  const handleOpenEvidenceModal = useCallback((indicatorId: string) => {
    setSelectedIndicatorId(indicatorId);
    setShowEvidenceModal(true);
  }, []);

  const handleSelectProject = useCallback((projectId: string | null) => {
    setActiveProjectId(projectId);
    if (projectId) {
      setCurrentView('dashboard');
    } else {
      setCurrentView('projects');
    }
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    
    if (deleteTarget.type === 'project') {
      handleDeleteProject(deleteTarget.id);
    } else if (deleteTarget.type === 'evidence') {
      handleDeleteEvidence(deleteTarget.id);
    }
  }, [deleteTarget, handleDeleteProject, handleDeleteEvidence]);

  // Render the current view
  const renderView = () => {
    if (isLoading && projects.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    switch (currentView) {
      case 'projects':
        return (
          <ProjectHub
            projects={projects}
            onSelectProject={handleSelectProject}
            onAddProject={() => setShowAddProjectModal(true)}
            onEditProject={(id) => {
              setActiveProjectId(id);
              setShowEditProjectModal(true);
            }}
            onDeleteProject={(id) => {
              setDeleteTarget({ type: 'project', id });
              setShowDeleteModal(true);
            }}
          />
        );
      
      case 'dashboard':
        return activeProject ? (
          <Dashboard
            project={activeProject}
            stats={stats}
          />
        ) : null;
      
      case 'checklist':
        return activeProject ? (
          <Checklist
            indicators={activeIndicators}
            onUpdateIndicator={handleUpdateIndicator}
            onQuickLog={handleQuickLog}
            onAddEvidence={handleOpenEvidenceModal}
            onDeleteEvidence={(id) => {
              setDeleteTarget({ type: 'evidence', id });
              setShowDeleteModal(true);
            }}
          />
        ) : null;
      
      case 'upcoming':
        return activeProject ? (
          <UpcomingTasks
            indicators={activeIndicators}
            onQuickLog={handleQuickLog}
            onAddEvidence={handleOpenEvidenceModal}
          />
        ) : null;
      
      case 'analysis':
        return activeProject ? (
          <AIAnalysis
            indicators={activeIndicators}
            onUpdateIndicator={handleUpdateIndicator}
          />
        ) : null;
      
      case 'library':
        return activeProject ? (
          <DocumentLibrary
            indicators={activeIndicators}
            onDeleteEvidence={(id) => {
              setDeleteTarget({ type: 'evidence', id });
              setShowDeleteModal(true);
            }}
          />
        ) : null;
      
      case 'ai':
        return (
          <AIAssistant
            indicators={activeIndicators}
          />
        );
      
      case 'reports':
        return activeProject ? (
          <Reports
            project={activeProject}
            stats={stats}
          />
        ) : null;
      
      case 'converter':
        return (
          <Converter
            onImportProject={handleSaveProject}
          />
        );
      
      default:
        return null;
    }
  };

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onChangeView={setCurrentView}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        isProjectActive={!!activeProjectId}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={logout}
        user={user}
      />
      
      {/* Main content */}
      <main className={`flex-1 overflow-auto transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 rounded-r-lg animate-fade-in">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </div>
        )}
        
        {/* View Content */}
        <div className="p-6">
          {renderView()}
        </div>
      </main>

      {/* Modals */}
      {showAddProjectModal && (
        <AddProjectModal
          onClose={() => setShowAddProjectModal(false)}
          onSave={handleSaveProject}
        />
      )}
      
      {showEditProjectModal && activeProject && (
        <EditProjectModal
          project={activeProject}
          onClose={() => setShowEditProjectModal(false)}
          onSave={(data) => handleUpdateProject(activeProject.id, data)}
          onDelete={() => {
            setShowEditProjectModal(false);
            setDeleteTarget({ type: 'project', id: activeProject.id });
            setShowDeleteModal(true);
          }}
        />
      )}
      
      {showEvidenceModal && selectedIndicatorId && (
        <EvidenceModal
          indicatorId={selectedIndicatorId}
          indicator={activeIndicators.find(i => i.id === selectedIndicatorId) || null}
          onClose={() => {
            setShowEvidenceModal(false);
            setSelectedIndicatorId(null);
          }}
          onSave={handleAddEvidence}
        />
      )}
      
      {showDeleteModal && deleteTarget && (
        <DeleteConfirmationModal
          type={deleteTarget.type}
          onClose={() => {
            setShowDeleteModal(false);
            setDeleteTarget(null);
          }}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

export default App;
