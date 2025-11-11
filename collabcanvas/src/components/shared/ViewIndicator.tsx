/**
 * View Indicator Badge Component
 * Displays a badge/indicator on tabs when new content is available
 */

interface ViewIndicatorProps {
  count?: number;
  className?: string;
}

export function ViewIndicator({ count, className = '' }: ViewIndicatorProps) {
  if (!count || count === 0) return null;

  return (
    <span
      className={`ml-2 inline-flex items-center justify-center rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white ${className}`}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}

