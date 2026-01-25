/**
 * Button Component
 *
 * Reusable button component with variants, sizes, and animations.
 * Part of UI/UX Improvement Plan - Sprint 1: Foundation.
 *
 * Features:
 * - Variants: primary, secondary, ghost, outline, destructive
 * - Sizes: sm, md, lg, icon
 * - Ripple effect on click
 * - Hover scale and active press effects
 * - Loading state with spinner
 * - Left/right icon support
 * - Focus ring with offset
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { LoadingSpinner } from './LoadingSpinner';
import type { LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Shows loading state with spinner */
  isLoading?: boolean;
  /** Icon to display on the left of text */
  leftIcon?: LucideIcon;
  /** Icon to display on the right of text */
  rightIcon?: LucideIcon;
  /** Child content */
  children?: ReactNode;
  /** Removes the ripple effect */
  disableRipple?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'button-primary',
  secondary: 'button-secondary',
  ghost: 'button-ghost',
  outline: 'button-outline',
  destructive: 'button-destructive',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'button-sm',
  md: 'button-md',
  lg: 'button-lg',
  icon: 'button-icon',
};

const iconSizeStyles: Record<ButtonSize, string> = {
  sm: 'button-icon-sm',
  md: 'button-icon-md',
  lg: 'button-icon-lg',
  icon: 'button-icon-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      children,
      disableRipple = false,
      disabled,
      className,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          'button',
          variantStyles[variant],
          sizeStyles[size],
          !disableRipple && 'ripple',
          isDisabled && 'button-disabled',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <LoadingSpinner size={size === 'lg' ? 'md' : 'sm'} ariaLabel="Loading" />
        ) : (
          <>
            {LeftIcon && <LeftIcon className={cn('button-icon', iconSizeStyles[size])} />}
            {children && <span className="button-text">{children}</span>}
            {RightIcon && <RightIcon className={cn('button-icon', iconSizeStyles[size])} />}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
