/**
 * MelodyContourPanel Component
 *
 * Container component for displaying melody contour analysis as part of
 * the Pitch & Level Generation feature (Phase 5).
 *
 * Features:
 * - Summary stats showing direction distribution (up/down/stable/none)
 * - Interval distribution by category (unison/small/medium/large/very_large)
 * - Total segments detected
 * - Two visualization views:
 *   - MelodyDirectionTimeline (arrows at beats)
 *   - PitchContourGraph (line graph of pitch over time)
 *
 * Task 5.1: Create MelodyContourPanel Component
 */

import { useMemo, useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Minus, Circle, BarChart3 } from 'lucide-react';
import './MelodyContourPanel.css';
import { cn } from '../../utils/cn';
import {
    usePitchAnalysis,
    useAllDifficultyLevels,
} from '../../store/beatDetectionStore';
import {
    useSelectedDifficulty,
} from '../../hooks/useLevelGeneration';
import type {
    MelodyContourAnalysisResult,
    DirectionStats,
    IntervalStats,
    AllDifficultiesWithNatural,
    PitchAtBeat,
} from '../../types/levelGeneration';
import type { GeneratedLevel } from 'playlist-data-engine';
import MelodyDirectionTimeline from './MelodyDirectionTimeline';
import PitchContourGraph from './PitchContourGraph';

// ============================================================
// Types
// ============================================================

export interface MelodyContourPanelProps {
    /** Additional CSS class names */
    className?: string;
}

/** Direction configuration for display */
interface DirectionConfig {
    key: keyof DirectionStats;
    label: string;
    icon: React.ReactNode;
    color: string;
}

/** Interval configuration for display */
interface IntervalConfig {
    key: keyof IntervalStats;
    label: string;
    semitoneRange: string;
    color: string;
}

// ============================================================
// Constants
// ============================================================

const DIRECTION_CONFIGS: DirectionConfig[] = [
    { key: 'up', label: 'Up', icon: <TrendingUp size={14} />, color: 'green' },
    { key: 'down', label: 'Down', icon: <TrendingDown size={14} />, color: 'red' },
    { key: 'stable', label: 'Stable', icon: <Minus size={14} />, color: 'blue' },
    { key: 'none', label: 'None', icon: <Circle size={14} />, color: 'gray' },
];

const INTERVAL_CONFIGS: IntervalConfig[] = [
    { key: 'unison', label: 'Unison', semitoneRange: '0', color: 'purple' },
    { key: 'small', label: 'Small', semitoneRange: '1-2', color: 'green' },
    { key: 'medium', label: 'Medium', semitoneRange: '3-4', color: 'amber' },
    { key: 'large', label: 'Large', semitoneRange: '5-7', color: 'orange' },
    { key: 'very_large', label: 'Very Large', semitoneRange: '8+', color: 'red' },
];

// ============================================================
// Helper Functions
// ============================================================

/**
 * Calculate percentage from count and total.
 */
function calculatePercent(count: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
}

/**
 * Get the melody contour data from the generated level.
 * This accesses the pitchByBeat data which contains direction and interval info.
 */
function getMelodyContourData(level: GeneratedLevel | undefined | null): {
    pitchByBeat: PitchAtBeat[] | null;
    contour: MelodyContourAnalysisResult['contour'] | null;
} {
    if (!level?.pitchAnalysis) {
        return { pitchByBeat: null, contour: null };
    }

    const pitchAnalysis = level.pitchAnalysis as any;

    return {
        pitchByBeat: pitchAnalysis.pitchByBeat ?? null,
        contour: pitchAnalysis.contour ?? null,
    };
}

// ============================================================
// Sub-components
// ============================================================

interface DirectionDistributionProps {
    stats: DirectionStats;
}

