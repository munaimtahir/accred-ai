import { useState, useCallback } from 'react';
import { X, Trash2, Loader2 } from 'lucide-react';
import { Project } from '../../types';

interface EditProjectModalProps {
  project: Project;
  onClose: () => void;
  onSave: (data: Partial<Project>) => void;
  onDelete: () => void;
}

export default function EditProjectModal({ 
  project, 
  onClose, 
  onSave, 
  onDelete 
}: EditProjectModalProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
      });
    } finally {
      setIsLoading(false);
    }
  }, [name, description, onSave]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Edit Project</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., ISO 15189 Accreditation 2024"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the compliance project..."
              rows={3}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Project Stats */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Project Statistics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Total Indicators:</span>
                <span className="ml-2 font-medium text-slate-900">{project.indicators.length}</span>
              </div>
              <div>
                <span className="text-slate-500">Compliant:</span>
                <span className="ml-2 font-medium text-green-600">
                  {project.indicators.filter(i => i.status === 'Compliant').length}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Created:</span>
                <span className="ml-2 font-medium text-slate-900">
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Evidence Files:</span>
                <span className="ml-2 font-medium text-slate-900">
                  {project.indicators.reduce((sum, i) => sum + i.evidence.length, 0)}
                </span>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
          >
            <Trash2 size={18} />
            Delete Project
          </button>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="animate-spin" size={18} />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
