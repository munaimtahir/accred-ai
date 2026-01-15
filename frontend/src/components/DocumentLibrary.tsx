import { useState, useMemo } from 'react';
import { 
  FolderOpen, 
  FileText, 
  Image, 
  Award, 
  Link as LinkIcon,
  StickyNote,
  ChevronRight,
  ChevronDown,
  Trash2,
  ExternalLink,
  Calendar,
  Search,
  Cloud
} from 'lucide-react';
import { Indicator, Evidence, EvidenceType } from '../types';

interface DocumentLibraryProps {
  indicators: Indicator[];
  onDeleteEvidence: (evidenceId: string) => void;
}

interface FolderStructure {
  [section: string]: {
    indicators: Indicator[];
    evidenceCount: number;
  };
}

export default function DocumentLibrary({
  indicators,
  onDeleteEvidence,
}: DocumentLibraryProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Build folder structure
  const folderStructure = useMemo((): FolderStructure => {
    const structure: FolderStructure = {};
    
    indicators.forEach(ind => {
      if (!structure[ind.section]) {
        structure[ind.section] = { indicators: [], evidenceCount: 0 };
      }
      structure[ind.section].indicators.push(ind);
      structure[ind.section].evidenceCount += ind.evidence.length;
    });
    
    return structure;
  }, [indicators]);

  // Get all evidence for display
  const allEvidence = useMemo(() => {
    let evidence: (Evidence & { indicatorName: string; section: string })[] = [];
    
    indicators.forEach(ind => {
      ind.evidence.forEach(e => {
        evidence.push({
          ...e,
          indicatorName: ind.indicator,
          section: ind.section,
        });
      });
    });
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      evidence = evidence.filter(e => 
        e.fileName?.toLowerCase().includes(query) ||
        e.indicatorName.toLowerCase().includes(query) ||
        e.section.toLowerCase().includes(query)
      );
    }
    
    // Filter by selection
    if (selectedSection) {
      evidence = evidence.filter(e => e.section === selectedSection);
    }
    if (selectedIndicator) {
      const indicator = indicators.find(i => i.id === selectedIndicator);
      if (indicator) {
        evidence = evidence.filter(e => e.indicatorName === indicator.indicator);
      }
    }
    
    return evidence.sort((a, b) => 
      new Date(b.dateUploaded).getTime() - new Date(a.dateUploaded).getTime()
    );
  }, [indicators, searchQuery, selectedSection, selectedIndicator]);

  const toggleFolder = (section: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const getTypeIcon = (type: EvidenceType) => {
    switch (type) {
      case 'document': return <FileText size={20} className="text-blue-500" />;
      case 'image': return <Image size={20} className="text-green-500" />;
      case 'certificate': return <Award size={20} className="text-amber-500" />;
      case 'link': return <LinkIcon size={20} className="text-purple-500" />;
      case 'note': return <StickyNote size={20} className="text-pink-500" />;
      default: return <FileText size={20} className="text-slate-400" />;
    }
  };

  const totalEvidence = indicators.reduce((sum, ind) => sum + ind.evidence.length, 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Document Library</h1>
        <p className="text-slate-500 mt-1">
          {totalEvidence} documents across {Object.keys(folderStructure).length} sections
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar - Folder Tree */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Folders</h3>
            </div>
            
            <div className="p-2">
              {/* All Files */}
              <button
                onClick={() => {
                  setSelectedSection(null);
                  setSelectedIndicator(null);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  !selectedSection && !selectedIndicator
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FolderOpen size={18} />
                <span className="text-sm font-medium">All Files</span>
                <span className="ml-auto text-xs text-slate-400">{totalEvidence}</span>
              </button>
              
              {/* Section Folders */}
              {Object.entries(folderStructure).map(([section, data]) => (
                <div key={section}>
                  <button
                    onClick={() => toggleFolder(section)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedSection === section
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {expandedFolders.has(section) ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                    <FolderOpen size={18} />
                    <span className="text-sm font-medium truncate">{section}</span>
                    <span className="ml-auto text-xs text-slate-400">{data.evidenceCount}</span>
                  </button>
                  
                  {expandedFolders.has(section) && (
                    <div className="ml-6 border-l border-slate-200">
                      {data.indicators
                        .filter(ind => ind.evidence.length > 0)
                        .map(indicator => (
                          <button
                            key={indicator.id}
                            onClick={() => {
                              setSelectedSection(section);
                              setSelectedIndicator(indicator.id);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                              selectedIndicator === indicator.id
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <FileText size={14} />
                            <span className="text-xs truncate">{indicator.standard}</span>
                            <span className="ml-auto text-xs text-slate-400">
                              {indicator.evidence.length}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content - File Grid */}
        <div className="flex-1">
          {/* Search */}
          <div className="mb-4 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Files Grid */}
          {allEvidence.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <FolderOpen size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No documents</h3>
              <p className="text-slate-500 mt-1">
                {searchQuery ? 'No documents match your search' : 'Upload evidence to see it here'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allEvidence.map((evidence) => (
                <div
                  key={evidence.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-all group"
                >
                  {/* Icon */}
                  <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mb-3">
                    {getTypeIcon(evidence.type)}
                  </div>
                  
                  {/* File Info */}
                  <h4 className="font-medium text-slate-900 text-sm truncate">
                    {evidence.fileName || evidence.type}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    {evidence.indicatorName}
                  </p>
                  
                  {/* Meta */}
                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                    <Calendar size={12} />
                    {new Date(evidence.dateUploaded).toLocaleDateString()}
                    {evidence.fileSize && (
                      <>
                        <span>•</span>
                        {evidence.fileSize}
                      </>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(evidence.driveWebViewLink || evidence.driveViewLink) && evidence.attachmentStatus !== 'pending' && (
                      <a
                        href={evidence.driveWebViewLink || evidence.driveViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded"
                        title="Open in Drive"
                      >
                        <Cloud size={12} />
                        Open in Drive
                      </a>
                    )}
                    {evidence.fileUrl && evidence.attachmentProvider !== 'gdrive' && (
                      <a
                        href={evidence.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded"
                      >
                        <ExternalLink size={12} />
                        View
                      </a>
                    )}
                    <button
                      onClick={() => onDeleteEvidence(evidence.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                  
                  {/* Type Badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      evidence.type === 'document' ? 'bg-blue-100 text-blue-700' :
                      evidence.type === 'image' ? 'bg-green-100 text-green-700' :
                      evidence.type === 'certificate' ? 'bg-amber-100 text-amber-700' :
                      evidence.type === 'link' ? 'bg-purple-100 text-purple-700' :
                      'bg-pink-100 text-pink-700'
                    }`}>
                      {evidence.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
