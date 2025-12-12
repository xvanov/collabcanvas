import type { HTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
}

/**
 * Card - Glass-styled card with optional hover effect.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, hoverable = false, className = '', ...props }, ref) => {
    const hoverStyles = hoverable
      ? 'transition-all duration-300 hover:shadow-glow hover:-translate-y-1 cursor-pointer'
      : '';

    return (
      <div ref={ref} className={`glass-panel ${hoverStyles} ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

