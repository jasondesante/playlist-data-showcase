/**
 * AppearanceOptionCreator Component
 *
 * A form component for creating and adding custom appearance options.
 * Part of DataViewerTab Custom Content Creation Upgrade - Phase 4.1.
 *
 * Features:
 * - Category selector dropdown (body types, skin tones, hair colors, etc.)
 * - Dynamic form based on category type:
 *   - Text input for body types, hair styles, facial features
 *   - Color picker for skin tones, hair colors, eye colors
 * - Validation for color format (#RRGGBB)
 * - Preview of the option being created
 *
 * @see docs/plans/DATAVIEWER_CUSTOM_CONTENT_PLAN.md for implementation details
 */

import { useState, useCallback, useMemo } from 'react';
import {
  User,
  Palette,
  Eye,
  Sparkles,
  Plus,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useContentCreator, type ContentType } from '@/hooks/useContentCreator';
import './AppearanceOptionCreator.css';

/**
 * Appearance category configuration
 */
export interface AppearanceCategoryConfig {
  key: ContentType;
  name: string;
  description: string;
  inputType: 'text' | 'color';
  icon: typeof User;
  placeholder: string;
}

/**
 * All available appearance categories
 */
const APPEARANCE_CATEGORIES: AppearanceCategoryConfig[] = [
  {
    key: 'appearance.bodyTypes',
    name: 'Body Types',
    description: 'Physical body builds (e.g., slender, athletic, muscular)',
    inputType: 'text',
    icon: User,
    placeholder: 'e.g., Athletic, Stocky, Lean'
  },
  {
    key: 'appearance.skinTones',
    name: 'Skin Tones',
    description: 'Skin tone color options',
    inputType: 'color',
    icon: Palette,
    placeholder: '#RRGGBB format'
  },
  {
    key: 'appearance.hairColors',
    name: 'Hair Colors',
    description: 'Hair color options',
    inputType: 'color',
    icon: Palette,
    placeholder: '#RRGGBB format'
  },
  {
    key: 'appearance.hairStyles',
    name: 'Hair Styles',
    description: 'Hair style options (e.g., short, long, braided)',
    inputType: 'text',
    icon: User,
    placeholder: 'e.g., Braided, Mohawk, Wavy'
  },
  {
    key: 'appearance.eyeColors',
    name: 'Eye Colors',
    description: 'Eye color options',
    inputType: 'color',
    icon: Eye,
    placeholder: '#RRGGBB format'
  },
  {
    key: 'appearance.facialFeatures',
    name: 'Facial Features',
    description: 'Facial features (e.g., scars, tattoos, piercings)',
    inputType: 'text',
    icon: User,
    placeholder: 'e.g., Scar across eye, Tribal tattoo'
  }
];

/**
 * Props for AppearanceOptionCreator component
 */
export interface AppearanceOptionCreatorProps {
  /** Initial category to select */
  initialCategory?: ContentType;
  /** Callback when option is created */
  onCreate?: (category: ContentType, value: string) => void;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Custom submit button text */
  submitButtonText?: string;
  /** Whether to show the preview */
  showPreview?: boolean;
}

/**
 * Validate hex color format
 */
function isValidHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

/**
 * Get contrasting text color (black or white) for a given background color
 */
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * AppearanceOptionCreator Component
 *
 * A form for creating custom appearance options for character generation.
 */
