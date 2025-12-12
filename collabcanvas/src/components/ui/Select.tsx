import type { ReactNode, SelectHTMLAttributes } from 'react';
import { forwardRef } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  children: ReactNode;
}

/**
 * Select - Glass-styled select dropdown.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helperText, error, id, className = '', children, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={selectId}
            className="block font-body text-body font-medium text-truecost-text-primary"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`glass-input w-full appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgba(255,255,255,0.55)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10 ${className}`}
          {...props}
        >
          {children}
        </select>
        {helperText && !error && (
          <p className="text-body-meta text-truecost-text-muted">{helperText}</p>
        )}
        {error && <p className="text-body-meta text-truecost-danger">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

