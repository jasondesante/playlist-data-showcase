/**
 * QuantizationErrorHistogram Component
 *
 * Displays a histogram showing the distribution of quantization errors
 * across all beats in the generated rhythm.
 *
 * X-axis: error in milliseconds (binned)
 * Y-axis: count of beats in each bin
 *
 * Part of Phase 6: Quantization Visualization (Task 6.4)
 */

import { useMemo } from 'react';
import { BarChart3, Info } from 'lucide-react';
import type { GeneratedBeat } from '../../types/rhythmGeneration';
import './QuantizationErrorHistogram.css';

// ============================================================
// Types
// ============================================================

export interface QuantizationErrorHistogramProps {
    /** All beats with quantization error data */
    beats: GeneratedBeat[];
    /** Additional CSS class names */
    className?: string;
}

interface HistogramBin {
    /** Lower bound of the bin (inclusive) */
    minMs: number;
    /** Upper bound of the bin (exclusive, except for last bin) */
    maxMs: number;
    /** Number of beats in this bin */
    count: number;
    /** Label for the bin */
    label: string;
    /** Percentage of total */
    percentage: number;
}

// ============================================================
// Constants
// ============================================================

/** Bin boundaries in milliseconds */
const BIN_BOUNDARIES = [0, 10, 20, 30, 40, 50, 75, 100, 150, 200];

/** Color zones for different error ranges */
const ERROR_ZONE_COLORS: Record<string, string> = {
    excellent: 'hsl(var(--cute-green))',   // 0-20ms: excellent
    good: 'hsl(var(--primary))',           // 20-40ms: good
    acceptable: 'hsl(var(--cute-yellow))', // 40-75ms: acceptable
    poor: 'hsl(var(--destructive))',       // 75ms+: poor
};

/**
 * Get the color for a bin based on its error range
 */
function getBinColor(minMs: number, maxMs: number): string {
    const avgError = (minMs + maxMs) / 2;
    if (avgError < 20) return ERROR_ZONE_COLORS.excellent;
    if (avgError < 40) return ERROR_ZONE_COLORS.good;
    if (avgError < 75) return ERROR_ZONE_COLORS.acceptable;
    return ERROR_ZONE_COLORS.poor;
}

/**
 * Get the zone name for a bin
 */
function getBinZone(minMs: number, maxMs: number): string {
    const avgError = (minMs + maxMs) / 2;
    if (avgError < 20) return 'excellent';
    if (avgError < 40) return 'good';
    if (avgError < 75) return 'acceptable';
    return 'poor';
}

// ============================================================
// Main Component
// ============================================================

