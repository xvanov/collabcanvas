/**
 * Unit tests for CSV Parser
 */

import { describe, it, expect } from 'vitest';
import { parseCSV, type ParseResult } from '../utils/csvParser';

describe('CSV Parser', () => {
  describe('Valid CSV parsing', () => {
    it('should parse valid CSV with scope and description columns', () => {
      const csv = `scope,description
demo,Demolition work
roof,Roof replacement
siding,Siding installation`;

      const result = parseCSV(csv);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(3);
      expect(result.items[0]).toEqual({ scope: 'demo', description: 'Demolition work' });
      expect(result.items[1]).toEqual({ scope: 'roof', description: 'Roof replacement' });
      expect(result.items[2]).toEqual({ scope: 'siding', description: 'Siding installation' });
    });

    it('should handle CSV with quoted values', () => {
      const csv = `scope,description
demo,"Demolition work, including debris removal"
roof,"Roof replacement, full tear-off"`;

      const result = parseCSV(csv);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({ 
        scope: 'demo', 
        description: 'Demolition work, including debris removal' 
      });
    });

    it('should handle CSV with escaped quotes', () => {
      const csv = `scope,description
demo,"Demolition work with ""special"" handling"`;

      const result = parseCSV(csv);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({ 
        scope: 'demo', 
        description: 'Demolition work with "special" handling' 
      });
    });

    it('should handle CSV with extra whitespace', () => {
      const csv = `scope,description
  demo  ,  Demolition work  
roof,Roof replacement`;

      const result = parseCSV(csv);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({ scope: 'demo', description: 'Demolition work' });
    });
  });

  describe('Invalid CSV format', () => {
    it('should reject CSV with wrong number of columns', () => {
      const csv = `scope,description,extra
demo,Demolition work,extra column`;

      const result = parseCSV(csv);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Expected 2 columns');
    });

    it('should reject CSV with missing columns', () => {
      const csv = `scope
demo
roof`;

      const result = parseCSV(csv);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Expected 2 columns');
    });

    it('should reject CSV with wrong column names', () => {
      const csv = `item,details
demo,Demolition work`;

      const result = parseCSV(csv);

      expect(result.success).toBe(false);
      expect(result.error).toContain('scope, description');
    });

    it('should reject empty CSV file', () => {
      const csv = '';

      const result = parseCSV(csv);

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject CSV with only header', () => {
      const csv = 'scope,description';

      const result = parseCSV(csv);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No data rows');
    });

    it('should reject CSV with inconsistent row columns', () => {
      const csv = `scope,description
demo,Demolition work
roof`;

      const result = parseCSV(csv);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Row');
      expect(result.error).toContain('columns');
    });
  });

  describe('Edge cases', () => {
    it('should handle CSV with empty values', () => {
      const csv = `scope,description
demo,
roof,Roof replacement`;

      const result = parseCSV(csv);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({ scope: 'demo', description: '' });
    });

    it('should handle CSV with case-insensitive headers', () => {
      const csv = `SCOPE,DESCRIPTION
demo,Demolition work`;

      const result = parseCSV(csv);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);
    });

    it('should handle CSV with mixed case headers', () => {
      const csv = `Scope,Description
demo,Demolition work`;

      const result = parseCSV(csv);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);
    });
  });
});



