/**
 * File Parser for Scope Upload
 * Parses CSV, TSV, and Excel files with exactly 2 columns: scope, description
 */

import * as XLSX from 'xlsx';

export interface ParseResult {
  success: boolean;
  items: Array<{ scope: string; description: string }>;
  error?: string;
}

/**
 * Detect file type from filename
 */
function detectFileType(filename: string): 'csv' | 'tsv' | 'excel' | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.tsv') || lower.endsWith('.txt')) return 'tsv';
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'excel';
  return null;
}

/**
 * Parse file content (CSV, TSV, or Excel)
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const fileType = detectFileType(file.name);
  
  if (!fileType) {
    return {
      success: false,
      items: [],
      error: 'Unsupported file type. Please upload CSV, TSV, or Excel (.xlsx, .xls) file',
    };
  }

  if (fileType === 'excel') {
    return parseExcel(file);
  } else if (fileType === 'tsv') {
    return parseTSV(file);
  } else {
    return parseCSVFile(file);
  }
}

/**
 * Parse CSV file content
 */
async function parseCSVFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseCSVContent(content);
      resolve(result);
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        items: [],
        error: 'Failed to read CSV file',
      });
    };
    
    reader.readAsText(file);
  });
}

/**
 * Parse TSV file content
 */
async function parseTSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseTSVContent(content);
      resolve(result);
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        items: [],
        error: 'Failed to read TSV file',
      });
    };
    
    reader.readAsText(file);
  });
}

/**
 * Parse Excel file content
 */
async function parseExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          resolve({
            success: false,
            items: [],
            error: 'Excel file has no sheets',
          });
          return;
        }
        
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as string[][];
        
        if (jsonData.length === 0) {
          resolve({
            success: false,
            items: [],
            error: 'Excel file is empty',
          });
          return;
        }
        
        // Parse header
        const headerRow = jsonData[0].map(h => String(h).toLowerCase().trim());
        const headerMap: Record<string, number> = {};
        headerRow.forEach((header, index) => {
          headerMap[header] = index;
        });
        
        // Validate header
        if (!('scope' in headerMap) || !('description' in headerMap)) {
          resolve({
            success: false,
            items: [],
            error: 'Excel must contain columns: scope, description',
          });
          return;
        }
        
        // Parse data rows
        const items: Array<{ scope: string; description: string }> = [];
        const scopeIndex = headerMap['scope'];
        const descriptionIndex = headerMap['description'];
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          
          const scope = String(row[scopeIndex] || '').trim();
          const description = String(row[descriptionIndex] || '').trim();
          
          if (scope || description) {
            items.push({ scope, description });
          }
        }
        
        if (items.length === 0) {
          resolve({
            success: false,
            items: [],
            error: 'No data rows found in Excel file',
          });
          return;
        }
        
        resolve({
          success: true,
          items,
        });
      } catch (error) {
        resolve({
          success: false,
          items: [],
          error: error instanceof Error ? error.message : 'Failed to parse Excel file',
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        items: [],
        error: 'Failed to read Excel file',
      });
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse CSV content string
 */
function parseCSVContent(csvContent: string): ParseResult {
  try {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      return {
        success: false,
        items: [],
        error: 'CSV file is empty',
      };
    }
    
    // Parse header
    const headerLine = lines[0].trim();
    const headers = parseCSVLine(headerLine);
    
    // Validate header
    if (headers.length !== 2) {
      return {
        success: false,
        items: [],
        error: `Expected 2 columns, found ${headers.length}. Required columns: scope, description`,
      };
    }
    
    // Normalize header names (case-insensitive)
    const headerMap: Record<string, number> = {};
    headers.forEach((header, index) => {
      const normalized = header.toLowerCase().trim();
      headerMap[normalized] = index;
    });
    
    // Check for required columns
    if (!('scope' in headerMap) || !('description' in headerMap)) {
      return {
        success: false,
        items: [],
        error: 'CSV must contain columns: scope, description',
      };
    }
    
    // Parse data rows
    const items: Array<{ scope: string; description: string }> = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') continue;
      
      const values = parseCSVLine(line);
      
      if (values.length !== 2) {
        return {
          success: false,
          items: [],
          error: `Row ${i + 1} has ${values.length} columns, expected 2`,
        };
      }
      
      const scopeIndex = headerMap['scope'];
      const descriptionIndex = headerMap['description'];
      
      items.push({
        scope: values[scopeIndex].trim(),
        description: values[descriptionIndex].trim(),
      });
    }
    
    if (items.length === 0) {
      return {
        success: false,
        items: [],
        error: 'No data rows found in CSV file',
      };
    }
    
    return {
      success: true,
      items,
    };
  } catch (error) {
    return {
      success: false,
      items: [],
      error: error instanceof Error ? error.message : 'Failed to parse CSV file',
    };
  }
}

/**
 * Parse TSV content string
 */
function parseTSVContent(tsvContent: string): ParseResult {
  try {
    const lines = tsvContent.split(/\r?\n/).filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      return {
        success: false,
        items: [],
        error: 'TSV file is empty',
      };
    }
    
    // Parse header
    const headerLine = lines[0].trim();
    const headers = headerLine.split('\t').map(h => h.trim());
    
    // Validate header
    if (headers.length !== 2) {
      return {
        success: false,
        items: [],
        error: `Expected 2 columns, found ${headers.length}. Required columns: scope, description`,
      };
    }
    
    // Normalize header names (case-insensitive)
    const headerMap: Record<string, number> = {};
    headers.forEach((header, index) => {
      const normalized = header.toLowerCase().trim();
      headerMap[normalized] = index;
    });
    
    // Check for required columns
    if (!('scope' in headerMap) || !('description' in headerMap)) {
      return {
        success: false,
        items: [],
        error: 'TSV must contain columns: scope, description',
      };
    }
    
    // Parse data rows
    const items: Array<{ scope: string; description: string }> = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') continue;
      
      const values = line.split('\t').map(v => v.trim());
      
      if (values.length !== 2) {
        return {
          success: false,
          items: [],
          error: `Row ${i + 1} has ${values.length} columns, expected 2`,
        };
      }
      
      const scopeIndex = headerMap['scope'];
      const descriptionIndex = headerMap['description'];
      
      items.push({
        scope: values[scopeIndex],
        description: values[descriptionIndex],
      });
    }
    
    if (items.length === 0) {
      return {
        success: false,
        items: [],
        error: 'No data rows found in TSV file',
      };
    }
    
    return {
      success: true,
      items,
    };
  } catch (error) {
    return {
      success: false,
      items: [],
      error: error instanceof Error ? error.message : 'Failed to parse TSV file',
    };
  }
}

/**
 * Parse a single CSV line, handling quoted values with commas
 * Improved to handle commas within quoted fields correctly
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote (double quote)
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of value (comma outside quotes)
      values.push(current);
      current = '';
    } else {
      // Regular character (including commas inside quotes)
      current += char;
    }
  }
  
  // Add last value
  values.push(current);
  
  return values;
}

// Legacy export for backward compatibility
export function parseCSV(csvContent: string): ParseResult {
  return parseCSVContent(csvContent);
}

