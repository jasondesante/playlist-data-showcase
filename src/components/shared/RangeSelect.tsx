/**
 * RangeSelect Component
 *
 * A structured dropdown for selecting spell/effect ranges with a custom option.
 * Part of DataViewerTab Improvements Plan - Phase 5.1.
 *
 * Features:
 * - Dropdown with common D&D 5e range values
 * - "Custom..." option that reveals a text input
 * - Live validation
 * - Accessible with proper ARIA attributes
 *
 * @see docs/plans/DATAVIEWER_IMPROVEMENTS_PLAN.md for implementation details
 */

import { useState, useCallback, useEffect } from 'react';
import { Target, Edit3 } from 'lucide-react';
import './RangeSelect.css';

/**
 * Common range values in D&D 5e
 */
const COMMON_RANGES = [
  { value: 'Touch', label: 'Touch', description: 'Must touch target' },
  { value: 'Self', label: 'Self', description: 'Affects caster only' },
  { value: '5 feet', label: '5 feet', description: 'Melee range' },
  { value: '10 feet', label: '10 feet', description: 'Short reach' },
  { value: '30 feet', label: '30 feet', description: 'Close range' },
  { value: '60 feet', label: '60 feet', description: 'Medium range' },
  { value: '90 feet', label: '90 feet', description: 'Extended range' },
  { value: '120 feet', label: '120 feet', description: 'Long range' },
  { value: '150 feet', label: '150 feet', description: 'Very long range' },
  { value: '300 feet', label: '300 feet', description: 'Extreme range' },
  { value: '1 mile', label: '1 Mile', description: 'Massive range' },
] as const;

/** Custom option marker */
const CUSTOM_VALUE = '__custom__';

/**
 * Props for RangeSelect component
 */
export interface RangeSelectProps {
  /** Current range value */
  value?: string;
  /** Callback when range changes */
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
  return COMMON_RANGES.some(r => r.value === value);
}

/**
 * RangeSelect Component
 *
 * A reusable select for spell/effect ranges with custom option support.
 */
export function RangeSelect({
  value = '',
  onChange,
  label,
  placeholder = 'e.g., 500 feet, 1 mile, Special',
  disabled = false,
  required = false,
  id,
  className = '',
  showHint = true
}: RangeSelectProps) {
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
    // Reset to a common value (default to "30 feet")
    onChange?.('30 feet');
  }, [onChange]);

  // Generate unique ID if not provided
  const inputId = id || `range-${Math.random().toString(36).slice(2, 9)}`;
  const customInputId = `${inputId}-custom`;

  // Get current dropdown value (either the actual value or custom marker)
  const dropdownValue = isCustomMode ? CUSTOM_VALUE : (value || '30 feet');

  // Get description for selected common value
  const selectedCommon = COMMON_RANGES.find(r => r.value === value);
  const description = selectedCommon?.description;

  return (
    <div className={`range-select ${className}`}>
      {/* Label */}
      {label && (
        <label className="range-label" htmlFor={isCustomMode ? customInputId : inputId}>
          {label}
          {required && <span className="range-required">*</span>}
          {!required && <span className="range-optional">(optional)</span>}
        </label>
      )}

      {/* Select or Custom Input */}
      {!isCustomMode ? (
        <div className="range-input-wrapper">
          <div className="range-icon">
            <Target size={16} aria-hidden="true" />
          </div>
          <select
            id={inputId}
            value={dropdownValue}
            onChange={handleSelectChange}
            className="range-dropdown"
            disabled={disabled}
            aria-describedby={showHint && description ? `${inputId}-hint` : undefined}
          >
            {COMMON_RANGES.map(r => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
            <option value={CUSTOM_VALUE}>Custom...</option>
          </select>
        </div>
      ) : (
        <div className="range-custom-wrapper">
          <div className="range-icon">
            <Edit3 size={16} aria-hidden="true" />
          </div>
          <input
            id={customInputId}
            type="text"
            value={customValue}
            onChange={handleCustomChange}
            placeholder={placeholder}
            className="range-custom-input"
            disabled={disabled}
            maxLength={50}
            autoFocus
            aria-describedby={`${customInputId}-hint`}
          />
          <button
            type="button"
            className="range-back-btn"
            onClick={handleBackToDropdown}
            disabled={disabled}
            title="Back to dropdown"
            aria-label="Switch back to dropdown selection"
          >
            <Target size={14} />
          </button>
        </div>
      )}

      {/* Hint / Description */}
      {showHint && (
        <div className="range-hint" id={isCustomMode ? `${customInputId}-hint` : `${inputId}-hint`}>
          {!isCustomMode && description && (
            <span className="range-hint-description">{description}</span>
          )}
          {isCustomMode && (
            <span className="range-hint-custom">
              Enter a custom range (e.g., "500 feet", "Special", "Sight")
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default RangeSelect;

// Export utilities and constants
export { COMMON_RANGES, CUSTOM_VALUE, isCommonValue };
