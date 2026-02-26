/**
 * CastingTimeSelect Component
 *
 * A structured dropdown for selecting casting times with a custom option.
 * Part of DataViewerTab Improvements Plan - Phase 5.1.
 *
 * Features:
 * - Dropdown with common D&D 5e casting time values
 * - "Custom..." option that reveals a text input
 * - Live validation
 * - Accessible with proper ARIA attributes
 *
 * @see docs/plans/DATAVIEWER_IMPROVEMENTS_PLAN.md for implementation details
 */

import { useState, useCallback, useEffect } from 'react';
import { Clock, Edit3 } from 'lucide-react';
import './CastingTimeSelect.css';

/**
 * Common casting time values in D&D 5e
 */
const COMMON_CASTING_TIMES = [
  { value: '1 action', label: '1 Action', description: 'Standard action' },
  { value: '1 bonus action', label: '1 Bonus Action', description: 'Uses bonus action' },
  { value: '1 reaction', label: '1 Reaction', description: 'Triggered response' },
  { value: '1 minute', label: '1 Minute', description: '10 rounds' },
  { value: '10 minutes', label: '10 Minutes', description: 'Short ritual' },
  { value: '1 hour', label: '1 Hour', description: 'Long ritual' },
] as const;

/** Custom option marker */
const CUSTOM_VALUE = '__custom__';

/**
 * Props for CastingTimeSelect component
 */
export interface CastingTimeSelectProps {
  /** Current casting time value */
  value?: string;
  /** Callback when casting time changes */
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
  return COMMON_CASTING_TIMES.some(ct => ct.value === value);
}

/**
 * CastingTimeSelect Component
 *
 * A reusable select for casting times with custom option support.
 */
export function CastingTimeSelect({
  value = '',
  onChange,
  label,
  placeholder = 'e.g., 8 hours, 24 hours',
  disabled = false,
  required = false,
  id,
  className = '',
  showHint = true
}: CastingTimeSelectProps) {
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
    // Reset to a common value (default to "1 action")
    onChange?.('1 action');
  }, [onChange]);

  // Generate unique ID if not provided
  const inputId = id || `casting-time-${Math.random().toString(36).slice(2, 9)}`;
  const customInputId = `${inputId}-custom`;

  // Get current dropdown value (either the actual value or custom marker)
  const dropdownValue = isCustomMode ? CUSTOM_VALUE : (value || '1 action');

  // Get description for selected common value
  const selectedCommon = COMMON_CASTING_TIMES.find(ct => ct.value === value);
  const description = selectedCommon?.description;

  return (
    <div className={`casting-time-select ${className}`}>
      {/* Label */}
      {label && (
        <label className="casting-time-label" htmlFor={isCustomMode ? customInputId : inputId}>
          {label}
          {required && <span className="casting-time-required">*</span>}
          {!required && <span className="casting-time-optional">(optional)</span>}
        </label>
      )}

      {/* Select or Custom Input */}
      {!isCustomMode ? (
        <div className="casting-time-input-wrapper">
          <div className="casting-time-icon">
            <Clock size={16} aria-hidden="true" />
          </div>
          <select
            id={inputId}
            value={dropdownValue}
            onChange={handleSelectChange}
            className="casting-time-dropdown"
            disabled={disabled}
            aria-describedby={showHint && description ? `${inputId}-hint` : undefined}
          >
            {COMMON_CASTING_TIMES.map(ct => (
              <option key={ct.value} value={ct.value}>
                {ct.label}
              </option>
            ))}
            <option value={CUSTOM_VALUE}>Custom...</option>
          </select>
        </div>
      ) : (
        <div className="casting-time-custom-wrapper">
          <div className="casting-time-icon">
            <Edit3 size={16} aria-hidden="true" />
          </div>
          <input
            id={customInputId}
            type="text"
            value={customValue}
            onChange={handleCustomChange}
            placeholder={placeholder}
            className="casting-time-custom-input"
            disabled={disabled}
            maxLength={50}
            autoFocus
            aria-describedby={`${customInputId}-hint`}
          />
          <button
            type="button"
            className="casting-time-back-btn"
            onClick={handleBackToDropdown}
            disabled={disabled}
            title="Back to dropdown"
            aria-label="Switch back to dropdown selection"
          >
            <Clock size={14} />
          </button>
        </div>
      )}

      {/* Hint / Description */}
      {showHint && (
        <div className="casting-time-hint" id={isCustomMode ? `${customInputId}-hint` : `${inputId}-hint`}>
          {!isCustomMode && description && (
            <span className="casting-time-hint-description">{description}</span>
          )}
          {isCustomMode && (
            <span className="casting-time-hint-custom">
              Enter a custom casting time (e.g., "8 hours", "24 hours")
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default CastingTimeSelect;

// Export utilities and constants
export { COMMON_CASTING_TIMES, CUSTOM_VALUE, isCommonValue };
