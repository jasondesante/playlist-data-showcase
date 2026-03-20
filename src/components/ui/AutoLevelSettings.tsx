/**
 * AutoLevelSettings Component
 *
 * Task 2.2 of AUTO_LEVEL_GENERATION_UI_PLAN.md
 *
 * Collapsible/expandable section that appears when auto mode is toggled ON.
 * Position: Below the toggle, within Step 1 (Analyze)
 * - Preset dropdown (casual, standard, challenge, bass)
 * - Difficulty selector (Easy/Medium/Hard)
 * - Output mode selector (Composite/Low/Mid/High)
 * - Intensity threshold slider (0.0-1.0, default 0.2)
 * - Collapsible "Advanced Options" within this panel
 */

import { useState, useCallback } from 'react';
import { ChevronDown, Settings2, Sliders, RotateCcw } from 'lucide-react';
import { cn } from '../../utils/cn';
import { CollapsibleSection } from '../Party/CollapsibleSection';
import type {
    AutoLevelSettings as AutoLevelSettingsType,
    DifficultyLevel,
    RhythmPresetName,
    OutputMode,
} from '../../types/rhythmGeneration';
import { DEFAULT_AUTO_LEVEL_SETTINGS } from '../../types/rhythmGeneration';
import './AutoLevelSettings.css';

// Band type for color coding
type Band = 'low' | 'mid' | 'high';

// Constants for presets
const PRESETS: { value: RhythmPresetName; label: string; description: string }[] = [
    { value: 'casual', label: 'Casual', description: 'Relaxed difficulty with fewer beats' },
    { value: 'standard', label: 'Standard', description: 'Balanced difficulty for most tracks' },
    { value: 'challenge', label: 'Challenge', description: 'Higher difficulty for experienced players' },
    { value: 'bass', label: 'Bass', description: 'Focus on low-frequency patterns' },
];

const DIFFICULTIES: { value: DifficultyLevel; label: string; description: string }[] = [
    { value: 'easy', label: 'Easy', description: 'Simplified patterns for beginners' },
    { value: 'medium', label: 'Medium', description: 'Standard patterns for normal play' },
    { value: 'hard', label: 'Hard', description: 'Dense patterns for advanced players' },
];

const OUTPUT_MODES: { value: OutputMode; label: string; description: string; band?: Band }[] = [
    { value: 'composite', label: 'Composite', description: 'Combined output from all bands' },
    { value: 'low', label: 'Low Band', description: 'Low-frequency transients only', band: 'low' },
    { value: 'mid', label: 'Mid Band', description: 'Mid-frequency transients only', band: 'mid' },
    { value: 'high', label: 'High Band', description: 'High-frequency transients only', band: 'high' },
];

const BAND_COLORS: Record<Band, string> = {
    low: 'hsl(217, 91%, 60%)',
    mid: 'hsl(142, 76%, 36%)',
    high: 'hsl(25, 95%, 53%)',
};

export interface AutoLevelSettingsProps {
    /** Current settings object */
    settings: AutoLevelSettingsType;
    /** Callback when settings change */
    onChange: (settings: AutoLevelSettingsType) => void;
    /** Optional additional CSS classes */
    className?: string;
    /** Whether the settings should be disabled */
    disabled?: boolean;
    /** Whether the panel is initially collapsed */
    defaultCollapsed?: boolean;
}

/**
 * AutoLevelSettings Component
 *
 * Provides a collapsible settings panel for configuring automatic rhythm generation.
 * Appears below the AutoLevelToggle when auto mode is enabled.
 */
