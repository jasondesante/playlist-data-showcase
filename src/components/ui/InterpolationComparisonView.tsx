/**
 * InterpolationComparisonView Component
 *
 * A side-by-side comparison view of all three interpolation algorithms.
 * Part of Task 7.1: Create InterpolationComparisonView Component
 *
 * Features:
 * - Generates interpolated beat maps for all 3 algorithms
 * - Displays timelines side by side for visual comparison
 * - Shows comparison statistics table
 * - Highlights differences in beat placement
 * - Synchronized time window scrolling
 *
 * @component
 */
import { useMemo, useState, useCallback } from 'react';
import { Layers, Clock, Target, TrendingUp, AlertCircle } from 'lucide-react';
import './InterpolationComparisonView.css';
import type {
    BeatMap,
    InterpolationAlgorithm,
    InterpolatedBeatMap,
    BeatInterpolationOptions,
} from '@/types';
import { DEFAULT_BEAT_INTERPOLATION_OPTIONS, BeatInterpolator } from '@/types';

/**
 * Algorithm configuration for display
 */
interface AlgorithmConfig {
    id: InterpolationAlgorithm;
    label: string;
    shortLabel: string;
    description: string;
    color: string;
}

const ALGORITHMS: AlgorithmConfig[] = [
    {
        id: 'histogram-grid',
        label: 'Histogram-Based Fixed Grid',
        shortLabel: 'Histogram',
        description: 'Uses the most common interval as a rigid grid.',
        color: 'hsl(199, 89%, 48%)', // Blue
    },
    {
        id: 'adaptive-phase-locked',
        label: 'Adaptive Phase-Locked',
        shortLabel: 'Adaptive',
        description: 'Adjusts tempo at each detected beat anchor.',
        color: 'hsl(142, 76%, 46%)', // Green
    },
    {
        id: 'dual-pass',
        label: 'Dual-Pass with Confidence',
        shortLabel: 'Dual-Pass',
        description: 'Advanced algorithm with KDE peak finding.',
        color: 'hsl(48, 96%, 53%)', // Yellow/Gold
    },
];

/**
 * Statistics for a single algorithm's interpolation result
 */
interface AlgorithmStats {
    algorithm: InterpolationAlgorithm;
    totalBeats: number;
    detectedBeats: number;
    interpolatedBeats: number;
    interpolationRatio: number;
    avgConfidence: number;
    quarterNoteBpm: number;
    quarterNoteConfidence: number;
    tempoDriftRatio: number;
    gridAlignmentScore: number;
    interpolatedBeatMap: InterpolatedBeatMap;
}

/**
 * Beat marker for the simplified timeline display
 */
interface ComparisonBeat {
    timestamp: number;
    isDownbeat: boolean;
    source: 'detected' | 'interpolated';
    confidence: number;
}

/**
 * Props for the InterpolationComparisonView component.
 */
interface InterpolationComparisonViewProps {
    /** The source beat map to compare algorithms on */
    beatMap: BeatMap;
    /** Interpolation options to use (defaults will be used for missing values) */
    options?: Partial<BeatInterpolationOptions>;
    /** Time window to display in seconds (default: 5.0) */
    timeWindow?: number;
    /** Starting time offset in seconds (default: 0) */
    startTime?: number;
}

/**
 * Generate interpolated beat map for a specific algorithm
 */
function generateInterpolatedForAlgorithm(
    beatMap: BeatMap,
    algorithm: InterpolationAlgorithm,
    options: BeatInterpolationOptions
): InterpolatedBeatMap {
    const interpolator = new BeatInterpolator({
        ...options,
        algorithm,
    });
    return interpolator.interpolate(beatMap);
}

/**
 * Calculate statistics for an interpolated beat map
 */
