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
  sm: 'input-sm',
  md: 'input-md',
  lg: 'input-lg',
};

const iconSizeStyles: Record<InputSize, string> = {
  sm: 'input-icon-sm',
  md: 'input-icon-md',
  lg: 'input-icon-lg',
};

const labelSizeStyles: Record<InputSize, string> = {
  sm: 'input-label-sm',
  md: 'input-label-md',
  lg: 'input-label-lg',
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
      <div className={cn('input-container', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'input-label',
              labelSizeStyles[size],
              disabled && 'input-label-disabled'
            )}
          >
            {label}
          </label>
        )}

        <div className="input-wrapper">
          {/* Left Icon */}
          {LeftIcon && (
            <div className={cn('input-icon', 'input-icon-left', disabled && 'input-icon-disabled')}>
              <LeftIcon className={iconSizeStyles[size]} />
            </div>
          )}

          {/* Input Field */}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              'input-field',
              sizeStyles[size],
              LeftIcon && 'input-field-with-left-icon',
              RightIcon && 'input-field-with-right-icon',
              hasError && 'input-field-error',
              className
            )}
            {...props}
          />

          {/* Right Icon */}
          {RightIcon && (
            <div className={cn('input-icon', 'input-icon-right', disabled && 'input-icon-disabled')}>
              <RightIcon className={iconSizeStyles[size]} />
            </div>
          )}
        </div>

        {/* Helper Text / Error Message */}
        {showMessage && (
          <div className={cn('input-helper-text', hasError && 'input-helper-text-error', disabled && 'input-helper-text-disabled')}>
            {hasError ? error : helperText}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
