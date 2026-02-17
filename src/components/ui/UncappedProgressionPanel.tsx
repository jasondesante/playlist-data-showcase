/**
 * Uncapped Progression Panel Component
 *
 * Collapsible panel for configuring XP formula presets for uncapped mode characters.
 * Only visible when the active character has gameMode === 'uncapped'.
 *
 * Features:
 * - Collapsible panel (collapsed by default)
 * - Preset selection cards in a 2x2 grid
 * - XPCurveChart visualization
 * - Apply button to set config via engine
 *
 * @see LevelUpProcessor.setUncappedConfig from playlist-data-engine
 */

import { useState, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronRight, Sparkles, Check } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Card } from './Card';
import { Button } from './Button';
import { XPCurveChart } from './XPCurveChart';
import { showToast } from './Toast';
import { XP_FORMULA_PRESETS, getXPFormulaPresetById } from '../../constants/xpFormulaPresets';
import { LevelUpProcessor } from 'playlist-data-engine';
import { useCharacterStore } from '../../store/characterStore';
import type { CharacterSheet } from '../../types';
import '../../styles/components/UncappedProgressionPanel.css';

export interface UncappedProgressionPanelProps {
  /** The character to configure (should have gameMode === 'uncapped') */
  character: CharacterSheet;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * UncappedProgressionPanel
 *
 * A collapsible panel that allows users to select and apply XP formula presets
 * for uncapped mode characters. The panel is collapsed by default and expands
 * to show preset options and an XP curve chart.
 */
export function UncappedProgressionPanel({
  character,
  className,
}: UncappedProgressionPanelProps) {
  // Get current config from store
  const { getCharacterUncappedConfig, setCharacterUncappedConfig } = useCharacterStore();

  // Panel collapsed state (collapsed by default)
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Currently selected preset (local state, not applied yet)
  const currentStoredPresetId = getCharacterUncappedConfig(character.seed);
  const [selectedPresetId, setSelectedPresetId] = useState(currentStoredPresetId);

  // Track if there are unsaved changes
  const hasChanges = selectedPresetId !== currentStoredPresetId;

  // Sync selectedPresetId when character changes
  // Also apply the stored preset to the engine so XP calculations use the correct formula
  useEffect(() => {
    const storedPresetId = getCharacterUncappedConfig(character.seed);
    setSelectedPresetId(storedPresetId);

    // Apply the stored preset to the engine when switching characters
    const preset = getXPFormulaPresetById(storedPresetId);
    if (preset) {
      try {
        LevelUpProcessor.setUncappedConfig({
          xpFormula: preset.xpFormula,
          proficiencyBonusFormula: preset.proficiencyFormula,
        });
        console.log(`[UncappedProgression] Auto-applied preset "${preset.name}" for character ${character.name} on switch`);
      } catch (error) {
        console.error('[UncappedProgression] Failed to auto-apply preset on character switch:', error);
      }
    }
  }, [character.seed, character.name, getCharacterUncappedConfig]);

  // Handle preset selection
  const handlePresetSelect = useCallback((presetId: string) => {
    setSelectedPresetId(presetId);
  }, []);

  // Handle apply changes
  const handleApplyChanges = useCallback(() => {
    const preset = getXPFormulaPresetById(selectedPresetId);
    if (!preset) {
      showToast('Invalid preset selected', 'error');
      return;
    }

    try {
      // Apply to engine
      LevelUpProcessor.setUncappedConfig({
        xpFormula: preset.xpFormula,
        proficiencyBonusFormula: preset.proficiencyFormula,
      });

      // Persist to store
      setCharacterUncappedConfig(character.seed, selectedPresetId);

      // Show success notification
      showToast(`${preset.name} formula applied!`, 'success');

      // Log for debugging
      console.log(`[UncappedProgression] Applied preset "${preset.name}" for character ${character.name}`);
    } catch (error) {
      console.error('[UncappedProgression] Failed to apply preset:', error);
      showToast('Failed to apply preset', 'error');
    }
  }, [selectedPresetId, character.seed, character.name, setCharacterUncappedConfig]);

  // Toggle panel collapse
  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  // Get currently selected preset for display
  const selectedPreset = getXPFormulaPresetById(selectedPresetId) || XP_FORMULA_PRESETS[0];

  return (
    <Card
      variant="default"
      padding="none"
      className={cn('uncapped-progression-panel', className)}
    >
      {/* Header - Always visible */}
      <button
        type="button"
        className="uncapped-panel-header"
        onClick={toggleCollapse}
        aria-expanded={!isCollapsed}
        aria-controls="uncapped-panel-content"
      >
        <div className="uncapped-panel-header-left">
          <div className="uncapped-panel-icon">
            <Sparkles size={18} />
          </div>
          <div className="uncapped-panel-header-text">
            <h3 className="uncapped-panel-title">Uncapped Progression Settings</h3>
            <span className="uncapped-panel-subtitle">
              Current: {selectedPreset.name}
            </span>
          </div>
        </div>
        <div className="uncapped-panel-header-right">
          {hasChanges && (
            <span className="uncapped-panel-changes-badge">Unsaved</span>
          )}
          <span className="uncapped-panel-chevron">
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
          </span>
        </div>
      </button>

      {/* Content - Collapsible */}
      {!isCollapsed && (
        <div id="uncapped-panel-content" className="uncapped-panel-content">
          {/* Description */}
          <p className="uncapped-panel-description">
            Choose how XP scales beyond Level 20. Each preset defines a different progression curve.
          </p>

          {/* Preset Cards Grid */}
          <div className="uncapped-presets-grid">
            {XP_FORMULA_PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              const isCurrent = currentStoredPresetId === preset.id;

              return (
                <button
                  key={preset.id}
                  type="button"
                  className={cn(
                    'uncapped-preset-card',
                    isSelected && 'uncapped-preset-selected',
                    isCurrent && 'uncapped-preset-current'
                  )}
                  onClick={() => handlePresetSelect(preset.id)}
                  aria-pressed={isSelected}
                >
                  <div className="uncapped-preset-header">
                    <span
                      className="uncapped-preset-color"
                      style={{ backgroundColor: preset.chartColor }}
                    />
                    <span className="uncapped-preset-name">{preset.name}</span>
                    {isCurrent && (
                      <span className="uncapped-preset-current-badge">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                  <p className="uncapped-preset-description">{preset.description}</p>
                </button>
              );
            })}
          </div>

          {/* XP Curve Chart */}
          <div className="uncapped-chart-section">
            <h4 className="uncapped-chart-title">XP Curve Preview</h4>
            <XPCurveChart
              presets={XP_FORMULA_PRESETS}
              selectedId={selectedPresetId}
              maxLevel={30}
            />
          </div>

          {/* Apply Button */}
          {hasChanges && (
            <div className="uncapped-panel-actions">
              <Button
                variant="primary"
                size="lg"
                onClick={handleApplyChanges}
                className="uncapped-apply-button"
              >
                Apply Changes
              </Button>
              <p className="uncapped-apply-hint">
                This will update the XP progression for all uncapped characters.
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default UncappedProgressionPanel;
