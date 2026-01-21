import { useState, useCallback, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { CreateProjectData, Indicator } from '../../types';
import { api } from '../../services/api';

interface AddProjectModalProps {
  onClose: () => void;
  onSave: (data: CreateProjectData) => void;
}

export default function AddProjectModal({ onClose, onSave }: AddProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvIndicators, setCsvIndicators] = useState<Partial<Indicator>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): Partial<Indicator>[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    // Improved header detection
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const indicators: Partial<Indicator>[] = [];

    const getIdx = (names: string[]) => {
      for (const name of names) {
        const idx = headers.indexOf(name.toLowerCase());
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const sectionIdx = getIdx(['section', 'chapter']);
    const standardIdx = getIdx(['standard', 'std']);
    const indicatorIdx = getIdx(['indicator', 'requirement']);
    const evidenceIdx = getIdx(['evidence required', 'evidence', 'description']);
    const scoreIdx = getIdx(['score', 'points']);
    const frequencyIdx = getIdx(['frequency', 'period']);
    const responsibleIdx = getIdx(['responsible person', 'responsible']);
    const assignedIdx = getIdx(['assigned to', 'assignee']);

    for (let i = 1; i < lines.length; i++) {
      // Robust CSV parsing for unquoted commas and quotes
      const row = lines[i];
      if (!row.trim()) continue;

      // Basic support for quoted values, but handle the PHC "Access, Assessment" case specifically
      let values: string[] = [];
      const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (matches) {
        values = matches.map(v => v.replace(/^"|"$/g, '').trim());
      } else {
        values = row.split(',').map(v => v.trim());
      }

      // Fix for "Access, Assessment and Continuity of Care (AAC)" shift if it wasn't quoted
      if (values[sectionIdx] === "Access" && values[standardIdx]?.trim().startsWith("Assessment and Continuity of Care (AAC)")) {
        const fullSection = "Access, Assessment and Continuity of Care (AAC)";
        // Shift values back
        const newValues = [...values];
        newValues[sectionIdx] = fullSection;

        // If the indicator was split into Standard and Indicator columns by mistake
        // because of the extra comma, we might need to merge them.
        // But let's keep it simple: just merge the first two into Section.
        // Actually, the common case is that subsequent columns stay at their indices?
        // No, if "Access, Assessment..." is two columns, then everything after is shifted by 1.

        // Let's remove the second part of section and shift the rest left.
        newValues.splice(sectionIdx + 1, 1);
        values = newValues;
      }

      const indicator: Partial<Indicator> = {
        section: values[sectionIdx] || 'General',
        standard: values[standardIdx] || `STD-${i}`,
        indicator: values[indicatorIdx] || `Indicator ${i}`,
        description: values[evidenceIdx] || '',
        score: parseInt(values[scoreIdx]) || 10,
        frequency: (values[frequencyIdx] as any) || 'One-time',
        responsible_person: values[responsibleIdx] || '',
        assignee: values[assignedIdx] || '',
        status: 'Not Started',
      };

      if (indicator.indicator) {
        indicators.push(indicator);
      }
    }

    return indicators;
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setIsAnalyzing(true);

    try {
      const text = await file.text();
      const indicators = parseCSV(text);

      // Optionally enrich with AI
      const enrichedIndicators = await api.analyzeChecklist(indicators);
      setCsvIndicators(enrichedIndicators);
    } catch (error) {
      console.error('Failed to parse CSV:', error);
      setCsvIndicators([]);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        indicators: csvIndicators,
      });
    } finally {
      setIsLoading(false);
    }
  }, [name, description, csvIndicators, onSave]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Create New Project</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Banner */}
          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <span className="text-amber-600 text-sm flex-shrink-0 mt-0.5">ℹ️</span>
              <p className="text-sm text-amber-700 flex-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-amber-600 hover:text-amber-800 flex-shrink-0"
              >
                ×
              </button>
            </div>
          )}
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

          {/* CSV Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Upload Checklist (CSV)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors cursor-pointer"
            >
              {csvFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="text-indigo-600" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-900">{csvFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {isAnalyzing ? 'Analyzing...' : `${csvIndicators.length} indicators found`}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    CSV file with columns: section, standard, indicator, description, score, frequency
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Preview */}
          {csvIndicators.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-slate-700 mb-2">
                Preview ({csvIndicators.length} indicators)
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {csvIndicators.slice(0, 5).map((ind, index) => (
                  <div key={index} className="text-xs text-slate-600 flex items-center gap-2">
                    <span className="font-medium text-indigo-600">{ind.standard}</span>
                    <span className="truncate">{ind.indicator}</span>
                  </div>
                ))}
                {csvIndicators.length > 5 && (
                  <p className="text-xs text-slate-400">
                    +{csvIndicators.length - 5} more indicators
                  </p>
                )}
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isLoading || isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading && <Loader2 className="animate-spin" size={18} />}
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}
