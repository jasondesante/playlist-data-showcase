/**
 * ClassFeatureCreatorForm Component
 *
 * A form component for creating and adding custom class features.
 * Part of DataViewerTab Custom Content Creation Upgrade - Phase 5.4.
 *
 * Features:
 * - ID field (auto-generated from name, or manual)
 * - Name field (required)
 * - Class selector (from existing classes + custom)
 * - Level selector (1-20)
 * - Type selector (passive/active/reaction)
 * - Description textarea
 * - Effects builder (shared EffectsBuilder component)
 * - Prerequisites section (shared PrerequisitesBuilder component)
 * - Live validation with error display
 *
 * @see docs/plans/DATAVIEWER_IMPROVEMENTS_PLAN.md for implementation details
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
  ImageIcon
} from 'lucide-react';
import { ImageFieldInput } from '@/components/shared/ImageFieldInput';
import { EffectsBuilder, type Effect } from '@/components/shared/EffectsBuilder';
import { PrerequisitesBuilder, type Prerequisites } from '@/components/shared/PrerequisitesBuilder';
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
 * Effect structure for class features - re-export from EffectsBuilder for backwards compatibility
 */
export type ClassFeatureEffect = Effect;

/**
 * Prerequisites structure for class features - re-export from PrerequisitesBuilder for backwards compatibility
 */
export type ClassFeaturePrerequisites = Prerequisites;

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
  effects: Effect[];
  prerequisites: Prerequisites;
  icon?: string;
  image?: string;
}

/**
 * Props for ClassFeatureCreatorForm component
 */
export interface ClassFeatureCreatorFormProps {
  /** Initial form data (for editing) */
  initialData?: Partial<ClassFeatureFormData>;
  /** Whether the form is in edit mode (updating existing feature) */
  isEditMode?: boolean;
  /** Original feature ID being edited (used for update operation) */
  originalId?: string;
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
    prerequisites: {},
    icon: '',
    image: ''
  };
}

/**
 * ClassFeatureCreatorForm Component
 *
 * A form for creating custom class features for character generation.
 */
