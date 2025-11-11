/**
 * Zustand store for scope state management
 * Manages scope items and real-time updates
 */

import { create } from 'zustand';
import type { Scope, ScopeItem } from '../types/scope';
import { uploadScope, getScope, updateScope, subscribeToScope } from '../services/scopeService';

interface ScopeState {
  // Scope data
  scope: Scope | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setScope: (scope: Scope | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Service methods
  uploadScopeItems: (projectId: string, items: ScopeItem[], userId: string) => Promise<void>;
  loadScope: (projectId: string) => Promise<void>;
  updateScopeItems: (projectId: string, items: ScopeItem[], userId: string) => Promise<void>;
  
  // Real-time subscription
  unsubscribe: (() => void) | null;
  setUnsubscribe: (unsubscribe: (() => void) | null) => void;
  subscribe: (projectId: string) => void;
}

export const useScopeStore = create<ScopeState>((set, get) => ({
  // Initial state
  scope: null,
  loading: false,
  error: null,
  unsubscribe: null,
  
  // Basic setters
  setScope: (scope) => set({ scope }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setUnsubscribe: (unsubscribe) => set({ unsubscribe }),
  
  // Service methods
  uploadScopeItems: async (projectId: string, items: ScopeItem[], userId: string) => {
    set({ loading: true, error: null });
    try {
      await uploadScope(projectId, items, userId);
      // Scope will be updated via subscription
      set({ loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload scope';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },
  
  loadScope: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const scope = await getScope(projectId);
      set({ scope, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load scope';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },
  
  updateScopeItems: async (projectId: string, items: ScopeItem[], userId: string) => {
    set({ loading: true, error: null });
    try {
      await updateScope(projectId, items, userId);
      // Scope will be updated via subscription
      set({ loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update scope';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },
  
  // Real-time subscription
  subscribe: (projectId: string) => {
    // Cleanup existing subscription
    const { unsubscribe: existingUnsubscribe } = get();
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }
    
    // Set up new subscription
    const unsubscribe = subscribeToScope(projectId, (scope) => {
      set({ scope });
    });
    
    set({ unsubscribe });
  },
}));



