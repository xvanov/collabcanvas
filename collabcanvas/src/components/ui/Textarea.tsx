import type { TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

/**
 * Textarea - Glass-styled multiline input.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, id, className = '', ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).slice(2, 9)}`;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={textareaId}
            className="block font-body text-body font-medium text-truecost-text-primary"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`glass-input w-full resize-none ${className}`}
          {...props}
        />
        {helperText && !error && (
          <p className="text-body-meta text-truecost-text-muted">{helperText}</p>
        )}
        {error && <p className="text-body-meta text-truecost-danger">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

