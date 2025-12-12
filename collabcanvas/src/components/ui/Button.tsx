import type { ButtonHTMLAttributes, ElementType, ReactNode, Ref } from 'react';
import { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'utility';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  as?: ElementType;
}

/**
 * Button - Unified button component with TrueCost theme variants.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      icon,
      children,
      disabled,
      className = '',
      as: Component = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'font-body font-medium transition-all duration-120 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-truecost-cyan focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

    const variantStyles: Record<ButtonVariant, string> = {
      primary: 'btn-pill-primary hover:shadow-glow active:shadow-none',
      secondary:
        'btn-pill-secondary hover:border-truecost-cyan hover:text-truecost-cyan active:bg-truecost-cyan/10',
      utility:
        'p-2 text-truecost-cyan hover:text-truecost-teal rounded-lg hover:bg-truecost-glass-bg/50 active:bg-truecost-glass-bg',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'px-4 py-2 text-body-meta',
      md: 'px-6 py-3 text-body',
      lg: 'px-8 py-4 text-body',
    };

    const widthStyles = fullWidth ? 'w-full' : '';
    const appliedSizeStyles = variant === 'utility' ? '' : sizeStyles[size];

    return (
      <Component
        ref={ref as Ref<HTMLButtonElement>}
        disabled={disabled || loading}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${appliedSizeStyles}
          ${widthStyles}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {children}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            {icon}
            {children}
          </span>
        )}
      </Component>
    );
  }
);

Button.displayName = 'Button';

