/**
 * FPS Counter display component
 * Shows real-time frame rate for performance monitoring
 */

interface FPSCounterProps {
  fps: number;
}

export default function FPSCounter({ fps }: FPSCounterProps) {
  // Color code FPS for quick visual feedback
  const getFPSColor = () => {
    if (fps >= 55) return 'text-green-600';
    if (fps >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">FPS:</span>
      <span className={`text-sm font-mono font-semibold ${getFPSColor()}`}>
        {fps}
      </span>
    </div>
  );
}

