/**
 * View Indicator Integration Hooks
 * Provides hooks and utilities for setting view indicators when content is generated
 * 
 * Integration Points for Story 1.4:
 * - When BOM is generated in Money view: call setIndicator('money', true)
 * - When CPM is generated in Time view: call setIndicator('time', true)
 */

import { useViewIndicatorsStore } from '../store/viewIndicatorsStore';

/**
 * Hook to set view indicator when content is generated
 * Usage: const setViewIndicator = useViewIndicatorSetter();
 *        setViewIndicator('money', true); // When BOM is generated
 */
export function useViewIndicatorSetter() {
  const setIndicator = useViewIndicatorsStore((state) => state.setIndicator);
  
  return setIndicator;
}

/**
 * Utility function to set indicator for Money view when BOM is generated
 * Call this from MoneyView or BOM generation service when BOM is created/updated
 */
export function setMoneyViewIndicator(hasContent: boolean) {
  const { setIndicator } = useViewIndicatorsStore.getState();
  setIndicator('money', hasContent);
}

/**
 * Utility function to set indicator for Time view when CPM is generated
 * Call this from TimeView or CPM generation service when CPM is created/updated
 */
export function setTimeViewIndicator(hasContent: boolean) {
  const { setIndicator } = useViewIndicatorsStore.getState();
  setIndicator('time', hasContent);
}




