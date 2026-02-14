/**
 * AdvancedOptionsSection Component
 *
 * Expandable section for advanced character generation options.
 * Created as part of Task 1.2 of CHARACTER_GEN_ENHANCEMENT_PLAN.md.
 *
 * Features:
 * - Expandable header with chevron icon
 * - Name input field with deterministic name toggle
 * - Race/Class/Subrace dropdowns (populated from FeatureQuery)
 * - Collapsible content area with smooth animation
 * - Pure CSS styling (no Tailwind)
 */

import '../../styles/components/AdvancedOptionsSection.css';
import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, User, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Input } from './Input';
import {
  FeatureQuery,
  type Race,
  type Class,
  ALL_RACES,
  ALL_CLASSES
} from 'playlist-data-engine';

export interface AdvancedOptions {
  /** Override automatic name generation with custom name */
  forceName: string;
  /** Generate deterministic names (same seed = same name). Default: true */
  deterministicName: boolean;
  /** Override race selection from audio analysis */
  forceRace?: Race;
  /** Override class suggestion from audio analysis */
  forceClass?: Class;
  /** Subrace selection: 'pure' (no subrace), undefined (auto), or specific subrace name */
  subrace?: string;
}

export interface AdvancedOptionsSectionProps {
  /** Current advanced options state */
  value: AdvancedOptions;
  /** Callback when options change */
  onChange: (options: AdvancedOptions) => void;
  /** Optional additional CSS classes */
  className?: string;
}

/** Auto option label for dropdowns */
const AUTO_OPTION = 'Auto (from audio)';

export function AdvancedOptionsSection({ value, onChange, className }: AdvancedOptionsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get available races and classes from FeatureQuery
  const featureQuery = useMemo(() => FeatureQuery.getInstance(), []);

  // Available races - use ALL_RACES constant as fallback
  const availableRaces = useMemo(() => {
    try {
      const registeredRaces = featureQuery.getRegisteredRaces();
      // If no races registered yet, fall back to ALL_RACES constant
      return registeredRaces.length > 0 ? registeredRaces : ALL_RACES;
    } catch {
      return ALL_RACES;
    }
  }, [featureQuery]);

  // Available classes - use ALL_CLASSES constant as fallback
  const availableClasses = useMemo(() => {
    try {
      const registeredClasses = featureQuery.getRegisteredClasses();
      // If no classes registered yet, fall back to ALL_CLASSES constant
      return registeredClasses.length > 0 ? registeredClasses : ALL_CLASSES;
    } catch {
      return ALL_CLASSES;
    }
  }, [featureQuery]);

  // Available subraces for the selected race
  const [availableSubraces, setAvailableSubraces] = useState<string[]>([]);

  // Update subraces when race changes
  useEffect(() => {
    if (value.forceRace) {
      try {
        const subraces = featureQuery.getAvailableSubraces(value.forceRace);
        setAvailableSubraces(subraces);
      } catch {
        setAvailableSubraces([]);
      }
    } else {
      setAvailableSubraces([]);
      // Clear subrace when race is cleared
      if (value.subrace) {
        onChange({ ...value, subrace: undefined });
      }
    }
  }, [value.forceRace, featureQuery, onChange, value]);

  // Handle name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, forceName: e.target.value });
  };

  // Handle deterministic name toggle
  const handleDeterministicToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, deterministicName: e.target.checked });
  };

  // Handle race change
  const handleRaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (selectedValue === AUTO_OPTION) {
      onChange({ ...value, forceRace: undefined, subrace: undefined });
    } else {
      onChange({ ...value, forceRace: selectedValue as Race, subrace: undefined });
    }
  };

  // Handle class change
  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (selectedValue === AUTO_OPTION) {
      onChange({ ...value, forceClass: undefined });
    } else {
      onChange({ ...value, forceClass: selectedValue as Class });
    }
  };

  // Handle subrace change
  const handleSubraceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (selectedValue === AUTO_OPTION) {
      onChange({ ...value, subrace: undefined });
    } else if (selectedValue === 'pure') {
      onChange({ ...value, subrace: 'pure' });
    } else {
      onChange({ ...value, subrace: selectedValue });
    }
  };

  return (
    <div className={cn('advanced-options-section', className)}>
      {/* Expandable Header */}
      <button
        type="button"
        className="advanced-options-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls="advanced-options-content"
      >
        <div className="advanced-options-header-left">
          <Sparkles className="advanced-options-header-icon" size={16} />
          <span className="advanced-options-title">Advanced Options</span>
        </div>
        <ChevronDown
          className={cn('advanced-options-chevron', isExpanded && 'advanced-options-chevron-expanded')}
          size={18}
        />
      </button>

      {/* Collapsible Content */}
      <div
        id="advanced-options-content"
        className={cn('advanced-options-content', isExpanded && 'advanced-options-content-expanded')}
      >
        {/* Name Controls */}
        <div className="advanced-options-group">
          <div className="advanced-options-group-label">Character Name</div>
          <div className="advanced-options-row">
            <Input
              label="Custom Name"
              placeholder="Leave empty for auto-generated name"
              value={value.forceName}
              onChange={handleNameChange}
              leftIcon={User}
              size="sm"
              containerClassName="advanced-options-input"
            />
          </div>
          <label className="advanced-options-checkbox">
            <input
              type="checkbox"
              checked={value.deterministicName}
              onChange={handleDeterministicToggle}
              aria-describedby="deterministic-name-hint"
            />
            <span className="advanced-options-checkbox-label">
              Deterministic naming
            </span>
            <span className="advanced-options-checkbox-hint" id="deterministic-name-hint">
              (same track = same name)
            </span>
          </label>
        </div>

        {/* Race/Class/Subrace Dropdowns */}
        <div className="advanced-options-group">
          <div className="advanced-options-group-label">Race & Class Overrides</div>

          {/* Race Dropdown */}
          <div className="advanced-options-field">
            <label className="advanced-options-field-label" htmlFor="race-select">
              Race
            </label>
            <select
              id="race-select"
              className="advanced-options-select"
              value={value.forceRace || AUTO_OPTION}
              onChange={handleRaceChange}
              aria-describedby="race-select-hint"
            >
              <option value={AUTO_OPTION}>{AUTO_OPTION}</option>
              {availableRaces.map((race) => (
                <option key={race} value={race}>
                  {race}
                </option>
              ))}
            </select>
          </div>

          {/* Subrace Dropdown - only shown when race is selected and subraces are available */}
          {value.forceRace && availableSubraces.length > 0 && (
            <div className="advanced-options-field">
              <label className="advanced-options-field-label" htmlFor="subrace-select">
                Subrace
              </label>
              <select
                id="subrace-select"
                className="advanced-options-select"
                value={value.subrace || AUTO_OPTION}
                onChange={handleSubraceChange}
              >
                <option value={AUTO_OPTION}>{AUTO_OPTION}</option>
                <option value="pure">Pure (no subrace)</option>
                {availableSubraces.map((subrace) => (
                  <option key={subrace} value={subrace}>
                    {subrace}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Class Dropdown */}
          <div className="advanced-options-field">
            <label className="advanced-options-field-label" htmlFor="class-select">
              Class
            </label>
            <select
              id="class-select"
              className="advanced-options-select"
              value={value.forceClass || AUTO_OPTION}
              onChange={handleClassChange}
            >
              <option value={AUTO_OPTION}>{AUTO_OPTION}</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Helper Text */}
        <div className="advanced-options-hint" id="race-select-hint">
          Options set to "{AUTO_OPTION}" will be determined by audio analysis.
        </div>
      </div>
    </div>
  );
}

export default AdvancedOptionsSection;
