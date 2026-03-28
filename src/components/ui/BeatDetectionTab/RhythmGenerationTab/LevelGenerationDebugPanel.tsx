/**
 * LevelGenerationDebugPanel Component
 *
 * Displays level generation results when analysis completes successfully.
 *
 * Shows:
 * - Level metadata (difficulty, controller mode, total beats)
 * - Pitch analysis summary (direction stats, interval stats)
 * - Beat counts across all difficulty levels
 */

import { useMemo } from 'react';
import { CheckCircle, Gamepad2, BarChart3, Music } from 'lucide-react';
import './LevelGenerationDebugPanel.css';
import { useGeneratedLevel, useAllDifficultyLevels, usePitchAnalysis } from '../../../../store/beatDetectionStore';
import type { MelodyContourAnalysisResult } from '../../../../store/beatDetectionStore';

// ============================================================
// Types
// ============================================================

export interface LevelGenerationDebugPanelProps {
    /** Additional CSS class names */
    className?: string;
}

// ============================================================
// Sub-components
// ============================================================

interface StatRowProps {
    label: string;
    value: string | number;
    badge?: boolean;
}

function StatRow({ label, value, badge = false }: StatRowProps) {
    return (
        <div className="level-debug-stat-row">
            <span className="level-debug-stat-label">{label}</span>
            <span className={`level-debug-stat-value ${badge ? 'level-debug-badge' : ''}`}>
                {value}
            </span>
        </div>
    );
}

interface DirectionStatsDisplayProps {
    stats: MelodyContourAnalysisResult['directionStats'];
}

function DirectionStatsDisplay({ stats }: DirectionStatsDisplayProps) {
    const total = stats.up + stats.down + stats.stable + stats.none;
    const formatPercent = (count: number) => {
        if (total === 0) return '0%';
        return `${Math.round((count / total) * 100)}%`;
    };

    return (
        <div className="level-debug-direction-stats">
            <h5 className="level-debug-subsection-title">Direction Stats</h5>
            <div className="level-debug-stats-grid">
                <div className="level-debug-stat-item direction-up">
                    <span className="level-debug-direction-arrow">↑</span>
                    <span className="level-debug-direction-label">Up</span>
                    <span className="level-debug-direction-count">{stats.up}</span>
                    <span className="level-debug-direction-percent">{formatPercent(stats.up)}</span>
                </div>
                <div className="level-debug-stat-item direction-down">
                    <span className="level-debug-direction-arrow">↓</span>
                    <span className="level-debug-direction-label">Down</span>
                    <span className="level-debug-direction-count">{stats.down}</span>
                    <span className="level-debug-direction-percent">{formatPercent(stats.down)}</span>
                </div>
                <div className="level-debug-stat-item direction-stable">
                    <span className="level-debug-direction-arrow">→</span>
                    <span className="level-debug-direction-label">Stable</span>
                    <span className="level-debug-direction-count">{stats.stable}</span>
                    <span className="level-debug-direction-percent">{formatPercent(stats.stable)}</span>
                </div>
                <div className="level-debug-stat-item direction-none">
                    <span className="level-debug-direction-arrow">○</span>
                    <span className="level-debug-direction-label">None</span>
                    <span className="level-debug-direction-count">{stats.none}</span>
                    <span className="level-debug-direction-percent">{formatPercent(stats.none)}</span>
                </div>
            </div>
        </div>
    );
}

interface IntervalStatsDisplayProps {
    stats: MelodyContourAnalysisResult['intervalStats'];
}

