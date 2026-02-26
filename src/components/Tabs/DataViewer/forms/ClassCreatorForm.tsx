/**
 * ClassCreatorForm Component
 *
 * A form component for creating custom classes.
 * Part of DataViewerTab Custom Content Creation Upgrade - Phase 6.2.
 *
 * Features:
 * - Name field (required)
 * - Description field (optional)
 * - baseClass selector (for template inheritance)
 * - Core stats: hit_die, primary_ability, saving_throws (2 required)
 * - Skills section: skill_count, available_skills, has_expertise, expertise_count
 * - Spellcasting section: is_spellcaster checkbox
 * - Audio Preferences section: primary/secondary/tertiary traits + weight sliders
 * - Images section: icon and image URL fields with preview
 * - Registers to both 'classes' and 'classes.data' categories
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
  Music,
  Shield,
  ImageIcon
} from 'lucide-react';
import { ImageFieldInput } from '@/components/shared/ImageFieldInput';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { useContentCreator } from '@/hooks/useContentCreator';
import './ClassCreatorForm.css';

/**
 * Valid ability scores
 */
const VALID_ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;
type Ability = typeof VALID_ABILITIES[number];

/**
 * Valid hit die values
 */
const VALID_HIT_DICE = [6, 8, 10, 12] as const;

/**
 * Valid audio traits
 */
const VALID_AUDIO_TRAITS = ['bass', 'treble', 'mid', 'amplitude', 'chaos'] as const;
type AudioTrait = typeof VALID_AUDIO_TRAITS[number];

/**
 * Default D&D 5e classes for baseClass selector
 */
