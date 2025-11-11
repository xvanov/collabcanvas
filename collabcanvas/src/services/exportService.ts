/**
 * Export Service
 * Provides both Canvas Export (PNG/SVG) and BOM PDF Export functionality
 */

import jsPDF from 'jspdf';
import type Konva from 'konva';
import type { BillOfMaterials } from '../types/material';
import type { ExportOptions, Shape } from '../types';
import { formatMargin } from './marginService';
import { calculateVarianceSummary, formatVariancePercentage } from './varianceService';

// ============================================================================
// Canvas Export Service (PNG/SVG)
// ============================================================================

export interface CanvasExportService {
  exportCanvas(options: ExportOptions): Promise<Blob>;
  exportSelectedShapes(options: ExportOptions, shapes: Shape[], selectedIds: string[]): Promise<Blob>;
  downloadBlob(blob: Blob, filename: string): void;
  generateFilename(options: ExportOptions): string;
}

export function createExportService(stage: Konva.Stage): CanvasExportService {
  return {
    async exportCanvas(options: ExportOptions): Promise<Blob> {
      try {
        if (options.format === 'SVG') {
          return await exportAsSVG(stage, options);
          } else {
          return await exportAsPNG(stage, options);
        }
      } catch (error) {
        throw new Error(`Failed to export canvas: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    async exportSelectedShapes(options: ExportOptions, shapes: Shape[], selectedIds: string[]): Promise<Blob> {
    if (selectedIds.length === 0) {
      throw new Error('No shapes selected for export');
    }

    try {
        const tempStage = stage.clone();
        const layers = tempStage.getLayers();
      
      // Remove all shapes except selected ones
        layers.forEach(layer => {
          const children = layer.getChildren();
          children.forEach((child: Konva.Node) => {
            const shapeId = child.id();
            if (!selectedIds.includes(shapeId)) {
              child.destroy();
            }
          });
        });

        const rect = tempStage.getClientRect();
        tempStage.width(rect.width);
        tempStage.height(rect.height);

        let blob: Blob;
        if (options.format === 'SVG') {
          blob = await exportAsSVG(tempStage, options);
        } else {
          blob = await exportAsPNG(tempStage, options);
        }

        tempStage.destroy();
        return blob;
      } catch (error) {
        throw new Error(`Failed to export selected shapes: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    },

    generateFilename(options: ExportOptions): string {
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      const prefix = options.selectedOnly ? 'selected-shapes' : 'canvas';
      const extension = options.format.toLowerCase();
      return `${prefix}-${timestamp}.${extension}`;
    },
  };
}

async function exportAsPNG(stage: Konva.Stage, options: ExportOptions): Promise<Blob> {
  const dataURL = stage.toDataURL({
    mimeType: 'image/png',
    quality: options.quality || 1.0,
    pixelRatio: options.quality || 1.0,
    width: options.width,
    height: options.height,
    backgroundColor: options.includeBackground === false ? 'transparent' : undefined,
  });

  const response = await fetch(dataURL);
  return await response.blob();
}

async function exportAsSVG(stage: Konva.Stage, options: ExportOptions): Promise<Blob> {
  const layers = stage.getLayers();
  let svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="' + stage.width() + '" height="' + stage.height() + '">';
  
  layers.forEach(layer => {
    const layerSVG = layer.toSVG();
    svgContent += layerSVG;
  });
  
  svgContent += '</svg>';
  
  return new Blob([svgContent], { type: 'image/svg+xml' });
}

// ============================================================================
// BOM PDF Export Service
// AC: #11 - PDF Export
// ============================================================================

export type BOMExportView = 'customer' | 'contractor' | 'comparison';

export interface BOMExportOptions {
  projectName?: string;
  contractorName?: string;
  contractorInfo?: string;
  includeNotes?: boolean;
}

/**
 * Export BOM as PDF
 * AC: #11 - PDF Export
 */
export async function exportEstimateAsPDF(
  bom: BillOfMaterials,
  view: BOMExportView,
  options: BOMExportOptions = {}
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Estimate', margin, yPosition);
  yPosition += 10;

  // Project details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  if (options.projectName || bom.projectName) {
    doc.text(`Project: ${options.projectName || bom.projectName || 'Unnamed Project'}`, margin, yPosition);
    yPosition += 7;
  }
  
  const generatedDate = new Date(bom.createdAt).toLocaleDateString();
  doc.text(`Generated: ${generatedDate}`, margin, yPosition);
  yPosition += 7;

  if (options.contractorName || options.contractorInfo) {
    if (options.contractorName) {
      doc.text(`Contractor: ${options.contractorName}`, margin, yPosition);
      yPosition += 7;
    }
    if (options.contractorInfo) {
      doc.setFontSize(10);
      doc.text(options.contractorInfo, margin, yPosition);
      yPosition += 7;
      doc.setFontSize(12);
    }
  }

  yPosition += 5;

  // Generate content based on view type
  if (view === 'customer') {
    generateCustomerViewPDF(doc, bom, margin, yPosition, checkPageBreak);
  } else if (view === 'contractor') {
    generateContractorViewPDF(doc, bom, margin, yPosition, checkPageBreak);
  } else if (view === 'comparison') {
    generateComparisonViewPDF(doc, bom, margin, yPosition, checkPageBreak);
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin - 20,
      pageHeight - 10,
      { align: 'right' }
    );
    doc.setTextColor(0, 0, 0);
  }

  // Download PDF
  const filename = `${options.projectName || bom.projectName || 'Estimate'}-${view}-${Date.now()}.pdf`;
  doc.save(filename);
}

