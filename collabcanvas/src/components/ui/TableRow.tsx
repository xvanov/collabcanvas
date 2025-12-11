import type { HTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode;
}

/**
 * TableRow - Glass-themed table row with hover glow.
 */
export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={`border-b border-truecost-glass-border/50 hover:bg-truecost-glass-bg/50 hover:shadow-glow transition-all duration-200 ${className}`}
        {...props}
      >
        {children}
      </tr>
    );
  }
);

TableRow.displayName = 'TableRow';

