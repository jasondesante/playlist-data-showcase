/**
 * TransientDetectionPanel Component
 *
 * Container for transient detection visualizations in the rhythm generation feature.
 * Displays:
 * - Header with total transient count
 * - Intensity filter slider (filters displayed transients)
 * - "Show all bands" toggle
 * - Band breakdown cards
 * - Timeline visualization (Task 4.2)
 * - Inspector for selected transient (Task 4.4)
 *
 * Part of Phase 4: Transient Detection Visualization (Task 4.1)
 */

import { useState, useMemo } from 'react';
import { Filter, Layers, RefreshCw } from 'lucide-react';
import './TransientDetectionPanel.css';
import { TransientTimeline } from '../../TransientTimeline';
import { TransientInspector } from '../../TransientInspector';
import { ZoomControls } from '../../ZoomControls';
import { Tooltip } from '../../Tooltip';
import type { GeneratedRhythm, TransientResult, Band, BandTransientConfigOverrides, BandTransientConfig } from '../../../../types/rhythmGeneration';
import { DEFAULT_BAND_TRANSIENT_CONFIG } from '../../../../types/rhythmGeneration';

// ============================================================
// Types
// ============================================================

export interface TransientDetectionPanelProps {
    /** The generated rhythm containing transient analysis */
    rhythm: GeneratedRhythm;
    /** Current audio playback time in seconds (for inspector display) */
    currentTime?: number;
    /** Callback when user seeks to a time position (for inspector) */
    onSeek?: (time: number) => void;
    /** Additional CSS class names */
    className?: string;
    /** The intensity threshold that was used during generation */
    originalIntensityThreshold?: number;
    /** Per-band transient detection config that was used during generation */
    transientConfig?: BandTransientConfigOverrides;
    /** Callback to re-run generation with a new threshold */
    onRegenerateWithThreshold?: (threshold: number) => void;
    /** Whether regeneration is in progress */
    isRegenerating?: boolean;
}

/**
 * Band color scheme (as defined in the plan)
 */
const BAND_COLORS: Record<Band, string> = {
    low: '#3b82f6',    // Blue
    mid: '#22c55e',    // Green
    high: '#f97316',   // Orange
};

/**
 * Frequency range labels for each band
 */
const BAND_RANGES: Record<Band, string> = {
    low: '20-500 Hz',
    mid: '500-2000 Hz',
    high: '2000-20000 Hz',
};

/**
 * Detection method display names
 */
const DETECTION_METHOD_LABELS: Record<string, string> = {
    energy: 'Energy',
    spectral_flux: 'Spectral Flux',
    hfc: 'HFC',
};

// ============================================================
// Sub-components
// ============================================================

/**
 * Intensity filter slider component
 */
interface IntensityFilterProps {
    value: number;
    onChange: (value: number) => void;
    totalTransients: number;
    hiddenCount: number;
    min?: number;
    max?: number;
    step?: number;
    /** The threshold used during generation - if different from current, show re-run button */
    originalThreshold?: number;
    /** Callback to re-run generation with current threshold */
    onRerun?: () => void;
    /** Whether regeneration is in progress */
    isRegenerating?: boolean;
}