function IntervalStatsDisplay({ stats }: IntervalStatsDisplayProps) {
    const total = stats.unison + stats.small + stats.medium + stats.large + stats.very_large;
    const formatPercent = (count: number) => {
        if (total === 0) return '0%';
        return `${Math.round((count / total) * 100)}%`;
    };

    return (
        <div className="level-debug-interval-stats">
            <h5 className="level-debug-subsection-title">Interval Stats</h5>
            <div className="level-debug-stats-grid">
                <div className="level-debug-stat-item interval-unison">
                    <span className="level-debug-interval-label">Unison</span>
                    <span className="level-debug-interval-count">{stats.unison}</span>
                    <span className="level-debug-interval-percent">{formatPercent(stats.unison)}</span>
                </div>
                <div className="level-debug-stat-item interval-small">
                    <span className="level-debug-interval-label">Small</span>
                    <span className="level-debug-interval-count">{stats.small}</span>
                    <span className="level-debug-interval-percent">{formatPercent(stats.small)}</span>
                </div>
                <div className="level-debug-stat-item interval-medium">
                    <span className="level-debug-interval-label">Medium</span>
                    <span className="level-debug-interval-count">{stats.medium}</span>
                    <span className="level-debug-interval-percent">{formatPercent(stats.medium)}</span>
                </div>
                <div className="level-debug-stat-item interval-large">
                    <span className="level-debug-interval-label">Large</span>
                    <span className="level-debug-interval-count">{stats.large}</span>
                    <span className="level-debug-interval-percent">{formatPercent(stats.large)}</span>
                </div>
                <div className="level-debug-stat-item interval-very-large">
                    <span className="level-debug-interval-label">Very Large</span>
                    <span className="level-debug-interval-count">{stats.very_large}</span>
                    <span className="level-debug-interval-percent">{formatPercent(stats.very_large)}</span>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

export function LevelGenerationDebugPanel({ className }: LevelGenerationDebugPanelProps) {
    const generatedLevel = useGeneratedLevel();
    const allDifficulties = useAllDifficultyLevels();
    const pitchAnalysis = usePitchAnalysis();

    // Don't render if no level generated
    if (!generatedLevel && !allDifficulties) {
        return null;
    }

    // Get metadata from the generated level
    const metadata = generatedLevel?.metadata;

    // Classify beats into 3 categories based on quantization accuracy
    // - On-grid transients: detected transients that snapped < 10ms to grid
    // - Off-grid transients: detected transients that snapped >= 10ms to grid
    // - Interpolated: synthetically added beats (no transient origin)
    const beatBreakdown = useMemo(() => {
        const chart = generatedLevel?.chart;
        const compositeStreamLength = generatedLevel?.rhythm?.composite?.beats?.length ?? 0;
        if (!chart?.beats?.length) return null;

        const totalChartBeats = chart.beats.length;
        const transientCount = Math.min(compositeStreamLength, totalChartBeats);
        const interpolatedCount = totalChartBeats - transientCount;

        // Among transients, count on-grid vs off-grid by quantization error
        let onGrid = 0;
        let offGrid = 0;
        for (let i = 0; i < transientCount; i++) {
            const beat = chart.beats[i];
            if (beat.quantizationError !== undefined && beat.quantizationError < 10) {
                onGrid++;
            } else {
                offGrid++;
            }
        }

        return { total: totalChartBeats, onGrid, offGrid, interpolated: interpolatedCount };
    }, [generatedLevel]);

    // Get beat counts for each difficulty
    const beatCounts = {
        natural: allDifficulties?.natural?.chart?.beats?.length ?? 0,
        easy: allDifficulties?.easy?.chart?.beats?.length ?? 0,
        medium: allDifficulties?.medium?.chart?.beats?.length ?? 0,
        hard: allDifficulties?.hard?.chart?.beats?.length ?? 0,
    };

    return (
        <div className={`level-generation-debug-panel ${className || ''}`}>
            <div className="level-debug-header">
                <CheckCircle className="level-debug-header-icon" size={24} />
                <h4 className="level-debug-header-title">Level Generation Complete!</h4>
            </div>

            {/* Metadata Section */}
            {metadata && (
                <div className="level-debug-section">
                    <h5 className="level-debug-section-title">
                        <Gamepad2 size={16} />
                        Level Metadata
                    </h5>
                    <div className="level-debug-stats-container">
                        <StatRow
                            label="Difficulty"
                            value={metadata.difficulty ?? 'medium'}
                            badge
                        />
                        <StatRow
                            label="Controller Mode"
                            value={metadata.controllerMode ?? 'ddr'}
                            badge
                        />
                        {metadata.chartMetadata && (
                            <>
                                <StatRow
                                    label="Total Beats"
                                    value={metadata.chartMetadata.totalBeats ?? 0}
                                />
                                {beatBreakdown && (
                                    <>
                                        <StatRow
                                            label="On-Grid Transients (< 10ms)"
                                            value={beatBreakdown.onGrid}
                                        />
                                        <StatRow
                                            label="Off-Grid Transients (>= 10ms)"
                                            value={beatBreakdown.offGrid}
                                        />
                                        {beatBreakdown.interpolated > 0 && (
                                            <StatRow
                                                label="Interpolated (no transient)"
                                                value={beatBreakdown.interpolated}
                                            />
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Difficulty Beat Counts */}
            {allDifficulties && (
                <div className="level-debug-section">
                    <h5 className="level-debug-section-title">
                        <BarChart3 size={16} />
                        Beat Counts by Difficulty
                    </h5>
                    <div className="level-debug-beat-counts">
                        <div className="level-debug-beat-count difficulty-natural">
                            <span className="beat-count-label">Natural</span>
                            <span className="beat-count-value">{beatCounts.natural}</span>
                        </div>
                        <div className="level-debug-beat-count difficulty-easy">
                            <span className="beat-count-label">Easy</span>
                            <span className="beat-count-value">{beatCounts.easy}</span>
                        </div>
                        <div className="level-debug-beat-count difficulty-medium">
                            <span className="beat-count-label">Medium</span>
                            <span className="beat-count-value">{beatCounts.medium}</span>
                        </div>
                        <div className="level-debug-beat-count difficulty-hard">
                            <span className="beat-count-label">Hard</span>
                            <span className="beat-count-value">{beatCounts.hard}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Pitch Analysis Section */}
            {pitchAnalysis && (
                <div className="level-debug-section">
                    <h5 className="level-debug-section-title">
                        <Music size={16} />
                        Pitch Analysis
                    </h5>

                    {/* Pitch Analysis Summary */}
                    <div className="level-debug-stats-container">
                        <StatRow
                            label="Total Beats Analyzed"
                            value={pitchAnalysis.metadata?.totalBeats ?? 0}
                        />
                        <StatRow
                            label="Voiced Beats"
                            value={pitchAnalysis.metadata?.voicedBeats ?? 0}
                        />
                        <StatRow
                            label="Overall Direction"
                            value={pitchAnalysis.melodyContour?.direction ?? 'N/A'}
                        />
                        {pitchAnalysis.melodyContour?.range && (
                            <StatRow
                                label="Pitch Range"
                                value={`${pitchAnalysis.melodyContour.range.minNote} - ${pitchAnalysis.melodyContour.range.maxNote}`}
                            />
                        )}
                    </div>

                    {/* Direction Stats */}
                    {pitchAnalysis.directionStats && (
                        <DirectionStatsDisplay stats={pitchAnalysis.directionStats} />
                    )}

                    {/* Interval Stats */}
                    {pitchAnalysis.intervalStats && (
                        <IntervalStatsDisplay stats={pitchAnalysis.intervalStats} />
                    )}
                </div>
            )}

        </div>
    );
}

export default LevelGenerationDebugPanel;
