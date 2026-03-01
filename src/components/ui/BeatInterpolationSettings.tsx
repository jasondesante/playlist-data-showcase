/**
 * BeatInterpolationSettings Component
 *
 * A settings panel for configuring beat interpolation parameters.
 * Part of Task 3.1: Create BeatInterpolationSettings Component
 *
 * Features:
 * - Algorithm selector with three options
 * - Beat stream mode toggle
 * - Collapsible advanced options section
 * - Pure CSS styling (no Tailwind)
 *
 * @component
 */
import { Info, RotateCcw, ChevronDown, Star } from 'lucide-react';
import { Tooltip } from './Tooltip';
import './BeatInterpolationSettings.css';
import {
    useBeatDetectionStore,
    useInterpolationOptions,
    useSelectedAlgorithm,
    useBeatStreamMode,
} from '../../store/beatDetectionStore';
import type { InterpolationAlgorithm, BeatStreamMode, BeatInterpolationOptions } from '@/types';
import { DEFAULT_BEAT_INTERPOLATION_OPTIONS } from '@/types';

/**
 * Get an interpolation option value with fallback to default
 * Uses non-null assertion since defaults are guaranteed to exist
 */
function getOptionValue<K extends keyof BeatInterpolationOptions>(
    options: BeatInterpolationOptions,
    key: K
): NonNullable<BeatInterpolationOptions[K]> {
    const value = options[key] ?? DEFAULT_BEAT_INTERPOLATION_OPTIONS[key];
    // We know defaults exist, so this is safe
    return value as NonNullable<BeatInterpolationOptions[K]>;
}

/**
 * Algorithm configuration for display
 */
interface AlgorithmConfig {
    id: InterpolationAlgorithm;
    label: string;
    description: string;
    recommended?: boolean;
}

const ALGORITHMS: AlgorithmConfig[] = [
    {
        id: 'histogram-grid',
        label: 'Histogram Grid',
        description: 'Uses the most common interval as a rigid grid. Best for tracks with very stable tempo.',
    },
    {
        id: 'adaptive-phase-locked',
        label: 'Adaptive Phase-Locked',
        description: 'Adjusts tempo slightly at each detected beat anchor. Handles minor tempo drift.',
    },
    {
        id: 'dual-pass',
        label: 'Dual-Pass',
        description: 'Advanced algorithm with KDE peak finding and distributed error correction. Most robust.',
        recommended: true,
    },
];

/**
 * Beat stream mode configuration for display
 */
interface StreamModeConfig {
    id: BeatStreamMode;
    label: string;
    description: string;
}

const STREAM_MODES: StreamModeConfig[] = [
    {
        id: 'detected',
        label: 'Detected Only',
        description: 'Use only originally detected beats (original behavior)',
    },
    {
        id: 'merged',
        label: 'Merged',
        description: 'Use interpolated beats with detected beats as anchors (fills gaps)',
    },
];

/**
 * Props for the BeatInterpolationSettings component.
 */
interface BeatInterpolationSettingsProps {
    /**
     * Whether the settings controls should be disabled.
     * When true, all controls are non-interactive.
     * @default false
     */
    disabled?: boolean;
}

/**
 * BeatInterpolationSettings Component
 *
 * Renders settings for beat interpolation including algorithm selection,
 * beat stream mode, and advanced options.
 */
