/**
 * CADDataTable - Placeholder for extracted quantities / BoQ.
 */
export function CADDataTable() {
  const mockData = [
    { id: '1', item: 'Concrete Foundation', quantity: '125', unit: 'CY', category: 'Structural' },
    { id: '2', item: 'Framing Lumber', quantity: '2,400', unit: 'BF', category: 'Framing' },
    { id: '3', item: 'Drywall', quantity: '4,800', unit: 'SF', category: 'Interior' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-h3 text-truecost-text-primary">Extracted Quantities</h3>
        <button className="btn-pill-secondary text-sm px-4 py-2">Edit Items</button>
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-truecost-glass-border">
              <th className="text-left p-4 font-heading text-body-meta text-truecost-text-secondary">Item</th>
              <th className="text-left p-4 font-heading text-body-meta text-truecost-text-secondary">Quantity</th>
              <th className="text-left p-4 font-heading text-body-meta text-truecost-text-secondary">Unit</th>
              <th className="text-left p-4 font-heading text-body-meta text-truecost-text-secondary">Category</th>
              <th className="text-right p-4 font-heading text-body-meta text-truecost-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockData.map((row) => (
              <tr
                key={row.id}
                className="border-b border-truecost-glass-border/50 hover:bg-truecost-glass-bg/50 transition-colors"
              >
                <td className="p-4 font-body text-body text-truecost-text-primary">{row.item}</td>
                <td className="p-4 font-body text-body text-truecost-text-primary">{row.quantity}</td>
                <td className="p-4 font-body text-body text-truecost-text-secondary">{row.unit}</td>
                <td className="p-4 font-body text-body text-truecost-text-secondary">{row.category}</td>
                <td className="p-4 text-right">
                  <button className="text-truecost-cyan hover:text-truecost-teal transition-colors p-1" title="Edit item">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-body-meta text-truecost-text-muted italic">
        * Quantities extracted from uploaded plans (placeholder data shown)
      </p>
    </div>
  );
}

