/**
 * AdvancedInterpolationOptions Component
 *
 * A collapsible panel containing all advanced interpolation options.
 * Part of Task 8.1: Create AdvancedInterpolationOptions Component
 *
 * Features:
 * - All options from BeatInterpolationOptions interface
 * - Dense section configuration
 * - Confidence model weight configuration
 * - Individual reset buttons for each option
 * - Pure CSS styling (no Tailwind)
 *
 * @component
 */
import { RotateCcw, ChevronDown } from 'lucide-react';
import { Tooltip } from './Tooltip';
import type { BeatInterpolationOptions } from '@/types';
import { DEFAULT_BEAT_INTERPOLATION_OPTIONS } from '@/types';
import './AdvancedInterpolationOptions.css';

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
 * Props for the AdvancedInterpolationOptions component.
 */
interface AdvancedInterpolationOptionsProps {
    /** Current interpolation options */
    options: BeatInterpolationOptions;

    /** Callback when options change */
    onOptionsChange: (options: Partial<BeatInterpolationOptions>) => void;

    /** Whether the controls should be disabled */
    disabled?: boolean;

    /** Whether the section should start expanded */
    defaultExpanded?: boolean;
}

/**
 * AdvancedInterpolationOptions Component
 *
 * Renders a collapsible panel with all advanced interpolation options.
 */