const DEFAULT_CLASSES = [
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
 * Default D&D 5e skills for available_skills selector
 */
const DEFAULT_SKILLS = [
  'athletics',
  'acrobatics',
  'sleight_of_hand',
  'stealth',
  'arcana',
  'history',
  'investigation',
  'nature',
  'religion',
  'animal_handling',
  'insight',
  'medicine',
  'perception',
  'survival',
  'deception',
  'intimidation',
  'performance',
  'persuasion'
] as const;

/**
 * Audio preferences structure
 */
export interface AudioPreferences {
  primary?: AudioTrait;
  secondary?: AudioTrait;
  tertiary?: AudioTrait;
  bass?: number;
  treble?: number;
  mid?: number;
  amplitude?: number;
}

/**
 * Class form data structure
 */
export interface ClassFormData {
  name: string;
  description: string;
  baseClass: string;
  hit_die: number;
  primary_ability: Ability | '';
  saving_throws: Ability[];
  skill_count: number;
  available_skills: string[];
  has_expertise: boolean;
  expertise_count: number;
  is_spellcaster: boolean;
  audio_preferences: AudioPreferences;
  icon?: string;
  image?: string;
}

/**
 * Props for ClassCreatorForm component
 */
export interface ClassCreatorFormProps {
  /** Initial form data (for editing) */
  initialData?: Partial<ClassFormData>;
  /** Callback when class is created */
  onCreate?: (cls: ClassFormData) => void;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Custom submit button text */
  submitButtonText?: string;
  /** Available skills to select from */
  availableSkills?: string[];
  /** Available classes for baseClass selector */
  availableClasses?: string[];
}

/**
 * Get default form data
 */
function getDefaultFormData(): ClassFormData {
  return {
    name: '',
    description: '',
    baseClass: '',
    hit_die: 8,
    primary_ability: '',
    saving_throws: [],
    skill_count: 2,
    available_skills: [],
    has_expertise: false,
    expertise_count: 0,
    is_spellcaster: false,
    audio_preferences: {},
    icon: '',
    image: ''
  };
}

/**
 * ClassCreatorForm Component
 *
 * A form for creating custom classes for character generation.
 */
export function ClassCreatorForm({
  initialData,
  onCreate,
  onCancel,
  disabled = false,
  submitButtonText,
  availableSkills,
  availableClasses
}: ClassCreatorFormProps) {
  const { createContent, isLoading, lastError, clearError } = useContentCreator();

  // Form state
  const [formData, setFormData] = useState<ClassFormData>(() => ({
    ...getDefaultFormData(),
    ...initialData
  }));
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAudioPrefs, setShowAudioPrefs] = useState(false);

  // Default skills list
  const allSkills = useMemo(() => {
    return availableSkills || [...DEFAULT_SKILLS];
  }, [availableSkills]);

  // Default classes for baseClass selector
  const allClasses = useMemo(() => {
    return availableClasses || [...DEFAULT_CLASSES];
  }, [availableClasses]);

  // Validate form
  const validate = useCallback((): boolean => {
    const errors: string[] = [];

    // Required fields
    if (!formData.name.trim()) {
      errors.push('Class name is required');
    }

    // If no baseClass, validate required fields
    if (!formData.baseClass) {
      if (!formData.primary_ability) {
        errors.push('Primary ability is required when not using a base class');
      }

      if (formData.saving_throws.length !== 2) {
        errors.push('Exactly 2 saving throws are required when not using a base class');
      }
    }

    // Validate saving throws
    if (formData.saving_throws.length > 2) {
      errors.push('Classes can have at most 2 saving throws');
    }

    // Validate skill count
    if (formData.skill_count < 0 || formData.skill_count > 10) {
      errors.push('Skill count must be between 0 and 10');
    }

    // Validate expertise count if expertise is enabled
    if (formData.has_expertise && formData.expertise_count < 0) {
      errors.push('Expertise count must be 0 or greater');
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
      // Build class data for 'classes.data' category
      const classData: Record<string, unknown> = {
        name: formData.name.trim(),
        source: 'custom'
      };

      // Add description if provided
      if (formData.description.trim()) {
        classData.description = formData.description.trim();
      }

      // If using baseClass template
      if (formData.baseClass) {
        classData.baseClass = formData.baseClass;
        // Only add overrides if specified
        if (formData.hit_die !== 8) {
          classData.hit_die = formData.hit_die;
        }
        if (formData.primary_ability) {
          classData.primary_ability = formData.primary_ability;
        }
        if (formData.saving_throws.length === 2) {
          classData.saving_throws = formData.saving_throws;
        }
        if (formData.is_spellcaster) {
          classData.is_spellcaster = formData.is_spellcaster;
        }
        if (formData.skill_count !== 2) {
          classData.skill_count = formData.skill_count;
        }
        if (formData.available_skills.length > 0) {
          classData.available_skills = formData.available_skills;
        }
        if (formData.has_expertise) {
          classData.has_expertise = formData.has_expertise;
          if (formData.expertise_count > 0) {
            classData.expertise_count = formData.expertise_count;
          }
        }
      } else {
        // No baseClass - all fields required
        classData.hit_die = formData.hit_die;
        classData.primary_ability = formData.primary_ability;
        classData.saving_throws = formData.saving_throws;
        classData.is_spellcaster = formData.is_spellcaster;
        classData.skill_count = formData.skill_count;
        classData.available_skills = formData.available_skills;
        classData.has_expertise = formData.has_expertise;
        if (formData.has_expertise && formData.expertise_count > 0) {
          classData.expertise_count = formData.expertise_count;
        }
      }

      // Add audio preferences if any are set
      const hasAudioPrefs =
        formData.audio_preferences.primary ||
        formData.audio_preferences.secondary ||
        formData.audio_preferences.tertiary ||
        formData.audio_preferences.bass !== undefined ||
        formData.audio_preferences.treble !== undefined ||
        formData.audio_preferences.mid !== undefined ||
        formData.audio_preferences.amplitude !== undefined;

      if (hasAudioPrefs) {
        classData.audio_preferences = formData.audio_preferences;
      }

      // Add icon if specified
      if (formData.icon?.trim()) {
        classData.icon = formData.icon.trim();
      }

      // Add image if specified
      if (formData.image?.trim()) {
        classData.image = formData.image.trim();
      }

      // Register class name in 'classes' category
      const nameResult = createContent(
        'classes',
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

      // Register class data in 'classes.data' category
      const dataResult = createContent(
        'classes.data',
        classData,
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

  const handleBaseClassChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, baseClass: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleHitDieChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value, 10) as typeof VALID_HIT_DICE[number];
    setFormData(prev => ({ ...prev, hit_die: value }));
  }, []);

  const handlePrimaryAbilityChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Ability | '';
    setFormData(prev => ({ ...prev, primary_ability: value }));
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleSavingThrowToggle = useCallback((ability: Ability) => {
    setFormData(prev => {
      const throws = prev.saving_throws.includes(ability)
        ? prev.saving_throws.filter(t => t !== ability)
        : prev.saving_throws.length < 2
          ? [...prev.saving_throws, ability]
          : prev.saving_throws;
      return { ...prev, saving_throws: throws };
    });
    if (formErrors.length > 0) setFormErrors([]);
  }, [formErrors]);

  const handleSkillCountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10) || 0;
    setFormData(prev => ({ ...prev, skill_count: Math.max(0, Math.min(10, value)) }));
  }, []);

  const handleSkillToggle = useCallback((skill: string) => {
    setFormData(prev => {
      const skills = prev.available_skills.includes(skill)
        ? prev.available_skills.filter(s => s !== skill)
        : [...prev.available_skills, skill];
      return { ...prev, available_skills: skills };
    });
  }, []);

  const handleHasExpertiseChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setFormData(prev => ({
      ...prev,
      has_expertise: checked,
      expertise_count: checked ? prev.expertise_count : 0
    }));
  }, []);

  const handleExpertiseCountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10) || 0;
    setFormData(prev => ({ ...prev, expertise_count: Math.max(0, Math.min(10, value)) }));
  }, []);

  const handleIsSpellcasterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setFormData(prev => ({ ...prev, is_spellcaster: checked }));
  }, []);

  // Audio preferences handlers
  const handleAudioPrefChange = useCallback((key: keyof AudioPreferences, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      audio_preferences: {
        ...prev.audio_preferences,
        [key]: value
      }
    }));
  }, []);

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
    return 'Create Class';
  };

  // Check if form is valid enough to submit
  const canSubmit = formData.name.trim();

  // Count selected saving throws
  const savingThrowsCount = formData.saving_throws.length;

  // Check if using template (baseClass)
  const isUsingTemplate = !!formData.baseClass;

  return (
    <div className="class-creator-form" onKeyDown={handleKeyDown}>
      {/* Basic Info Section */}
      <div className="class-creator-section" role="group" aria-labelledby="class-basic-section-title">
        <h4 className="class-creator-section-title" id="class-basic-section-title">
          <Feather size={16} aria-hidden="true" />
          Basic Info
        </h4>

        <div className="class-creator-field">
          <label className="class-creator-label" htmlFor="class-name">
            Name <span className="class-creator-required">*</span>
          </label>
          <input
            id="class-name"
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            placeholder="e.g., Necromancer"
            className="class-creator-input"
            disabled={disabled}
            maxLength={50}
            aria-describedby="class-name-hint"
          />
          <span className="class-creator-hint" id="class-name-hint">
            {50 - formData.name.length} characters remaining
          </span>
        </div>

        <div className="class-creator-field">
          <label className="class-creator-label" htmlFor="class-description">
            Description <span className="class-creator-optional">(Optional)</span>
          </label>
          <textarea
            id="class-description"
            value={formData.description}
            onChange={handleDescriptionChange}
            placeholder="Describe the class's role, abilities, or flavor..."
            className="class-creator-textarea"
            disabled={disabled}
            maxLength={500}
            rows={3}
            aria-describedby="class-description-hint"
          />
          <span className="class-creator-hint" id="class-description-hint">
            {500 - formData.description.length} characters remaining
          </span>
        </div>

        <div className="class-creator-field">
          <label className="class-creator-label" htmlFor="class-baseclass">
            Base Class <span className="class-creator-optional">(Optional - for template inheritance)</span>
          </label>
          <select
            id="class-baseclass"
            value={formData.baseClass}
            onChange={handleBaseClassChange}
            className="class-creator-select"
            disabled={disabled}
            aria-describedby="class-baseclass-hint"
          >
            <option value="">None (define from scratch)</option>
            {allClasses.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
          <span className="class-creator-hint" id="class-baseclass-hint">
            {isUsingTemplate
              ? `Inherits properties from ${formData.baseClass}. Specify only what you want to override.`
              : 'Select a base class to inherit properties from an existing class.'}
          </span>
        </div>
      </div>

      {/* Core Stats Section */}
      <div className="class-creator-section" role="group" aria-labelledby="class-stats-section-title">
        <h4 className="class-creator-section-title" id="class-stats-section-title">
          <Zap size={16} aria-hidden="true" />
          Core Stats {!isUsingTemplate && <span className="class-creator-required">*</span>}
          {isUsingTemplate && <span className="class-creator-optional">(Overrides)</span>}
        </h4>

        <div className="class-creator-row">
          <div className="class-creator-field class-creator-field-inline">
            <label className="class-creator-label" htmlFor="class-hitdie">
              Hit Die
            </label>
            <select
              id="class-hitdie"
              value={formData.hit_die}
              onChange={handleHitDieChange}
              className="class-creator-select"
              disabled={disabled}
            >
              {VALID_HIT_DICE.map(die => (
                <option key={die} value={die}>d{die}</option>
              ))}
            </select>
          </div>

          <div className="class-creator-field class-creator-field-inline">
            <label className="class-creator-label" htmlFor="class-primary">
              Primary Ability
            </label>
            <select
              id="class-primary"
              value={formData.primary_ability}
              onChange={handlePrimaryAbilityChange}
              className="class-creator-select"
              disabled={disabled}
            >
              <option value="">Select...</option>
              {VALID_ABILITIES.map(ability => (
                <option key={ability} value={ability}>{ability}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="class-creator-field">
          <label className="class-creator-label">
            Saving Throws {!isUsingTemplate && <span className="class-creator-required">*</span>}
            <span className="class-creator-count">({savingThrowsCount}/2 selected)</span>
          </label>
          <div className="class-creator-saving-throws-grid" role="group" aria-label="Saving throw proficiencies">
            {VALID_ABILITIES.map(ability => {
              const isSelected = formData.saving_throws.includes(ability);
              const isDisabled2 = !isSelected && savingThrowsCount >= 2;
              return (
                <button
                  key={ability}
                  type="button"
                  className={`class-creator-saving-throw ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSavingThrowToggle(ability)}
                  disabled={disabled || isDisabled2}
                  aria-pressed={isSelected}
                  aria-label={`${ability} saving throw ${isSelected ? 'selected' : 'not selected'}`}
                >
                  {ability}
                </button>
              );
            })}
          </div>
          <span className="class-creator-hint">
            Select exactly 2 saving throw proficiencies
          </span>
        </div>

        <div className="class-creator-field">
          <label className="class-creator-label" htmlFor="class-spellcaster">
            <input
              id="class-spellcaster"
              type="checkbox"
              checked={formData.is_spellcaster}
              onChange={handleIsSpellcasterChange}
              disabled={disabled}
              className="class-creator-checkbox"
            />
            Spellcaster
          </label>
          <span className="class-creator-hint">
            Enable if this class can cast spells
          </span>
        </div>
      </div>

      {/* Images Section */}
      <div className="class-creator-section class-creator-images-section" role="group" aria-labelledby="class-images-section-title">
        <h4 className="class-creator-section-title" id="class-images-section-title">
          <ImageIcon size={16} aria-hidden="true" />
          Images <span className="class-creator-optional">(optional)</span>
        </h4>
        <div className="class-creator-images-grid">
          <div className="class-creator-field">
            <ImageFieldInput
              value={formData.icon || ''}
              onChange={handleIconChange}
              label="Class Icon"
              placeholder="e.g., assets/icons/necromancer.png"
              fieldType="icon"
              previewSize="sm"
              disabled={disabled}
            />
          </div>
          <div className="class-creator-field">
            <ImageFieldInput
              value={formData.image || ''}
              onChange={handleImageChange}
              label="Class Image"
              placeholder="e.g., assets/classes/necromancer.png"
              fieldType="image"
              previewSize="md"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Skills Section */}
      <div className="class-creator-section">
        <h4 className="class-creator-section-title">
          <Shield size={16} />
          Skills
        </h4>

        <div className="class-creator-row">
          <div className="class-creator-field class-creator-field-inline">
            <label className="class-creator-label" htmlFor="class-skillcount">
              Skills to Choose
            </label>
            <input
              id="class-skillcount"
              type="number"
              value={formData.skill_count}
              onChange={handleSkillCountChange}
              min={0}
              max={10}
              className="class-creator-input class-creator-input-number"
              disabled={disabled}
            />
          </div>

          <div className="class-creator-field class-creator-field-inline">
            <label className="class-creator-label" htmlFor="class-expertise">
              <input
                id="class-expertise"
                type="checkbox"
                checked={formData.has_expertise}
                onChange={handleHasExpertiseChange}
                disabled={disabled}
                className="class-creator-checkbox"
              />
              Has Expertise
            </label>
            {formData.has_expertise && (
              <input
                type="number"
                value={formData.expertise_count}
                onChange={handleExpertiseCountChange}
                min={0}
                max={10}
                placeholder="Count"
                className="class-creator-input class-creator-input-number class-creator-expertise-count"
                disabled={disabled}
              />
            )}
          </div>
        </div>

        <div className="class-creator-field">
          <label className="class-creator-label">
            Available Skills
            <span className="class-creator-count">({formData.available_skills.length} selected)</span>
          </label>
          <span className="class-creator-hint">
            Select skills this class can choose from at character creation
          </span>
          <div className="class-creator-skills-grid">
            {allSkills.map(skill => {
              const isSelected = formData.available_skills.includes(skill);
              return (
                <label key={skill} className="class-creator-skill-option">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSkillToggle(skill)}
                    disabled={disabled}
                  />
                  <span>{skill}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Music-Based Class Suggestions Toggle */}
      <div className="class-creator-advanced-toggle">
        <button
          type="button"
          className="class-creator-advanced-btn"
          onClick={() => setShowAudioPrefs(!showAudioPrefs)}
          disabled={disabled}
          aria-expanded={showAudioPrefs}
          aria-controls="class-creator-audio-section"
        >
          {showAudioPrefs ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          <Music size={16} aria-hidden="true" />
          Music-Based Class Suggestions {showAudioPrefs && '(Advanced)'}
        </button>
      </div>

      {/* Audio Preferences Section */}
      {showAudioPrefs && (
        <div className="class-creator-advanced-section" id="class-creator-audio-section">
          <div className="class-creator-audio-hint">
            <strong>How it works:</strong> Audio preferences determine when this class is suggested based on
            music characteristics. Classes with matching audio preferences are more likely to be generated
            for songs with those traits.
          </div>
          <div className="class-creator-audio-example">
            <strong>Examples:</strong> Barbarian prefers bass-heavy music, Bard prefers treble-heavy music
          </div>

          <div className="class-creator-row">
            <div className="class-creator-field class-creator-field-inline">
              <label className="class-creator-label" htmlFor="audio-primary">
                Primary Trait
                <Tooltip content="The main audio trait this class responds to (highest priority)" />
              </label>
              <select
                id="audio-primary"
                value={formData.audio_preferences.primary || ''}
                onChange={(e) => handleAudioPrefChange('primary', e.target.value || undefined)}
                className="class-creator-select"
                disabled={disabled}
              >
                <option value="">None</option>
                {VALID_AUDIO_TRAITS.map(trait => (
                  <option key={trait} value={trait}>{trait}</option>
                ))}
              </select>
            </div>

            <div className="class-creator-field class-creator-field-inline">
              <label className="class-creator-label" htmlFor="audio-secondary">
                Secondary Trait
                <Tooltip content="Secondary trait (less weight than primary)" />
              </label>
              <select
                id="audio-secondary"
                value={formData.audio_preferences.secondary || ''}
                onChange={(e) => handleAudioPrefChange('secondary', e.target.value || undefined)}
                className="class-creator-select"
                disabled={disabled}
              >
                <option value="">None</option>
                {VALID_AUDIO_TRAITS.map(trait => (
                  <option key={trait} value={trait}>{trait}</option>
                ))}
              </select>
            </div>

            <div className="class-creator-field class-creator-field-inline">
              <label className="class-creator-label" htmlFor="audio-tertiary">
                Tertiary Trait
                <Tooltip content="Tertiary trait (least weight, subtle influence)" />
              </label>
              <select
                id="audio-tertiary"
                value={formData.audio_preferences.tertiary || ''}
                onChange={(e) => handleAudioPrefChange('tertiary', e.target.value || undefined)}
                className="class-creator-select"
                disabled={disabled}
              >
                <option value="">None</option>
                {VALID_AUDIO_TRAITS.map(trait => (
                  <option key={trait} value={trait}>{trait}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="class-creator-audio-weights">
            <label className="class-creator-label">
              Individual Weight Sliders
              <Tooltip content="Override weight for specific frequency ranges when the trait system isn't enough" />
            </label>
            <div className="class-creator-weight-sliders">
              {(['bass', 'treble', 'mid', 'amplitude'] as const).map(trait => (
                <div key={trait} className="class-creator-weight-slider">
                  <label className="class-creator-weight-label" htmlFor={`audio-weight-${trait}`}>
                    {trait}
                  </label>
                  <input
                    id={`audio-weight-${trait}`}
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={formData.audio_preferences[trait] ?? 0}
                    onChange={(e) => handleAudioPrefChange(trait, parseFloat(e.target.value) || undefined)}
                    disabled={disabled}
                    className="class-creator-slider"
                    aria-label={`${trait} audio weight`}
                    aria-valuenow={formData.audio_preferences[trait] ?? 0}
                    aria-valuemin={0}
                    aria-valuemax={10}
                  />
                  <span className="class-creator-weight-value" aria-live="off">
                    {formData.audio_preferences[trait]?.toFixed(1) || '0.0'}
                  </span>
                </div>
              ))}
            </div>
            <span className="class-creator-hint">
              Higher values increase affinity for this audio trait. 0 = no preference.
            </span>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {(formErrors.length > 0 || lastError) && (
        <div className="class-creator-errors" role="alert" aria-live="assertive">
          {formErrors.map((error, index) => (
            <div key={index} className="class-creator-error">
              <AlertCircle size={14} aria-hidden="true" />
              <span>{error}</span>
            </div>
          ))}
          {lastError && !formErrors.includes(lastError) && (
            <div className="class-creator-error">
              <AlertCircle size={14} aria-hidden="true" />
              <span>{lastError}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="class-creator-actions">
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
        <div className="class-creator-preview" role="status" aria-live="polite" aria-label="Class preview">
          <h4 className="class-creator-preview-title">
            <Sparkles size={16} aria-hidden="true" />
            Preview
          </h4>
          <div className="class-creator-preview-content">
            {/* Show image if set */}
            {formData.image && (
              <div className="class-creator-preview-image">
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
            <div className="class-creator-preview-header">
              <div className="class-creator-preview-name-row">
                {formData.icon && (
                  <img
                    src={formData.icon}
                    alt=""
                    className="class-creator-preview-icon"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                )}
                <span className="class-creator-preview-name">
                  {formData.name}
                </span>
              </div>
              <div className="class-creator-preview-badges">
                <span className="class-creator-preview-badge class-creator-preview-badge-hitdie">
                  d{formData.hit_die}
                </span>
                {formData.is_spellcaster && (
                  <span className="class-creator-preview-badge class-creator-preview-badge-spellcaster">
                    Spellcaster
                  </span>
                )}
                {formData.baseClass && (
                  <span className="class-creator-preview-badge class-creator-preview-badge-template">
                    Extends {formData.baseClass}
                  </span>
                )}
              </div>
            </div>
            <div className="class-creator-preview-stats">
              {formData.primary_ability && (
                <span className="class-creator-preview-stat">
                  <strong>Primary:</strong> {formData.primary_ability}
                </span>
              )}
              {formData.saving_throws.length > 0 && (
                <span className="class-creator-preview-stat">
                  <strong>Saves:</strong> {formData.saving_throws.join(', ')}
                </span>
              )}
              <span className="class-creator-preview-stat">
                <strong>Skills:</strong> {formData.skill_count}
                {formData.has_expertise && ` (+${formData.expertise_count || 0} expertise)`}
              </span>
            </div>
            {formData.description && (
              <p className="class-creator-preview-description">
                {formData.description.length > 150
                  ? `${formData.description.substring(0, 150)}...`
                  : formData.description}
              </p>
            )}
            {formData.available_skills.length > 0 && (
              <div className="class-creator-preview-skills">
                <span className="class-creator-preview-skills-label">Available Skills:</span>
                {formData.available_skills.slice(0, 8).map(skill => (
                  <span key={skill} className="class-creator-preview-skill">
                    {skill}
                  </span>
                ))}
                {formData.available_skills.length > 8 && (
                  <span className="class-creator-preview-more">
                    +{formData.available_skills.length - 8} more
                  </span>
                )}
              </div>
            )}
            {(formData.audio_preferences.primary || formData.audio_preferences.secondary) && (
              <div className="class-creator-preview-audio">
                <span className="class-creator-preview-audio-label">Audio:</span>
                {formData.audio_preferences.primary && (
                  <span className="class-creator-preview-audio-trait">
                    {formData.audio_preferences.primary}
                  </span>
                )}
                {formData.audio_preferences.secondary && (
                  <span className="class-creator-preview-audio-trait">
                    {formData.audio_preferences.secondary}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ClassCreatorForm;

// Export types and constants
export { VALID_ABILITIES, VALID_HIT_DICE, VALID_AUDIO_TRAITS, DEFAULT_CLASSES, DEFAULT_SKILLS };
