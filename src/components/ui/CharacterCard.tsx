/**
 * CharacterCard Component
 *
 * Displays a character with minimal information in a card format.
 * Used in the Party tab to show all characters in a grid.
 * Supports selection mode for party analysis.
 */

import { CharacterSheet } from '@/types';
import { getCharacterAvatar } from '@/utils/characterIcons';
import { Check, Loader2, Square, CheckSquare } from 'lucide-react';

interface CharacterCardProps {
  /** The character to display */
  character: CharacterSheet;
  /** Optional click handler (for viewing details) */
  onClick?: () => void;
  /** Visual variant of the card */
  variant?: 'default' | 'selectable' | 'selected';
  /** Whether this character is the active character */
  isActive?: boolean;
  /** Optional handler for setting this character as active */
  onSetActive?: () => void;
  /** Whether the card is in a loading state (e.g., setting as active) */
  isLoading?: boolean;
  /** Whether selection mode is enabled (shows checkbox) */
  selectionMode?: boolean;
  /** Whether this character is selected for party analysis */
  isSelected?: boolean;
  /** Handler for toggling selection state */
  onToggleSelection?: () => void;
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

export function CharacterCard({
  character,
  onClick,
  variant = 'default',
  isActive,
  onSetActive,
  isLoading = false,
  selectionMode = false,
  isSelected = true,
  onToggleSelection,
}: CharacterCardProps) {
  const progressPercent = calculateXPProgress(character);
  const avatar = getCharacterAvatar(character.class);

  const cardClasses = [
    'party-card',
    variant === 'selectable' && 'party-card-selectable',
    variant === 'selected' && 'party-card-selected',
    isActive && 'party-card-active',
    onClick && 'party-card-clickable',
    isLoading && 'party-card-loading',
    selectionMode && 'party-card-selection-mode',
    !isSelected && selectionMode && 'party-card-unselected',
  ]
    .filter(Boolean)
    .join(' ');

  const handleSetActiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoading) {
      onSetActive?.();
    }
  };

  const handleSelectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelection?.();
  };

  return (
    <div className={cardClasses} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {/* Selection Checkbox (top-left corner) - shown when selectionMode is enabled */}
      {selectionMode && (
        <button
          className={`party-card-selection-checkbox ${isSelected ? 'party-card-selection-checked' : ''}`}
          onClick={handleSelectionClick}
          type="button"
          title={isSelected ? 'Deselect for analysis' : 'Select for analysis'}
          aria-label={isSelected ? `Deselect ${character.name} for analysis` : `Select ${character.name} for analysis`}
          aria-pressed={isSelected}
        >
          {isSelected ? (
            <CheckSquare size={18} />
          ) : (
            <Square size={18} />
          )}
        </button>
      )}

      {/* Active Character Badge (top-left corner) - only show if not in selection mode */}
      {isActive && !selectionMode && (
        <div className="party-card-active-badge" title="Active Character">
          <Check size={14} />
          <span>Active</span>
        </div>
      )}

      {/* Game Mode Badge (top-right corner) */}
      {character.gameMode && (
        <div
          className={`party-card-game-mode-badge ${character.gameMode}`}
          title={
            character.gameMode === 'standard'
              ? 'Standard Mode: Stats cap at 20, manual stat selection required at level-ups'
              : 'Uncapped Mode: Unlimited stat progression, automatic stat increases on level-up'
          }
        >
          {character.gameMode === 'standard' ? 'CAPPED' : 'UNCAPPED'}
        </div>
      )}

      {/* Header with avatar and name */}
      <div className="party-card-header">
        <div className="party-card-avatar">{avatar}</div>
        <div className="party-card-info">
          <h3 className="party-card-name">{character.name}</h3>
          <div className="party-card-subtitle">
            <span>{character.race}{character.subrace ? ` (${character.subrace})` : ''} {character.class}</span>
            <span className="party-card-level">Lv {character.level}</span>
          </div>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="party-card-xp-section">
        <div className="party-xp-bar">
          <div className="party-xp-fill" style={{ width: `${Math.min(progressPercent, 100)}%` }} />
        </div>
        <div className="party-xp-label">
          <span className="party-xp-current">{formatNumber(character.xp.current)} / {formatNumber(character.xp.next_level)} XP</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
      </div>

      {/* Set as Active Button */}
      {onSetActive && !isActive && (
        <div className="party-card-set-active-btn-wrapper">
          <button
            className="party-card-set-active-btn"
            onClick={handleSetActiveClick}
            type="button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="party-card-btn-spinner" />
                Setting...
              </>
            ) : (
              'Set as Active'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default CharacterCard;
