// Enums
export type ComplianceStatus = 
  | 'Not Started' 
  | 'In Progress' 
  | 'Compliant' 
  | 'Non-Compliant' 
  | 'Not Applicable';

export type Frequency = 
  | 'One-time' 
  | 'Daily' 
  | 'Weekly' 
  | 'Monthly' 
  | 'Quarterly' 
  | 'Annually';

export type EvidenceType = 
  | 'document' 
  | 'image' 
  | 'certificate' 
  | 'note' 
  | 'link';

export type IndicatorEvidenceType = 
  | 'text' 
  | 'file' 
  | 'frequency';

export type EvidenceReviewState = 
  | 'draft' 
  | 'under_review' 
  | 'accepted' 
  | 'rejected';

export type EvidenceState = 
  | 'no_evidence' 
  | 'partial_evidence' 
  | 'evidence_complete' 
  | 'review_pending' 
  | 'accepted' 
  | 'rejected';

export type AICategorization = 
  | 'ai_fully_manageable' 
  | 'ai_assisted' 
  | 'manual';

export type SyncStatus = 
  | 'synced' 
  | 'pending' 
  | 'error';

export type View = 
  | 'projects' 
  | 'dashboard' 
  | 'checklist' 
  | 'reports' 
  | 'ai' 
  | 'converter' 
  | 'analysis' 
  | 'library' 
  | 'upcoming';

// Interfaces
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea';
  required?: boolean;
}

export type AttachmentProvider = 'none' | 'gdrive';

export type AttachmentStatus = 'pending' | 'linked';

export interface Evidence {
  id: string;
  dateUploaded: string;
  type: EvidenceType;
  fileName?: string;
  fileUrl?: string;
  content?: string;
  driveFileId?: string;
  driveViewLink?: string;
  driveName?: string;
  driveMimeType?: string;
  driveWebViewLink?: string;
  driveParentFolderId?: string;
  attachmentProvider?: AttachmentProvider;
  attachmentStatus?: AttachmentStatus;
  syncStatus?: SyncStatus;
  fileSize?: string;
  // Phase 6: Review workflow fields
  reviewState?: EvidenceReviewState;
  reviewReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewedByName?: string;
}

export interface AIAnalysis {
  content: string;
  timestamp: string;
}

export interface Indicator {
  id: string;
  section: string;
  standard: string;
  indicator: string;
  description: string;
  score: number;
  responsiblePerson?: string;
  frequency?: Frequency;
  assignee?: string;
  status: ComplianceStatus;
  evidence: Evidence[];
  notes?: string;
  lastUpdated?: string;
  formSchema?: FormField[];
  aiAnalysis?: AIAnalysis;
  aiCategorization?: AICategorization;
  isAICompleted?: boolean;
  isHumanVerified?: boolean;
  // Phase 6: Evidence type and state
  evidenceType?: IndicatorEvidenceType;
  evidenceState?: EvidenceState;
}

export interface DriveConfig {
  isConnected: boolean;
  accountName?: string;
  rootFolderId?: string;
  lastSync?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  indicators: Indicator[];
  createdAt: string;
  driveConfig?: DriveConfig;
}

// API Types
export interface CreateProjectData {
  name: string;
  description: string;
  indicators?: Partial<Indicator>[];
}

export interface CreateEvidenceData {
  indicator: string;
  type: EvidenceType;
  fileName?: string;
  fileUrl?: string;
  content?: string;
  file?: File;
  // Drive fields
  driveFileId?: string;
  driveName?: string;
  driveMimeType?: string;
  driveWebViewLink?: string;
  driveParentFolderId?: string;
  attachmentProvider?: AttachmentProvider;
  attachmentStatus?: AttachmentStatus;
}

export interface CategorizationResult {
  ai_fully_manageable: string[];
  ai_assisted: string[];
  manual: string[];
}

export interface TaskSuggestion {
  indicatorId: string;
  suggestion: string;
  isActionableByAI: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Stats Types
export interface ComplianceStats {
  total: number;
  compliant: number;
  nonCompliant: number;
  inProgress: number;
  notStarted: number;
  notApplicable: number;
  compliancePercentage: number;
}

export interface SectionStats {
  name: string;
  total: number;
  compliant: number;
  percentage: number;
}

export interface FrequencyStats {
  name: Frequency;
  count: number;
}

export interface IndicatorExplanation {
  explanation: string;
  requiredEvidence: EvidenceType[];
  evidenceDescription: string;
}

export interface FrequencyGroupingResult {
  one_time: string[];
  daily: string[];
  weekly: string[];
  monthly: string[];
  quarterly: string[];
  annually: string[];
}
