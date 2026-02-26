/**
 * RacialTraitCreatorForm Component
 *
 * A form component for creating and adding custom racial traits.
 * Part of DataViewerTab Custom Content Creation Upgrade - Phase 5.3.
 *
 * Features:
 * - ID field (auto-generated from name, or manual)
 * - Name field (required)
 * - Race selector (from existing races + custom)
 * - Subrace field (optional - for subrace-specific traits)
 * - Description textarea (required)
 * - Effects builder (expandable advanced section)
 * - Prerequisites section (optional, can include subrace requirement)
 * - Live validation with error display
 *
 * @see docs/plans/DATAVIEWER_CUSTOM_CONTENT_PLAN.md for implementation details
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Feather,
  FileText,
  Sparkles,
  Plus,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useContentCreator, type ContentType } from '@/hooks/useContentCreator';
import './RacialTraitCreatorForm.css';

/**
 * Standard D&D 5e races
 */
const STANDARD_RACES = [
  'Dragonborn',
  'Dwarf',
  'Elf',
  'Gnome',
  'Half-Elf',
  'Half-Orc',
  'Halfling',
  'Human',
  'Tiefling',
  'Aasimar',
  'Firbolg',
  'Goliath',
  'Kenku',
  'Tabaxi',
  'Tortle',
  'Lizardfolk',
  'Goblin',
  'Orc'
] as const;

/**
 * Valid ability scores
 */
const VALID_ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;
type Ability = typeof VALID_ABILITIES[number];

/**
 * Effect structure for racial traits
 */
export interface RacialTraitEffect {
  type: string;
  target: string;
  value?: string | number;
  condition?: string;
}

/**
 * Prerequisites structure for racial traits
 */
export interface RacialTraitPrerequisites {
  level?: number;
  subrace?: string;
  abilities?: Partial<Record<Ability, number>>;
}

/**
 * Racial trait form data structure
 */
export interface RacialTraitFormData {
  id: string;
  name: string;
  race: string;
  subrace: string;
  description: string;
  effects: RacialTraitEffect[];
  prerequisites: RacialTraitPrerequisites;
}

/**
 * Props for RacialTraitCreatorForm component
 */
export interface RacialTraitCreatorFormProps {
  /** Initial form data (for editing) */
  initialData?: Partial<RacialTraitFormData>;
  /** Callback when trait is created */
  onCreate?: (trait: RacialTraitFormData) => void;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Custom submit button text */
  submitButtonText?: string;
  /** Content type override (for race-specific traits) */
  contentType?: ContentType;
  /** Custom race list (if different from standard) */
  availableRaces?: string[];
}

/**
 * Generate an ID from a name (lowercase_with_underscores)
 */
function generateIdFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Get default form data
 */
function getDefaultFormData(): RacialTraitFormData {
  return {
    id: '',
    name: '',
    race: '',
    subrace: '',
    description: '',
    effects: [],
    prerequisites: {}
  };
}

/**
 * Get default effect
 */
function getDefaultEffect(): RacialTraitEffect {
  return {
    type: '',
    target: '',
    value: undefined,
    condition: ''
  };
}

/**
 * RacialTraitCreatorForm Component
 *
 * A form for creating custom racial traits for character generation.
 */
