/**
 * ConfirmDialog Component
 *
 * A reusable confirmation modal dialog for destructive or important actions.
 * Part of DataViewerTab Custom Content Creation Upgrade - Phase 1.6.
 *
 * Features:
 * - Reusable confirmation modal with customizable title, message, and actions
 * - Destructive action styling (red button for delete/reset)
 * - Cancel action for non-destructive dismissal
 * - Close on backdrop click and Escape key
 * - Loading state support
 * - Accessible with proper ARIA attributes
 *
 * Used for:
 * - Delete item confirmation
 * - Reset category confirmation
 * - Reset all confirmation
 * - Import overwrite confirmation
 *
 * @see docs/plans/DATAVIEWER_CUSTOM_CONTENT_PLAN.md for implementation details
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { AlertTriangle, X, LucideIcon } from 'lucide-react';
import { Button } from './Button';
import './ConfirmDialog.css';

/**
 * Props for ConfirmDialog component
 */
export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Dialog title */
  title: string;
  /** Dialog message/description */
  message: string;
  /** Text for the confirm button (e.g., "Delete", "Reset") */
  confirmText?: string;
  /** Text for the cancel button */
  cancelText?: string;
  /** Whether this is a destructive action (shows red confirm button) */
  isDestructive?: boolean;
  /** Whether the confirm action is currently loading */
  isLoading?: boolean;
  /** Whether the dialog can be closed by clicking outside */
  canCloseOnBackdrop?: boolean;
  /** Whether the dialog can be closed by pressing Escape */
  canCloseOnEscape?: boolean;
  /** Icon to display (defaults to AlertTriangle for destructive) */
  icon?: LucideIcon;
  /** Callback when confirm button is clicked */
  onConfirm: () => void | Promise<void>;
  /** Callback when cancel button is clicked or dialog is closed */
  onCancel: () => void;
  /** Additional CSS class name */
  className?: string;
}

/**
 * Component for displaying a confirmation dialog.
 *
 * @example
 * ```tsx
 * // Destructive action (delete)
 * <ConfirmDialog
 *   isOpen={showConfirm}
 *   title="Delete Item"
 *   message="Are you sure you want to delete this item? This action cannot be undone."
 *   confirmText="Delete"
 *   isDestructive={true}
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowConfirm(false)}
 * />
 *
 * // Non-destructive action
 * <ConfirmDialog
 *   isOpen={showConfirm}
 *   title="Unsaved Changes"
 *   message="You have unsaved changes. Do you want to continue?"
 *   confirmText="Continue"
 *   isDestructive={false}
 *   onConfirm={handleContinue}
 *   onCancel={() => setShowConfirm(false)}
 * />
 * ```
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false,
  canCloseOnBackdrop = true,
  canCloseOnEscape = true,
  icon: Icon = AlertTriangle,
  onConfirm,
  onCancel,
  className = ''
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (canCloseOnBackdrop && e.target === e.currentTarget) {
      onCancel();
    }
  }, [canCloseOnBackdrop, onCancel]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && canCloseOnEscape) {
      onCancel();
    }
  }, [canCloseOnEscape, onCancel]);

  // Handle confirm click
  const handleConfirmClick = useCallback(async () => {
    await onConfirm();
  }, [onConfirm]);

  // Focus the confirm button when dialog opens
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      // Small delay to ensure the dialog is visible before focusing
      const timeoutId = setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Trap focus within the dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleDocumentKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canCloseOnEscape) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => document.removeEventListener('keydown', handleDocumentKeyDown);
  }, [isOpen, canCloseOnEscape, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className={`confirm-dialog-overlay ${className}`.trim()}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div
        ref={dialogRef}
        className={`confirm-dialog-container ${isDestructive ? 'confirm-dialog-destructive' : ''}`}
      >
        {/* Close button */}
        <button
          type="button"
          className="confirm-dialog-close-btn"
          onClick={onCancel}
          aria-label="Close dialog"
          disabled={isLoading}
        >
          <X size={18} strokeWidth={2} />
        </button>

        {/* Content */}
        <div className="confirm-dialog-content">
          {/* Icon */}
          <div className={`confirm-dialog-icon ${isDestructive ? 'confirm-dialog-icon-destructive' : ''}`}>
            <Icon size={24} />
          </div>

          {/* Title */}
          <h2 id="confirm-dialog-title" className="confirm-dialog-title">
            {title}
          </h2>

          {/* Message */}
          <p id="confirm-dialog-message" className="confirm-dialog-message">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="confirm-dialog-actions">
          <Button
            variant="secondary"
            size="md"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            ref={confirmButtonRef}
            variant={isDestructive ? 'destructive' : 'primary'}
            size="md"
            onClick={handleConfirmClick}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