function calculateStats(
    interpolatedBeatMap: InterpolatedBeatMap,
    algorithm: InterpolationAlgorithm
): AlgorithmStats {
    const { detectedBeats, mergedBeats, interpolationMetadata, quarterNoteBpm, quarterNoteConfidence } = interpolatedBeatMap;
    const interpolatedCount = interpolationMetadata.interpolatedBeatCount;
    const totalCount = mergedBeats.length;
    const detectedCount = detectedBeats.length;

    // Calculate average confidence of interpolated beats
    const interpolatedBeats = mergedBeats.filter(b => b.source === 'interpolated');
    const avgConfidence = interpolatedBeats.length > 0
        ? interpolatedBeats.reduce((sum, b) => sum + b.confidence, 0) / interpolatedBeats.length
        : 1.0;

    return {
        algorithm,
        totalBeats: totalCount,
        detectedBeats: detectedCount,
        interpolatedBeats: interpolatedCount,
        interpolationRatio: totalCount > 0 ? interpolatedCount / totalCount : 0,
        avgConfidence,
        quarterNoteBpm,
        quarterNoteConfidence,
        tempoDriftRatio: interpolationMetadata.tempoDriftRatio,
        gridAlignmentScore: interpolationMetadata.gapAnalysis.gridAlignmentScore,
        interpolatedBeatMap,
    };
}

/**
 * Format BPM for display
 */
function formatBpm(bpm: number): string {
    return Math.round(bpm).toString();
}

/**
 * Format percentage for display
 */
function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
}

/**
 * Format number with commas
 */
function formatNumber(num: number): string {
    return num.toLocaleString();
}

/**
 * Simple Timeline Component for Comparison View
 *
 * A simplified timeline that shows beats for a specific time window.
 * Unlike the full BeatTimeline, this doesn't animate or accept user input.
 */
function ComparisonTimeline({
    beats,
    duration,
    startTime,
    windowSize,
    algorithmColor,
    algorithmId,
}: {
    beats: ComparisonBeat[];
    duration: number;
    startTime: number;
    windowSize: number;
    algorithmColor: string;
    algorithmId: InterpolationAlgorithm;
}) {
    const endTime = Math.min(startTime + windowSize, duration);

    // Filter beats within the window
    const visibleBeats = useMemo(() => {
        return beats.filter(beat => beat.timestamp >= startTime && beat.timestamp <= endTime);
    }, [beats, startTime, endTime]);

    // Calculate position for a beat (0-100%)
    const getPosition = useCallback((timestamp: number): number => {
        const position = ((timestamp - startTime) / windowSize) * 100;
        return Math.max(0, Math.min(100, position));
    }, [startTime, windowSize]);

    return (
        <div className="comparison-timeline">
            <div className="comparison-timeline-track">
                {/* Time markers */}
                <div className="comparison-timeline-time-markers">
                    <span className="comparison-timeline-time">{startTime.toFixed(1)}s</span>
                    <span className="comparison-timeline-time">{((startTime + endTime) / 2).toFixed(1)}s</span>
                    <span className="comparison-timeline-time">{endTime.toFixed(1)}s</span>
                </div>

                {/* Beat markers */}
                {visibleBeats.map((beat, index) => (
                    <div
                        key={`${algorithmId}-${beat.timestamp.toFixed(3)}-${index}`}
                        className={`comparison-timeline-marker ${
                            beat.isDownbeat ? 'comparison-timeline-marker--downbeat' : ''
                        } ${beat.source === 'interpolated' ? 'comparison-timeline-marker--interpolated' : ''}`}
                        style={{
                            left: `${getPosition(beat.timestamp)}%`,
                            opacity: beat.source === 'detected' ? 1 : beat.confidence,
                            '--algorithm-color': algorithmColor,
                        } as React.CSSProperties}
                    >
                        <div className="comparison-timeline-marker-dot" />
                    </div>
                ))}

                {/* Center line indicator */}
                <div className="comparison-timeline-center-line" />
            </div>
        </div>
    );
}

