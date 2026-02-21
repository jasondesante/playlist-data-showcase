/**
 * CombatExportButton Component
 *
 * Reusable button for exporting combat data with copy/download options.
 * Part of Combat Data Export System - Phase 1.
 *
 * Features:
 * - Copy to clipboard or download as file
 * - Visual feedback via toast notifications
 * - Multiple sizes: icon-only, compact, full
 * - Loading state for async operations
 */

import { useState, useCallback } from 'react';
import { Copy, Download, Loader2 } from 'lucide-react';
import { Button } from './Button';
import type { ExportAction } from '../../utils/combatDataExporter';

// Re-export ExportAction for convenience
export type { ExportAction } from '../../utils/combatDataExporter';

import './CombatExportButton.css';

export type ExportButtonSize = 'icon' | 'compact' | 'full';
export type ExportButtonVariant = 'copy' | 'download' | 'toggle';

export interface CombatExportButtonProps {
  /** Handler called when export is triggered - receives the action type */
  onExport: (action: ExportAction) => Promise<boolean> | boolean;
  /** Size variant of the button */
  size?: ExportButtonSize;
  /** Whether to show copy, download, or a toggle button */
  variant?: ExportButtonVariant;
  /** Label for the button (used in compact/full sizes) */
  label?: string;
  /** Tooltip text for icon-only mode */
  tooltip?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional CSS class */
  className?: string;
}

export function CombatExportButton({
  onExport,
  size = 'compact',
  variant = 'toggle',
  label = 'Export',
  tooltip,
  disabled = false,
  className = '',
}: CombatExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [toggleMode, setToggleMode] = useState<ExportAction>('copy');

  const handleExport = useCallback(async (action: ExportAction) => {
    if (isLoading || disabled) return;

    setIsLoading(true);
    try {
      await onExport(action);
    } finally {
      setIsLoading(false);
    }
  }, [onExport, isLoading, disabled]);

  const handleToggleClick = useCallback(() => {
    handleExport(toggleMode);
  }, [handleExport, toggleMode]);

  const cycleToggleMode = useCallback(() => {
    setToggleMode(prev => prev === 'copy' ? 'download' : 'copy');
  }, []);

  // Icon-only size: Just an icon button
  if (size === 'icon') {
    if (variant === 'toggle') {
      return (
        <div className={`export-button-wrapper export-button-icon ${className}`} title={tooltip}>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleClick}
            disabled={disabled || isLoading}
            className="export-button-main"
            aria-label={`${toggleMode === 'copy' ? 'Copy' : 'Download'} ${label}`}
          >
            {isLoading ? (
              <Loader2 className="export-icon spinning" />
            ) : toggleMode === 'copy' ? (
              <Copy className="export-icon" />
            ) : (
              <Download className="export-icon" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={cycleToggleMode}
            disabled={disabled || isLoading}
            className="export-button-toggle"
            aria-label={`Switch to ${toggleMode === 'copy' ? 'download' : 'copy'} mode`}
          >
            {toggleMode === 'copy' ? (
              <Download className="export-icon-small" />
            ) : (
              <Copy className="export-icon-small" />
            )}
          </Button>
        </div>
      );
    }

    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleExport(variant)}
        disabled={disabled || isLoading}
        className={`export-button-single ${className}`}
        title={tooltip}
        aria-label={`${variant === 'copy' ? 'Copy' : 'Download'} ${label}`}
      >
        {isLoading ? (
          <Loader2 className="export-icon spinning" />
        ) : variant === 'copy' ? (
          <Copy className="export-icon" />
        ) : (
          <Download className="export-icon" />
        )}
      </Button>
    );
  }

  // Compact size: Small button with icon and optional label
  if (size === 'compact') {
    if (variant === 'toggle') {
      return (
        <div className={`export-button-wrapper export-button-compact ${className}`}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleToggleClick}
            disabled={disabled || isLoading}
            leftIcon={isLoading ? Loader2 : (toggleMode === 'copy' ? Copy : Download)}
            className="export-button-main"
          >
            {isLoading ? 'Exporting...' : label}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={cycleToggleMode}
            disabled={disabled || isLoading}
            className="export-button-toggle"
            title={`Switch to ${toggleMode === 'copy' ? 'download' : 'copy'}`}
          >
            {toggleMode === 'copy' ? (
              <Download className="export-icon-small" />
            ) : (
              <Copy className="export-icon-small" />
            )}
          </Button>
        </div>
      );
    }

    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => handleExport(variant)}
        disabled={disabled || isLoading}
        leftIcon={isLoading ? Loader2 : (variant === 'copy' ? Copy : Download)}
        className={className}
      >
        {isLoading ? 'Exporting...' : label}
      </Button>
    );
  }

  // Full size: Button group with both copy and download options
  return (
    <div className={`export-button-wrapper export-button-full ${className}`}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => handleExport('copy')}
        disabled={disabled || isLoading}
        leftIcon={isLoading ? Loader2 : Copy}
        className="export-button-copy"
      >
        {isLoading ? '...' : 'Copy'}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => handleExport('download')}
        disabled={disabled || isLoading}
        leftIcon={isLoading ? Loader2 : Download}
        className="export-button-download"
      >
        {isLoading ? '...' : 'Download'}
      </Button>
      <span className="export-button-label">{label}</span>
    </div>
  );
}

export default CombatExportButton;
