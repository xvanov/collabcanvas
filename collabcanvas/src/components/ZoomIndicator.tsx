/**
 * Zoom Indicator display component
 * Shows current zoom level as a percentage
 */

interface ZoomIndicatorProps {
  scale: number;
}

export default function ZoomIndicator({ scale }: ZoomIndicatorProps) {
  const percentage = Math.round(scale * 100);
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Zoom:</span>
      <span className="text-sm font-mono font-semibold text-gray-900">
        {percentage}%
      </span>
    </div>
  );
}

