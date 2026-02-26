/**
 * RaceCreatorForm Component
 *
 * A form component for creating custom races.
 * Part of DataViewerTab Custom Content Creation Upgrade - Phase 6.1.
 *
 * Features:
 * - Name field (required)
 * - Description field (optional)
 * - Speed input (default 30)
 * - Ability bonuses section (STR/DEX/CON/INT/WIS/CHA inputs 0-4)
 * - Traits section (multi-select from existing traits)
 * - Subraces section (expandable, add subrace names and per-subrace bonuses)
 * - Registers to both 'races' and 'races.data' categories
 * - Live validation with error display
 *
 * @see docs/plans/DATAVIEWER_CUSTOM_CONTENT_PLAN.md for implementation details
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Feather,
  Sparkles,
  Plus,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Users,
  Trash2,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useContentCreator } from '@/hooks/useContentCreator';
import './RaceCreatorForm.css';

/**
 * Valid ability scores
 */
const VALID_ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;
type Ability = typeof VALID_ABILITIES[number];

/**
 * Ability bonus structure
 */
export type AbilityBonuses = Partial<Record<Ability, number>>;

/**
 * Subrace data structure
 */
export interface SubraceEntry {
  name: string;
  ability_bonuses?: AbilityBonuses;
  traits?: string[];
}

/**
 * Race form data structure
 */
export interface RaceFormData {
  name: string;
  description: string;
  speed: number;
  ability_bonuses: AbilityBonuses;
  traits: string[];
  subraces: SubraceEntry[];
}

/**
 * Props for RaceCreatorForm component
 */
export interface RaceCreatorFormProps {
  /** Initial form data (for editing) */
  initialData?: Partial<RaceFormData>;
  /** Callback when race is created */
  onCreate?: (race: RaceFormData) => void;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Custom submit button text */
  submitButtonText?: string;
  /** Available traits to select from */
  availableTraits?: string[];
}

/**
 * Get default form data
 */
function getDefaultFormData(): RaceFormData {
  return {
    name: '',
    description: '',
    speed: 30,
    ability_bonuses: {},
    traits: [],
    subraces: []
  };
}

/**
 * Get default subrace entry
 */
function getDefaultSubrace(): SubraceEntry {
  return {
    name: '',
    ability_bonuses: {},
    traits: []
  };
}

/**
 * Calculate total ability bonus points
 */
function calculateTotalBonuses(bonuses: AbilityBonuses): number {
  return Object.values(bonuses).reduce((sum, val) => sum + (val || 0), 0);
}

/**
 * RaceCreatorForm Component
 *
 * A form for creating custom races for character generation.
 */
