import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { AuthenticatedLayout } from '../../components/layouts/AuthenticatedLayout';
import { useAuth } from '../../hooks/useAuth';
import { functions } from '../../services/firebase';
import { getProjectCanvasStoreApi } from '../../store/projectCanvasStore';
import {
  getLatestEstimationSession,
  subscribeToEstimationSession,
  startEstimationAnalysis,
  saveAnnotationSnapshot,
  markEstimationFailed,
} from '../../services/estimationService';
import type { EstimationSession, CSIDivision, AnnotationSnapshot, AnnotatedShape, AnnotatedLayer } from '../../types/estimation';
import type { EstimateConfig } from './PlanView';

/**
 * FinalView - Final estimate page that runs the estimation pipeline
 * and displays the generated JSON output.
 */
export function FinalView() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const location = useLocation();
  
  // Get estimate config from location state or use defaults
  const locationState = location.state as { estimateConfig?: EstimateConfig } | null;
  
  // Default start date: 2 weeks from today
  const defaultStartDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split('T')[0];
  }, []);
  
  const estimateConfig: EstimateConfig = locationState?.estimateConfig || {
    overheadPercent: 10,
    profitPercent: 10,
    contingencyPercent: 5,
    wasteFactorPercent: 10,
    startDate: defaultStartDate,
    scopeText: '',
  };
  
  const [session, setSession] = useState<EstimationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
  const [directResult, setDirectResult] = useState<Record<string, unknown> | null>(null);

  // Load and subscribe to session
  useEffect(() => {
    if (!projectId) return;

    let unsubscribe: (() => void) | undefined;

    const loadSession = async () => {
      try {
        const latestSession = await getLatestEstimationSession(projectId);
        if (latestSession) {
          setSession(latestSession);
          
          // Subscribe to real-time updates
          unsubscribe = subscribeToEstimationSession(projectId, latestSession.id, (updated) => {
            setSession(updated);
            if (updated?.status === 'complete' || updated?.status === 'error') {
              setAnalyzing(false);
            }
          });
        }
      } catch (err) {
        console.error('Failed to load estimation session:', err);
        setError('Failed to load estimation data');
      } finally {
        setLoading(false);
      }
    };

    loadSession();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [projectId]);

  const handleStartAnalysis = useCallback(async () => {
    if (!projectId || !user || !session) return;

    setAnalyzing(true);
    setError(null);

    try {
      // Capture current annotations from the project canvas store
      const projectStore = getProjectCanvasStoreApi(projectId);
      const storeState = projectStore.getState();
      
      // Build annotation snapshot from current canvas state
      const shapes = Array.from(storeState.shapes.values());
      const layers = storeState.layers;
      
      const annotatedShapes: AnnotatedShape[] = shapes.map((shape) => {
        const annotated: AnnotatedShape = {
          id: shape.id,
          type: shape.type,
          x: shape.x,
          y: shape.y,
          w: shape.w,
          h: shape.h,
          confidence: shape.confidence ?? 1.0,
          source: (shape.source || 'manual') as 'ai' | 'manual',
        };
        // Only add optional fields if they have values (Firestore rejects undefined)
        if (shape.itemType) annotated.label = shape.itemType;
        if (shape.itemType) annotated.itemType = shape.itemType;
        if (shape.points) annotated.points = shape.points;
        if (shape.layerId) annotated.layerId = shape.layerId;
        return annotated;
      });
      
      const annotatedLayers: AnnotatedLayer[] = layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible ?? true,
        shapeCount: shapes.filter((s) => s.layerId === layer.id).length,
      }));
      
      const annotationSnapshot: AnnotationSnapshot = {
        shapes: annotatedShapes,
        layers: annotatedLayers,
        capturedAt: Date.now(),
      };
      // Only add scale if scale line exists (Firestore rejects undefined values)
      const scaleLine = storeState.canvasScale.scaleLine;
      if (scaleLine && scaleLine.realWorldLength > 0 && scaleLine.unit) {
        // Calculate pixels per unit from scale line geometry
        const dx = scaleLine.endX - scaleLine.startX;
        const dy = scaleLine.endY - scaleLine.startY;
        const pixelLength = Math.sqrt(dx * dx + dy * dy);
        const pixelsPerUnit = pixelLength / scaleLine.realWorldLength;
        
        annotationSnapshot.scale = {
          pixelsPerUnit,
          unit: scaleLine.unit as 'feet' | 'inches' | 'meters',
        };
      }
      
      // Save annotation snapshot to session
      await saveAnnotationSnapshot(projectId, session.id, annotationSnapshot, user.uid);
      
      await startEstimationAnalysis(projectId, session.id, user.uid);

      // Call the estimation pipeline
      const estimationPipeline = httpsCallable(functions, 'estimationPipeline');

      // Build clarification data from messages
      const clarificationData: Record<string, unknown> = {};
      for (const msg of session.clarificationMessages) {
        if (msg.extractedData) {
          Object.assign(clarificationData, msg.extractedData);
        }
      }

      await estimationPipeline({
        projectId,
        sessionId: session.id,
        planImageUrl: session.planImageUrl,
        scopeText: session.scopeText,
        clarificationData,
        annotationSnapshot,
        passNumber: session.analysisPassCount + 1,
      });
    } catch (err) {
      console.error('Analysis failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      setAnalyzing(false);
      
      // Update session status to 'error' so the button becomes clickable again
      if (projectId && session && user) {
        try {
          await markEstimationFailed(projectId, session.id, errorMessage, user.uid);
        } catch (updateErr) {
          console.error('Failed to update session status:', updateErr);
        }
      }
    }
  }, [projectId, user, session]);

  const handleDownloadJSON = useCallback(() => {
    if (!session?.clarificationOutput) return;

    // Combine clarification output with estimate configuration
    const fullEstimateOutput = {
      ...session.clarificationOutput,
      projectScope: estimateConfig.scopeText,
      estimateConfiguration: {
        overheadPercent: estimateConfig.overheadPercent,
        profitPercent: estimateConfig.profitPercent,
        contingencyPercent: estimateConfig.contingencyPercent,
        materialWasteFactorPercent: estimateConfig.wasteFactorPercent,
        projectStartDate: estimateConfig.startDate,
      },
    };

    const blob = new Blob([JSON.stringify(fullEstimateOutput, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estimate-${session.clarificationOutput.estimateId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [session, estimateConfig]);

  const toggleDivision = useCallback((divKey: string) => {
    setExpandedDivisions((prev) => {
      const next = new Set(prev);
      if (next.has(divKey)) {
        next.delete(divKey);
      } else {
        next.add(divKey);
      }
      return next;
    });
  }, []);

  // Handle starting analysis without a pre-existing session
  // This must be defined before any early returns to maintain hooks order
  const handleStartNewAnalysis = useCallback(async () => {
    if (!projectId || !user) return;

    setAnalyzing(true);
    setError(null);

    try {
      // Capture current annotations from the project canvas store
      const projectStore = getProjectCanvasStoreApi(projectId);
      const storeState = projectStore.getState();
      
      // Build annotation snapshot from current canvas state
      const shapes = Array.from(storeState.shapes.values());
      const layers = storeState.layers;
      
      const annotatedShapes: AnnotatedShape[] = shapes.map((shape) => {
        const annotated: AnnotatedShape = {
          id: shape.id,
          type: shape.type,
          x: shape.x,
          y: shape.y,
          w: shape.w,
          h: shape.h,
          confidence: shape.confidence ?? 1.0,
          source: (shape.source || 'manual') as 'ai' | 'manual',
        };
        if (shape.itemType) annotated.label = shape.itemType;
        if (shape.itemType) annotated.itemType = shape.itemType;
        if (shape.points) annotated.points = shape.points;
        if (shape.layerId) annotated.layerId = shape.layerId;
        return annotated;
      });
      
      const annotatedLayers: AnnotatedLayer[] = layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible ?? true,
        shapeCount: shapes.filter((s) => s.layerId === layer.id).length,
      }));
      
      const annotationSnapshot: AnnotationSnapshot = {
        shapes: annotatedShapes,
        layers: annotatedLayers,
        capturedAt: Date.now(),
      };
      
      // Add scale if available
      const scaleLine = storeState.canvasScale.scaleLine;
      if (scaleLine && scaleLine.realWorldLength > 0 && scaleLine.unit) {
        const dx = scaleLine.endX - scaleLine.startX;
        const dy = scaleLine.endY - scaleLine.startY;
        const pixelLength = Math.sqrt(dx * dx + dy * dy);
        const pixelsPerUnit = pixelLength / scaleLine.realWorldLength;
        
        annotationSnapshot.scale = {
          pixelsPerUnit,
          unit: scaleLine.unit as 'feet' | 'inches' | 'meters',
        };
      }

      // Call the estimation pipeline directly
      const estimationPipeline = httpsCallable(functions, 'estimationPipeline');

      const result = await estimationPipeline({
        projectId,
        sessionId: `session-${Date.now()}`,
        planImageUrl: null,
        scopeText: estimateConfig.scopeText || 'No scope provided',
        clarificationData: {},
        annotationSnapshot,
        passNumber: 1,
        estimateConfig: {
          overheadPercent: estimateConfig.overheadPercent,
          profitPercent: estimateConfig.profitPercent,
          contingencyPercent: estimateConfig.contingencyPercent,
          wasteFactorPercent: estimateConfig.wasteFactorPercent,
          startDate: estimateConfig.startDate,
        },
      });

      console.log('Estimation pipeline result:', result.data);
      
      // Store the result for display
      setDirectResult(result.data as Record<string, unknown>);
      setAnalyzing(false);

    } catch (err) {
      console.error('Analysis failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      setAnalyzing(false);
    }
  }, [projectId, user, estimateConfig]);

  // Early return for loading state - AFTER all hooks are defined
  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="container-spacious py-section max-w-app pt-20 pb-14 md:pt-24">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-truecost-cyan border-t-transparent"></div>
              <p className="mt-2 text-sm text-truecost-text-secondary">Loading estimation...</p>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  // No session state
  if (!session) {
    return (
      <AuthenticatedLayout>
        <div className="container-spacious py-section max-w-app pt-20 pb-14 md:pt-24">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-body-meta font-medium text-white border border-truecost-glass-border">
                Final Estimate
              </span>
              <h1 className="font-heading text-h1 text-truecost-text-primary">
                Generate Estimate
              </h1>
              <p className="font-body text-body text-truecost-text-secondary/90">
                Run the estimation pipeline to generate your cost estimate based on your annotations.
              </p>
            </div>
            
            <button
              onClick={handleStartNewAnalysis}
              disabled={analyzing}
              className={`btn-pill-primary flex items-center gap-2 ${
                analyzing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {analyzing ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Start Analysis
                </>
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="glass-panel p-4 mb-6 border border-red-500/30 bg-red-500/10">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-red-300">Analysis Failed</p>
                  <p className="text-sm text-red-400 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Analyzing State */}
          {analyzing && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-truecost-cyan border-t-transparent"></div>
              <p className="mt-4 text-lg font-medium text-truecost-text-primary">Analyzing Plan...</p>
              <p className="mt-2 text-sm text-truecost-text-secondary">
                This may take a few minutes
              </p>
            </div>
          )}

          {/* Direct Result Display */}
          {directResult && !analyzing && (() => {
            // Extract clarification output from the result
            const clarificationOutput = (directResult as Record<string, unknown>).clarificationOutput as Record<string, unknown> | undefined;
            const projectBrief = clarificationOutput?.projectBrief as Record<string, unknown> | undefined;
            const csiScope = clarificationOutput?.csiScope as Record<string, CSIDivision> | undefined;
            const flags = clarificationOutput?.flags as { lowConfidenceItems?: Array<{field: string; reason: string}>; missingData?: string[] } | undefined;
            const estimateId = clarificationOutput?.estimateId as string | undefined;
            const scopeSummary = projectBrief?.scopeSummary as Record<string, unknown> | undefined;
            const location = projectBrief?.location as Record<string, unknown> | undefined;

            return (
              <div className="space-y-6">
                {/* Estimate Configuration */}
                <div className="glass-panel p-6">
                  <h2 className="text-lg font-semibold text-truecost-text-primary mb-4">Estimate Configuration</h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="glass-panel p-3 text-center bg-truecost-cyan/5 border-truecost-cyan/30">
                      <p className="text-2xl font-bold text-truecost-cyan">{estimateConfig.overheadPercent}%</p>
                      <p className="text-xs text-truecost-text-secondary mt-1">Overhead</p>
                    </div>
                    <div className="glass-panel p-3 text-center bg-truecost-cyan/5 border-truecost-cyan/30">
                      <p className="text-2xl font-bold text-truecost-cyan">{estimateConfig.profitPercent}%</p>
                      <p className="text-xs text-truecost-text-secondary mt-1">Profit</p>
                    </div>
                    <div className="glass-panel p-3 text-center bg-truecost-cyan/5 border-truecost-cyan/30">
                      <p className="text-2xl font-bold text-truecost-cyan">{estimateConfig.contingencyPercent}%</p>
                      <p className="text-xs text-truecost-text-secondary mt-1">Contingency</p>
                    </div>
                    <div className="glass-panel p-3 text-center bg-truecost-cyan/5 border-truecost-cyan/30">
                      <p className="text-2xl font-bold text-truecost-cyan">{estimateConfig.wasteFactorPercent}%</p>
                      <p className="text-xs text-truecost-text-secondary mt-1">Waste Factor</p>
                    </div>
                    <div className="glass-panel p-3 text-center bg-truecost-cyan/5 border-truecost-cyan/30">
                      <p className="text-lg font-bold text-truecost-cyan">
                        {new Date(estimateConfig.startDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </p>
                      <p className="text-xs text-truecost-text-secondary mt-1">Start Date</p>
                    </div>
                  </div>
                </div>

                {/* Project Summary */}
                {projectBrief && scopeSummary && (
                  <div className="glass-panel p-6">
                    <h2 className="text-lg font-semibold text-truecost-text-primary mb-4">Project Summary</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-truecost-text-secondary uppercase">Type</p>
                        <p className="text-sm font-medium text-truecost-text-primary">
                          {String(projectBrief.projectType || 'Unknown').replace(/_/g, ' ')}
                        </p>
                      </div>
                      {location && (
                        <div>
                          <p className="text-xs text-truecost-text-secondary uppercase">Location</p>
                          <p className="text-sm font-medium text-truecost-text-primary">
                            {String(location.city || '')}, {String(location.state || '')}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-truecost-text-secondary uppercase">Size</p>
                        <p className="text-sm font-medium text-truecost-text-primary">
                          {String(scopeSummary.totalSqft || '0')} sq ft
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-truecost-text-secondary uppercase">Finish Level</p>
                        <p className="text-sm font-medium text-truecost-text-primary capitalize">
                          {String(scopeSummary.finishLevel || 'standard').replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    
                    {typeof scopeSummary.description === 'string' && scopeSummary.description && (
                      <div className="mt-4 pt-4 border-t border-truecost-glass-border">
                        <p className="text-xs text-truecost-text-secondary uppercase mb-2">Description</p>
                        <p className="text-sm text-truecost-text-primary/80">{scopeSummary.description}</p>
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-4 gap-2">
                      <div className="glass-panel p-2 text-center bg-green-500/10 border-green-500/30">
                        <p className="text-lg font-bold text-green-400">{String(scopeSummary.totalIncluded || 0)}</p>
                        <p className="text-xs text-green-400/70">Included</p>
                      </div>
                      <div className="glass-panel p-2 text-center bg-red-500/10 border-red-500/30">
                        <p className="text-lg font-bold text-red-400">{String(scopeSummary.totalExcluded || 0)}</p>
                        <p className="text-xs text-red-400/70">Excluded</p>
                      </div>
                      <div className="glass-panel p-2 text-center bg-yellow-500/10 border-yellow-500/30">
                        <p className="text-lg font-bold text-yellow-400">{Array.isArray(scopeSummary.byOwnerDivisions) ? scopeSummary.byOwnerDivisions.length : 0}</p>
                        <p className="text-xs text-yellow-400/70">By Owner</p>
                      </div>
                      <div className="glass-panel p-2 text-center bg-gray-500/10 border-gray-500/30">
                        <p className="text-lg font-bold text-gray-400">{Array.isArray(scopeSummary.notApplicableDivisions) ? scopeSummary.notApplicableDivisions.length : 0}</p>
                        <p className="text-xs text-gray-400/70">N/A</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* CSI Scope Breakdown */}
                {csiScope && Object.keys(csiScope).length > 0 && (
                  <div className="glass-panel">
                    <div className="px-6 py-4 border-b border-truecost-glass-border">
                      <h2 className="text-lg font-semibold text-truecost-text-primary">CSI Scope Breakdown</h2>
                    </div>
                    
                    <div className="divide-y divide-truecost-glass-border">
                      {Object.entries(csiScope).map(([key, division]) => {
                        const div = division as CSIDivision;
                        const isExpanded = expandedDivisions.has(key);
                        const hasItems = div.items && div.items.length > 0;
                        
                        return (
                          <div key={key} className="px-6 py-3">
                            <button
                              onClick={() => toggleDivision(key)}
                              className="w-full flex items-center justify-between text-left"
                            >
                              <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                                <span className="text-sm font-mono text-truecost-text-secondary">{div.code}</span>
                                <span className="font-medium text-truecost-text-primary">{div.name}</span>
                                <span
                                  className={`px-2 py-0.5 text-xs rounded-full ${
                                    div.status === 'included'
                                      ? 'bg-green-500/20 text-green-400'
                                      : div.status === 'excluded'
                                      ? 'bg-red-500/20 text-red-400'
                                      : div.status === 'by_owner'
                                      ? 'bg-yellow-500/20 text-yellow-400'
                                      : 'bg-gray-500/20 text-gray-400'
                                  }`}
                                >
                                  {div.status.replace(/_/g, ' ')}
                                </span>
                                {hasItems && (
                                  <span className="text-xs text-truecost-text-secondary">
                                    ({div.items.length} items)
                                  </span>
                                )}
                              </div>
                              <svg
                                className={`w-5 h-5 text-truecost-text-secondary transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            
                            {isExpanded && (
                              <div className="mt-3 ml-12">
                                {div.description && (
                                  <p className="text-sm text-truecost-text-secondary mb-2">{div.description}</p>
                                )}
                                {div.exclusionReason && (
                                  <p className="text-sm text-red-400 italic mb-2">
                                    Reason: {div.exclusionReason}
                                  </p>
                                )}
                                
                                {hasItems && (
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-left text-xs text-truecost-text-secondary uppercase">
                                        <th className="pb-2">Item</th>
                                        <th className="pb-2 text-right">Qty</th>
                                        <th className="pb-2">Unit</th>
                                        <th className="pb-2 text-right">Confidence</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-truecost-glass-border/50">
                                      {div.items.map((item) => (
                                        <tr key={item.id}>
                                          <td className="py-2">
                                            <div className="font-medium text-truecost-text-primary">{item.item}</div>
                                            {item.specifications && (
                                              <div className="text-xs text-truecost-text-secondary">{item.specifications}</div>
                                            )}
                                          </td>
                                          <td className="py-2 text-right font-mono text-truecost-text-primary">{item.quantity}</td>
                                          <td className="py-2 text-truecost-text-secondary">{item.unit}</td>
                                          <td className="py-2 text-right">
                                            <span
                                              className={`inline-block w-12 text-center px-1 py-0.5 text-xs rounded ${
                                                item.confidence >= 0.9
                                                  ? 'bg-green-500/20 text-green-400'
                                                  : item.confidence >= 0.7
                                                  ? 'bg-yellow-500/20 text-yellow-400'
                                                  : 'bg-red-500/20 text-red-400'
                                              }`}
                                            >
                                              {Math.round(item.confidence * 100)}%
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Review Required Flags */}
                {flags && ((flags.lowConfidenceItems && flags.lowConfidenceItems.length > 0) || (flags.missingData && flags.missingData.length > 0)) && (
                  <div className="glass-panel p-6 bg-yellow-500/10 border-yellow-500/30">
                    <h2 className="text-lg font-semibold text-yellow-400 mb-4">Review Required</h2>
                    
                    {flags.lowConfidenceItems && flags.lowConfidenceItems.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-yellow-400/80 mb-2">Low Confidence Items</h3>
                        <ul className="list-disc list-inside text-sm text-yellow-400/70 space-y-1">
                          {flags.lowConfidenceItems.map((item, i) => (
                            <li key={i}>
                              <span className="font-mono text-xs">{item.field}</span>: {item.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {flags.missingData && flags.missingData.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-yellow-400/80 mb-2">Missing Data</h3>
                        <ul className="list-disc list-inside text-sm text-yellow-400/70 space-y-1">
                          {flags.missingData.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Project Scope */}
                {estimateConfig.scopeText && (
                  <div className="glass-panel p-6">
                    <h2 className="text-lg font-semibold text-truecost-text-primary mb-3">Project Scope</h2>
                    <p className="text-sm text-truecost-text-primary/80 whitespace-pre-wrap leading-relaxed">
                      {estimateConfig.scopeText}
                    </p>
                  </div>
                )}

                {/* Raw JSON Result */}
                <details className="glass-panel">
                  <summary className="px-6 py-4 cursor-pointer text-sm font-medium text-truecost-text-primary hover:bg-truecost-glass-bg/50">
                    View Raw JSON
                  </summary>
                  <pre className="px-6 py-4 text-xs overflow-auto max-h-96 bg-truecost-bg-secondary text-truecost-cyan rounded-b-lg">
                    {JSON.stringify(directResult, null, 2)}
                  </pre>
                </details>

                {/* Download Button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      const blob = new Blob([JSON.stringify({
                        ...directResult,
                        projectScope: estimateConfig.scopeText,
                        estimateConfiguration: {
                          overheadPercent: estimateConfig.overheadPercent,
                          profitPercent: estimateConfig.profitPercent,
                          contingencyPercent: estimateConfig.contingencyPercent,
                          materialWasteFactorPercent: estimateConfig.wasteFactorPercent,
                          projectStartDate: estimateConfig.startDate,
                        },
                      }, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `estimate-${estimateId || projectId}-${Date.now()}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="btn-pill-secondary flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download JSON
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Initial State - No result yet */}
          {!directResult && !analyzing && !error && (
            <div className="glass-panel p-8 text-center">
              <svg className="mx-auto h-16 w-16 text-truecost-text-secondary/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-truecost-text-primary mb-2">Ready to Generate Estimate</h3>
              <p className="text-truecost-text-secondary mb-6 max-w-md mx-auto">
                Click "Start Analysis" to run the estimation pipeline based on your annotations and project scope.
              </p>
              
              {/* Show estimate config summary */}
              <div className="flex flex-wrap justify-center gap-3 text-sm text-truecost-text-secondary">
                <span className="glass-panel px-3 py-1">Overhead: {estimateConfig.overheadPercent}%</span>
                <span className="glass-panel px-3 py-1">Profit: {estimateConfig.profitPercent}%</span>
                <span className="glass-panel px-3 py-1">Contingency: {estimateConfig.contingencyPercent}%</span>
                <span className="glass-panel px-3 py-1">Waste: {estimateConfig.wasteFactorPercent}%</span>
              </div>
            </div>
          )}
        </div>
      </AuthenticatedLayout>
    );
  }

  const output = session.clarificationOutput;

  return (
    <AuthenticatedLayout>
      <div className="container-spacious py-section max-w-app pt-20 pb-14 md:pt-24">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-body-meta font-medium text-white border border-truecost-glass-border">
            Final Estimate
            </span>
            <h1 className="font-heading text-h1 text-truecost-text-primary">
              {session.status === 'complete' && output
                ? `Estimate: ${output.estimateId}`
                : 'Generate Estimate'}
            </h1>
            <p className="font-body text-body text-truecost-text-secondary/90">
              {session.status === 'complete' && output
                ? 'Your estimation is complete. Review the breakdown below.'
                : 'Run the estimation pipeline to generate your cost estimate.'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {session.status === 'complete' && output && (
              <button
                onClick={handleDownloadJSON}
                className="btn-pill-secondary flex items-center gap-2"
              >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
                Download JSON
              </button>
            )}
            
            <button
              onClick={handleStartAnalysis}
              disabled={analyzing}
              className={`btn-pill-primary flex items-center gap-2 ${
                analyzing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {analyzing ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Analyzing...
                </>
              ) : session.status === 'error' ? (
                'Retry Analysis'
              ) : session.analysisPassCount > 0 ? (
                `Re-analyze (Pass ${session.analysisPassCount + 1})`
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Start Analysis
                </>
              )}
          </button>
          </div>
        </div>

        {/* Error Display */}
        {(error || session.status === 'error') && (
          <div className="glass-panel p-4 mb-6 border border-red-500/30 bg-red-500/10">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-red-300">Analysis Failed</p>
                  <p className="text-sm text-red-400 mt-1">{error || 'An error occurred during analysis. Please try again.'}</p>
                  <p className="text-xs text-red-500 mt-2">Click "Retry Analysis" to try again.</p>
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {analyzing || session.status === 'analyzing' ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-truecost-cyan border-t-transparent"></div>
            <p className="mt-4 text-lg font-medium text-truecost-text-primary">Analyzing Plan...</p>
            <p className="mt-2 text-sm text-truecost-text-secondary">
              Pass {session.analysisPassCount + 1} - This may take a few minutes
            </p>
          </div>
        ) : session.status === 'error' && !output ? (
          <div className="flex flex-col items-center justify-center py-16">
            <svg className="h-16 w-16 text-red-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-4 text-lg font-medium text-truecost-text-primary">Analysis Failed</p>
            <p className="mt-2 text-sm text-truecost-text-secondary text-center max-w-md">
              The analysis could not be completed. Please check your annotations and scale settings, then click "Retry Analysis".
            </p>
          </div>
        ) : output ? (
          <div className="space-y-6">
            {/* Project Brief Summary */}
            <div className="glass-panel p-6">
              <h2 className="text-lg font-semibold text-truecost-text-primary mb-4">Project Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-truecost-text-secondary uppercase">Type</p>
                  <p className="text-sm font-medium text-truecost-text-primary">
                    {output.projectBrief.projectType.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-truecost-text-secondary uppercase">Location</p>
                  <p className="text-sm font-medium text-truecost-text-primary">
                    {output.projectBrief.location.city}, {output.projectBrief.location.state}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-truecost-text-secondary uppercase">Size</p>
                  <p className="text-sm font-medium text-truecost-text-primary">
                    {output.projectBrief.scopeSummary.totalSqft} sq ft
                  </p>
                </div>
                <div>
                  <p className="text-xs text-truecost-text-secondary uppercase">Finish Level</p>
                  <p className="text-sm font-medium text-truecost-text-primary capitalize">
                    {output.projectBrief.scopeSummary.finishLevel.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-truecost-glass-border">
                <p className="text-xs text-truecost-text-secondary uppercase mb-2">Description</p>
                <p className="text-sm text-truecost-text-primary/80">{output.projectBrief.scopeSummary.description}</p>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                <div className="glass-panel p-2 text-center bg-green-500/10 border-green-500/30">
                  <p className="text-lg font-bold text-green-400">{output.projectBrief.scopeSummary.totalIncluded}</p>
                  <p className="text-xs text-green-400/70">Included</p>
                </div>
                <div className="glass-panel p-2 text-center bg-red-500/10 border-red-500/30">
                  <p className="text-lg font-bold text-red-400">{output.projectBrief.scopeSummary.totalExcluded}</p>
                  <p className="text-xs text-red-400/70">Excluded</p>
                </div>
                <div className="glass-panel p-2 text-center bg-yellow-500/10 border-yellow-500/30">
                  <p className="text-lg font-bold text-yellow-400">{output.projectBrief.scopeSummary.byOwnerDivisions.length}</p>
                  <p className="text-xs text-yellow-400/70">By Owner</p>
                </div>
                <div className="glass-panel p-2 text-center bg-truecost-glass-bg">
                  <p className="text-lg font-bold text-truecost-text-secondary">{output.projectBrief.scopeSummary.notApplicableDivisions.length}</p>
                  <p className="text-xs text-truecost-text-secondary/70">N/A</p>
                </div>
              </div>
            </div>

            {/* Project Scope */}
            {estimateConfig.scopeText && (
              <div className="glass-panel p-6">
                <h2 className="text-lg font-semibold text-truecost-text-primary mb-3">Project Scope</h2>
                <p className="text-sm text-truecost-text-primary/80 whitespace-pre-wrap leading-relaxed">
                  {estimateConfig.scopeText}
                </p>
              </div>
            )}

            {/* Estimate Configuration */}
            <div className="glass-panel p-6">
              <h2 className="text-lg font-semibold text-truecost-text-primary mb-4">Estimate Configuration</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="glass-panel p-3 text-center bg-truecost-cyan/5 border-truecost-cyan/30">
                  <p className="text-2xl font-bold text-truecost-cyan">{estimateConfig.overheadPercent}%</p>
                  <p className="text-xs text-truecost-text-secondary mt-1">Overhead</p>
                </div>
                <div className="glass-panel p-3 text-center bg-truecost-cyan/5 border-truecost-cyan/30">
                  <p className="text-2xl font-bold text-truecost-cyan">{estimateConfig.profitPercent}%</p>
                  <p className="text-xs text-truecost-text-secondary mt-1">Profit</p>
                </div>
                <div className="glass-panel p-3 text-center bg-truecost-cyan/5 border-truecost-cyan/30">
                  <p className="text-2xl font-bold text-truecost-cyan">{estimateConfig.contingencyPercent}%</p>
                  <p className="text-xs text-truecost-text-secondary mt-1">Contingency</p>
                </div>
                <div className="glass-panel p-3 text-center bg-truecost-cyan/5 border-truecost-cyan/30">
                  <p className="text-2xl font-bold text-truecost-cyan">{estimateConfig.wasteFactorPercent}%</p>
                  <p className="text-xs text-truecost-text-secondary mt-1">Waste Factor</p>
                </div>
                <div className="glass-panel p-3 text-center bg-truecost-cyan/5 border-truecost-cyan/30">
                  <p className="text-lg font-bold text-truecost-cyan">
                    {new Date(estimateConfig.startDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                  <p className="text-xs text-truecost-text-secondary mt-1">Start Date</p>
                </div>
              </div>
            </div>

            {/* CSI Scope Divisions */}
            <div className="glass-panel">
              <div className="px-6 py-4 border-b border-truecost-glass-border">
                <h2 className="text-lg font-semibold text-truecost-text-primary">CSI Scope Breakdown</h2>
              </div>
              
              <div className="divide-y divide-truecost-glass-border/50">
                {Object.entries(output.csiScope).map(([key, division]) => {
                  const div = division as CSIDivision;
                  const isExpanded = expandedDivisions.has(key);
                  const hasItems = div.items && div.items.length > 0;
                  
                  return (
                    <div key={key} className="px-6 py-3">
                      <button
                        onClick={() => toggleDivision(key)}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-mono text-truecost-text-secondary">{div.code}</span>
                          <span className="font-medium text-truecost-text-primary">{div.name}</span>
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              div.status === 'included'
                                ? 'bg-green-500/20 text-green-400'
                                : div.status === 'excluded'
                                ? 'bg-red-500/20 text-red-400'
                                : div.status === 'by_owner'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-truecost-glass-bg text-truecost-text-secondary'
                            }`}
                          >
                            {div.status.replace(/_/g, ' ')}
                          </span>
                          {hasItems && (
                            <span className="text-xs text-truecost-text-secondary">
                              ({div.items.length} items)
                            </span>
                          )}
                        </div>
                        <svg
                          className={`w-5 h-5 text-truecost-text-secondary transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {isExpanded && (
                        <div className="mt-3 ml-12">
                          {div.description && (
                            <p className="text-sm text-truecost-text-secondary mb-2">{div.description}</p>
                          )}
                          {div.exclusionReason && (
                            <p className="text-sm text-red-400 italic mb-2">
                              Reason: {div.exclusionReason}
                            </p>
                          )}
                          
                          {hasItems && (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-xs text-truecost-text-secondary uppercase">
                                  <th className="pb-2">Item</th>
                                  <th className="pb-2 text-right">Qty</th>
                                  <th className="pb-2">Unit</th>
                                  <th className="pb-2 text-right">Confidence</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-truecost-glass-border/30">
                                {div.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="py-2">
                                      <div className="font-medium text-truecost-text-primary">{item.item}</div>
                                      {item.specifications && (
                                        <div className="text-xs text-truecost-text-secondary">{item.specifications}</div>
                                      )}
                                    </td>
                                    <td className="py-2 text-right font-mono text-truecost-text-primary">{item.quantity}</td>
                                    <td className="py-2 text-truecost-text-secondary">{item.unit}</td>
                                    <td className="py-2 text-right">
                                      <span
                                        className={`inline-block w-12 text-center px-1 py-0.5 text-xs rounded ${
                                          item.confidence >= 0.9
                                            ? 'bg-green-500/20 text-green-400'
                                            : item.confidence >= 0.7
                                            ? 'bg-yellow-500/20 text-yellow-400'
                                            : 'bg-red-500/20 text-red-400'
                                        }`}
                                      >
                                        {Math.round(item.confidence * 100)}%
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Flags */}
            {(output.flags.lowConfidenceItems.length > 0 || output.flags.missingData.length > 0) && (
              <div className="glass-panel p-6 border border-yellow-500/30 bg-yellow-500/5">
                <h2 className="text-lg font-semibold text-yellow-400 mb-4">Review Required</h2>
                
                {output.flags.lowConfidenceItems.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-yellow-400/80 mb-2">Low Confidence Items</h3>
                    <ul className="list-disc list-inside text-sm text-yellow-300/70 space-y-1">
                      {output.flags.lowConfidenceItems.map((item, i) => (
                        <li key={i}>
                          <span className="font-mono text-xs">{item.field}</span>: {item.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {output.flags.missingData.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-yellow-400/80 mb-2">Missing Data</h3>
                    <ul className="list-disc list-inside text-sm text-yellow-300/70 space-y-1">
                      {output.flags.missingData.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Raw JSON Viewer */}
            <details className="glass-panel">
              <summary className="px-6 py-4 cursor-pointer text-sm font-medium text-truecost-text-primary hover:bg-truecost-glass-bg/50">
                View Raw JSON
              </summary>
              <pre className="px-6 py-4 text-xs overflow-auto max-h-96 bg-truecost-bg-secondary text-truecost-cyan rounded-b-lg">
                {JSON.stringify({
                  ...output,
                  projectScope: estimateConfig.scopeText,
                  estimateConfiguration: {
                    overheadPercent: estimateConfig.overheadPercent,
                    profitPercent: estimateConfig.profitPercent,
                    contingencyPercent: estimateConfig.contingencyPercent,
                    materialWasteFactorPercent: estimateConfig.wasteFactorPercent,
                    projectStartDate: estimateConfig.startDate,
                  },
                }, null, 2)}
              </pre>
            </details>
          </div>
        ) : (
          <div className="glass-panel p-8 text-center">
            <svg className="mx-auto h-16 w-16 text-truecost-text-secondary/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-truecost-text-secondary mb-6">
              Complete the annotation process on the Canvas tab, then click "Start Analysis" to generate the estimate.
            </p>
            <button
              onClick={handleStartAnalysis}
              disabled={analyzing}
              className="btn-pill-primary"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Start Analysis
            </button>
        </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
