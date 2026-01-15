import { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Check, 
  X, 
  FileText,
  Bot,
  Filter,
  Search,
  Trash2,
  ExternalLink,
  Cloud,
  Clock,
  AlertCircle,
  Paperclip
} from 'lucide-react';
import { Indicator, ComplianceStatus, Evidence, EvidenceState, IndicatorEvidenceType } from '../types';
import { hasUnsyncedUpdate, getQueuedUpdate } from '../services/updateQueue';
import { getIsServerReachable } from '../services/connectivity';

interface ChecklistProps {
  indicators: Indicator[];
  onUpdateIndicator: (id: string, data: Partial<Indicator>) => void;
  onQuickLog: (id: string) => void;
  onAddEvidence: (indicatorId: string) => void;
  onDeleteEvidence: (evidenceId: string) => void;
  isOfflineFallback?: boolean;
}

type TabType = 'all' | 'action' | 'aiReview' | 'aiAssisted' | 'compliant' | 'frequency' 
  | 'noEvidence' | 'evidencePending' | 'evidenceComplete' | 'textEvidence' | 'fileEvidence' | 'frequencyEvidence';

const TABS: { id: TabType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'action', label: 'Action Required' },
  { id: 'aiReview', label: 'AI Review' },
  { id: 'aiAssisted', label: 'AI Assisted' },
  { id: 'compliant', label: 'Compliant' },
  { id: 'frequency', label: 'Frequency Log' },
  { id: 'noEvidence', label: 'No Evidence' },
  { id: 'evidencePending', label: 'Evidence Pending' },
  { id: 'evidenceComplete', label: 'Evidence Complete' },
  { id: 'textEvidence', label: 'Text Evidence' },
  { id: 'fileEvidence', label: 'File Evidence' },
  { id: 'frequencyEvidence', label: 'Frequency Evidence' },
];

const STATUS_OPTIONS: ComplianceStatus[] = [
  'Not Started',
  'In Progress',
  'Compliant',
  'Non-Compliant',
  'Not Applicable',
];

