import type { HTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'subtle';
}

/**
 * GlassPanel - Reusable glass container wrapper.
 */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ children, variant = 'default', className = '', ...props }, ref) => {
    const variantStyles: Record<NonNullable<GlassPanelProps['variant']>, string> = {
      default: 'glass-panel',
      elevated: 'glass-panel shadow-lg',
      subtle: 'glass-panel bg-truecost-glass-bg/30',
    };

    return (
      <div ref={ref} className={`${variantStyles[variant]} ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

GlassPanel.displayName = 'GlassPanel';

