import React, { useState, useCallback } from 'react';
import { 
  Bot, 
  Sparkles, 
  Wand2, 
  FileText, 
  User,
  CheckCircle2,
  Loader2,
  AlertCircle,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Save
} from 'lucide-react';
import { Indicator, CategorizationResult, IndicatorExplanation, FrequencyGroupingResult, EvidenceType, Frequency } from '../types';
import { api } from '../services/api';

interface AIAnalysisProps {
  indicators: Indicator[];
  onUpdateIndicator: (id: string, data: Partial<Indicator>) => void;
}

export default function AIAnalysis({
  indicators,
  onUpdateIndicator,
}: AIAnalysisProps) {
  const [activeSection, setActiveSection] = useState<'explanations' | 'frequency' | 'assistance'>('explanations');
  
  // Indicator Explanations state
  const [isAnalyzingExplanations, setIsAnalyzingExplanations] = useState(false);
  const [explanations, setExplanations] = useState<Record<string, IndicatorExplanation> | null>(null);
  
  // Frequency Grouping state
  const [isAnalyzingFrequency, setIsAnalyzingFrequency] = useState(false);
  const [frequencyGrouping, setFrequencyGrouping] = useState<FrequencyGroupingResult | null>(null);
  
  // AI Assistance Categorization state (existing)
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [categorization, setCategorization] = useState<CategorizationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  
  const [error, setError] = useState<string | null>(null);

  const nonCompliantIndicators = indicators.filter(i => 
    i.status !== 'Compliant' && i.status !== 'Not Applicable'
  );

  const handleCategorize = useCallback(async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await api.analyzeCategorization(nonCompliantIndicators);
      setCategorization(result);
      
      // Update indicators with categorization
      result.ai_fully_manageable.forEach(id => {
        onUpdateIndicator(id, { aiCategorization: 'ai_fully_manageable' });
      });
      result.ai_assisted.forEach(id => {
        onUpdateIndicator(id, { aiCategorization: 'ai_assisted' });
      });
      result.manual.forEach(id => {
        onUpdateIndicator(id, { aiCategorization: 'manual' });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to categorize indicators');
    } finally {
      setIsAnalyzing(false);
    }
  }, [nonCompliantIndicators, onUpdateIndicator]);

  const handleAutoWriteSOPs = useCallback(async () => {
    if (!categorization) return;
    
    const manageable = indicators.filter(i => 
      categorization.ai_fully_manageable.includes(i.id)
    );
    
    if (manageable.length === 0) return;
    
    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: manageable.length });
    setError(null);
    
    try {
      for (let i = 0; i < manageable.length; i++) {
        const indicator = manageable[i];
        setGenerationProgress({ current: i + 1, total: manageable.length });
        
        const guide = await api.generateComplianceGuide(indicator);
        
        onUpdateIndicator(indicator.id, {
          status: 'Compliant',
          isAICompleted: true,
          isHumanVerified: false,
          aiAnalysis: {
            content: guide,
            timestamp: new Date().toISOString(),
          },
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate SOPs');
    } finally {
      setIsGenerating(false);
      setGenerationProgress({ current: 0, total: 0 });
    }
  }, [categorization, indicators, onUpdateIndicator]);

  const handleDeployForms = useCallback(async () => {
    if (!categorization) return;
    
    const assisted = indicators.filter(i => 
      categorization.ai_assisted.includes(i.id)
    );
    
    for (const indicator of assisted) {
      onUpdateIndicator(indicator.id, {
        formSchema: [
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'value', label: 'Value', type: 'text', required: true },
          { name: 'notes', label: 'Notes', type: 'textarea', required: false },
        ],
      });
    }
  }, [categorization, indicators, onUpdateIndicator]);

  const handleAnalyzeExplanations = useCallback(async () => {
    setIsAnalyzingExplanations(true);
    setError(null);
    
    try {
      const result = await api.analyzeIndicatorExplanations(indicators);
      setExplanations(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze indicator explanations');
    } finally {
      setIsAnalyzingExplanations(false);
    }
  }, [indicators]);

  const handleSaveExplanation = useCallback((indicatorId: string, explanation: IndicatorExplanation) => {
    const explanationText = `${explanation.explanation}\n\nRequired Evidence: ${explanation.evidenceDescription}\nEvidence Types: ${explanation.requiredEvidence.join(', ')}`;
    onUpdateIndicator(indicatorId, {
      aiAnalysis: {
        content: explanationText,
        timestamp: new Date().toISOString(),
      },
    });
  }, [onUpdateIndicator]);

  const handleAnalyzeFrequency = useCallback(async () => {
    setIsAnalyzingFrequency(true);
    setError(null);
    
    try {
      const result = await api.analyzeFrequencyGrouping(indicators);
      setFrequencyGrouping(result);
      
      // Update indicator frequency fields based on AI analysis
      const frequencyMap: Record<string, Frequency> = {
        'one_time': 'One-time',
        'daily': 'Daily',
        'weekly': 'Weekly',
        'monthly': 'Monthly',
        'quarterly': 'Quarterly',
        'annually': 'Annually',
      };
      
      Object.entries(result).forEach(([freq, ids]) => {
        ids.forEach((id: string) => {
          const indicator = indicators.find(i => i.id === id);
          if (indicator && (!indicator.frequency || indicator.frequency !== frequencyMap[freq])) {
            onUpdateIndicator(id, { frequency: frequencyMap[freq] });
          }
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze frequency grouping');
    } finally {
      setIsAnalyzingFrequency(false);
    }
  }, [indicators, onUpdateIndicator]);

  const getIndicatorById = (id: string) => indicators.find(i => i.id === id);
  
  const getEvidenceTypeIcon = (type: EvidenceType) => {
    switch (type) {
      case 'document': return <FileText size={14} />;
      case 'image': return <FileText size={14} />;
      case 'certificate': return <CheckCircle2 size={14} />;
      case 'note': return <FileText size={14} />;
      case 'link': return <FileText size={14} />;
      default: return <FileText size={14} />;
    }
  };
  
  const getFrequencyColor = (freq: string) => {
    switch (freq) {
      case 'one_time': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-600' };
      case 'daily': return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-600' };
      case 'weekly': return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-600' };
      case 'monthly': return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'text-orange-600' };
      case 'quarterly': return { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', icon: 'text-pink-600' };
      case 'annually': return { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: 'text-indigo-600' };
      default: return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: 'text-gray-600' };
    }
  };
  
  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'one_time': return 'One-Time';
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Quarterly';
      case 'annually': return 'Annually';
      default: return freq;
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Analysis</h1>
          <p className="text-slate-500 mt-1">
            Analyze indicators, group by frequency, and get AI assistance
          </p>
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

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSection('explanations')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeSection === 'explanations'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <BookOpen size={16} />
            Indicator Explanations
          </div>
        </button>
        <button
          onClick={() => setActiveSection('frequency')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeSection === 'frequency'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            Frequency Grouping
          </div>
        </button>
        <button
          onClick={() => setActiveSection('assistance')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeSection === 'assistance'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bot size={16} />
            AI Assistance
          </div>
        </button>
      </div>

      {/* Section Content */}
      {activeSection === 'explanations' && (
        <IndicatorExplanationsSection
          indicators={indicators}
          explanations={explanations}
          isAnalyzing={isAnalyzingExplanations}
          onAnalyze={handleAnalyzeExplanations}
          onSave={handleSaveExplanation}
          getEvidenceTypeIcon={getEvidenceTypeIcon}
        />
      )}

      {activeSection === 'frequency' && (
        <FrequencyGroupingSection
          indicators={indicators}
          frequencyGrouping={frequencyGrouping}
          isAnalyzing={isAnalyzingFrequency}
          onAnalyze={handleAnalyzeFrequency}
          getIndicator={getIndicatorById}
          getFrequencyColor={getFrequencyColor}
          getFrequencyLabel={getFrequencyLabel}
        />
      )}

      {activeSection === 'assistance' && (
        <AIAssistanceSection
          indicators={indicators}
          nonCompliantIndicators={nonCompliantIndicators}
          categorization={categorization}
          isAnalyzing={isAnalyzing}
          isGenerating={isGenerating}
          generationProgress={generationProgress}
          onCategorize={handleCategorize}
          onAutoWriteSOPs={handleAutoWriteSOPs}
          onDeployForms={handleDeployForms}
          getIndicator={getIndicatorById}
        />
      )}
    </div>
  );
}

// Indicator Explanations Section
interface IndicatorExplanationsSectionProps {
  indicators: Indicator[];
  explanations: Record<string, IndicatorExplanation> | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onSave: (indicatorId: string, explanation: IndicatorExplanation) => void;
  getEvidenceTypeIcon: (type: EvidenceType) => React.ReactElement;
}

function IndicatorExplanationsSection({
  indicators,
  explanations,
  isAnalyzing,
  onAnalyze,
  onSave,
  getEvidenceTypeIcon,
}: IndicatorExplanationsSectionProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string): void => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  return (
    <div className="space-y-6">
      {!explanations && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-center">
          <BookOpen className="w-12 h-12 text-white mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Analyze Indicator Requirements
          </h3>
          <p className="text-indigo-100 mb-6">
            Get AI-powered explanations of what each indicator means and what evidence is required
          </p>
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing || indicators.length === 0}
            className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-xl font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Analyzing...
              </>
            ) : (
              <>
                <Bot size={20} />
                Analyze Indicator Requirements
              </>
            )}
          </button>
        </div>
      )}

      {explanations && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Indicator Explanations ({Object.keys(explanations).length})
            </h2>
          </div>
          
          <div className="space-y-3">
            {indicators.map(indicator => {
              const explanation = explanations[indicator.id];
              if (!explanation) return null;
              
              const isExpanded = expandedIds.has(indicator.id);
              
              return (
                <div key={indicator.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div 
                    className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleExpand(indicator.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-indigo-600">{indicator.standard}</span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-500">{indicator.section}</span>
                        </div>
                        <h3 className="font-semibold text-slate-900">{indicator.indicator}</h3>
                      </div>
                      <div className="ml-4">
                        {isExpanded ? (
                          <ChevronUp className="text-slate-400" size={20} />
                        ) : (
                          <ChevronDown className="text-slate-400" size={20} />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-slate-100">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">Explanation</h4>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{explanation.explanation}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">Required Evidence Types</h4>
                        <div className="flex flex-wrap gap-2">
                          {explanation.requiredEvidence.map((type, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium"
                            >
                              {getEvidenceTypeIcon(type)}
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">Evidence Description</h4>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{explanation.evidenceDescription}</p>
                      </div>
                      
                      <button
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          onSave(indicator.id, explanation);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                      >
                        <Save size={16} />
                        Save to Indicator
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Frequency Grouping Section
interface FrequencyGroupingSectionProps {
  indicators: Indicator[];
  frequencyGrouping: FrequencyGroupingResult | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  getIndicator: (id: string) => Indicator | undefined;
  getFrequencyColor: (freq: string) => { bg: string; border: string; text: string; icon: string };
  getFrequencyLabel: (freq: string) => string;
}

function FrequencyGroupingSection({
  indicators,
  frequencyGrouping,
  isAnalyzing,
  onAnalyze,
  getIndicator,
  getFrequencyColor,
  getFrequencyLabel,
}: FrequencyGroupingSectionProps) {
  const frequencyGroups = frequencyGrouping ? [
    { key: 'one_time', ids: frequencyGrouping.one_time },
    { key: 'daily', ids: frequencyGrouping.daily },
    { key: 'weekly', ids: frequencyGrouping.weekly },
    { key: 'monthly', ids: frequencyGrouping.monthly },
    { key: 'quarterly', ids: frequencyGrouping.quarterly },
    { key: 'annually', ids: frequencyGrouping.annually },
  ] : [];

  return (
    <div className="space-y-6">
      {!frequencyGrouping && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-center">
          <Calendar className="w-12 h-12 text-white mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Group by Compliance Frequency
          </h3>
          <p className="text-indigo-100 mb-6">
            Let AI identify and group indicators by their compliance frequency (One-time, Daily, Weekly, Monthly, Quarterly, Annually)
          </p>
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing || indicators.length === 0}
            className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-xl font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Analyzing...
              </>
            ) : (
              <>
                <Bot size={20} />
                Group by Compliance Frequency
              </>
            )}
          </button>
        </div>
      )}

      {frequencyGrouping && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Indicators Grouped by Frequency
            </h2>
            <div className="text-sm text-slate-500">
              Total: {indicators.length} indicators
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {frequencyGroups.map(({ key, ids }) => {
              const colors = getFrequencyColor(key);
              const label = getFrequencyLabel(key);
              
              return (
                <div
                  key={key}
                  className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}
                >
                  <div className="p-4 border-b border-white/50">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className={colors.icon} size={20} />
                      <h3 className={`font-semibold ${colors.text}`}>{label}</h3>
                    </div>
                    <p className={`text-sm font-medium ${colors.text}`}>
                      {ids.length} indicator{ids.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  <div className="p-4 max-h-96 overflow-y-auto">
                    {ids.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">No indicators</p>
                    ) : (
                      <div className="space-y-2">
                        {ids.map(id => {
                          const indicator = getIndicator(id);
                          if (!indicator) return null;
                          
                          return (
                            <div key={id} className="bg-white rounded-lg p-3 shadow-sm">
                              <p className="text-xs text-indigo-600 font-medium">{indicator.standard}</p>
                              <p className="text-sm text-slate-900 mt-1 line-clamp-2">{indicator.indicator}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// AI Assistance Section (existing functionality)
interface AIAssistanceSectionProps {
  indicators: Indicator[];
  nonCompliantIndicators: Indicator[];
  categorization: CategorizationResult | null;
  isAnalyzing: boolean;
  isGenerating: boolean;
  generationProgress: { current: number; total: number };
  onCategorize: () => void;
  onAutoWriteSOPs: () => void;
  onDeployForms: () => void;
  getIndicator: (id: string) => Indicator | undefined;
}

function AIAssistanceSection({
  nonCompliantIndicators,
  categorization,
  isAnalyzing,
  isGenerating,
  generationProgress,
  onCategorize,
  onAutoWriteSOPs,
  onDeployForms,
  getIndicator,
}: AIAssistanceSectionProps) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FileText className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">To Analyze</p>
              <p className="text-2xl font-bold text-slate-900">{nonCompliantIndicators.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Bot className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">AI Manageable</p>
              <p className="text-2xl font-bold text-slate-900">
                {categorization?.ai_fully_manageable.length || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <User className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Manual Required</p>
              <p className="text-2xl font-bold text-slate-900">
                {categorization?.manual.length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      {!categorization && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-center">
          <Sparkles className="w-12 h-12 text-white mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Analyze Your Compliance Tasks
          </h3>
          <p className="text-indigo-100 mb-6">
            Let AI categorize your {nonCompliantIndicators.length} pending indicators and suggest actions
          </p>
          <button
            onClick={onCategorize}
            disabled={isAnalyzing || nonCompliantIndicators.length === 0}
            className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-xl font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Analyzing...
              </>
            ) : (
              <>
                <Bot size={20} />
                Categorize Indicators
              </>
            )}
          </button>
        </div>
      )}

      {/* Generation Progress */}
      {isGenerating && (
        <div className="bg-indigo-50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="animate-spin text-indigo-600" />
            <span className="font-medium text-indigo-900">
              Generating SOPs... ({generationProgress.current}/{generationProgress.total})
            </span>
          </div>
          <div className="h-2 bg-indigo-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Categorization Results */}
      {categorization && !isGenerating && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Fully Manageable */}
          <CategoryColumn
            title="Fully AI Manageable"
            description="AI can generate all required documentation"
            icon={<Bot className="text-green-600" />}
            color="green"
            indicatorIds={categorization.ai_fully_manageable}
            getIndicator={getIndicator}
            action={{
              label: 'Auto-Write SOPs',
              icon: <Wand2 size={16} />,
              onClick: onAutoWriteSOPs,
            }}
          />
          
          {/* AI Assisted */}
          <CategoryColumn
            title="AI Assisted"
            description="AI can help with forms and templates"
            icon={<Sparkles className="text-purple-600" />}
            color="purple"
            indicatorIds={categorization.ai_assisted}
            getIndicator={getIndicator}
            action={{
              label: 'Deploy Forms',
              icon: <FileText size={16} />,
              onClick: onDeployForms,
            }}
          />
          
          {/* Manual */}
          <CategoryColumn
            title="Physical Action Required"
            description="Requires manual completion"
            icon={<User className="text-amber-600" />}
            color="amber"
            indicatorIds={categorization.manual}
            getIndicator={getIndicator}
          />
        </div>
      )}
    </div>
  );
}

interface CategoryColumnProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: 'green' | 'purple' | 'amber';
  indicatorIds: string[];
  getIndicator: (id: string) => Indicator | undefined;
  action?: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
  };
}

function CategoryColumn({
  title,
  description,
  icon,
  color,
  indicatorIds,
  getIndicator,
  action,
}: CategoryColumnProps) {
  const bgColors = {
    green: 'bg-green-50',
    purple: 'bg-purple-50',
    amber: 'bg-amber-50',
  };

  const borderColors = {
    green: 'border-green-200',
    purple: 'border-purple-200',
    amber: 'border-amber-200',
  };

  const buttonColors = {
    green: 'bg-green-600 hover:bg-green-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    amber: 'bg-amber-600 hover:bg-amber-700',
  };

  return (
    <div className={`rounded-xl border ${borderColors[color]} ${bgColors[color]} overflow-hidden`}>
      {/* Header */}
      <div className="p-4 border-b border-white/50">
        <div className="flex items-center gap-3 mb-2">
          {icon}
          <h3 className="font-semibold text-slate-900">{title}</h3>
        </div>
        <p className="text-sm text-slate-600">{description}</p>
        <p className="text-sm font-medium text-slate-700 mt-2">
          {indicatorIds.length} indicators
        </p>
      </div>
      
      {/* Action */}
      {action && indicatorIds.length > 0 && (
        <div className="p-4 border-b border-white/50">
          <button
            onClick={action.onClick}
            className={`w-full flex items-center justify-center gap-2 ${buttonColors[color]} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors`}
          >
            {action.icon}
            {action.label}
          </button>
        </div>
      )}
      
      {/* Indicators List */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {indicatorIds.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No indicators</p>
        ) : (
          <div className="space-y-2">
            {indicatorIds.map(id => {
              const indicator = getIndicator(id);
              if (!indicator) return null;
              
              return (
                <div key={id} className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-indigo-600 font-medium">{indicator.standard}</p>
                  <p className="text-sm text-slate-900 mt-1 line-clamp-2">{indicator.indicator}</p>
                  {indicator.isAICompleted && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                      <CheckCircle2 size={12} />
                      AI Completed
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
