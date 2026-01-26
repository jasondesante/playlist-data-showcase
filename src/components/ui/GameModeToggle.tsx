/**
 * GameModeToggle Component
 *
 * Radio button group for selecting between standard and uncapped game modes.
 * Created as part of Task 2.1 of UPDATE_PLAN.md.
 *
 * Features:
 * - Standard Mode: Stats cap at 20, manual stat selection on level-up
 * - Uncapped Mode: Unlimited stats, automatic stat increases
 * - Info icon with tooltip explaining differences
 * - Pure CSS (no Tailwind utility classes in CSS)
 */

import { Shield, TrendingUp, Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';

export type GameMode = 'standard' | 'uncapped';

export interface GameModeToggleProps {
  /** Currently selected game mode */
  value: GameMode;
  /** Callback when mode changes */
  onChange: (mode: GameMode) => void;
  /** Optional additional CSS classes */
  className?: string;
}

interface ModeOption {
  value: GameMode;
  label: string;
  description: string;
  icon: LucideIcon;
  tooltip: string;
  badgeClass: string;
}

const modeOptions: ModeOption[] = [
  {
    value: 'standard',
    label: 'Standard Mode',
    description: 'Stats cap at 20, manual selection',
    icon: Shield,
    tooltip: 'D&D 5e rules: stats max at 20, you choose stat increases at levels 4, 8, 12, 16, 19',
    badgeClass: 'gamemode-badge-standard',
  },
  {
    value: 'uncapped',
    label: 'Uncapped Mode',
    description: 'Unlimited stats, automatic increases',
    icon: TrendingUp,
    tooltip: 'No stat limit - stats can exceed 20, automatically increased on level-up based on strategy',
    badgeClass: 'gamemode-badge-uncapped',
  },
];

export function GameModeToggle({ value, onChange, className }: GameModeToggleProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={cn('gamemode-toggle', className)}>
      <div className="gamemode-toggle-header">
        <h3 className="gamemode-toggle-title">Game Mode</h3>
        <div className="gamemode-info-wrapper">
          <button
            type="button"
            className="gamemode-info-btn"
            onClick={() => setShowTooltip(!showTooltip)}
            aria-label="Show game mode info"
            aria-expanded={showTooltip}
          >
            <Info className="gamemode-info-icon" size={16} />
          </button>
          {showTooltip && (
            <div className="gamemode-tooltip" role="tooltip">
              <div className="gamemode-tooltip-content">
                <p><strong>Standard Mode:</strong> Traditional D&D 5e rules with stats capped at 20. You manually choose stat increases when leveling up.</p>
                <p><strong>Uncapped Mode:</strong> Stats can exceed 20 for unlimited progression. Stat increases are applied automatically based on your chosen strategy.</p>
              </div>
              <button
                type="button"
                className="gamemode-tooltip-close"
                onClick={() => setShowTooltip(false)}
                aria-label="Close tooltip"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="gamemode-options" role="radiogroup" aria-label="Game mode selection">
        {modeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;

          return (
            <label
              key={option.value}
              className={cn(
                'gamemode-option',
                isSelected && 'gamemode-option-selected'
              )}
            >
              <input
                type="radio"
                name="gamemode"
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="gamemode-radio"
                aria-checked={isSelected}
              />
              <div className="gamemode-option-content">
                <div className="gamemode-option-header">
                  <Icon className="gamemode-option-icon" size={18} />
                  <span className="gamemode-option-label">{option.label}</span>
                  {isSelected && (
                    <span className={cn('gamemode-badge', option.badgeClass)}>
                      {option.value === 'standard' ? 'STATS CAPPED @ 20' : 'UNLIMITED PROGRESSION'}
                    </span>
                  )}
                </div>
                <span className="gamemode-option-description">{option.description}</span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default GameModeToggle;
