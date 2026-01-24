/**
 * LoadingSpinner Component
 *
 * Displays an animated spinner for loading states.
 * Created as part of Phase 3.6.3 of COMPLETION_PLAN.md.
 *
 * Features:
 * - Animated CSS spinner
 * - Configurable size
 * - Optional label text
 * - Accessible with aria-label
 */

import { cn } from '../../utils/cn';

export type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: SpinnerSize;
  /** Optional label text to show below the spinner */
  label?: string;
  /** Optional additional CSS classes */
  className?: string;
  /** Optional aria-label for accessibility */
  ariaLabel?: string;
}

export function LoadingSpinner({
  size = 'md',
  label,
  className,
  ariaLabel = 'Loading'
}: LoadingSpinnerProps) {
  const getSizeClasses = (): string => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4 border-2';
      case 'lg':
        return 'w-12 h-12 border-4';
      case 'md':
      default:
        return 'w-8 h-8 border-3';
    }
  };

  const getLabelSize = (): string => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-base';
      case 'md':
      default:
        return 'text-sm';
    }
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'rounded-full border-primary border-t-transparent animate-spin',
          getSizeClasses()
        )}
        aria-hidden="true"
      />
      {label && (
        <span className={cn('text-muted-foreground font-medium', getLabelSize())}>
          {label}
        </span>
      )}
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}

export default LoadingSpinner;
