import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Upload, FileText, StickyNote, Link as LinkIcon, Loader2, FormInput, Cloud, AlertCircle } from 'lucide-react';
import { Indicator, CreateEvidenceData, EvidenceType, FormField } from '../../types';
import { requestDriveToken, initializeDriveAuth, isGoogleLoaded, isDriveAuthenticated } from '../../drive/driveAuth';
import { openDrivePicker } from '../../drive/drivePicker';
import { getOrCreateFolderHierarchy } from '../../drive/driveFolders';
import { shouldUseBackend } from '../../state/dataMode';
import { useAuth } from '../../auth/AuthContext';

interface EvidenceModalProps {
  indicatorId: string;
  indicator: Indicator | null;
  projectName?: string;
  onClose: () => void;
  onSave: (data: CreateEvidenceData) => void;
}

type TabType = 'upload' | 'log' | 'note' | 'link' | 'drive';

export default function EvidenceModal({ 
  indicatorId, 
  indicator, 
  projectName,
  onClose, 
  onSave 
}: EvidenceModalProps) {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveLoading, setDriveLoading] = useState(false);
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Note state
  const [noteContent, setNoteContent] = useState('');
  
  // Link state
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  
  // Form log state
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  // Drive state
  const [selectedDriveFile, setSelectedDriveFile] = useState<{
    fileId: string;
    name: string;
    mimeType: string;
    webViewLink?: string;
  } | null>(null);

  // Load Google Identity Services on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !isGoogleLoaded()) {
      // Load Google Identity Services script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (isGoogleLoaded()) {
          initializeDriveAuth();
        }
      };
      document.head.appendChild(script);
    } else if (isGoogleLoaded()) {
      initializeDriveAuth();
    }
  }, []);

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'upload', label: 'Upload File', icon: <Upload size={16} /> },
    { id: 'log', label: 'Digital Log', icon: <FormInput size={16} /> },
    { id: 'note', label: 'Add Note', icon: <StickyNote size={16} /> },
    { id: 'link', label: 'Add Link', icon: <LinkIcon size={16} /> },
    { id: 'drive', label: 'Google Drive', icon: <Cloud size={16} /> },
  ];

  const isOfflineMode = !shouldUseBackend(isAuthenticated);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleFormValueChange = (fieldName: string, value: string) => {
    setFormValues(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleDriveAttach = useCallback(async () => {
    if (isOfflineMode) {
      setDriveError('Drive linking requires sign-in. Please sign in to use Google Drive.');
      return;
    }

    setDriveLoading(true);
    setDriveError(null);

    try {
      // Request Drive token
      const token = await requestDriveToken();
      if (!token) {
        setDriveError('Failed to authenticate with Google Drive. Please try again.');
        setDriveLoading(false);
        return;
      }

      // Ensure folder structure exists
      if (!projectName || !indicator) {
        setDriveError('Project information is required for Drive linking.');
        setDriveLoading(false);
        return;
      }

      const indicatorKey = `${indicator.standard} - ${indicator.indicator}`.substring(0, 50); // Limit length
      const folderId = await getOrCreateFolderHierarchy(
        token,
        projectName,
        indicator.standard,
        indicatorKey
      );

      // Open Picker
      const fileInfo = await openDrivePicker(token, folderId);
      
      if (fileInfo) {
        setSelectedDriveFile(fileInfo);
      } else {
        // User cancelled
        setDriveError(null);
      }
    } catch (error) {
      console.error('Drive attachment error:', error);
      setDriveError(error instanceof Error ? error.message : 'Failed to link Drive file. Please try again.');
    } finally {
      setDriveLoading(false);
    }
  }, [isOfflineMode, projectName, indicator]);

  const handleSubmit = useCallback(async () => {
    setIsLoading(true);

    try {
      let data: CreateEvidenceData;

      switch (activeTab) {
        case 'upload':
          if (!file) return;
          data = {
            indicator: indicatorId,
            type: getFileType(file.name),
            fileName: file.name,
            file: file,
          };
          break;

        case 'note':
          if (!noteContent.trim()) return;
          data = {
            indicator: indicatorId,
            type: 'note',
            content: noteContent.trim(),
            fileName: `Note - ${new Date().toLocaleDateString()}`,
          };
          break;

        case 'link':
          if (!linkUrl.trim()) return;
          data = {
            indicator: indicatorId,
            type: 'link',
            fileUrl: linkUrl.trim(),
            fileName: linkName.trim() || linkUrl.trim(),
          };
          break;

        case 'log':
          // Generate a note from form values
          const logContent = Object.entries(formValues)
            .map(([key, value]) => {
              const field = indicator?.formSchema?.find(f => f.name === key);
              return `${field?.label || key}: ${value}`;
            })
            .join('\n');

          data = {
            indicator: indicatorId,
            type: 'note',
            content: `Digital Log - ${new Date().toLocaleDateString()}\n\n${logContent}`,
            fileName: `Log - ${new Date().toLocaleDateString()}`,
          };
          break;

        default:
          return;
      }

      await onSave(data);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, indicatorId, file, noteContent, linkUrl, linkName, formValues, indicator, onSave]);

  const getFileType = (fileName: string): EvidenceType => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return 'document';
    return 'document';
  };

  const isSubmitDisabled = () => {
    switch (activeTab) {
      case 'upload': return !file;
      case 'note': return !noteContent.trim();
      case 'link': return !linkUrl.trim();
      case 'drive': return !selectedDriveFile;
      case 'log': 
        const requiredFields = indicator?.formSchema?.filter(f => f.required) || [];
        return requiredFields.some(f => !formValues[f.name]?.trim());
      default: return true;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Add Evidence</h2>
            {indicator && (
              <p className="text-sm text-slate-500 mt-1">{indicator.indicator}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'upload' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors cursor-pointer"
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="text-indigo-600" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
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
                    PDF, DOCX, images up to 10MB
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
              />
            </div>
          )}

          {activeTab === 'log' && (
            <div className="space-y-4">
              {indicator?.formSchema && indicator.formSchema.length > 0 ? (
                indicator.formSchema.map((field: FormField) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={formValues[field.name] || ''}
                        onChange={(e) => handleFormValueChange(field.name, e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={formValues[field.name] || ''}
                        onChange={(e) => handleFormValueChange(field.name, e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <FormInput size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No digital form schema defined for this indicator.</p>
                  <p className="text-xs mt-1">Use the "Add Note" tab instead.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'note' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Note Content
              </label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Enter your note here..."
                rows={6}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          )}

          {activeTab === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Link URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder="Optional - will use URL if not provided"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'drive' && (
            <div className="space-y-4">
              {/* Security Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">Drive Access</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Drive access is only for files you select. We use the least-privilege scope (drive.file) to access only files you explicitly choose.
                  </p>
                </div>
              </div>

              {/* Offline Mode Warning */}
              {isOfflineMode && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900">Sign-in Required</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Link Drive file (requires sign-in). Please sign in to use Google Drive linking.
                    </p>
                  </div>
                </div>
              )}

              {/* Drive File Selection */}
              {selectedDriveFile ? (
                <div className="border-2 border-indigo-200 bg-indigo-50 rounded-xl p-6">
                  <div className="flex items-center gap-3">
                    <FileText className="text-indigo-600" size={24} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{selectedDriveFile.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {selectedDriveFile.mimeType}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedDriveFile(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                  <Cloud size={32} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600 mb-4">
                    {isOfflineMode 
                      ? 'Sign in to link files from Google Drive'
                      : 'Select a file from Google Drive'}
                  </p>
                  <button
                    onClick={handleDriveAttach}
                    disabled={isOfflineMode || driveLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                  >
                    {driveLoading && <Loader2 className="animate-spin" size={16} />}
                    {isOfflineMode ? 'Sign In Required' : 'Attach from Google Drive'}
                  </button>
                </div>
              )}

              {/* Error Message */}
              {driveError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                  <p className="text-xs text-red-700">{driveError}</p>
                </div>
              )}
            </div>
          )}
        </div>

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
            disabled={isSubmitDisabled() || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading && <Loader2 className="animate-spin" size={18} />}
            Save Evidence
          </button>
        </div>
      </div>
    </div>
  );
}