/**
 * InterpolationComparisonView Component
 *
 * Renders a side-by-side comparison of all three interpolation algorithms,
 * showing timelines and statistics for each.
 */
export function InterpolationComparisonView({
    beatMap,
    options,
    timeWindow = 5.0,
    startTime = 0,
}: InterpolationComparisonViewProps) {
    // Merge provided options with defaults
    const mergedOptions: BeatInterpolationOptions = useMemo(() => ({
        ...DEFAULT_BEAT_INTERPOLATION_OPTIONS,
        ...options,
    }), [options]);

    // Generate interpolated beat maps for all algorithms
    const allStats = useMemo(() => {
        return ALGORITHMS.map(algo => {
            const interpolated = generateInterpolatedForAlgorithm(
                beatMap,
                algo.id,
                mergedOptions
            );
            return calculateStats(interpolated, algo.id);
        });
    }, [beatMap, mergedOptions]);

    // Convert beats to comparison format
    const getComparisonBeats = useCallback((stats: AlgorithmStats): ComparisonBeat[] => {
        return stats.interpolatedBeatMap.mergedBeats.map(beat => ({
            timestamp: beat.timestamp,
            isDownbeat: beat.isDownbeat,
            source: beat.source,
            confidence: beat.confidence,
        }));
    }, []);

    // Current time window state (for future scrubbing capability)
    const [currentTime, setCurrentTime] = useState(startTime);
    const maxTime = beatMap.duration - timeWindow;

    // Handle time navigation
    const handleTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentTime(parseFloat(e.target.value));
    }, []);

    // Jump to start/end
    const jumpToStart = useCallback(() => setCurrentTime(0), []);
    const jumpToEnd = useCallback(() => setCurrentTime(Math.max(0, maxTime)), [maxTime]);

    return (
        <div className="interpolation-comparison">
            {/* Header */}
            <div className="interpolation-comparison-header">
                <div className="interpolation-comparison-title">
                    <Layers className="interpolation-comparison-icon" />
                    <span>Algorithm Comparison</span>
                </div>
                <p className="interpolation-comparison-description">
                    Compare how each interpolation algorithm fills gaps between detected beats.
                </p>
            </div>

            {/* Time Navigation */}
            <div className="interpolation-comparison-time-nav">
                <button
                    className="interpolation-comparison-time-btn"
                    onClick={jumpToStart}
                    disabled={currentTime <= 0}
                    aria-label="Jump to start"
                >
                    ⏮
                </button>
                <div className="interpolation-comparison-time-slider-container">
                    <input
                        type="range"
                        min={0}
                        max={Math.max(0, maxTime)}
                        step={0.1}
                        value={currentTime}
                        onChange={handleTimeChange}
                        className="interpolation-comparison-time-slider"
                        aria-label="Time position"
                    />
                    <div className="interpolation-comparison-time-labels">
                        <span>{currentTime.toFixed(1)}s</span>
                        <span>{Math.min(currentTime + timeWindow, beatMap.duration).toFixed(1)}s</span>
                    </div>
                </div>
                <button
                    className="interpolation-comparison-time-btn"
                    onClick={jumpToEnd}
                    disabled={currentTime >= maxTime}
                    aria-label="Jump to end"
                >
                    ⏭
                </button>
            </div>

            {/* Timeline Comparison */}
            <div className="interpolation-comparison-timelines">
                {allStats.map((stats, index) => {
                    const algoConfig = ALGORITHMS[index];
                    return (
                        <div key={stats.algorithm} className="interpolation-comparison-row">
                            <div className="interpolation-comparison-algo-label">
                                <div
                                    className="interpolation-comparison-algo-color"
                                    style={{ background: algoConfig.color }}
                                />
                                <span className="interpolation-comparison-algo-name">
                                    {algoConfig.shortLabel}
                                </span>
                            </div>
                            <ComparisonTimeline
                                beats={getComparisonBeats(stats)}
                                duration={beatMap.duration}
                                startTime={currentTime}
                                windowSize={timeWindow}
                                algorithmColor={algoConfig.color}
                                algorithmId={stats.algorithm}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="interpolation-comparison-legend">
                <div className="interpolation-comparison-legend-item">
                    <div className="interpolation-comparison-legend-marker interpolation-comparison-legend-marker--detected" />
                    <span>Detected beat</span>
                </div>
                <div className="interpolation-comparison-legend-item">
                    <div className="interpolation-comparison-legend-marker interpolation-comparison-legend-marker--interpolated" />
                    <span>Interpolated beat</span>
                </div>
                <div className="interpolation-comparison-legend-item">
                    <div className="interpolation-comparison-legend-marker interpolation-comparison-legend-marker--downbeat" />
                    <span>Downbeat</span>
                </div>
            </div>

            {/* Statistics Table */}
            <div className="interpolation-comparison-stats">
                <h3 className="interpolation-comparison-stats-title">
                    <TrendingUp className="interpolation-comparison-stats-icon" size={16} />
                    Comparison Statistics
                </h3>
                <div className="interpolation-comparison-table-container">
                    <table className="interpolation-comparison-table">
                        <thead>
                            <tr>
                                <th>Metric</th>
                                {ALGORITHMS.map(algo => (
                                    <th key={algo.id} style={{ color: algo.color }}>
                                        {algo.shortLabel}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <Clock size={14} className="interpolation-comparison-table-icon" />
                                    Total Beats
                                </td>
                                {allStats.map(stats => (
                                    <td key={stats.algorithm} className="interpolation-comparison-table-value">
                                        {formatNumber(stats.totalBeats)}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td>
                                    <Target size={14} className="interpolation-comparison-table-icon" />
                                    Interpolated
                                </td>
                                {allStats.map(stats => (
                                    <td key={stats.algorithm} className="interpolation-comparison-table-value">
                                        {formatNumber(stats.interpolatedBeats)}
                                        <span className="interpolation-comparison-table-percent">
                                            ({formatPercent(stats.interpolationRatio)})
                                        </span>
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td>
                                    <Layers size={14} className="interpolation-comparison-table-icon" />
                                    Avg Confidence
                                </td>
                                {allStats.map(stats => (
                                    <td key={stats.algorithm} className="interpolation-comparison-table-value">
                                        {formatPercent(stats.avgConfidence)}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td>
                                    <Clock size={14} className="interpolation-comparison-table-icon" />
                                    Quarter BPM
                                </td>
                                {allStats.map(stats => (
                                    <td key={stats.algorithm} className="interpolation-comparison-table-value">
                                        {formatBpm(stats.quarterNoteBpm)}
                                        <span className="interpolation-comparison-table-percent">
                                            ({formatPercent(stats.quarterNoteConfidence)})
                                        </span>
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td>
                                    <AlertCircle size={14} className="interpolation-comparison-table-icon" />
                                    Tempo Drift
                                </td>
                                {allStats.map(stats => (
                                    <td key={stats.algorithm} className="interpolation-comparison-table-value">
                                        {stats.tempoDriftRatio.toFixed(2)}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td>
                                    <Target size={14} className="interpolation-comparison-table-icon" />
                                    Grid Alignment
                                </td>
                                {allStats.map(stats => (
                                    <td key={stats.algorithm} className="interpolation-comparison-table-value">
                                        {formatPercent(stats.gridAlignmentScore)}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Algorithm Descriptions */}
            <div className="interpolation-comparison-descriptions">
                {ALGORITHMS.map(algo => (
                    <div key={algo.id} className="interpolation-comparison-description-item">
                        <div
                            className="interpolation-comparison-description-color"
                            style={{ background: algo.color }}
                        />
                        <div className="interpolation-comparison-description-content">
                            <span className="interpolation-comparison-description-name">{algo.label}</span>
                            <span className="interpolation-comparison-description-text">{algo.description}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default InterpolationComparisonView;