export function RaceCreatorForm({
  initialData,
  onCreate,
  onCancel,
  disabled = false,
  submitButtonText,
  availableTraits
}: RaceCreatorFormProps) {
  const { createContent, isLoading, lastError, clearError } = useContentCreator();

  // Form state
  const [formData, setFormData] = useState<RaceFormData>(() => ({
    ...getDefaultFormData(),
    ...initialData
  }));
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubraces, setShowSubraces] = useState(false);

  // Default traits from the racialTraits category
  const defaultTraits = useMemo(() => {
    return availableTraits || [
      'Darkvision',
      'Draconic Ancestry',
      'Dwarven Resilience',
      'Elven Weapon Training',
      'Fey Ancestry',
      'Gnome Cunning',
      'Halfling Luck',
      'Hellish Resistance',
      'Lucky',
      'Menacing',
      'Relentless Endurance',
      'Savage Attacks',
      'Stonecunning',
      'Superior Darkvision'
    ];
  }, [availableTraits]);

  // Validate form
  const validate = useCallback((): boolean => {
    const errors: string[] = [];

    // Required fields
    if (!formData.name.trim()) {
      errors.push('Race name is required');
    }

    // Speed validation
    if (formData.speed < 0 || formData.speed > 120) {
      errors.push('Speed must be between 0 and 120');
    }

    // Ability bonuses validation
    const totalBonuses = calculateTotalBonuses(formData.ability_bonuses);
    if (totalBonuses > 6) {
      errors.push(`Total ability bonuses (${totalBonuses}) should typically not exceed 6`);
    }

    // Validate each ability bonus
    for (const [ability, value] of Object.entries(formData.ability_bonuses)) {
      if (value !== undefined && (value < 0 || value > 4)) {
        errors.push(`${ability} bonus must be between 0 and 4`);
      }
    }

    // Validate subraces
    for (let i = 0; i < formData.subraces.length; i++) {
      const subrace = formData.subraces[i];
      if (!subrace.name.trim()) {
        errors.push(`Subrace ${i + 1}: Name is required`);
      }
      const subraceBonuses = calculateTotalBonuses(subrace.ability_bonuses || {});
      if (subraceBonuses > 2) {
        errors.push(`Subrace ${i + 1}: Bonuses typically should not exceed 2`);
      }
    }

    setFormErrors(errors);
    return errors.length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    clearError();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Build race data for 'races.data' category
      const raceData: Record<string, unknown> = {
        race: formData.name.trim(),
        ability_bonuses: formData.ability_bonuses,
        speed: formData.speed,
        traits: formData.traits,
        source: 'custom'
      };

      // Add description if provided
      if (formData.description.trim()) {
        raceData.description = formData.description.trim();
      }

      // Add subraces if any
      if (formData.subraces.length > 0) {
        raceData.subraces = formData.subraces.map(s => s.name.trim()).filter(Boolean);
      }

      // Register race name in 'races' category
      const nameResult = createContent(
        'races',
        { name: formData.name.trim() },
        { validate: true },
        {
          onError: (error) => {
            setFormErrors([error]);
          }
        }
      );

      if (!nameResult.success) {
        setIsSubmitting(false);
        return;
      }

      // Register race data in 'races.data' category
      const dataResult = createContent(
        'races.data',
        raceData,
        { validate: true },
        {
          onSuccess: () => {
            // Reset form on success
            setFormData(getDefaultFormData());
            setFormErrors([]);
            onCreate?.(formData);
          },
          onError: (error) => {
            setFormErrors([error]);
          }
        }
      );

      if (!dataResult.success && dataResult.error) {
        setFormErrors([dataResult.error]);
      }
    } catch (error) {
      setFormErrors([error instanceof Error ? error.message : 'An error occurred']);
    } finally {
      setIsSubmitting(false);
    }
  }, [clearError, validate, formData, createContent, onCreate]);

  // Field change handlers
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, name: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, description: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10) || 0;
    setFormData(prev => ({ ...prev, speed: Math.max(0, Math.min(120, value)) }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  // Ability bonus handlers
  const handleAbilityBonusChange = useCallback((ability: Ability, value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    setFormData(prev => {
      const bonuses = { ...prev.ability_bonuses };
      if (numValue === undefined || numValue === 0) {
        delete bonuses[ability];
      } else {
        bonuses[ability] = Math.max(0, Math.min(4, numValue));
      }
      return { ...prev, ability_bonuses: bonuses };
    });
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  // Traits handlers
  const handleTraitToggle = useCallback((trait: string) => {
    setFormData(prev => {
      const traits = prev.traits.includes(trait)
        ? prev.traits.filter(t => t !== trait)
        : [...prev.traits, trait];
      return { ...prev, traits };
    });
  }, []);

  // Subrace handlers
  const handleAddSubrace = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      subraces: [...prev.subraces, getDefaultSubrace()]
    }));
    setShowSubraces(true);
  }, []);

  const handleRemoveSubrace = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      subraces: prev.subraces.filter((_, i) => i !== index)
    }));
  }, []);

  const handleSubraceNameChange = useCallback((index: number, name: string) => {
    setFormData(prev => ({
      ...prev,
      subraces: prev.subraces.map((s, i) =>
        i === index ? { ...s, name } : s
      )
    }));
  }, []);

  const handleSubraceAbilityBonusChange = useCallback((subraceIndex: number, ability: Ability, value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    setFormData(prev => ({
      ...prev,
      subraces: prev.subraces.map((s, i) => {
        if (i !== subraceIndex) return s;
        const bonuses = { ...(s.ability_bonuses || {}) };
        if (numValue === undefined || numValue === 0) {
          delete bonuses[ability];
        } else {
          bonuses[ability] = Math.max(0, Math.min(4, numValue));
        }
        return { ...s, ability_bonuses: bonuses };
      })
    }));
  }, []);

  // Cancel handler
  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  // Handle Enter key to submit (but not in textareas)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Submit on Enter (but not in textareas where it should add newlines)
    if (e.key === 'Enter' && !e.shiftKey && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Get button text
  const getButtonText = () => {
    if (submitButtonText) return submitButtonText;
    return 'Create Race';
  };

  // Check if form is valid enough to submit
  const canSubmit = formData.name.trim();

  // Calculate total bonuses
  const totalBonuses = calculateTotalBonuses(formData.ability_bonuses);

  return (
    <div className="race-creator-form" onKeyDown={handleKeyDown}>
      {/* Basic Info Section */}
      <div className="race-creator-section">
        <h4 className="race-creator-section-title">
          <Feather size={16} />
          Basic Info
        </h4>

        <div className="race-creator-field">
          <label className="race-creator-label" htmlFor="race-name">
            Name <span className="race-creator-required">*</span>
          </label>
          <input
            id="race-name"
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            placeholder="e.g., Dragonkin"
            className="race-creator-input"
            disabled={disabled}
            maxLength={50}
          />
          <span className="race-creator-hint">
            {50 - formData.name.length} characters remaining
          </span>
        </div>

        <div className="race-creator-field">
          <label className="race-creator-label" htmlFor="race-description">
            Description <span className="race-creator-optional">(Optional)</span>
          </label>
          <textarea
            id="race-description"
            value={formData.description}
            onChange={handleDescriptionChange}
            placeholder="Describe the race's appearance, culture, or history..."
            className="race-creator-textarea"
            disabled={disabled}
            maxLength={1000}
            rows={3}
          />
          <span className="race-creator-hint">
            {1000 - formData.description.length} characters remaining
          </span>
        </div>

        <div className="race-creator-field">
          <label className="race-creator-label" htmlFor="race-speed">
            Speed (feet)
          </label>
          <input
            id="race-speed"
            type="number"
            value={formData.speed}
            onChange={handleSpeedChange}
            min={0}
            max={120}
            className="race-creator-input race-creator-input-speed"
            disabled={disabled}
          />
          <span className="race-creator-hint">
            Default is 30 ft for medium creatures
          </span>
        </div>
      </div>

      {/* Ability Bonuses Section */}
      <div className="race-creator-section">
        <h4 className="race-creator-section-title">
          <Zap size={16} />
          Ability Bonuses
        </h4>

        <div className="race-creator-field">
          <div className="race-creator-abilities-grid">
            {VALID_ABILITIES.map(ability => (
              <div key={ability} className="race-creator-ability-input">
                <label>{ability}</label>
                <input
                  type="number"
                  min={0}
                  max={4}
                  value={formData.ability_bonuses[ability] ?? ''}
                  onChange={(e) => handleAbilityBonusChange(ability, e.target.value)}
                  placeholder="0"
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
          <div className="race-creator-bonus-total">
            Total Bonus Points: <strong>{totalBonuses}</strong>/6
            {totalBonuses > 6 && (
              <span className="race-creator-bonus-warning">
                (High for standard races)
              </span>
            )}
          </div>
          <span className="race-creator-hint">
            Most races have +2 to one ability and +1 to another (3 total)
          </span>
        </div>
      </div>

      {/* Traits Section */}
      <div className="race-creator-section">
        <h4 className="race-creator-section-title">
          <Shield size={16} />
          Traits <span className="race-creator-optional">(Optional)</span>
        </h4>

        <span className="race-creator-hint">
          Select traits that this race possesses. You can create custom traits separately using the Racial Trait Creator.
        </span>

        <div className="race-creator-traits-grid">
          {defaultTraits.map(trait => (
            <label key={trait} className="race-creator-trait-option">
              <input
                type="checkbox"
                checked={formData.traits.includes(trait)}
                onChange={() => handleTraitToggle(trait)}
                disabled={disabled}
              />
              <span>{trait}</span>
            </label>
          ))}
        </div>

        {formData.traits.length > 0 && (
          <div className="race-creator-selected-traits">
            <span className="race-creator-selected-label">Selected:</span>
            {formData.traits.map(trait => (
              <span key={trait} className="race-creator-trait-tag">
                {trait}
                <button
                  type="button"
                  onClick={() => handleTraitToggle(trait)}
                  disabled={disabled}
                  className="race-creator-trait-remove"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Subraces Toggle */}
      <div className="race-creator-advanced-toggle">
        <button
          type="button"
          className="race-creator-advanced-btn"
          onClick={() => setShowSubraces(!showSubraces)}
          disabled={disabled}
        >
          {showSubraces ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <Users size={16} />
          Subraces {formData.subraces.length > 0 && `(${formData.subraces.length})`}
        </button>
      </div>

      {/* Subraces Section */}
      {showSubraces && (
        <div className="race-creator-advanced-section">
          <div className="race-creator-subraces-hint">
            Add subraces to provide variants with different ability bonuses.
            For example, "High Elf" and "Wood Elf" could be subraces of "Elf".
          </div>

          {formData.subraces.length > 0 && (
            <div className="race-creator-subraces-list">
              {formData.subraces.map((subrace, index) => (
                <div key={index} className="race-creator-subrace-item">
                  <div className="race-creator-subrace-header">
                    <span className="race-creator-subrace-number">Subrace {index + 1}</span>
                    <button
                      type="button"
                      className="race-creator-subrace-remove"
                      onClick={() => handleRemoveSubrace(index)}
                      disabled={disabled}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="race-creator-field">
                    <label className="race-creator-label">Name</label>
                    <input
                      type="text"
                      value={subrace.name}
                      onChange={(e) => handleSubraceNameChange(index, e.target.value)}
                      placeholder="e.g., High Elf"
                      className="race-creator-input"
                      disabled={disabled}
                      maxLength={50}
                    />
                  </div>

                  <div className="race-creator-field">
                    <label className="race-creator-label">Ability Bonuses</label>
                    <div className="race-creator-abilities-grid race-creator-abilities-grid-subrace">
                      {VALID_ABILITIES.map(ability => (
                        <div key={ability} className="race-creator-ability-input">
                          <label>{ability}</label>
                          <input
                            type="number"
                            min={0}
                            max={4}
                            value={subrace.ability_bonuses?.[ability] ?? ''}
                            onChange={(e) => handleSubraceAbilityBonusChange(index, ability, e.target.value)}
                            placeholder="0"
                            disabled={disabled}
                          />
                        </div>
                      ))}
                    </div>
                    <span className="race-creator-hint">
                      Subraces typically get +1 or +2 total bonus
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddSubrace}
            disabled={disabled}
            leftIcon={Plus}
          >
            Add Subrace
          </Button>
        </div>
      )}

      {/* Validation Errors */}
      {(formErrors.length > 0 || lastError) && (
        <div className="race-creator-errors">
          {formErrors.map((error, index) => (
            <div key={index} className="race-creator-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          ))}
          {lastError && !formErrors.includes(lastError) && (
            <div className="race-creator-error">
              <AlertCircle size={14} />
              <span>{lastError}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="race-creator-actions">
        <Button
          variant="primary"
          size="md"
          onClick={handleSubmit}
          isLoading={isSubmitting || isLoading}
          disabled={disabled || !canSubmit}
          leftIcon={Plus}
        >
          {getButtonText()}
        </Button>

        {onCancel && (
          <Button
            variant="outline"
            size="md"
            onClick={handleCancel}
            disabled={disabled}
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Preview Section */}
      {formData.name.trim() && (
        <div className="race-creator-preview">
          <h4 className="race-creator-preview-title">
            <Sparkles size={16} />
            Preview
          </h4>
          <div className="race-creator-preview-content">
            <div className="race-creator-preview-header">
              <span className="race-creator-preview-name">
                {formData.name}
              </span>
              <div className="race-creator-preview-badges">
                <span className="race-creator-preview-badge race-creator-preview-badge-speed">
                  {formData.speed} ft
                </span>
                <span className="race-creator-preview-badge race-creator-preview-badge-traits">
                  {formData.traits.length} traits
                </span>
              </div>
            </div>
            <div className="race-creator-preview-stats">
              {Object.entries(formData.ability_bonuses).map(([ability, bonus]) => (
                bonus && (
                  <span key={ability} className="race-creator-preview-stat">
                    <strong>{ability}:</strong> +{bonus}
                  </span>
                )
              ))}
            </div>
            {formData.description && (
              <p className="race-creator-preview-description">
                {formData.description.length > 150
                  ? `${formData.description.substring(0, 150)}...`
                  : formData.description}
              </p>
            )}
            {formData.traits.length > 0 && (
              <div className="race-creator-preview-traits">
                {formData.traits.map(trait => (
                  <span key={trait} className="race-creator-preview-trait">
                    {trait}
                  </span>
                ))}
              </div>
            )}
            {formData.subraces.length > 0 && (
              <div className="race-creator-preview-subraces">
                <span className="race-creator-preview-subraces-label">Subraces:</span>
                {formData.subraces.filter(s => s.name).map(subrace => (
                  <span key={subrace.name} className="race-creator-preview-subrace">
                    {subrace.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Import X icon inline since it's needed for trait removal
function X({ size }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default RaceCreatorForm;

// Export types and utilities
export { VALID_ABILITIES, calculateTotalBonuses };
