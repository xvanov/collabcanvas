/**
 * Unit tests for Parallel BOM and CPM Generation
 * Tests AC: #4 - Parallel Generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from '../aiService';
import * as bomService from '../bomService';
import * as cpmService from '../cpmService';
import type { BillOfMaterials } from '../../types/material';
import type { CPM } from '../../types/cpm';

// Mock the services
vi.mock('../bomService', () => ({
  generateBOM: vi.fn(),
  saveBOM: vi.fn(),
}));

vi.mock('../cpmService', () => ({
  generateCPM: vi.fn(),
  saveCPM: vi.fn(),
}));

describe('AIService - Parallel BOM and CPM Generation', () => {
  let aiService: AIService;
  const mockProjectId = 'test-project';
  const mockUserId = 'test-user';

  beforeEach(() => {
    aiService = new AIService();
    vi.clearAllMocks();
  });

  describe('generateBOMAndCPM', () => {
    it('should generate both BOM and CPM in parallel', async () => {
      const mockBOM: BillOfMaterials = {
        id: 'bom-1',
        calculations: [],
        totalMaterials: [],
        createdAt: Date.now(),
        createdBy: mockUserId,
        updatedAt: Date.now(),
      };

      const mockCPM: CPM = {
        id: 'cpm-1',
        projectId: mockProjectId,
        tasks: [],
        criticalPath: [],
        totalDuration: 0,
        createdAt: Date.now(),
        createdBy: mockUserId,
        updatedAt: Date.now(),
      };

      vi.mocked(bomService.generateBOM).mockResolvedValue(mockBOM);
      vi.mocked(cpmService.generateCPM).mockResolvedValue(mockCPM);

      const progressUpdates: Array<{ bom?: 'generating' | 'complete' | 'error'; cpm?: 'generating' | 'complete' | 'error' }> = [];
      const onProgress = (progress: { bom?: 'generating' | 'complete' | 'error'; cpm?: 'generating' | 'complete' | 'error' }) => {
        progressUpdates.push(progress);
      };

      const result = await aiService.generateBOMAndCPM(
        {
          projectId: mockProjectId,
          userId: mockUserId,
          annotations: [],
        },
        {
          projectId: mockProjectId,
          userId: mockUserId,
        },
        onProgress
      );

      expect(result.bothSucceeded).toBe(true);
      expect(result.bom.success).toBe(true);
      expect(result.cpm.success).toBe(true);
      expect(result.bom.bom).toEqual(mockBOM);
      expect(result.cpm.cpm).toEqual(mockCPM);
      expect(result.partialSuccess).toBe(false);
      expect(result.bothFailed).toBe(false);

      // Verify both were called
      expect(bomService.generateBOM).toHaveBeenCalledTimes(1);
      expect(cpmService.generateCPM).toHaveBeenCalledTimes(1);

      // Verify progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.some(p => p.bom === 'generating' && p.cpm === 'generating')).toBe(true);
      expect(progressUpdates.some(p => p.bom === 'complete' && p.cpm === 'complete')).toBe(true);
    });

    it('should handle partial failure when BOM succeeds but CPM fails', async () => {
      const mockBOM: BillOfMaterials = {
        id: 'bom-1',
        calculations: [],
        totalMaterials: [],
        createdAt: Date.now(),
        createdBy: mockUserId,
        updatedAt: Date.now(),
      };

      vi.mocked(bomService.generateBOM).mockResolvedValue(mockBOM);
      vi.mocked(cpmService.generateCPM).mockRejectedValue(new Error('CPM generation failed'));

      const result = await aiService.generateBOMAndCPM(
        {
          projectId: mockProjectId,
          userId: mockUserId,
          annotations: [],
        },
        {
          projectId: mockProjectId,
          userId: mockUserId,
        }
      );

      expect(result.bothSucceeded).toBe(false);
      expect(result.bom.success).toBe(true);
      expect(result.cpm.success).toBe(false);
      expect(result.partialSuccess).toBe(true);
      expect(result.bothFailed).toBe(false);
      expect(result.cpm.error).toContain('CPM generation failed');
    });

    it('should handle partial failure when CPM succeeds but BOM fails', async () => {
      const mockCPM: CPM = {
        id: 'cpm-1',
        projectId: mockProjectId,
        tasks: [],
        criticalPath: [],
        totalDuration: 0,
        createdAt: Date.now(),
        createdBy: mockUserId,
        updatedAt: Date.now(),
      };

      vi.mocked(bomService.generateBOM).mockRejectedValue(new Error('BOM generation failed'));
      vi.mocked(cpmService.generateCPM).mockResolvedValue(mockCPM);

      const result = await aiService.generateBOMAndCPM(
        {
          projectId: mockProjectId,
          userId: mockUserId,
          annotations: [],
        },
        {
          projectId: mockProjectId,
          userId: mockUserId,
        }
      );

      expect(result.bothSucceeded).toBe(false);
      expect(result.bom.success).toBe(false);
      expect(result.cpm.success).toBe(true);
      expect(result.partialSuccess).toBe(true);
      expect(result.bothFailed).toBe(false);
      expect(result.bom.error).toContain('BOM generation failed');
    });

    it('should handle both failures', async () => {
      vi.mocked(bomService.generateBOM).mockRejectedValue(new Error('BOM generation failed'));
      vi.mocked(cpmService.generateCPM).mockRejectedValue(new Error('CPM generation failed'));

      const result = await aiService.generateBOMAndCPM(
        {
          projectId: mockProjectId,
          userId: mockUserId,
          annotations: [],
        },
        {
          projectId: mockProjectId,
          userId: mockUserId,
        }
      );

      expect(result.bothSucceeded).toBe(false);
      expect(result.bom.success).toBe(false);
      expect(result.cpm.success).toBe(false);
      expect(result.partialSuccess).toBe(false);
      expect(result.bothFailed).toBe(true);
      expect(result.bom.error).toContain('BOM generation failed');
      expect(result.cpm.error).toContain('CPM generation failed');
    });

    it('should call both generation functions simultaneously', async () => {
      let bomStartTime = 0;
      let cpmStartTime = 0;

      vi.mocked(bomService.generateBOM).mockImplementation(async () => {
        bomStartTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          id: 'bom-1',
          calculations: [],
          totalMaterials: [],
          createdAt: Date.now(),
          createdBy: mockUserId,
          updatedAt: Date.now(),
        } as BillOfMaterials;
      });

      vi.mocked(cpmService.generateCPM).mockImplementation(async () => {
        cpmStartTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          id: 'cpm-1',
          projectId: mockProjectId,
          tasks: [],
          criticalPath: [],
          totalDuration: 0,
          createdAt: Date.now(),
          createdBy: mockUserId,
          updatedAt: Date.now(),
        } as CPM;
      });

      await aiService.generateBOMAndCPM(
        {
          projectId: mockProjectId,
          userId: mockUserId,
          annotations: [],
        },
        {
          projectId: mockProjectId,
          userId: mockUserId,
        }
      );

      // Both should start within 10ms of each other (parallel execution)
      const timeDiff = Math.abs(bomStartTime - cpmStartTime);
      expect(timeDiff).toBeLessThan(50); // Allow some margin for test execution
    });
  });
});
