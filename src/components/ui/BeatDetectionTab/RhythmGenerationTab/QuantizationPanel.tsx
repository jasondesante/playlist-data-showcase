/**
 * QuantizationPanel Component
 *
 * Container for quantization visualizations in the rhythm generation feature.
 * Displays:
 * - Header with total quantized beats count
 * - Summary statistics (avg quantization error, grid type distribution)
 * - Per-band quantization breakdown cards
 * - Grid decision timeline (Task 6.2)
 * - Placeholder for quantized beat timeline (Task 6.3)
 *
 * Part of Phase 6: Quantization Visualization (Task 6.1)
 */

import { useMemo, useState } from 'react';
import { Grid3X3, TrendingUp, BarChart3 } from 'lucide-react';
import './QuantizationPanel.css';
import { GridDecisionTimeline } from '../../GridDecisionTimeline';
import { QuantizedBeatTimeline } from '../../QuantizedBeatTimeline';
import { QuantizationErrorHistogram } from '../../QuantizationErrorHistogram';
import { ZoomControls } from '../../ZoomControls';
import type {
    GeneratedRhythm,
    GeneratedBeat,
    GridDecision,
    Band,
    HighlightedRegion,
} from '../../../../types/rhythmGeneration';

// ============================================================
// Types
// ============================================================

export interface QuantizationPanelProps {
    /** The generated rhythm containing quantization results */
    rhythm: GeneratedRhythm;
    /** Current audio playback time in seconds (for timeline sync) */
    currentTime?: number;
    /** Total audio duration in seconds */
    duration?: number;
    /** Whether audio is currently playing */
    isPlaying?: boolean;
    /** Callback when user seeks to a time position */
    onSeek?: (time: number) => void;
    /** Highlighted regions to show on timelines (for phrase occurrences) */
    highlightedRegions?: HighlightedRegion[];
    /** Additional CSS class names */
    className?: string;
}

/**
 * Band color scheme (as defined in the plan)
 */
const BAND_COLORS: Record<Band, string> = {
    low: '#3b82f6',    // Blue
    mid: '#22c55e',    // Green
    high: '#f97316',   // Orange
};

// ============================================================
// Sub-components
// ============================================================

/**
 * Summary stat card component
 */
interface StatCardProps {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    badge?: string;
    color?: 'default' | 'primary' | 'success' | 'warning';
}

function StatCard({ label, value, icon, badge, color = 'default' }: StatCardProps) {
    return (
        <div className={`quantization-stat-card quantization-stat-card--${color}`}>
            {icon && <div className="quantization-stat-icon">{icon}</div>}
            <div className="quantization-stat-content">
                <span className="quantization-stat-label">{label}</span>
                <div className="quantization-stat-value-row">
                    <span className="quantization-stat-value">{value}</span>
                    {badge && <span className="quantization-stat-badge">{badge}</span>}
                </div>
            </div>
        </div>
    );
}

/**
 * Grid type distribution bar component
 */
interface GridDistributionBarProps {
    straightCount: number;
    tripletCount: number;
}

function GridDistributionBar({ straightCount, tripletCount }: GridDistributionBarProps) {
    const total = straightCount + tripletCount;
    const straightPercent = total > 0 ? (straightCount / total) * 100 : 0;
    const tripletPercent = total > 0 ? (tripletCount / total) * 100 : 0;

    return (
        <div className="quantization-grid-distribution">
            <div className="quantization-distribution-bar">
                <div
                    className="quantization-distribution-segment quantization-distribution-segment--straight"
                    style={{ width: `${straightPercent}%` }}
                    title={`Straight 16th: ${straightCount} (${straightPercent.toFixed(1)}%)`}
                />
                <div
                    className="quantization-distribution-segment quantization-distribution-segment--triplet"
                    style={{ width: `${tripletPercent}%` }}
                    title={`Triplet 8th: ${tripletCount} (${tripletPercent.toFixed(1)}%)`}
                />
            </div>
            <div className="quantization-distribution-legend">
                <div className="quantization-distribution-legend-item">
                    <span className="quantization-distribution-marker quantization-distribution-marker--straight" />
                    <span className="quantization-distribution-label">Straight 16th</span>
                    <span className="quantization-distribution-count">{straightCount}</span>
                </div>
                <div className="quantization-distribution-legend-item">
                    <span className="quantization-distribution-marker quantization-distribution-marker--triplet" />
                    <span className="quantization-distribution-label">Triplet 8th</span>
                    <span className="quantization-distribution-count">{tripletCount}</span>
                </div>
            </div>
        </div>
    );
}

/**
 * Per-band quantization breakdown card
 */
interface BandQuantizationCardProps {
    band: Band;
    beats: GeneratedBeat[];
    gridDecisions: GridDecision[];
    color: string;
}

