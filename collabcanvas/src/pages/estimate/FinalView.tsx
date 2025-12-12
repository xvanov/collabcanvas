import { useState } from 'react';
import { AuthenticatedLayout } from '../../components/layouts/AuthenticatedLayout';
import { EstimateSummary } from '../../components/estimate/EstimateSummary';
import { BreakdownTabs } from '../../components/estimate/BreakdownTabs';
import { BreakdownTable } from '../../components/estimate/BreakdownTable';
import { MarginControls } from '../../components/estimate/MarginControls';
import { RiskChart } from '../../components/estimate/RiskChart';

/**
 * FinalView - Final estimate summary with breakdown, controls, and risk.
 */
export function FinalView() {
  const [activeTab, setActiveTab] = useState('overview');
  const [margin, setMargin] = useState(15);
  const [overhead, setOverhead] = useState(10);

  const baseCost = 125000;
  const totalCost = Math.round(baseCost * (1 + margin / 100) * (1 + overhead / 100));
  const confidenceRanges = {
    p50: totalCost,
    p80: Math.round(totalCost * 1.08),
    p90: Math.round(totalCost * 1.15),
  };

  const breakdownData = {
    overview: [
      { id: '1', item: 'Materials', totalCost: 65000, category: 'Direct Costs' },
      { id: '2', item: 'Labor', totalCost: 45000, category: 'Direct Costs' },
      { id: '3', item: 'Equipment', totalCost: 15000, category: 'Direct Costs' },
      { id: '4', item: 'Permits & Fees', totalCost: 5000, category: 'Soft Costs' },
    ],
    'by-trade': [
      { id: '1', item: 'Foundation & Concrete', totalCost: 28000 },
      { id: '2', item: 'Framing & Rough Carpentry', totalCost: 32000 },
      { id: '3', item: 'Electrical', totalCost: 18000 },
      { id: '4', item: 'Plumbing', totalCost: 16000 },
      { id: '5', item: 'HVAC', totalCost: 15000 },
      { id: '6', item: 'Drywall & Interior Finish', totalCost: 22000 },
    ],
    materials: [
      { id: '1', item: 'Concrete', quantity: '125', unit: 'CY', unitCost: 150, totalCost: 18750 },
      { id: '2', item: 'Framing Lumber', quantity: '2,400', unit: 'BF', unitCost: 8, totalCost: 19200 },
      { id: '3', item: 'Drywall', quantity: '4,800', unit: 'SF', unitCost: 1.5, totalCost: 7200 },
      { id: '4', item: 'Roofing Shingles', quantity: '25', unit: 'SQ', unitCost: 320, totalCost: 8000 },
    ],
    labor: [
      { id: '1', item: 'General Labor', quantity: '320', unit: 'hrs', unitCost: 45, totalCost: 14400 },
      { id: '2', item: 'Skilled Carpentry', quantity: '240', unit: 'hrs', unitCost: 65, totalCost: 15600 },
      { id: '3', item: 'Licensed Electrician', quantity: '120', unit: 'hrs', unitCost: 85, totalCost: 10200 },
      { id: '4', item: 'Licensed Plumber', quantity: '80', unit: 'hrs', unitCost: 90, totalCost: 7200 },
    ],
    equipment: [
      { id: '1', item: 'Excavator Rental', quantity: '5', unit: 'days', unitCost: 450, totalCost: 2250 },
      { id: '2', item: 'Concrete Mixer', quantity: '10', unit: 'days', unitCost: 125, totalCost: 1250 },
      { id: '3', item: 'Scaffolding', quantity: '30', unit: 'days', unitCost: 75, totalCost: 2250 },
    ],
  };

  const handleDownloadPDF = () => {
    console.log('PDF download triggered (stub)');
    alert('PDF export functionality will be connected to backend implementation.');
  };

  return (
    <AuthenticatedLayout>
      <div className="container-spacious py-section max-w-app pt-20 pb-14 md:pt-24">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex px-4 py-2 rounded-full border border-truecost-glass-border text-white font-heading text-body">
            Final Estimate
          </div>
          <button onClick={handleDownloadPDF} className="btn-pill-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download PDF
          </button>
        </div>

        {/* Summary */}
        <EstimateSummary totalCost={totalCost} confidenceRanges={confidenceRanges} timeline="12-16 weeks" />

        {/* Margin/Overhead Controls */}
        <MarginControls margin={margin} overhead={overhead} onMarginChange={setMargin} onOverheadChange={setOverhead} />

        {/* Tabs */}
        <BreakdownTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Breakdown */}
        <BreakdownTable
          rows={breakdownData[activeTab as keyof typeof breakdownData]}
          showQuantity={activeTab !== 'overview' && activeTab !== 'by-trade'}
        />

        {/* Risk */}
        <div className="mt-8">
          <RiskChart />
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

