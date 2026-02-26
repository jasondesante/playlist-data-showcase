/**
 * SpellCreatorForm Component
 *
 * A form component for creating and adding custom spells.
 * Part of DataViewerTab Custom Content Creation Upgrade - Phase 5.1.
 *
 * Features:
 * - Name field (required)
 * - Level selector (0-9, where 0 = cantrip)
 * - School selector (8 schools of magic)
 * - Casting time (default "1 action")
 * - Range
 * - Components multi-select (V/S/M)
 * - Duration
 * - Description textarea
 * - Class availability multi-select (for all classes or specific classes)
 * - Live validation with error display
 *
 * @see docs/plans/DATAVIEWER_CUSTOM_CONTENT_PLAN.md for implementation details
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Wand2,
  FileText,
  Sparkles,
  Users,
  Plus,
  AlertCircle,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useContentCreator, type ContentType } from '@/hooks/useContentCreator';
import './SpellCreatorForm.css';

/**
 * Valid D&D 5e schools of magic
 */
const VALID_SCHOOLS = [
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation'
] as const;
type SpellSchool = typeof VALID_SCHOOLS[number];

/**
 * School display configuration with descriptions
 */
const SCHOOL_CONFIG: Record<SpellSchool, { description: string; color: string }> = {
  'Abjuration': { description: 'Protective spells, wards, and dispelling', color: 'hsl(210 80% 50%)' },
  'Conjuration': { description: 'Summoning creatures and objects', color: 'hsl(120 60% 40%)' },
  'Divination': { description: 'Revealing information and foresight', color: 'hsl(270 60% 50%)' },
  'Enchantment': { description: 'Influencing minds and emotions', color: 'hsl(300 60% 50%)' },
  'Evocation': { description: 'Creating magical effects and damage', color: 'hsl(0 70% 50%)' },
  'Illusion': { description: 'Creating false sensations', color: 'hsl(180 60% 45%)' },
  'Necromancy': { description: 'Manipulating life and death', color: 'hsl(150 60% 30%)' },
  'Transmutation': { description: 'Changing properties of things', color: 'hsl(30 90% 50%)' }
};

/**
 * Valid spell components
 */
const VALID_COMPONENTS = ['V', 'S', 'M'] as const;
type SpellComponent = typeof VALID_COMPONENTS[number];

/**
 * Component display configuration
 */
