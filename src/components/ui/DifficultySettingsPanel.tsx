/**
 * DifficultySettingsPanel Component
 *
 * A modal/panel for configuring beat tap evaluation difficulty settings.
 * Part of Task 3.3: Create DifficultySettingsPanel Component
 *
 * Features:
 * - Collapsible/expandable panel with close button
 * - Contains DifficultySelector for preset selection
 * - Shows CustomThresholdEditor when "Custom" is selected
 * - Preview of current thresholds in a visual format
 * - Connected to beatDetectionStore for state management
 */
import { useEffect, useCallback, useRef } from 'react';
import { X, Settings, RotateCcw } from 'lucide-react';
import './DifficultySettingsPanel.css';
import { DifficultySelector } from './DifficultySelector';
import { CustomThresholdEditor } from './CustomThresholdEditor';
import {
  useBeatDetectionStore,
  useDifficultySettings,
  useAccuracyThresholds,
  useIgnoreKeyRequirements,
} from '../../store/beatDetectionStore';
import type { AccuracyThresholds, DifficultyPreset } from '../../types';

export interface DifficultySettingsPanelProps {
  /** Whether the panel is currently open */
  isOpen: boolean;
  /** Callback when panel should close */
  onClose: () => void;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Convert seconds to milliseconds for display
 */
const toMilliseconds = (seconds: number): number => Math.round(seconds * 1000);

/**
 * Get color class for accuracy level
 */
const getAccuracyColorClass = (level: keyof AccuracyThresholds): string => {
  const colors: Record<keyof AccuracyThresholds, string> = {
    perfect: 'difficulty-panel__threshold-dot--perfect',
    great: 'difficulty-panel__threshold-dot--great',
    good: 'difficulty-panel__threshold-dot--good',
    ok: 'difficulty-panel__threshold-dot--ok',
  };
  return colors[level];
};

/**
 * DifficultySettingsPanel Component
 *
 * Renders a modal panel for configuring difficulty settings.
 * Connects to the beatDetectionStore for state management.
 */
export function DifficultySettingsPanel({
  isOpen,
  onClose,
  className = '',
}: DifficultySettingsPanelProps) {
  // Store state and actions
  const difficultySettings = useDifficultySettings();
  const currentThresholds = useAccuracyThresholds();
  const ignoreKeyRequirements = useIgnoreKeyRequirements();
  const setDifficultyPreset = useBeatDetectionStore((state) => state.actions.setDifficultyPreset);
  const setCustomThreshold = useBeatDetectionStore((state) => state.actions.setCustomThreshold);
  const resetDifficultySettings = useBeatDetectionStore((state) => state.actions.resetDifficultySettings);
  const setIgnoreKeyRequirements = useBeatDetectionStore((state) => state.actions.setIgnoreKeyRequirements);

  // Ref for panel content (for focus management)
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * Handle preset change
   */
  const handlePresetChange = useCallback((preset: DifficultyPreset) => {
    setDifficultyPreset(preset);
  }, [setDifficultyPreset]);

  /**
   * Handle custom threshold change
   */
  const handleCustomThresholdChange = useCallback((key: keyof AccuracyThresholds, value: number) => {
    setCustomThreshold(key, value);
  }, [setCustomThreshold]);

  /**
   * Handle reset to defaults
   */
  const handleReset = useCallback(() => {
    resetDifficultySettings();
  }, [resetDifficultySettings]);

  /**
   * Handle ignore key requirements toggle
   */
  const handleIgnoreKeyRequirementsToggle = useCallback(() => {
    setIgnoreKeyRequirements(!ignoreKeyRequirements);
  }, [setIgnoreKeyRequirements, ignoreKeyRequirements]);

  /**
   * Handle keyboard events for accessibility
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  /**
   * Focus management - focus close button when panel opens
   */
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  /**
   * Prevent body scroll when panel is open
   */
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

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  const isCustomMode = difficultySettings.preset === 'custom';

  return (
    <div className={`difficulty-panel__overlay ${className}`} onClick={onClose}>
      <div
        ref={panelRef}
        className="difficulty-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="difficulty-panel-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="difficulty-panel__header">
          <div className="difficulty-panel__header-left">
            <Settings className="difficulty-panel__header-icon" />
            <h2 id="difficulty-panel-title" className="difficulty-panel__title">
              Difficulty Settings
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="difficulty-panel__close-btn"
            onClick={onClose}
            aria-label="Close settings panel"
          >
            <X />
          </button>
        </div>

        {/* Content */}
        <div className="difficulty-panel__content">
          {/* Preset Selector */}
          <section className="difficulty-panel__section">
            <h3 className="difficulty-panel__section-title">Select Difficulty</h3>
            <DifficultySelector
              value={difficultySettings.preset}
              onChange={handlePresetChange}
            />
          </section>

          {/* Custom Threshold Editor (only shown when custom is selected) */}
          {isCustomMode && (
            <section className="difficulty-panel__section">
              <h3 className="difficulty-panel__section-title">Custom Thresholds</h3>
              <CustomThresholdEditor
                thresholds={difficultySettings.customThresholds}
                onChange={handleCustomThresholdChange}
              />
            </section>
          )}

          {/* Current Thresholds Preview */}
          <section className="difficulty-panel__section">
            <h3 className="difficulty-panel__section-title">
              {isCustomMode ? 'Active Thresholds' : 'Current Thresholds'}
            </h3>
            <div className="difficulty-panel__thresholds-preview">
              <div className="difficulty-panel__thresholds-list">
                {(Object.keys(currentThresholds) as (keyof AccuracyThresholds)[]).map((level) => (
                  <div key={level} className="difficulty-panel__threshold-item">
                    <div className={`difficulty-panel__threshold-dot ${getAccuracyColorClass(level)}`} />
                    <span className="difficulty-panel__threshold-label">{level}</span>
                    <span className="difficulty-panel__threshold-value">
                      ±{toMilliseconds(currentThresholds[level])}ms
                    </span>
                  </div>
                ))}
              </div>

              {/* Visual representation bar */}
              <div className="difficulty-panel__threshold-bar">
                <div
                  className="difficulty-panel__threshold-segment difficulty-panel__threshold-segment--perfect"
                  style={{ width: `${(currentThresholds.perfect / currentThresholds.ok) * 100}%` }}
                  title={`Perfect: ±${toMilliseconds(currentThresholds.perfect)}ms`}
                />
                <div
                  className="difficulty-panel__threshold-segment difficulty-panel__threshold-segment--great"
                  style={{ width: `${((currentThresholds.great - currentThresholds.perfect) / currentThresholds.ok) * 100}%` }}
                  title={`Great: ±${toMilliseconds(currentThresholds.great)}ms`}
                />
                <div
                  className="difficulty-panel__threshold-segment difficulty-panel__threshold-segment--good"
                  style={{ width: `${((currentThresholds.good - currentThresholds.great) / currentThresholds.ok) * 100}%` }}
                  title={`Good: ±${toMilliseconds(currentThresholds.good)}ms`}
                />
                <div
                  className="difficulty-panel__threshold-segment difficulty-panel__threshold-segment--ok"
                  style={{ width: `${((currentThresholds.ok - currentThresholds.good) / currentThresholds.ok) * 100}%` }}
                  title={`OK: ±${toMilliseconds(currentThresholds.ok)}ms`}
                />
              </div>
            </div>
          </section>

          {/* Key Requirements Section */}
          <section className="difficulty-panel__section">
            <h3 className="difficulty-panel__section-title">Key Requirements</h3>
            <div className="difficulty-panel__toggle-row">
              <div className="difficulty-panel__toggle-info">
                <div className="difficulty-panel__toggle-label">Ignore Key Requirements</div>
                <div className="difficulty-panel__toggle-description">
                  Easy mode - timing only, no key matching required
                </div>
              </div>
              <button
                type="button"
                onClick={handleIgnoreKeyRequirementsToggle}
                className={`difficulty-panel__toggle ${ignoreKeyRequirements ? 'difficulty-panel__toggle--active' : ''}`}
                role="switch"
                aria-checked={ignoreKeyRequirements}
                aria-label="Ignore key requirements"
              >
                <span className="difficulty-panel__toggle-slider" />
              </button>
            </div>
          </section>

          {/* Reset Button */}
          <div className="difficulty-panel__actions">
            <button
              type="button"
              className="difficulty-panel__reset-btn"
              onClick={handleReset}
              aria-label="Reset to default settings"
            >
              <RotateCcw className="difficulty-panel__reset-icon" />
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DifficultySettingsPanel;
