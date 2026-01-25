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
import './LoadingSpinner.css';

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
  return (
    <div className={cn('loading-spinner', className)}>
      <div
        className={cn('loading-spinner-spinner', size)}
        aria-hidden="true"
      />
      {label && (
        <span className={cn('loading-spinner-label', size)}>
          {label}
        </span>
      )}
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}

export default LoadingSpinner;
