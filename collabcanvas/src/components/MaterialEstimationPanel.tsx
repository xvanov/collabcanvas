/**
 * Material Estimation Panel Component
 * PR-4: Displays material calculations and BOM
 */

import { useState, useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { MaterialSpec, BillOfMaterials } from '../types/material';
import { downloadBOMAsCSV } from '../services/materialService';
import { fetchPricesForBOM, type PriceFetchStats } from '../services/pricingService';

interface MaterialEstimationPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export function MaterialEstimationPanel({ isVisible, onClose }: MaterialEstimationPanelProps) {
  const billOfMaterials = useCanvasStore(state => state.billOfMaterials);
  const setBillOfMaterials = useCanvasStore(state => state.setBillOfMaterials);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [storeNumber, setStoreNumber] = useState<string>(() => (billOfMaterials?.storeNumber || '3620'));
  const [fetchingPrices, setFetchingPrices] = useState<Set<string>>(new Set()); // Track which materials are being fetched
  const [priceStats, setPriceStats] = useState<PriceFetchStats | null>(null);

  const handleExportCSV = useCallback(() => {
    if (!billOfMaterials) return;
    downloadBOMAsCSV(billOfMaterials);
  }, [billOfMaterials]);

  const handleRefreshPrices = useCallback(async () => {
    if (!billOfMaterials) return;
    console.log('[PRICING] Refresh Prices button clicked');
    
    // Mark all materials as fetching
    const materialIds = new Set(billOfMaterials.totalMaterials.map(m => m.id || m.name));
    setFetchingPrices(materialIds);
    setPriceStats(null);

    try {
      // Progressive update callback - updates BOM as each price completes
      const updateProgress = (stats: PriceFetchStats, updatedBOM?: BillOfMaterials) => {
        setPriceStats(stats);
        
        // Update BOM state progressively as each price completes
        if (updatedBOM) {
          setBillOfMaterials(updatedBOM);
          
          // Remove completed materials from fetching set
          const completedMaterials = updatedBOM.totalMaterials.filter(m => 
            typeof m.priceUSD === 'number' || m.priceError
          );
          const completedIds = new Set(completedMaterials.map(m => m.id || m.name));
          setFetchingPrices(prev => {
            const next = new Set(prev);
            completedIds.forEach(id => next.delete(id));
            return next;
          });
        }
        
        console.log(`[PRICING] Progress: ${stats.successful}/${stats.total} complete (${stats.successRate.toFixed(1)}%)`);
      };

      // Use fetchPricesForBOM with progressive updates
      const result = await fetchPricesForBOM(
        { ...billOfMaterials, storeNumber },
        updateProgress,
        false // Don't retry failed automatically
      );

      // Final update (in case callback wasn't called for last item)
      setBillOfMaterials(result.bom);
      setPriceStats(result.stats);
      console.log(`[PRICING] Prices updated successfully: ${result.stats.successful}/${result.stats.total} (${result.stats.successRate.toFixed(1)}%)`);
    } catch (error) {
      console.error('[PRICING] Failed to refresh prices:', error);
    } finally {
      setFetchingPrices(new Set());
    }
  }, [billOfMaterials, storeNumber, setBillOfMaterials]);

  // Early return AFTER all hooks (Rules of Hooks)
  if (!isVisible) return null;

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
              onClick={() => window.open('/compare-prices', '_blank')}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              title="Compare prices across retailers"
            >
              Compare Prices
            </button>
          )}
          {billOfMaterials && (
            <button
              onClick={handleRefreshPrices}
              disabled={fetchingPrices.size > 0}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                fetchingPrices.size > 0
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              title={fetchingPrices.size > 0 ? `Fetching prices... (${fetchingPrices.size} remaining)` : 'Refresh Prices'}
            >
              {fetchingPrices.size > 0 ? (
                <span className="flex items-center gap-1">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Fetching...
                </span>
              ) : (
                'Refresh Prices'
              )}
            </button>
          )}
          {priceStats && (
            <div className="text-xs text-gray-600 px-2">
              {priceStats.successful}/{priceStats.total} priced ({priceStats.successRate.toFixed(0)}%)
            </div>
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
              <MaterialItem 
                key={`${material.id}-${index}`} 
                material={material} 
                showItemTotal={allPriced}
                isFetching={fetchingPrices.has(material.id || material.name)}
              />
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
function MaterialItem({ material, showItemTotal, isFetching }: { material: MaterialSpec; showItemTotal: boolean; isFetching?: boolean }) {
  return (
    <div className={`bg-white border rounded-lg p-3 hover:shadow-md transition-all ${
      isFetching ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
    }`}>
      <div className="flex justify-between items-start mb-1">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 text-sm">{material.name}</h3>
            {isFetching && (
              <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
          </div>
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
          {isFetching ? (
            <span className="text-blue-600 text-xs flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Fetching...
            </span>
          ) : typeof material.priceUSD === 'number' ? (
            <span className="text-green-600">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(material.priceUSD as number)}
            </span>
          ) : material.priceError ? (
            <span className="text-orange-600 text-xs" title={material.priceError}>Unable to find price</span>
          ) : (
            'N/A'
          )}
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

