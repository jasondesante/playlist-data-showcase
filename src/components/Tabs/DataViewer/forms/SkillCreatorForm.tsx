/**
 * SkillCreatorForm Component
 *
 * A form component for creating and adding custom skills.
 * Part of DataViewerTab Custom Content Creation Upgrade - Phase 4.2.
 *
 * Features:
 * - ID field with auto-generation from name (lowercase_with_underscores)
 * - Name field (required)
 * - Ability selector (STR/DEX/CON/INT/WIS/CHA)
 * - Description textarea (optional)
 * - Categories multi-select (optional)
 * - Armor penalty checkbox (optional)
 * - Live validation with error display
 *
 * @see docs/plans/DATAVIEWER_CUSTOM_CONTENT_PLAN.md for implementation details
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Swords,
  FileText,
  Tag,
  Shield,
  Sparkles,
  Plus,
  AlertCircle,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useContentCreator, type ContentType } from '@/hooks/useContentCreator';
import './SkillCreatorForm.css';

/**
 * Valid D&D 5e ability scores
 */
const VALID_ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;
type Ability = typeof VALID_ABILITIES[number];

/**
 * Ability score display configuration
 */
const ABILITY_CONFIG: Record<Ability, { name: string; description: string }> = {
  STR: { name: 'Strength', description: 'Physical power, athletics' },
  DEX: { name: 'Dexterity', description: 'Agility, reflexes, balance' },
  CON: { name: 'Constitution', description: 'Health, stamina, endurance' },
  INT: { name: 'Intelligence', description: 'Memory, reasoning, knowledge' },
  WIS: { name: 'Wisdom', description: 'Perception, insight, willpower' },
  CHA: { name: 'Charisma', description: 'Presence, persuasiveness' }
};

/**
 * Common skill categories for suggestions
 */
const COMMON_CATEGORIES = [
  'Knowledge',
  'Craft',
  'Profession',
  'Performance',
  'Combat',
  'Social',
  'Survival',
  'Magic',
  'Stealth',
  'Investigation'
];

/**
 * Skill form data structure
 */
export interface SkillFormData {
  id: string;
  name: string;
  ability: Ability;
  description: string;
  categories: string[];
  armorPenalty: boolean;
}

/**
 * Props for SkillCreatorForm component
 */
export interface SkillCreatorFormProps {
  /** Initial form data (for editing) */
  initialData?: Partial<SkillFormData>;
  /** Callback when skill is created */
  onCreate?: (skill: SkillFormData) => void;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Custom submit button text */
  submitButtonText?: string;
  /** Content type override (for ability-specific skills) */
  contentType?: ContentType;
}

/**
 * Convert a name to ID format (lowercase_with_underscores)
 */
function nameToId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Validate ID format
 */
function isValidIdFormat(id: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(id);
}

/**
 * Get default form data
 */
function getDefaultFormData(): SkillFormData {
  return {
    id: '',
    name: '',
    ability: 'INT',
    description: '',
    categories: [],
    armorPenalty: false
  };
}

/**
 * SkillCreatorForm Component
 *
 * A form for creating custom skills for character generation.
 */
