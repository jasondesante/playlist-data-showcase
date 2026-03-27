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
import { Activity } from 'lucide-react';
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
    AllDifficultiesWithNatural,
    PitchAtBeat,
} from '../../types/levelGeneration';
import type { GeneratedLevel } from 'playlist-data-engine';
import MelodyDirectionTimeline from './MelodyDirectionTimeline';
import PitchContourGraph from './PitchContourGraph';
import IntervalDistributionChart from './IntervalDistributionChart';
import MelodySegmentTimeline from './MelodySegmentTimeline';
import DirectionStatsSummary from './DirectionStatsSummary';

// ============================================================
// Types
// ============================================================

export interface MelodyContourPanelProps {
    /** Additional CSS class names */
    className?: string;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get the melody contour data from the generated level.
 * This accesses the pitchByBeat data which contains direction and interval info.
 */
function getMelodyContourData(level: GeneratedLevel | undefined | null): {
    pitchByBeat: PitchAtBeat[] | null;
    melodyContour: any;
} {
    if (!level?.pitchAnalysis) {
        return { pitchByBeat: null, melodyContour: null };
    }

    const pitchAnalysis = level.pitchAnalysis as any;

    return {
        pitchByBeat: pitchAnalysis.pitchByBeat ?? null,
        melodyContour: pitchAnalysis.melodyContour ?? null,
    };
}

// ============================================================
// Sub-components
// ============================================================

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
        return melodyData.melodyContour?.segments?.length ?? 0;
    }, [melodyData.melodyContour]);

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
                totalBeats={pitchAnalysis.metadata?.totalBeats ?? 0}
                voicedBeats={pitchAnalysis.metadata?.voicedBeats ?? 0}
                overallDirection={pitchAnalysis.melodyContour?.direction ?? 'mixed'}
                totalSegments={totalSegments}
                pitchRange={pitchAnalysis.melodyContour?.range ?? null}
            />

            {/* Direction Stats Summary (Task 5.6) */}
            {pitchAnalysis.directionStats && (
                <DirectionStatsSummary
                    directionStats={pitchAnalysis.directionStats}
                    pitchByBeat={melodyData.pitchByBeat ?? undefined}
                    showDetails={true}
                />
            )}

            {/* Interval Distribution (Task 5.4) */}
            {pitchAnalysis.intervalStats && (
                <IntervalDistributionChart
                    stats={pitchAnalysis.intervalStats}
                    showIntervalNames={true}
                    showLegend={true}
                    layout="horizontal"
                />
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

                {/* Melody Segment Timeline (Task 5.5) */}
                {melodyData.melodyContour && melodyData.melodyContour.segments && melodyData.melodyContour.segments.length > 0 && (
                    <div className="melody-viz-section">
                        <h5 className="melody-viz-section-title">Melody Segments</h5>
                        <p className="melody-viz-section-text">
                            Consecutive same-direction beats grouped into segments. Shows note span and direction.
                        </p>
                        <MelodySegmentTimeline
                            segments={melodyData.melodyContour.segments}
                            pitchesByBeat={melodyData.pitchByBeat ?? []}
                            anticipationWindow={6.0}
                            pastWindow={3.0}
                            showSegmentIndices={false}
                            segmentHeight={36}
                        />
                    </div>
                )}
            </div>

            {/* Contour Shape Indicator */}
            {melodyData.melodyContour?.direction && (
                <div className="melody-shape-indicator">
                    <span className="melody-shape-label">Contour Direction:</span>
                    <span className={cn('melody-shape-value', `melody-shape-${melodyData.melodyContour.direction}`)}>
                        {melodyData.melodyContour.direction}
                    </span>
                </div>
            )}
        </div>
    );
}

export default MelodyContourPanel;
