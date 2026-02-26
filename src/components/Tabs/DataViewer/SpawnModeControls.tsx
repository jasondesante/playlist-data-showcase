/**
 * SpawnModeControls Component
 *
 * Controls for managing spawn modes and weights for ExtensionManager categories.
 * Part of DataViewerTab Custom Content Creation Upgrade - Phase 1.4.
 *
 * Features:
 * - Mode selector buttons (Relative/Absolute/Default/Replace)
 * - Current mode indicator badge
 * - Reset button for current category
 * - Reset All button
 * - Weight editor (expandable advanced section)
 * - Import/Export buttons for custom content
 *
 * @see docs/plans/DATAVIEWER_CUSTOM_CONTENT_PLAN.md for implementation details
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Settings,
  RotateCcw,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  Weight,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSpawnMode, type SpawnMode, type SpawnCategory } from '@/hooks/useSpawnMode';
import { ExtensionManager } from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { showToast } from '@/components/ui/Toast';
import './SpawnModeControls.css';

/**
 * Mode configuration for display
 */
const MODE_CONFIG: Record<SpawnMode, { label: string; description: string; color: string }> = {
  relative: {
    label: 'Relative',
    description: 'Custom items added to default pool with weights',
    color: 'var(--cute-green)'
  },
  absolute: {
    label: 'Absolute',
    description: 'Only custom items can spawn',
    color: 'var(--cute-orange)'
  },
  default: {
    label: 'Default',
    description: 'All items have equal weight (1.0)',
    color: 'var(--cute-teal)'
  },
  replace: {
    label: 'Replace',
    description: 'Clear previous custom data before registering',
    color: 'var(--destructive)'
  }
};

/**
 * Props for SpawnModeControls component
 */
export interface SpawnModeControlsProps {
  /** The category to control spawn modes for */
  category: SpawnCategory;
  /** Label to display for the category */
  categoryLabel?: string;
  /** Whether to show the weight editor */
  showWeightEditor?: boolean;
  /** Whether to show import/export buttons */
  showImportExport?: boolean;
  /** Callback when mode changes */
  onModeChange?: (category: SpawnCategory, mode: SpawnMode) => void;
  /** Callback when category is reset */
  onResetCategory?: (category: SpawnCategory) => void;
  /** Callback when all categories are reset */
  onResetAll?: () => void;
  /** Additional CSS class name */
  className?: string;
}

/**
 * Component for managing spawn modes and weights for ExtensionManager categories.
 */
