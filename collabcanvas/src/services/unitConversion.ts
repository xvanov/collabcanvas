/**
 * Unit conversion and parsing utilities for construction measurements
 */

import type { UnitType, UnitConfig } from '../types';
import { UNIT_CONFIGS } from '../types';

/**
 * Parse imperial measurements like "5 feet 10 inches 3/4 inch"
 * Supports formats:
 * - "5 feet 10 inches 3/4 inch"
 * - "5' 10\" 3/4\""
 * - "5 ft 10 in 3/4 in"
 * - "5'10\"3/4\""
 * - "5' 10 3/4\""
 */
export function parseImperialMeasurement(input: string): number {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid input: must be a non-empty string');
  }

  // Clean the input
  let cleaned = input.trim().toLowerCase();
  
  // Remove extra spaces and normalize
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Convert common abbreviations
  cleaned = cleaned.replace(/\bfeet?\b/g, 'ft');
  cleaned = cleaned.replace(/\binches?\b/g, 'in');
  cleaned = cleaned.replace(/\bfoot\b/g, 'ft');
  cleaned = cleaned.replace(/\binch\b/g, 'in');
  
  // Handle apostrophe and quote marks - be more careful with spacing
  // Replace ' with ft and " with in, but preserve spacing
  cleaned = cleaned.replace(/'/g, 'ft');
  cleaned = cleaned.replace(/"/g, 'in');
  
  // Parse the components
  const parts = cleaned.split(/\s+/).filter(part => part.length > 0);
  let totalInches = 0;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    // Skip empty parts
    if (!part) continue;
    
    // Check if this part contains a fraction
    const fractionMatch = part.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const numerator = parseInt(fractionMatch[1]);
      const denominator = parseInt(fractionMatch[2]);
      const fractionValue = numerator / denominator;
      
      // Look for unit in next part
      const nextPart = parts[i + 1];
      if (nextPart === 'in' || nextPart === 'ft') {
        if (nextPart === 'ft') {
          totalInches += fractionValue * 12; // Convert feet to inches
        } else {
          totalInches += fractionValue;
        }
        i++; // Skip the unit part
      } else {
        // Default to inches if no unit specified
        totalInches += fractionValue;
      }
      continue;
    }
    
    // Check if this part is a number
    const numberMatch = part.match(/^(\d+(?:\.\d+)?)$/);
    if (numberMatch) {
      const value = parseFloat(numberMatch[1]);
      
      // Look for unit in next part
      const nextPart = parts[i + 1];
      if (nextPart === 'in' || nextPart === 'ft') {
        if (nextPart === 'ft') {
          totalInches += value * 12; // Convert feet to inches
        } else {
          totalInches += value;
        }
        i++; // Skip the unit part
      } else {
        // Default to inches if no unit specified
        totalInches += value;
      }
      continue;
    }
    
    // Check if this part is a mixed number (like "5ft10in" or "5'10\"")
    const mixedMatch = part.match(/^(\d+)ft(\d+(?:\.\d+)?)in$/);
    if (mixedMatch) {
      const feet = parseInt(mixedMatch[1]);
      const inches = parseFloat(mixedMatch[2]);
      totalInches += feet * 12 + inches;
      continue;
    }
    
    // Check if this part is a number followed by ft (like "5ft")
    const feetMatch = part.match(/^(\d+(?:\.\d+)?)ft$/);
    if (feetMatch) {
      const value = parseFloat(feetMatch[1]);
      totalInches += value * 12;
      continue;
    }
    
    // Check if this part is a number followed by in (like "10in")
    const inchesMatch = part.match(/^(\d+(?:\.\d+)?)in$/);
    if (inchesMatch) {
      const value = parseFloat(inchesMatch[1]);
      totalInches += value;
      continue;
    }
    
    // If we get here, it's probably a unit without a number, skip it
    if (part === 'in' || part === 'ft') {
      continue;
    }
  }
  
  return totalInches;
}

/**
 * Convert a value from one unit to another
 */
export function convertUnit(value: number, fromUnit: UnitType, toUnit: UnitType): number {
  if (fromUnit === toUnit) return value;
  
  const fromConfig = UNIT_CONFIGS[fromUnit];
  const toConfig = UNIT_CONFIGS[toUnit];
  
  // Convert to inches first (imperial base)
  const inches = value * fromConfig.conversionToInches;
  
  // Convert from inches to target unit
  return inches / toConfig.conversionToInches;
}

/**
 * Format a measurement with proper abbreviation
 */
export function formatMeasurement(value: number, unit: UnitType): string {
  const config = UNIT_CONFIGS[unit];
  
  // Round to reasonable precision
  const rounded = Math.round(value * 1000) / 1000;
  
  return `${rounded} ${config.abbreviation}`;
}

/**
 * Parse any measurement input (imperial or metric)
 * Returns the value in the specified unit
 */
export function parseMeasurement(input: string, targetUnit: UnitType): number {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid input: must be a non-empty string');
  }
  
  const cleaned = input.trim().toLowerCase();
  
  // Check if it's a simple number
  const simpleNumber = parseFloat(cleaned);
  if (!isNaN(simpleNumber) && cleaned.match(/^\d+(?:\.\d+)?$/)) {
    return simpleNumber;
  }
  
  // Check if it contains imperial units (feet, inches, ', ")
  if (cleaned.includes('ft') || cleaned.includes('in') || cleaned.includes("'") || cleaned.includes('"') || 
      cleaned.includes('feet') || cleaned.includes('inch')) {
    const inches = parseImperialMeasurement(input);
    return convertUnit(inches, 'inches', targetUnit);
  }
  
  // Check if it contains metric units
  if (cleaned.includes('m') && !cleaned.includes('mm') && !cleaned.includes('cm')) {
    const meters = parseFloat(cleaned.replace(/[^\d.-]/g, ''));
    if (!isNaN(meters)) {
      return convertUnit(meters, 'meters', targetUnit);
    }
  }
  
  if (cleaned.includes('cm')) {
    const cm = parseFloat(cleaned.replace(/[^\d.-]/g, ''));
    if (!isNaN(cm)) {
      return convertUnit(cm, 'centimeters', targetUnit);
    }
  }
  
  if (cleaned.includes('mm')) {
    const mm = parseFloat(cleaned.replace(/[^\d.-]/g, ''));
    if (!isNaN(mm)) {
      return convertUnit(mm, 'millimeters', targetUnit);
    }
  }
  
  // If we can't parse it, try to extract just the number
  const numberMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (numberMatch) {
    return parseFloat(numberMatch[1]);
  }
  
  throw new Error(`Unable to parse measurement: "${input}"`);
}

/**
 * Get all available units
 */
export function getAvailableUnits(): UnitConfig[] {
  return Object.values(UNIT_CONFIGS);
}

/**
 * Get unit config by type
 */
export function getUnitConfig(unit: UnitType): UnitConfig {
  return UNIT_CONFIGS[unit];
}
