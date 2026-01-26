/**
 * StatSelectionModal Component
 *
 * Modal component for applying pending stat increases in D&D 5e standard mode.
 * Allows players to choose between:
 * - +2 to one ability score
 * - +1 to two ability scores
 *
 * Created as part of Task 4.2 of UPDATE_PLAN.md.
 *
 * Features:
 * - Two selection modes: single stat (+2) or double stats (+1 each)
 * - Displays current stat values for reference
 * - Visual feedback for selection state
 * - Validation to prevent invalid selections
 * - Pure CSS (no Tailwind utility classes)
 */

import React from 'react';
import '../styles/components/StatSelectionModal.css';
import { X } from 'lucide-react';
import type { Ability } from 'playlist-data-engine';

export interface StatSelectionModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Number of pending stat increases to apply */
  pendingCount: number;
  /** Current stat values for display reference */
  currentStats?: Partial<Record<Ability, number>>;
  /** Callback when stat increases are applied.
   *  For single mode: secondaryStats will be undefined
   *  For double mode: secondaryStats will be an array with one stat
   */
  onApply: (primaryStat: Ability, secondaryStats?: Ability[]) => void;
  /** Callback when modal is cancelled */
  onCancel: () => void;
}

const ABILITY_INFO: Record<Ability, { short: string; full: string; color: string }> = {
  STR: { short: 'STR', full: 'Strength', color: 'hsl(0 70% 50%)' },
  DEX: { short: 'DEX', full: 'Dexterity', color: 'hsl(200 70% 50%)' },
  CON: { short: 'CON', full: 'Constitution', color: 'hsl(150 70% 50%)' },
  INT: { short: 'INT', full: 'Intelligence', color: 'hsl(45 100% 50%)' },
  WIS: { short: 'WIS', full: 'Wisdom', color: 'hsl(280 70% 50%)' },
  CHA: { short: 'CHA', full: 'Charisma', color: 'hsl(340 70% 50%)' },
};

type SelectionMode = 'single' | 'double';

/**
 * StatSelectionModal Component
 *
 * Allows players to manually select how to apply pending stat increases
 * following D&D 5e rules: +2 to one stat OR +1 to two stats.
 */
