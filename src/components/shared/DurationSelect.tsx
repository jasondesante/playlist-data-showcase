/**
 * DurationSelect Component
 *
 * A structured dropdown for selecting spell/effect durations with a custom option.
 * Part of DataViewerTab Improvements Plan - Phase 5.1.
 *
 * Features:
 * - Dropdown with common D&D 5e duration values
 * - "Custom..." option that reveals a text input
 * - Live validation
 * - Accessible with proper ARIA attributes
 *
 * @see docs/plans/DATAVIEWER_IMPROVEMENTS_PLAN.md for implementation details
 */

import { useState, useCallback, useEffect } from 'react';
import { Timer, Edit3 } from 'lucide-react';
import './DurationSelect.css';

/**
 * Common duration values in D&D 5e
 */
const COMMON_DURATIONS = [
  { value: 'Instantaneous', label: 'Instantaneous', description: 'Effect happens instantly' },
  { value: '1 round', label: '1 Round', description: 'Until start of next turn' },
  { value: '1 minute', label: '1 Minute', description: '10 rounds' },
  { value: '10 minutes', label: '10 Minutes', description: '100 rounds' },
  { value: '1 hour', label: '1 Hour', description: 'Short-term effect' },
  { value: '8 hours', label: '8 Hours', description: 'Extended duration' },
  { value: '24 hours', label: '24 Hours', description: 'Full day' },
  { value: 'Until dispelled', label: 'Until Dispelled', description: 'Permanent until magic ends' },
  { value: 'Concentration, up to 1 minute', label: 'Concentration (1 min)', description: 'Requires concentration' },
] as const;

/** Custom option marker */
const CUSTOM_VALUE = '__custom__';

/**
 * Props for DurationSelect component
 */
export interface DurationSelectProps {
  /** Current duration value */
  value?: string;
  /** Callback when duration changes */
  onChange?: (value: string) => void;
  /** Label for the field */
  label?: string;
  /** Placeholder for custom input */
  placeholder?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** ID for the input element */
  id?: string;
  /** Additional CSS class names */
  className?: string;
  /** Show hint text below */
  showHint?: boolean;
}

/**
 * Determine if a value is one of the common presets
 */
function isCommonValue(value: string): boolean {
  return COMMON_DURATIONS.some(d => d.value === value);
}

/**
 * DurationSelect Component
 *
 * A reusable select for spell/effect durations with custom option support.
 */
export function DurationSelect({
  value = '',
  onChange,
  label,
  placeholder = 'e.g., 7 days, Until sunrise, Special',
  disabled = false,
  required = false,
  id,
  className = '',
  showHint = true
}: DurationSelectProps) {
  // Track whether we're in custom mode
  const [isCustomMode, setIsCustomMode] = useState(() => {
    return value !== '' && !isCommonValue(value);
  });

  // Custom input value (separate from the main value when in custom mode)
  const [customValue, setCustomValue] = useState(() => {
    return isCustomMode ? value : '';
  });

  // Sync custom mode when value changes externally
  useEffect(() => {
    const shouldBeCustom = value !== '' && !isCommonValue(value);
    if (shouldBeCustom !== isCustomMode) {
      setIsCustomMode(shouldBeCustom);
    }
    if (shouldBeCustom && value !== customValue) {
      setCustomValue(value);
    }
  }, [value, isCustomMode, customValue]);

  // Handle dropdown change
  const handleSelectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;

    if (selectedValue === CUSTOM_VALUE) {
      // Switch to custom mode
      setIsCustomMode(true);
      // Don't call onChange yet - wait for custom input
    } else {
      // Standard option selected
      setIsCustomMode(false);
      setCustomValue('');
      onChange?.(selectedValue);
    }
  }, [onChange]);

  // Handle custom input change
  const handleCustomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setCustomValue(newValue);
    onChange?.(newValue);
  }, [onChange]);

  // Handle switching back to dropdown from custom mode
  const handleBackToDropdown = useCallback(() => {
    setIsCustomMode(false);
    setCustomValue('');
    // Reset to a common value (default to "Instantaneous")
    onChange?.('Instantaneous');
  }, [onChange]);

  // Generate unique ID if not provided
  const inputId = id || `duration-${Math.random().toString(36).slice(2, 9)}`;
  const customInputId = `${inputId}-custom`;

  // Get current dropdown value (either the actual value or custom marker)
  const dropdownValue = isCustomMode ? CUSTOM_VALUE : (value || 'Instantaneous');

  // Get description for selected common value
  const selectedCommon = COMMON_DURATIONS.find(d => d.value === value);
  const description = selectedCommon?.description;

  return (
    <div className={`duration-select ${className}`}>
      {/* Label */}
      {label && (
        <label className="duration-label" htmlFor={isCustomMode ? customInputId : inputId}>
          {label}
          {required && <span className="duration-required">*</span>}
          {!required && <span className="duration-optional">(optional)</span>}
        </label>
      )}

      {/* Select or Custom Input */}
      {!isCustomMode ? (
        <div className="duration-input-wrapper">
          <div className="duration-icon">
            <Timer size={16} aria-hidden="true" />
          </div>
          <select
            id={inputId}
            value={dropdownValue}
            onChange={handleSelectChange}
            className="duration-dropdown"
            disabled={disabled}
            aria-describedby={showHint && description ? `${inputId}-hint` : undefined}
          >
            {COMMON_DURATIONS.map(d => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
            <option value={CUSTOM_VALUE}>Custom...</option>
          </select>
        </div>
      ) : (
        <div className="duration-custom-wrapper">
          <div className="duration-icon">
            <Edit3 size={16} aria-hidden="true" />
          </div>
          <input
            id={customInputId}
            type="text"
            value={customValue}
            onChange={handleCustomChange}
            placeholder={placeholder}
            className="duration-custom-input"
            disabled={disabled}
            maxLength={100}
            autoFocus
            aria-describedby={`${customInputId}-hint`}
          />
          <button
            type="button"
            className="duration-back-btn"
            onClick={handleBackToDropdown}
            disabled={disabled}
            title="Back to dropdown"
            aria-label="Switch back to dropdown selection"
          >
            <Timer size={14} />
          </button>
        </div>
      )}

      {/* Hint / Description */}
      {showHint && (
        <div className="duration-hint" id={isCustomMode ? `${customInputId}-hint` : `${inputId}-hint`}>
          {!isCustomMode && description && (
            <span className="duration-hint-description">{description}</span>
          )}
          {isCustomMode && (
            <span className="duration-hint-custom">
              Enter a custom duration (e.g., "7 days", "Until sunrise", "Special")
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default DurationSelect;

// Export utilities and constants
export { COMMON_DURATIONS, CUSTOM_VALUE, isCommonValue };
