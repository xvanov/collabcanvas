/**
 * Scope View Component
 * Main component for Scope view with scope input, plan upload, and clarification chat
 */

import { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useEstimationStore } from '../../store/estimationStore';
import { ScopeInputPanel } from './ScopeInputPanel';
import { ClarificationChat } from './ClarificationChat';
import { saveBackgroundImage } from '../../services/firestore';
import type { PlanImage } from '../../types/scope';
import type { ClarificationMessage } from '../../types/estimation';

type WorkflowStep = 'input' | 'clarify' | 'complete';

export function ScopeView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { 
    session, 
    loading, 
    error, 
    loadSession, 
    createSession, 
    addMessage,
    markClarificationComplete,
    cleanup,
  } = useEstimationStore();

  const [currentStep, setCurrentStep] = useState<WorkflowStep>('input');

  // Load existing session on mount
  useEffect(() => {
    if (!projectId) return;
    loadSession(projectId);
    
    return () => cleanup();
  }, [projectId]);

  // Determine current step based on session state
  useEffect(() => {
    if (!session) {
      setCurrentStep('input');
    } else if (session.clarificationComplete) {
      setCurrentStep('complete');
    } else if (session.clarificationMessages.length > 0) {
      setCurrentStep('clarify');
    } else {
      setCurrentStep('clarify');
    }
  }, [session]);

  const handleScopeSubmit = useCallback(async (scopeText: string, planImage: PlanImage) => {
    if (!projectId || !user) return;
    
    try {
      await createSession(projectId, scopeText, planImage, user.uid);
      setCurrentStep('clarify');
    } catch (err) {
      console.error('Failed to create estimation session:', err);
    }
  }, [projectId, user, createSession]);

  const handleMessageAdd = useCallback(async (message: Omit<ClarificationMessage, 'id' | 'timestamp'>) => {
    if (!projectId || !session || !user) return;
    
    try {
      await addMessage(projectId, session.id, message, user.uid);
    } catch (err) {
      console.error('Failed to add message:', err);
    }
  }, [projectId, session, user, addMessage]);

  const handleClarificationComplete = useCallback(async (_extractedData: Record<string, unknown>) => {
    if (!projectId || !session || !user) return;
    
    try {
      await markClarificationComplete(projectId, session.id, user.uid);
      setCurrentStep('complete');
    } catch (err) {
      console.error('Failed to complete clarification:', err);
    }
  }, [projectId, session, user, markClarificationComplete]);

  const handleProceedToSpace = useCallback(async () => {
    if (!projectId || !user || !session) return;
    
    // Set the plan image as background for the Space tab
    if (session.planImageUrl) {
      try {
        // Get image dimensions if we have them from the session
        // For now, we'll use placeholder dimensions - they'll be updated when the image loads
        await saveBackgroundImage(
          {
            url: session.planImageUrl,
            width: 1000, // Will be overridden by actual image dimensions on load
            height: 800,
          },
          user.uid,
          projectId
        );
      } catch (err) {
        console.error('Failed to set plan as background:', err);
        // Continue navigation even if background setting fails
      }
    }
    
    navigate(`/projects/${projectId}/space`);
  }, [projectId, navigate, user, session]);

  if (loading && !session) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Project Scope</h1>
            <p className="text-sm text-gray-500 mt-1">
              {currentStep === 'input' && 'Describe your project and upload the floor plan'}
              {currentStep === 'clarify' && 'Answer questions to clarify your project scope'}
              {currentStep === 'complete' && 'Scope clarification complete - proceed to annotate your plan'}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center space-x-4">
              <StepIndicator 
                step={1} 
                label="Input" 
                active={currentStep === 'input'}
                complete={currentStep !== 'input'}
              />
              <div className="flex-1 h-0.5 bg-gray-200">
                <div 
                  className={`h-full bg-blue-600 transition-all ${
                    currentStep === 'input' ? 'w-0' : currentStep === 'clarify' ? 'w-1/2' : 'w-full'
                  }`}
                />
              </div>
              <StepIndicator 
                step={2} 
                label="Clarify" 
                active={currentStep === 'clarify'}
                complete={currentStep === 'complete'}
              />
              <div className="flex-1 h-0.5 bg-gray-200">
                <div 
                  className={`h-full bg-blue-600 transition-all ${
                    currentStep === 'complete' ? 'w-full' : 'w-0'
                  }`}
                />
              </div>
              <StepIndicator 
                step={3} 
                label="Annotate" 
                active={false}
                complete={false}
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Content based on step */}
          {currentStep === 'input' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <ScopeInputPanel 
                  onScopeSubmit={handleScopeSubmit}
                  loading={loading}
                  existingScope={session?.scopeText}
                  existingImage={session?.planImageUrl ? {
                    url: session.planImageUrl,
                    fileName: session.planImageFileName,
                    fileSize: 0,
                    width: 0,
                    height: 0,
                    uploadedAt: 0,
                  } : undefined}
                />
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-medium text-gray-900 mb-4">Tips for Better Estimates</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Include the project location (city, state, zip)
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Describe the finish level (budget, mid-range, high-end)
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Mention any special requirements or constraints
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Upload a clear, scaled floor plan image
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Note what's included vs excluded from scope
                  </li>
                </ul>
              </div>
            </div>
          )}

          {currentStep === 'clarify' && session && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Plan Preview */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-medium text-gray-900">Floor Plan</h3>
                </div>
                <div className="p-4">
                  {session.planImageUrl && (
                    <img 
                      src={session.planImageUrl} 
                      alt="Floor plan" 
                      className="w-full rounded-lg"
                    />
                  )}
                </div>
                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {session.scopeText}
                  </p>
                </div>
              </div>

              {/* Clarification Chat */}
              <div className="h-[600px]">
                <ClarificationChat
                  projectId={projectId!}
                  sessionId={session.id}
                  scopeText={session.scopeText}
                  messages={session.clarificationMessages}
                  onMessageAdd={handleMessageAdd}
                  onComplete={handleClarificationComplete}
                />
              </div>
            </div>
          )}

          {currentStep === 'complete' && session && (
            <div className="max-w-2xl mx-auto text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Clarification Complete!</h2>
              <p className="text-gray-600 mb-8">
                Your project scope has been clarified. The next step is to annotate your floor plan
                in the Space tab to identify walls, doors, windows, and other elements.
              </p>
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setCurrentStep('clarify')}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Review Conversation
                </button>
                <button
                  onClick={handleProceedToSpace}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Proceed to Annotate Plan →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Step Indicator Component
function StepIndicator({ 
  step, 
  label, 
  active, 
  complete 
}: { 
  step: number; 
  label: string; 
  active: boolean; 
  complete: boolean;
}) {
  return (
    <div className="flex items-center space-x-2">
      <div 
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          complete 
            ? 'bg-blue-600 text-white'
            : active 
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-500'
        }`}
      >
        {complete ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          step
        )}
      </div>
      <span className={`text-sm font-medium ${active ? 'text-blue-600' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}

