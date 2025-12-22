import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  FolderOpen, 
  MessageSquare, 
  FileText, 
  FileSpreadsheet,
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  Settings
} from 'lucide-react';
import { View, Project } from '../types';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  isProjectActive: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

interface NavItem {
  id: View;
  label: string;
  icon: React.ReactNode;
  requiresProject?: boolean;
}

const navItems: NavItem[] = [
  { id: 'projects', label: 'Projects', icon: <Home size={20} /> },
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, requiresProject: true },
  { id: 'checklist', label: 'Checklist', icon: <CheckSquare size={20} />, requiresProject: true },
  { id: 'upcoming', label: 'Upcoming Tasks', icon: <Calendar size={20} />, requiresProject: true },
  { id: 'analysis', label: 'AI Analysis', icon: <Bot size={20} />, requiresProject: true },
  { id: 'library', label: 'Document Library', icon: <FolderOpen size={20} />, requiresProject: true },
  { id: 'ai', label: 'AI Assistant', icon: <MessageSquare size={20} /> },
  { id: 'reports', label: 'Reports', icon: <FileText size={20} />, requiresProject: true },
  { id: 'converter', label: 'Doc Converter', icon: <FileSpreadsheet size={20} /> },
];

export default function Sidebar({
  currentView,
  onChangeView,
  projects,
  activeProjectId,
  onSelectProject,
  isProjectActive,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <aside 
      className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-50 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Logo/Brand */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <CheckSquare className="text-white" size={24} />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-900">AccrediFy</h1>
                <p className="text-xs text-slate-500">Compliance Platform</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto">
              <CheckSquare className="text-white" size={24} />
            </div>
          )}
          <button
            onClick={onToggleCollapsed}
            className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${collapsed ? 'mx-auto mt-2' : ''}`}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>

      {/* Project Selector */}
      {!collapsed && isProjectActive && (
        <div className="p-4 border-b border-slate-200">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Active Project
          </label>
          <div className="relative mt-2">
            <select
              value={activeProjectId || ''}
              onChange={(e) => onSelectProject(e.target.value || null)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select Project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <ChevronDown 
              size={16} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" 
            />
          </div>
          {activeProject && (
            <p className="text-xs text-slate-500 mt-2 truncate">
              {activeProject.indicators.length} indicators
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const isDisabled = item.requiresProject && !isProjectActive;
          
          return (
            <button
              key={item.id}
              onClick={() => !isDisabled && onChangeView(item.id)}
              disabled={isDisabled}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all
                ${isActive 
                  ? 'bg-indigo-50 text-indigo-600 font-medium' 
                  : isDisabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
                ${collapsed ? 'justify-center px-2' : ''}
              `}
              title={collapsed ? item.label : undefined}
            >
              <span className={isActive ? 'text-indigo-600' : isDisabled ? 'text-slate-300' : 'text-slate-400'}>
                {item.icon}
              </span>
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 text-slate-500">
            <Settings size={18} />
            <span className="text-sm">Settings</span>
          </div>
        )}
        {collapsed && (
          <button className="w-full flex justify-center p-2 text-slate-400 hover:text-slate-600">
            <Settings size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