export function SpawnModeControls({
  category,
  categoryLabel,
  showWeightEditor = true,
  showImportExport = true,
  onModeChange,
  onResetCategory,
  onResetAll,
  className = ''
}: SpawnModeControlsProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss success and feedback messages after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  const {
    getMode,
    setMode,
    getWeights,
    setWeight,
    setWeights,
    resetCategory,
    resetAll,
    hasCustomData,
    getCategoryInfo
  } = useSpawnMode();

  // Get current mode (default to 'relative' if not set)
  const currentMode = getMode(category) || 'relative';
  const modeConfig = MODE_CONFIG[currentMode];

  // Get category info
  const categoryInfo = useMemo(() => getCategoryInfo(category), [getCategoryInfo, category]);
  const hasCustom = hasCustomData(category);
  const weights = getWeights(category);

  // Handle mode change
  const handleModeChange = useCallback((newMode: SpawnMode) => {
    setMode(category, newMode);
    onModeChange?.(category, newMode);
  }, [category, setMode, onModeChange]);

  // Handle reset category
  const handleResetCategory = useCallback(() => {
    if (window.confirm(`Reset all custom data for "${categoryLabel || category}"? This cannot be undone.`)) {
      resetCategory(category);
      onResetCategory?.(category);
      showToast(`Reset ${categoryLabel || category} to defaults`, 'success');
    }
  }, [category, categoryLabel, resetCategory, onResetCategory]);

  // Handle reset all
  const handleResetAll = useCallback(() => {
    if (window.confirm('Reset ALL custom data across ALL categories? This cannot be undone.')) {
      resetAll();
      onResetAll?.();
      showToast('Reset all categories to defaults', 'success');
    }
  }, [resetAll, onResetAll]);

  // Handle weight change
  const handleWeightChange = useCallback((itemName: string, value: number) => {
    const clampedValue = Math.max(0, Math.min(10, value));
    setWeight(category, itemName, clampedValue);
  }, [category, setWeight]);

  // Handle export
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setImportError(null);
    setFeedbackMessage(null);
    setSuccessMessage(null);
    try {
      const manager = ExtensionManager.getInstance();
      const customItems = manager.getCustom(category as any);

      if (!customItems || customItems.length === 0) {
        setFeedbackMessage('No custom items to export for this category.');
        showToast('No custom items to export', 'info');
        return;
      }

      const exportData = {
        category,
        mode: currentMode,
        weights,
        items: customItems,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${category.replace(/\./g, '_')}_custom_content.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMessage(`Exported ${customItems.length} items successfully.`);
      showToast(`Exported ${customItems.length} items from ${categoryLabel || category}`, 'success');
      logger.info('DataViewer', `Exported ${customItems.length} items from ${category}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export custom content.';
      setImportError(errorMessage);
      showToast(`Export failed: ${errorMessage}`, 'error');
      logger.error('DataViewer', 'Export failed', error);
    } finally {
      setIsExporting(false);
    }
  }, [category, currentMode, weights]);

  // Handle export all
  const handleExportAll = useCallback(async () => {
    setIsExporting(true);
    setImportError(null);
    setFeedbackMessage(null);
    setSuccessMessage(null);
    try {
      const manager = ExtensionManager.getInstance();
      const registeredCategories = manager.getRegisteredCategories();

      const exportData: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        categories: {}
      };

      let totalItems = 0;
      for (const cat of registeredCategories) {
        const customItems = manager.getCustom(cat as any);
        if (customItems && customItems.length > 0) {
          (exportData.categories as Record<string, unknown>)[cat] = {
            mode: getMode(cat as SpawnCategory),
            weights: getWeights(cat as SpawnCategory),
            items: customItems
          };
          totalItems += customItems.length;
        }
      }

      if (totalItems === 0) {
        setFeedbackMessage('No custom items found across any category.');
        showToast('No custom items to export', 'info');
        return;
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'all_custom_content.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMessage(`Exported ${totalItems} items from all categories successfully.`);
      showToast(`Exported ${totalItems} items from all categories`, 'success');
      logger.info('DataViewer', 'Exported all custom content');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export custom content.';
      setImportError(errorMessage);
      logger.error('DataViewer', 'Export all failed', error);
    } finally {
      setIsExporting(false);
    }
  }, [getMode, getWeights]);

  // Handle import file selection
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle import
  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate structure
      if (!data.category || !Array.isArray(data.items)) {
        throw new Error('Invalid import file format. Expected { category, items }');
      }

      // Check if category matches (warn if not)
      if (data.category !== category) {
        const proceed = window.confirm(
          `Import file is for category "${data.category}" but you're viewing "${category}". Import anyway?`
        );
        if (!proceed) {
          setIsImporting(false);
          return;
        }
      }

      // Import items
      const manager = ExtensionManager.getInstance();
      const importCategory = data.category as SpawnCategory;

      // Set mode if provided
      if (data.mode) {
        setMode(importCategory, data.mode);
      }

      // Set weights if provided
      if (data.weights) {
        setWeights(importCategory, data.weights);
      }

      // Register items
      manager.register(importCategory as any, data.items, { validate: true });

      setSuccessMessage(`Successfully imported ${data.items.length} items to ${importCategory}.`);
      showToast(`Imported ${data.items.length} items to ${importCategory}`, 'success');
      logger.info('DataViewer', `Imported ${data.items.length} items to ${importCategory}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setImportError(errorMessage);
      showToast(`Import failed: ${errorMessage}`, 'error');
      logger.error('DataViewer', 'Import failed', error);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [category, setMode, setWeights]);

  // Get weight entries sorted by name
  const weightEntries = useMemo(() => {
    return Object.entries(weights).sort(([a], [b]) => a.localeCompare(b));
  }, [weights]);

  return (
    <div className={`spawn-mode-controls ${className}`}>
      {/* Mode Selector Section */}
      <div className="spawn-mode-section">
        <div className="spawn-mode-header">
          <div className="spawn-mode-title">
            <Settings size={16} />
            <span>Spawn Mode</span>
          </div>
          {hasCustom && (
            <span className="spawn-mode-custom-badge">
              {categoryInfo.customCount} custom
            </span>
          )}
        </div>

        {/* Mode Buttons */}
        <div className="spawn-mode-buttons">
          {(Object.keys(MODE_CONFIG) as SpawnMode[]).map((mode) => {
            const config = MODE_CONFIG[mode];
            const isActive = currentMode === mode;

            return (
              <button
                key={mode}
                type="button"
                className={`spawn-mode-btn ${isActive ? 'spawn-mode-btn-active' : ''}`}
                onClick={() => handleModeChange(mode)}
                title={config.description}
              >
                <span
                  className="spawn-mode-btn-indicator"
                  style={{ backgroundColor: config.color }}
                />
                <span className="spawn-mode-btn-label">{config.label}</span>
              </button>
            );
          })}
        </div>

        {/* Current Mode Description */}
        <div className="spawn-mode-description">
          <span
            className="spawn-mode-description-indicator"
            style={{ backgroundColor: modeConfig.color }}
          />
          <span>{modeConfig.description}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="spawn-mode-actions">
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetCategory}
          disabled={!hasCustom}
          leftIcon={RotateCcw}
        >
          Reset Category
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetAll}
          leftIcon={AlertTriangle}
        >
          Reset All
        </Button>
      </div>

      {/* Advanced Section - Weight Editor */}
      {showWeightEditor && weightEntries.length > 0 && (
        <div className="spawn-mode-advanced">
          <button
            type="button"
            className="spawn-mode-advanced-toggle"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          >
            <Weight size={14} />
            <span>Weight Editor</span>
            <span className="spawn-mode-weight-count">
              {weightEntries.length} items
            </span>
            {isAdvancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {isAdvancedOpen && (
            <div className="spawn-mode-weight-editor">
              <p className="spawn-mode-weight-help">
                Adjust spawn weights (0 = never spawns, 1.0 = default, higher = more common)
              </p>
              <div className="spawn-mode-weight-list">
                {weightEntries.map(([itemName, weight]) => (
                  <div key={itemName} className="spawn-mode-weight-item">
                    <span className="spawn-mode-weight-name" title={itemName}>
                      {itemName}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={weight}
                      onChange={(e) => handleWeightChange(itemName, parseFloat(e.target.value) || 0)}
                      className="spawn-mode-weight-input"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import/Export Section */}
      {showImportExport && (
        <div className="spawn-mode-import-export">
          <div className="spawn-mode-io-buttons">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              isLoading={isExporting}
              disabled={!hasCustom}
              leftIcon={Download}
            >
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAll}
              isLoading={isExporting}
              leftIcon={Download}
            >
              Export All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportClick}
              isLoading={isImporting}
              leftIcon={Upload}
            >
              Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </div>

          {importError && (
            <div className="spawn-mode-import-error">
              <AlertTriangle size={14} />
              <span>{importError}</span>
            </div>
          )}

          {successMessage && (
            <div className="spawn-mode-success">
              <CheckCircle size={14} />
              <span>{successMessage}</span>
            </div>
          )}

          {feedbackMessage && (
            <div className="spawn-mode-feedback">
              <Info size={14} />
              <span>{feedbackMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SpawnModeControls;
