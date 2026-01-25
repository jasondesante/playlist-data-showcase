/**
 * Input Component
 *
 * Reusable input component with label, icons, error states, and helper text.
 * Part of UI/UX Improvement Plan - Sprint 1: Foundation.
 *
 * Features:
 * - Label with proper for/id association
 * - Left/right icon support
 * - Error state with red border
 * - Helper text display
 * - Focus ring on focus
 * - Hover border color change
 */

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import type { LucideIcon } from 'lucide-react';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text displayed above the input */
  label?: string;
  /** Icon to display on the left side of the input */
  leftIcon?: LucideIcon;
  /** Icon to display on the right side of the input */
  rightIcon?: LucideIcon;
  /** Error message to display - shows error state when provided */
  error?: string;
  /** Helper text to display below the input */
  helperText?: string;
  /** Size of the input */
  size?: InputSize;
  /** Container class for wrapping the input group */
  containerClassName?: string;
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'h-9 px-3 text-sm min-h-[36px]',
  md: 'h-11 px-4 text-base min-h-[44px]',
  lg: 'h-13 px-5 text-lg min-h-[52px]',
};

const iconSizeStyles: Record<InputSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const labelSizeStyles: Record<InputSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      error,
      helperText,
      size = 'md',
      containerClassName,
      disabled,
      className,
      id,
      ...props
    },
    ref
  ) => {
    // Generate unique ID if not provided
    const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;

    const hasError = !!error;
    const hasHelperText = !!helperText;
    const showMessage = hasError || hasHelperText;

    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'font-medium text-foreground',
              'transition-colors duration-[var(--duration-fast)]',
              labelSizeStyles[size],
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {/* Left Icon */}
          {LeftIcon && (
            <div
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2',
                'text-muted-foreground',
                'transition-colors duration-[var(--duration-fast)]',
                'pointer-events-none',
                disabled && 'opacity-50'
              )}
            >
              <LeftIcon className={iconSizeStyles[size]} />
            </div>
          )}

          {/* Input Field */}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              // Base styles
              'flex w-full rounded-md font-medium',
              'bg-background text-foreground',
              'border transition-all duration-[var(--duration-normal)]',
              // Focus ring
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
              // Placeholder
              'placeholder:text-muted-foreground/60',
              // Disabled state
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
              // Size
              sizeStyles[size],
              // Icon padding adjustments
              LeftIcon && 'pl-11',
              RightIcon && 'pr-11',
              // Error state
              hasError
                ? 'border-destructive focus:border-destructive focus:ring-destructive'
                : 'border-input hover:border-primary/50 focus:border-primary',
              className
            )}
            {...props}
          />

          {/* Right Icon */}
          {RightIcon && (
            <div
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2',
                'text-muted-foreground',
                'transition-colors duration-[var(--duration-fast)]',
                'pointer-events-none',
                disabled && 'opacity-50'
              )}
            >
              <RightIcon className={iconSizeStyles[size]} />
            </div>
          )}
        </div>

        {/* Helper Text / Error Message */}
        {showMessage && (
          <p
            className={cn(
              'text-sm font-medium',
              'transition-colors duration-[var(--duration-fast)]',
              hasError ? 'text-destructive' : 'text-muted-foreground',
              disabled && 'opacity-50'
            )}
          >
            {hasError ? error : helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
