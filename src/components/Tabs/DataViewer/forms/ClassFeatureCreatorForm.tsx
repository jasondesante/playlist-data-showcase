/**
 * ClassFeatureCreatorForm Component
 *
 * A form component for creating and adding custom class features.
 * Part of DataViewerTab Custom Content Creation Upgrade - Phase 5.2.
 *
 * Features:
 * - ID field (auto-generated from name, or manual)
 * - Name field (required)
 * - Class selector (from existing classes + custom)
 * - Level selector (1-20)
 * - Type selector (passive/active/reaction)
 * - Description textarea
 * - Effects builder (expandable advanced section)
 * - Prerequisites section (optional)
 * - Live validation with error display
 *
 * @see docs/plans/DATAVIEWER_CUSTOM_CONTENT_PLAN.md for implementation details
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Shield,
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
import './ClassFeatureCreatorForm.css';

/**
 * Valid feature types
 */
const VALID_FEATURE_TYPES = ['passive', 'active', 'reaction'] as const;
type FeatureType = typeof VALID_FEATURE_TYPES[number];

/**
 * Feature type display configuration
 */
const FEATURE_TYPE_CONFIG: Record<FeatureType, { description: string; color: string }> = {
  'passive': { description: 'Always active', color: 'hsl(120 60% 40%)' },
  'active': { description: 'Requires an action', color: 'hsl(210 80% 50%)' },
  'reaction': { description: 'Triggered response', color: 'hsl(30 90% 50%)' }
};

/**
 * Standard D&D 5e classes
 */
const STANDARD_CLASSES = [
  'Barbarian',
  'Bard',
  'Cleric',
  'Druid',
  'Fighter',
  'Monk',
  'Paladin',
  'Ranger',
  'Rogue',
  'Sorcerer',
  'Warlock',
  'Wizard'
] as const;

/**
 * Valid ability scores
 */
const VALID_ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;
type Ability = typeof VALID_ABILITIES[number];

/**
 * Effect structure for class features
 */
export interface FeatureEffect {
  type: string;
  target: string;
  value?: string | number;
  condition?: string;
}

/**
 * Prerequisites structure
 */
export interface FeaturePrerequisites {
  level?: number;
  abilities?: Partial<Record<Ability, number>>;
}

/**
 * Class feature form data structure
 */
export interface ClassFeatureFormData {
  id: string;
  name: string;
  class: string;
  level: number;
  type: FeatureType;
  description: string;
  effects: FeatureEffect[];
  prerequisites: FeaturePrerequisites;
}

/**
 * Props for ClassFeatureCreatorForm component
 */
export interface ClassFeatureCreatorFormProps {
  /** Initial form data (for editing) */
  initialData?: Partial<ClassFeatureFormData>;
  /** Callback when feature is created */
  onCreate?: (feature: ClassFeatureFormData) => void;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Custom submit button text */
  submitButtonText?: string;
  /** Content type override (for class-specific features) */
  contentType?: ContentType;
  /** Custom class list (if different from standard) */
  availableClasses?: string[];
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
function getDefaultFormData(): ClassFeatureFormData {
  return {
    id: '',
    name: '',
    class: '',
    level: 1,
    type: 'passive',
    description: '',
    effects: [],
    prerequisites: {}
  };
}

/**
 * Get default effect
 */
function getDefaultEffect(): FeatureEffect {
  return {
    type: '',
    target: '',
    value: undefined,
    condition: ''
  };
}

/**
 * ClassFeatureCreatorForm Component
 *
 * A form for creating custom class features for character generation.
 */
export function ClassFeatureCreatorForm({
  initialData,
  onCreate,
  onCancel,
  disabled = false,
  submitButtonText,
  contentType = 'classFeatures',
  availableClasses
}: ClassFeatureCreatorFormProps) {
  const { createContent, isLoading, lastError, clearError } = useContentCreator();

  // Form state
  const [formData, setFormData] = useState<ClassFeatureFormData>(() => ({
    ...getDefaultFormData(),
    ...initialData
  }));
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoGenerateId, setAutoGenerateId] = useState(!initialData?.id);

