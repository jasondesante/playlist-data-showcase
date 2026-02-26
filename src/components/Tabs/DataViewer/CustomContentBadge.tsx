/**
 * CustomContentBadge Component
 *
 * A visual indicator and action badge for custom content items in the DataViewerTab.
 * Part of DataViewerTab Custom Content Creation Upgrade - Phase 1.5.
 *
 * Features:
 * - Visual indicator showing "Custom" label
 * - Edit button (opens form modal with pre-populated data)
 * - Delete button (with confirmation dialog using ConfirmDialog component)
 * - Duplicate button (creates copy of custom item)
 *
 * @see docs/plans/DATAVIEWER_CUSTOM_CONTENT_PLAN.md for implementation details
 */

import React, { useState, useCallback } from 'react';
import { Pencil, Trash2, Copy, Star } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/Toast';
import type { ContentType } from '@/hooks/useContentCreator';
import './CustomContentBadge.css';

/**
 * Props for CustomContentBadge component
 */
export interface CustomContentBadgeProps {
  /** The category this item belongs to */
  category: ContentType;
  /** The item's unique identifier (name or id) */
  itemName: string;
  /** Callback when edit button is clicked */
  onEdit?: (category: ContentType, itemName: string) => void;
  /** Callback when delete button is clicked */
  onDelete?: (category: ContentType, itemName: string) => void;
  /** Callback when duplicate button is clicked */
  onDuplicate?: (category: ContentType, itemName: string) => void;
  /** Whether to show action buttons (edit, delete, duplicate) */
  showActions?: boolean;
  /** Whether the badge is in a compact mode (smaller, no actions) */
  compact?: boolean;
  /** Additional CSS class name */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

/**
 * Component for displaying a badge and action buttons for custom content items.
 *
 * @example
 * ```tsx
 * <CustomContentBadge
 *   category="equipment"
 *   itemName="Dragon Sword"
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   onDuplicate={handleDuplicate}
 *   showActions={true}
 * />
 * ```
 */
export function CustomContentBadge({
  category,
  itemName,
  onEdit,
  onDelete,
  onDuplicate,
  showActions = true,
  compact = false,
  className = '',
  size = 'sm'
}: CustomContentBadgeProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Handle edit click
  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(category, itemName);
  }, [category, itemName, onEdit]);

  // Handle delete click - show confirmation
  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirmDelete(true);
  }, []);

  // Handle delete confirmation
  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onDelete?.(category, itemName);
      showToast(`Deleted "${itemName}"`, 'success');
      setShowConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  }, [category, itemName, onDelete]);

  // Handle delete cancellation
  const handleCancelDelete = useCallback(() => {
    setShowConfirmDelete(false);
  }, []);

  // Handle duplicate click
  const handleDuplicateClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDuplicating(true);
    try {
      await onDuplicate?.(category, itemName);
      showToast(`Duplicated "${itemName}"`, 'success');
    } finally {
      setIsDuplicating(false);
    }
  }, [category, itemName, onDuplicate]);

  // Compact mode: just show the badge
  if (compact) {
    return (
      <span
        className={`custom-content-badge custom-content-badge-${size} custom-content-badge-compact ${className}`.trim()}
        title="Custom content"
      >
        <Star size={10} className="custom-content-badge-icon" />
        <span className="custom-content-badge-label">Custom</span>
      </span>
    );
  }

  // Full mode: badge with actions and confirmation dialog
  return (
    <>
      <div className={`custom-content-badge custom-content-badge-${size} ${className}`.trim()}>
        <span className="custom-content-badge-indicator">
          <Star size={10} className="custom-content-badge-icon" />
          <span className="custom-content-badge-label">Custom</span>
        </span>

        {showActions && (
          <div className="custom-content-badge-actions">
            {onEdit && (
              <button
                type="button"
                className="custom-content-badge-action-btn"
                onClick={handleEditClick}
                title="Edit this item"
                aria-label={`Edit ${itemName}`}
              >
                <Pencil size={12} />
              </button>
            )}

            {onDuplicate && (
              <button
                type="button"
                className="custom-content-badge-action-btn"
                onClick={handleDuplicateClick}
                disabled={isDuplicating}
                title="Duplicate this item"
                aria-label={`Duplicate ${itemName}`}
              >
                <Copy size={12} className={isDuplicating ? 'custom-content-badge-spinner' : ''} />
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                className="custom-content-badge-action-btn custom-content-badge-action-delete"
                onClick={handleDeleteClick}
                title="Delete this item"
                aria-label={`Delete ${itemName}`}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Confirmation dialog for delete action */}
      <ConfirmDialog
        isOpen={showConfirmDelete}
        title="Delete Custom Item"
        message={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}

export default CustomContentBadge;
