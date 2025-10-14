import { describe, it, expect } from 'vitest';
import { getUserColor, getAllColors, isValidColor } from './colors';

describe('Color Utilities', () => {
  describe('getUserColor', () => {
    it('should return a valid color for any user ID', () => {
      const color = getUserColor('user-123');
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(getAllColors()).toContain(color);
    });

    it('should return consistent colors for the same user ID', () => {
      const userId = 'user-456';
      const color1 = getUserColor(userId);
      const color2 = getUserColor(userId);
      expect(color1).toBe(color2);
    });

    it('should return different colors for different user IDs', () => {
      const color1 = getUserColor('user-123');
      const color2 = getUserColor('user-456');
      expect(color1).not.toBe(color2);
    });

    it('should handle empty string user ID', () => {
      const color = getUserColor('');
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should handle special characters in user ID', () => {
      const color = getUserColor('user@example.com');
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  describe('getAllColors', () => {
    it('should return an array of valid hex colors', () => {
      const colors = getAllColors();
      expect(Array.isArray(colors)).toBe(true);
      expect(colors.length).toBeGreaterThan(0);
      
      colors.forEach(color => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    it('should return the same colors array on multiple calls', () => {
      const colors1 = getAllColors();
      const colors2 = getAllColors();
      expect(colors1).toBe(colors2); // Same reference
    });
  });

  describe('isValidColor', () => {
    it('should return true for valid colors in the palette', () => {
      const colors = getAllColors();
      colors.forEach(color => {
        expect(isValidColor(color)).toBe(true);
      });
    });

    it('should return false for invalid colors', () => {
      expect(isValidColor('#INVALID')).toBe(false);
      expect(isValidColor('red')).toBe(false);
      expect(isValidColor('#12345')).toBe(false);
      expect(isValidColor('#1234567')).toBe(false);
      expect(isValidColor('')).toBe(false);
    });
  });
});
