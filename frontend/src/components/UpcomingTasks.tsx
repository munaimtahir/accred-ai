import { useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  Plus,
  ChevronRight
} from 'lucide-react';
import { Indicator, Frequency } from '../types';

interface UpcomingTasksProps {
  indicators: Indicator[];
  onQuickLog: (id: string) => void;
  onAddEvidence: (indicatorId: string) => void;
}

interface TaskGroup {
  title: string;
  tasks: Indicator[];
  urgent?: boolean;
}

export default function UpcomingTasks({
  indicators,
  onQuickLog,
  onAddEvidence,
}: UpcomingTasksProps) {
  // Group tasks by urgency/frequency
  const taskGroups = useMemo((): TaskGroup[] => {
    const now = new Date();
    const recurringIndicators = indicators.filter(i => i.frequency && i.frequency !== 'One-time');
    
    const isOverdue = (ind: Indicator) => {
      if (!ind.lastUpdated) return true;
      const lastUpdate = new Date(ind.lastUpdated);
      const daysSince = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (ind.frequency) {
        case 'Daily': return daysSince >= 1;
        case 'Weekly': return daysSince >= 7;
        case 'Monthly': return daysSince >= 30;
        case 'Quarterly': return daysSince >= 90;
        case 'Annually': return daysSince >= 365;
        default: return false;
      }
    };

    const isDueToday = (ind: Indicator) => {
      if (!ind.lastUpdated) return false;
      const lastUpdate = new Date(ind.lastUpdated);
      const daysSince = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (ind.frequency) {
        case 'Daily': return daysSince === 0;
        case 'Weekly': return daysSince >= 6 && daysSince < 7;
        case 'Monthly': return daysSince >= 29 && daysSince < 30;
        default: return false;
      }
    };

    const groups: TaskGroup[] = [];
    
    // Overdue tasks
    const overdue = recurringIndicators.filter(i => isOverdue(i) && i.status !== 'Compliant');
    if (overdue.length > 0) {
      groups.push({ title: 'Overdue', tasks: overdue, urgent: true });
    }
    
    // Due today
    const dueToday = recurringIndicators.filter(i => isDueToday(i) && i.status !== 'Compliant');
    if (dueToday.length > 0) {
      groups.push({ title: 'Due Today', tasks: dueToday });
    }
    
    // Group by frequency
    const frequencies: Frequency[] = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually'];
    frequencies.forEach(freq => {
      const tasks = recurringIndicators.filter(i => i.frequency === freq && !isOverdue(i));
      if (tasks.length > 0) {
        groups.push({ title: freq, tasks });
      }
    });
    
    return groups;
  }, [indicators]);

  const totalRecurring = indicators.filter(i => i.frequency && i.frequency !== 'One-time').length;
  const totalOverdue = taskGroups.find(g => g.title === 'Overdue')?.tasks.length || 0;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Upcoming Tasks</h1>
          <p className="text-slate-500 mt-1">
            {totalRecurring} recurring tasks
            {totalOverdue > 0 && (
              <span className="text-red-600 ml-2">
                • {totalOverdue} overdue
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Daily Tasks"
          count={indicators.filter(i => i.frequency === 'Daily').length}
          icon={<Clock className="text-blue-600" />}
          color="blue"
        />
        <SummaryCard
          title="Weekly Tasks"
          count={indicators.filter(i => i.frequency === 'Weekly').length}
          icon={<Calendar className="text-purple-600" />}
          color="purple"
        />
        <SummaryCard
          title="Monthly Tasks"
          count={indicators.filter(i => i.frequency === 'Monthly').length}
          icon={<Calendar className="text-green-600" />}
          color="green"
        />
        <SummaryCard
          title="Overdue"
          count={totalOverdue}
          icon={<AlertTriangle className="text-red-600" />}
          color="red"
        />
      </div>

      {/* Task Groups */}
      {taskGroups.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">All caught up!</h3>
          <p className="text-slate-500">No recurring tasks need attention right now</p>
        </div>
      ) : (
        <div className="space-y-6">
          {taskGroups.map((group) => (
            <div key={group.title} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {/* Group Header */}
              <div className={`px-6 py-4 border-b ${
                group.urgent ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  {group.urgent && <AlertTriangle size={20} className="text-red-600" />}
                  <h3 className={`font-semibold ${group.urgent ? 'text-red-900' : 'text-slate-900'}`}>
                    {group.title}
                  </h3>
                  <span className={`text-sm ${group.urgent ? 'text-red-600' : 'text-slate-500'}`}>
                    ({group.tasks.length} tasks)
                  </span>
                </div>
              </div>
              
              {/* Tasks */}
              <div className="divide-y divide-slate-100">
                {group.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onQuickLog={onQuickLog}
                    onAddEvidence={onAddEvidence}
                    urgent={group.urgent}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: 'blue' | 'purple' | 'green' | 'red';
}

function SummaryCard({ title, count, icon, color }: SummaryCardProps) {
  const bgColors = {
    blue: 'bg-blue-50',
    purple: 'bg-purple-50',
    green: 'bg-green-50',
    red: 'bg-red-50',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{count}</p>
        </div>
        <div className={`w-10 h-10 ${bgColors[color]} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Indicator;
  onQuickLog: (id: string) => void;
  onAddEvidence: (indicatorId: string) => void;
  urgent?: boolean;
}

function TaskCard({ task, onQuickLog, onAddEvidence, urgent }: TaskCardProps) {
  const hasRecentEvidence = task.evidence.some(e => {
    const uploadDate = new Date(e.dateUploaded);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince < 1;
  });

  const getLastUpdateText = () => {
    if (!task.lastUpdated) return 'Never updated';
    const date = new Date(task.lastUpdated);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince === 0) return 'Updated today';
    if (daysSince === 1) return 'Updated yesterday';
    return `Updated ${daysSince} days ago`;
  };

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
      <div className={`w-3 h-3 rounded-full ${
        urgent ? 'bg-red-500' : 
        task.status === 'Compliant' ? 'bg-green-500' :
        'bg-amber-500'
      }`} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
            {task.standard}
          </span>
          <span className="text-xs text-slate-500">{task.section}</span>
        </div>
        <h4 className="font-medium text-slate-900 truncate">{task.indicator}</h4>
        <p className="text-sm text-slate-500 mt-1">{getLastUpdateText()}</p>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAddEvidence(task.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
        >
          <Plus size={14} />
          Log Evidence
        </button>
        
        <button
          onClick={() => onQuickLog(task.id)}
          disabled={!hasRecentEvidence && task.evidence.length === 0}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            hasRecentEvidence || task.evidence.length > 0
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          <CheckCircle2 size={14} />
          Mark Complete
        </button>
        
        <ChevronRight size={18} className="text-slate-300" />
      </div>
    </div>
  );
}
