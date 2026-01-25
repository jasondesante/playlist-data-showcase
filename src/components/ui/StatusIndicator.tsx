/**
 * StatusIndicator Component
 *
 * Displays a visual health status badge with emoji indicator.
 * Created as part of Phase 3.6.2 of COMPLETION_PLAN.md.
 *
 * Features:
 * - 🟢 for healthy status
 * - 🟡 for degraded status
 * - 🔴 for error status
 * - Badge styling with appropriate colors
 * - Optional label text
 * - Pure CSS (no Tailwind)
 */

import { cn } from '../../utils/cn';

export type StatusType = 'healthy' | 'degraded' | 'error';

interface StatusIndicatorProps {
  /** The status to display */
  status: StatusType;
  /** Optional label text to show next to the indicator */
  label?: string;
  /** Optional additional CSS classes */
  className?: string;
}

export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  const getStatusEmoji = (): string => {
    switch (status) {
      case 'healthy':
        return '';
      case 'degraded':
        return '';
      case 'error':
        return '';
      default:
        return '';
    }
  };

  const getStatusText = (): string => {
    switch (status) {
      case 'healthy':
        return 'Healthy';
      case 'degraded':
        return 'Degraded';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <span
      className={cn(
        'status-badge',
        `status-badge-${status}`,
        className
      )}
      title={getStatusText()}
    >
      <span className="status-badge-emoji" aria-hidden="true">
        {getStatusEmoji()}
      </span>
      {label && <span className="status-badge-label">{label}</span>}
    </span>
  );
}

export default StatusIndicator;
