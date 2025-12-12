/**
 * EstimatePage - Two-phase estimate generation and results view
 * Story: 6-2 - Estimate Page with Two-Phase UI, Tabs & Dual PDF Export
 *
 * Phase 1: Generate Estimate
 * - Shows "Generate Estimate" button if no estimate exists
 * - Progress bar showing pipeline stage during generation
 * - Real-time updates via Firestore subscription
 *
 * Phase 2: Results View
 * - Five tabs: Materials, Labor, Time, Price Comparison, Estimate vs Actual
 * - Dual PDF export buttons (Contractor/Client)
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthenticatedLayout } from '../../components/layouts/AuthenticatedLayout';
import { EstimateStepper } from '../../components/estimate/EstimateStepper';
import { MoneyView } from '../../components/money/MoneyView';
import { ComparisonView } from '../../components/money/ComparisonView';
import { TimeView } from '../../components/time/TimeView';
import { PriceComparisonPanel } from '../../components/estimate/PriceComparisonPanel';
import { useCanvasStore } from '../../store/canvasStore';
import { useAuth } from '../../hooks/useAuth';
import { getBOM } from '../../services/bomService';
import {
  subscribeToPipelineProgress,
  triggerEstimatePipeline,
  type PipelineProgress,
  INITIAL_PROGRESS,
  PIPELINE_STAGES,
} from '../../services/pipelineService';
import {
  generateContractorPDF,
  generateClientPDF,
  openPDFInNewTab,
} from '../../services/pdfService';

type EstimatePhase = 'generate' | 'results';
type ResultTab = 'materials' | 'labor' | 'time' | 'priceComparison' | 'estimateVsActual';

/**
 * Tab configuration for the results view
 */
const RESULT_TABS: { id: ResultTab; label: string }[] = [
  { id: 'materials', label: 'Materials' },
  { id: 'labor', label: 'Labor' },
  { id: 'time', label: 'Time' },
  { id: 'priceComparison', label: 'Price Comparison' },
  { id: 'estimateVsActual', label: 'Estimate vs Actual' },
];