export default function Checklist({
  indicators,
  onUpdateIndicator,
  onQuickLog,
  onAddEvidence,
  onDeleteEvidence,
  isOfflineFallback = false,
}: ChecklistProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Get unique sections
  const sections = useMemo(() => {
    const sectionSet = new Set(indicators.map(i => i.section));
    return Array.from(sectionSet).sort();
  }, [indicators]);

  // Filter indicators based on tab and filters
  const filteredIndicators = useMemo(() => {
    let filtered = [...indicators];

    // Tab filter
    switch (activeTab) {
      case 'action':
        filtered = filtered.filter(i => 
          i.status === 'Non-Compliant' || i.status === 'Not Started'
        );
        break;
      case 'aiReview':
        filtered = filtered.filter(i => 
          i.isAICompleted && !i.isHumanVerified
        );
        break;
      case 'aiAssisted':
        filtered = filtered.filter(i => 
          i.aiCategorization === 'ai_assisted'
        );
        break;
      case 'compliant':
        filtered = filtered.filter(i => i.status === 'Compliant');
        break;
      case 'frequency':
        filtered = filtered.filter(i => i.frequency && i.frequency !== 'One-time');
        break;
      // Phase 6: Evidence-centric filters
      case 'noEvidence':
        filtered = filtered.filter(i => 
          i.evidenceState === 'no_evidence' || (!i.evidenceState && (!i.evidence || i.evidence.length === 0))
        );
        break;
      case 'evidencePending':
        filtered = filtered.filter(i => 
          i.evidenceState === 'partial_evidence' || 
          i.evidenceState === 'review_pending' ||
          i.evidenceState === 'rejected'
        );
        break;
      case 'evidenceComplete':
        filtered = filtered.filter(i => 
          i.evidenceState === 'accepted' || i.evidenceState === 'evidence_complete'
        );
        break;
      case 'textEvidence':
        filtered = filtered.filter(i => i.evidenceType === 'text');
        break;
      case 'fileEvidence':
        filtered = filtered.filter(i => i.evidenceType === 'file');
        break;
      case 'frequencyEvidence':
        filtered = filtered.filter(i => i.evidenceType === 'frequency');
        break;
    }

    // Section filter
    if (sectionFilter) {
      filtered = filtered.filter(i => i.section === sectionFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(i => 
        i.indicator.toLowerCase().includes(query) ||
        i.standard.toLowerCase().includes(query) ||
        i.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [indicators, activeTab, sectionFilter, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredIndicators.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIndicators.map(i => i.id)));
    }
  };

  const handleBulkApprove = () => {
    selectedIds.forEach(id => {
      onUpdateIndicator(id, { 
        status: 'Compliant', 
        isHumanVerified: true,
        lastUpdated: new Date().toISOString()
      });
    });
    setSelectedIds(new Set());
  };

  const getStatusColor = (status: ComplianceStatus) => {
    switch (status) {
      case 'Compliant': return 'bg-green-100 text-green-700';
      case 'Non-Compliant': return 'bg-red-100 text-red-700';
      case 'In Progress': return 'bg-amber-100 text-amber-700';
      case 'Not Started': return 'bg-slate-100 text-slate-600';
      case 'Not Applicable': return 'bg-gray-100 text-gray-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance Checklist</h1>
          <p className="text-slate-500 mt-1">
            {filteredIndicators.length} of {indicators.length} indicators
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-white rounded-xl border border-slate-200 p-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search indicators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Section Filter */}
        <div className="relative">
          <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All Sections</option>
            {sections.map(section => (
              <option key={section} value={section}>{section}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 bg-indigo-50 rounded-xl p-4">
          <span className="text-sm font-medium text-indigo-700">
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleBulkApprove}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
          >
            <Check size={16} />
            Approve Selected
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-600 rounded-lg text-sm hover:bg-slate-50 border border-slate-200"
          >
            <X size={16} />
            Clear Selection
          </button>
        </div>
      )}

      {/* Indicator List */}
      <div className="space-y-3">
        {/* Select All */}
        {filteredIndicators.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 text-sm text-slate-500">
            <input
              type="checkbox"
              checked={selectedIds.size === filteredIndicators.length && filteredIndicators.length > 0}
              onChange={selectAll}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Select all</span>
          </div>
        )}

        {filteredIndicators.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No indicators found</h3>
            <p className="text-slate-500 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          filteredIndicators.map(indicator => (
            <IndicatorCard
              key={indicator.id}
              indicator={indicator}
              isExpanded={expandedIds.has(indicator.id)}
              isSelected={selectedIds.has(indicator.id)}
              onToggleExpand={() => toggleExpand(indicator.id)}
              onToggleSelect={() => toggleSelect(indicator.id)}
              onUpdateIndicator={onUpdateIndicator}
              onQuickLog={onQuickLog}
              onAddEvidence={onAddEvidence}
              onDeleteEvidence={onDeleteEvidence}
              getStatusColor={getStatusColor}
              isOfflineFallback={isOfflineFallback}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface IndicatorCardProps {
  indicator: Indicator;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onUpdateIndicator: (id: string, data: Partial<Indicator>) => void;
  onQuickLog: (id: string) => void;
  onAddEvidence: (indicatorId: string) => void;
  onDeleteEvidence: (evidenceId: string) => void;
  getStatusColor: (status: ComplianceStatus) => string;
  isOfflineFallback?: boolean;
}

function IndicatorCard({
  indicator,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onUpdateIndicator,
  onQuickLog,
  onAddEvidence,
  onDeleteEvidence,
  getStatusColor,
  isOfflineFallback = false,
}: IndicatorCardProps) {
  // Check sync state
  const isServerReachable = getIsServerReachable();
  const hasUnsynced = hasUnsyncedUpdate(indicator.id);
  const queuedUpdate = getQueuedUpdate(indicator.id);
  const syncState = isOfflineFallback || !isServerReachable
    ? (hasUnsynced ? 'unsynced' : 'synced')
    : 'synced';
  
  // Phase 6: Check evidence state and completeness
  const evidenceCount = indicator.evidence?.length || 0;
  const evidenceState: EvidenceState = indicator.evidenceState || 
    (evidenceCount === 0 ? 'no_evidence' : 'partial_evidence');
  const isCompleted = ['Compliant', 'Completed', 'Done'].includes(indicator.status);
  
  // Block completion if evidence incomplete (online only)
  const canComplete = isOfflineFallback || !isServerReachable || 
    evidenceState === 'accepted' || evidenceState === 'evidence_complete';
  const evidenceBlocked = !isOfflineFallback && isServerReachable && !canComplete;
  
  // Get evidence type label
  const getEvidenceTypeLabel = (type?: string) => {
    switch (type) {
      case 'text': return 'Text Evidence';
      case 'file': return 'File Evidence';
      case 'frequency': return 'Frequency Evidence';
      default: return 'Evidence';
    }
  };
  
  // Get evidence state label and color
  const getEvidenceStateInfo = (state: EvidenceState) => {
    switch (state) {
      case 'no_evidence':
        return { label: 'No Evidence', color: 'text-red-600 bg-red-50' };
      case 'partial_evidence':
        return { label: 'Partial Evidence', color: 'text-amber-600 bg-amber-50' };
      case 'review_pending':
        return { label: 'Review Pending', color: 'text-amber-600 bg-amber-50' };
      case 'rejected':
        return { label: 'Evidence Rejected', color: 'text-red-600 bg-red-50' };
      case 'accepted':
      case 'evidence_complete':
        return { label: 'Evidence Complete', color: 'text-green-600 bg-green-50' };
      default:
        return { label: 'Evidence Pending', color: 'text-slate-600 bg-slate-50' };
    }
  };
  
  const evidenceStateInfo = getEvidenceStateInfo(evidenceState);
  return (
    <div className={`bg-white rounded-xl border transition-all ${
      isSelected ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-4 p-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        
        <button onClick={onToggleExpand} className="text-slate-400 hover:text-slate-600">
          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {indicator.standard}
            </span>
            <span className="text-xs text-slate-500">{indicator.section}</span>
            {indicator.isAICompleted && !indicator.isHumanVerified && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1">
                <Bot size={12} />
                AI Review
              </span>
            )}
            {/* Sync State Badge */}
            {syncState === 'unsynced' && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1">
                <AlertCircle size={12} />
                Unsynced
              </span>
            )}
            {/* Evidence Type Badge */}
            {indicator.evidenceType && (
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {getEvidenceTypeLabel(indicator.evidenceType)}
              </span>
            )}
            {/* Evidence State Badge */}
            {evidenceState !== 'no_evidence' && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1 ${evidenceStateInfo.color}`}>
                <Paperclip size={12} />
                {evidenceStateInfo.label}
              </span>
            )}
            {/* Evidence Blocked Badge (online only) */}
            {evidenceBlocked && (
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded flex items-center gap-1">
                <AlertCircle size={12} />
                Evidence Required
              </span>
            )}
          </div>
          <h4 className="font-medium text-slate-900 truncate">{indicator.indicator}</h4>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(indicator.status)}`}>
            {indicator.status}
          </span>
          <span className="text-sm font-medium text-slate-500">{indicator.score} pts</span>
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-100 p-4 space-y-4 animate-fade-in">
          {/* Description */}
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Description
            </label>
            <p className="text-sm text-slate-600 mt-1">{indicator.description || 'No description'}</p>
          </div>
          
          {/* Status and Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Status
              </label>
              <select
                value={indicator.status}
                onChange={(e) => {
                  const newStatus = e.target.value as ComplianceStatus;
                  // Block completion status if evidence is incomplete (online only)
                  if (!isOfflineFallback && isServerReachable) {
                    const completionStatuses: ComplianceStatus[] = ['Compliant'];
                    if (completionStatuses.includes(newStatus) && !canComplete) {
                      // Status change blocked - show warning
                      return;
                    }
                  }
                  onUpdateIndicator(indicator.id, { 
                    status: newStatus,
                    lastUpdated: new Date().toISOString()
                  });
                }}
                className={`mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  evidenceBlocked && ['Compliant'].includes(indicator.status)
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200'
                }`}
              >
                {STATUS_OPTIONS.map(status => (
                  <option 
                    key={status} 
                    value={status}
                    disabled={evidenceBlocked && status === 'Compliant'}
                  >
                    {status}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Assignee
              </label>
              <input
                type="text"
                value={indicator.assignee || ''}
                onChange={(e) => onUpdateIndicator(indicator.id, { assignee: e.target.value })}
                placeholder="Assign to..."
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Frequency
              </label>
              <p className="mt-1 text-sm text-slate-600">{indicator.frequency || 'One-time'}</p>
            </div>
          </div>
          
          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Notes
            </label>
            <textarea
              value={indicator.notes || ''}
              onChange={(e) => onUpdateIndicator(indicator.id, { notes: e.target.value })}
              placeholder="Add notes..."
              rows={2}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          
          {/* Evidence */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Evidence ({indicator.evidence.length})
                {indicator.evidenceType && (
                  <span className="ml-2 text-xs text-slate-400 normal-case">
                    ({getEvidenceTypeLabel(indicator.evidenceType)})
                  </span>
                )}
              </label>
              <button
                onClick={() => onAddEvidence(indicator.id)}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                disabled={isOfflineFallback}
              >
                <Plus size={14} />
                Add Evidence
              </button>
            </div>
            
            {/* Phase 6: Evidence Completeness Warning */}
            {evidenceBlocked && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">
                      Evidence Required
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      {evidenceState === 'no_evidence' 
                        ? 'This indicator requires evidence before it can be completed.'
                        : evidenceState === 'rejected'
                        ? 'Evidence has been rejected. Please add new evidence before completing.'
                        : 'Evidence is incomplete or pending review. Please ensure all evidence is accepted.'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {indicator.evidenceType === 'text' && (
                        <button
                          onClick={() => onAddEvidence(indicator.id)}
                          className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          Add Text Evidence
                        </button>
                      )}
                      {indicator.evidenceType === 'file' && (
                        <button
                          onClick={() => onAddEvidence(indicator.id)}
                          className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          Attach Cloud Evidence
                        </button>
                      )}
                      {indicator.evidenceType === 'frequency' && (
                        <button
                          onClick={() => onAddEvidence(indicator.id)}
                          className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          Add Frequency Record
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {indicator.evidence.length > 0 ? (
              <div className="space-y-2">
                {indicator.evidence.map(evidence => (
                  <EvidenceItem 
                    key={evidence.id} 
                    evidence={evidence} 
                    onDelete={() => onDeleteEvidence(evidence.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No evidence attached</p>
            )}
          </div>
          
          {/* AI Analysis */}
          {indicator.aiAnalysis && (
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bot size={16} className="text-indigo-600" />
                <label className="text-xs font-medium text-indigo-600 uppercase tracking-wide">
                  AI Analysis
                </label>
              </div>
              <p className="text-sm text-indigo-900">{indicator.aiAnalysis.content}</p>
              <p className="text-xs text-indigo-600 mt-2">
                Generated: {new Date(indicator.aiAnalysis.timestamp).toLocaleString()}
              </p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onQuickLog(indicator.id)}
              disabled={evidenceBlocked}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                evidenceBlocked
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              title={evidenceBlocked ? 'Evidence is required before this indicator can be completed.' : 'Mark as Compliant'}
            >
              <Check size={16} />
              Mark Compliant
            </button>
            
            {indicator.isAICompleted && !indicator.isHumanVerified && (
              <>
                <button
                  onClick={() => onUpdateIndicator(indicator.id, { 
                    isHumanVerified: true,
                    lastUpdated: new Date().toISOString()
                  })}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                >
                  <Check size={16} />
                  Approve AI Work
                </button>
                <button
                  onClick={() => onUpdateIndicator(indicator.id, { 
                    isAICompleted: false,
                    status: 'Not Started'
                  })}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-50 transition-colors"
                >
                  <X size={16} />
                  Reject
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface EvidenceItemProps {
  evidence: Evidence;
  onDelete: () => void;
}

function EvidenceItem({ evidence, onDelete }: EvidenceItemProps) {
  const getTypeIcon = () => {
    switch (evidence.type) {
      case 'document': return <FileText size={14} />;
      case 'note': return <FileText size={14} />;
      default: return <FileText size={14} />;
    }
  };

  const driveLink = evidence.driveWebViewLink || evidence.driveViewLink;
  const isDriveLinked = evidence.attachmentProvider === 'gdrive' && evidence.driveFileId;
  const isPending = evidence.attachmentStatus === 'pending';
  
  // Phase 6: Review state display
  const reviewState = evidence.reviewState || 'draft';
  const getReviewStateBadge = () => {
    switch (reviewState) {
      case 'accepted':
        return (
          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
            <Check size={12} />
            Accepted
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
            <X size={12} />
            Rejected
          </span>
        );
      case 'under_review':
        return (
          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
            <Clock size={12} />
            Under Review
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg group">
      <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-slate-400">
        {isDriveLinked ? <Cloud size={14} /> : getTypeIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-700 truncate">
            {evidence.driveName || evidence.fileName || evidence.type}
          </p>
          {isPending && (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
              <Clock size={12} />
              Pending
            </span>
          )}
          {getReviewStateBadge()}
        </div>
        <p className="text-xs text-slate-500">
          {new Date(evidence.dateUploaded).toLocaleDateString()}
          {evidence.fileSize && ` • ${evidence.fileSize}`}
          {isDriveLinked && !isPending && ' • Google Drive'}
          {evidence.reviewedByName && ` • Reviewed by ${evidence.reviewedByName}`}
        </p>
        {reviewState === 'rejected' && evidence.reviewReason && (
          <p className="text-xs text-red-600 mt-1 italic">
            Reason: {evidence.reviewReason}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {driveLink && !isPending && (
          <a
            href={driveLink}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-400 hover:text-indigo-600"
            title="Open in Drive"
          >
            <Cloud size={14} />
          </a>
        )}
        {evidence.fileUrl && !isDriveLinked && (
          <a
            href={evidence.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-400 hover:text-indigo-600"
          >
            <ExternalLink size={14} />
          </a>
        )}
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-400 hover:text-red-600"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
