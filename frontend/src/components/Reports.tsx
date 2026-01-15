import { useState, useCallback } from 'react';
import { 
  FileText, 
  Download, 
  Printer,
  Loader2,
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Project, ComplianceStats } from '../types';
import { api } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  project: Project;
  stats: ComplianceStats;
}

export default function Reports({ project, stats }: ReportsProps) {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleGenerateSummary = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const summary = await api.generateReportSummary(project.indicators);
      setAiSummary(summary);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setError(errorMsg.includes('Sign in required for AI features')
        ? 'Sign in required for AI features'
        : 'Failed to generate summary');
    } finally {
      setIsGenerating(false);
    }
  }, [project.indicators]);

  const handleExportPDF = useCallback(() => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(51, 51, 51);
    doc.text('Compliance Report', pageWidth / 2, 20, { align: 'center' });
    
    // Project name
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text(project.name, pageWidth / 2, 30, { align: 'center' });
    
    // Date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 38, { align: 'center' });
    
    // Summary stats
    doc.setFontSize(12);
    doc.setTextColor(51, 51, 51);
    doc.text('Summary', 14, 50);
    
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const summaryY = 58;
    doc.text(`Total Indicators: ${stats.total}`, 14, summaryY);
    doc.text(`Compliant: ${stats.compliant} (${stats.compliancePercentage}%)`, 14, summaryY + 6);
    doc.text(`Non-Compliant: ${stats.nonCompliant}`, 14, summaryY + 12);
    doc.text(`In Progress: ${stats.inProgress}`, 14, summaryY + 18);
    doc.text(`Not Started: ${stats.notStarted}`, 14, summaryY + 24);
    
    // AI Summary if available
    let tableStartY = summaryY + 40;
    if (aiSummary) {
      doc.setFontSize(12);
      doc.setTextColor(51, 51, 51);
      doc.text('AI Analysis', 14, summaryY + 36);
      
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const summaryLines = doc.splitTextToSize(aiSummary, pageWidth - 28);
      doc.text(summaryLines, 14, summaryY + 44);
      tableStartY = summaryY + 44 + (summaryLines.length * 5) + 10;
    }
    
    // Indicators table
    const tableData = project.indicators.map(ind => [
      ind.section,
      ind.standard,
      ind.indicator.substring(0, 50) + (ind.indicator.length > 50 ? '...' : ''),
      ind.status,
      ind.score.toString(),
      ind.lastUpdated ? new Date(ind.lastUpdated).toLocaleDateString() : 'N/A'
    ]);
    
    autoTable(doc, {
      head: [['Section', 'Standard', 'Indicator', 'Status', 'Score', 'Last Updated']],
      body: tableData,
      startY: tableStartY,
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 25 },
        2: { cellWidth: 60 },
        3: { cellWidth: 25 },
        4: { cellWidth: 15 },
        5: { cellWidth: 25 }
      }
    });
    
    // Save
    doc.save(`${project.name.replace(/\s+/g, '_')}_Compliance_Report.pdf`);
  }, [project, stats, aiSummary]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Compliant': return <CheckCircle2 size={16} className="text-green-600" />;
      case 'Non-Compliant': return <XCircle size={16} className="text-red-600" />;
      case 'In Progress': return <Clock size={16} className="text-amber-600" />;
      default: return <AlertCircle size={16} className="text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Compliant': return 'bg-green-100 text-green-700';
      case 'Non-Compliant': return 'bg-red-100 text-red-700';
      case 'In Progress': return 'bg-amber-100 text-amber-700';
      case 'Not Started': return 'bg-slate-100 text-slate-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance Report</h1>
          <p className="text-slate-500 mt-1">{project.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateSummary}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Bot size={18} />
            )}
            Generate AI Summary
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download size={18} />
            Export PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Printer size={18} />
            Print
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Report Content */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 print:p-0 print:border-0">
        {/* Report Header */}
        <div className="text-center mb-8 pb-6 border-b border-slate-200">
          <FileText className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900">{project.name}</h2>
          <p className="text-slate-500 mt-2">{project.description}</p>
          <p className="text-sm text-slate-400 mt-2">
            Generated on {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatBox label="Total" value={stats.total} color="slate" />
          <StatBox label="Compliant" value={stats.compliant} color="green" />
          <StatBox label="Non-Compliant" value={stats.nonCompliant} color="red" />
          <StatBox label="In Progress" value={stats.inProgress} color="amber" />
          <StatBox label="Not Started" value={stats.notStarted} color="slate" />
        </div>

        {/* Compliance Score */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold opacity-90">Overall Compliance Score</h3>
              <p className="text-sm opacity-75 mt-1">Based on {stats.total} indicators</p>
            </div>
            <span className="text-5xl font-bold">{stats.compliancePercentage}%</span>
          </div>
        </div>

        {/* AI Summary */}
        {aiSummary && (
          <div className="bg-indigo-50 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="text-indigo-600" />
              <h3 className="font-semibold text-indigo-900">AI Analysis Summary</h3>
            </div>
            <p className="text-indigo-800 whitespace-pre-wrap">{aiSummary}</p>
          </div>
        )}

        {/* Indicators Table */}
        <div>
          <h3 className="font-semibold text-slate-900 mb-4">Detailed Indicator Log</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Section</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Standard</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Indicator</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Score</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {project.indicators.map((indicator) => (
                  <tr key={indicator.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{indicator.section}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-indigo-600">{indicator.standard}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-900">{indicator.indicator}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(indicator.status)}`}>
                        {getStatusIcon(indicator.status)}
                        {indicator.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{indicator.score}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {indicator.lastUpdated 
                        ? new Date(indicator.lastUpdated).toLocaleDateString() 
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatBoxProps {
  label: string;
  value: number;
  color: 'slate' | 'green' | 'red' | 'amber';
}

function StatBox({ label, value, color }: StatBoxProps) {
  const colors = {
    slate: 'bg-slate-50 text-slate-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className={`${colors[color]} rounded-lg p-4 text-center`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm mt-1">{label}</p>
    </div>
  );
}