export function AutoLevelSettings({
    settings,
    onChange,
    className,
    disabled = false,
    defaultCollapsed = false,
}: AutoLevelSettingsProps) {
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

    const handleChange = useCallback(
        <K extends keyof AutoLevelSettingsType>(key: K, value: AutoLevelSettingsType[K]) => {
            if (disabled) return;
            onChange({ ...settings, [key]: value });
        },
        [disabled, onChange, settings]
    );

    const handlePresetChange = useCallback(
        (preset: RhythmPresetName) => {
            handleChange('preset', preset);
        },
        [handleChange]
    );

    const handleDifficultyChange = useCallback(
        (difficulty: DifficultyLevel) => {
            handleChange('difficulty', difficulty);
        },
        [handleChange]
    );

    const handleOutputModeChange = useCallback(
        (outputMode: OutputMode) => {
            handleChange('outputMode', outputMode);
        },
        [handleChange]
    );

    const handleIntensityChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = parseFloat(e.target.value);
            handleChange('intensityThreshold', value);
        },
        [handleChange]
    );

    const handleResetToDefaults = useCallback(() => {
        onChange({ ...DEFAULT_AUTO_LEVEL_SETTINGS });
    }, [onChange]);

    return (
        <div className={cn('auto-level-settings', className)}>
            <CollapsibleSection
                title="Auto Level Settings"
                subtitle="Configure rhythm generation"
                icon={<Settings2 size={18} />}
                defaultCollapsed={defaultCollapsed}
            >
                <div className="auto-level-settings__content">
                    {/* Preset Selection */}
                    <div className="auto-level-settings__form-group">
                        <label className="auto-level-settings__form-label">Preset</label>
                        <div className="auto-level-settings__preset-buttons">
                            {PRESETS.map((preset) => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    className={cn(
                                        'auto-level-settings__preset-button',
                                        settings.preset === preset.value &&
                                            'auto-level-settings__preset-button--active'
                                    )}
                                    onClick={() => handlePresetChange(preset.value)}
                                    disabled={disabled}
                                    title={preset.description}
                                >
                                    <span className="auto-level-settings__preset-button-text">
                                        {preset.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Difficulty Selection */}
                    <div className="auto-level-settings__form-group">
                        <label className="auto-level-settings__form-label">Difficulty</label>
                        <div className="auto-level-settings__difficulty-buttons">
                            {DIFFICULTIES.map((diff) => (
                                <button
                                    key={diff.value}
                                    type="button"
                                    className={cn(
                                        'auto-level-settings__difficulty-button',
                                        settings.difficulty === diff.value &&
                                            'auto-level-settings__difficulty-button--active'
                                    )}
                                    onClick={() => handleDifficultyChange(diff.value)}
                                    disabled={disabled}
                                    title={diff.description}
                                >
                                    <span className="auto-level-settings__difficulty-button-text">
                                        {diff.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Output Mode Selection */}
                    <div className="auto-level-settings__form-group">
                        <label className="auto-level-settings__form-label">Output Mode</label>
                        <div className="auto-level-settings__output-mode-buttons">
                            {OUTPUT_MODES.map((mode) => (
                                <button
                                    key={mode.value}
                                    type="button"
                                    className={cn(
                                        'auto-level-settings__output-mode-button',
                                        settings.outputMode === mode.value &&
                                            'auto-level-settings__output-mode-button--active',
                                        mode.band && `auto-level-settings__output-mode-button--${mode.band}`
                                    )}
                                    onClick={() => handleOutputModeChange(mode.value)}
                                    disabled={disabled}
                                    title={mode.description}
                                >
                                    {mode.band && (
                                        <span
                                            className="auto-level-settings__band-dot"
                                            style={{ backgroundColor: BAND_COLORS[mode.band] }}
                                        />
                                    )}
                                    <span className="auto-level-settings__output-mode-button-text">
                                        {mode.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Intensity Threshold Slider */}
                    <div className="auto-level-settings__form-group">
                        <div className="auto-level-settings__slider-header">
                            <label className="auto-level-settings__slider-label">
                                Intensity Threshold
                            </label>
                            <span className="auto-level-settings__slider-value">
                                {settings.intensityThreshold.toFixed(2)}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={settings.intensityThreshold}
                            onChange={handleIntensityChange}
                            className="auto-level-settings__slider"
                            disabled={disabled}
                            aria-label="Intensity threshold"
                        />
                        <div className="auto-level-settings__slider-labels">
                            <span>Low (0.0)</span>
                            <span>High (1.0)</span>
                        </div>
                        <p className="auto-level-settings__slider-help">
                            Filter out transients below this threshold. Higher values filter more
                            transients.
                        </p>
                    </div>

                    {/* Advanced Options Toggle */}
                    <div className="auto-level-settings__advanced-toggle">
                        <button
                            type="button"
                            className={cn(
                                'auto-level-settings__advanced-toggle-btn',
                                isAdvancedOpen && 'auto-level-settings__advanced-toggle-btn--active'
                            )}
                            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                            aria-expanded={isAdvancedOpen}
                            disabled={disabled}
                        >
                            <Sliders size={16} />
                            <span>Advanced Options</span>
                            <ChevronDown
                                size={18}
                                className={cn(
                                    'auto-level-settings__advanced-chevron',
                                    isAdvancedOpen && 'auto-level-settings__advanced-chevron--rotated'
                                )}
                            />
                        </button>

                        {isAdvancedOpen && (
                            <div className="auto-level-settings__advanced-content">
                                {/* Band Colors Preview */}
                                <div className="auto-level-settings__section">
                                    <h4 className="auto-level-settings__section-title">
                                        Band Colors Reference
                                    </h4>
                                    <div className="auto-level-settings__band-colors">
                                        {(['low', 'mid', 'high'] as const).map((band) => (
                                            <div
                                                key={band}
                                                className="auto-level-settings__band-color-item"
                                            >
                                                <span
                                                    className="auto-level-settings__band-color-dot"
                                                    style={{ backgroundColor: BAND_COLORS[band] }}
                                                />
                                                <span className="auto-level-settings__band-color-label">
                                                    {band.charAt(0).toUpperCase() + band.slice(1)}{' '}
                                                    Band
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Info Text */}
                                <p className="auto-level-settings__advanced-info">
                                    Advanced options like seed, verbose logging, and cache settings
                                    are available programmatically via the{' '}
                                    <code>RhythmGenerator</code> API.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Reset to Defaults */}
                    <div className="auto-level-settings__reset">
                        <button
                            type="button"
                            className="auto-level-settings__reset-btn"
                            onClick={handleResetToDefaults}
                            disabled={disabled}
                        >
                            <RotateCcw size={14} />
                            <span>Reset to Defaults</span>
                        </button>
                    </div>
                </div>
            </CollapsibleSection>
        </div>
    );
}

export default AutoLevelSettings;
