/**
 * Unit tests for View Indicators Store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useViewIndicatorsStore } from '../store/viewIndicatorsStore';

describe('View Indicators Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { clearAllIndicators } = useViewIndicatorsStore.getState();
    clearAllIndicators();
  });

  describe('setIndicator', () => {
    it('should set indicator for a view', () => {
      const { setIndicator, hasIndicator } = useViewIndicatorsStore.getState();
      
      setIndicator('money', true);
      
      expect(hasIndicator('money')).toBe(true);
    });

    it('should set multiple indicators independently', () => {
      const { setIndicator, hasIndicator } = useViewIndicatorsStore.getState();
      
      setIndicator('money', true);
      setIndicator('time', true);
      
      expect(hasIndicator('money')).toBe(true);
      expect(hasIndicator('time')).toBe(true);
      expect(hasIndicator('scope')).toBe(false);
      expect(hasIndicator('space')).toBe(false);
    });

    it('should clear indicator when set to false', () => {
      const { setIndicator, hasIndicator } = useViewIndicatorsStore.getState();
      
      setIndicator('money', true);
      expect(hasIndicator('money')).toBe(true);
      
      setIndicator('money', false);
      expect(hasIndicator('money')).toBe(false);
    });
  });

  describe('clearIndicator', () => {
    it('should clear a specific indicator', () => {
      const { setIndicator, clearIndicator, hasIndicator } = useViewIndicatorsStore.getState();
      
      setIndicator('money', true);
      setIndicator('time', true);
      
      clearIndicator('money');
      
      expect(hasIndicator('money')).toBe(false);
      expect(hasIndicator('time')).toBe(true);
    });
  });

  describe('clearAllIndicators', () => {
    it('should clear all indicators', () => {
      const { setIndicator, clearAllIndicators, hasIndicator } = useViewIndicatorsStore.getState();
      
      setIndicator('money', true);
      setIndicator('time', true);
      setIndicator('scope', true);
      
      clearAllIndicators();
      
      expect(hasIndicator('money')).toBe(false);
      expect(hasIndicator('time')).toBe(false);
      expect(hasIndicator('scope')).toBe(false);
      expect(hasIndicator('space')).toBe(false);
    });
  });

  describe('hasIndicator', () => {
    it('should return false for unset indicators', () => {
      const { hasIndicator } = useViewIndicatorsStore.getState();
      
      expect(hasIndicator('money')).toBe(false);
      expect(hasIndicator('time')).toBe(false);
    });

    it('should return true for set indicators', () => {
      const { setIndicator, hasIndicator } = useViewIndicatorsStore.getState();
      
      setIndicator('money', true);
      
      expect(hasIndicator('money')).toBe(true);
    });
  });
});