export function RacialTraitCreatorForm({
  initialData,
  onCreate,
  onCancel,
  disabled = false,
  submitButtonText,
  contentType = 'racialTraits',
  availableRaces
}: RacialTraitCreatorFormProps) {
  const { createContent, isLoading, lastError, clearError } = useContentCreator();

  // Form state
  const [formData, setFormData] = useState<RacialTraitFormData>(() => ({
    ...getDefaultFormData(),
    ...initialData
  }));
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoGenerateId, setAutoGenerateId] = useState(!initialData?.id);

  // Determine if this is a race-specific content type (e.g., 'racialTraits.Elf')
  const raceSpecificMatch = contentType.match(/^racialTraits\.(.+)$/);
  const isRaceSpecific = !!raceSpecificMatch;
  const lockedRace = raceSpecificMatch ? raceSpecificMatch[1] : null;

  // Get races list
  const racesList = useMemo(() => {
    const baseRaces = availableRaces || [...STANDARD_RACES];
    // Could also fetch custom races from ExtensionManager here
    return baseRaces;
  }, [availableRaces]);

  // Lock race selection if content type is race-specific
  useEffect(() => {
    if (lockedRace && formData.race !== lockedRace) {
      setFormData(prev => ({
        ...prev,
        race: lockedRace
      }));
    }
  }, [lockedRace, formData.race]);

  // Auto-generate ID from name
  useEffect(() => {
    if (autoGenerateId && formData.name) {
      const generatedId = generateIdFromName(formData.name);
      setFormData(prev => ({ ...prev, id: generatedId }));
    }
  }, [formData.name, autoGenerateId]);

  // Validate form
  const validate = useCallback((): boolean => {
    const errors: string[] = [];

    // Required fields
    if (!formData.id.trim()) {
      errors.push('Trait ID is required');
    } else if (!/^[a-z][a-z0-9_]*$/.test(formData.id)) {
      errors.push('ID must use lowercase_with_underscores format (e.g., "darkvision")');
    }

    if (!formData.name.trim()) {
      errors.push('Trait name is required');
    }

    if (!formData.race.trim()) {
      errors.push('Race selection is required');
    }

    if (!formData.description.trim()) {
      errors.push('Description is required');
    }

    // Validate effects if any
    for (let i = 0; i < formData.effects.length; i++) {
      const effect = formData.effects[i];
      if (!effect.type) {
        errors.push(`Effect ${i + 1}: Type is required`);
      }
      if (!effect.target) {
        errors.push(`Effect ${i + 1}: Target is required`);
      }
    }

    // Validate prerequisites if any
    if (formData.prerequisites.level !== undefined) {
      if (formData.prerequisites.level < 1 || formData.prerequisites.level > 20) {
        errors.push('Prerequisite level must be between 1 and 20');
      }
    }

    if (formData.prerequisites.abilities) {
      for (const [ability, value] of Object.entries(formData.prerequisites.abilities)) {
        if (!VALID_ABILITIES.includes(ability as Ability)) {
          errors.push(`Invalid ability in prerequisites: ${ability}`);
        } else if (typeof value !== 'number' || value < 1 || value > 30) {
          errors.push(`Prerequisite ${ability} must be between 1 and 30`);
        }
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
      // Build trait object
      const traitItem: Record<string, unknown> = {
        id: formData.id,
        name: formData.name,
        race: formData.race,
        description: formData.description,
        source: 'custom'
      };

      // Add subrace if specified
      if (formData.subrace.trim()) {
        traitItem.subrace = formData.subrace.trim();
      }

      // Add effects if any
      if (formData.effects.length > 0) {
        traitItem.effects = formData.effects.filter(e => e.type && e.target);
      }

      // Add prerequisites if any
      const hasPrereqs = formData.prerequisites.level !== undefined ||
        formData.prerequisites.subrace ||
        formData.prerequisites.abilities;

      if (hasPrereqs) {
        traitItem.prerequisites = {};
        if (formData.prerequisites.level !== undefined) {
          (traitItem.prerequisites as Record<string, unknown>).level = formData.prerequisites.level;
        }
        if (formData.prerequisites.subrace) {
          (traitItem.prerequisites as Record<string, unknown>).subrace = formData.prerequisites.subrace;
        }
        if (formData.prerequisites.abilities && Object.keys(formData.prerequisites.abilities).length > 0) {
          (traitItem.prerequisites as Record<string, unknown>).abilities = formData.prerequisites.abilities;
        }
      }

      // Determine the actual content type
      const actualContentType = contentType.startsWith('racialTraits.') ? 'racialTraits' : contentType;

      const result = createContent(
        actualContentType,
        traitItem,
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

      if (!result.success && result.error) {
        setFormErrors([result.error]);
      }
    } catch (error) {
      setFormErrors([error instanceof Error ? error.message : 'An error occurred']);
    } finally {
      setIsSubmitting(false);
    }
  }, [clearError, validate, formData, contentType, createContent, onCreate]);

  // Field change handlers
  const handleIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, id: value }));
    setAutoGenerateId(false);
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, name: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleRaceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, race: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleSubraceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, subrace: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, description: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  // Effect handlers
  const handleAddEffect = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      effects: [...prev.effects, getDefaultEffect()]
    }));
  }, []);

  const handleRemoveEffect = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      effects: prev.effects.filter((_, i) => i !== index)
    }));
  }, []);

  const handleEffectChange = useCallback((index: number, field: keyof RacialTraitEffect, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      effects: prev.effects.map((effect, i) =>
        i === index ? { ...effect, [field]: value } : effect
      )
    }));
  }, []);

  // Prerequisite handlers
  const handlePrereqLevelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
    setFormData(prev => ({
      ...prev,
      prerequisites: { ...prev.prerequisites, level: value }
    }));
  }, []);

  const handlePrereqSubraceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim() || undefined;
    setFormData(prev => ({
      ...prev,
      prerequisites: { ...prev.prerequisites, subrace: value }
    }));
  }, []);

  const handlePrereqAbilityChange = useCallback((ability: Ability, value: string) => {
    const numValue = value ? parseInt(value, 10) : undefined;
    setFormData(prev => {
      const abilities = { ...prev.prerequisites.abilities };
      if (numValue === undefined) {
        delete abilities[ability];
      } else {
        abilities[ability] = numValue;
      }
      return {
        ...prev,
        prerequisites: { ...prev.prerequisites, abilities }
      };
    });
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
    return 'Create Racial Trait';
  };

  // Check if form is valid enough to submit
  const canSubmit = formData.name.trim() && formData.id.trim() && formData.race && formData.description.trim();

  return (
    <div className="racial-trait-creator-form" onKeyDown={handleKeyDown}>
      {/* Basic Info Section */}
      <div className="racial-trait-section" role="group" aria-labelledby="trait-basic-section-title">
        <h4 className="racial-trait-section-title" id="trait-basic-section-title">
          <Feather size={16} aria-hidden="true" />
          Basic Info
        </h4>

        <div className="racial-trait-field">
          <label className="racial-trait-label" htmlFor="trait-name">
            Name <span className="racial-trait-required">*</span>
          </label>
          <input
            id="trait-name"
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            placeholder="e.g., Darkvision"
            className="racial-trait-input"
            disabled={disabled}
            maxLength={100}
            aria-describedby="trait-name-hint"
          />
          <span className="racial-trait-hint" id="trait-name-hint">
            {100 - formData.name.length} characters remaining
          </span>
        </div>

        <div className="racial-trait-field">
          <label className="racial-trait-label" htmlFor="trait-id">
            ID <span className="racial-trait-required">*</span>
          </label>
          <div className="racial-trait-id-row">
            <input
              id="trait-id"
              type="text"
              value={formData.id}
              onChange={handleIdChange}
              placeholder="e.g., darkvision"
              className="racial-trait-input"
              disabled={disabled}
              maxLength={50}
              aria-describedby="trait-id-hint"
            />
            <label className="racial-trait-checkbox-label">
              <input
                type="checkbox"
                checked={autoGenerateId}
                onChange={(e) => setAutoGenerateId(e.target.checked)}
                disabled={disabled}
              />
              Auto
            </label>
          </div>
          <span className="racial-trait-hint" id="trait-id-hint">
            Unique identifier (lowercase_with_underscores)
          </span>
        </div>

        <div className="racial-trait-row">
          <div className="racial-trait-field">
            <label className="racial-trait-label" htmlFor="trait-race">
              Race <span className="racial-trait-required">*</span>
            </label>
            <select
              id="trait-race"
              value={formData.race}
              onChange={handleRaceChange}
              className="racial-trait-select"
              disabled={disabled || isRaceSpecific}
              aria-describedby={isRaceSpecific ? 'trait-race-locked-hint' : undefined}
            >
              <option value="">Select a race...</option>
              {racesList.map(raceName => (
                <option key={raceName} value={raceName}>
                  {raceName}
                </option>
              ))}
            </select>
            {isRaceSpecific && (
              <span className="racial-trait-hint racial-trait-locked-hint">
                Locked to {lockedRace} (race-specific category)
              </span>
            )}
          </div>

          <div className="racial-trait-field">
            <label className="racial-trait-label" htmlFor="trait-subrace">
              Subrace <span className="racial-trait-optional">(Optional)</span>
            </label>
            <input
              id="trait-subrace"
              type="text"
              value={formData.subrace}
              onChange={handleSubraceChange}
              placeholder="e.g., High Elf, Hill Dwarf"
              className="racial-trait-input"
              disabled={disabled}
              maxLength={50}
            />
            <span className="racial-trait-hint">
              Leave empty for base race trait
            </span>
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div className="racial-trait-section" role="group" aria-labelledby="trait-desc-section-title">
        <h4 className="racial-trait-section-title" id="trait-desc-section-title">
          <FileText size={16} aria-hidden="true" />
          Description <span className="racial-trait-required">*</span>
        </h4>

        <div className="racial-trait-field">
          <textarea
            id="trait-description"
            value={formData.description}
            onChange={handleDescriptionChange}
            placeholder="Describe the trait's effect in detail..."
            className="racial-trait-textarea"
            disabled={disabled}
            maxLength={2000}
            rows={5}
            aria-describedby="trait-description-hint"
          />
          <span className="racial-trait-hint" id="trait-description-hint">
            {2000 - formData.description.length} characters remaining
          </span>
        </div>
      </div>

      {/* Advanced Section (Effects & Prerequisites) */}
      <div className="racial-trait-advanced-toggle">
        <button
          type="button"
          className="racial-trait-advanced-btn"
          onClick={() => setShowAdvanced(!showAdvanced)}
          disabled={disabled}
          aria-expanded={showAdvanced}
          aria-controls="racial-trait-advanced-section"
        >
          {showAdvanced ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          Advanced Options (Effects & Prerequisites)
        </button>
      </div>

      {showAdvanced && (
        <div className="racial-trait-advanced-section" id="racial-trait-advanced-section">
          {/* Effects Section */}
          <div className="racial-trait-section">
            <h4 className="racial-trait-section-title">
              <Zap size={16} />
              Effects <span className="racial-trait-optional">(Optional)</span>
            </h4>

            <span className="racial-trait-hint">
              Add structured effects for programmatic handling.
            </span>

            {formData.effects.length > 0 && (
              <div className="racial-trait-effects-list">
                {formData.effects.map((effect, index) => (
                  <div key={index} className="racial-trait-effect-item">
                    <div className="racial-trait-effect-header">
                      <span className="racial-trait-effect-number">Effect {index + 1}</span>
                      <button
                        type="button"
                        className="racial-trait-effect-remove"
                        onClick={() => handleRemoveEffect(index)}
                        disabled={disabled}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="racial-trait-effect-fields">
                      <div className="racial-trait-field">
                        <label className="racial-trait-label">Type</label>
                        <input
                          type="text"
                          value={effect.type}
                          onChange={(e) => handleEffectChange(index, 'type', e.target.value)}
                          placeholder="e.g., stat_bonus, ability_unlock"
                          className="racial-trait-input"
                          disabled={disabled}
                        />
                      </div>
                      <div className="racial-trait-field">
                        <label className="racial-trait-label">Target</label>
                        <input
                          type="text"
                          value={effect.target}
                          onChange={(e) => handleEffectChange(index, 'target', e.target.value)}
                          placeholder="e.g., speed, darkvision, languages"
                          className="racial-trait-input"
                          disabled={disabled}
                        />
                      </div>
                      <div className="racial-trait-field">
                        <label className="racial-trait-label">Value</label>
                        <input
                          type="text"
                          value={effect.value ?? ''}
                          onChange={(e) => handleEffectChange(index, 'value', e.target.value)}
                          placeholder="e.g., +2, 60ft, advantage"
                          className="racial-trait-input"
                          disabled={disabled}
                        />
                      </div>
                      <div className="racial-trait-field">
                        <label className="racial-trait-label">Condition</label>
                        <input
                          type="text"
                          value={effect.condition ?? ''}
                          onChange={(e) => handleEffectChange(index, 'condition', e.target.value)}
                          placeholder="e.g., when in dim light"
                          className="racial-trait-input"
                          disabled={disabled}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddEffect}
              disabled={disabled}
              leftIcon={Plus}
            >
              Add Effect
            </Button>
          </div>

          {/* Prerequisites Section */}
          <div className="racial-trait-section">
            <h4 className="racial-trait-section-title">
              <Target size={16} />
              Prerequisites <span className="racial-trait-optional">(Optional)</span>
            </h4>

            <span className="racial-trait-hint">
              Set requirements that must be met to gain this trait.
            </span>

            <div className="racial-trait-row">
              <div className="racial-trait-field">
                <label className="racial-trait-label">Minimum Level</label>
                <select
                  value={formData.prerequisites.level ?? ''}
                  onChange={handlePrereqLevelChange}
                  className="racial-trait-select"
                  disabled={disabled}
                >
                  <option value="">None</option>
                  {Array.from({ length: 19 }, (_, i) => i + 2).map(level => (
                    <option key={level} value={level}>
                      Level {level}
                    </option>
                  ))}
                </select>
              </div>

              <div className="racial-trait-field">
                <label className="racial-trait-label">Required Subrace</label>
                <input
                  type="text"
                  value={formData.prerequisites.subrace ?? ''}
                  onChange={handlePrereqSubraceChange}
                  placeholder="e.g., High Elf, Drow"
                  className="racial-trait-input"
                  disabled={disabled}
                  maxLength={50}
                />
              </div>
            </div>

            <div className="racial-trait-field">
              <label className="racial-trait-label">Ability Requirements</label>
              <div className="racial-trait-abilities-grid">
                {VALID_ABILITIES.map(ability => (
                  <div key={ability} className="racial-trait-ability-input">
                    <label>{ability}</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={formData.prerequisites.abilities?.[ability] ?? ''}
                      onChange={(e) => handlePrereqAbilityChange(ability, e.target.value)}
                      placeholder="-"
                      disabled={disabled}
                    />
                  </div>
                ))}
              </div>
              <span className="racial-trait-hint">
                Minimum ability scores required (leave empty for no requirement)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {(formErrors.length > 0 || lastError) && (
        <div className="racial-trait-errors" role="alert" aria-live="assertive">
          {formErrors.map((error, index) => (
            <div key={index} className="racial-trait-error">
              <AlertCircle size={14} aria-hidden="true" />
              <span>{error}</span>
            </div>
          ))}
          {lastError && !formErrors.includes(lastError) && (
            <div className="racial-trait-error">
              <AlertCircle size={14} aria-hidden="true" />
              <span>{lastError}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="racial-trait-actions">
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
        <div className="racial-trait-preview" role="status" aria-live="polite" aria-label="Racial trait preview">
          <h4 className="racial-trait-preview-title">
            <Sparkles size={16} aria-hidden="true" />
            Preview
          </h4>
          <div className="racial-trait-preview-content">
            <div className="racial-trait-preview-header">
              <span className="racial-trait-preview-name">
                {formData.name}
              </span>
              <div className="racial-trait-preview-badges">
                <span className="racial-trait-preview-badge racial-trait-preview-badge-race">
                  {formData.race || 'No Race'}
                </span>
                {formData.subrace && (
                  <span className="racial-trait-preview-badge racial-trait-preview-badge-subrace">
                    {formData.subrace}
                  </span>
                )}
              </div>
            </div>
            <div className="racial-trait-preview-stats">
              <span className="racial-trait-preview-stat">
                <strong>ID:</strong> {formData.id || '—'}
              </span>
            </div>
            {formData.description && (
              <p className="racial-trait-preview-description">
                {formData.description}
              </p>
            )}
            {formData.effects.length > 0 && (
              <div className="racial-trait-preview-effects">
                <span className="racial-trait-preview-effects-label">Effects:</span>
                {formData.effects.filter(e => e.type && e.target).map((effect, i) => (
                  <span key={i} className="racial-trait-preview-effect">
                    {effect.type} → {effect.target}
                    {effect.value ? ` (${effect.value})` : ''}
                  </span>
                ))}
              </div>
            )}
            {(formData.prerequisites.level || formData.prerequisites.subrace || formData.prerequisites.abilities) && (
              <div className="racial-trait-preview-prereqs">
                <span className="racial-trait-preview-prereqs-label">Prerequisites:</span>
                {formData.prerequisites.level && (
                  <span className="racial-trait-preview-prereq">Level {formData.prerequisites.level}</span>
                )}
                {formData.prerequisites.subrace && (
                  <span className="racial-trait-preview-prereq">{formData.prerequisites.subrace}</span>
                )}
                {formData.prerequisites.abilities && Object.entries(formData.prerequisites.abilities).map(([ability, value]) => (
                  <span key={ability} className="racial-trait-preview-prereq">
                    {ability} {value}
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

export default RacialTraitCreatorForm;

// Export types and utilities
export { STANDARD_RACES, VALID_ABILITIES, generateIdFromName };
