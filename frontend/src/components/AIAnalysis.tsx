import { useState, useCallback } from 'react';
import { 
  Bot, 
  Sparkles, 
  Wand2, 
  FileText, 
  User,
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Indicator, CategorizationResult } from '../types';
import { api } from '../services/api';

interface AIAnalysisProps {
  indicators: Indicator[];
  onUpdateIndicator: (id: string, data: Partial<Indicator>) => void;
}

export default function AIAnalysis({
  indicators,
  onUpdateIndicator,
}: AIAnalysisProps) {
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

  const getIndicatorById = (id: string) => indicators.find(i => i.id === id);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Analysis</h1>
          <p className="text-slate-500 mt-1">
            Let AI categorize and assist with your compliance tasks
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
            onClick={handleCategorize}
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
            getIndicator={getIndicatorById}
            action={{
              label: 'Auto-Write SOPs',
              icon: <Wand2 size={16} />,
              onClick: handleAutoWriteSOPs,
            }}
          />
          
          {/* AI Assisted */}
          <CategoryColumn
            title="AI Assisted"
            description="AI can help with forms and templates"
            icon={<Sparkles className="text-purple-600" />}
            color="purple"
            indicatorIds={categorization.ai_assisted}
            getIndicator={getIndicatorById}
            action={{
              label: 'Deploy Forms',
              icon: <FileText size={16} />,
              onClick: handleDeployForms,
            }}
          />
          
          {/* Manual */}
          <CategoryColumn
            title="Physical Action Required"
            description="Requires manual completion"
            icon={<User className="text-amber-600" />}
            color="amber"
            indicatorIds={categorization.manual}
            getIndicator={getIndicatorById}
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
