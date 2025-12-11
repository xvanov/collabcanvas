interface BreakdownRow {
  id: string;
  item: string;
  quantity?: string;
  unit?: string;
  unitCost?: number;
  totalCost: number;
  category?: string;
}

interface BreakdownTableProps {
  rows: BreakdownRow[];
  showQuantity?: boolean;
}

/**
 * BreakdownTable - glass table for estimate breakdown data.
 */
export function BreakdownTable({ rows, showQuantity = true }: BreakdownTableProps) {
  return (
    <div className="glass-panel overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-truecost-glass-border">
            <th className="text-left p-4 font-heading text-body-meta text-truecost-text-secondary">Item</th>
            {showQuantity && (
              <>
                <th className="text-left p-4 font-heading text-body-meta text-truecost-text-secondary">Quantity</th>
                <th className="text-left p-4 font-heading text-body-meta text-truecost-text-secondary">Unit Cost</th>
              </>
            )}
            <th className="text-right p-4 font-heading text-body-meta text-truecost-text-secondary">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-truecost-glass-border/50 hover:bg-truecost-glass-bg/50 hover:shadow-glow transition-all duration-200"
            >
              <td className="p-4">
                <p className="font-body text-body text-truecost-text-primary">{row.item}</p>
                {row.category && <p className="text-body-meta text-truecost-text-muted">{row.category}</p>}
              </td>
              {showQuantity && (
                <>
                  <td className="p-4 font-body text-body text-truecost-text-secondary">
                    {row.quantity && row.unit ? `${row.quantity} ${row.unit}` : '—'}
                  </td>
                  <td className="p-4 font-body text-body text-truecost-text-secondary">
                    {row.unitCost ? `$${row.unitCost.toLocaleString()}` : '—'}
                  </td>
                </>
              )}
              <td className="p-4 text-right font-body text-body text-truecost-cyan font-medium">
                ${row.totalCost.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

