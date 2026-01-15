import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Project } from '../../types';
import { readOfflineData, markImportDone, markImportSuppressed, clearOfflineData } from '../../offline/offlineStore';
import { api } from '../../services/api';

interface ImportOfflineDataModalProps {
  onClose: () => void;
  onImportComplete?: () => void;
}

export default function ImportOfflineDataModal({ 
  onClose, 
  onImportComplete 
}: ImportOfflineDataModalProps) {
  const [offlineProjects, setOfflineProjects] = useState<Project[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<{
    success: string[];
    failed: Array<{ id: string; name: string; error: string }>;
  } | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

  // Load offline projects on mount
  useEffect(() => {
    const data = readOfflineData();
    if (data?.projects) {
      setOfflineProjects(data.projects);
      // Pre-select all projects by default
      setSelectedProjectIds(new Set(data.projects.map(p => p.id)));
    }
  }, []);

  const handleToggleProject = (projectId: string) => {
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedProjectIds.size === offlineProjects.length) {
      setSelectedProjectIds(new Set());
    } else {
      setSelectedProjectIds(new Set(offlineProjects.map(p => p.id)));
    }
  };

  const handleImport = async () => {
    if (selectedProjectIds.size === 0) {
      setError('Please select at least one project to import');
      return;
    }

    setIsImporting(true);
    setError(null);
    setImportResults(null);
    setImportProgress(null);

    const projectsToImport = offlineProjects.filter(p => selectedProjectIds.has(p.id));
    const success: string[] = [];
    const failed: Array<{ id: string; name: string; error: string }> = [];

    try {
      // Import each project sequentially to avoid overwhelming the backend
      for (let i = 0; i < projectsToImport.length; i++) {
        const project = projectsToImport[i];
        // Update progress (UI-only feedback)
        setImportProgress({ current: i + 1, total: projectsToImport.length });
        
        try {
          // Create project via backend API
          // Only import project name, description, and indicators (not evidence in Phase 3A)
          const createData = {
            name: project.name,
            description: project.description || '',
            indicators: project.indicators?.map(ind => ({
              section: ind.section,
              standard: ind.standard,
              indicator: ind.indicator,
              description: ind.description,
              score: ind.score,
              frequency: ind.frequency,
              status: ind.status,
              // Note: evidence is not imported in Phase 3A as per requirements
            })) || [],
          };

          const createdProject = await api.createProject(createData);
          success.push(createdProject.id);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          failed.push({
            id: project.id,
            name: project.name,
            error: errorMessage,
          });
        }
      }
      
      // Clear progress indicator
      setImportProgress(null);

      setImportResults({ success, failed });

      // If at least one project imported successfully, mark import as done
      if (success.length > 0) {
        if (dontAskAgain) {
          markImportSuppressed();
        } else {
          markImportDone(success);
        }

        // Remove imported projects from offline store
        const remainingProjects = offlineProjects.filter(
          p => !selectedProjectIds.has(p.id) || failed.some(f => f.id === p.id)
        );
        
        if (remainingProjects.length === 0) {
          // All projects imported or failed, clear offline data
          clearOfflineData();
        } else {
          // Update offline data with remaining projects
          const data = readOfflineData();
          if (data) {
            data.projects = remainingProjects;
            localStorage.setItem('accredify_data', JSON.stringify(data));
          }
        }

        // Call completion callback if provided
        if (onImportComplete) {
          onImportComplete();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import projects');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSkip = () => {
    if (dontAskAgain) {
      markImportSuppressed();
    }
    onClose();
  };

  const handleDeleteOfflineData = () => {
    clearOfflineData();
    markImportSuppressed(); // Also suppress future prompts
    onClose();
  };

  const handleRetry = () => {
    setImportResults(null);
    setError(null);
    setImportProgress(null);
    // Retry import with failed projects
    if (importResults?.failed && importResults.failed.length > 0) {
      const failedIds = new Set(importResults.failed.map(f => f.id));
      setSelectedProjectIds(failedIds);
      handleImport();
    }
  };

  const projectCount = offlineProjects.length;
  const selectedCount = selectedProjectIds.size;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-slate-900">Import Offline Demo Data?</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {importResults ? (
            // Import Results View
            <div className="space-y-4">
              {importResults.success.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">
                        Successfully imported {importResults.success.length} project{importResults.success.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {importResults.failed.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900 mb-2">
                        {importResults.failed.length} project{importResults.failed.length !== 1 ? 's' : ''} failed to import
                      </p>
                      <div className="space-y-2">
                        {importResults.failed.map(f => (
                          <div key={f.id} className="text-sm text-red-700">
                            <span className="font-medium">{f.name}:</span> {f.error}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={handleRetry}
                        className="mt-3 text-sm text-red-700 hover:text-red-900 font-medium underline"
                      >
                        Retry failed imports
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {importResults.failed.length === 0 && (
                <p className="text-sm text-slate-600">
                  All selected projects have been imported successfully. You can now access them in your account.
                </p>
              )}
            </div>
          ) : (
            // Project Selection View
            <>
              <p className="text-slate-600 mb-4">
                We found <strong>{projectCount}</strong> offline project{projectCount !== 1 ? 's' : ''} created in demo mode.
                Select which projects you'd like to import into your account.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Project List */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <label className={`flex items-center gap-2 ${isImporting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={selectedProjectIds.size === offlineProjects.length && offlineProjects.length > 0}
                      onChange={handleSelectAll}
                      disabled={isImporting}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Select All ({selectedCount} of {projectCount} selected)
                    </span>
                  </label>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {offlineProjects.map(project => (
                    <label
                      key={project.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0 ${
                        isImporting ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedProjectIds.has(project.id)}
                        onChange={() => handleToggleProject(project.id)}
                        disabled={isImporting}
                        className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{project.name}</p>
                        {project.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{project.description}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {project.indicators?.length || 0} indicator{project.indicators?.length !== 1 ? 's' : ''}
                          {project.createdAt && (
                            <> • Created {new Date(project.createdAt).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Don't ask again checkbox */}
              <div className="mt-4">
                <label className={`flex items-start gap-2 ${isImporting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={dontAskAgain}
                    onChange={(e) => setDontAskAgain(e.target.checked)}
                    disabled={isImporting}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <span className="text-sm text-slate-700">Don't ask again</span>
                    <p className="text-xs text-slate-500 mt-1">
                      If checked, AccrediFy will not ask again about offline demo data on future logins.
                    </p>
                  </div>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex-shrink-0">
          {importResults ? (
            <>
              {importResults.failed.length === 0 ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Go to Projects
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Done
                </button>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={handleDeleteOfflineData}
                  disabled={isImporting}
                  className="px-4 py-2 text-red-600 hover:text-red-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  Permanently Delete Offline Demo Data
                </button>
                <p className="text-xs text-red-600 mt-1">This cannot be undone.</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isImporting}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Skip for Now
                </button>
                <button
                  onClick={handleImport}
                  disabled={selectedCount === 0 || isImporting}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting && <Loader2 className="animate-spin" size={18} />}
                  Import Selected Projects ({selectedCount})
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
