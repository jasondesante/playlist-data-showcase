/**
 * ImageFieldInput Component
 *
 * A shared component for entering image URLs with validation and preview.
 * Part of DataViewerTab Improvements Plan - Phase 2.1.
 *
 * Features:
 * - URL input field with validation for allowed prefixes
 * - Preview thumbnail of the image
 * - URL/path mode ONLY (base64/embedded not supported by engine)
 * - Helpful hint about valid URL prefixes
 * - Error state for invalid URLs
 *
 * Valid URL prefixes (confirmed in Task 1.1):
 * - http://
 * - https://
 * - /
 * - assets/
 *
 * @see docs/plans/DATAVIEWER_IMPROVEMENTS_PLAN.md for implementation details
 */

import { useState, useCallback, useEffect } from 'react';
import { ImageIcon, ExternalLink, AlertCircle } from 'lucide-react';
import './ImageFieldInput.css';

/**
 * Valid URL prefixes for images (confirmed in research phase)
 */
const VALID_URL_PREFIXES = ['http://', 'https://', '/', 'assets/'] as const;

/**
 * Props for ImageFieldInput component
 */
export interface ImageFieldInputProps {
  /** Current image URL value */
  value?: string;
  /** Callback when URL changes */
  onChange?: (url: string) => void;
  /** Callback when URL validation state changes */
  onValidChange?: (isValid: boolean) => void;
  /** Label for the field */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show the preview thumbnail */
  showPreview?: boolean;
  /** Preview thumbnail size */
  previewSize?: 'sm' | 'md' | 'lg';
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Custom hint text (replaces default) */
  hint?: string;
  /** Field type - determines which field this is for (icon or image) */
  fieldType?: 'icon' | 'image';
  /** ID for the input element */
  id?: string;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Validate if URL has a valid prefix
 */
function isValidUrlPrefix(url: string): boolean {
  if (!url.trim()) return true; // Empty is valid (optional field)
  return VALID_URL_PREFIXES.some(prefix => url.startsWith(prefix));
}

/**
 * Get the validation error message for invalid URLs
 */
function getValidationMessage(url: string): string | null {
  if (!url.trim()) return null;
  if (!isValidUrlPrefix(url)) {
    return `URL must start with one of: ${VALID_URL_PREFIXES.join(', ')}`;
  }
  return null;
}

/**
 * Get preview size dimensions
 */
function getPreviewDimensions(size: 'sm' | 'md' | 'lg'): { width: number; height: number } {
  switch (size) {
    case 'sm':
      return { width: 32, height: 32 };
    case 'lg':
      return { width: 80, height: 80 };
    case 'md':
    default:
      return { width: 48, height: 48 };
  }
}

/**
 * ImageFieldInput Component
 *
 * A reusable input for image URLs with validation and preview.
 */
export function ImageFieldInput({
  value = '',
  onChange,
  onValidChange,
  label,
  placeholder = 'e.g., assets/icons/sword.png or https://example.com/image.png',
  showPreview = true,
  previewSize = 'md',
  disabled = false,
  required = false,
  hint,
  fieldType = 'image',
  id,
  className = ''
}: ImageFieldInputProps) {
  // State for tracking image load errors
  const [imageLoadError, setImageLoadError] = useState(false);

  // Reset error state when URL changes
  useEffect(() => {
    setImageLoadError(false);
  }, [value]);

  // Notify parent of validity changes
  useEffect(() => {
    const isValid = isValidUrlPrefix(value);
    onValidChange?.(isValid);
  }, [value, onValidChange]);

  // Handle URL input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange?.(newValue);
  }, [onChange]);

  // Handle image load error
  const handleImageError = useCallback(() => {
    setImageLoadError(true);
  }, []);

  // Handle successful image load
  const handleImageLoad = useCallback(() => {
    setImageLoadError(false);
  }, []);

  // Open image in new tab
  const handleOpenExternal = useCallback(() => {
    if (value && isValidUrlPrefix(value)) {
      window.open(value, '_blank', 'noopener,noreferrer');
    }
  }, [value]);

  // Validation state
  const validationError = getValidationMessage(value);
  const isValid = !validationError;
  const hasValue = value.trim().length > 0;
  const showImagePreview = showPreview && hasValue && isValid;
  const previewDimensions = getPreviewDimensions(previewSize);

  // Default hint based on field type
  const defaultHint = fieldType === 'icon'
    ? 'Small icon (e.g., 32x32) displayed in lists and compact views'
    : 'Full-size image displayed in detail views';

  // Generate unique ID if not provided
  const inputId = id || `image-field-${fieldType}-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className={`image-field-input ${className}`}>
      {/* Label */}
      {label && (
        <label className="image-field-label" htmlFor={inputId}>
          {label}
          {required && <span className="image-field-required">*</span>}
          {!required && <span className="image-field-optional">(optional)</span>}
        </label>
      )}

      {/* Input Row with Preview */}
      <div className="image-field-input-row">
        {/* Preview Thumbnail */}
        {showPreview && (
          <div
            className={`image-field-preview image-field-preview-${previewSize}`}
            style={{
              width: previewDimensions.width,
              height: previewDimensions.height
            }}
          >
            {showImagePreview ? (
              <img
                src={value}
                alt="Preview"
                className="image-field-preview-img"
                onError={handleImageError}
                onLoad={handleImageLoad}
              />
            ) : (
              <ImageIcon
                size={previewSize === 'sm' ? 16 : previewSize === 'lg' ? 32 : 24}
                className="image-field-preview-placeholder"
              />
            )}
            {imageLoadError && hasValue && isValid && (
              <div className="image-field-preview-error">
                <AlertCircle size={12} />
              </div>
            )}
          </div>
        )}

        {/* Input Container */}
        <div className="image-field-input-container">
          <input
            id={inputId}
            type="text"
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            className={`image-field-text-input ${!isValid ? 'image-field-input-invalid' : ''}`}
            disabled={disabled}
            aria-invalid={!isValid}
            aria-describedby={validationError ? `${inputId}-error` : undefined}
          />

          {/* External Link Button */}
          {hasValue && isValid && (
            <button
              type="button"
              className="image-field-external-btn"
              onClick={handleOpenExternal}
              disabled={disabled}
              title="Open image in new tab"
              aria-label="Open image in new tab"
            >
              <ExternalLink size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="image-field-error" id={`${inputId}-error`} role="alert">
          <AlertCircle size={12} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Image Load Error (different from URL validation error) */}
      {imageLoadError && hasValue && isValid && !validationError && (
        <div className="image-field-warning" role="status">
          <AlertCircle size={12} />
          <span>Could not load image - check URL is correct</span>
        </div>
      )}

      {/* Hint Text */}
      {!validationError && (
        <div className="image-field-hint">
          <span>{hint || defaultHint}</span>
          <span className="image-field-hint-prefixes">
            Valid prefixes: <code>http://</code>, <code>https://</code>, <code>/</code>, <code>assets/</code>
          </span>
        </div>
      )}

      {/* Note about images not being uploaded */}
      <div className="image-field-note">
        Images are not uploaded to internet - provide URL or relative path
      </div>
    </div>
  );
}

export default ImageFieldInput;

// Export utilities
export { VALID_URL_PREFIXES, isValidUrlPrefix };
