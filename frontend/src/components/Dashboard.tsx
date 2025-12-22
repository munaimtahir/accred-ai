import { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  FileText
} from 'lucide-react';
import { Project, ComplianceStats, SectionStats } from '../types';

interface DashboardProps {
  project: Project;
  stats: ComplianceStats;
}

const STATUS_COLORS = {
  'Compliant': '#22c55e',
  'Non-Compliant': '#ef4444',
  'In Progress': '#f59e0b',
  'Not Started': '#94a3b8',
  'Not Applicable': '#6b7280',
};

const FREQUENCY_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

export default function Dashboard({ project, stats }: DashboardProps) {
  // Calculate section stats
  const sectionStats = useMemo((): SectionStats[] => {
    const sections = new Map<string, { total: number; compliant: number }>();
    
    project.indicators.forEach(ind => {
      const current = sections.get(ind.section) || { total: 0, compliant: 0 };
      current.total++;
      if (ind.status === 'Compliant') current.compliant++;
      sections.set(ind.section, current);
    });

    return Array.from(sections.entries()).map(([name, data]) => ({
      name,
      total: data.total,
      compliant: data.compliant,
      percentage: Math.round((data.compliant / data.total) * 100),
    }));
  }, [project.indicators]);

  // Calculate frequency distribution
  const frequencyStats = useMemo(() => {
    const freq = new Map<string, number>();
    project.indicators.forEach(ind => {
      if (ind.frequency) {
        freq.set(ind.frequency, (freq.get(ind.frequency) || 0) + 1);
      }
    });
    return Array.from(freq.entries()).map(([name, count]) => ({ name, count }));
  }, [project.indicators]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => [
    { name: 'Compliant', value: stats.compliant, color: STATUS_COLORS['Compliant'] },
    { name: 'Non-Compliant', value: stats.nonCompliant, color: STATUS_COLORS['Non-Compliant'] },
    { name: 'In Progress', value: stats.inProgress, color: STATUS_COLORS['In Progress'] },
    { name: 'Not Started', value: stats.notStarted, color: STATUS_COLORS['Not Started'] },
  ].filter(item => item.value > 0), [stats]);

  // Recent activity (indicators with recent lastUpdated)
  const recentActivity = useMemo(() => {
    return project.indicators
      .filter(ind => ind.lastUpdated)
      .sort((a, b) => new Date(b.lastUpdated!).getTime() - new Date(a.lastUpdated!).getTime())
      .slice(0, 5);
  }, [project.indicators]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
        <p className="text-slate-500 mt-1">{project.description || 'Compliance Dashboard'}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Indicators"
          value={stats.total}
          icon={<FileText className="text-indigo-600" />}
          color="indigo"
        />
        <StatCard
          title="Compliant"
          value={stats.compliant}
          subtitle={`${stats.compliancePercentage}%`}
          icon={<CheckCircle2 className="text-green-600" />}
          color="green"
        />
        <StatCard
          title="Non-Compliant"
          value={stats.nonCompliant}
          icon={<XCircle className="text-red-600" />}
          color="red"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={<Clock className="text-amber-600" />}
          color="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section Readiness Bar Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Section Readiness</h3>
          <div className="h-64">
            {sectionStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectionStats} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Compliance']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar 
                    dataKey="percentage" 
                    fill="#6366f1" 
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Status Distribution</h3>
          <div className="h-64">
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Frequency Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Task Frequency</h3>
          <div className="h-64">
            {frequencyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={frequencyStats}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {frequencyStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={FREQUENCY_COLORS[index % FREQUENCY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                No recurring tasks
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((ind) => (
                <div key={ind.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    ind.status === 'Compliant' ? 'bg-green-500' :
                    ind.status === 'Non-Compliant' ? 'bg-red-500' :
                    ind.status === 'In Progress' ? 'bg-amber-500' : 'bg-slate-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{ind.indicator}</p>
                    <p className="text-xs text-slate-500">{ind.section}</p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {ind.lastUpdated && new Date(ind.lastUpdated).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <AlertCircle size={32} className="mb-2" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compliance Score */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold opacity-90">Overall Compliance Score</h3>
            <p className="text-sm opacity-75 mt-1">Based on {stats.total} indicators</p>
          </div>
          <div className="flex items-center gap-3">
            <TrendingUp size={32} className="opacity-75" />
            <span className="text-5xl font-bold">{stats.compliancePercentage}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'indigo' | 'green' | 'red' | 'amber';
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  const bgColors = {
    indigo: 'bg-indigo-50',
    green: 'bg-green-50',
    red: 'bg-red-50',
    amber: 'bg-amber-50',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">{value}</span>
            {subtitle && <span className="text-sm text-slate-500">{subtitle}</span>}
          </div>
        </div>
        <div className={`w-12 h-12 ${bgColors[color]} rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
