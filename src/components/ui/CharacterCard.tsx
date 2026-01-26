/**
 * CharacterCard Component
 *
 * Displays a character with minimal information in a card format.
 * Used in the Party tab to show all characters in a grid.
 */

import { CharacterSheet } from '@/types';
import { getCharacterAvatar } from '@/utils/characterIcons';

interface CharacterCardProps {
  /** The character to display */
  character: CharacterSheet;
  /** Optional click handler */
  onClick?: () => void;
  /** Visual variant of the card */
  variant?: 'default' | 'selectable' | 'selected';
}

/**
 * Calculates the XP progress percentage for the current level
 */
function calculateXPProgress(character: CharacterSheet): number {
  const { xp, level } = character;
  const thresholds = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
  const prevLevelThreshold = thresholds[level - 1] || 0;
  const currentLevelProgress = xp.current - prevLevelThreshold;
  const levelXPNeeded = xp.next_level - prevLevelThreshold;
  return levelXPNeeded > 0 ? (currentLevelProgress / levelXPNeeded) * 100 : 0;
}

/**
 * Formats a number with thousand separators
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function CharacterCard({ character, onClick, variant = 'default' }: CharacterCardProps) {
  const progressPercent = calculateXPProgress(character);
  const avatar = getCharacterAvatar(character.class);

  const cardClasses = [
    'party-card',
    variant === 'selectable' && 'party-card-selectable',
    variant === 'selected' && 'party-card-selected',
    onClick && 'party-card-clickable',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClasses} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {/* Header with avatar and name */}
      <div className="party-card-header">
        <div className="party-card-avatar">{avatar}</div>
        <div className="party-card-info">
          <h3 className="party-card-name">{character.name}</h3>
          <p className="party-card-subtitle">
            <span>{character.race} {character.class}</span>
            <span className="party-card-level">Lv {character.level}</span>
          </p>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="party-card-xp-section">
        <div className="party-xp-bar">
          <div className="party-xp-fill" style={{ width: `${Math.min(progressPercent, 100)}%` }} />
        </div>
        <p className="party-xp-label">
          <span className="party-xp-current">{formatNumber(character.xp.current)} / {formatNumber(character.xp.next_level)} XP</span>
          <span>{Math.round(progressPercent)}%</span>
        </p>
      </div>
    </div>
  );
}

export default CharacterCard;