/**
 * Generate Customer View PDF
 */
function generateCustomerViewPDF(
  doc: jsPDF,
  bom: BillOfMaterials,
  margin: number,
  startY: number,
  checkPageBreak: (space: number) => void
): void {
  let yPosition = startY;

  if (!bom.margin) {
    doc.setFontSize(12);
    doc.text('Margin calculation not available.', margin, yPosition);
    return;
  }

  const formatted = formatMargin(bom.margin);
  const laborWithMargin = bom.margin.laborCost + bom.margin.marginDollars;

  // Materials Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Materials', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Table header
  doc.setFont('helvetica', 'bold');
  doc.text('Item', margin, yPosition);
  doc.text('Quantity', margin + 80, yPosition);
  doc.text('Total', margin + 130, yPosition, { align: 'right' });
  yPosition += 7;
  
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition - 2, margin + 170, yPosition - 2);
  yPosition += 3;

  // Materials list
  doc.setFont('helvetica', 'normal');
  bom.totalMaterials.forEach((material) => {
    checkPageBreak(10);
    
    const hasPrice = typeof material.priceUSD === 'number' && material.priceUSD > 0 && material.priceUSD !== undefined;
    const lineTotal = hasPrice && material.priceUSD !== undefined ? material.quantity * material.priceUSD : 0;
    
    doc.text(material.name, margin, yPosition);
    doc.text(`${material.quantity.toFixed(0)} ${material.unit}`, margin + 80, yPosition);
    doc.text(
      hasPrice
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(lineTotal)
        : 'TBD',
      margin + 130,
      yPosition,
      { align: 'right' }
    );
    yPosition += 7;
  });

  checkPageBreak(15);
  yPosition += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Materials Subtotal:', margin + 80, yPosition);
  doc.text(formatted.materialCost, margin + 130, yPosition, { align: 'right' });
  yPosition += 10;

  // Labor Section
  checkPageBreak(20);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Labor', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Labor & Installation', margin, yPosition);
  doc.setFont('helvetica', 'bold');
  doc.text(
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(laborWithMargin),
    margin + 130,
    yPosition,
    { align: 'right' }
  );
  yPosition += 10;

  // Total
  checkPageBreak(15);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPosition, margin + 170, yPosition);
  yPosition += 10;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Project Cost:', margin, yPosition);
  doc.text(formatted.total, margin + 130, yPosition, { align: 'right' });
}

/**
 * Generate Contractor View PDF
 */
function generateContractorViewPDF(
  doc: jsPDF,
  bom: BillOfMaterials,
  margin: number,
  startY: number,
  checkPageBreak: (space: number) => void
): void {
  let yPosition = startY;

  if (!bom.margin) {
    doc.setFontSize(12);
    doc.text('Margin calculation not available.', margin, yPosition);
    return;
  }

  const formatted = formatMargin(bom.margin);

  // Materials Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Materials Breakdown', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Table header
  doc.setFont('helvetica', 'bold');
  doc.text('Item', margin, yPosition);
  doc.text('Qty', margin + 70, yPosition);
  doc.text('Unit Price', margin + 90, yPosition, { align: 'right' });
  doc.text('Total', margin + 130, yPosition, { align: 'right' });
  yPosition += 7;
  
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition - 2, margin + 170, yPosition - 2);
  yPosition += 3;

  // Materials list
  doc.setFont('helvetica', 'normal');
  bom.totalMaterials.forEach((material) => {
    checkPageBreak(10);
    
    const hasPrice = typeof material.priceUSD === 'number' && material.priceUSD > 0 && material.priceUSD !== undefined;
    const lineTotal = hasPrice && material.priceUSD !== undefined ? material.quantity * material.priceUSD : 0;
    
    doc.text(material.name, margin, yPosition);
    doc.text(`${material.quantity.toFixed(0)} ${material.unit}`, margin + 70, yPosition);
    doc.text(
      hasPrice && material.priceUSD !== undefined
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(material.priceUSD)
        : 'TBD',
      margin + 90,
      yPosition,
      { align: 'right' }
    );
    doc.text(
      hasPrice
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(lineTotal)
        : 'TBD',
      margin + 130,
      yPosition,
      { align: 'right' }
    );
    yPosition += 7;
  });

  checkPageBreak(30);
  yPosition += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Materials Subtotal:', margin + 90, yPosition);
  doc.text(formatted.materialCost, margin + 130, yPosition, { align: 'right' });
  yPosition += 10;

  // Labor Section
  checkPageBreak(15);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Labor', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Labor Costs', margin, yPosition);
  doc.setFont('helvetica', 'bold');
  doc.text(formatted.laborCost, margin + 130, yPosition, { align: 'right' });
  yPosition += 10;

  // Margin Section
  checkPageBreak(20);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Margin & Profit', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Margin (${formatted.marginPercentage})`, margin, yPosition);
  doc.setFont('helvetica', 'bold');
  doc.text(formatted.marginDollars, margin + 130, yPosition, { align: 'right' });
  yPosition += 7;

  doc.setFont('helvetica', 'normal');
  doc.text(`Buffer Time (Slack): ${formatted.marginTimeSlack}`, margin, yPosition);
  yPosition += 10;

  // Total
  checkPageBreak(15);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPosition, margin + 170, yPosition);
  yPosition += 10;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Project Cost:', margin, yPosition);
  doc.text(formatted.total, margin + 130, yPosition, { align: 'right' });
}

