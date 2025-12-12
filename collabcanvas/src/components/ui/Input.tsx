import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

/**
 * Input - Glass-styled text input.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, id, className = '', ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block font-body text-body font-medium text-truecost-text-primary"
          >
            {label}
          </label>
        )}
        <input ref={ref} id={inputId} className={`glass-input w-full ${className}`} {...props} />
        {helperText && !error && (
          <p className="text-body-meta text-truecost-text-muted">{helperText}</p>
        )}
        {error && <p className="text-body-meta text-truecost-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