function DirectionDistribution({ stats }: DirectionDistributionProps) {
    const total = stats.up + stats.down + stats.stable + stats.none;

    return (
        <div className="melody-direction-distribution">
            <h4 className="melody-distribution-title">
                <Activity size={14} />
                Direction Distribution
            </h4>
            <div className="melody-direction-bars">
                {DIRECTION_CONFIGS.map((dir) => {
                    const count = stats[dir.key];
                    const percent = calculatePercent(count, total);

                    return (
                        <div
                            key={dir.key}
                            className={cn('melody-direction-bar', `melody-direction-${dir.color}`)}
                        >
                            <div className="melody-direction-header">
                                <span className="melody-direction-icon">{dir.icon}</span>
                                <span className="melody-direction-label">{dir.label}</span>
                            </div>
                            <div className="melody-direction-bar-track">
                                <div
                                    className="melody-direction-bar-fill"
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                            <div className="melody-direction-stats">
                                <span className="melody-direction-count">{count}</span>
                                <span className="melody-direction-percent">{percent}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface IntervalDistributionProps {
    stats: IntervalStats;
}

function IntervalDistribution({ stats }: IntervalDistributionProps) {
    const total = stats.unison + stats.small + stats.medium + stats.large + stats.very_large;

    return (
        <div className="melody-interval-distribution">
            <h4 className="melody-distribution-title">
                <BarChart3 size={14} />
                Interval Distribution
            </h4>
            <div className="melody-interval-bars">
                {INTERVAL_CONFIGS.map((interval) => {
                    const count = stats[interval.key];
                    const percent = calculatePercent(count, total);

                    return (
                        <div
                            key={interval.key}
                            className={cn('melody-interval-bar', `melody-interval-${interval.color}`)}
                        >
                            <div className="melody-interval-header">
                                <span className="melody-interval-label">{interval.label}</span>
                                <span className="melody-interval-range">({interval.semitoneRange} st)</span>
                            </div>
                            <div className="melody-interval-bar-track">
                                <div
                                    className="melody-interval-bar-fill"
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                            <div className="melody-interval-stats">
                                <span className="melody-interval-count">{count}</span>
                                <span className="melody-interval-percent">{percent}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface SummaryStatsProps {
    totalBeats: number;
    voicedBeats: number;
    overallDirection: string;
    totalSegments: number;
    pitchRange: { minNote: string; maxNote: string; semitones: number } | null;
}

function SummaryStats({ totalBeats, voicedBeats, overallDirection, totalSegments, pitchRange }: SummaryStatsProps) {
    const voicedPercent = totalBeats > 0 ? Math.round((voicedBeats / totalBeats) * 100) : 0;

    return (
        <div className="melody-summary-stats">
            <div className="melody-summary-item">
                <span className="melody-summary-value">{totalBeats}</span>
                <span className="melody-summary-label">Total Beats</span>
            </div>
            <div className="melody-summary-item">
                <span className="melody-summary-value melody-voiced-percent">{voicedPercent}%</span>
                <span className="melody-summary-label">Voiced</span>
            </div>
            <div className="melody-summary-item">
                <span className="melody-summary-value melody-overall-direction">{overallDirection}</span>
                <span className="melody-summary-label">Overall</span>
            </div>
            <div className="melody-summary-item">
                <span className="melody-summary-value">{totalSegments}</span>
                <span className="melody-summary-label">Segments</span>
            </div>
            {pitchRange && (
                <div className="melody-summary-item melody-summary-range">
                    <span className="melody-summary-value">{pitchRange.minNote} - {pitchRange.maxNote}</span>
                    <span className="melody-summary-label">Range ({pitchRange.semitones} st)</span>
                </div>
            )}
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

export function MelodyContourPanel({ className }: MelodyContourPanelProps) {
    // Get data from store
    const allDifficulties = useAllDifficultyLevels();
    const selectedDifficulty = useSelectedDifficulty();
    const pitchAnalysis = usePitchAnalysis();

    // Selected beat for timeline interaction
    const [selectedBeatIndex, setSelectedBeatIndex] = useState<number | undefined>(undefined);

    // Get melody contour data from the selected difficulty level
    const melodyData = useMemo(() => {
        const levels = allDifficulties as AllDifficultiesWithNatural | null;
        const level = levels?.[selectedDifficulty as keyof AllDifficultiesWithNatural] as GeneratedLevel | undefined;
        return getMelodyContourData(level);
    }, [allDifficulties, selectedDifficulty]);

    // Handle beat selection from timeline
    const handleBeatClick = useMemo(() => (beat: PitchAtBeat) => {
        setSelectedBeatIndex(beat.beatIndex);
    }, []);

    // Calculate total segments from contour data
    const totalSegments = useMemo(() => {
        return melodyData.contour?.segments?.length ?? 0;
    }, [melodyData.contour]);

    // Don't render if no pitch analysis available
    if (!pitchAnalysis) {
        return (
            <div className={cn('melody-contour-panel', 'melody-contour-panel-empty', className)}>
                <div className="melody-panel-header">
                    <Activity size={20} className="melody-panel-icon" />
                    <h3 className="melody-panel-title">Melody Contour</h3>
                </div>
                <div className="melody-panel-empty-content">
                    <p>No melody analysis available.</p>
                    <p className="melody-panel-empty-hint">
                        Melody contour analysis runs automatically during level generation.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('melody-contour-panel', className)}>
            {/* Header */}
            <div className="melody-panel-header">
                <Activity size={20} className="melody-panel-icon" />
                <h3 className="melody-panel-title">Melody Contour</h3>
            </div>

            {/* Summary Stats */}
            <SummaryStats
                totalBeats={pitchAnalysis.totalBeats ?? 0}
                voicedBeats={pitchAnalysis.voicedBeats ?? 0}
                overallDirection={pitchAnalysis.overallDirection ?? 'mixed'}
                totalSegments={totalSegments}
                pitchRange={pitchAnalysis.pitchRange}
            />

            {/* Direction Distribution */}
            {pitchAnalysis.directionStats && (
                <DirectionDistribution stats={pitchAnalysis.directionStats} />
            )}

            {/* Interval Distribution */}
            {pitchAnalysis.intervalStats && (
                <IntervalDistribution stats={pitchAnalysis.intervalStats} />
            )}

            {/* Visualization Views Section */}
            <div className="melody-visualizations-section">
                <h4 className="melody-visualizations-title">Melody Visualizations</h4>

                {/* Direction Timeline (Task 5.2) */}
                <div className="melody-viz-section">
                    <h5 className="melody-viz-section-title">Direction Timeline</h5>
                    <p className="melody-viz-section-text">
                        Timeline showing pitch direction at each beat with color-coded arrows.
                        Size indicates interval magnitude.
                    </p>
                    {melodyData.pitchByBeat && melodyData.pitchByBeat.length > 0 ? (
                        <MelodyDirectionTimeline
                            pitchesByBeat={melodyData.pitchByBeat}
                            onBeatClick={handleBeatClick}
                            selectedBeatIndex={selectedBeatIndex}
                            anticipationWindow={5.0}
                            pastWindow={2.5}
                        />
                    ) : (
                        <div className="melody-viz-empty">
                            No beat data available
                        </div>
                    )}
                </div>

                {/* Pitch Contour Graph (Task 5.3) */}
                <div className="melody-viz-section">
                    <h5 className="melody-viz-section-title">Pitch Contour Graph</h5>
                    <p className="melody-viz-section-text">
                        Line graph showing pitch contour over time with direction coloring.
                        Click to seek, hover for details.
                    </p>
                    {melodyData.pitchByBeat && melodyData.pitchByBeat.length > 0 ? (
                        <PitchContourGraph
                            pitchesByBeat={melodyData.pitchByBeat}
                            onBeatClick={handleBeatClick}
                            selectedBeatIndex={selectedBeatIndex}
                            height={180}
                            showNoteLabels={true}
                            showYAxisLabels={true}
                        />
                    ) : (
                        <div className="melody-viz-empty">
                            No pitch contour data available
                        </div>
                    )}
                </div>

                {/* Melody Segment Timeline Placeholder (Task 5.5) */}
                {melodyData.contour && melodyData.contour.segments && melodyData.contour.segments.length > 0 && (
                    <div className="melody-viz-placeholder">
                        <h5 className="melody-viz-placeholder-title">Melody Segments</h5>
                        <p className="melody-viz-placeholder-text">
                            Consecutive same-direction beats grouped into segments.
                        </p>
                        <div className="melody-viz-placeholder-coming">
                            <span>Coming in Task 5.5</span>
                        </div>
                        <div className="melody-viz-preview melody-segment-preview">
                            <div className="melody-segment-list">
                                {melodyData.contour.segments.slice(0, 5).map((segment, index) => (
                                    <div
                                        key={index}
                                        className={cn(
                                            'melody-segment-item',
                                            `melody-segment-${segment.direction}`
                                        )}
                                    >
                                        <span className="melody-segment-range">
                                            Beats {segment.startBeat}-{segment.endBeat}
                                        </span>
                                        <span className="melody-segment-direction">
                                            {segment.direction === 'up' && '↑ Ascending'}
                                            {segment.direction === 'down' && '↓ Descending'}
                                            {segment.direction === 'stable' && '→ Stable'}
                                            {segment.direction === 'none' && '○ No pitch'}
                                        </span>
                                        {segment.startNote && segment.endNote && (
                                            <span className="melody-segment-notes">
                                                {segment.startNote} → {segment.endNote}
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {melodyData.contour.segments.length > 5 && (
                                    <span className="melody-segment-more">
                                        +{melodyData.contour.segments.length - 5} more segments
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Contour Shape Indicator */}
            {melodyData.contour?.shape && (
                <div className="melody-shape-indicator">
                    <span className="melody-shape-label">Contour Shape:</span>
                    <span className={cn('melody-shape-value', `melody-shape-${melodyData.contour.shape}`)}>
                        {melodyData.contour.shape}
                    </span>
                </div>
            )}
        </div>
    );
}

export default MelodyContourPanel;
