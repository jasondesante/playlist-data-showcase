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
 * - Per-band transient detection configuration
 */

import { useState, useCallback } from 'react';
import { ChevronDown, Settings2, Sliders, RotateCcw, Info, Waves } from 'lucide-react';
import { cn } from '../../utils/cn';
import { CollapsibleSection } from '../Party/CollapsibleSection';
import type {
    AutoLevelSettings as AutoLevelSettingsType,
    DifficultyLevel,
    RhythmPresetName,
    OutputMode,
    BandTransientConfig,
    BandTransientConfigOverrides,
} from '../../types/rhythmGeneration';
import {
    DEFAULT_AUTO_LEVEL_SETTINGS,
    DEFAULT_BAND_TRANSIENT_CONFIG,
} from '../../types/rhythmGeneration';
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

const BAND_INFO: Record<Band, { freq: string; description: string }> = {
    low: { freq: '20-500 Hz', description: 'Kick drums, bass' },
    mid: { freq: '500-2000 Hz', description: 'Vocals, snare body' },
    high: { freq: '2000-20000 Hz', description: 'Hi-hats, cymbals' },
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
    const [isTransientConfigOpen, setIsTransientConfigOpen] = useState(false);

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

    const handleUsePerBandDefaultsChange = useCallback(
        (usePerBandDefaults: boolean) => {
            if (usePerBandDefaults) {
                // When enabling per-band defaults, clear custom config
                onChange({
                    ...settings,
                    usePerBandDefaults: true,
                    transientConfig: undefined,
                });
            } else {
                // When disabling, initialize with current defaults
                onChange({
                    ...settings,
                    usePerBandDefaults: false,
                    transientConfig: {
                        low: { ...DEFAULT_BAND_TRANSIENT_CONFIG.low },
                        mid: { ...DEFAULT_BAND_TRANSIENT_CONFIG.mid },
                        high: { ...DEFAULT_BAND_TRANSIENT_CONFIG.high },
                    },
                });
            }
        },
        [onChange, settings]
    );

    const handleBandConfigChange = useCallback(
        (band: Band, config: Partial<BandTransientConfig>) => {
            if (disabled || settings.usePerBandDefaults) return;

            const currentConfig = settings.transientConfig || {};
            const newConfig: BandTransientConfigOverrides = {
                ...currentConfig,
                [band]: {
                    ...DEFAULT_BAND_TRANSIENT_CONFIG[band],
                    ...currentConfig[band],
                    ...config,
                },
            };

            handleChange('transientConfig', newConfig);
        },
        [disabled, settings, handleChange]
    );

    const getBandConfig = useCallback(
        (band: Band): BandTransientConfig => {
            if (settings.usePerBandDefaults || !settings.transientConfig?.[band]) {
                return DEFAULT_BAND_TRANSIENT_CONFIG[band];
            }
            return {
                ...DEFAULT_BAND_TRANSIENT_CONFIG[band],
                ...settings.transientConfig[band],
            };
        },
        [settings]
    );

    const handleResetToDefaults = useCallback(() => {
        onChange({ ...DEFAULT_AUTO_LEVEL_SETTINGS });
        setIsTransientConfigOpen(false);
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
                                {/* Transient Detection Configuration */}
                                <div className="auto-level-settings__section">
                                    <button
                                        type="button"
                                        className={cn(
                                            'auto-level-settings__subsection-toggle',
                                            isTransientConfigOpen && 'auto-level-settings__subsection-toggle--active'
                                        )}
                                        onClick={() => setIsTransientConfigOpen(!isTransientConfigOpen)}
                                        disabled={disabled}
                                    >
                                        <Waves size={16} />
                                        <span>Transient Detection</span>
                                        <ChevronDown
                                            size={16}
                                            className={cn(
                                                'auto-level-settings__subsection-chevron',
                                                isTransientConfigOpen && 'auto-level-settings__subsection-chevron--rotated'
                                            )}
                                        />
                                    </button>

                                    {isTransientConfigOpen && (
                                        <div className="auto-level-settings__transient-config">
                                            {/* NMS Explanation */}
                                            <div className="auto-level-settings__info-box">
                                                <Info size={14} />
                                                <p>
                                                    <strong>Non-Maximum Suppression (NMS):</strong> Within each band's
                                                    buffer window, only the strongest transient wins. Weaker peaks are
                                                    suppressed to prevent multiple detections for the same acoustic event.
                                                </p>
                                            </div>

                                            {/* Adaptive Thresholding Info */}
                                            <div className="auto-level-settings__info-box auto-level-settings__info-box--warning">
                                                <Info size={14} />
                                                <p>
                                                    <strong>Adaptive Thresholding:</strong> When enabled, adjusts the
                                                    threshold based on track dynamics. <em>Important:</em> This can only
                                                    <strong> increase</strong> the threshold for dynamic tracks, never
                                                    decrease it. For consistent signals, the threshold stays near the base value.
                                                </p>
                                            </div>

                                            {/* Use Per-Band Defaults Toggle */}
                                            <div className="auto-level-settings__toggle-row">
                                                <label className="auto-level-settings__toggle-label">
                                                    Use Per-Band Defaults
                                                </label>
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        'auto-level-settings__toggle-switch',
                                                        settings.usePerBandDefaults && 'auto-level-settings__toggle-switch--active'
                                                    )}
                                                    onClick={() => handleUsePerBandDefaultsChange(!settings.usePerBandDefaults)}
                                                    disabled={disabled}
                                                    role="switch"
                                                    aria-checked={settings.usePerBandDefaults}
                                                >
                                                    <span className="auto-level-settings__toggle-thumb" />
                                                </button>
                                            </div>

                                            {/* Per-Band Configuration */}
                                            {(['low', 'mid', 'high'] as const).map((band) => {
                                                const config = getBandConfig(band);
                                                const isDisabled = disabled || settings.usePerBandDefaults;

                                                return (
                                                    <div
                                                        key={band}
                                                        className={cn(
                                                            'auto-level-settings__band-config',
                                                            `auto-level-settings__band-config--${band}`,
                                                            isDisabled && 'auto-level-settings__band-config--disabled'
                                                        )}
                                                    >
                                                        <div className="auto-level-settings__band-config-header">
                                                            <span
                                                                className="auto-level-settings__band-color-dot"
                                                                style={{ backgroundColor: BAND_COLORS[band] }}
                                                            />
                                                            <span className="auto-level-settings__band-config-name">
                                                                {band.charAt(0).toUpperCase() + band.slice(1)} Band
                                                            </span>
                                                            <span className="auto-level-settings__band-config-freq">
                                                                {BAND_INFO[band].freq}
                                                            </span>
                                                        </div>
                                                        <p className="auto-level-settings__band-config-desc">
                                                            {BAND_INFO[band].description}
                                                        </p>

                                                        {/* Threshold Slider */}
                                                        <div className="auto-level-settings__band-config-row">
                                                            <label className="auto-level-settings__band-config-label">
                                                                Threshold
                                                            </label>
                                                            <div className="auto-level-settings__band-config-slider-wrap">
                                                                <input
                                                                    type="range"
                                                                    min="0.1"
                                                                    max="0.9"
                                                                    step="0.05"
                                                                    value={config.threshold}
                                                                    onChange={(e) =>
                                                                        handleBandConfigChange(band, {
                                                                            threshold: parseFloat(e.target.value),
                                                                        })
                                                                    }
                                                                    className="auto-level-settings__band-config-slider"
                                                                    disabled={isDisabled}
                                                                />
                                                                <span className="auto-level-settings__band-config-value">
                                                                    {config.threshold.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Min Interval Slider */}
                                                        <div className="auto-level-settings__band-config-row">
                                                            <label className="auto-level-settings__band-config-label">
                                                                Min Interval
                                                            </label>
                                                            <div className="auto-level-settings__band-config-slider-wrap">
                                                                <input
                                                                    type="range"
                                                                    min="0.01"
                                                                    max="0.25"
                                                                    step="0.005"
                                                                    value={config.minInterval}
                                                                    onChange={(e) =>
                                                                        handleBandConfigChange(band, {
                                                                            minInterval: parseFloat(e.target.value),
                                                                        })
                                                                    }
                                                                    className="auto-level-settings__band-config-slider"
                                                                    disabled={isDisabled}
                                                                />
                                                                <span className="auto-level-settings__band-config-value">
                                                                    {(config.minInterval * 1000).toFixed(0)}ms
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Adaptive Thresholding Toggle */}
                                                        <div className="auto-level-settings__band-config-row">
                                                            <label className="auto-level-settings__band-config-label">
                                                                Adaptive
                                                            </label>
                                                            <button
                                                                type="button"
                                                                className={cn(
                                                                    'auto-level-settings__mini-toggle',
                                                                    config.adaptiveThresholding && 'auto-level-settings__mini-toggle--active'
                                                                )}
                                                                onClick={() =>
                                                                    handleBandConfigChange(band, {
                                                                        adaptiveThresholding: !config.adaptiveThresholding,
                                                                    })
                                                                }
                                                                disabled={isDisabled}
                                                                role="switch"
                                                                aria-checked={config.adaptiveThresholding}
                                                            >
                                                                {config.adaptiveThresholding ? 'On' : 'Off'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {settings.usePerBandDefaults && (
                                                <p className="auto-level-settings__transient-help">
                                                    Per-band defaults are optimized for each frequency range. Disable
                                                    "Use Per-Band Defaults" to customize settings.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Density Validation Section */}
                                <div className="auto-level-settings__section">
                                    <div className="auto-level-settings__toggle-row">
                                        <label className="auto-level-settings__toggle-label">
                                            Density Validation
                                        </label>
                                        <button
                                            type="button"
                                            className={cn(
                                                'auto-level-settings__toggle-switch',
                                                settings.enableDensityValidation && 'auto-level-settings__toggle-switch--active'
                                            )}
                                            onClick={() => handleChange('enableDensityValidation', !settings.enableDensityValidation)}
                                            disabled={disabled}
                                            role="switch"
                                            aria-checked={settings.enableDensityValidation}
                                        >
                                            <span className="auto-level-settings__toggle-thumb" />
                                        </button>
                                    </div>

                                    {settings.enableDensityValidation && (
                                        <div className="auto-level-settings__density-validation">
                                            <div className="auto-level-settings__info-box">
                                                <Info size={14} />
                                                <p>
                                                    <strong>Density Validation:</strong> When enabled, if transients are
                                                    too close together, the system will automatically increase thresholds
                                                    and retry detection. This helps prevent overly dense patterns.
                                                </p>
                                            </div>

                                            {/* Max Retries Slider */}
                                            <div className="auto-level-settings__band-config-row">
                                                <label className="auto-level-settings__band-config-label">
                                                    Max Retries
                                                </label>
                                                <div className="auto-level-settings__band-config-slider-wrap">
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="5"
                                                        step="1"
                                                        value={settings.densityMaxRetries || 3}
                                                        onChange={(e) =>
                                                            handleChange('densityMaxRetries', parseInt(e.target.value, 10))
                                                        }
                                                        className="auto-level-settings__band-config-slider"
                                                        disabled={disabled}
                                                    />
                                                    <span className="auto-level-settings__band-config-value">
                                                        {settings.densityMaxRetries || 3}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="auto-level-settings__slider-help">
                                                Number of retry attempts per band. Each retry increases the threshold by 0.1.
                                            </p>
                                        </div>
                                    )}
                                </div>

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