export function SkillCreatorForm({
  initialData,
  onCreate,
  onCancel,
  disabled = false,
  submitButtonText,
  contentType = 'skills'
}: SkillCreatorFormProps) {
  const { createContent, isLoading, lastError, clearError } = useContentCreator();

  // Form state
  const [formData, setFormData] = useState<SkillFormData>(() => ({
    ...getDefaultFormData(),
    ...initialData
  }));
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [idManuallyEdited, setIdManuallyEdited] = useState(!!initialData?.id);

  // Determine if this is an ability-specific content type (e.g., 'skills.STR')
  const abilitySpecificMatch = contentType.match(/^skills\.(STR|DEX|CON|INT|WIS|CHA)$/);
  const isAbilitySpecific = !!abilitySpecificMatch;
  const lockedAbility = abilitySpecificMatch ? (abilitySpecificMatch[1] as Ability) : null;

  // Auto-generate ID from name if not manually edited
  useEffect(() => {
    if (!idManuallyEdited && formData.name) {
      setFormData(prev => ({
        ...prev,
        id: nameToId(prev.name)
      }));
    }
  }, [formData.name, idManuallyEdited]);

  // Lock ability if content type is ability-specific
  useEffect(() => {
    if (lockedAbility && formData.ability !== lockedAbility) {
      setFormData(prev => ({
        ...prev,
        ability: lockedAbility
      }));
    }
  }, [lockedAbility, formData.ability]);

  // Validate form
  const validate = useCallback((): boolean => {
    const errors: string[] = [];

    // Required fields
    if (!formData.name.trim()) {
      errors.push('Skill name is required');
    }

    if (!formData.id.trim()) {
      errors.push('Skill ID is required');
    } else if (!isValidIdFormat(formData.id)) {
      errors.push('ID must use lowercase_with_underscores format (e.g., "ancient_history")');
    }

    if (!VALID_ABILITIES.includes(formData.ability)) {
      errors.push('Ability must be one of: STR, DEX, CON, INT, WIS, CHA');
    }

    // Optional fields validation
    if (formData.description && formData.description.length > 500) {
      errors.push('Description must be 500 characters or less');
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
      // Build skill object
      const skillItem: Record<string, unknown> = {
        id: formData.id,
        name: formData.name,
        ability: formData.ability
      };

      // Add optional fields only if they have values
      if (formData.description.trim()) {
        skillItem.description = formData.description.trim();
      }
      if (formData.categories.length > 0) {
        skillItem.categories = formData.categories;
      }
      if (formData.armorPenalty) {
        skillItem.armorPenalty = true;
      }

      const result = createContent(
        contentType,
        skillItem,
        { validate: true },
        {
          onSuccess: () => {
            // Reset form on success
            setFormData(getDefaultFormData());
            setIdManuallyEdited(false);
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

  const handleIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, id: value }));
    setIdManuallyEdited(true);
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleAbilityChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Ability;
    setFormData(prev => ({ ...prev, ability: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, description: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleArmorPenaltyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, armorPenalty: e.target.checked }));
  }, []);

  // Category management
  const handleAddCategory = useCallback((category: string) => {
    const trimmed = category.trim();
    if (trimmed && !formData.categories.includes(trimmed)) {
      setFormData(prev => ({
        ...prev,
        categories: [...prev.categories, trimmed]
      }));
    }
    setCustomCategory('');
  }, [formData.categories]);

  const handleRemoveCategory = useCallback((category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c !== category)
    }));
  }, []);

  const handleCustomCategoryKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCategory(customCategory);
    }
  }, [customCategory, handleAddCategory]);

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
    return 'Create Skill';
  };

  // Check if form is valid enough to submit
  const canSubmit = formData.name.trim() && formData.id.trim() && isValidIdFormat(formData.id);

  return (
    <div className="skill-creator-form" onKeyDown={handleKeyDown}>
      {/* Basic Info Section */}
      <div className="skill-creator-section">
        <h4 className="skill-creator-section-title">
          <Swords size={16} />
          Basic Info
        </h4>

        <div className="skill-creator-field">
          <label className="skill-creator-label" htmlFor="skill-name">
            Name <span className="skill-creator-required">*</span>
          </label>
          <input
            id="skill-name"
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            placeholder="e.g., Ancient History"
            className="skill-creator-input"
            disabled={disabled}
            maxLength={50}
          />
          <span className="skill-creator-hint">
            {50 - formData.name.length} characters remaining
          </span>
        </div>

        <div className="skill-creator-field">
          <label className="skill-creator-label" htmlFor="skill-id">
            ID <span className="skill-creator-required">*</span>
          </label>
          <input
            id="skill-id"
            type="text"
            value={formData.id}
            onChange={handleIdChange}
            placeholder="e.g., ancient_history"
            className="skill-creator-input skill-creator-input-mono"
            disabled={disabled}
            maxLength={40}
          />
          <span className="skill-creator-hint">
            Auto-generated from name. Must be lowercase_with_underscores format.
          </span>
        </div>
      </div>

      {/* Ability Section */}
      <div className="skill-creator-section">
        <h4 className="skill-creator-section-title">
          <Zap size={16} />
          Associated Ability
        </h4>

        <div className="skill-creator-field">
          <label className="skill-creator-label" htmlFor="skill-ability">
            Ability Score <span className="skill-creator-required">*</span>
          </label>
          <select
            id="skill-ability"
            value={formData.ability}
            onChange={handleAbilityChange}
            className="skill-creator-select"
            disabled={disabled || isAbilitySpecific}
          >
            {VALID_ABILITIES.map(ability => (
              <option key={ability} value={ability}>
                {ability} - {ABILITY_CONFIG[ability].name}
              </option>
            ))}
          </select>
          <span className="skill-creator-hint">
            {isAbilitySpecific
              ? `Locked to ${lockedAbility} (ability-specific category)`
              : ABILITY_CONFIG[formData.ability].description}
          </span>
        </div>
      </div>

      {/* Description Section */}
      <div className="skill-creator-section">
        <h4 className="skill-creator-section-title">
          <FileText size={16} />
          Description <span className="skill-creator-optional">(Optional)</span>
        </h4>

        <div className="skill-creator-field">
          <textarea
            id="skill-description"
            value={formData.description}
            onChange={handleDescriptionChange}
            placeholder="Describe what this skill represents and how it's used..."
            className="skill-creator-textarea"
            disabled={disabled}
            maxLength={500}
            rows={3}
          />
          <span className="skill-creator-hint">
            {500 - formData.description.length} characters remaining
          </span>
        </div>
      </div>

      {/* Categories Section */}
      <div className="skill-creator-section">
        <h4 className="skill-creator-section-title">
          <Tag size={16} />
          Categories <span className="skill-creator-optional">(Optional)</span>
        </h4>

        <div className="skill-creator-field">
          <label className="skill-creator-label">
            Add Categories
          </label>

          {/* Selected categories */}
          {formData.categories.length > 0 && (
            <div className="skill-creator-categories-selected">
              {formData.categories.map(cat => (
                <span key={cat} className="skill-creator-category-tag">
                  {cat}
                  <button
                    type="button"
                    className="skill-creator-category-remove"
                    onClick={() => handleRemoveCategory(cat)}
                    disabled={disabled}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Category input */}
          <div className="skill-creator-category-input-row">
            <input
              type="text"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              onKeyDown={handleCustomCategoryKeyDown}
              placeholder="Type a category..."
              className="skill-creator-input skill-creator-category-input"
              disabled={disabled}
              maxLength={30}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddCategory(customCategory)}
              disabled={disabled || !customCategory.trim()}
            >
              Add
            </Button>
          </div>

          {/* Quick-add category suggestions */}
          <div className="skill-creator-category-suggestions">
            <span className="skill-creator-suggestions-label">Quick add:</span>
            {COMMON_CATEGORIES.filter(cat => !formData.categories.includes(cat)).slice(0, 5).map(cat => (
              <button
                key={cat}
                type="button"
                className="skill-creator-suggestion-btn"
                onClick={() => handleAddCategory(cat)}
                disabled={disabled}
              >
                +{cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Options Section */}
      <div className="skill-creator-section">
        <h4 className="skill-creator-section-title">
          <Shield size={16} />
          Options
        </h4>

        <div className="skill-creator-checkbox-field">
          <label className="skill-creator-checkbox-label">
            <input
              type="checkbox"
              checked={formData.armorPenalty}
              onChange={handleArmorPenaltyChange}
              disabled={disabled}
              className="skill-creator-checkbox"
            />
            <span className="skill-creator-checkbox-text">
              <strong>Armor Penalty</strong>
              <span className="skill-creator-checkbox-description">
                Check if this skill has a penalty when wearing armor (like Stealth with heavy armor)
              </span>
            </span>
          </label>
        </div>
      </div>

      {/* Validation Errors */}
      {(formErrors.length > 0 || lastError) && (
        <div className="skill-creator-errors">
          {formErrors.map((error, index) => (
            <div key={index} className="skill-creator-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          ))}
          {lastError && !formErrors.includes(lastError) && (
            <div className="skill-creator-error">
              <AlertCircle size={14} />
              <span>{lastError}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="skill-creator-actions">
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
        <div className="skill-creator-preview">
          <h4 className="skill-creator-preview-title">
            <Sparkles size={16} />
            Preview
          </h4>
          <div className="skill-creator-preview-content">
            <div className="skill-creator-preview-skill">
              <span className="skill-creator-preview-name">{formData.name}</span>
              <span className="skill-creator-preview-ability">{formData.ability}</span>
            </div>
            {formData.categories.length > 0 && (
              <div className="skill-creator-preview-categories">
                {formData.categories.map(cat => (
                  <span key={cat} className="skill-creator-preview-category">
                    {cat}
                  </span>
                ))}
              </div>
            )}
            {formData.description && (
              <p className="skill-creator-preview-description">
                {formData.description}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SkillCreatorForm;

// Export types and utilities
export { VALID_ABILITIES, ABILITY_CONFIG, COMMON_CATEGORIES, nameToId };