export function StatSelectionModal({
  isOpen,
  pendingCount,
  currentStats = {},
  onApply,
  onCancel,
}: StatSelectionModalProps) {
  const [selectionMode, setSelectionMode] = React.useState<SelectionMode>('single');
  const [selectedStats, setSelectedStats] = React.useState<Ability[]>([]);
  const [maxSelectedError, setMaxSelectedError] = React.useState(false);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectionMode('single');
      setSelectedStats([]);
      setMaxSelectedError(false);
    }
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  // Handle escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  // Toggle stat selection
  const toggleStat = (ability: Ability) => {
    setMaxSelectedError(false);
    if (selectionMode === 'single') {
      // Single mode: replace selection
      setSelectedStats([ability]);
    } else {
      // Double mode: toggle selection (max 2)
      if (selectedStats.includes(ability)) {
        setSelectedStats(selectedStats.filter((s) => s !== ability));
      } else if (selectedStats.length < 2) {
        setSelectedStats([...selectedStats, ability]);
      } else {
        // Trying to select more than 2 in double mode - show error
        setMaxSelectedError(true);
        // Clear error after animation
        setTimeout(() => setMaxSelectedError(false), 400);
      }
    }
  };

  // Switch selection mode
  const switchMode = (mode: SelectionMode) => {
    setSelectionMode(mode);
    setSelectedStats([]);
  };

  // Validate selection
  const isValidSelection = () => {
    if (selectionMode === 'single') {
      return selectedStats.length === 1;
    } else {
      return selectedStats.length === 2;
    }
  };

  // Handle apply
  const handleApply = () => {
    if (selectedStats.length === 0) return;

    const primary = selectedStats[0];
    const secondary = selectedStats.length > 1 ? [selectedStats[1]] : undefined;
    onApply(primary, secondary);
  };

  // Get current stat value
  const getStatValue = (ability: Ability): number => {
    return currentStats[ability] ?? 10;
  };

  if (!isOpen) return null;

  return (
    <div
      className="statmodal-overlay"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="statmodal-title"
    >
      <div className="statmodal-container">
        {/* Modal Header */}
        <div className="statmodal-header">
          <h1 id="statmodal-title" className="statmodal-title">
            Apply Stat Increases
          </h1>
          <button
            type="button"
            className="statmodal-close-btn"
            onClick={onCancel}
            aria-label="Close modal"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="statmodal-content">
          {/* Info Section */}
          <div className="statmodal-info">
            <p className="statmodal-info-text">
              You have <span className="statmodal-pending-count">{pendingCount}</span> pending
              stat increase{pendingCount !== 1 ? 's' : ''} to apply.
            </p>
            <p className="statmodal-info-subtext">
              Choose how to distribute your increases following D&D 5e rules.
            </p>
          </div>

          {/* Selection Mode Toggle */}
          <div className="statmodal-mode-toggle">
            <button
              type="button"
              className={`statmodal-mode-btn ${selectionMode === 'single' ? 'statmodal-mode-active' : ''}`}
              onClick={() => switchMode('single')}
            >
              <span className="statmodal-mode-label">+2 to One</span>
              <span className="statmodal-mode-desc">Boost a single ability by 2</span>
            </button>
            <button
              type="button"
              className={`statmodal-mode-btn ${selectionMode === 'double' ? 'statmodal-mode-active' : ''}`}
              onClick={() => switchMode('double')}
            >
              <span className="statmodal-mode-label">+1 to Two</span>
              <span className="statmodal-mode-desc">Boost two abilities by 1 each</span>
            </button>
          </div>

          {/* Stat Selection Grid */}
          <div className="statmodal-grid">
            {(Object.keys(ABILITY_INFO) as Ability[]).map((ability) => {
              const info = ABILITY_INFO[ability];
              const isSelected = selectedStats.includes(ability);
              const currentValue = getStatValue(ability);
              const canSelect = selectionMode === 'double' ? selectedStats.length < 2 || isSelected : true;

              return (
                <button
                  key={ability}
                  type="button"
                  className={`statmodal-stat-btn ${isSelected ? 'statmodal-stat-selected' : ''} ${
                    !canSelect && !isSelected ? 'statmodal-stat-disabled' : ''
                  }`}
                  onClick={() => toggleStat(ability)}
                  disabled={!canSelect && !isSelected}
                  style={{
                    '--stat-color': info.color,
                  } as React.CSSProperties}
                >
                  <div className="statmodal-stat-header">
                    <span className="statmodal-stat-short">{info.short}</span>
                    <span className="statmodal-stat-value">{currentValue}</span>
                  </div>
                  <span className="statmodal-stat-full">{info.full}</span>
                  {isSelected && (
                    <div className="statmodal-stat-badge">
                      {selectionMode === 'single' ? '+2' : '+1'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Validation Message */}
          {(!isValidSelection() || maxSelectedError) && (
            <div className="statmodal-validation">
              {maxSelectedError
                ? 'Maximum 2 stats allowed in this mode'
                : selectedStats.length === 0
                  ? `Select ${selectionMode === 'single' ? 'one stat' : 'two stats'} to apply`
                  : selectionMode === 'double' && selectedStats.length === 1
                    ? 'Select one more stat'
                    : 'Invalid selection'}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="statmodal-footer">
          <button
            type="button"
            className="statmodal-cancel-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="statmodal-apply-btn"
            onClick={handleApply}
            disabled={!isValidSelection()}
          >
            Apply Increases
          </button>
        </div>
      </div>
    </div>
  );
}

export default StatSelectionModal;
