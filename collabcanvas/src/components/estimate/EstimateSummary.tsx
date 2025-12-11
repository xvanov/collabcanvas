interface EstimateSummaryProps {
  totalCost: number;
  confidenceRanges: {
    p50: number;
    p80: number;
    p90: number;
  };
  timeline: string;
}

/**
 * EstimateSummary - summary panel for final estimate.
 */
export function EstimateSummary({ totalCost, confidenceRanges, timeline }: EstimateSummaryProps) {
  return (
    <div className="glass-panel p-8 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <p className="font-body text-body-meta text-truecost-text-secondary mb-2">
            Total Estimated Cost
          </p>
          <p className="font-heading text-5xl md:text-6xl text-truecost-cyan mb-4">
            ${totalCost.toLocaleString()}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="glass-panel p-4 bg-truecost-glass-bg/30">
              <p className="font-body text-body-meta text-truecost-text-muted mb-1">P50 (Median)</p>
              <p className="font-body text-body text-truecost-text-primary font-medium">
                ${confidenceRanges.p50.toLocaleString()}
              </p>
            </div>
            <div className="glass-panel p-4 bg-truecost-glass-bg/30">
              <p className="font-body text-body-meta text-truecost-text-muted mb-1">P80 (Likely)</p>
              <p className="font-body text-body text-truecost-text-primary font-medium">
                ${confidenceRanges.p80.toLocaleString()}
              </p>
            </div>
            <div className="glass-panel p-4 bg-truecost-glass-bg/30">
              <p className="font-body text-body-meta text-truecost-text-muted mb-1">P90 (Conservative)</p>
              <p className="font-body text-body text-truecost-text-primary font-medium">
                ${confidenceRanges.p90.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 bg-truecost-glass-bg/30 h-full flex flex-col justify-center">
          <p className="font-body text-body-meta text-truecost-text-secondary mb-2">Estimated Timeline</p>
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-truecost-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="font-heading text-h2 text-truecost-text-primary">{timeline}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

