/**
 * TabBadge Component
 *
 * Displays a notification badge on tab navigation items.
 * Used to indicate pending actions (e.g., pending stat increases on Leveling tab).
 *
 * Features:
 * - Shows count number, capped at "9+" for anything over 9
 * - Optional yellow glow animation for visibility
 * - Small rounded square shape (not circular)
 * - Positioned above-center of tab icon
 */

export interface TabBadgeProps {
  /** The count to display (capped at "9+" for values over 9) */
  count: number;
  /** Whether to show the yellow glow animation */
  showGlow?: boolean;
  /** Additional CSS class name */
  className?: string;
}

/**
 * Format the badge count, capping at "9+" for values over 9.
 */
function formatBadgeCount(count: number): string {
  if (count <= 0) return '';
  return count > 9 ? '9+' : String(count);
}

/**
 * TabBadge component for displaying notification counts on tab buttons.
 *
 * @example
 * ```tsx
 * <TabBadge count={3} showGlow={true} />
 * <TabBadge count={12} showGlow={false} /> // Displays "9+"
 * ```
 */
export function TabBadge({ count, showGlow = false, className = '' }: TabBadgeProps) {
  const displayCount = formatBadgeCount(count);

  // Don't render if count is 0 or less
  if (!displayCount) {
    return null;
  }

  return (
    <span
      className={`tab-badge ${showGlow ? 'tab-badge-glow' : ''} ${className}`.trim()}
      aria-label={`${count} pending items`}
    >
      {displayCount}
    </span>
  );
}

export default TabBadge;
