/**
 * Export service for canvas functionality
 * Handles PNG and SVG export with various options
 */

import type { ExportOptions } from '../types';
import Konva from 'konva';

export interface ExportService {
  exportCanvas: (options: ExportOptions) => Promise<Blob>;
  exportSelectedShapes: (options: ExportOptions, selectedIds: string[]) => Promise<Blob>;
  downloadBlob: (blob: Blob, filename: string) => void;
}

/**
 * Default export options
 */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'PNG',
  quality: 1.0,
  includeBackground: true,
  selectedOnly: false,
};

/**
 * Export service implementation
 */
export class CanvasExportService implements ExportService {
  private stage: Konva.Stage;

  constructor(stage: Konva.Stage) {
    this.stage = stage;
  }

  /**
   * Export the entire canvas
   */
  async exportCanvas(options: ExportOptions): Promise<Blob> {
    if (!this.stage) {
      throw new Error('Stage not available for export');
    }

    const { format, quality, includeBackground, width, height } = options;

    try {
      if (format === 'PNG') {
        const dataURL = this.stage.toDataURL({
          mimeType: 'image/png',
          quality,
          pixelRatio: quality,
          width,
          height,
          ...(includeBackground ? {} : { backgroundColor: 'transparent' }),
        });

        return this.dataURLToBlob(dataURL);
      } else if (format === 'SVG') {
        // Konva doesn't have native SVG export, so we need to manually convert to SVG
        return this.exportAsSVG(options);
      }

      throw new Error(`Unsupported export format: ${format}`);
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error(`Failed to export canvas: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export canvas as SVG by manually converting Konva stage to SVG
   */
  private async exportAsSVG(options: ExportOptions): Promise<Blob> {
    const { width, height, includeBackground } = options;
    
    // Get stage dimensions
    const stageWidth = width || this.stage.width();
    const stageHeight = height || this.stage.height();
    
    // Start building SVG
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${stageWidth}" height="${stageHeight}" viewBox="0 0 ${stageWidth} ${stageHeight}">`;
    
    // Add background if requested
    if (includeBackground) {
      svgContent += `<rect width="100%" height="100%" fill="white"/>`;
    }
    
    // Convert each layer to SVG
    const layers = this.stage.getLayers();
    layers.forEach((layer) => {
      const children = layer.getChildren();
      children.forEach((child) => {
        svgContent += this.nodeToSVG(child);
      });
    });
    
    svgContent += '</svg>';
    
    // Create blob from SVG content
    return new Blob([svgContent], { type: 'image/svg+xml' });
  }

  /**
   * Export selected shapes as SVG
   */
  private async exportSelectedShapesAsSVG(tempStage: any, options: ExportOptions, bounds: any, padding: number): Promise<Blob> {
    const { width, height, includeBackground } = options;
    
    // Calculate export dimensions
    const exportWidth = width || bounds.width + padding * 2;
    const exportHeight = height || bounds.height + padding * 2;
    
    // Start building SVG
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${exportWidth}" height="${exportHeight}" viewBox="0 0 ${exportWidth} ${exportHeight}">`;
    
    // Add background if requested
    if (includeBackground) {
      svgContent += `<rect width="100%" height="100%" fill="white"/>`;
    }
    
    // Convert each layer to SVG, adjusting for bounds
    const layers = tempStage.getLayers();
    layers.forEach((layer: any) => {
      const children = layer.getChildren();
      children.forEach((child: any) => {
        // Adjust coordinates relative to bounds
        const adjustedChild = this.adjustNodeForBounds(child, bounds, padding);
        svgContent += this.nodeToSVG(adjustedChild);
      });
    });
    
    svgContent += '</svg>';
    
    // Create blob from SVG content
    return new Blob([svgContent], { type: 'image/svg+xml' });
  }

  /**
   * Adjust node coordinates for bounds-based export
   */
  private adjustNodeForBounds(node: any, bounds: any, padding: number): any {
    const attrs = node.getAttrs();
    const adjustedAttrs = { ...attrs };
    
    // Adjust position relative to bounds
    adjustedAttrs.x = attrs.x - bounds.x + padding;
    adjustedAttrs.y = attrs.y - bounds.y + padding;
    
    // Create a temporary node with adjusted attributes for SVG conversion
    return {
      getClassName: () => node.getClassName(),
      getAttrs: () => adjustedAttrs
    };
  }

  /**
   * Convert a Konva node to SVG string
   */
  private nodeToSVG(node: any): string {
    const nodeType = node.getClassName();
    const attrs = node.getAttrs();
    
    switch (nodeType) {
      case 'Rect':
        return `<rect x="${attrs.x}" y="${attrs.y}" width="${attrs.width}" height="${attrs.height}" fill="${attrs.fill || 'transparent'}" stroke="${attrs.stroke || 'none'}" stroke-width="${attrs.strokeWidth || 0}" transform="rotate(${attrs.rotation || 0} ${attrs.x + attrs.width/2} ${attrs.y + attrs.height/2})"/>`;
      
      case 'Circle':
        return `<circle cx="${attrs.x}" cy="${attrs.y}" r="${attrs.radius}" fill="${attrs.fill || 'transparent'}" stroke="${attrs.stroke || 'none'}" stroke-width="${attrs.strokeWidth || 0}" transform="rotate(${attrs.rotation || 0} ${attrs.x} ${attrs.y})"/>`;
      
      case 'Text':
        return `<text x="${attrs.x}" y="${attrs.y + attrs.fontSize}" font-family="${attrs.fontFamily || 'Arial'}" font-size="${attrs.fontSize || 12}" fill="${attrs.fill || 'black'}" transform="rotate(${attrs.rotation || 0} ${attrs.x} ${attrs.y})">${attrs.text || ''}</text>`;
      
      case 'Line':
        const points = attrs.points || [];
        const pointsString = points.map((point: number, index: number) => {
          if (index % 2 === 0) {
            return `${point + attrs.x}`;
          } else {
            return `${point + attrs.y}`;
          }
        }).join(' ');
        return `<polyline points="${pointsString}" fill="${attrs.fill || 'none'}" stroke="${attrs.stroke || 'black'}" stroke-width="${attrs.strokeWidth || 1}" transform="rotate(${attrs.rotation || 0} ${attrs.x} ${attrs.y})"/>`;
      
      case 'Group':
        let groupContent = `<g transform="translate(${attrs.x}, ${attrs.y}) rotate(${attrs.rotation || 0})">`;
        const children = node.getChildren();
        children.forEach((child: any) => {
          groupContent += this.nodeToSVG(child);
        });
        groupContent += '</g>';
        return groupContent;
      
      default:
        console.warn(`Unsupported node type for SVG export: ${nodeType}`);
        return '';
    }
  }

  /**
   * Export only selected shapes
   */
  async exportSelectedShapes(options: ExportOptions, selectedIds: string[]): Promise<Blob> {
    if (!this.stage) {
      throw new Error('Stage not available for export');
    }

    if (selectedIds.length === 0) {
      throw new Error('No shapes selected for export');
    }

    const { format, quality, includeBackground, width, height } = options;

    try {
      // Create a temporary stage with only selected shapes
      const tempStage = this.stage.clone();
      const tempLayer = tempStage.getLayers()[0];
      
      // Remove all shapes except selected ones
      const allShapes = tempLayer.getChildren();
      allShapes.forEach((shape: Konva.Node) => {
        if (!selectedIds.includes(shape.id())) {
          shape.destroy();
        }
      });

      // Calculate bounds of selected shapes
      const bounds = tempStage.getClientRect();
      const padding = 20;
      const exportWidth = width || bounds.width + padding * 2;
      const exportHeight = height || bounds.height + padding * 2;

      if (format === 'PNG') {
        const dataURL = tempStage.toDataURL({
          mimeType: 'image/png',
          quality,
          pixelRatio: quality,
          width: exportWidth,
          height: exportHeight,
          x: bounds.x - padding,
          y: bounds.y - padding,
          ...(includeBackground ? {} : { backgroundColor: 'transparent' }),
        });

        tempStage.destroy();
        return this.dataURLToBlob(dataURL);
      } else if (format === 'SVG') {
        // Use custom SVG export for selected shapes
        const svgBlob = await this.exportSelectedShapesAsSVG(tempStage, options, bounds, padding);
        tempStage.destroy();
        return svgBlob;
      }

      tempStage.destroy();
      throw new Error(`Unsupported export format: ${format}`);
    } catch (error) {
      console.error('Selected shapes export failed:', error);
      throw new Error(`Failed to export selected shapes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download a blob as a file
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Convert data URL to blob
   */
  private dataURLToBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  /**
   * Generate filename based on options and timestamp
   */
  generateFilename(options: ExportOptions): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const format = options.format.toLowerCase();
    const prefix = options.selectedOnly ? 'selected-shapes' : 'canvas';
    return `${prefix}-${timestamp}.${format}`;
  }
}

/**
 * Create export service instance
 */
export const createExportService = (stage: Konva.Stage): CanvasExportService => {
  return new CanvasExportService(stage);
};
