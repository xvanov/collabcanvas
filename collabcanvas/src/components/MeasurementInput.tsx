/**
 * MeasurementInput component for construction measurements
 * Provides a better UI for inputting measurements with unit selection
 */

import { useState, useEffect } from 'react';
import type { UnitType } from '../types';
import { getAvailableUnits, UNIT_CONFIGS } from '../types';
import { parseMeasurement, formatMeasurement } from '../services/unitConversion';

interface MeasurementInputProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: number, unit: UnitType) => void;
  initialValue?: number;
  initialUnit?: UnitType;
  title?: string;
}

export function MeasurementInput({
  isOpen,
  onClose,
  onSubmit,
  initialValue = 0,
  initialUnit = 'feet',
  title = 'Enter Measurement'
}: MeasurementInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<UnitType>(initialUnit);
  const [error, setError] = useState('');
  const [parsedValue, setParsedValue] = useState<number | null>(null);

  const availableUnits = getAvailableUnits();

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setInputValue(initialValue > 0 ? initialValue.toString() : '');
      setSelectedUnit(initialUnit);
      setError('');
      setParsedValue(null);
    }
  }, [isOpen, initialValue, initialUnit]);

  // Parse input as user types
  useEffect(() => {
    if (!inputValue.trim()) {
      setParsedValue(null);
      setError('');
      return;
    }

    try {
      const parsed = parseMeasurement(inputValue, selectedUnit);
      setParsedValue(parsed);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid measurement');
      setParsedValue(null);
    }
  }, [inputValue, selectedUnit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (parsedValue === null) {
      setError('Please enter a valid measurement');
      return;
    }

    onSubmit(parsedValue, selectedUnit);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            {/* Input field */}
            <div>
              <label htmlFor="measurement" className="block text-sm font-medium text-gray-700 mb-2">
                Measurement
              </label>
              <input
                id="measurement"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="e.g., 5 feet 10 inches, 2.5m, 150cm"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                autoFocus
              />
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
              {parsedValue !== null && (
                <p className="mt-1 text-sm text-green-600">
                  Parsed as: {formatMeasurement(parsedValue, selectedUnit)}
                </p>
              )}
            </div>

            {/* Unit selection */}
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-2">
                Unit
              </label>
              <select
                id="unit"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value as UnitType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {availableUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {UNIT_CONFIGS[unit].fullName} ({UNIT_CONFIGS[unit].abbreviation})
                  </option>
                ))}
              </select>
            </div>

            {/* Examples */}
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">Examples:</p>
              <ul className="list-disc list-inside space-y-1">
                {selectedUnit === 'feet' && (
                  <>
                    <li>5 feet 10 inches</li>
                    <li>5' 10"</li>
                    <li>5'10"</li>
                    <li>3/4 inch</li>
                    <li>2.5 feet</li>
                  </>
                )}
                {selectedUnit === 'inches' && (
                  <>
                    <li>5 feet 10 inches</li>
                    <li>5' 10"</li>
                    <li>5'10"</li>
                    <li>3/4 inch</li>
                    <li>30 inches</li>
                  </>
                )}
                {selectedUnit === 'meters' && (
                  <>
                    <li>2.5 meters</li>
                    <li>1.5 m</li>
                    <li>0.5 meters</li>
                  </>
                )}
                {selectedUnit === 'centimeters' && (
                  <>
                    <li>150 centimeters</li>
                    <li>150 cm</li>
                    <li>25.5 cm</li>
                  </>
                )}
                {selectedUnit === 'millimeters' && (
                  <>
                    <li>1500 millimeters</li>
                    <li>1500 mm</li>
                    <li>255 mm</li>
                  </>
                )}
                {selectedUnit === 'yards' && (
                  <>
                    <li>5 yards</li>
                    <li>2.5 yards</li>
                    <li>1 yard</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={parsedValue === null}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Set Measurement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