export function BeatInterpolationSettings({ disabled = false }: BeatInterpolationSettingsProps) {
    const interpolationOptions = useInterpolationOptions();
    const selectedAlgorithm = useSelectedAlgorithm();
    const beatStreamMode = useBeatStreamMode();

    const setInterpolationOptions = useBeatDetectionStore((state) => state.actions.setInterpolationOptions);
    const setSelectedAlgorithm = useBeatDetectionStore((state) => state.actions.setSelectedAlgorithm);
    const setBeatStreamMode = useBeatDetectionStore((state) => state.actions.setBeatStreamMode);

    // Handle algorithm change
    const handleAlgorithmChange = (algorithm: InterpolationAlgorithm) => {
        setSelectedAlgorithm(algorithm);
    };

    // Handle beat stream mode change
    const handleStreamModeChange = (mode: BeatStreamMode) => {
        setBeatStreamMode(mode);
    };

    // Handle slider changes
    const handleMinAnchorConfidenceChange = (value: number) => {
        setInterpolationOptions({ minAnchorConfidence: value });
    };

    const handleGridSnapToleranceChange = (value: number) => {
        setInterpolationOptions({ gridSnapTolerance: value });
    };

    const handleTempoAdaptationRateChange = (value: number) => {
        setInterpolationOptions({ tempoAdaptationRate: value });
    };

    const handleAnomalyThresholdChange = (value: number) => {
        setInterpolationOptions({ anomalyThreshold: value });
    };

    // Handle toggle changes
    const handleExtrapolateStartChange = (checked: boolean) => {
        setInterpolationOptions({ extrapolateStart: checked });
    };

    const handleExtrapolateEndChange = (checked: boolean) => {
        setInterpolationOptions({ extrapolateEnd: checked });
    };

    // Reset handlers
    const handleResetMinAnchorConfidence = () => {
        setInterpolationOptions({ minAnchorConfidence: DEFAULT_BEAT_INTERPOLATION_OPTIONS.minAnchorConfidence });
    };

    const handleResetGridSnapTolerance = () => {
        setInterpolationOptions({ gridSnapTolerance: DEFAULT_BEAT_INTERPOLATION_OPTIONS.gridSnapTolerance });
    };

    const handleResetTempoAdaptationRate = () => {
        setInterpolationOptions({ tempoAdaptationRate: DEFAULT_BEAT_INTERPOLATION_OPTIONS.tempoAdaptationRate });
    };

    const handleResetAnomalyThreshold = () => {
        setInterpolationOptions({ anomalyThreshold: DEFAULT_BEAT_INTERPOLATION_OPTIONS.anomalyThreshold });
    };

    // Check if values differ from defaults
    const minAnchorConfidence = getOptionValue(interpolationOptions, 'minAnchorConfidence');
    const gridSnapTolerance = getOptionValue(interpolationOptions, 'gridSnapTolerance');
    const tempoAdaptationRate = getOptionValue(interpolationOptions, 'tempoAdaptationRate');
    const anomalyThreshold = getOptionValue(interpolationOptions, 'anomalyThreshold');
    const extrapolateStart = getOptionValue(interpolationOptions, 'extrapolateStart');
    const extrapolateEnd = getOptionValue(interpolationOptions, 'extrapolateEnd');

    const isMinAnchorConfidenceDefault = minAnchorConfidence === DEFAULT_BEAT_INTERPOLATION_OPTIONS.minAnchorConfidence;
    const isGridSnapToleranceDefault = gridSnapTolerance === DEFAULT_BEAT_INTERPOLATION_OPTIONS.gridSnapTolerance;
    const isTempoAdaptationRateDefault = tempoAdaptationRate === DEFAULT_BEAT_INTERPOLATION_OPTIONS.tempoAdaptationRate;
    const isAnomalyThresholdDefault = anomalyThreshold === DEFAULT_BEAT_INTERPOLATION_OPTIONS.anomalyThreshold;
    const isExtrapolateStartDefault = extrapolateStart === DEFAULT_BEAT_INTERPOLATION_OPTIONS.extrapolateStart;
    const isExtrapolateEndDefault = extrapolateEnd === DEFAULT_BEAT_INTERPOLATION_OPTIONS.extrapolateEnd;

    // Calculate slider percentages for CSS styling
    const minAnchorConfidencePercent = minAnchorConfidence * 100;
    const gridSnapTolerancePercent = ((gridSnapTolerance - 10) / 90) * 100; // 10-100ms range
    const tempoAdaptationRatePercent = tempoAdaptationRate * 100;
    const anomalyThresholdPercent = ((anomalyThreshold - 0.2) / 0.4) * 100; // 0.2-0.6 range

    // Generic keyboard navigation handler for toggle groups
    const createKeyboardNavHandler = <T extends string>(
        modes: T[],
        currentMode: T,
        onChangeMode: (mode: T) => void
    ) => (e: React.KeyboardEvent) => {
        const currentIndex = modes.indexOf(currentMode);
        let newIndex = currentIndex;

        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                newIndex = currentIndex > 0 ? currentIndex - 1 : modes.length - 1;
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                newIndex = currentIndex < modes.length - 1 ? currentIndex + 1 : 0;
                break;
            case 'Home':
                e.preventDefault();
                newIndex = 0;
                break;
            case 'End':
                e.preventDefault();
                newIndex = modes.length - 1;
                break;
            default:
                return;
        }

        onChangeMode(modes[newIndex]);

        // Focus the button for the new mode
        const container = e.currentTarget;
        const buttons = container.querySelectorAll('[data-mode-index]');
        const targetButton = buttons[newIndex] as HTMLElement;
        if (targetButton) {
            targetButton.focus();
        }
    };

    const getToggleTabIndex = <T extends string>(mode: T, currentMode: T): number => {
        return mode === currentMode ? 0 : -1;
    };

    return (
        <div className="beat-interpolation-settings">
            {/* ============================================================
             * ALGORITHM SELECTOR
             * ============================================================ */}
            <div className="beat-interpolation-settings-section">
                <div className="beat-interpolation-settings-header">
                    <div className="beat-interpolation-settings-label-with-tooltip">
                        <span className="beat-interpolation-settings-label">Algorithm</span>
                        <Tooltip content="Select the algorithm used to fill gaps between detected beats." />
                    </div>
                </div>
                <div
                    className="beat-interpolation-algorithm-toggles"
                    role="radiogroup"
                    aria-label="Interpolation algorithm"
                    onKeyDown={createKeyboardNavHandler(
                        ALGORITHMS.map(a => a.id),
                        selectedAlgorithm,
                        handleAlgorithmChange
                    )}
                >
                    {ALGORITHMS.map((algo, index) => {
                        const isSelected = selectedAlgorithm === algo.id;
                        return (
                            <button
                                key={algo.id}
                                type="button"
                                data-mode-index={index}
                                className={`beat-interpolation-algorithm-toggle ${isSelected ? 'beat-interpolation-algorithm-toggle--active' : ''}`}
                                onClick={() => handleAlgorithmChange(algo.id)}
                                disabled={disabled}
                                tabIndex={getToggleTabIndex(algo.id, selectedAlgorithm)}
                                role="radio"
                                aria-checked={isSelected}
                                aria-label={`${algo.label}: ${algo.description}`}
                                title={algo.description}
                            >
                                <span className="beat-interpolation-algorithm-toggle-label">
                                    {algo.label}
                                    {algo.recommended && (
                                        <Star className="beat-interpolation-recommended-badge" size={10} />
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>
                {/* Show description of selected algorithm */}
                <div className="beat-interpolation-algorithm-description">
                    {ALGORITHMS.find(a => a.id === selectedAlgorithm)?.description}
                </div>
            </div>

            {/* ============================================================
             * BEAT STREAM MODE
             * ============================================================ */}
            <div className="beat-interpolation-settings-section">
                <div className="beat-interpolation-settings-header">
                    <div className="beat-interpolation-settings-label-with-tooltip">
                        <span className="beat-interpolation-settings-label">Beat Stream</span>
                        <Tooltip content="Choose which beats to use during practice. 'Detected' uses only original beats; 'Merged' includes interpolated beats." />
                    </div>
                </div>
                <div
                    className="beat-interpolation-stream-toggles"
                    role="radiogroup"
                    aria-label="Beat stream mode"
                    onKeyDown={createKeyboardNavHandler(
                        STREAM_MODES.map(m => m.id),
                        beatStreamMode,
                        handleStreamModeChange
                    )}
                >
                    {STREAM_MODES.map((mode, index) => {
                        const isSelected = beatStreamMode === mode.id;
                        return (
                            <button
                                key={mode.id}
                                type="button"
                                data-mode-index={index}
                                className={`beat-interpolation-stream-toggle ${isSelected ? 'beat-interpolation-stream-toggle--active' : ''}`}
                                onClick={() => handleStreamModeChange(mode.id)}
                                disabled={disabled}
                                tabIndex={getToggleTabIndex(mode.id, beatStreamMode)}
                                role="radio"
                                aria-checked={isSelected}
                                aria-label={`${mode.label}: ${mode.description}`}
                                title={mode.description}
                            >
                                <span className="beat-interpolation-stream-toggle-label">
                                    {mode.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="beat-interpolation-stream-description">
                    {STREAM_MODES.find(m => m.id === beatStreamMode)?.description}
                </div>
            </div>

            {/* ============================================================
             * ADVANCED OPTIONS - Collapsible Section
             * ============================================================ */}
            <details className="beat-interpolation-advanced">
                <summary className="beat-interpolation-advanced-summary">
                    <span className="beat-interpolation-advanced-summary-text">Advanced Options</span>
                    <ChevronDown className="beat-interpolation-advanced-summary-icon" size={12} />
                </summary>
                <div className="beat-interpolation-advanced-content">
                    {/* Min Anchor Confidence */}
                    <div className="beat-interpolation-settings-section">
                        <div className="beat-interpolation-settings-header">
                            <div className="beat-interpolation-settings-label-with-tooltip">
                                <span className="beat-interpolation-settings-label">Min Anchor Confidence</span>
                                <Tooltip content="Minimum confidence threshold for a detected beat to be used as an anchor for interpolation." />
                            </div>
                            <div className="beat-interpolation-settings-header-right">
                                <span className={`beat-interpolation-settings-value ${!isMinAnchorConfidenceDefault ? 'beat-interpolation-settings-value--modified' : ''}`}>
                                    {minAnchorConfidence.toFixed(2)}
                                </span>
                                {!isMinAnchorConfidenceDefault && (
                                    <button
                                        type="button"
                                        className="beat-interpolation-reset-btn"
                                        onClick={handleResetMinAnchorConfidence}
                                        disabled={disabled}
                                        aria-label="Reset min anchor confidence to default"
                                        title={`Reset to default (${DEFAULT_BEAT_INTERPOLATION_OPTIONS.minAnchorConfidence})`}
                                    >
                                        <RotateCcw className="beat-interpolation-reset-btn-icon" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="beat-interpolation-slider-container">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={minAnchorConfidence}
                                onChange={(e) => handleMinAnchorConfidenceChange(parseFloat(e.target.value))}
                                className="beat-interpolation-slider"
                                style={{ '--slider-value': `${minAnchorConfidencePercent}%` } as React.CSSProperties}
                                disabled={disabled}
                                aria-label="Minimum anchor confidence"
                            />
                            <div className="beat-interpolation-slider-marks">
                                <span className="beat-interpolation-slider-mark">0.0</span>
                                <span className="beat-interpolation-slider-mark">0.5</span>
                                <span className="beat-interpolation-slider-mark">1.0</span>
                            </div>
                        </div>
                    </div>

                    {/* Grid Snap Tolerance */}
                    <div className="beat-interpolation-settings-section">
                        <div className="beat-interpolation-settings-header">
                            <div className="beat-interpolation-settings-label-with-tooltip">
                                <span className="beat-interpolation-settings-label">Grid Snap Tolerance</span>
                                <Tooltip content="Tolerance in milliseconds for snapping detected beats to the grid." />
                            </div>
                            <div className="beat-interpolation-settings-header-right">
                                <span className={`beat-interpolation-settings-value ${!isGridSnapToleranceDefault ? 'beat-interpolation-settings-value--modified' : ''}`}>
                                    {gridSnapTolerance}ms
                                </span>
                                {!isGridSnapToleranceDefault && (
                                    <button
                                        type="button"
                                        className="beat-interpolation-reset-btn"
                                        onClick={handleResetGridSnapTolerance}
                                        disabled={disabled}
                                        aria-label="Reset grid snap tolerance to default"
                                        title={`Reset to default (${DEFAULT_BEAT_INTERPOLATION_OPTIONS.gridSnapTolerance}ms)`}
                                    >
                                        <RotateCcw className="beat-interpolation-reset-btn-icon" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="beat-interpolation-slider-container">
                            <input
                                type="range"
                                min="10"
                                max="100"
                                step="5"
                                value={gridSnapTolerance}
                                onChange={(e) => handleGridSnapToleranceChange(parseInt(e.target.value, 10))}
                                className="beat-interpolation-slider"
                                style={{ '--slider-value': `${gridSnapTolerancePercent}%` } as React.CSSProperties}
                                disabled={disabled}
                                aria-label="Grid snap tolerance"
                            />
                            <div className="beat-interpolation-slider-marks">
                                <span className="beat-interpolation-slider-mark">10ms</span>
                                <span className="beat-interpolation-slider-mark">55ms</span>
                                <span className="beat-interpolation-slider-mark">100ms</span>
                            </div>
                        </div>
                    </div>

                    {/* Tempo Adaptation Rate */}
                    <div className="beat-interpolation-settings-section">
                        <div className="beat-interpolation-settings-header">
                            <div className="beat-interpolation-settings-label-with-tooltip">
                                <span className="beat-interpolation-settings-label">Tempo Adaptation Rate</span>
                                <Tooltip content="How much the tempo can adapt between anchors. Higher values allow more drift." />
                            </div>
                            <div className="beat-interpolation-settings-header-right">
                                <span className={`beat-interpolation-settings-value ${!isTempoAdaptationRateDefault ? 'beat-interpolation-settings-value--modified' : ''}`}>
                                    {tempoAdaptationRate.toFixed(2)}
                                </span>
                                {!isTempoAdaptationRateDefault && (
                                    <button
                                        type="button"
                                        className="beat-interpolation-reset-btn"
                                        onClick={handleResetTempoAdaptationRate}
                                        disabled={disabled}
                                        aria-label="Reset tempo adaptation rate to default"
                                        title={`Reset to default (${DEFAULT_BEAT_INTERPOLATION_OPTIONS.tempoAdaptationRate})`}
                                    >
                                        <RotateCcw className="beat-interpolation-reset-btn-icon" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="beat-interpolation-slider-container">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={tempoAdaptationRate}
                                onChange={(e) => handleTempoAdaptationRateChange(parseFloat(e.target.value))}
                                className="beat-interpolation-slider"
                                style={{ '--slider-value': `${tempoAdaptationRatePercent}%` } as React.CSSProperties}
                                disabled={disabled}
                                aria-label="Tempo adaptation rate"
                            />
                            <div className="beat-interpolation-slider-marks">
                                <span className="beat-interpolation-slider-mark">0.0</span>
                                <span className="beat-interpolation-slider-mark">0.5</span>
                                <span className="beat-interpolation-slider-mark">1.0</span>
                            </div>
                        </div>
                    </div>

                    {/* Anomaly Threshold */}
                    <div className="beat-interpolation-settings-section">
                        <div className="beat-interpolation-settings-header">
                            <div className="beat-interpolation-settings-label-with-tooltip">
                                <span className="beat-interpolation-settings-label">Anomaly Threshold</span>
                                <Tooltip content="Multiplier for detecting tempo anomalies. Lower values are more sensitive." />
                            </div>
                            <div className="beat-interpolation-settings-header-right">
                                <span className={`beat-interpolation-settings-value ${!isAnomalyThresholdDefault ? 'beat-interpolation-settings-value--modified' : ''}`}>
                                    {anomalyThreshold.toFixed(2)}
                                </span>
                                {!isAnomalyThresholdDefault && (
                                    <button
                                        type="button"
                                        className="beat-interpolation-reset-btn"
                                        onClick={handleResetAnomalyThreshold}
                                        disabled={disabled}
                                        aria-label="Reset anomaly threshold to default"
                                        title={`Reset to default (${DEFAULT_BEAT_INTERPOLATION_OPTIONS.anomalyThreshold})`}
                                    >
                                        <RotateCcw className="beat-interpolation-reset-btn-icon" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="beat-interpolation-slider-container">
                            <input
                                type="range"
                                min="0.2"
                                max="0.6"
                                step="0.02"
                                value={anomalyThreshold}
                                onChange={(e) => handleAnomalyThresholdChange(parseFloat(e.target.value))}
                                className="beat-interpolation-slider"
                                style={{ '--slider-value': `${anomalyThresholdPercent}%` } as React.CSSProperties}
                                disabled={disabled}
                                aria-label="Anomaly threshold"
                            />
                            <div className="beat-interpolation-slider-marks">
                                <span className="beat-interpolation-slider-mark">0.2</span>
                                <span className="beat-interpolation-slider-mark">0.4</span>
                                <span className="beat-interpolation-slider-mark">0.6</span>
                            </div>
                        </div>
                    </div>

                    {/* Extrapolation Toggles */}
                    <div className="beat-interpolation-toggles-section">
                        <div className="beat-interpolation-settings-label">Extrapolation</div>
                        <div className="beat-interpolation-checkbox-group">
                            <label className="beat-interpolation-checkbox">
                                <input
                                    type="checkbox"
                                    checked={extrapolateStart}
                                    onChange={(e) => handleExtrapolateStartChange(e.target.checked)}
                                    disabled={disabled}
                                />
                                <span className={`beat-interpolation-checkbox-label ${!isExtrapolateStartDefault ? 'beat-interpolation-checkbox-label--modified' : ''}`}>
                                    Extrapolate before first beat
                                </span>
                            </label>
                            <label className="beat-interpolation-checkbox">
                                <input
                                    type="checkbox"
                                    checked={extrapolateEnd}
                                    onChange={(e) => handleExtrapolateEndChange(e.target.checked)}
                                    disabled={disabled}
                                />
                                <span className={`beat-interpolation-checkbox-label ${!isExtrapolateEndDefault ? 'beat-interpolation-checkbox-label--modified' : ''}`}>
                                    Extrapolate after last beat
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </details>

            {/* Note about interpolation */}
            <div className="beat-interpolation-settings-note">
                <Info className="beat-interpolation-settings-note-icon" />
                <span className="beat-interpolation-settings-note-text">
                    Interpolation fills gaps between detected beats using a tempo-aware grid. Best results with rhythmic music.
                </span>
            </div>
        </div>
    );
}

export default BeatInterpolationSettings;
