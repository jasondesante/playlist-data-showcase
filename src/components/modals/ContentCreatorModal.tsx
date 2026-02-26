/**
 * ContentCreatorModal Component
 *
 * A generic modal wrapper for content creation forms.
 * Provides a consistent UI pattern for creating various types of custom content.
 *
 * Part of DataViewerTab Custom Content Creation Upgrade - Phase 7.1
 *
 * Features:
 * - Full-screen overlay with backdrop blur
 * - Slide-in animation
 * - Close on backdrop click and Escape key
 * - Generic props to wrap any form component
 * - Form validation display
 * - Create/Cancel buttons with loading states
 * - Success feedback
 *
 * @see docs/plans/DATAVIEWER_CUSTOM_CONTENT_PLAN.md for implementation details
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import './ContentCreatorModal.css';

/**
 * Props for ContentCreatorModal component
 */
export interface ContentCreatorModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Modal title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Icon to display in header (Lucide icon component) */
  icon?: React.ComponentType<{ size?: number | string; className?: string }>;
  /** The form content to render inside the modal */
  children: React.ReactNode;
  /** Width variant */
  width?: 'sm' | 'md' | 'lg' | 'xl';
  /** Loading state for the entire modal */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Success message to display */
  successMessage?: string | null;
  /** Auto-close on success (milliseconds, 0 = disabled) */
  autoCloseOnSuccess?: number;
  /** Show built-in footer with Cancel button */
  showFooter?: boolean;
  /** Custom footer content */
  footerContent?: React.ReactNode;
}

/**
 * ContentCreatorModal Component
 *
 * Displays a modal for creating custom content with a consistent UI pattern.
 */
export function ContentCreatorModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  width = 'md',
  isLoading = false,
  error,
  successMessage,
  autoCloseOnSuccess = 0,
  showFooter = true,
  footerContent
}: ContentCreatorModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      // Add escape key listener
      document.addEventListener('keydown', handleKeyDown);
      // Focus the modal
      setTimeout(() => {
        modalRef.current?.focus();
      }, 100);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus
      previousActiveElement.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  // Auto-close on success
  useEffect(() => {
    if (successMessage && autoCloseOnSuccess > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseOnSuccess);
      return () => clearTimeout(timer);
    }
  }, [successMessage, autoCloseOnSuccess, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const widthClass = `content-creator-modal-width-${width}`;

  return (
    <div
      className="content-creator-modal-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="content-creator-modal-title"
    >
      <div
        ref={modalRef}
        className={`content-creator-modal-container ${widthClass}`}
        tabIndex={-1}
      >
        {/* Modal Header */}
        <div className="content-creator-modal-header">
          <div className="content-creator-modal-header-left">
            {Icon && (
              <div className="content-creator-modal-icon">
                <Icon size={20} />
              </div>
            )}
            <div className="content-creator-modal-header-text">
              <h1 id="content-creator-modal-title" className="content-creator-modal-title">
                {title}
              </h1>
              {subtitle && (
                <span className="content-creator-modal-subtitle">{subtitle}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="content-creator-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            disabled={isLoading}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="content-creator-modal-success">
            <CheckCircle size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="content-creator-modal-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Content */}
        <div className="content-creator-modal-content">
          {children}
        </div>

        {/* Modal Footer */}
        {showFooter && (
          <div className="content-creator-modal-footer">
            {footerContent || (
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ContentCreatorModal;
