/**
 * DifficultySelector Component
 *
 * A button group component for selecting beat tap evaluation difficulty presets.
 * Part of Task 3.1: Create DifficultySelector Component
 *
 * Features:
 * - Four preset options: Easy, Medium, Hard, Custom
 * - Color-coded buttons for each difficulty level
 * - Active state highlighting for selected preset
 * - Accessible keyboard navigation
 */
import './DifficultySelector.css';
import type { DifficultyPreset } from '@/types';

export interface DifficultySelectorProps {
  /** Currently selected difficulty preset */
  value: DifficultyPreset;
  /** Callback when preset changes */
  onChange: (preset: DifficultyPreset) => void;
  /** Optional className for additional styling */
  className?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * Difficulty preset configuration
 */
interface PresetConfig {
  id: DifficultyPreset;
  label: string;
  description: string;
  colorClass: string;
}

const PRESETS: PresetConfig[] = [
  {
    id: 'easy',
    label: 'Easy',
    description: 'Forgiving timing (±75ms perfect)',
    colorClass: 'difficulty-selector__btn--easy',
  },
  {
    id: 'medium',
    label: 'Medium',
    description: 'Balanced timing (±45ms perfect)',
    colorClass: 'difficulty-selector__btn--medium',
  },
  {
    id: 'hard',
    label: 'Hard',
    description: 'Strict timing (±10ms perfect)',
    colorClass: 'difficulty-selector__btn--hard',
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'User-defined thresholds',
    colorClass: 'difficulty-selector__btn--custom',
  },
];

/**
 * DifficultySelector Component
 *
 * Renders a group of buttons for selecting difficulty presets.
 * Each preset is color-coded and shows an active state when selected.
 */
export function DifficultySelector({
  value,
  onChange,
  className = '',
  disabled = false,
}: DifficultySelectorProps) {
  return (
    <div
      className={`difficulty-selector ${className}`}
      role="radiogroup"
      aria-label="Difficulty preset"
    >
      <div className="difficulty-selector__buttons">
        {PRESETS.map((preset) => {
          const isSelected = value === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              className={`
                difficulty-selector__btn
                ${preset.colorClass}
                ${isSelected ? 'difficulty-selector__btn--active' : ''}
              `.trim()}
              onClick={() => onChange(preset.id)}
              disabled={disabled}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${preset.label}: ${preset.description}`}
              title={preset.description}
            >
              <span className="difficulty-selector__btn-label">
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DifficultySelector;
