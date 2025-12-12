/**
 * RiskChart - Placeholder visualization for cost confidence/risk.
 */
export function RiskChart() {
  const mockData = [
    { label: 'P10', value: 85, color: 'bg-truecost-danger' },
    { label: 'P25', value: 90, color: 'bg-truecost-warning' },
    { label: 'P50', value: 95, color: 'bg-truecost-cyan' },
    { label: 'P75', value: 105, color: 'bg-truecost-warning' },
    { label: 'P90', value: 115, color: 'bg-truecost-danger' },
  ];

  const maxValue = Math.max(...mockData.map((d) => d.value));

  return (
    <div className="glass-panel p-6">
      <h3 className="font-heading text-h3 text-truecost-text-primary mb-4">
        Cost Confidence Distribution
      </h3>
      <p className="text-body-meta text-truecost-text-secondary mb-6">
        Probability distribution of final project cost
      </p>

      <div className="space-y-4">
        {mockData.map((item) => (
          <div key={item.label} className="flex items-center gap-4">
            <div className="w-12 text-body-meta text-truecost-text-secondary font-medium">{item.label}</div>
            <div className="flex-1 bg-truecost-glass-bg rounded-pill h-8 overflow-hidden">
              <div
                className={`${item.color} h-full rounded-pill transition-all duration-500 flex items-center justify-end pr-3`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              >
                <span className="text-body-meta text-truecost-bg-primary font-medium">${item.value}k</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-body-meta text-truecost-text-muted mt-6 italic">
        * Risk analysis based on Monte Carlo simulation (mock data shown)
      </p>
    </div>
  );
}

