/**
 * PitchProbabilityHistogram Component
 *
 * A histogram visualization showing the distribution of pitch probabilities.
 * Displays how many beats fall into each probability range.
 *
 * Features:
 * - X-axis: probability ranges (0.0-1.0)
 * - Y-axis: count of beats
 * - Color-code: high (>0.8), medium (0.5-0.8), low (<0.5)
 * - Show voicing threshold line (default 0.5)
 *
 * Task 3.5: PitchProbabilityHistogram Component
 */

import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import './PitchProbabilityHistogram.css';
import { cn } from '../../utils/cn';
import type { PitchAtBeat } from '../../types/levelGeneration';

// ============================================================
// Types
// ============================================================

export interface PitchProbabilityHistogramProps {
    /** Array of pitch data linked to beats */
    pitches: PitchAtBeat[];
    /** The voicing threshold (default: 0.5) */
    voicingThreshold?: number;
    /** Number of bins for the histogram (default: 10) */
    binCount?: number;
    /** Height of the chart in pixels (default: 160) */
    height?: number;
    /** Whether to show the legend */
    showLegend?: boolean;
    /** Additional CSS class names */
    className?: string;
}

/** Bin data structure */
interface HistogramBin {
    /** Lower bound of the bin */
    min: number;
    /** Upper bound of the bin */
    max: number;
    /** Center of the bin for display */
    center: number;
    /** Count of beats in this bin */
    count: number;
    /** Probability category */
    category: 'high' | 'medium' | 'low';
    /** Label for the bin */
    label: string;
}

// ============================================================
// Constants
// ============================================================

/** Probability category thresholds */
const PROBABILITY_THRESHOLDS = {
    high: 0.8,
    medium: 0.5,
    low: 0,
};

/** Colors for each probability category */
const CATEGORY_COLORS = {
    high: '#22c55e',   // Green
    medium: '#eab308', // Yellow
    low: '#f97316',    // Orange
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Determine the probability category for a value.
 */
function getProbabilityCategory(probability: number): 'high' | 'medium' | 'low' {
    if (probability > PROBABILITY_THRESHOLDS.high) return 'high';
    if (probability > PROBABILITY_THRESHOLDS.medium) return 'medium';
    return 'low';
}

/**
 * Format a probability value as a percentage string.
 */
function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
}

// ============================================================
// Main Component
// ============================================================

