/**
 * Material Estimation Panel Component
 * PR-4: Displays material calculations and BOM
 */

import { useState } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { MaterialSpec } from '../types/material';
import { downloadBOMAsCSV } from '../services/materialService';
import { updateBOMWithPrices } from '../services/pricingService';

interface MaterialEstimationPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export function MaterialEstimationPanel({ isVisible, onClose }: MaterialEstimationPanelProps) {
  const billOfMaterials = useCanvasStore(state => state.billOfMaterials);
  const setBillOfMaterials = useCanvasStore(state => state.setBillOfMaterials);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [storeNumber, setStoreNumber] = useState<string>(() => (billOfMaterials?.storeNumber || '3620'));

  if (!isVisible) return null;

  const handleExportCSV = () => {
    if (!billOfMaterials) return;
    downloadBOMAsCSV(billOfMaterials);
  };

  const handleRefreshPrices = async () => {
    if (!billOfMaterials) return;
    console.log('[PRICING] Refresh Prices button clicked');
    try {
      const updated = await updateBOMWithPrices(billOfMaterials);
      setBillOfMaterials(updated);
      console.log('[PRICING] Prices updated successfully');
    } catch (error) {
      console.error('[PRICING] Failed to refresh prices:', error);
    }
  };

  // Get unique categories
  const categories = billOfMaterials
    ? Array.from(new Set(billOfMaterials.totalMaterials.map(m => m.category)))
    : [];

  // Filter materials by category
  const filteredMaterials = billOfMaterials
    ? selectedCategory === 'all'
      ? billOfMaterials.totalMaterials
      : billOfMaterials.totalMaterials.filter(m => m.category === selectedCategory)
    : [];

  const allPriced = !!billOfMaterials && billOfMaterials.totalMaterials.every(m => typeof m.priceUSD === 'number');

  return (
    <div className="fixed right-4 top-20 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Material Estimate</h2>
          {billOfMaterials && (
            <p className="text-sm text-gray-500">
              {billOfMaterials.totalMaterials.length} items
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {billOfMaterials && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600" htmlFor="store-number">Store:</label>
              <input
                id="store-number"
                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                value={storeNumber}
                onChange={e => setStoreNumber(e.target.value)}
                onBlur={() => setBillOfMaterials({ ...billOfMaterials, storeNumber })}
              />
            </div>
          )}
          {billOfMaterials && (
            <button
              onClick={handleExportCSV}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              title="Export as CSV"
            >
              Export CSV
            </button>
          )}
          {billOfMaterials && (
            <button
              onClick={handleRefreshPrices}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              title="Refresh Prices"
            >
              Refresh Prices
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            title="Close panel"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              All
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 text-sm rounded-full capitalize transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Materials List */}
      <div className="flex-1 overflow-y-auto p-4">
        {!billOfMaterials ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No materials calculated yet</p>
            <p className="text-sm mt-1">Use the AI Assistant to estimate materials</p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No materials in this category</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMaterials.map((material, index) => (
              <MaterialItem key={`${material.id}-${index}`} material={material} showItemTotal={allPriced} />
            ))}
          </div>
        )}
      </div>

      {/* Footer Summary with Grand Total */}
      {billOfMaterials && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium text-gray-700">Total Items:</span>
            <span className="font-semibold text-gray-900">
              {filteredMaterials.reduce((sum, m) => sum + m.quantity, 0).toFixed(0)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="font-medium text-gray-700">Grand Total:</span>
            <span className="font-semibold text-gray-900">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                filteredMaterials.reduce((sum, m) => sum + (typeof m.priceUSD === 'number' ? m.quantity * m.priceUSD : 0), 0)
              )}
            </span>
          </div>
          {billOfMaterials.notes && (
            <p className="text-xs text-gray-600 mt-2">{billOfMaterials.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Individual material item display
 */
function MaterialItem({ material, showItemTotal }: { material: MaterialSpec; showItemTotal: boolean }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-1">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 text-sm">{material.name}</h3>
          {material.notes && (
            <p className="text-xs text-gray-500 mt-0.5">{material.notes}</p>
          )}
        </div>
        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded capitalize">
          {material.category}
        </span>
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className="text-sm text-gray-600">Quantity:</span>
        <span className="font-semibold text-gray-900">
          {material.quantity.toFixed(0)} <span className="text-gray-500 text-sm">{material.unit}</span>
        </span>
      </div>
      <div className="flex justify-between items-center mt-1">
        <span className="text-sm text-gray-600">Unit Price:</span>
        <span className="font-semibold text-gray-900">
          {typeof material.priceUSD === 'number'
            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(material.priceUSD as number)
            : material.priceError
            ? <span className="text-orange-600 text-xs" title={material.priceError}>Unable to find price</span>
            : 'N/A'}
        </span>
      </div>
      {material.priceError && (
        <div className="mt-1 text-xs text-orange-600 italic">
          {material.priceError}
        </div>
      )}
      {showItemTotal && (
        <div className="flex justify-between items-center mt-1">
          <span className="text-sm text-gray-600">Total:</span>
          <span className="font-semibold text-gray-900">
            {typeof material.priceUSD === 'number'
              ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(material.quantity * (material.priceUSD as number))
              : material.priceError
              ? <span className="text-orange-600 text-xs">N/A</span>
              : 'N/A'}
          </span>
        </div>
      )}
      {material.wasteFactor && (
        <div className="mt-1 text-xs text-gray-500">
          Includes {(material.wasteFactor * 100).toFixed(0)}% waste factor
        </div>
      )}
    </div>
  );
}

