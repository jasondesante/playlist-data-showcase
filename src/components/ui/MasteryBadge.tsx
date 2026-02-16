import { useRef, useState, useId } from 'react';
import { createPortal } from 'react-dom';
import type { PrestigeLevel } from '@/types';
import './MasteryBadge.css';

/**
 * MasteryBadge Component
 *
 * Displays a visual badge indicating the mastery/prestige level of a track.
 * Badges are styled based on mastery status and prestige level:
 * - Not mastered: No badge displayed
 * - Mastered (prestige 0): Gold crown with glow animation
 * - Prestiged (I-X): Crown with Roman numeral indicator
 *
 * Features:
 * - Tooltip on hover showing mastery status and prestige level
 * - Three size variants: sm, md, lg
 * - Glow animation for mastered tracks
 * - Rainbow effect for max prestige (X)
 */

export interface MasteryBadgeProps {
  /** Whether the track is mastered (dual requirements met) */
  isMastered: boolean;
  /** Current prestige level (0-10) */
  prestigeLevel?: PrestigeLevel;
  /** Roman numeral for prestige level */
  prestigeRoman?: string;
  /** Whether at max prestige level */
  isMaxPrestige?: boolean;
  /** Size variant of the badge */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS class name */
  className?: string;
}

/**
 * Get the display label for mastery status
 */
function getMasteryLabel(isMastered: boolean, prestigeRoman: string, isMaxPrestige: boolean): string {
  if (!isMastered) return '';
  if (isMaxPrestige) return 'Mastered - MAX PRESTIGE';
  if (prestigeRoman) return `Mastered - Prestige ${prestigeRoman}`;
  return 'Mastered';
}

/**
 * MasteryBadge component for displaying track mastery status.
 *
 * @example
 * ```tsx
 * <MasteryBadge isMastered={true} prestigeLevel={0} size="md" />
 * <MasteryBadge isMastered={true} prestigeLevel={3} prestigeRoman="III" size="lg" />
 * ```
 */
export function MasteryBadge({
  isMastered,
  prestigeLevel = 0,
  prestigeRoman = '',
  isMaxPrestige = false,
  size = 'md',
  className = ''
}: MasteryBadgeProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, visible: false });
  const tooltipId = useId();

  // Don't render if not mastered
  if (!isMastered) {
    return null;
  }

  const label = getMasteryLabel(isMastered, prestigeRoman, isMaxPrestige);

  const handleMouseEnter = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
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

  // Determine badge class based on prestige level
  const getPrestigeClass = () => {
    if (isMaxPrestige) return 'mastery-badge-max-prestige';
    if (prestigeLevel >= 7) return 'mastery-badge-high-prestige';
    if (prestigeLevel >= 4) return 'mastery-badge-mid-prestige';
    if (prestigeLevel >= 1) return 'mastery-badge-low-prestige';
    return 'mastery-badge-mastered';
  };

  return (
    <>
      <span
        ref={wrapperRef}
        className={`mastery-badge ${getPrestigeClass()} mastery-badge-${size} ${className}`.trim()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        aria-label={label}
        aria-describedby={position.visible ? tooltipId : undefined}
        role="img"
        tabIndex={0}
      >
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
        {prestigeRoman && (
          <span className="mastery-badge-prestige">{prestigeRoman}</span>
        )}
      </span>
      {position.visible && createPortal(
        <span
          id={tooltipId}
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