export function ClassFeatureCreatorForm({
  initialData,
  isEditMode = false,
  originalId,
  onCreate,
  onCancel,
  disabled = false,
  submitButtonText,
  contentType = 'classFeatures',
  availableClasses
}: ClassFeatureCreatorFormProps) {
  const { createContent, updateContent, isLoading, lastError, clearError } = useContentCreator();

  // Form state
  // Filter out undefined values from initialData to prevent them from overriding defaults
  const [formData, setFormData] = useState<ClassFeatureFormData>(() => {
    const defaults = getDefaultFormData();
    if (!initialData) return defaults;

    // Only spread defined values to avoid overriding defaults with undefined
    const definedInitialData = Object.fromEntries(
      Object.entries(initialData).filter(([_, v]) => v !== undefined)
    );
    return { ...defaults, ...definedInitialData };
  });
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
        description: formData.description,
        source: 'custom'
      };

      // Add effects if any
      if (formData.effects.length > 0) {
        featureItem.effects = formData.effects.filter(e => e.type && e.target);
      }

      // Add prerequisites if any (support all types from PrerequisitesBuilder)
      const hasPrereqs = formData.prerequisites.level !== undefined ||
        formData.prerequisites.subrace ||
        formData.prerequisites.abilities ||
        formData.prerequisites.class ||
        formData.prerequisites.race ||
        (formData.prerequisites.features && formData.prerequisites.features.length > 0) ||
        (formData.prerequisites.skills && formData.prerequisites.skills.length > 0) ||
        (formData.prerequisites.spells && formData.prerequisites.spells.length > 0) ||
        formData.prerequisites.custom;

      if (hasPrereqs) {
        featureItem.prerequisites = {};
        const prereqs = featureItem.prerequisites as Record<string, unknown>;

        if (formData.prerequisites.level !== undefined) {
          prereqs.level = formData.prerequisites.level;
        }
        if (formData.prerequisites.subrace) {
          prereqs.subrace = formData.prerequisites.subrace;
        }
        if (formData.prerequisites.abilities && Object.keys(formData.prerequisites.abilities).length > 0) {
          prereqs.abilities = formData.prerequisites.abilities;
        }
        if (formData.prerequisites.class) {
          prereqs.class = formData.prerequisites.class;
        }
        if (formData.prerequisites.race) {
          prereqs.race = formData.prerequisites.race;
        }
        if (formData.prerequisites.features && formData.prerequisites.features.length > 0) {
          prereqs.features = formData.prerequisites.features;
        }
        if (formData.prerequisites.skills && formData.prerequisites.skills.length > 0) {
          prereqs.skills = formData.prerequisites.skills;
        }
        if (formData.prerequisites.spells && formData.prerequisites.spells.length > 0) {
          prereqs.spells = formData.prerequisites.spells;
        }
        if (formData.prerequisites.custom) {
          prereqs.custom = formData.prerequisites.custom;
        }
      }

      // Add icon if specified
      if (formData.icon?.trim()) {
        featureItem.icon = formData.icon.trim();
      }

      // Add image if specified
      if (formData.image?.trim()) {
        featureItem.image = formData.image.trim();
      }

      // Determine the actual content type
      const actualContentType = contentType.startsWith('classFeatures.') ? 'classFeatures' : contentType;

      if (isEditMode && originalId) {
        // Update existing class feature
        const result = updateContent(
          actualContentType,
          originalId,
          featureItem
        );

        if (result.success) {
          // Reset form on success
          setFormData(getDefaultFormData());
          setFormErrors([]);
          onCreate?.(formData);
        } else if (result.error) {
          setFormErrors([result.error]);
        }
      } else {
        // Create new class feature
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
      }
    } catch (error) {
      setFormErrors([error instanceof Error ? error.message : 'An error occurred']);
    } finally {
      setIsSubmitting(false);
    }
  }, [clearError, validate, formData, contentType, createContent, updateContent, onCreate, isEditMode, originalId]);

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

  // Effects change handler - delegates to EffectsBuilder
  const handleEffectsChange = useCallback((effects: Effect[]) => {
    setFormData(prev => ({ ...prev, effects }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  // Prerequisites change handler - delegates to PrerequisitesBuilder
  const handlePrerequisitesChange = useCallback((prerequisites: Prerequisites) => {
    setFormData(prev => ({ ...prev, prerequisites }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  // Icon change handler
  const handleIconChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, icon: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  // Image change handler
  const handleImageChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, image: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

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
      <div className="class-feature-section" role="group" aria-labelledby="feature-basic-section-title">
        <h4 className="class-feature-section-title" id="feature-basic-section-title">
          <Shield size={16} aria-hidden="true" />
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
            aria-describedby="feature-name-hint"
          />
          <span className="class-feature-hint" id="feature-name-hint">
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
              aria-describedby="feature-id-hint"
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
          <span className="class-feature-hint" id="feature-id-hint">
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
              aria-describedby={isClassSpecific ? 'feature-class-locked-hint' : undefined}
            >
              <option value="">Select a class...</option>
              {classesList.map(className => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
            {isClassSpecific && (
              <span className="class-feature-hint class-feature-locked-hint" id="feature-class-locked-hint">
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
              aria-describedby="feature-type-hint"
            >
              {VALID_FEATURE_TYPES.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            <span className="class-feature-hint" id="feature-type-hint">
              {FEATURE_TYPE_CONFIG[formData.type]?.description}
            </span>
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div className="class-feature-section" role="group" aria-labelledby="feature-desc-section-title">
        <h4 className="class-feature-section-title" id="feature-desc-section-title">
          <FileText size={16} aria-hidden="true" />
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
            aria-describedby="feature-description-hint"
          />
          <span className="class-feature-hint" id="feature-description-hint">
            {2000 - formData.description.length} characters remaining
          </span>
        </div>
      </div>

      {/* Images Section */}
      <div className="class-feature-section class-feature-images-section" role="group" aria-labelledby="feature-images-section-title">
        <h4 className="class-feature-section-title" id="feature-images-section-title">
          <ImageIcon size={16} aria-hidden="true" />
          Images <span className="class-feature-optional">(optional)</span>
        </h4>
        <div className="class-feature-images-grid">
          <div className="class-feature-field">
            <ImageFieldInput
              value={formData.icon || ''}
              onChange={handleIconChange}
              label="Feature Icon"
              placeholder="e.g., assets/icons/second_wind.png"
              fieldType="icon"
              previewSize="sm"
              disabled={disabled}
            />
          </div>
          <div className="class-feature-field">
            <ImageFieldInput
              value={formData.image || ''}
              onChange={handleImageChange}
              label="Feature Image"
              placeholder="e.g., assets/features/second_wind.png"
              fieldType="image"
              previewSize="md"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Advanced Section (Effects & Prerequisites) */}
      <div className="class-feature-advanced-toggle">
        <button
          type="button"
          className="class-feature-advanced-btn"
          onClick={() => setShowAdvanced(!showAdvanced)}
          disabled={disabled}
          aria-expanded={showAdvanced}
          aria-controls="class-feature-advanced-section"
        >
          {showAdvanced ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          Advanced Options (Effects & Prerequisites)
        </button>
      </div>

      {showAdvanced && (
        <div className="class-feature-advanced-section" id="class-feature-advanced-section">
          {/* Effects Section - Using shared EffectsBuilder */}
          <EffectsBuilder
            value={formData.effects}
            onChange={handleEffectsChange}
            disabled={disabled}
            showHints={true}
          />

          {/* Prerequisites Section - Using shared PrerequisitesBuilder */}
          <PrerequisitesBuilder
            value={formData.prerequisites}
            onChange={handlePrerequisitesChange}
            disabled={disabled}
            showHints={true}
          />
        </div>
      )}

      {/* Validation Errors */}
      {(formErrors.length > 0 || lastError) && (
        <div className="class-feature-errors" role="alert" aria-live="assertive">
          {formErrors.map((error, index) => (
            <div key={index} className="class-feature-error">
              <AlertCircle size={14} aria-hidden="true" />
              <span>{error}</span>
            </div>
          ))}
          {lastError && !formErrors.includes(lastError) && (
            <div className="class-feature-error">
              <AlertCircle size={14} aria-hidden="true" />
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
            {/* Show image if set */}
            {formData.image && (
              <div className="class-feature-preview-image">
                <img
                  src={formData.image}
                  alt={formData.name}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="class-feature-preview-header">
              <div className="class-feature-preview-name-row">
                {formData.icon && (
                  <img
                    src={formData.icon}
                    alt=""
                    className="class-feature-preview-icon"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                )}
                <span className="class-feature-preview-name" style={{ color: typeColor }}>
                  {formData.name}
                </span>
              </div>
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
            {(formData.prerequisites.level || formData.prerequisites.subrace || formData.prerequisites.abilities ||
              formData.prerequisites.class || formData.prerequisites.race ||
              (formData.prerequisites.features && formData.prerequisites.features.length > 0) ||
              (formData.prerequisites.skills && formData.prerequisites.skills.length > 0) ||
              (formData.prerequisites.spells && formData.prerequisites.spells.length > 0) ||
              formData.prerequisites.custom) && (
              <div className="class-feature-preview-prereqs">
                <span className="class-feature-preview-prereqs-label">Prerequisites:</span>
                {formData.prerequisites.level && (
                  <span className="class-feature-preview-prereq">Level {formData.prerequisites.level}</span>
                )}
                {formData.prerequisites.class && (
                  <span className="class-feature-preview-prereq">{formData.prerequisites.class}</span>
                )}
                {formData.prerequisites.race && (
                  <span className="class-feature-preview-prereq">{formData.prerequisites.race}</span>
                )}
                {formData.prerequisites.subrace && (
                  <span className="class-feature-preview-prereq">{formData.prerequisites.subrace}</span>
                )}
                {formData.prerequisites.abilities && Object.entries(formData.prerequisites.abilities).map(([ability, value]) => (
                  <span key={ability} className="class-feature-preview-prereq">
                    {ability} {value}
                  </span>
                ))}
                {formData.prerequisites.features && formData.prerequisites.features.map((feature, i) => (
                  <span key={`feature-${i}`} className="class-feature-preview-prereq">
                    {feature}
                  </span>
                ))}
                {formData.prerequisites.skills && formData.prerequisites.skills.map((skill, i) => (
                  <span key={`skill-${i}`} className="class-feature-preview-prereq">
                    {skill}
                  </span>
                ))}
                {formData.prerequisites.spells && formData.prerequisites.spells.map((spell, i) => (
                  <span key={`spell-${i}`} className="class-feature-preview-prereq">
                    {spell}
                  </span>
                ))}
                {formData.prerequisites.custom && (
                  <span className="class-feature-preview-prereq">{formData.prerequisites.custom}</span>
                )}
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
// Re-export types from shared components for backwards compatibility
export type { Effect } from '@/components/shared/EffectsBuilder';
export type { Prerequisites } from '@/components/shared/PrerequisitesBuilder';
