/**
 * Scope View Component
 * Main component for Scope view with CSV upload and display
 */

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useScopeStore } from '../../store/scopeStore';
import { ScopeUpload } from './ScopeUpload';
import { ScopeDisplay } from './ScopeDisplay';
import { FloatingAIChat } from '../shared/FloatingAIChat';

export function ScopeView() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { scope, loading, error, uploadScopeItems } = useScopeStore();

  // Set up real-time subscription
  useEffect(() => {
    if (!projectId) return;
    
    // Use getState() to avoid dependency issues
    const { subscribe } = useScopeStore.getState();
    subscribe(projectId);
    
    return () => {
      const currentUnsubscribe = useScopeStore.getState().unsubscribe;
      if (currentUnsubscribe) {
        currentUnsubscribe();
      }
    };
  }, [projectId]); // Only depend on projectId to prevent infinite loops

  const handleUpload = async (items: Array<{ scope: string; description: string }>) => {
    if (!projectId || !user) return;
    
    try {
      await uploadScopeItems(projectId, items, user.uid);
    } catch (error) {
      console.error('Failed to upload scope:', error);
    }
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Scope of Work</h1>
          
          {/* Upload Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Upload Scope</h2>
            <ScopeUpload onUpload={handleUpload} loading={loading} />
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}
          
          {/* Display Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Scope Items</h2>
            {loading && !scope ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-2 text-sm text-gray-600">Loading scope...</p>
              </div>
            ) : scope && scope.items.length > 0 ? (
              <ScopeDisplay items={scope.items} />
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-500">No scope uploaded yet</p>
                <p className="text-sm text-gray-400 mt-2">Upload a CSV file to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Floating AI Chat Button */}
      <FloatingAIChat />
    </div>
  );
}

