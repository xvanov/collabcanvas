interface MarginControlsProps {
  margin: number;
  overhead: number;
  onMarginChange: (value: number) => void;
  onOverheadChange: (value: number) => void;
}

/**
 * MarginControls - UI controls for margin and overhead adjustments.
 */
export function MarginControls({
  margin,
  overhead,
  onMarginChange,
  onOverheadChange,
}: MarginControlsProps) {
  return (
    <div className="glass-panel p-6 mb-6">
      <h3 className="font-heading text-h3 text-truecost-text-primary mb-4">
        Adjust Margin & Overhead
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Margin */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-body text-body text-truecost-text-primary">Profit Margin</label>
            <span className="font-body text-body text-truecost-cyan font-medium">{margin}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={margin}
            onChange={(e) => onMarginChange(Number(e.target.value))}
            className="w-full h-2 bg-truecost-glass-bg rounded-pill appearance-none cursor-pointer accent-truecost-cyan"
          />
          <div className="flex justify-between text-body-meta text-truecost-text-muted">
            <span>0%</span>
            <span>50%</span>
          </div>
        </div>

        {/* Overhead */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-body text-body text-truecost-text-primary">Overhead</label>
            <span className="font-body text-body text-truecost-cyan font-medium">{overhead}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={overhead}
            onChange={(e) => onOverheadChange(Number(e.target.value))}
            className="w-full h-2 bg-truecost-glass-bg rounded-pill appearance-none cursor-pointer accent-truecost-cyan"
          />
          <div className="flex justify-between text-body-meta text-truecost-text-muted">
            <span>0%</span>
            <span>30%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

