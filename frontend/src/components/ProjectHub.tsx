import { useState } from 'react';
import { Plus, MoreVertical, FolderOpen, Edit, Trash2 } from 'lucide-react';
import { Project } from '../types';

interface ProjectHubProps {
  projects: Project[];
  onSelectProject: (id: string) => void;
  onAddProject: () => void;
  onEditProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

export default function ProjectHub({
  projects,
  onSelectProject,
  onAddProject,
  onEditProject,
  onDeleteProject,
}: ProjectHubProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const calculateProgress = (project: Project) => {
    const total = project.indicators.length;
    if (total === 0) return 0;
    const compliant = project.indicators.filter(i => i.status === 'Compliant').length;
    return Math.round((compliant / total) * 100);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 mt-1">Manage your compliance projects</p>
        </div>
        <button
          onClick={onAddProject}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FolderOpen size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No projects yet</h3>
          <p className="text-slate-500 mb-6">Create your first compliance project to get started</p>
          <button
            onClick={onAddProject}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const progress = calculateProgress(project);
            
            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => onSelectProject(project.id)}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                      {project.description || 'No description'}
                    </p>
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === project.id ? null : project.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                    >
                      <MoreVertical size={18} />
                    </button>
                    
                    {menuOpen === project.id && (
                      <div 
                        className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            onEditProject(project.id);
                            setMenuOpen(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            onDeleteProject(project.id);
                            setMenuOpen(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-500">Progress</span>
                    <span className="font-medium text-slate-700">{progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    {project.indicators.length} indicators
                  </span>
                  <span className="text-slate-400">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
