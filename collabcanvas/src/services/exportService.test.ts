/**
 * Tests for Export Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CanvasExportService, createExportService } from '../services/exportService';
import type { ExportOptions } from '../types';

// Mock Konva Stage
const mockStage = {
  toDataURL: vi.fn(),
  clone: vi.fn(),
  getLayers: vi.fn(),
  getClientRect: vi.fn(),
  destroy: vi.fn(),
  width: vi.fn(() => 800),
  height: vi.fn(() => 600),
};

describe('CanvasExportService', () => {
  let exportService: CanvasExportService;

  beforeEach(() => {
    vi.clearAllMocks();
    exportService = createExportService(mockStage);
  });

  describe('exportCanvas', () => {
    it('should export PNG format', async () => {
      const mockDataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      mockStage.toDataURL.mockReturnValue(mockDataURL);

      const options: ExportOptions = {
        format: 'PNG',
        quality: 1.0,
        includeBackground: true,
        selectedOnly: false,
      };

      const blob = await exportService.exportCanvas(options);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
      expect(mockStage.toDataURL).toHaveBeenCalledWith({
        mimeType: 'image/png',
        quality: 1.0,
        pixelRatio: 1.0,
        width: undefined,
        height: undefined,
      });
    });

    it('should export SVG format', async () => {
      // Mock layers and children for SVG export
      const mockLayer = {
        getChildren: vi.fn(() => [])
      };
      mockStage.getLayers.mockReturnValue([mockLayer]);

      const options: ExportOptions = {
        format: 'SVG',
        quality: 1.0,
        includeBackground: true,
        selectedOnly: false,
      };

      const blob = await exportService.exportCanvas(options);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/svg+xml');
      expect(mockStage.getLayers).toHaveBeenCalled();
    });

    it('should handle custom dimensions', async () => {
      const mockDataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      mockStage.toDataURL.mockReturnValue(mockDataURL);

      const options: ExportOptions = {
        format: 'PNG',
        quality: 0.8,
        includeBackground: false,
        selectedOnly: false,
        width: 800,
        height: 600,
      };

      await exportService.exportCanvas(options);

      expect(mockStage.toDataURL).toHaveBeenCalledWith({
        mimeType: 'image/png',
        quality: 0.8,
        pixelRatio: 0.8,
        width: 800,
        height: 600,
        backgroundColor: 'transparent',
      });
    });

    it('should throw error for unsupported format', async () => {
      const options: ExportOptions = {
        format: 'INVALID' as ExportOptions['format'], // Force invalid format
        quality: 1.0,
        includeBackground: true,
        selectedOnly: false,
      };

      // Mock toDataURL to throw
      mockStage.toDataURL.mockImplementation(() => {
        throw new Error('Invalid format');
      });

      await expect(exportService.exportCanvas(options)).rejects.toThrow('Failed to export canvas');
    });
  });

  describe('exportSelectedShapes', () => {
    it('should export only selected shapes', async () => {
      const mockDataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      const mockShape1 = { 
        id: vi.fn().mockReturnValue('shape1'),
        destroy: vi.fn(),
      };
      const mockShape2 = { 
        id: vi.fn().mockReturnValue('shape2'),
        destroy: vi.fn(),
      };
      const mockTempStage = {
        ...mockStage,
        toDataURL: vi.fn().mockReturnValue(mockDataURL),
        destroy: vi.fn(),
      };
      mockStage.clone.mockReturnValue(mockTempStage);
      mockTempStage.getLayers.mockReturnValue([{
        getChildren: vi.fn().mockReturnValue([mockShape1, mockShape2]),
      }]);
      mockTempStage.getClientRect.mockReturnValue({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      const shapes = [
        { id: 'shape1', type: 'rect', x: 0, y: 0, w: 100, h: 100, color: '#3B82F6' },
        { id: 'shape2', type: 'circle', x: 50, y: 50, w: 50, h: 50, color: '#FF0000' },
      ];
      const selectedIds = ['shape1'];

      const options: ExportOptions = {
        format: 'PNG',
        quality: 1.0,
        includeBackground: true,
        selectedOnly: true,
      };

      const blob = await exportService.exportSelectedShapes(options, shapes, selectedIds);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
      expect(mockStage.clone).toHaveBeenCalled();
      expect(mockTempStage.destroy).toHaveBeenCalled();
    });

    it('should throw error when no shapes selected', async () => {
      const options: ExportOptions = {
        format: 'PNG',
        quality: 1.0,
        includeBackground: true,
        selectedOnly: true,
      };

      await expect(exportService.exportSelectedShapes(options, [], [])).rejects.toThrow('No shapes selected for export');
    });
  });

  describe('downloadBlob', () => {
    it('should create download link and trigger download', () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' });
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      
      // Mock URL.createObjectURL and URL.revokeObjectURL
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      
      // Mock global URL object
      global.URL = {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      } as URL;
      
      // Mock document.createElement
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as HTMLElement);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as HTMLElement);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as HTMLElement);

      exportService.downloadBlob(mockBlob, 'test.png');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockLink.download).toBe('test.png');
      expect(mockLink.click).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

      // Cleanup
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with timestamp', () => {
      const options: ExportOptions = {
        format: 'PNG',
        quality: 1.0,
        includeBackground: true,
        selectedOnly: false,
      };

      const filename = exportService.generateFilename(options);
      
      expect(filename).toMatch(/^canvas-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.png$/);
    });

    it('should generate filename for selected shapes', () => {
      const options: ExportOptions = {
        format: 'SVG',
        quality: 1.0,
        includeBackground: true,
        selectedOnly: true,
      };

      const filename = exportService.generateFilename(options);
      
      expect(filename).toMatch(/^selected-shapes-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.svg$/);
    });
  });
});