function IntensityFilter({
    value,
    onChange,
    totalTransients,
    hiddenCount,
    min = 0,
    max = 1,
    step = 0.05,
    originalThreshold = 0,
    onRerun,
    isRegenerating = false,
}: IntensityFilterProps) {
    // Show re-run button if threshold differs from original (with small epsilon for float comparison)
    const thresholdChanged = Math.abs(value - originalThreshold) > 0.001;

    return (
        <div className="transient-intensity-filter">
            <label className="transient-intensity-label">
                <Filter size={14} />
                <span>Intensity Threshold</span>
                <span className="transient-intensity-value">{(value * 100).toFixed(0)}%</span>
            </label>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="transient-intensity-slider"
                aria-label="Filter transients by intensity"
            />
            <div className="transient-intensity-range">
                <span>0%</span>
                <span>100%</span>
            </div>
            <div className="transient-intensity-hidden-row">
                <div className="transient-intensity-hidden-count">
                    <span className="transient-intensity-hidden-label">Hidden:</span>
                    <span className="transient-intensity-hidden-value">{hiddenCount}</span>
                    <span className="transient-intensity-hidden-total">/ {totalTransients} transients</span>
                </div>
                {thresholdChanged && onRerun && (
                    <button
                        className="transient-intensity-rerun"
                        onClick={onRerun}
                        disabled={isRegenerating}
                        title={`Re-run generation with ${(value * 100).toFixed(0)}% threshold`}
                    >
                        <RefreshCw
                            size={14}
                            className={`transient-intensity-rerun-icon ${isRegenerating ? 'spinning' : ''}`}
                        />
                        <span className="transient-intensity-rerun-text">
                            {isRegenerating ? 'Regenerating...' : `Re-run`}
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Toggle for showing/hiding bands
 */
interface BandToggleProps {
    activeBand: Band | 'all';
    onBandChange: (band: Band | 'all') => void;
}

function BandToggle({ activeBand, onBandChange }: BandToggleProps) {
    const bands: (Band | 'all')[] = ['all', 'low', 'mid', 'high'];

    return (
        <div className="transient-band-toggle">
            <label className="transient-band-toggle-label">
                <Layers size={14} />
                <span>Show Bands</span>
            </label>
            <div className="transient-band-buttons">
                {bands.map((band) => (
                    <button
                        key={band}
                        className={`transient-band-button ${activeBand === band ? 'active' : ''}`}
                        onClick={() => onBandChange(band)}
                        style={band !== 'all' ? { '--band-color': BAND_COLORS[band] } as React.CSSProperties : {}}
                        aria-pressed={activeBand === band}
                    >
                        {band === 'all' ? 'All' : band.charAt(0).toUpperCase() + band.slice(1)}
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * Band breakdown card showing statistics for a single band
 */
interface BandBreakdownCardProps {
    band: Band;
    transients: TransientResult[];
    totalCount: number;
    hiddenCount: number;
    color: string;
    frequencyRange: string;
}

function BandBreakdownCard({ band, transients, totalCount, hiddenCount, color, frequencyRange }: BandBreakdownCardProps) {
    // Calculate statistics
    const visibleCount = transients.length;
    const avgIntensity = visibleCount > 0
        ? transients.reduce((sum, t) => sum + t.intensity, 0) / visibleCount
        : 0;

    // Get detection method breakdown
    const methodCounts = transients.reduce((acc, t) => {
        acc[t.detectionMethod] = (acc[t.detectionMethod] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const primaryMethod = Object.entries(methodCounts)
        .sort((a, b) => b[1] - a[1])[0];

    return (
        <div className="transient-band-card" style={{ '--band-color': color } as React.CSSProperties}>
            <div className="transient-band-card-header">
                <span className="transient-band-card-name">{band.charAt(0).toUpperCase() + band.slice(1)}</span>
                <span className="transient-band-card-count">
                    {hiddenCount > 0 ? `${visibleCount} / ${totalCount}` : visibleCount}
                </span>
            </div>
            <div className="transient-band-card-range">{frequencyRange}</div>
            <div className="transient-band-card-stats">
                <div className="transient-band-card-stat">
                    <span className="transient-band-card-stat-label">Avg Intensity</span>
                    <span className="transient-band-card-stat-value">{(avgIntensity * 100).toFixed(0)}%</span>
                </div>
                {primaryMethod && (
                    <div className="transient-band-card-stat">
                        <span className="transient-band-card-stat-label">Method</span>
                        <span className="transient-band-card-stat-badge">
                            {DETECTION_METHOD_LABELS[primaryMethod[0]] || primaryMethod[0]}
                        </span>
                    </div>
                )}
            </div>
            <div className="transient-band-card-indicator" style={{ backgroundColor: color }} />
        </div>
    );
}


// ============================================================
// Main Component
// ============================================================

/**
 * TransientDetectionPanel
 *
 * Main container for transient detection visualizations.
 * Provides filtering controls and displays band breakdowns and timeline.
 */
export function TransientDetectionPanel({
    rhythm,
    currentTime = 0,
    onSeek,
    className,
    originalIntensityThreshold = 0,
    transientConfig,
    onRegenerateWithThreshold,
    isRegenerating = false,
}: TransientDetectionPanelProps) {
    // Get transient analysis from the rhythm
    const transientAnalysis = rhythm.analysis.transientAnalysis;
    const allTransients = transientAnalysis.transients;

    // Get duration from metadata or estimate from last transient
    const duration = rhythm.metadata.duration > 0
        ? rhythm.metadata.duration
        : Math.max(...allTransients.map(t => t.timestamp), 0) + 1;

    // Filter state - initialize with the original threshold used during generation
    const [intensityThreshold, setIntensityThreshold] = useState(originalIntensityThreshold);
    const [activeBand, setActiveBand] = useState<Band | 'all'>('all');

    // Selected transient state for inspector
    const [selectedTransient, setSelectedTransient] = useState<TransientResult | null>(null);
    const [selectedTransientIndex, setSelectedTransientIndex] = useState<number | null>(null);

    // Zoom state - controls the visible time window
    const [zoomLevel, setZoomLevel] = useState(1);
    // Base windows at zoom level 1
    const baseAnticipationWindow = 2.0;
    const basePastWindow = 4.0;
    // Calculate windows based on zoom (higher zoom = smaller windows = more detail)
    const anticipationWindow = baseAnticipationWindow / zoomLevel;
    const pastWindow = basePastWindow / zoomLevel;

    // Group transients by band for breakdown cards (filtered by intensity threshold)
    const transientsByBand = useMemo(() => {
        const groups: Record<Band, TransientResult[]> = {
            low: [],
            mid: [],
            high: [],
        };
        // Only include transients that meet the intensity threshold
        const filteredTransients = allTransients.filter((t) => t.intensity >= intensityThreshold);
        filteredTransients.forEach((t) => {
            groups[t.band].push(t);
        });
        return groups;
    }, [allTransients, intensityThreshold]);

    // Calculate total count
    const totalCount = allTransients.length;

    // Calculate hidden transients count based on intensity threshold (for display filter)
    const hiddenByIntensity = useMemo(() => {
        return allTransients.filter((t) => t.intensity < intensityThreshold).length;
    }, [allTransients, intensityThreshold]);

    // ========================================
    // Quantization Summary Data
    // Shows what actually happened during the engine's quantization step
    // ========================================
    const quantizationResult = rhythm.analysis.quantizationResult;
    const quantizationMetadata = quantizationResult.metadata;

    // Calculate total transients that made it through to quantization
    const quantizedBeatsCount = useMemo(() => {
        return (
            rhythm.bandStreams.low.beats.length +
            rhythm.bandStreams.mid.beats.length +
            rhythm.bandStreams.high.beats.length
        );
    }, [rhythm.bandStreams]);

    // Calculate total count per band (unfiltered)
    const totalByBand = useMemo(() => {
        const counts: Record<Band, number> = { low: 0, mid: 0, high: 0 };
        allTransients.forEach((t) => {
            counts[t.band]++;
        });
        return counts;
    }, [allTransients]);

    // Calculate hidden count per band
    const hiddenByBand = useMemo(() => {
        const counts: Record<Band, number> = { low: 0, mid: 0, high: 0 };
        allTransients.filter((t) => t.intensity < intensityThreshold).forEach((t) => {
            counts[t.band]++;
        });
        return counts;
    }, [allTransients, intensityThreshold]);

    // Handle transient click for inspector
    const handleTransientClick = (transient: TransientResult, index: number) => {
        setSelectedTransient(transient);
        setSelectedTransientIndex(index);
    };

    // ========================================
    // Calculate quantization summary stats
    // ========================================
    const transientsDetected = rhythm.metadata.transientsDetected;
    const transientsFiltered = rhythm.metadata.transientsFilteredByIntensity;
    const transientsRemaining = transientsDetected - transientsFiltered;
    const densityValidation = quantizationMetadata.densityValidation;
    const maxRetryCount = densityValidation.maxRetryCount;

    // Calculate per-band quantized counts (beats that made it through)
    const quantizedByBandForSummary = {
        low: rhythm.bandStreams.low.beats.length,
        mid: rhythm.bandStreams.mid.beats.length,
        high: rhythm.bandStreams.high.beats.length,
    };

    return (
        <div className={`transient-detection-panel ${className || ''}`}>
            {/* Detection Configuration Used */}
            <div className="transient-config-summary">
                <h4 className="transient-config-summary-title">Detection Configuration Used</h4>
                <p className="transient-config-summary-description">
                    {transientConfig
                        ? 'Custom per-band settings were applied during transient detection.'
                        : 'Default per-band settings were used for transient detection.'}
                </p>
                <div className="transient-config-per-band">
                    {(['low', 'mid', 'high'] as const).map((band) => {
                        const config: BandTransientConfig = transientConfig?.[band]
                            ? { ...DEFAULT_BAND_TRANSIENT_CONFIG[band], ...transientConfig[band] }
                            : DEFAULT_BAND_TRANSIENT_CONFIG[band];
                        const isCustom = !!transientConfig?.[band];
                        return (
                            <div key={band} className={`transient-config-band transient-config-band--${band}`}>
                                <div className="transient-config-band-header">
                                    <span className="transient-config-band-name">
                                        {band.charAt(0).toUpperCase() + band.slice(1)}
                                    </span>
                                    {isCustom && (
                                        <span className="transient-config-band-custom-badge">Custom</span>
                                    )}
                                </div>
                                <div className="transient-config-band-stats">
                                    <div className="transient-config-band-stat">
                                        <span className="transient-config-band-stat-label">Threshold</span>
                                        <span className="transient-config-band-stat-value">{config.threshold.toFixed(2)}</span>
                                    </div>
                                    <div className="transient-config-band-stat">
                                        <span className="transient-config-band-stat-label">
                                            Min Interval
                                            <Tooltip content="Non-Maximum Suppression (NMS): Within each band's buffer window (20-50ms depending on frequency), only the strongest transient is kept. Weaker peaks are suppressed to prevent multiple detections for the same acoustic event." />
                                        </span>
                                        <span className="transient-config-band-stat-value">{(config.minInterval * 1000).toFixed(0)}ms</span>
                                    </div>
                                    <div className="transient-config-band-stat">
                                        <span className="transient-config-band-stat-label">Adaptive</span>
                                        <span className="transient-config-band-stat-value">{config.adaptiveThresholding ? 'On' : 'Off'}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Quantization Summary - shows what happened during quantization */}
            <div className="transient-quantization-summary">
                <h4 className="transient-quantization-title">Quantization Results</h4>
                <p className="transient-quantization-description">
                    During quantization, {transientsFiltered} transients were filtered out by intensity thresholding and density validation,
                    leaving {transientsRemaining} transients to be quantized into {quantizedBeatsCount} beats.
                </p>
                <div className="transient-quantization-stats">
                    <div className="transient-quantization-stat">
                        <span className="transient-quantization-stat-label">Original</span>
                        <span className="transient-quantization-stat-value">{transientsDetected}</span>
                    </div>
                    <div className="transient-quantization-stat">
                        <span className="transient-quantization-stat-label">Filtered</span>
                        <span className="transient-quantization-stat-value">{transientsFiltered}</span>
                    </div>
                    <div className="transient-quantization-stat">
                        <span className="transient-quantization-stat-label">Remaining</span>
                        <span className="transient-quantization-stat-value">{transientsRemaining}</span>
                    </div>
                    <div className="transient-quantization-stat">
                        <span className="transient-quantization-stat-label">Quantized</span>
                        <span className="transient-quantization-stat-value">{quantizedBeatsCount}</span>
                    </div>
                    {maxRetryCount > 0 && (
                        <div className="transient-quantization-stat">
                            <span className="transient-quantization-stat-label">Retries</span>
                            <span className="transient-quantization-stat-value">{maxRetryCount}</span>
                        </div>
                    )}
                </div>
                {/* Per-band quantized counts */}
                <div className="transient-quantization-per-band">
                    <h5 className="transient-quantization-per-band-title">Per-Band Breakdown</h5>
                    {(Object.keys(quantizedByBandForSummary) as Band[]).map((band) => {
                        const bandValidation = densityValidation.bands[band];
                        const hasRetries = bandValidation.retryCount > 0;
                        return (
                            <div key={band} className="transient-quantization-band">
                                <span className="transient-quantization-band-name">
                                    {band.charAt(0).toUpperCase() + band.slice(1)}
                                </span>
                                <span className="transient-quantization-band-count">
                                    {totalByBand[band]} → {quantizedByBandForSummary[band]}
                                </span>
                                {hasRetries && (
                                    <span className="transient-quantization-band-retries" title="Density validation retries">
                                        ({bandValidation.retryCount} retries, threshold: {(bandValidation.finalIntensityThreshold * 100).toFixed(0)}%)
                                    </span>
                                )}
                                {hasRetries && bandValidation.sensitivityReduction > 0 && (
                                    <span className="transient-quantization-band-sensitivity" title="Sensitivity reduction applied">
                                        sensitivity -{(bandValidation.sensitivityReduction * 100).toFixed(0)}%
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Filter controls */}
            <div className="transient-detection-controls">
                <IntensityFilter
                    value={intensityThreshold}
                    onChange={setIntensityThreshold}
                    totalTransients={totalCount}
                    hiddenCount={hiddenByIntensity}
                    originalThreshold={originalIntensityThreshold}
                    onRerun={onRegenerateWithThreshold ? () => onRegenerateWithThreshold(intensityThreshold) : undefined}
                    isRegenerating={isRegenerating}
                />
                <BandToggle
                    activeBand={activeBand}
                    onBandChange={setActiveBand}
                />
            </div>

            {/* Band breakdown cards */}
            <div className="transient-detection-bands">
                {(Object.keys(transientsByBand) as Band[]).map((band) => (
                    <BandBreakdownCard
                        key={band}
                        band={band}
                        transients={transientsByBand[band]}
                        totalCount={totalByBand[band]}
                        hiddenCount={hiddenByBand[band]}
                        color={BAND_COLORS[band]}
                        frequencyRange={BAND_RANGES[band]}
                    />
                ))}
            </div>

            {/* Transient Timeline (Task 4.2) */}
            <div className="transient-timeline-section">
                {/* Timeline header with zoom controls */}
                <div className="transient-timeline-header">
                    <span className="transient-timeline-title">Timeline</span>
                    <ZoomControls
                        zoomLevel={zoomLevel}
                        onZoomChange={setZoomLevel}
                        minZoom={0.5}
                        maxZoom={4}
                        size="sm"
                    />
                </div>
                <TransientTimeline
                    transients={allTransients}
                    duration={duration}
                    onTransientClick={handleTransientClick}
                    selectedTransientIndex={selectedTransientIndex}
                    filterBand={activeBand}
                    intensityThreshold={intensityThreshold}
                    anticipationWindow={anticipationWindow}
                    pastWindow={pastWindow}
                />
            </div>

            {/* Inspector (Task 4.4) */}
            <TransientInspector
                selectedTransient={selectedTransient}
                selectedIndex={selectedTransientIndex}
                currentTime={currentTime}
                onClear={() => {
                    setSelectedTransient(null);
                    setSelectedTransientIndex(null);
                }}
                onSeek={onSeek}
            />
        </div>
    );
}

export default TransientDetectionPanel;
