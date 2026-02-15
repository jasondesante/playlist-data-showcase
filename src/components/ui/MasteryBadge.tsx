import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MasteryLevel } from '@/hooks/useMastery';
import './MasteryBadge.css';

/**
 * MasteryBadge Component
 *
 * Displays a visual badge indicating the mastery level of a track.
 * Badges are styled based on mastery level:
 * - None (0): No badge displayed
 * - Basic (1-4): Bronze circle
 * - Familiar (5-9): Silver star
 * - Mastered (10+): Gold crown with glow animation
 *
 * Features:
 * - Tooltip on hover showing mastery level name
 * - Three size variants: sm, md, lg
 * - Glow animation for mastered tracks
 */

export interface MasteryBadgeProps {
  /** The mastery level name */
  level: MasteryLevel;
  /** Size variant of the badge */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS class name */
  className?: string;
}

/**
 * Get the display label for a mastery level
 */
function getMasteryLabel(level: MasteryLevel): string {
  switch (level) {
    case 'mastered':
      return 'Mastered';
    case 'familiar':
      return 'Familiar';
    case 'basic':
      return 'Basic';
    case 'none':
    default:
      return '';
  }
}

/**
 * Check if badge should be displayed (non-none levels)
 */
function shouldDisplayBadge(level: MasteryLevel): boolean {
  return level !== 'none';
}

/**
 * MasteryBadge component for displaying track mastery status.
 *
 * @example
 * ```tsx
 * <MasteryBadge level="basic" size="sm" />
 * <MasteryBadge level="familiar" size="md" />
 * <MasteryBadge level="mastered" size="lg" />
 * ```
 */
export function MasteryBadge({ level, size = 'md', className = '' }: MasteryBadgeProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, visible: false });

  // Don't render if level is 'none'
  if (!shouldDisplayBadge(level)) {
    return null;
  }

  const label = getMasteryLabel(level);

  const handleMouseEnter = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      // Position tooltip above the badge, centered horizontally
      setPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
        visible: true
      });
    }
  };

  const handleMouseLeave = () => {
    setPosition(prev => ({ ...prev, visible: false }));
  };

  return (
    <>
      <span
        ref={wrapperRef}
        className={`mastery-badge mastery-badge-${level} mastery-badge-${size} ${className}`.trim()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={`Mastery level: ${label}`}
        role="img"
      >
        {level === 'basic' && (
          <svg
            viewBox="0 0 24 24"
            className="mastery-badge-icon"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        )}
        {level === 'familiar' && (
          <svg
            viewBox="0 0 24 24"
            className="mastery-badge-icon"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
        )}
        {level === 'mastered' && (
          <svg
            viewBox="0 0 24 24"
            className="mastery-badge-icon mastery-badge-crown"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M2 19h20v3H2v-3zm2-8l2 2 4-4 4 4 4-4 2 2v6H4v-6zm8-9c.83 0 1.5.67 1.5 1.5S12.83 5 12 5s-1.5-.67-1.5-1.5S11.17 2 12 2z"
            />
          </svg>
        )}
      </span>
      {position.visible && createPortal(
        <span
          className="mastery-badge-tooltip"
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translate(-50%, -100%)',
            opacity: 1,
            visibility: 'visible'
          }}
          role="tooltip"
        >
          {label}
        </span>,
        document.body
      )}
    </>
  );
}

export default MasteryBadge;