export function PitchProbabilityHistogram({
    pitches,
    voicingThreshold = 0.2,
    binCount = 10,
    height = 160,
    showLegend = true,
    className,
}: PitchProbabilityHistogramProps) {
    // Calculate histogram bins
    const histogramData = useMemo((): HistogramBin[] => {
        const bins: HistogramBin[] = [];
        const binWidth = 1.0 / binCount;

        // Initialize bins
        for (let i = 0; i < binCount; i++) {
            const min = i * binWidth;
            const max = (i + 1) * binWidth;
            const center = (min + max) / 2;
            const category = getProbabilityCategory(center);

            bins.push({
                min,
                max,
                center,
                count: 0,
                category,
                label: `${formatPercent(min)}-${formatPercent(max)}`,
            });
        }

        // Count probabilities into bins (only for voiced beats)
        pitches.forEach((pitchAtBeat) => {
            const probability = pitchAtBeat.pitch?.probability ?? 0;
            if (probability > 0 || pitchAtBeat.pitch?.isVoiced) {
                const binIndex = Math.min(
                    Math.floor(probability * binCount),
                    binCount - 1
                );
                bins[binIndex].count++;
            }
        });

        return bins;
    }, [pitches, binCount]);

    // Calculate statistics
    const stats = useMemo(() => {
        const voicedPitches = pitches.filter(p => p.pitch?.isVoiced);
        const totalVoiced = voicedPitches.length;
        const totalUnvoiced = pitches.length - totalVoiced;

        const probabilities = voicedPitches
            .map(p => p.pitch?.probability ?? 0)
            .filter(prob => prob > 0);

        const avgProbability = probabilities.length > 0
            ? probabilities.reduce((a, b) => a + b, 0) / probabilities.length
            : 0;

        const maxCount = Math.max(...histogramData.map(b => b.count), 1);

        return {
            totalVoiced,
            totalUnvoiced,
            avgProbability,
            maxCount,
        };
    }, [pitches, histogramData]);

    // Calculate threshold line position
    const thresholdPosition = useMemo(() => {
        return voicingThreshold * 100;
    }, [voicingThreshold]);

    // Empty state
    if (pitches.length === 0) {
        return (
            <div className={cn('pitch-probability-histogram', 'pitch-probability-histogram--empty', className)}>
                <div className="pitch-probability-histogram__header">
                    <BarChart3 size={16} className="pitch-probability-histogram__icon" />
                    <span className="pitch-probability-histogram__title">Probability Distribution</span>
                </div>
                <div className="pitch-probability-histogram__empty-content">
                    <p>No pitch data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('pitch-probability-histogram', className)}>
            {/* Header */}
            <div className="pitch-probability-histogram__header">
                <BarChart3 size={16} className="pitch-probability-histogram__icon" />
                <span className="pitch-probability-histogram__title">Probability Distribution</span>
                <span className="pitch-probability-histogram__stats">
                    Avg: {formatPercent(stats.avgProbability)} | Voiced: {stats.totalVoiced}
                </span>
            </div>

            {/* Chart Area */}
            <div
                className="pitch-probability-histogram__chart"
                style={{ height: `${height}px` }}
            >
                {/* Y-Axis Labels */}
                <div className="pitch-probability-histogram__y-axis">
                    <span style={{ bottom: '100%' }}>{stats.maxCount}</span>
                    <span style={{ bottom: '50%' }}>{Math.round(stats.maxCount / 2)}</span>
                    <span style={{ bottom: '0' }}>0</span>
                </div>

                {/* Bars Container */}
                <div className="pitch-probability-histogram__bars">
                    {histogramData.map((bin, index) => {
                        const barHeight = stats.maxCount > 0
                            ? (bin.count / stats.maxCount) * 100
                            : 0;
                        const color = CATEGORY_COLORS[bin.category];

                        return (
                            <div
                                key={index}
                                className={cn(
                                    'pitch-probability-histogram__bar-wrapper',
                                    `pitch-probability-histogram__bar-wrapper--${bin.category}`
                                )}
                                title={`${bin.label}: ${bin.count} beats`}
                            >
                                <div
                                    className="pitch-probability-histogram__bar"
                                    style={{
                                        height: `${barHeight}%`,
                                        backgroundColor: color,
                                    }}
                                >
                                    {bin.count > 0 && (
                                        <span className="pitch-probability-histogram__bar-value">
                                            {bin.count}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Voicing Threshold Line */}
                    <div
                        className="pitch-probability-histogram__threshold-line"
                        style={{ left: `${thresholdPosition}%` }}
                    >
                        <div className="pitch-probability-histogram__threshold-marker" />
                        <span className="pitch-probability-histogram__threshold-label">
                            Threshold
                        </span>
                    </div>
                </div>
            </div>

            {/* X-Axis Labels */}
            <div className="pitch-probability-histogram__x-axis">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
            </div>

            {/* Legend */}
            {showLegend && (
                <div className="pitch-probability-histogram__legend">
                    <div className="pitch-probability-histogram__legend-item">
                        <span
                            className="pitch-probability-histogram__legend-color"
                            style={{ backgroundColor: CATEGORY_COLORS.high }}
                        />
                        <span>High (&gt;80%)</span>
                    </div>
                    <div className="pitch-probability-histogram__legend-item">
                        <span
                            className="pitch-probability-histogram__legend-color"
                            style={{ backgroundColor: CATEGORY_COLORS.medium }}
                        />
                        <span>Medium (50-80%)</span>
                    </div>
                    <div className="pitch-probability-histogram__legend-item">
                        <span
                            className="pitch-probability-histogram__legend-color"
                            style={{ backgroundColor: CATEGORY_COLORS.low }}
                        />
                        <span>Low (&lt;50%)</span>
                    </div>
                    <div className="pitch-probability-histogram__legend-item pitch-probability-histogram__legend-item--threshold">
                        <span className="pitch-probability-histogram__threshold-indicator" />
                        <span>Voicing Threshold ({formatPercent(voicingThreshold)})</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PitchProbabilityHistogram;