export function QuantizationErrorHistogram({
    beats,
    className,
}: QuantizationErrorHistogramProps) {
    // Calculate histogram bins
    const histogramData = useMemo(() => {
        // Filter beats that have quantization error
        const beatsWithError = beats.filter(b => b.quantizationError !== undefined);

        if (beatsWithError.length === 0) {
            return {
                bins: [],
                totalBeats: 0,
                beatsWithError: 0,
                avgError: 0,
                maxError: 0,
                medianError: 0,
            };
        }

        // Extract errors (absolute values)
        const errors = beatsWithError.map(b => Math.abs(b.quantizationError || 0));

        // Calculate stats
        const avgError = errors.reduce((sum, e) => sum + e, 0) / errors.length;
        const maxError = Math.max(...errors);

        // Calculate median
        const sortedErrors = [...errors].sort((a, b) => a - b);
        const mid = Math.floor(sortedErrors.length / 2);
        const medianError = sortedErrors.length % 2 !== 0
            ? sortedErrors[mid]
            : (sortedErrors[mid - 1] + sortedErrors[mid]) / 2;

        // Create bins
        const bins: HistogramBin[] = [];

        for (let i = 0; i < BIN_BOUNDARIES.length; i++) {
            const minMs = BIN_BOUNDARIES[i];
            const maxMs = i < BIN_BOUNDARIES.length - 1
                ? BIN_BOUNDARIES[i + 1]
                : Infinity;

            // Count beats in this bin
            const count = errors.filter(e => {
                if (maxMs === Infinity) {
                    return e >= minMs;
                }
                return e >= minMs && e < maxMs;
            }).length;

            const percentage = (count / errors.length) * 100;

            // Create label
            let label: string;
            if (maxMs === Infinity) {
                label = `${minMs}+ms`;
            } else {
                label = `${minMs}-${maxMs}ms`;
            }

            bins.push({
                minMs,
                maxMs,
                count,
                label,
                percentage,
            });
        }

        // Filter out empty trailing bins (except keep at least one after the last non-empty)
        let lastNonEmptyIndex = bins.length - 1;
        while (lastNonEmptyIndex > 0 && bins[lastNonEmptyIndex].count === 0) {
            lastNonEmptyIndex--;
        }
        // Keep one extra bin after the last non-empty for visual context
        const endIndex = Math.min(lastNonEmptyIndex + 1, bins.length - 1);
        const trimmedBins = bins.slice(0, endIndex + 1);

        return {
            bins: trimmedBins,
            totalBeats: beats.length,
            beatsWithError: errors.length,
            avgError,
            maxError,
            medianError,
        };
    }, [beats]);

    // Find max count for scaling
    const maxCount = useMemo(() => {
        return Math.max(...histogramData.bins.map(b => b.count), 1);
    }, [histogramData.bins]);

    // If no data, show placeholder
    if (histogramData.beatsWithError === 0) {
        return (
            <div className={`quantization-histogram ${className || ''}`}>
                <div className="quantization-histogram-header">
                    <div className="quantization-histogram-title">
                        <BarChart3 size={16} />
                        <span>Error Distribution</span>
                    </div>
                </div>
                <div className="quantization-histogram-empty">
                    <Info size={24} />
                    <p>No quantization error data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`quantization-histogram ${className || ''}`}>
            {/* Header */}
            <div className="quantization-histogram-header">
                <div className="quantization-histogram-title">
                    <BarChart3 size={16} />
                    <span>Error Distribution</span>
                </div>
                <div className="quantization-histogram-subtitle">
                    {histogramData.beatsWithError} beats with error data
                </div>
            </div>

            {/* Stats summary */}
            <div className="quantization-histogram-stats">
                <div className="quantization-histogram-stat">
                    <span className="quantization-histogram-stat-label">Avg</span>
                    <span className="quantization-histogram-stat-value">
                        {histogramData.avgError.toFixed(1)}ms
                    </span>
                </div>
                <div className="quantization-histogram-stat">
                    <span className="quantization-histogram-stat-label">Median</span>
                    <span className="quantization-histogram-stat-value">
                        {histogramData.medianError.toFixed(1)}ms
                    </span>
                </div>
                <div className="quantization-histogram-stat">
                    <span className="quantization-histogram-stat-label">Max</span>
                    <span className="quantization-histogram-stat-value">
                        {histogramData.maxError.toFixed(1)}ms
                    </span>
                </div>
            </div>

            {/* Histogram chart */}
            <div className="quantization-histogram-chart">
                {/* Y-axis labels */}
                <div className="quantization-histogram-y-axis">
                    <span className="quantization-histogram-y-label">{maxCount}</span>
                    <span className="quantization-histogram-y-label">
                        {Math.round(maxCount / 2)}
                    </span>
                    <span className="quantization-histogram-y-label">0</span>
                </div>

                {/* Chart area */}
                <div className="quantization-histogram-bars">
                    {/* Grid lines */}
                    <div className="quantization-histogram-grid">
                        <div className="quantization-histogram-grid-line" style={{ bottom: '100%' }} />
                        <div className="quantization-histogram-grid-line" style={{ bottom: '50%' }} />
                        <div className="quantization-histogram-grid-line" style={{ bottom: '0' }} />
                    </div>

                    {/* Bars */}
                    {histogramData.bins.map((bin, index) => {
                        const heightPercent = (bin.count / maxCount) * 100;
                        const zone = getBinZone(bin.minMs, bin.maxMs);
                        const color = getBinColor(bin.minMs, bin.maxMs);

                        return (
                            <div
                                key={index}
                                className="quantization-histogram-bar-wrapper"
                                title={`${bin.label}: ${bin.count} beats (${bin.percentage.toFixed(1)}%)`}
                            >
                                <div
                                    className={`quantization-histogram-bar quantization-histogram-bar--${zone}`}
                                    style={{
                                        height: `${heightPercent}%`,
                                        backgroundColor: color,
                                    }}
                                >
                                    {/* Show count on top of bar if significant */}
                                    {bin.count > 0 && heightPercent > 15 && (
                                        <span className="quantization-histogram-bar-count">
                                            {bin.count}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* X-axis labels */}
            <div className="quantization-histogram-x-axis">
                {histogramData.bins.map((bin, index) => (
                    <div key={index} className="quantization-histogram-x-label">
                        {bin.label}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="quantization-histogram-legend">
                <div className="quantization-histogram-legend-item">
                    <span
                        className="quantization-histogram-legend-marker"
                        style={{ backgroundColor: ERROR_ZONE_COLORS.excellent }}
                    />
                    <span className="quantization-histogram-legend-text">Excellent (&lt;20ms)</span>
                </div>
                <div className="quantization-histogram-legend-item">
                    <span
                        className="quantization-histogram-legend-marker"
                        style={{ backgroundColor: ERROR_ZONE_COLORS.good }}
                    />
                    <span className="quantization-histogram-legend-text">Good (20-40ms)</span>
                </div>
                <div className="quantization-histogram-legend-item">
                    <span
                        className="quantization-histogram-legend-marker"
                        style={{ backgroundColor: ERROR_ZONE_COLORS.acceptable }}
                    />
                    <span className="quantization-histogram-legend-text">Acceptable (40-75ms)</span>
                </div>
                <div className="quantization-histogram-legend-item">
                    <span
                        className="quantization-histogram-legend-marker"
                        style={{ backgroundColor: ERROR_ZONE_COLORS.poor }}
                    />
                    <span className="quantization-histogram-legend-text">Poor (&gt;75ms)</span>
                </div>
            </div>
        </div>
    );
}

export default QuantizationErrorHistogram;
