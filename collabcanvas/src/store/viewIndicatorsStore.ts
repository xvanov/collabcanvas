/**
 * View Indicators Store
 * Manages indicator state for views (which views have new content)
 */

import { create } from 'zustand';

type ViewType = 'scope' | 'time' | 'space' | 'money';

interface ViewIndicatorsState {
  indicators: Record<ViewType, boolean>;
  
  // Actions
  setIndicator: (view: ViewType, hasContent: boolean) => void;
  clearIndicator: (view: ViewType) => void;
  clearAllIndicators: () => void;
  hasIndicator: (view: ViewType) => boolean;
}

export const useViewIndicatorsStore = create<ViewIndicatorsState>((set, get) => ({
  indicators: {
    scope: false,
    time: false,
    space: false,
    money: false,
  },
  
  setIndicator: (view, hasContent) => {
    set((state) => ({
      indicators: {
        ...state.indicators,
        [view]: hasContent,
      },
    }));
  },
  
  clearIndicator: (view) => {
    set((state) => ({
      indicators: {
        ...state.indicators,
        [view]: false,
      },
    }));
  },
  
  clearAllIndicators: () => {
    set({
      indicators: {
        scope: false,
        time: false,
        space: false,
        money: false,
      },
    });
  },
  
  hasIndicator: (view) => {
    return get().indicators[view];
  },
}));



