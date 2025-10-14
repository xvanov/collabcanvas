/**
 * Hook for managing offline state and connection handling
 * Integrates with existing hooks to provide seamless offline/online experience
 */

import { useEffect, useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { offlineManager, type ConnectionState } from '../services/offline';

/**
 * Hook for managing offline state and connection handling
 */
export function useOffline() {
  const {
    connectionState,
    setConnectionState,
    queuedUpdatesCount,
    setQueuedUpdatesCount,
  } = useCanvasStore();

  /**
   * Handle connection state changes
   */
  const handleConnectionStateChange = useCallback((state: ConnectionState) => {
    setConnectionState(state);
    setQueuedUpdatesCount(offlineManager.getQueuedUpdatesCount());
  }, [setConnectionState, setQueuedUpdatesCount]);

  /**
   * Set up connection state listener
   */
  useEffect(() => {
    const unsubscribe = offlineManager.addConnectionListener(handleConnectionStateChange);
    return unsubscribe;
  }, [handleConnectionStateChange]);

  /**
   * Update queued updates count periodically
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const count = offlineManager.getQueuedUpdatesCount();
      setQueuedUpdatesCount(count);
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [setQueuedUpdatesCount]);

  /**
   * Get connection status
   */
  const isOnline = connectionState.isOnline;
  const isFirestoreOnline = connectionState.isFirestoreOnline;
  const isRTDBOnline = connectionState.isRTDBOnline;
  const hasQueuedUpdates = queuedUpdatesCount > 0;

  /**
   * Get connection status text for UI
   */
  const getConnectionStatus = useCallback(() => {
    if (!isOnline) {
      return 'Offline';
    }
    if (!isFirestoreOnline || !isRTDBOnline) {
      return 'Connecting...';
    }
    if (hasQueuedUpdates) {
      return `Syncing (${queuedUpdatesCount} updates)`;
    }
    return 'Online';
  }, [isOnline, isFirestoreOnline, isRTDBOnline, hasQueuedUpdates, queuedUpdatesCount]);

  /**
   * Get connection status color for UI
   */
  const getConnectionStatusColor = useCallback(() => {
    if (!isOnline) {
      return 'text-red-500';
    }
    if (!isFirestoreOnline || !isRTDBOnline) {
      return 'text-yellow-500';
    }
    if (hasQueuedUpdates) {
      return 'text-blue-500';
    }
    return 'text-green-500';
  }, [isOnline, isFirestoreOnline, isRTDBOnline, hasQueuedUpdates]);

  /**
   * Force retry queued updates (for manual retry)
   */
  const retryQueuedUpdates = useCallback(async () => {
    if (isOnline && hasQueuedUpdates) {
      console.log('🔄 Manual retry of queued updates...');
      // The offline manager will handle the retry automatically
      // This is mainly for UI feedback
    }
  }, [isOnline, hasQueuedUpdates]);

  /**
   * Clear all queued updates (for debugging/testing)
   */
  const clearQueuedUpdates = useCallback(() => {
    offlineManager.clearQueuedUpdates();
    setQueuedUpdatesCount(0);
  }, [setQueuedUpdatesCount]);

  /**
   * Simulate offline mode (for testing)
   */
  const simulateOffline = useCallback(async () => {
    await offlineManager.simulateOffline();
  }, []);

  /**
   * Simulate online mode (for testing)
   */
  const simulateOnline = useCallback(async () => {
    await offlineManager.simulateOnline();
  }, []);

  return {
    // State
    connectionState,
    isOnline,
    isFirestoreOnline,
    isRTDBOnline,
    hasQueuedUpdates,
    queuedUpdatesCount,
    
    // Computed values
    connectionStatus: getConnectionStatus(),
    connectionStatusColor: getConnectionStatusColor(),
    
    // Actions
    retryQueuedUpdates,
    clearQueuedUpdates,
    simulateOffline,
    simulateOnline,
  };
}
