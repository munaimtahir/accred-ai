import { useState, useCallback } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Import
} from 'lucide-react';
import { CreateProjectData, Indicator } from '../types';
import { api } from '../services/api';

interface ConverterProps {
  onImportProject: (data: CreateProjectData) => void;
}

export default function Converter({ onImportProject }: ConverterProps) {
  const [documentText, setDocumentText] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    try {
      const text = await file.text();
      setDocumentText(text);
    } catch (err) {
      setError('Failed to read file. Please try a different format.');
    }
  }, []);

  const handleConvert = useCallback(async () => {
    if (!documentText.trim()) return;

    setIsConverting(true);
    setError(null);

    try {
      const csv = await api.convertDocument(documentText);
      setCsvContent(csv);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg.includes('Sign in required for AI features')
        ? 'Sign in required for AI features'
        : errorMsg);
    } finally {
      setIsConverting(false);
    }
  }, [documentText]);

  const handleDownloadCSV = useCallback(() => {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compliance_checklist.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [csvContent]);

  const handleImportToProject = useCallback(() => {
    if (!csvContent || !projectName.trim()) return;

    // Parse CSV
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const indicators: Partial<Indicator>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const indicator: Partial<Indicator> = {
        section: values[headers.indexOf('section')] || 'General',
        standard: values[headers.indexOf('standard')] || `STD-${i}`,
        indicator: values[headers.indexOf('indicator')] || `Indicator ${i}`,
        description: values[headers.indexOf('description')] || '',
        score: parseInt(values[headers.indexOf('score')]) || 10,
        frequency: (values[headers.indexOf('frequency')] as any) || 'One-time',
        status: 'Not Started',
      };
      indicators.push(indicator);
    }

    onImportProject({
      name: projectName,
      description: `Imported from ${fileName || 'document'}`,
      indicators,
    });
  }, [csvContent, projectName, fileName, onImportProject]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Document Converter</h1>
        <p className="text-slate-500 mt-1">
          Convert compliance documents to structured CSV format
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText size={20} />
            Source Document
          </h3>

          {/* File Upload */}
          <div className="mb-4">
            <label className="block">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors cursor-pointer">
                <Upload size={32} className="mx-auto text-slate-400 mb-3" />
                <p className="text-sm text-slate-600 mb-1">
                  {fileName ? fileName : 'Drop a file or click to upload'}
                </p>
                <p className="text-xs text-slate-400">
                  Supports TXT, PDF text content, DOCX text content
                </p>
              </div>
              <input
                type="file"
                accept=".txt,.csv,.md"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Or paste text */}
          <div className="relative">
            <div className="absolute -top-3 left-4 bg-white px-2 text-xs text-slate-400">
              Or paste document text
            </div>
            <textarea
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              placeholder="Paste your compliance document content here..."
              rows={12}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Convert Button */}
          <button
            onClick={handleConvert}
            disabled={!documentText.trim() || isConverting}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConverting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Converting...
              </>
            ) : (
              <>
                <FileSpreadsheet size={20} />
                Convert to CSV
              </>
            )}
          </button>
        </div>

        {/* Output Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileSpreadsheet size={20} />
            CSV Output
          </h3>

          {csvContent ? (
            <>
              {/* Success indicator */}
              <div className="flex items-center gap-2 text-green-600 mb-4">
                <CheckCircle2 size={18} />
                <span className="text-sm font-medium">Conversion complete!</span>
              </div>

              {/* CSV Preview */}
              <div className="bg-slate-50 rounded-lg p-4 mb-4 max-h-64 overflow-auto">
                <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono">
                  {csvContent}
                </pre>
              </div>

              {/* Actions */}
              <div className="space-y-4">
                <button
                  onClick={handleDownloadCSV}
                  className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  <Download size={20} />
                  Download CSV
                </button>

                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">
                    Import as New Project
                  </h4>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name..."
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleImportToProject}
                    disabled={!projectName.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Import size={20} />
                    Import to Project
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <FileSpreadsheet size={48} className="mb-4 opacity-50" />
              <p className="text-sm">CSV output will appear here</p>
              <p className="text-xs mt-1">Upload or paste a document to convert</p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-slate-50 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-3">How it works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-indigo-600">1</span>
            </div>
            <div>
              <p className="font-medium text-slate-900">Upload Document</p>
              <p className="text-sm text-slate-600">Upload or paste your compliance document text</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-indigo-600">2</span>
            </div>
            <div>
              <p className="font-medium text-slate-900">AI Processing</p>
              <p className="text-sm text-slate-600">AI analyzes and extracts compliance indicators</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-indigo-600">3</span>
            </div>
            <div>
              <p className="font-medium text-slate-900">Import or Download</p>
              <p className="text-sm text-slate-600">Create a new project or download the CSV</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