  // Determine if this is a class-specific content type (e.g., 'classFeatures.Fighter')
  const classSpecificMatch = contentType.match(/^classFeatures\.(.+)$/);
  const isClassSpecific = !!classSpecificMatch;
  const lockedClass = classSpecificMatch ? classSpecificMatch[1] : null;

  // Get classes list
  const classesList = useMemo(() => {
    const baseClasses = availableClasses || [...STANDARD_CLASSES];
    // Could also fetch custom classes from ExtensionManager here
    return baseClasses;
  }, [availableClasses]);

  // Lock class selection if content type is class-specific
  useEffect(() => {
    if (lockedClass && formData.class !== lockedClass) {
      setFormData(prev => ({
        ...prev,
        class: lockedClass
      }));
    }
  }, [lockedClass, formData.class]);

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
      errors.push('Feature ID is required');
    } else if (!/^[a-z][a-z0-9_]*$/.test(formData.id)) {
      errors.push('ID must use lowercase_with_underscores format (e.g., "second_wind")');
    }

    if (!formData.name.trim()) {
      errors.push('Feature name is required');
    }

    if (!formData.class.trim()) {
      errors.push('Class selection is required');
    }

    if (formData.level < 1 || formData.level > 20) {
      errors.push('Level must be between 1 and 20');
    }

    if (!VALID_FEATURE_TYPES.includes(formData.type)) {
      errors.push(`Type must be one of: ${VALID_FEATURE_TYPES.join(', ')}`);
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
      // Build feature object
      const featureItem: Record<string, unknown> = {
        id: formData.id,
        name: formData.name,
        class: formData.class,
        level: formData.level,
        type: formData.type,
        description: formData.description
      };

      // Add effects if any
      if (formData.effects.length > 0) {
        featureItem.effects = formData.effects.filter(e => e.type && e.target);
      }

      // Add prerequisites if any
      if (formData.prerequisites.level !== undefined || formData.prerequisites.abilities) {
        featureItem.prerequisites = {};
        if (formData.prerequisites.level !== undefined) {
          featureItem.prerequisites = { level: formData.prerequisites.level };
        }
        if (formData.prerequisites.abilities && Object.keys(formData.prerequisites.abilities).length > 0) {
          featureItem.prerequisites = {
            ...featureItem.prerequisites as object,
            abilities: formData.prerequisites.abilities
          };
        }
      }

      // Determine the actual content type
      const actualContentType = contentType.startsWith('classFeatures.') ? 'classFeatures' : contentType;

      const result = createContent(
        actualContentType,
        featureItem,
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

  const handleClassChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, class: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleLevelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value, 10);
    setFormData(prev => ({ ...prev, level: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as FeatureType;
    setFormData(prev => ({ ...prev, type: value }));
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

  const handleEffectChange = useCallback((index: number, field: keyof FeatureEffect, value: string | number) => {
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
    return 'Create Feature';
  };

  // Check if form is valid enough to submit
  const canSubmit = formData.name.trim() && formData.id.trim() && formData.class && formData.description.trim();

  // Get feature type color for preview
  const typeColor = FEATURE_TYPE_CONFIG[formData.type]?.color || 'var(--color-text-secondary)';

  return (
    <div className="class-feature-creator-form" onKeyDown={handleKeyDown}>
      {/* Basic Info Section */}
      <div className="class-feature-section">
        <h4 className="class-feature-section-title">
          <Shield size={16} />
          Basic Info
        </h4>

        <div className="class-feature-field">
          <label className="class-feature-label" htmlFor="feature-name">
            Name <span className="class-feature-required">*</span>
          </label>
          <input
            id="feature-name"
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            placeholder="e.g., Second Wind"
            className="class-feature-input"
            disabled={disabled}
            maxLength={100}
          />
          <span className="class-feature-hint">
            {100 - formData.name.length} characters remaining
          </span>
        </div>

        <div className="class-feature-field">
          <label className="class-feature-label" htmlFor="feature-id">
            ID <span className="class-feature-required">*</span>
          </label>
          <div className="class-feature-id-row">
            <input
              id="feature-id"
              type="text"
              value={formData.id}
              onChange={handleIdChange}
              placeholder="e.g., second_wind"
              className="class-feature-input"
              disabled={disabled}
              maxLength={50}
            />
            <label className="class-feature-checkbox-label">
              <input
                type="checkbox"
                checked={autoGenerateId}
                onChange={(e) => setAutoGenerateId(e.target.checked)}
                disabled={disabled}
              />
              Auto
            </label>
          </div>
          <span className="class-feature-hint">
            Unique identifier (lowercase_with_underscores)
          </span>
        </div>

        <div className="class-feature-row">
          <div className="class-feature-field">
            <label className="class-feature-label" htmlFor="feature-class">
              Class <span className="class-feature-required">*</span>
            </label>
            <select
              id="feature-class"
              value={formData.class}
              onChange={handleClassChange}
              className="class-feature-select"
              disabled={disabled || isClassSpecific}
            >
              <option value="">Select a class...</option>
              {classesList.map(className => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
            {isClassSpecific && (
              <span className="class-feature-hint class-feature-locked-hint">
                Locked to {lockedClass} (class-specific category)
              </span>
            )}
          </div>

          <div className="class-feature-field">
            <label className="class-feature-label" htmlFor="feature-level">
              Level <span className="class-feature-required">*</span>
            </label>
            <select
              id="feature-level"
              value={formData.level}
              onChange={handleLevelChange}
              className="class-feature-select"
              disabled={disabled}
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map(level => (
                <option key={level} value={level}>
                  Level {level}
                </option>
              ))}
            </select>
          </div>

          <div className="class-feature-field">
            <label className="class-feature-label" htmlFor="feature-type">
              Type <span className="class-feature-required">*</span>
            </label>
            <select
              id="feature-type"
              value={formData.type}
              onChange={handleTypeChange}
              className="class-feature-select"
              disabled={disabled}
            >
              {VALID_FEATURE_TYPES.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            <span className="class-feature-hint">
              {FEATURE_TYPE_CONFIG[formData.type]?.description}
            </span>
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div className="class-feature-section">
        <h4 className="class-feature-section-title">
          <FileText size={16} />
          Description <span className="class-feature-required">*</span>
        </h4>

        <div className="class-feature-field">
          <textarea
            id="feature-description"
            value={formData.description}
            onChange={handleDescriptionChange}
            placeholder="Describe the feature's effect in detail..."
            className="class-feature-textarea"
            disabled={disabled}
            maxLength={2000}
            rows={5}
          />
          <span className="class-feature-hint">
            {2000 - formData.description.length} characters remaining
          </span>
        </div>
      </div>

      {/* Advanced Section (Effects & Prerequisites) */}
      <div className="class-feature-advanced-toggle">
        <button
          type="button"
          className="class-feature-advanced-btn"
          onClick={() => setShowAdvanced(!showAdvanced)}
          disabled={disabled}
        >
          {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Advanced Options (Effects & Prerequisites)
        </button>
      </div>

      {showAdvanced && (
        <div className="class-feature-advanced-section">
          {/* Effects Section */}
          <div className="class-feature-section">
            <h4 className="class-feature-section-title">
              <Zap size={16} />
              Effects <span className="class-feature-optional">(Optional)</span>
            </h4>

            <span className="class-feature-hint">
              Add structured effects for programmatic handling.
            </span>

            {formData.effects.length > 0 && (
              <div className="class-feature-effects-list">
                {formData.effects.map((effect, index) => (
                  <div key={index} className="class-feature-effect-item">
                    <div className="class-feature-effect-header">
                      <span className="class-feature-effect-number">Effect {index + 1}</span>
                      <button
                        type="button"
                        className="class-feature-effect-remove"
                        onClick={() => handleRemoveEffect(index)}
                        disabled={disabled}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="class-feature-effect-fields">
                      <div className="class-feature-field">
                        <label className="class-feature-label">Type</label>
                        <input
                          type="text"
                          value={effect.type}
                          onChange={(e) => handleEffectChange(index, 'type', e.target.value)}
                          placeholder="e.g., stat_bonus, ability_unlock"
                          className="class-feature-input"
                          disabled={disabled}
                        />
                      </div>
                      <div className="class-feature-field">
                        <label className="class-feature-label">Target</label>
                        <input
                          type="text"
                          value={effect.target}
                          onChange={(e) => handleEffectChange(index, 'target', e.target.value)}
                          placeholder="e.g., strength, ac, saving_throws"
                          className="class-feature-input"
                          disabled={disabled}
                        />
                      </div>
                      <div className="class-feature-field">
                        <label className="class-feature-label">Value</label>
                        <input
                          type="text"
                          value={effect.value ?? ''}
                          onChange={(e) => handleEffectChange(index, 'value', e.target.value)}
                          placeholder="e.g., +2, 1d6, advantage"
                          className="class-feature-input"
                          disabled={disabled}
                        />
                      </div>
                      <div className="class-feature-field">
                        <label className="class-feature-label">Condition</label>
                        <input
                          type="text"
                          value={effect.condition ?? ''}
                          onChange={(e) => handleEffectChange(index, 'condition', e.target.value)}
                          placeholder="e.g., when wielding martial weapon"
                          className="class-feature-input"
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
          <div className="class-feature-section">
            <h4 className="class-feature-section-title">
              <Target size={16} />
              Prerequisites <span className="class-feature-optional">(Optional)</span>
            </h4>

            <span className="class-feature-hint">
              Set requirements that must be met to gain this feature.
            </span>

            <div className="class-feature-row">
              <div className="class-feature-field">
                <label className="class-feature-label">Minimum Level</label>
                <select
                  value={formData.prerequisites.level ?? ''}
                  onChange={handlePrereqLevelChange}
                  className="class-feature-select"
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
            </div>

            <div className="class-feature-field">
              <label className="class-feature-label">Ability Requirements</label>
              <div className="class-feature-abilities-grid">
                {VALID_ABILITIES.map(ability => (
                  <div key={ability} className="class-feature-ability-input">
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
              <span className="class-feature-hint">
                Minimum ability scores required (leave empty for no requirement)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {(formErrors.length > 0 || lastError) && (
        <div className="class-feature-errors">
          {formErrors.map((error, index) => (
            <div key={index} className="class-feature-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          ))}
          {lastError && !formErrors.includes(lastError) && (
            <div className="class-feature-error">
              <AlertCircle size={14} />
              <span>{lastError}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="class-feature-actions">
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
        <div className="class-feature-preview">
          <h4 className="class-feature-preview-title">
            <Sparkles size={16} />
            Preview
          </h4>
          <div className="class-feature-preview-content">
            <div className="class-feature-preview-header">
              <span className="class-feature-preview-name" style={{ color: typeColor }}>
                {formData.name}
              </span>
              <div className="class-feature-preview-badges">
                <span className="class-feature-preview-badge" style={{ backgroundColor: typeColor }}>
                  {formData.type}
                </span>
                <span className="class-feature-preview-badge class-feature-preview-badge-secondary">
                  {formData.class || 'No Class'}
                </span>
                <span className="class-feature-preview-badge class-feature-preview-badge-secondary">
                  Lvl {formData.level}
                </span>
              </div>
            </div>
            <div className="class-feature-preview-stats">
              <span className="class-feature-preview-stat">
                <strong>ID:</strong> {formData.id || '—'}
              </span>
            </div>
            {formData.description && (
              <p className="class-feature-preview-description">
                {formData.description}
              </p>
            )}
            {formData.effects.length > 0 && (
              <div className="class-feature-preview-effects">
                <span className="class-feature-preview-effects-label">Effects:</span>
                {formData.effects.filter(e => e.type && e.target).map((effect, i) => (
                  <span key={i} className="class-feature-preview-effect">
                    {effect.type} → {effect.target}
                    {effect.value ? ` (${effect.value})` : ''}
                  </span>
                ))}
              </div>
            )}
            {(formData.prerequisites.level || formData.prerequisites.abilities) && (
              <div className="class-feature-preview-prereqs">
                <span className="class-feature-preview-prereqs-label">Prerequisites:</span>
                {formData.prerequisites.level && (
                  <span className="class-feature-preview-prereq">Level {formData.prerequisites.level}</span>
                )}
                {formData.prerequisites.abilities && Object.entries(formData.prerequisites.abilities).map(([ability, value]) => (
                  <span key={ability} className="class-feature-preview-prereq">
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

export default ClassFeatureCreatorForm;

// Export types and utilities
export { VALID_FEATURE_TYPES, STANDARD_CLASSES, VALID_ABILITIES, FEATURE_TYPE_CONFIG, generateIdFromName };
