/**
 * Card Component
 *
 * Reusable card container component with variants and padding options.
 * Part of UI/UX Improvement Plan - Sprint 1: Foundation.
 *
 * Features:
 * - Variants: default, elevated, outlined, flat
 * - Padding options: none, sm, md, lg
 * - Hoverable option for interactive cards
 * - Consistent shadow system using CSS variables
 * - Smooth transitions for hover states
 */

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'flat';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual variant of the card */
  variant?: CardVariant;
  /** Padding size inside the card */
  padding?: CardPadding;
  /** Enables hover effects for interactive cards */
  hoverable?: boolean;
  /** Child content */
  children?: ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-card border border-border shadow-[var(--shadow-sm)]',
  elevated: 'bg-surface-2 border border-border shadow-[var(--shadow-md)]',
  outlined: 'bg-card border-2 border-border shadow-none',
  flat: 'bg-surface-1 border-0 shadow-none',
};

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      hoverable = false,
      children,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'rounded-lg',
          // Variant and padding
          variantStyles[variant],
          paddingStyles[padding],
          // Transitions
          'transition-all duration-[var(--duration-normal)] ease-[var(--ease-out-cubic)]',
          // Hoverable state
          hoverable && [
            'cursor-pointer hover:shadow-[var(--shadow-md)] hover:bg-surface-hover hover:border-primary/50',
            'hover:scale-[1.01] active:scale-[0.99]',
          ],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * CardHeader component for consistent card header styling
 */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-1.5 mb-4', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

/**
 * CardTitle component for card titles
 */
export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children?: ReactNode;
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn(
          'text-xl font-semibold text-foreground leading-tight',
          className
        )}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

CardTitle.displayName = 'CardTitle';

/**
 * CardDescription component for card descriptions/subtitles
 */
export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children?: ReactNode;
}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

/**
 * CardContent component for main card content area
 */
export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('', className)} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

/**
 * CardFooter component for card footer actions
 */
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-3 mt-4 pt-4 border-t border-border', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export default Card;
