/**
 * Comparison View Component
 * AC: #16 - Estimate vs. Actual Comparison
 * Displays side-by-side comparison of estimate vs actual costs with variance highlighting
 */

import type { BillOfMaterials } from '../../types/material';
import { calculateVarianceSummary, formatVariancePercentage, getVarianceSeverity } from '../../services/varianceService';

interface ComparisonViewProps {
  bom: BillOfMaterials;
}

export function ComparisonView({ bom }: ComparisonViewProps) {
  // Filter materials that have actual costs entered
  const materialsWithActuals = bom.totalMaterials.filter(
    m => typeof m.actualCostUSD === 'number'
  );

  // Calculate variance summary
  const varianceSummary = calculateVarianceSummary(materialsWithActuals);

  // Only show comparison if there are actual costs
  if (materialsWithActuals.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Actual Costs Entered</h3>
          <p className="text-gray-600 mb-4">Enter actual costs in the BOM table to see comparison</p>
          <p className="text-sm text-gray-500">Click on "Enter" in the Actual Cost column to add costs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Estimate vs. Actual Comparison</h2>
        {bom.projectName && (
          <p className="text-sm text-gray-600">Project: {bom.projectName}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Comparing {materialsWithActuals.length} of {bom.totalMaterials.length} materials with actual costs
        </p>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Material
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estimate (Unit)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estimate (Total)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actual (Unit)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actual (Total)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Variance ($)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Variance (%)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {varianceSummary.materials.map((variance, index) => {
              const severity = getVarianceSeverity(variance.variancePercentage);
              
              // Color coding: green for under-estimate (negative variance), red for over-estimate (positive variance)
              // Darker colors for larger variances
              const getVarianceColor = () => {
                if (variance.variancePercentage < 0) {
                  // Under-estimate (good) - green shades
                  if (severity === 'critical') return 'text-green-800 bg-green-100';
                  if (severity === 'high') return 'text-green-700 bg-green-50';
                  if (severity === 'medium') return 'text-green-600';
                  return 'text-green-500';
                } else {
                  // Over-estimate (bad) - red shades
                  if (severity === 'critical') return 'text-red-800 bg-red-100';
                  if (severity === 'high') return 'text-red-700 bg-red-50';
                  if (severity === 'medium') return 'text-red-600';
                  return 'text-red-500';
                }
              };

              const varianceColorClass = getVarianceColor();

              return (
                <tr key={`${variance.material.id || variance.material.name}-${index}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{variance.material.name}</div>
                    <div className="text-xs text-gray-500">{variance.material.category}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className="text-sm text-gray-900">
                      {variance.material.quantity.toFixed(0)} <span className="text-gray-500">{variance.material.unit}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className="text-sm text-gray-900">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(variance.material.priceUSD ?? 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(variance.estimateTotal)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className="text-sm text-gray-900">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                        variance.material.actualCostUSD && variance.material.quantity > 0
                          ? variance.material.actualCostUSD / variance.material.quantity
                          : 0
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(variance.actualTotal)}
                    </span>
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-right ${varianceColorClass}`}>
                    <span className="text-sm font-semibold">
                      {variance.varianceDollars > 0 ? '+' : ''}
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(variance.varianceDollars)}
                    </span>
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-right ${varianceColorClass}`}>
                    <span className="text-sm font-semibold">
                      {formatVariancePercentage(variance.variancePercentage)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                Totals:
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(varianceSummary.totalEstimate)}
              </td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(varianceSummary.totalActual)}
              </td>
              <td className={`px-4 py-3 text-right text-sm font-bold ${
                varianceSummary.totalVarianceDollars > 0 
                  ? 'text-red-600' 
                  : varianceSummary.totalVarianceDollars < 0 
                  ? 'text-green-600' 
                  : 'text-gray-900'
              }`}>
                {varianceSummary.totalVarianceDollars > 0 ? '+' : ''}
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(varianceSummary.totalVarianceDollars)}
              </td>
              <td className={`px-4 py-3 text-right text-sm font-bold ${
                varianceSummary.totalVariancePercentage > 0 
                  ? 'text-red-600' 
                  : varianceSummary.totalVariancePercentage < 0 
                  ? 'text-green-600' 
                  : 'text-gray-900'
              }`}>
                {formatVariancePercentage(varianceSummary.totalVariancePercentage)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