export function EstimatePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Phase state
  const [phase, setPhase] = useState<EstimatePhase>('generate');
  const [activeTab, setActiveTab] = useState<ResultTab>('materials');

  // Pipeline progress state
  const [progress, setProgress] = useState<PipelineProgress>(INITIAL_PROGRESS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PDF generation state
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfType, setPdfType] = useState<'contractor' | 'client' | null>(null);

  // BOM state from store
  const billOfMaterials = useCanvasStore((state) => state.billOfMaterials);
  const setBillOfMaterials = useCanvasStore((state) => state.setBillOfMaterials);

  // Check if estimate already exists on mount
  useEffect(() => {
    if (!projectId) return;

    const checkExistingEstimate = async () => {
      try {
        const bom = await getBOM(projectId);
        if (bom && bom.totalMaterials.length > 0) {
          setBillOfMaterials(bom);
          setPhase('results');
        }
      } catch (err) {
        console.error('Error checking existing estimate:', err);
      }
    };

    checkExistingEstimate();
  }, [projectId, setBillOfMaterials]);

  // Subscribe to pipeline progress
  useEffect(() => {
    if (!projectId || phase !== 'generate' || !isGenerating) return;

    const unsubscribe = subscribeToPipelineProgress(
      projectId,
      (newProgress) => {
        setProgress(newProgress);

        // Check if pipeline completed
        if (newProgress.status === 'complete') {
          setIsGenerating(false);
          // Load the generated BOM
          getBOM(projectId).then((bom) => {
            if (bom) {
              setBillOfMaterials(bom);
              setPhase('results');
            }
          });
        } else if (newProgress.status === 'error') {
          setIsGenerating(false);
          setError(newProgress.error || 'Pipeline failed');
        }
      },
      (err) => {
        setError(err.message);
        setIsGenerating(false);
      }
    );

    return () => unsubscribe();
  }, [projectId, phase, isGenerating, setBillOfMaterials]);

  // Handle generate estimate button click
  const handleGenerateEstimate = useCallback(async () => {
    if (!projectId || !user) return;

    setIsGenerating(true);
    setError(null);
    setProgress({ ...INITIAL_PROGRESS, status: 'running', startedAt: Date.now() });

    try {
      const result = await triggerEstimatePipeline(projectId, user.uid);

      if (!result.success) {
        setError(result.error || 'Failed to start pipeline');
        setIsGenerating(false);
      }
      // If successful, the subscription will handle progress updates
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsGenerating(false);
    }
  }, [projectId, user]);

  // Handle PDF generation
  const handleGeneratePDF = useCallback(
    async (type: 'contractor' | 'client') => {
      if (!projectId) return;

      setIsGeneratingPDF(true);
      setPdfType(type);

      try {
        const result =
          type === 'contractor'
            ? await generateContractorPDF(projectId)
            : await generateClientPDF(projectId);

        if (result.success && result.pdfUrl) {
          openPDFInNewTab(result.pdfUrl);
        } else {
          setError(result.error || 'PDF generation failed');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'PDF generation failed');
      } finally {
        setIsGeneratingPDF(false);
        setPdfType(null);
      }
    },
    [projectId]
  );

  // Navigation handlers
  const handleBackToAnnotate = () => {
    if (projectId) {
      navigate(`/project/${projectId}/annotate`);
    }
  };

  // Completed steps for stepper
  const completedSteps: ('scope' | 'annotate' | 'estimate')[] = ['scope', 'annotate'];

  // Render Phase 1: Generate Estimate
  const renderGeneratePhase = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] glass-panel p-8">
      {isGenerating ? (
        // Progress view
        <div className="w-full max-w-xl">
          <div className="text-center mb-8">
            <h2 className="font-heading text-h2 text-truecost-text-primary mb-2">
              Generating Your Estimate
            </h2>
            <p className="text-body text-truecost-text-secondary">
              Our AI agents are analyzing your project...
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-body-meta text-truecost-text-secondary mb-2">
              <span>{progress.stageName || 'Starting...'}</span>
              <span>{progress.progressPercent}%</span>
            </div>
            <div className="w-full h-3 bg-truecost-glass-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-truecost-cyan to-truecost-teal transition-all duration-500 ease-out"
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Stage checklist */}
          <div className="space-y-2">
            {PIPELINE_STAGES.map((stage) => {
              const isCompleted = progress.completedStages.includes(stage.id);
              const isCurrent = progress.currentStage === stage.id;

              return (
                <div
                  key={stage.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isCompleted
                      ? 'bg-truecost-cyan/10 text-truecost-cyan'
                      : isCurrent
                        ? 'bg-truecost-glass-bg text-truecost-text-primary animate-pulse'
                        : 'text-truecost-text-muted'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : isCurrent ? (
                    <div className="w-5 h-5 border-2 border-truecost-cyan rounded-full border-t-transparent animate-spin" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-truecost-glass-border rounded-full" />
                  )}
                  <span className="text-body">{stage.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Initial generate button view
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-truecost-cyan/20 to-truecost-teal/20 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-truecost-cyan"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="font-heading text-h2 text-truecost-text-primary mb-3">
            Ready to Generate Your Estimate
          </h2>
          <p className="text-body text-truecost-text-secondary mb-8 max-w-md">
            Our AI will analyze your project scope, calculate materials, estimate costs, and
            generate a comprehensive estimate.
          </p>
          <button
            onClick={handleGenerateEstimate}
            className="btn-pill-primary px-8 py-3 text-lg"
          >
            Generate Estimate
          </button>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          <p className="font-semibold mb-1">Error</p>
          <p className="text-body-meta">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setProgress(INITIAL_PROGRESS);
            }}
            className="mt-2 text-truecost-cyan hover:underline text-body-meta"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );

  // Render Phase 2: Results tabs
  const renderResultsPhase = () => (
    <div className="space-y-6">
      {/* PDF Export buttons */}
      <div className="flex flex-wrap gap-3 justify-end">
        <button
          onClick={() => handleGeneratePDF('contractor')}
          disabled={isGeneratingPDF}
          className="btn-pill-secondary flex items-center gap-2"
        >
          {isGeneratingPDF && pdfType === 'contractor' ? (
            <div className="w-4 h-4 border-2 border-current rounded-full border-t-transparent animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          )}
          Contractor Estimate
        </button>
        <button
          onClick={() => handleGeneratePDF('client')}
          disabled={isGeneratingPDF}
          className="btn-pill-primary flex items-center gap-2"
        >
          {isGeneratingPDF && pdfType === 'client' ? (
            <div className="w-4 h-4 border-2 border-current rounded-full border-t-transparent animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          )}
          Client Estimate
        </button>
      </div>

      {/* Tab navigation */}
      <div className="glass-panel p-1">
        <div className="flex flex-wrap gap-1">
          {RESULT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-body font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-br from-truecost-cyan to-truecost-teal text-truecost-bg-primary'
                  : 'text-truecost-text-secondary hover:text-truecost-text-primary hover:bg-truecost-glass-bg'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="glass-panel p-0 overflow-hidden">
        {activeTab === 'materials' && (
          <MoneyView mode="materials" />
        )}
        {activeTab === 'labor' && (
          <MoneyView mode="labor" />
        )}
        {activeTab === 'time' && projectId && (
          <TimeView projectId={projectId} />
        )}
        {activeTab === 'priceComparison' && projectId && (
          <PriceComparisonPanel projectId={projectId} />
        )}
        {activeTab === 'estimateVsActual' && billOfMaterials && (
          <div className="p-6">
            <ComparisonView bom={billOfMaterials} />
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-truecost-cyan hover:underline text-body-meta"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-truecost-bg-primary">
      <AuthenticatedLayout>
        <div className="container-spacious max-w-full pt-20 pb-14 md:pt-24">
          {/* Stepper */}
          {projectId && (
            <EstimateStepper
              currentStep="estimate"
              projectId={projectId}
              completedSteps={completedSteps}
            />
          )}

          {/* Header */}
          <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-body-meta font-medium text-white border border-truecost-glass-border">
                Estimate
              </span>
              <h1 className="font-heading text-h1 text-truecost-text-primary">
                {phase === 'generate' ? 'Generate Estimate' : 'Project Estimate'}
              </h1>
              <p className="font-body text-body text-truecost-text-secondary/90">
                {phase === 'generate'
                  ? 'Generate a comprehensive estimate for your construction project.'
                  : 'Review your estimate details and export reports.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleBackToAnnotate} className="btn-pill-secondary">
                Back to Annotate
              </button>
            </div>
          </div>

          {/* Main content */}
          {phase === 'generate' ? renderGeneratePhase() : renderResultsPhase()}
        </div>
      </AuthenticatedLayout>
    </div>
  );
}