const COMPONENT_CONFIG: Record<SpellComponent, { name: string; description: string }> = {
  'V': { name: 'Verbal', description: 'Spoken words' },
  'S': { name: 'Somatic', description: 'Hand gestures' },
  'M': { name: 'Material', description: 'Physical components' }
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
 * Spell form data structure
 */
export interface SpellFormData {
  name: string;
  level: number;
  school: SpellSchool;
  casting_time: string;
  range: string;
  components: SpellComponent[];
  duration: string;
  description: string;
  classes: string[];
}

/**
 * Props for SpellCreatorForm component
 */
export interface SpellCreatorFormProps {
  /** Initial form data (for editing) */
  initialData?: Partial<SpellFormData>;
  /** Callback when spell is created */
  onCreate?: (spell: SpellFormData) => void;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Custom submit button text */
  submitButtonText?: string;
  /** Content type override (for class-specific spells) */
  contentType?: ContentType;
  /** Custom class list (if different from standard) */
  availableClasses?: string[];
}

/**
 * Get default form data
 */
function getDefaultFormData(): SpellFormData {
  return {
    name: '',
    level: 0,
    school: 'Evocation',
    casting_time: '1 action',
    range: '',
    components: ['V', 'S'],
    duration: 'Instantaneous',
    description: '',
    classes: []
  };
}

/**
 * Format level number to ordinal string
 */
function formatLevel(level: number): string {
  if (level === 0) return 'Cantrip';
  if (level === 1) return '1st';
  if (level === 2) return '2nd';
  if (level === 3) return '3rd';
  return `${level}th`;
}

/**
 * SpellCreatorForm Component
 *
 * A form for creating custom spells for character generation.
 */
export function SpellCreatorForm({
  initialData,
  onCreate,
  onCancel,
  disabled = false,
  submitButtonText,
  contentType = 'spells',
  availableClasses
}: SpellCreatorFormProps) {
  const { createContent, isLoading, lastError, clearError } = useContentCreator();

  // Form state
  const [formData, setFormData] = useState<SpellFormData>(() => ({
    ...getDefaultFormData(),
    ...initialData
  }));
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine if this is a class-specific content type (e.g., 'spells.Wizard')
  const classSpecificMatch = contentType.match(/^spells\.(.+)$/);
  const isClassSpecific = !!classSpecificMatch;
  const lockedClass = classSpecificMatch ? classSpecificMatch[1] : null;

  // Get classes list (either provided, or standard D&D classes)
  const classesList = availableClasses || [...STANDARD_CLASSES];

  // Lock class selection if content type is class-specific
  useEffect(() => {
    if (lockedClass && !formData.classes.includes(lockedClass)) {
      setFormData(prev => ({
        ...prev,
        classes: [lockedClass]
      }));
    }
  }, [lockedClass, formData.classes]);

  // Validate form
  const validate = useCallback((): boolean => {
    const errors: string[] = [];

    // Required fields
    if (!formData.name.trim()) {
      errors.push('Spell name is required');
    }

    if (formData.level < 0 || formData.level > 9) {
      errors.push('Spell level must be between 0 (cantrip) and 9');
    }

    if (!VALID_SCHOOLS.includes(formData.school)) {
      errors.push(`School must be one of: ${VALID_SCHOOLS.join(', ')}`);
    }

    if (!formData.casting_time.trim()) {
      errors.push('Casting time is required');
    }

    if (!formData.range.trim()) {
      errors.push('Range is required');
    }

    if (!formData.duration.trim()) {
      errors.push('Duration is required');
    }

    if (!formData.description.trim()) {
      errors.push('Description is required');
    }

    // Validate components
    for (const comp of formData.components) {
      if (!VALID_COMPONENTS.includes(comp)) {
        errors.push(`Invalid component: ${comp}`);
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
      // Build spell object
      const spellItem: Record<string, unknown> = {
        name: formData.name,
        level: formData.level,
        school: formData.school,
        casting_time: formData.casting_time,
        range: formData.range,
        components: formData.components,
        duration: formData.duration,
        description: formData.description
      };

      // Add class availability if specified
      if (formData.classes.length > 0) {
        spellItem.classes = formData.classes;
      }

      // Determine the actual content type
      // If specific classes are selected, we might register to those specific categories
      // But for now, we register to the general 'spells' category and include classes in the data
      const actualContentType = contentType.startsWith('spells.') ? 'spells' : contentType;

      const result = createContent(
        actualContentType,
        spellItem,
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
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, name: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleLevelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value, 10);
    setFormData(prev => ({ ...prev, level: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleSchoolChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as SpellSchool;
    setFormData(prev => ({ ...prev, school: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleCastingTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, casting_time: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleRangeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, range: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleDurationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, duration: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, description: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  // Component toggle handler
  const handleComponentToggle = useCallback((component: SpellComponent) => {
    setFormData(prev => {
      const components = prev.components.includes(component)
        ? prev.components.filter(c => c !== component)
        : [...prev.components, component];
      return { ...prev, components };
    });
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  // Class toggle handler
  const handleClassToggle = useCallback((className: string) => {
    if (isClassSpecific) return; // Can't change classes when class-specific

    setFormData(prev => {
      const classes = prev.classes.includes(className)
        ? prev.classes.filter(c => c !== className)
        : [...prev.classes, className];
      return { ...prev, classes };
    });
    if (formErrors.length > 0) setFormErrors([]);
  }, [isClassSpecific, formErrors]);

  // Select all classes
  const handleSelectAllClasses = useCallback(() => {
    if (isClassSpecific) return;
    setFormData(prev => ({ ...prev, classes: [...classesList] }));
  }, [isClassSpecific, classesList]);

  // Clear all classes
  const handleClearAllClasses = useCallback(() => {
    if (isClassSpecific) return;
    setFormData(prev => ({ ...prev, classes: [] }));
  }, [isClassSpecific]);

  // Cancel handler
  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  // Get button text
  const getButtonText = () => {
    if (submitButtonText) return submitButtonText;
    return 'Create Spell';
  };

  // Check if form is valid enough to submit
  const canSubmit = formData.name.trim() && formData.range.trim() && formData.duration.trim() && formData.description.trim();

  // Get school color for preview
  const schoolColor = SCHOOL_CONFIG[formData.school]?.color || 'var(--color-text-secondary)';

  return (
    <div className="spell-creator-form">
      {/* Basic Info Section */}
      <div className="spell-creator-section">
        <h4 className="spell-creator-section-title">
          <Wand2 size={16} />
          Basic Info
        </h4>

        <div className="spell-creator-field">
          <label className="spell-creator-label" htmlFor="spell-name">
            Name <span className="spell-creator-required">*</span>
          </label>
          <input
            id="spell-name"
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            placeholder="e.g., Fireball"
            className="spell-creator-input"
            disabled={disabled}
            maxLength={100}
          />
          <span className="spell-creator-hint">
            {100 - formData.name.length} characters remaining
          </span>
        </div>

        <div className="spell-creator-row">
          <div className="spell-creator-field">
            <label className="spell-creator-label" htmlFor="spell-level">
              Level <span className="spell-creator-required">*</span>
            </label>
            <select
              id="spell-level"
              value={formData.level}
              onChange={handleLevelChange}
              className="spell-creator-select"
              disabled={disabled}
            >
              <option value={0}>Cantrip (0)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
                <option key={level} value={level}>
                  {formatLevel(level)} Level ({level})
                </option>
              ))}
            </select>
          </div>

          <div className="spell-creator-field">
            <label className="spell-creator-label" htmlFor="spell-school">
              School <span className="spell-creator-required">*</span>
            </label>
            <select
              id="spell-school"
              value={formData.school}
              onChange={handleSchoolChange}
              className="spell-creator-select"
              disabled={disabled}
            >
              {VALID_SCHOOLS.map(school => (
                <option key={school} value={school}>
                  {school}
                </option>
              ))}
            </select>
            <span className="spell-creator-hint">
              {SCHOOL_CONFIG[formData.school]?.description}
            </span>
          </div>
        </div>
      </div>

      {/* Casting Details Section */}
      <div className="spell-creator-section">
        <h4 className="spell-creator-section-title">
          <Target size={16} />
          Casting Details
        </h4>

        <div className="spell-creator-row">
          <div className="spell-creator-field">
            <label className="spell-creator-label" htmlFor="spell-casting-time">
              Casting Time <span className="spell-creator-required">*</span>
            </label>
            <input
              id="spell-casting-time"
              type="text"
              value={formData.casting_time}
              onChange={handleCastingTimeChange}
              placeholder="e.g., 1 action, 1 bonus action, 1 minute"
              className="spell-creator-input"
              disabled={disabled}
              maxLength={50}
            />
          </div>

          <div className="spell-creator-field">
            <label className="spell-creator-label" htmlFor="spell-range">
              Range <span className="spell-creator-required">*</span>
            </label>
            <input
              id="spell-range"
              type="text"
              value={formData.range}
              onChange={handleRangeChange}
              placeholder="e.g., 120 feet, Touch, Self"
              className="spell-creator-input"
              disabled={disabled}
              maxLength={50}
            />
          </div>
        </div>

        <div className="spell-creator-row">
          <div className="spell-creator-field">
            <label className="spell-creator-label" htmlFor="spell-duration">
              Duration <span className="spell-creator-required">*</span>
            </label>
            <input
              id="spell-duration"
              type="text"
              value={formData.duration}
              onChange={handleDurationChange}
              placeholder="e.g., Instantaneous, 1 minute, 1 hour"
              className="spell-creator-input"
              disabled={disabled}
              maxLength={50}
            />
          </div>
        </div>

        {/* Components Section */}
        <div className="spell-creator-field">
          <label className="spell-creator-label">
            Components <span className="spell-creator-optional">(Select all that apply)</span>
          </label>
          <div className="spell-creator-components">
            {VALID_COMPONENTS.map(component => {
              const isSelected = formData.components.includes(component);
              const config = COMPONENT_CONFIG[component];
              return (
                <button
                  key={component}
                  type="button"
                  className={`spell-creator-component-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleComponentToggle(component)}
                  disabled={disabled}
                >
                  <span className="spell-creator-component-letter">{component}</span>
                  <span className="spell-creator-component-name">{config.name}</span>
                  <span className="spell-creator-component-desc">{config.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div className="spell-creator-section">
        <h4 className="spell-creator-section-title">
          <FileText size={16} />
          Description <span className="spell-creator-required">*</span>
        </h4>

        <div className="spell-creator-field">
          <textarea
            id="spell-description"
            value={formData.description}
            onChange={handleDescriptionChange}
            placeholder="Describe the spell's effect in detail..."
            className="spell-creator-textarea"
            disabled={disabled}
            maxLength={2000}
            rows={5}
          />
          <span className="spell-creator-hint">
            {2000 - formData.description.length} characters remaining
          </span>
        </div>
      </div>

      {/* Class Availability Section */}
      <div className="spell-creator-section">
        <h4 className="spell-creator-section-title">
          <Users size={16} />
          Class Availability <span className="spell-creator-optional">(Optional)</span>
        </h4>

        {isClassSpecific ? (
          <div className="spell-creator-class-locked">
            <span className="spell-creator-hint">
              This spell is locked to the <strong>{lockedClass}</strong> class (class-specific category)
            </span>
          </div>
        ) : (
          <>
            <div className="spell-creator-class-actions">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllClasses}
                disabled={disabled}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllClasses}
                disabled={disabled}
              >
                Clear All
              </Button>
            </div>

            <div className="spell-creator-classes-grid">
              {classesList.map(className => {
                const isSelected = formData.classes.includes(className);
                return (
                  <button
                    key={className}
                    type="button"
                    className={`spell-creator-class-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleClassToggle(className)}
                    disabled={disabled}
                  >
                    {className}
                  </button>
                );
              })}
            </div>

            <span className="spell-creator-hint">
              {formData.classes.length === 0
                ? 'No classes selected - spell will be available to all spellcasting classes'
                : `${formData.classes.length} class${formData.classes.length === 1 ? '' : 'es'} selected`}
            </span>
          </>
        )}
      </div>

      {/* Validation Errors */}
      {(formErrors.length > 0 || lastError) && (
        <div className="spell-creator-errors">
          {formErrors.map((error, index) => (
            <div key={index} className="spell-creator-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          ))}
          {lastError && !formErrors.includes(lastError) && (
            <div className="spell-creator-error">
              <AlertCircle size={14} />
              <span>{lastError}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="spell-creator-actions">
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
        <div className="spell-creator-preview">
          <h4 className="spell-creator-preview-title">
            <Sparkles size={16} />
            Preview
          </h4>
          <div className="spell-creator-preview-content">
            <div className="spell-creator-preview-header">
              <span className="spell-creator-preview-name" style={{ color: schoolColor }}>
                {formData.name}
              </span>
              <div className="spell-creator-preview-badges">
                <span className="spell-creator-preview-badge" style={{ backgroundColor: schoolColor }}>
                  {formData.school}
                </span>
                <span className="spell-creator-preview-badge spell-creator-preview-badge-secondary">
                  {formatLevel(formData.level)}
                </span>
              </div>
            </div>
            <div className="spell-creator-preview-stats">
              <span className="spell-creator-preview-stat">
                <strong>Casting:</strong> {formData.casting_time || '1 action'}
              </span>
              <span className="spell-creator-preview-stat">
                <strong>Range:</strong> {formData.range || '—'}
              </span>
              <span className="spell-creator-preview-stat">
                <strong>Duration:</strong> {formData.duration || '—'}
              </span>
              <span className="spell-creator-preview-stat">
                <strong>Components:</strong> {formData.components.length > 0 ? formData.components.join(', ') : '—'}
              </span>
            </div>
            {formData.description && (
              <p className="spell-creator-preview-description">
                {formData.description}
              </p>
            )}
            {formData.classes.length > 0 && (
              <div className="spell-creator-preview-classes">
                <span className="spell-creator-preview-classes-label">Classes:</span>
                {formData.classes.map(cls => (
                  <span key={cls} className="spell-creator-preview-class">
                    {cls}
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

export default SpellCreatorForm;

// Export types and utilities
export { VALID_SCHOOLS, VALID_COMPONENTS, STANDARD_CLASSES, SCHOOL_CONFIG, COMPONENT_CONFIG, formatLevel };