function BandQuantizationCard({ band, beats, gridDecisions, color }: BandQuantizationCardProps) {
    const stats = useMemo(() => {
        const count = beats.length;
        const avgIntensity = count > 0
            ? beats.reduce((sum, b) => sum + b.intensity, 0) / count
            : 0;

        // Calculate average quantization error (only for beats that have it)
        const beatsWithError = beats.filter(b => b.quantizationError !== undefined);
        const avgError = beatsWithError.length > 0
            ? beatsWithError.reduce((sum, b) => sum + (b.quantizationError || 0), 0) / beatsWithError.length
            : 0;

        // Grid type distribution
        const straightCount = gridDecisions.filter(d => d.selectedGrid === 'straight_16th').length;
        const tripletCount = gridDecisions.filter(d => d.selectedGrid === 'triplet_8th').length;

        // Average confidence
        const avgConfidence = gridDecisions.length > 0
            ? gridDecisions.reduce((sum, d) => sum + d.confidence, 0) / gridDecisions.length
            : 0;

        return {
            count,
            avgIntensity,
            avgError,
            straightCount,
            tripletCount,
            avgConfidence,
        };
    }, [beats, gridDecisions]);

    return (
        <div className="quantization-band-card" style={{ '--band-color': color } as React.CSSProperties}>
            <div className="quantization-band-card-header">
                <span className="quantization-band-card-name">
                    {band.charAt(0).toUpperCase() + band.slice(1)}
                </span>
                <span className="quantization-band-card-count">{stats.count}</span>
            </div>

            <div className="quantization-band-card-stats">
                <div className="quantization-band-card-stat">
                    <span className="quantization-band-card-stat-label">Avg Error</span>
                    <span className="quantization-band-card-stat-value">
                        {stats.avgError.toFixed(1)}ms
                    </span>
                </div>
                <div className="quantization-band-card-stat">
                    <span className="quantization-band-card-stat-label">Avg Intensity</span>
                    <span className="quantization-band-card-stat-value">
                        {(stats.avgIntensity * 100).toFixed(0)}%
                    </span>
                </div>
                <div className="quantization-band-card-stat">
                    <span className="quantization-band-card-stat-label">Grid Split</span>
                    <span className="quantization-band-card-stat-value">
                        {stats.straightCount} / {stats.tripletCount}
                    </span>
                </div>
                <div className="quantization-band-card-stat">
                    <span className="quantization-band-card-stat-label">Avg Confidence</span>
                    <span className="quantization-band-card-stat-value">
                        {(stats.avgConfidence * 100).toFixed(0)}%
                    </span>
                </div>
            </div>

            {/* Mini grid distribution bar */}
            {(stats.straightCount > 0 || stats.tripletCount > 0) && (
                <GridDistributionBar
                    straightCount={stats.straightCount}
                    tripletCount={stats.tripletCount}
                />
            )}

            <div className="quantization-band-card-indicator" style={{ backgroundColor: color }} />
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

/**
 * QuantizationPanel
 *
 * Main container for quantization visualizations.
 * Displays summary statistics and per-band quantization breakdowns.
 */
export function QuantizationPanel({
    rhythm,
    currentTime = 0,
    duration = 0,
    isPlaying = false,
    onSeek,
    highlightedRegions = [],
    className,
}: QuantizationPanelProps) {
    // Get quantization data from the rhythm
    const quantizationResult = rhythm.analysis.quantizationResult;
    const bandStreams = rhythm.bandStreams;
    const composite = rhythm.composite;

    // State for band filter in grid decision timeline
    const [selectedBand, setSelectedBand] = useState<Band | 'all'>('all');

    // State for beat timeline band filter
    const [selectedBeatBand, setSelectedBeatBand] = useState<Band | 'all'>('all');

    // Zoom state - controls the visible time window for timelines
    const [zoomLevel, setZoomLevel] = useState(1);
    // Base windows at zoom level 1
    const baseAnticipationWindow = 2.0;
    const basePastWindow = 4.0;
    // Calculate windows based on zoom (higher zoom = smaller windows = more detail)
    const anticipationWindow = baseAnticipationWindow / zoomLevel;
    const pastWindow = basePastWindow / zoomLevel;

    // Get beats for QuantizedBeatTimeline
    const allBeatsForTimeline = useMemo(() => {
        if (selectedBeatBand === 'all') {
            return [
                ...bandStreams.low.beats,
                ...bandStreams.mid.beats,
                ...bandStreams.high.beats,
            ];
        }
        return bandStreams[selectedBeatBand].beats;
    }, [bandStreams, selectedBeatBand]);

    // Calculate overall statistics
    const overallStats = useMemo(() => {
        const allBeats: GeneratedBeat[] = [
            ...bandStreams.low.beats,
            ...bandStreams.mid.beats,
            ...bandStreams.high.beats,
        ];

        const allGridDecisions: GridDecision[] = [
            ...bandStreams.low.gridDecisions,
            ...bandStreams.mid.gridDecisions,
            ...bandStreams.high.gridDecisions,
        ];

        const totalBeats = allBeats.length;

        // Average quantization error
        const beatsWithError = allBeats.filter(b => b.quantizationError !== undefined);
        const avgError = beatsWithError.length > 0
            ? beatsWithError.reduce((sum, b) => sum + (b.quantizationError || 0), 0) / beatsWithError.length
            : 0;

        // Max quantization error
        const maxError = beatsWithError.length > 0
            ? Math.max(...beatsWithError.map(b => b.quantizationError || 0))
            : 0;

        // Grid type distribution
        const straightCount = allGridDecisions.filter(d => d.selectedGrid === 'straight_16th').length;
        const tripletCount = allGridDecisions.filter(d => d.selectedGrid === 'triplet_8th').length;

        // Average confidence across all grid decisions
        const avgConfidence = allGridDecisions.length > 0
            ? allGridDecisions.reduce((sum, d) => sum + d.confidence, 0) / allGridDecisions.length
            : 0;

        // Density validation info
        const densityValidation = quantizationResult.metadata.densityValidation;

        return {
            totalBeats,
            avgError,
            maxError,
            straightCount,
            tripletCount,
            avgConfidence,
            densityValidation,
            transientsFiltered: quantizationResult.metadata.transientsFilteredByIntensity,
        };
    }, [bandStreams, quantizationResult]);

    // Get bands in order
    const bands: Band[] = ['low', 'mid', 'high'];

    // Get grid decisions for selected band
    const gridDecisionsForTimeline = useMemo(() => {
        if (selectedBand === 'all') {
            // For "all" view, we need to merge grid decisions
            // Since beatIndex can overlap between bands, we'll show all of them
            return [
                ...bandStreams.low.gridDecisions,
                ...bandStreams.mid.gridDecisions,
                ...bandStreams.high.gridDecisions,
            ];
        }
        return bandStreams[selectedBand].gridDecisions;
    }, [bandStreams, selectedBand]);

    // Calculate beat timestamps from quarter note interval
    // The beatIndex in GridDecision refers to quarter note beats
    const beatTimestamps = useMemo(() => {
        const quarterNoteInterval = composite.quarterNoteInterval;
        const maxBeatIndex = Math.max(
            ...bandStreams.low.gridDecisions.map(d => d.beatIndex),
            ...bandStreams.mid.gridDecisions.map(d => d.beatIndex),
            ...bandStreams.high.gridDecisions.map(d => d.beatIndex),
            0
        );

        // Create array of timestamps: index -> timestamp
        // Beat 0 is at time 0, beat 1 is at quarterNoteInterval, etc.
        const timestamps: number[] = [];
        for (let i = 0; i <= maxBeatIndex; i++) {
            timestamps.push(i * quarterNoteInterval);
        }
        return timestamps;
    }, [composite.quarterNoteInterval, bandStreams]);

    return (
        <div className={`quantization-panel ${className || ''}`}>
            {/* Header with total count */}
            <div className="quantization-header">
                <div className="quantization-title">
                    <Grid3X3 size={18} />
                    <span>Quantization Results</span>
                </div>
                <div className="quantization-count">
                    <span className="quantization-count-value">{overallStats.totalBeats}</span>
                    <span className="quantization-count-label">quantized beats</span>
                </div>
            </div>

            {/* Summary statistics */}
            <div className="quantization-summary">
                <StatCard
                    label="Total Beats"
                    value={overallStats.totalBeats}
                    icon={<Grid3X3 size={16} />}
                    color="primary"
                />
                <StatCard
                    label="Avg Error"
                    value={`${overallStats.avgError.toFixed(1)}ms`}
                    icon={<TrendingUp size={16} />}
                    badge={overallStats.maxError > 50 ? `max ${overallStats.maxError.toFixed(0)}ms` : undefined}
                    color={overallStats.avgError < 20 ? 'success' : 'warning'}
                />
                <StatCard
                    label="Avg Confidence"
                    value={`${(overallStats.avgConfidence * 100).toFixed(0)}%`}
                    icon={<BarChart3 size={16} />}
                    color="default"
                />
            </div>

            {/* Overall grid distribution */}
            <div className="quantization-grid-section">
                <h4 className="quantization-section-title">Grid Type Distribution</h4>
                <GridDistributionBar
                    straightCount={overallStats.straightCount}
                    tripletCount={overallStats.tripletCount}
                />
            </div>

            {/* Quantization Error Histogram (Task 6.4) */}
            <QuantizationErrorHistogram
                beats={[
                    ...bandStreams.low.beats,
                    ...bandStreams.mid.beats,
                    ...bandStreams.high.beats,
                ]}
            />

            {/* Density validation info */}
            {overallStats.densityValidation && (
                <div className="quantization-density-info">
                    <div className="quantization-density-item">
                        <span className="quantization-density-label">Density Validation</span>
                        <span className={`quantization-density-status ${overallStats.densityValidation.isValid ? 'valid' : 'warning'}`}>
                            {overallStats.densityValidation.isValid ? 'Passed' : 'Adjusted'}
                        </span>
                    </div>
                    {overallStats.densityValidation.maxRetryCount > 0 && (
                        <div className="quantization-density-item">
                            <span className="quantization-density-label">Retries</span>
                            <span className="quantization-density-value">
                                {overallStats.densityValidation.maxRetryCount}
                            </span>
                        </div>
                    )}
                    {overallStats.transientsFiltered > 0 && (
                        <div className="quantization-density-item">
                            <span className="quantization-density-label">Filtered</span>
                            <span className="quantization-density-value">
                                {overallStats.transientsFiltered} transients
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Per-band breakdown cards */}
            <div className="quantization-bands-section">
                <h4 className="quantization-section-title">Per-Band Breakdown</h4>
                <div className="quantization-bands">
                    {bands.map((band) => (
                        <BandQuantizationCard
                            key={band}
                            band={band}
                            beats={bandStreams[band].beats}
                            gridDecisions={bandStreams[band].gridDecisions}
                            color={BAND_COLORS[band]}
                        />
                    ))}
                </div>
            </div>

            {/* Grid Decision Timeline (Task 6.2) */}
            <div className="quantization-timeline-section">
                <div className="quantization-timeline-header">
                    <h4 className="quantization-section-title">Grid Decision Timeline</h4>
                    <div className="quantization-timeline-controls">
                        <div className="quantization-band-selector">
                            <span className="quantization-band-selector-label">Band:</span>
                            <button
                                className={`quantization-band-btn ${selectedBand === 'all' ? 'active' : ''}`}
                                onClick={() => setSelectedBand('all')}
                            >
                                All
                            </button>
                            {bands.map((band) => (
                                <button
                                    key={band}
                                    className={`quantization-band-btn ${selectedBand === band ? 'active' : ''}`}
                                    onClick={() => setSelectedBand(band)}
                                    style={{ '--band-color': BAND_COLORS[band] } as React.CSSProperties}
                                >
                                    {band.charAt(0).toUpperCase() + band.slice(1)}
                                </button>
                            ))}
                        </div>
                        <ZoomControls
                            zoomLevel={zoomLevel}
                            onZoomChange={setZoomLevel}
                            minZoom={0.5}
                            maxZoom={4}
                            size="sm"
                        />
                    </div>
                </div>
                <GridDecisionTimeline
                    gridDecisions={gridDecisionsForTimeline}
                    beatTimestamps={beatTimestamps}
                    currentTime={currentTime}
                    duration={duration}
                    isPlaying={isPlaying}
                    onSeek={onSeek}
                    anticipationWindow={anticipationWindow}
                    pastWindow={pastWindow}
                />
            </div>

            {/* Quantized Beat Timeline (Task 6.3) */}
            <div className="quantization-beat-timeline-section">
                <div className="quantization-timeline-header">
                    <h4 className="quantization-section-title">Quantized Beat Timeline</h4>
                    <div className="quantization-band-selector">
                        <span className="quantization-band-selector-label">Band:</span>
                        <button
                            className={`quantization-band-btn ${selectedBeatBand === 'all' ? 'active' : ''}`}
                            onClick={() => setSelectedBeatBand('all')}
                        >
                            All
                        </button>
                        {bands.map((band) => (
                            <button
                                key={band}
                                className={`quantization-band-btn ${selectedBeatBand === band ? 'active' : ''}`}
                                onClick={() => setSelectedBeatBand(band)}
                                style={{ '--band-color': BAND_COLORS[band] } as React.CSSProperties}
                            >
                                {band.charAt(0).toUpperCase() + band.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <QuantizedBeatTimeline
                    beats={allBeatsForTimeline}
                    quarterNoteInterval={composite.quarterNoteInterval}
                    currentTime={currentTime}
                    duration={duration}
                    isPlaying={isPlaying}
                    onSeek={onSeek}
                    filterBand={selectedBeatBand}
                    highlightedRegions={highlightedRegions}
                />
            </div>
        </div>
    );
}

export default QuantizationPanel;