export function AdvancedInterpolationOptions({
    options,
    onOptionsChange,
    disabled = false,
    defaultExpanded = false,
}: AdvancedInterpolationOptionsProps) {
    // Get current values with defaults
    const minAnchorConfidence = getOptionValue(options, 'minAnchorConfidence');
    const gridSnapTolerance = getOptionValue(options, 'gridSnapTolerance');
    const tempoAdaptationRate = getOptionValue(options, 'tempoAdaptationRate');
    const anomalyThreshold = getOptionValue(options, 'anomalyThreshold');
    const extrapolateStart = getOptionValue(options, 'extrapolateStart');
    const extrapolateEnd = getOptionValue(options, 'extrapolateEnd');
    const denseSectionMinBeats = getOptionValue(options, 'denseSectionMinBeats');
    const gridAlignmentWeight = getOptionValue(options, 'gridAlignmentWeight');
    const anchorConfidenceWeight = getOptionValue(options, 'anchorConfidenceWeight');
    const paceConfidenceWeight = getOptionValue(options, 'paceConfidenceWeight');

    // Check if values differ from defaults
    const isMinAnchorConfidenceDefault = minAnchorConfidence === DEFAULT_BEAT_INTERPOLATION_OPTIONS.minAnchorConfidence;
    const isGridSnapToleranceDefault = gridSnapTolerance === DEFAULT_BEAT_INTERPOLATION_OPTIONS.gridSnapTolerance;
    const isTempoAdaptationRateDefault = tempoAdaptationRate === DEFAULT_BEAT_INTERPOLATION_OPTIONS.tempoAdaptationRate;
    const isAnomalyThresholdDefault = anomalyThreshold === DEFAULT_BEAT_INTERPOLATION_OPTIONS.anomalyThreshold;
    const isExtrapolateStartDefault = extrapolateStart === DEFAULT_BEAT_INTERPOLATION_OPTIONS.extrapolateStart;
    const isExtrapolateEndDefault = extrapolateEnd === DEFAULT_BEAT_INTERPOLATION_OPTIONS.extrapolateEnd;
    const isDenseSectionMinBeatsDefault = denseSectionMinBeats === DEFAULT_BEAT_INTERPOLATION_OPTIONS.denseSectionMinBeats;
    const isGridAlignmentWeightDefault = gridAlignmentWeight === DEFAULT_BEAT_INTERPOLATION_OPTIONS.gridAlignmentWeight;
    const isAnchorConfidenceWeightDefault = anchorConfidenceWeight === DEFAULT_BEAT_INTERPOLATION_OPTIONS.anchorConfidenceWeight;
    const isPaceConfidenceWeightDefault = paceConfidenceWeight === DEFAULT_BEAT_INTERPOLATION_OPTIONS.paceConfidenceWeight;

    // Calculate slider percentages for CSS styling
    const minAnchorConfidencePercent = minAnchorConfidence * 100;
    const gridSnapTolerancePercent = ((gridSnapTolerance - 10) / 90) * 100; // 10-100ms range
    const tempoAdaptationRatePercent = tempoAdaptationRate * 100;
    const anomalyThresholdPercent = ((anomalyThreshold - 0.2) / 0.4) * 100; // 0.2-0.6 range
    const denseSectionMinBeatsPercent = ((denseSectionMinBeats - 2) / 8) * 100; // 2-10 range
    const gridAlignmentWeightPercent = gridAlignmentWeight * 100;
    const anchorConfidenceWeightPercent = anchorConfidenceWeight * 100;
    const paceConfidenceWeightPercent = paceConfidenceWeight * 100;

    // Calculate total confidence weights
    const totalWeights = gridAlignmentWeight + anchorConfidenceWeight + paceConfidenceWeight;
    const weightsSumTo100 = Math.abs(totalWeights - 1.0) < 0.01;

    // Reset handlers
    const createResetHandler = (key: keyof BeatInterpolationOptions) => () => {
        onOptionsChange({ [key]: DEFAULT_BEAT_INTERPOLATION_OPTIONS[key] });
    };

    // Generic slider handler
    const createSliderHandler = (key: keyof BeatInterpolationOptions, parser: (v: string) => number) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        onOptionsChange({ [key]: parser(e.target.value) });
    };

    // Generic checkbox handler
    const createCheckboxHandler = (key: keyof BeatInterpolationOptions) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        onOptionsChange({ [key]: e.target.checked });
    };

    return (
        <details className="advanced-interpolation-options" open={defaultExpanded}>
            <summary className="advanced-interpolation-summary">
                <span className="advanced-interpolation-summary-text">Advanced Options</span>
                <ChevronDown className="advanced-interpolation-summary-icon" size={12} />
            </summary>
            <div className="advanced-interpolation-content">
                {/* ============================================================
                 * CORE INTERPOLATION SETTINGS
                 * ============================================================ */}

                {/* Min Anchor Confidence */}
                <div className="advanced-interpolation-section">
                    <div className="advanced-interpolation-header">
                        <div className="advanced-interpolation-label-with-tooltip">
                            <span className="advanced-interpolation-label">Min Anchor Confidence</span>
                            <Tooltip content="Minimum confidence threshold for a detected beat to be used as an anchor for interpolation." />
                        </div>
                        <div className="advanced-interpolation-header-right">
                            <span className={`advanced-interpolation-value ${!isMinAnchorConfidenceDefault ? 'advanced-interpolation-value--modified' : ''}`}>
                                {minAnchorConfidence.toFixed(2)}
                            </span>
                            {!isMinAnchorConfidenceDefault && (
                                <button
                                    type="button"
                                    className="advanced-interpolation-reset-btn"
                                    onClick={createResetHandler('minAnchorConfidence')}
                                    disabled={disabled}
                                    aria-label="Reset min anchor confidence to default"
                                    title={`Reset to default (${DEFAULT_BEAT_INTERPOLATION_OPTIONS.minAnchorConfidence})`}
                                >
                                    <RotateCcw className="advanced-interpolation-reset-btn-icon" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="advanced-interpolation-slider-container">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={minAnchorConfidence}
                            onChange={createSliderHandler('minAnchorConfidence', parseFloat)}
                            className="advanced-interpolation-slider"
                            style={{ '--slider-value': `${minAnchorConfidencePercent}%` } as React.CSSProperties}
                            disabled={disabled}
                            aria-label="Minimum anchor confidence"
                        />
                        <div className="advanced-interpolation-slider-marks">
                            <span className="advanced-interpolation-slider-mark">0.0</span>
                            <span className="advanced-interpolation-slider-mark">0.5</span>
                            <span className="advanced-interpolation-slider-mark">1.0</span>
                        </div>
                    </div>
                </div>

                {/* Grid Snap Tolerance */}
                <div className="advanced-interpolation-section">
                    <div className="advanced-interpolation-header">
                        <div className="advanced-interpolation-label-with-tooltip">
                            <span className="advanced-interpolation-label">Grid Snap Tolerance</span>
                            <Tooltip content="Tolerance in milliseconds for snapping detected beats to the grid." />
                        </div>
                        <div className="advanced-interpolation-header-right">
                            <span className={`advanced-interpolation-value ${!isGridSnapToleranceDefault ? 'advanced-interpolation-value--modified' : ''}`}>
                                {Math.round(gridSnapTolerance * 1000)}ms
                            </span>
                            {!isGridSnapToleranceDefault && (
                                <button
                                    type="button"
                                    className="advanced-interpolation-reset-btn"
                                    onClick={createResetHandler('gridSnapTolerance')}
                                    disabled={disabled}
                                    aria-label="Reset grid snap tolerance to default"
                                    title={`Reset to default (${Math.round(DEFAULT_BEAT_INTERPOLATION_OPTIONS.gridSnapTolerance * 1000)}ms)`}
                                >
                                    <RotateCcw className="advanced-interpolation-reset-btn-icon" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="advanced-interpolation-slider-container">
                        <input
                            type="range"
                            min="0.01"
                            max="0.1"
                            step="0.005"
                            value={gridSnapTolerance}
                            onChange={createSliderHandler('gridSnapTolerance', parseFloat)}
                            className="advanced-interpolation-slider"
                            style={{ '--slider-value': `${gridSnapTolerancePercent}%` } as React.CSSProperties}
                            disabled={disabled}
                            aria-label="Grid snap tolerance"
                        />
                        <div className="advanced-interpolation-slider-marks">
                            <span className="advanced-interpolation-slider-mark">10ms</span>
                            <span className="advanced-interpolation-slider-mark">55ms</span>
                            <span className="advanced-interpolation-slider-mark">100ms</span>
                        </div>
                    </div>
                </div>

                {/* Tempo Adaptation Rate */}
                <div className="advanced-interpolation-section">
                    <div className="advanced-interpolation-header">
                        <div className="advanced-interpolation-label-with-tooltip">
                            <span className="advanced-interpolation-label">Tempo Adaptation Rate</span>
                            <Tooltip content="How much the tempo can adapt between anchors. Higher values allow more drift." />
                        </div>
                        <div className="advanced-interpolation-header-right">
                            <span className={`advanced-interpolation-value ${!isTempoAdaptationRateDefault ? 'advanced-interpolation-value--modified' : ''}`}>
                                {tempoAdaptationRate.toFixed(2)}
                            </span>
                            {!isTempoAdaptationRateDefault && (
                                <button
                                    type="button"
                                    className="advanced-interpolation-reset-btn"
                                    onClick={createResetHandler('tempoAdaptationRate')}
                                    disabled={disabled}
                                    aria-label="Reset tempo adaptation rate to default"
                                    title={`Reset to default (${DEFAULT_BEAT_INTERPOLATION_OPTIONS.tempoAdaptationRate})`}
                                >
                                    <RotateCcw className="advanced-interpolation-reset-btn-icon" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="advanced-interpolation-slider-container">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={tempoAdaptationRate}
                            onChange={createSliderHandler('tempoAdaptationRate', parseFloat)}
                            className="advanced-interpolation-slider"
                            style={{ '--slider-value': `${tempoAdaptationRatePercent}%` } as React.CSSProperties}
                            disabled={disabled}
                            aria-label="Tempo adaptation rate"
                        />
                        <div className="advanced-interpolation-slider-marks">
                            <span className="advanced-interpolation-slider-mark">0.0</span>
                            <span className="advanced-interpolation-slider-mark">0.5</span>
                            <span className="advanced-interpolation-slider-mark">1.0</span>
                        </div>
                    </div>
                </div>

                {/* Anomaly Threshold */}
                <div className="advanced-interpolation-section">
                    <div className="advanced-interpolation-header">
                        <div className="advanced-interpolation-label-with-tooltip">
                            <span className="advanced-interpolation-label">Anomaly Threshold</span>
                            <Tooltip content="Multiplier for detecting tempo anomalies. Lower values are more sensitive." />
                        </div>
                        <div className="advanced-interpolation-header-right">
                            <span className={`advanced-interpolation-value ${!isAnomalyThresholdDefault ? 'advanced-interpolation-value--modified' : ''}`}>
                                {anomalyThreshold.toFixed(2)}
                            </span>
                            {!isAnomalyThresholdDefault && (
                                <button
                                    type="button"
                                    className="advanced-interpolation-reset-btn"
                                    onClick={createResetHandler('anomalyThreshold')}
                                    disabled={disabled}
                                    aria-label="Reset anomaly threshold to default"
                                    title={`Reset to default (${DEFAULT_BEAT_INTERPOLATION_OPTIONS.anomalyThreshold})`}
                                >
                                    <RotateCcw className="advanced-interpolation-reset-btn-icon" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="advanced-interpolation-slider-container">
                        <input
                            type="range"
                            min="0.2"
                            max="0.6"
                            step="0.02"
                            value={anomalyThreshold}
                            onChange={createSliderHandler('anomalyThreshold', parseFloat)}
                            className="advanced-interpolation-slider"
                            style={{ '--slider-value': `${anomalyThresholdPercent}%` } as React.CSSProperties}
                            disabled={disabled}
                            aria-label="Anomaly threshold"
                        />
                        <div className="advanced-interpolation-slider-marks">
                            <span className="advanced-interpolation-slider-mark">0.2</span>
                            <span className="advanced-interpolation-slider-mark">0.4</span>
                            <span className="advanced-interpolation-slider-mark">0.6</span>
                        </div>
                    </div>
                </div>

                {/* Dense Section Min Beats */}
                <div className="advanced-interpolation-section">
                    <div className="advanced-interpolation-header">
                        <div className="advanced-interpolation-label-with-tooltip">
                            <span className="advanced-interpolation-label">Dense Section Min Beats</span>
                            <Tooltip content="Minimum number of consecutive beats at regular spacing to count as a 'dense section' for quarter note detection." />
                        </div>
                        <div className="advanced-interpolation-header-right">
                            <span className={`advanced-interpolation-value ${!isDenseSectionMinBeatsDefault ? 'advanced-interpolation-value--modified' : ''}`}>
                                {denseSectionMinBeats}
                            </span>
                            {!isDenseSectionMinBeatsDefault && (
                                <button
                                    type="button"
                                    className="advanced-interpolation-reset-btn"
                                    onClick={createResetHandler('denseSectionMinBeats')}
                                    disabled={disabled}
                                    aria-label="Reset dense section min beats to default"
                                    title={`Reset to default (${DEFAULT_BEAT_INTERPOLATION_OPTIONS.denseSectionMinBeats})`}
                                >
                                    <RotateCcw className="advanced-interpolation-reset-btn-icon" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="advanced-interpolation-slider-container">
                        <input
                            type="range"
                            min="2"
                            max="10"
                            step="1"
                            value={denseSectionMinBeats}
                            onChange={createSliderHandler('denseSectionMinBeats', parseInt)}
                            className="advanced-interpolation-slider"
                            style={{ '--slider-value': `${denseSectionMinBeatsPercent}%` } as React.CSSProperties}
                            disabled={disabled}
                            aria-label="Dense section minimum beats"
                        />
                        <div className="advanced-interpolation-slider-marks">
                            <span className="advanced-interpolation-slider-mark">2</span>
                            <span className="advanced-interpolation-slider-mark">6</span>
                            <span className="advanced-interpolation-slider-mark">10</span>
                        </div>
                    </div>
                </div>

                {/* ============================================================
                 * CONFIDENCE MODEL WEIGHTS
                 * ============================================================ */}
                <div className="advanced-interpolation-weights-section">
                    <div className="advanced-interpolation-weights-header">
                        <div className="advanced-interpolation-label-with-tooltip">
                            <span className="advanced-interpolation-label">Confidence Weights</span>
                            <Tooltip content="Weights for calculating beat confidence. Should sum to 1.0 (100%)." />
                        </div>
                        <div className="advanced-interpolation-weights-total">
                            <span className={`advanced-interpolation-weights-sum ${!weightsSumTo100 ? 'advanced-interpolation-weights-sum--warning' : ''}`}>
                                {totalWeights.toFixed(2)}
                            </span>
                            {!weightsSumTo100 && (
                                <span className="advanced-interpolation-weights-warning">!</span>
                            )}
                        </div>
                    </div>

                    {/* Grid Alignment Weight */}
                    <div className="advanced-interpolation-section advanced-interpolation-section--compact">
                        <div className="advanced-interpolation-header">
                            <span className="advanced-interpolation-sublabel">Grid Alignment</span>
                            <div className="advanced-interpolation-header-right">
                                <span className={`advanced-interpolation-value advanced-interpolation-value--small ${!isGridAlignmentWeightDefault ? 'advanced-interpolation-value--modified' : ''}`}>
                                    {Math.round(gridAlignmentWeight * 100)}%
                                </span>
                                {!isGridAlignmentWeightDefault && (
                                    <button
                                        type="button"
                                        className="advanced-interpolation-reset-btn"
                                        onClick={createResetHandler('gridAlignmentWeight')}
                                        disabled={disabled}
                                        aria-label="Reset grid alignment weight to default"
                                        title={`Reset to default (${DEFAULT_BEAT_INTERPOLATION_OPTIONS.gridAlignmentWeight * 100}%)`}
                                    >
                                        <RotateCcw className="advanced-interpolation-reset-btn-icon" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="advanced-interpolation-slider-container">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={gridAlignmentWeight}
                                onChange={createSliderHandler('gridAlignmentWeight', parseFloat)}
                                className="advanced-interpolation-slider advanced-interpolation-slider--weight"
                                style={{ '--slider-value': `${gridAlignmentWeightPercent}%` } as React.CSSProperties}
                                disabled={disabled}
                                aria-label="Grid alignment weight"
                            />
                        </div>
                    </div>

                    {/* Anchor Confidence Weight */}
                    <div className="advanced-interpolation-section advanced-interpolation-section--compact">
                        <div className="advanced-interpolation-header">
                            <span className="advanced-interpolation-sublabel">Anchor Confidence</span>
                            <div className="advanced-interpolation-header-right">
                                <span className={`advanced-interpolation-value advanced-interpolation-value--small ${!isAnchorConfidenceWeightDefault ? 'advanced-interpolation-value--modified' : ''}`}>
                                    {Math.round(anchorConfidenceWeight * 100)}%
                                </span>
                                {!isAnchorConfidenceWeightDefault && (
                                    <button
                                        type="button"
                                        className="advanced-interpolation-reset-btn"
                                        onClick={createResetHandler('anchorConfidenceWeight')}
                                        disabled={disabled}
                                        aria-label="Reset anchor confidence weight to default"
                                        title={`Reset to default (${DEFAULT_BEAT_INTERPOLATION_OPTIONS.anchorConfidenceWeight * 100}%)`}
                                    >
                                        <RotateCcw className="advanced-interpolation-reset-btn-icon" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="advanced-interpolation-slider-container">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={anchorConfidenceWeight}
                                onChange={createSliderHandler('anchorConfidenceWeight', parseFloat)}
                                className="advanced-interpolation-slider advanced-interpolation-slider--weight"
                                style={{ '--slider-value': `${anchorConfidenceWeightPercent}%` } as React.CSSProperties}
                                disabled={disabled}
                                aria-label="Anchor confidence weight"
                            />
                        </div>
                    </div>

                    {/* Pace Confidence Weight */}
                    <div className="advanced-interpolation-section advanced-interpolation-section--compact">
                        <div className="advanced-interpolation-header">
                            <span className="advanced-interpolation-sublabel">Pace Confidence</span>
                            <div className="advanced-interpolation-header-right">
                                <span className={`advanced-interpolation-value advanced-interpolation-value--small ${!isPaceConfidenceWeightDefault ? 'advanced-interpolation-value--modified' : ''}`}>
                                    {Math.round(paceConfidenceWeight * 100)}%
                                </span>
                                {!isPaceConfidenceWeightDefault && (
                                    <button
                                        type="button"
                                        className="advanced-interpolation-reset-btn"
                                        onClick={createResetHandler('paceConfidenceWeight')}
                                        disabled={disabled}
                                        aria-label="Reset pace confidence weight to default"
                                        title={`Reset to default (${DEFAULT_BEAT_INTERPOLATION_OPTIONS.paceConfidenceWeight * 100}%)`}
                                    >
                                        <RotateCcw className="advanced-interpolation-reset-btn-icon" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="advanced-interpolation-slider-container">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={paceConfidenceWeight}
                                onChange={createSliderHandler('paceConfidenceWeight', parseFloat)}
                                className="advanced-interpolation-slider advanced-interpolation-slider--weight"
                                style={{ '--slider-value': `${paceConfidenceWeightPercent}%` } as React.CSSProperties}
                                disabled={disabled}
                                aria-label="Pace confidence weight"
                            />
                        </div>
                    </div>
                </div>

                {/* ============================================================
                 * EXTRAPOLATION TOGGLES
                 * ============================================================ */}
                <div className="advanced-interpolation-toggles-section">
                    <div className="advanced-interpolation-label">Extrapolation</div>
                    <div className="advanced-interpolation-checkbox-group">
                        <label className="advanced-interpolation-checkbox">
                            <input
                                type="checkbox"
                                checked={extrapolateStart}
                                onChange={createCheckboxHandler('extrapolateStart')}
                                disabled={disabled}
                            />
                            <span className={`advanced-interpolation-checkbox-label ${!isExtrapolateStartDefault ? 'advanced-interpolation-checkbox-label--modified' : ''}`}>
                                Extrapolate before first beat
                            </span>
                        </label>
                        <label className="advanced-interpolation-checkbox">
                            <input
                                type="checkbox"
                                checked={extrapolateEnd}
                                onChange={createCheckboxHandler('extrapolateEnd')}
                                disabled={disabled}
                            />
                            <span className={`advanced-interpolation-checkbox-label ${!isExtrapolateEndDefault ? 'advanced-interpolation-checkbox-label--modified' : ''}`}>
                                Extrapolate after last beat
                            </span>
                        </label>
                    </div>
                </div>
            </div>
        </details>
    );
}

export default AdvancedInterpolationOptions;
