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
        return '🟢';
      case 'degraded':
        return '🟡';
      case 'error':
        return '🔴';
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

  const getStatusBgColor = (): string => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700';
      case 'degraded':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
      case 'error':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700';
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        getStatusBgColor(),
        className
      )}
      title={getStatusText()}
    >
      <span className="text-sm" aria-hidden="true">
        {getStatusEmoji()}
      </span>
      {label && <span>{label}</span>}
    </span>
  );
}

export default StatusIndicator;
