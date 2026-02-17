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
 * - Screen reader support with ARIA live announcements
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import '../styles/components/StatSelectionModal.css';
import { X, AlertTriangle, ChevronDown, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import type { Ability } from 'playlist-data-engine';

/**
 * Represents an active stat modifier effect on a character.
 * Used to display stat breakdowns in the modal.
 */
export interface StatEffect {
  /** The ability score this effect modifies */
  ability: Ability;
  /** The amount of modification (positive for buffs, negative for debuffs) */
  amount: number;
  /** Source of the effect (e.g., "Ring of Strength", "Curse of Weakness") */
  source: string;
  /** Whether this is a buff or debuff */
  type: 'buff' | 'debuff';
}

export interface StatSelectionModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Number of pending stat increases to apply */
  pendingCount: number;
  /** Current stat values for display reference */
  currentStats?: Partial<Record<Ability, number>>;
  /** Game mode - affects stat cap behavior (standard caps at 20, uncapped has no limit) */
  gameMode?: 'standard' | 'uncapped';
  /** Active stat modifier effects to display in breakdown */
  activeEffects?: StatEffect[];
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
  gameMode = 'standard',
  activeEffects = [],
  onApply,
  onCancel,
}: StatSelectionModalProps) {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single');
  const [selectedStats, setSelectedStats] = useState<Ability[]>([]);
  const [maxSelectedError, setMaxSelectedError] = useState(false);
  const [effectsExpanded, setEffectsExpanded] = useState(true);

  // Screen reader announcement state
  const [announcement, setAnnouncement] = useState<string>('');

  // Stat cap constant for standard mode
  const STAT_CAP = 20;

  // Ref for focus management
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const announcementTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to announce to screen readers
  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message);
    // Clear after announcement
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
    }
    announcementTimeoutRef.current = setTimeout(() => {
      setAnnouncement('');
    }, 1000);
  }, []);

  // Reset state and manage focus when modal opens
  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement;

      setSelectionMode('single');
      setSelectedStats([]);
      setMaxSelectedError(false);
      setEffectsExpanded(true);

      // Announce modal open to screen readers
      announceToScreenReader(`Stat increases modal open. You have ${pendingCount} pending stat increase${pendingCount !== 1 ? 's' : ''} to apply.`);

      // Focus the modal container after a brief delay for animation
      const timer = setTimeout(() => {
        modalRef.current?.focus();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen, pendingCount, announceToScreenReader]);

  // Restore focus when modal closes
  useEffect(() => {
    if (!isOpen && previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [isOpen]);

  // Group effects by ability for cleaner display
  const effectsByAbility = React.useMemo(() => {
    const grouped: Partial<Record<Ability, StatEffect[]>> = {};
    activeEffects.forEach(effect => {
      if (!grouped[effect.ability]) {
        grouped[effect.ability] = [];
      }
      grouped[effect.ability]!.push(effect);
    });
    return grouped;
  }, [activeEffects]);

  // Check if there are any active effects to display
  const hasActiveEffects = activeEffects.length > 0;

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  // Toggle stat selection
  const toggleStat = (ability: Ability) => {
    const info = ABILITY_INFO[ability];
    const isCapped = isStatCappedFn(ability);

    // Don't allow selecting capped stats
    if (isCapped) {
      announceToScreenReader(`${info.full} is at maximum (${STAT_CAP}). Cannot increase further in standard mode.`);
      return;
    }

    setMaxSelectedError(false);
    if (selectionMode === 'single') {
      // Single mode: replace selection
      setSelectedStats([ability]);
      announceToScreenReader(`${info.full} selected for +2 increase.`);
    } else {
      // Double mode: toggle selection (max 2)
      if (selectedStats.includes(ability)) {
        setSelectedStats(selectedStats.filter((s) => s !== ability));
        announceToScreenReader(`${info.full} deselected.`);
      } else if (selectedStats.length < 2) {
        setSelectedStats([...selectedStats, ability]);
        const count = selectedStats.length + 1;
        announceToScreenReader(`${info.full} selected for +1 increase. ${count} of 2 stats selected.`);
      } else {
        // Trying to select more than 2 in double mode - show error
        setMaxSelectedError(true);
        announceToScreenReader('Maximum 2 stats allowed. Deselect a stat first.');
        // Clear error after animation
        setTimeout(() => setMaxSelectedError(false), 400);
      }
    }
  };

  // Helper to check if stat is capped (defined before toggleStat uses it)
  const isStatCappedFn = (ability: Ability): boolean => {
    if (gameMode !== 'standard') return false;
    return (currentStats[ability] ?? 10) >= STAT_CAP;
  };

  // Switch selection mode
  const switchMode = (mode: SelectionMode) => {
    setSelectionMode(mode);
    setSelectedStats([]);
    if (mode === 'single') {
      announceToScreenReader('Switched to single stat mode: +2 to one ability score.');
    } else {
      announceToScreenReader('Switched to double stat mode: +1 to two ability scores.');
    }
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

  // Check if a stat is at the cap (only in standard mode)
  const isStatCapped = (ability: Ability): boolean => {
    if (gameMode !== 'standard') return false;
    return getStatValue(ability) >= STAT_CAP;
  };

  // Check if a stat is near the cap (18-19 in standard mode)
  const isStatNearCap = (ability: Ability): boolean => {
    if (gameMode !== 'standard') return false;
    const value = getStatValue(ability);
    return value >= 18 && value < STAT_CAP;
  };

  // Get the remaining capacity for a stat (+how much can be added)
  const getStatRemainingCapacity = (ability: Ability): number => {
    if (gameMode !== 'standard') return 999; // No cap in uncapped mode
    return Math.max(0, STAT_CAP - getStatValue(ability));
  };

  // Check if any stats are at the cap (for global warning banner)
  const hasCappedStats = (): boolean => {
    if (gameMode !== 'standard') return false;
    return (Object.keys(ABILITY_INFO) as Ability[]).some(ability => isStatCapped(ability));
  };

  // Get count of capped stats
  const getCappedStatsCount = (): number => {
    if (gameMode !== 'standard') return 0;
    return (Object.keys(ABILITY_INFO) as Ability[]).filter(ability => isStatCapped(ability)).length;
  };

  // Handle Tab key for focus trapping
  const handleTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  };

  // Combined keyboard handler
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Tab') {
      handleTabKey(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="statmodal-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="statmodal-title"
    >
      <div
        ref={modalRef}
        className="statmodal-container"
        tabIndex={-1}
        onKeyDown={handleModalKeyDown}
      >
        {/* Screen reader announcements */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="statmodal-sr-only"
        >
          {announcement}
        </div>

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
            <div className="statmodal-info-text">
              You have <span className="statmodal-pending-count">{pendingCount}</span> pending
              stat increase{pendingCount !== 1 ? 's' : ''} to apply.
            </div>
            <div className="statmodal-info-subtext">
              Choose how to distribute your increases following D&D 5e rules.
            </div>
          </div>

          {/* Global Cap Warning Banner */}
          {hasCappedStats() && (
            <div
              className="statmodal-cap-banner"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle size={16} className="statmodal-cap-banner-icon" aria-hidden="true" />
              <span>
                {getCappedStatsCount() === 6
                  ? 'All stats are at maximum (20). No increases can be applied.'
                  : `${getCappedStatsCount()} stat${getCappedStatsCount() > 1 ? 's are' : ' is'} at maximum (20). Consider choosing different stats.`
                }
              </span>
            </div>
          )}

          {/* Active Stat Modifiers Section (Task 3.3.1) */}
          {hasActiveEffects && (
            <div className="statmodal-effects-section">
              <button
                type="button"
                className="statmodal-effects-header"
                onClick={() => setEffectsExpanded(!effectsExpanded)}
                aria-expanded={effectsExpanded}
                aria-controls="statmodal-effects-list"
              >
                {effectsExpanded ? (
                  <ChevronDown size={16} className="statmodal-effects-chevron" />
                ) : (
                  <ChevronRight size={16} className="statmodal-effects-chevron" />
                )}
                <span className="statmodal-effects-title">Active Stat Modifiers</span>
                <span className="statmodal-effects-count">
                  {activeEffects.length} effect{activeEffects.length !== 1 ? 's' : ''}
                </span>
              </button>
              {effectsExpanded && (
                <div id="statmodal-effects-list" className="statmodal-effects-list">
                  {(Object.keys(effectsByAbility) as Ability[]).map((ability) => {
                    const effects = effectsByAbility[ability]!;
                    const info = ABILITY_INFO[ability];
                    return (
                      <div key={ability} className="statmodal-effects-group">
                        <div className="statmodal-effects-ability-label" style={{ '--stat-color': info.color } as React.CSSProperties}>
                          {info.short}
                        </div>
                        <div className="statmodal-effects-items">
                          {effects.map((effect, idx) => (
                            <div
                              key={`${effect.source}-${idx}`}
                              className={`statmodal-effect-item ${effect.type === 'buff' ? 'statmodal-effect-buff' : 'statmodal-effect-debuff'}`}
                            >
                              {effect.type === 'buff' ? (
                                <ArrowUp size={12} className="statmodal-effect-icon" />
                              ) : (
                                <ArrowDown size={12} className="statmodal-effect-icon" />
                              )}
                              <span className="statmodal-effect-amount">
                                {effect.amount > 0 ? '+' : ''}{effect.amount}
                              </span>
                              <span className="statmodal-effect-source">{effect.source}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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
          <div className="statmodal-grid" role="group" aria-label="Ability scores to increase">
            {(Object.keys(ABILITY_INFO) as Ability[]).map((ability) => {
              const info = ABILITY_INFO[ability];
              const isSelected = selectedStats.includes(ability);
              const currentValue = getStatValue(ability);
              const isCapped = isStatCapped(ability);
              const isNearCap = isStatNearCap(ability);
              const remainingCapacity = getStatRemainingCapacity(ability);
              // Check if stat can receive the boost amount based on mode
              const boostAmount = selectionMode === 'single' ? 2 : 1;
              const canReceiveBoost = remainingCapacity >= boostAmount;
              const canSelect = (selectionMode === 'double' ? selectedStats.length < 2 || isSelected : true)
                && !isCapped && canReceiveBoost;

              // Calculate effect breakdown for this ability (Task 3.3.3)
              const abilityEffects = effectsByAbility[ability] || [];
              const hasEffectsForAbility = abilityEffects.length > 0;
              const totalEffectAmount = abilityEffects.reduce((sum, e) => sum + e.amount, 0);
              const baseStatValue = currentValue - totalEffectAmount;

              // Build aria-label for screen readers
              const ariaLabel = isCapped
                ? `${info.full}: ${currentValue}. Capped at ${STAT_CAP}, cannot be increased.`
                : isNearCap
                  ? `${info.full}: ${currentValue}. Near cap, only +${remainingCapacity} available.`
                  : isSelected
                    ? `${info.full}: ${currentValue}, selected for +${selectionMode === 'single' ? '2' : '1'} increase.`
                    : `${info.full}: ${currentValue}. Click to select for increase.`;

              return (
                <button
                  key={ability}
                  type="button"
                  className={`statmodal-stat-btn ${isSelected ? 'statmodal-stat-selected' : ''} ${
                    !canSelect && !isSelected ? 'statmodal-stat-disabled' : ''
                  } ${isCapped ? 'statmodal-stat-capped' : ''} ${isNearCap ? 'statmodal-stat-near-cap' : ''}`}
                  onClick={() => toggleStat(ability)}
                  disabled={isCapped || (!canSelect && !isSelected)}
                  aria-disabled={isCapped || (!canSelect && !isSelected)}
                  aria-label={ariaLabel}
                  aria-pressed={isSelected}
                  title={isCapped ? `${info.full} is at maximum (${STAT_CAP})` : isNearCap ? `Only +${remainingCapacity} available for ${info.full}` : undefined}
                  style={{
                    '--stat-color': info.color,
                  } as React.CSSProperties}
                >
                  <div className="statmodal-stat-header">
                    <span className="statmodal-stat-short">{info.short}</span>
                    <span className="statmodal-stat-value">
                      {hasEffectsForAbility ? (
                        <>
                          <span className="statmodal-stat-base">{baseStatValue}</span>
                          <span className={`statmodal-stat-modifier ${totalEffectAmount > 0 ? 'statmodal-stat-buff' : 'statmodal-stat-debuff'}`}>
                            ({totalEffectAmount > 0 ? '+' : ''}{totalEffectAmount})
                          </span>
                        </>
                      ) : (
                        currentValue
                      )}
                    </span>
                  </div>
                  <span className="statmodal-stat-full">{info.full}</span>
                  {/* Show total value below when effects exist */}
                  {hasEffectsForAbility && (
                    <span className="statmodal-stat-total">= {currentValue}</span>
                  )}
                  {isCapped && (
                    <div className="statmodal-stat-cap-badge" aria-hidden="true">
                      <AlertTriangle size={10} />
                      <span>Capped</span>
                    </div>
                  )}
                  {!isCapped && isNearCap && (
                    <div className="statmodal-stat-near-cap-badge" aria-hidden="true">
                      <span>+{remainingCapacity} max</span>
                    </div>
                  )}
                  {isSelected && !isCapped && (
                    <div className="statmodal-stat-badge" aria-hidden="true">
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
