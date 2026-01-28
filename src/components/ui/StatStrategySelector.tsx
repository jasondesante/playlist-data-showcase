/**
 * StatStrategySelector Component
 *
 * Dropdown selector for choosing stat increase strategy on level-up.
 * Created as part of Task 4.4 of UPDATE_PLAN.md.
 *
 * Features:
 * - Manual D&D 5e: 2-step level-up, you choose stats manually
 * - Smart Auto: Intelligently picks best stats based on class
 * - Balanced: +1 to two lowest stats each time
 * - Primary Only: Always boosts class's primary stat
 * - Random: Random stat selection each level-up
 * - Pure CSS (no Tailwind utility classes in CSS)
 */

import '../../styles/components/StatStrategySelector.css';
import { Settings, Zap, Shield, TrendingUp, Dice1 } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';

/**
 * Stat increase strategy types from playlist-data-engine
 */
export type StatIncreaseStrategyType =
  | 'dnD5e'          // Manual selection (D&D 5e standard)
  | 'dnD5e_smart'    // Intelligent auto-selection
  | 'balanced'       // +1 to two lowest stats
  | 'primary_only'   // Always boosts class primary
  | 'random';        // Random selection

export interface StatStrategySelectorProps {
  /** Currently selected strategy */
  value: StatIncreaseStrategyType;
  /** Callback when strategy changes */
  onChange: (strategy: StatIncreaseStrategyType) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Optional additional CSS classes */
  className?: string;
}

interface StrategyOption {
  value: StatIncreaseStrategyType;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  tooltip: string;
  badgeClass: string;
}

const strategyOptions: StrategyOption[] = [
  {
    value: 'dnD5e',
    label: 'Manual D&D 5e',
    shortLabel: 'Manual',
    description: '2-step level-up, you choose stats manually',
    icon: Settings,
    tooltip: 'Standard D&D 5e - choose +2 to one stat or +1 to two stats when leveling up. Creates pending stat increases you must apply manually.',
    badgeClass: 'stat-strategy-badge-manual',
  },
  {
    value: 'dnD5e_smart',
    label: 'Smart Auto',
    shortLabel: 'Smart',
    description: 'Intelligently picks best stats based on class',
    icon: Zap,
    tooltip: 'AI picks optimal stats for your class automatically. Boosts primary stat if below 16, otherwise boosts lowest stat.',
    badgeClass: 'stat-strategy-badge-smart',
  },
  {
    value: 'balanced',
    label: 'Balanced',
    shortLabel: 'Balanced',
    description: '+1 to two lowest stats each time',
    icon: Shield,
    tooltip: 'Distributes stat increases evenly across your lowest stats. Creates well-rounded characters without min-maxing.',
    badgeClass: 'stat-strategy-badge-balanced',
  },
  {
    value: 'primary_only',
    label: 'Primary Only',
    shortLabel: 'Primary',
    description: 'Always boosts class\'s primary stat',
    icon: TrendingUp,
    tooltip: 'Always maximizes your class\'s main ability score. Simple progression that reinforces class identity.',
    badgeClass: 'stat-strategy-badge-primary',
  },
  {
    value: 'random',
    label: 'Random',
    shortLabel: 'Random',
    description: 'Random stat selection each level-up',
    icon: Dice1,
    tooltip: 'Rolls the dice for unpredictable builds. Can grant +2 to one or +1 to two stats at random.',
    badgeClass: 'stat-strategy-badge-random',
  },
];

export function StatStrategySelector({
  value,
  onChange,
  disabled = false,
  className,
}: StatStrategySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const selectedOption = strategyOptions.find(opt => opt.value === value) || strategyOptions[1]; // Default to smart

  const handleSelect = (strategy: StatIncreaseStrategyType) => {
    onChange(strategy);
    setIsOpen(false);
  };

  return (
    <div className={cn('stat-strategy-selector', className)}>
      <div className="stat-strategy-header">
        <h3 className="stat-strategy-title">Stat Increase Strategy</h3>
        <div className="stat-strategy-info-wrapper">
          <button
            type="button"
            className="stat-strategy-info-btn"
            onClick={() => setShowTooltip(!showTooltip)}
            aria-label="Show strategy info"
            aria-expanded={showTooltip}
            disabled={disabled}
          >
            <Settings className="stat-strategy-info-icon" size={16} />
          </button>
          {showTooltip && (
            <div className="stat-strategy-tooltip" role="tooltip">
              <div className="stat-strategy-tooltip-content">
                <div><strong>Strategy determines how stats increase when leveling up.</strong></div>
                <ul>
                  {strategyOptions.map(opt => (
                    <li key={opt.value}>
                      <strong>{opt.shortLabel}:</strong> {opt.tooltip}
                    </li>
                  ))}
                </ul>
                <div className="stat-strategy-tooltip-note">
                  Note: Changing strategy won't affect existing pending stat increases.
                </div>
              </div>
              <button
                type="button"
                className="stat-strategy-tooltip-close"
                onClick={() => setShowTooltip(false)}
                aria-label="Close tooltip"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="stat-strategy-dropdown-container">
        <button
          type="button"
          className={cn(
            'stat-strategy-dropdown',
            isOpen && 'stat-strategy-dropdown-open',
            disabled && 'stat-strategy-dropdown-disabled'
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby="stat-strategy-label"
        >
          <span className="stat-strategy-selected-icon">
            <selectedOption.icon size={18} />
          </span>
          <span className="stat-strategy-selected-label">
            {selectedOption.label}
          </span>
          <span className={cn('stat-strategy-badge', selectedOption.badgeClass)}>
            {selectedOption.shortLabel}
          </span>
          <span className="stat-strategy-dropdown-arrow">
            {isOpen ? '▲' : '▼'}
          </span>
        </button>

        {isOpen && (
          <ul
            className="stat-strategy-options"
            role="listbox"
            aria-activedescendant={`stat-strategy-option-${value}`}
            aria-labelledby="stat-strategy-label"
          >
            {strategyOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = value === option.value;

              return (
                <li
                  key={option.value}
                  id={`stat-strategy-option-${option.value}`}
                  className={cn(
                    'stat-strategy-option',
                    isSelected && 'stat-strategy-option-selected'
                  )}
                  role="option"
                  aria-selected={isSelected}
                >
                  <button
                    type="button"
                    className="stat-strategy-option-button"
                    onClick={() => handleSelect(option.value)}
                    disabled={disabled}
                  >
                    <span className="stat-strategy-option-icon">
                      <Icon size={18} />
                    </span>
                    <span className="stat-strategy-option-content">
                      <span className="stat-strategy-option-header">
                        <span className="stat-strategy-option-label">{option.label}</span>
                        {isSelected && (
                          <span className="stat-strategy-option-check">✓</span>
                        )}
                      </span>
                      <span className="stat-strategy-option-description">
                        {option.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <span id="stat-strategy-label" className="stat-strategy-instructions">
        Strategy is saved per-character and affects future level-ups
      </span>
    </div>
  );
}

export default StatStrategySelector;
