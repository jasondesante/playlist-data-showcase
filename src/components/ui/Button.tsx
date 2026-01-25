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
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'bg-transparent text-foreground hover:bg-surface-3',
  outline: 'border border-border bg-transparent text-foreground hover:bg-surface-3 hover:border-primary/50',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 min-h-[32px]',
  md: 'h-10 px-4 text-base gap-2 min-h-[40px]',
  lg: 'h-12 px-6 text-lg gap-2.5 min-h-[48px]',
  icon: 'h-10 w-10 p-0 min-h-[40px]',
};

const iconSizeStyles: Record<ButtonSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  icon: 'w-5 h-5',
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
          // Base styles
          'inline-flex items-center justify-center font-medium rounded-md',
          'transition-all duration-[var(--duration-normal)] ease-[var(--ease-out-cubic)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          // Hover and active effects
          'hover:scale-[1.02] active:scale-[0.98]',
          // Disabled state
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
          // Variant and size
          variantStyles[variant],
          sizeStyles[size],
          // Ripple effect (conditionally applied)
          !disableRipple && 'ripple',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <LoadingSpinner size={size === 'lg' ? 'md' : 'sm'} ariaLabel="Loading" />
        ) : (
          <>
            {LeftIcon && <LeftIcon className={cn('shrink-0', iconSizeStyles[size])} />}
            {children && <span>{children}</span>}
            {RightIcon && <RightIcon className={cn('shrink-0', iconSizeStyles[size])} />}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
