/**
 * ComparisonSection - Manual vs AI comparison in glass panel.
 */
export function ComparisonSection() {
  const comparison = {
    manual: [
      'Hours of manual data entry',
      'Static pricing that gets outdated',
      'No location-specific adjustments',
      'Single-point estimates (risky)',
      'Inconsistent formats',
    ],
    truecost: [
      'Minutes with AI automation',
      'Real-time cost data integration',
      'Automatic location intelligence',
      'Risk-adjusted ranges (P50/P80/P90)',
      'Professional PDF reports',
    ],
  };

  return (
    <section id="comparison" className="py-section md:py-20 lg:py-24 bg-truecost-bg-surface">
      <div className="container-spacious">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="font-heading text-h2-mobile md:text-h2 text-truecost-text-primary mb-4">
              Why Switch to TrueCost?
            </h2>
            <p className="font-body text-body text-truecost-text-secondary max-w-2xl mx-auto">
              Stop losing money on inaccurate estimates. See the difference AI makes.
            </p>
          </div>

          <div className="glass-panel p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              {/* Manual/Spreadsheet Column */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-truecost-text-muted/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-truecost-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="font-heading text-xl text-truecost-text-primary">Manual / Spreadsheets</h3>
                </div>

                <ul className="space-y-3">
                  {comparison.manual.map((item, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <span className="text-truecost-text-muted mt-1">•</span>
                      <span className="font-body text-body text-truecost-text-secondary">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* TrueCost AI Column */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-truecost-cyan to-truecost-teal flex items-center justify-center">
                    <svg className="w-6 h-6 text-truecost-bg-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="font-heading text-xl text-truecost-cyan">TrueCost AI</h3>
                </div>

                <ul className="space-y-3">
                  {comparison.truecost.map((item, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-truecost-cyan mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-body text-body text-truecost-text-primary">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