/**
 * Generate Comparison View PDF
 */
function generateComparisonViewPDF(
  doc: jsPDF,
  bom: BillOfMaterials,
  margin: number,
  startY: number,
  checkPageBreak: (space: number) => void
): void {
  let yPosition = startY;

  const materialsWithActuals = bom.totalMaterials.filter(
    m => typeof m.actualCostUSD === 'number'
  );

  if (materialsWithActuals.length === 0) {
    doc.setFontSize(12);
    doc.text('No actual costs entered for comparison.', margin, yPosition);
    return;
  }

  const varianceSummary = calculateVarianceSummary(materialsWithActuals);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Estimate vs. Actual Comparison', margin, yPosition);
  yPosition += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Comparing ${materialsWithActuals.length} of ${bom.totalMaterials.length} materials`, margin, yPosition);
  yPosition += 10;

  // Table header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Item', margin, yPosition);
  doc.text('Est.', margin + 60, yPosition, { align: 'right' });
  doc.text('Actual', margin + 90, yPosition, { align: 'right' });
  doc.text('Variance', margin + 120, yPosition, { align: 'right' });
  doc.text('Variance %', margin + 150, yPosition, { align: 'right' });
  yPosition += 7;
  
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition - 2, margin + 170, yPosition - 2);
  yPosition += 3;

  // Materials list
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  varianceSummary.materials.forEach((variance) => {
    checkPageBreak(10);
    
    const itemName = variance.material.name.length > 25 
      ? variance.material.name.substring(0, 22) + '...'
      : variance.material.name;
    
    doc.text(itemName, margin, yPosition);
    doc.text(
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(variance.estimateTotal),
      margin + 60,
      yPosition,
      { align: 'right' }
    );
    doc.text(
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(variance.actualTotal),
      margin + 90,
      yPosition,
      { align: 'right' }
    );
    
    // Color variance (red for positive, green for negative)
    if (variance.varianceDollars > 0) {
      doc.setTextColor(220, 38, 38); // red
    } else if (variance.varianceDollars < 0) {
      doc.setTextColor(34, 197, 94); // green
    }
    
    doc.text(
      (variance.varianceDollars > 0 ? '+' : '') +
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(variance.varianceDollars),
      margin + 120,
      yPosition,
      { align: 'right' }
    );
    doc.text(
      formatVariancePercentage(variance.variancePercentage),
      margin + 150,
      yPosition,
      { align: 'right' }
    );
    
    doc.setTextColor(0, 0, 0); // Reset to black
    yPosition += 7;
  });

  // Totals
  checkPageBreak(15);
  yPosition += 5;
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPosition, margin + 170, yPosition);
  yPosition += 7;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Totals:', margin, yPosition);
  doc.text(
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(varianceSummary.totalEstimate),
    margin + 60,
    yPosition,
    { align: 'right' }
  );
  doc.text(
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(varianceSummary.totalActual),
    margin + 90,
    yPosition,
    { align: 'right' }
  );
  
  if (varianceSummary.totalVarianceDollars > 0) {
    doc.setTextColor(220, 38, 38);
  } else if (varianceSummary.totalVarianceDollars < 0) {
    doc.setTextColor(34, 197, 94);
  }
  
  doc.text(
    (varianceSummary.totalVarianceDollars > 0 ? '+' : '') +
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(varianceSummary.totalVarianceDollars),
    margin + 120,
    yPosition,
    { align: 'right' }
  );
  doc.text(
    formatVariancePercentage(varianceSummary.totalVariancePercentage),
    margin + 150,
    yPosition,
    { align: 'right' }
  );
  
  doc.setTextColor(0, 0, 0);
}