export function AppearanceOptionCreator({
  initialCategory = 'appearance.bodyTypes',
  onCreate,
  onCancel,
  disabled = false,
  submitButtonText,
  showPreview = true
}: AppearanceOptionCreatorProps) {
  const { createContent, isLoading, lastError, clearError } = useContentCreator();

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<ContentType>(
    APPEARANCE_CATEGORIES.find(c => c.key === initialCategory)?.key || 'appearance.bodyTypes'
  );
  const [textValue, setTextValue] = useState('');
  const [colorValue, setColorValue] = useState('#4a90d9');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current category config
  const categoryConfig = useMemo(() => {
    return APPEARANCE_CATEGORIES.find(c => c.key === selectedCategory) || APPEARANCE_CATEGORIES[0];
  }, [selectedCategory]);

  // Whether this category uses color input
  const isColorCategory = categoryConfig.inputType === 'color';

  // Get current value
  const currentValue = isColorCategory ? colorValue : textValue;

  // Validate form
  const validate = useCallback((): boolean => {
    const errors: string[] = [];

    if (isColorCategory) {
      if (!isValidHexColor(colorValue)) {
        errors.push('Color must be in #RRGGBB format (e.g., #4a90d9)');
      }
    } else {
      if (!textValue.trim()) {
        errors.push('Please enter a value');
      }
      if (textValue.length > 50) {
        errors.push('Value must be 50 characters or less');
      }
    }

    setFormErrors(errors);
    return errors.length === 0;
  }, [isColorCategory, colorValue, textValue]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    clearError();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // For appearance options, we register the string value directly (not wrapped in an object)
      // The ExtensionManager expects strings for appearance categories
      const result = createContent(
        selectedCategory,
        currentValue, // Pass string directly, not wrapped in object
        { validate: true, markAsCustom: false }, // Don't add source: 'custom' to strings
        {
          onSuccess: () => {
            // Reset form on success
            if (isColorCategory) {
              setColorValue('#4a90d9');
            } else {
              setTextValue('');
            }
            setFormErrors([]);
            onCreate?.(selectedCategory, currentValue);
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
  }, [clearError, validate, currentValue, selectedCategory, createContent, isColorCategory, onCreate]);

  // Handle category change
  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value as ContentType);
    setFormErrors([]);
    clearError();
  }, [clearError]);

  // Handle text input change
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTextValue(e.target.value);
    if (formErrors.length > 0) {
      setFormErrors([]);
    }
  }, [formErrors]);

  // Handle color input change
  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setColorValue(e.target.value);
    if (formErrors.length > 0) {
      setFormErrors([]);
    }
  }, [formErrors]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  // Handle Enter key to submit
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Get button text
  const getButtonText = () => {
    if (submitButtonText) return submitButtonText;
    return 'Add Option';
  };

  // Get icon for category
  const CategoryIcon = categoryConfig.icon;

  return (
    <div className="appearance-option-creator" onKeyDown={handleKeyDown}>
      {/* Category Selector */}
      <div className="appearance-creator-section" role="group" aria-labelledby="appearance-category-section-title">
        <h4 className="appearance-creator-section-title" id="appearance-category-section-title">
          <Palette size={16} aria-hidden="true" />
          Category
        </h4>
        <div className="appearance-creator-field">
          <label className="appearance-creator-label" htmlFor="appearance-category">
            Appearance Category
          </label>
          <select
            id="appearance-category"
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="appearance-creator-select"
            disabled={disabled}
            aria-describedby="appearance-category-hint"
          >
            {APPEARANCE_CATEGORIES.map(cat => (
              <option key={cat.key} value={cat.key}>
                {cat.name}
              </option>
            ))}
          </select>
          <span className="appearance-creator-hint" id="appearance-category-hint">{categoryConfig.description}</span>
        </div>
      </div>

      {/* Value Input */}
      <div className="appearance-creator-section" role="group" aria-labelledby="appearance-value-section-title">
        <h4 className="appearance-creator-section-title" id="appearance-value-section-title">
          <CategoryIcon size={16} aria-hidden="true" />
          {isColorCategory ? 'Color Value' : 'Option Value'}
        </h4>

        {isColorCategory ? (
          <div className="appearance-creator-color-section">
            <div className="appearance-creator-field">
              <label className="appearance-creator-label" htmlFor="color-picker">
                Select Color <span className="appearance-creator-required">*</span>
              </label>
              <div className="appearance-creator-color-inputs">
                <input
                  id="color-picker"
                  type="color"
                  value={colorValue}
                  onChange={handleColorChange}
                  className="appearance-creator-color-picker"
                  disabled={disabled}
                  aria-describedby="color-picker-hint"
                />
                <input
                  type="text"
                  value={colorValue.toUpperCase()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                      setColorValue(val);
                    }
                  }}
                  placeholder="#RRGGBB"
                  className="appearance-creator-hex-input"
                  disabled={disabled}
                  maxLength={7}
                  aria-label="Hex color value"
                />
              </div>
              <span className="appearance-creator-hint" id="color-picker-hint">Enter hex color (e.g., #4A90D9) or use the picker</span>
            </div>

            {/* Color Preview */}
            {showPreview && isValidHexColor(colorValue) && (
              <div className="appearance-creator-color-preview">
                <div
                  className="appearance-creator-color-swatch-large"
                  style={{ backgroundColor: colorValue }}
                >
                  <span style={{ color: getContrastColor(colorValue) }}>
                    {colorValue.toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="appearance-creator-field">
            <label className="appearance-creator-label" htmlFor="text-value">
              Option Name <span className="appearance-creator-required">*</span>
            </label>
            <input
              id="text-value"
              type="text"
              value={textValue}
              onChange={handleTextChange}
              placeholder={categoryConfig.placeholder}
              className="appearance-creator-input"
              disabled={disabled}
              maxLength={50}
              aria-describedby="text-value-hint"
            />
            <span className="appearance-creator-hint" id="text-value-hint">
              {50 - textValue.length} characters remaining
            </span>
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {(formErrors.length > 0 || lastError) && (
        <div className="appearance-creator-errors" role="alert" aria-live="assertive">
          {formErrors.map((error, index) => (
            <div key={index} className="appearance-creator-error">
              <AlertCircle size={14} aria-hidden="true" />
              <span>{error}</span>
            </div>
          ))}
          {lastError && !formErrors.includes(lastError) && (
            <div className="appearance-creator-error">
              <AlertCircle size={14} aria-hidden="true" />
              <span>{lastError}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="appearance-creator-actions">
        <Button
          variant="primary"
          size="md"
          onClick={handleSubmit}
          isLoading={isSubmitting || isLoading}
          disabled={disabled || (isColorCategory ? !isValidHexColor(colorValue) : !textValue.trim())}
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

      {/* Preview Section (for text values) */}
      {showPreview && !isColorCategory && textValue.trim() && (
        <div className="appearance-creator-preview" role="status" aria-live="polite" aria-label="Preview of the appearance option">
          <h4 className="appearance-creator-preview-title">
            <Sparkles size={16} aria-hidden="true" />
            Preview
          </h4>
          <div className="appearance-creator-preview-content">
            <span className="appearance-creator-preview-tag">
              {textValue}
            </span>
          </div>
          <p className="appearance-creator-preview-hint">
            This option will be added to the <strong>{categoryConfig.name}</strong> category.
          </p>
        </div>
      )}
    </div>
  );
}

export default AppearanceOptionCreator;

// Export category config for external use
export { APPEARANCE_CATEGORIES };
