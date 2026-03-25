/**
 * IntervalDistributionChart Component
 *
 * A bar chart visualization showing the distribution of musical intervals
 * between consecutive beats in the melody contour analysis.
 *
 * Features:
 * - Bar chart for interval categories (Unison, Small, Medium, Large, Very Large)
 * - Shows musical interval names (e.g., "Minor 3rd", "Major 2nd")
 * - Color-coded bars by interval category
 * - Count and percentage display
 * - Interactive hover effects with interval details
 *
 * Task 5.4: IntervalDistributionChart Component
 */

import { useMemo } from 'react';
import { BarChart3, Music } from 'lucide-react';
import './IntervalDistributionChart.css';
import { cn } from '../../utils/cn';
import type { IntervalStats } from '../../types/levelGeneration';

// ============================================================
// Types
// ============================================================

export interface IntervalDistributionChartProps {
    /** Interval statistics from melody contour analysis */
    stats: IntervalStats;
    /** Height of the chart in pixels (default: 180) */
    height?: number;
    /** Whether to show musical interval names */
    showIntervalNames?: boolean;
    /** Whether to show the legend */
    showLegend?: boolean;
    /** Whether to show as horizontal bars (default) or vertical bars */
    layout?: 'horizontal' | 'vertical';
    /** Additional CSS class names */
    className?: string;
}

/** Configuration for an interval category */
interface IntervalCategory {
    /** Key in IntervalStats */
    key: keyof IntervalStats;
    /** Display label */
    label: string;
    /** Semitone range description */
    semitoneRange: string;
    /** Color theme */
    color: string;
    /** Musical interval names in this category */
    intervalNames: string[];
    /** Musical symbol/abbreviation */
    symbol: string;
}

// ============================================================
// Constants
// ============================================================

/** Interval category configurations */
const INTERVAL_CATEGORIES: IntervalCategory[] = [
    {
        key: 'unison',
        label: 'Unison',
        semitoneRange: '0',
        color: 'purple',
        intervalNames: ['Unison'],
        symbol: 'P1',
    },
    {
        key: 'small',
        label: 'Small',
        semitoneRange: '1-2',
        color: 'green',
        intervalNames: ['Minor 2nd', 'Major 2nd'],
        symbol: 'm2/M2',
    },
    {
        key: 'medium',
        label: 'Medium',
        semitoneRange: '3-4',
        color: 'amber',
        intervalNames: ['Minor 3rd', 'Major 3rd'],
        symbol: 'm3/M3',
    },
    {
        key: 'large',
        label: 'Large',
        semitoneRange: '5-7',
        color: 'orange',
        intervalNames: ['Perfect 4th', 'Tritone', 'Perfect 5th'],
        symbol: 'P4/A4/P5',
    },
    {
        key: 'very_large',
        label: 'Very Large',
        semitoneRange: '8+',
        color: 'red',
        intervalNames: ['Minor 6th', 'Major 6th', 'Minor 7th', 'Major 7th', 'Octave+'],
        symbol: 'm6+',
    },
];

/** Color values for each category */
const CATEGORY_COLORS: Record<string, string> = {
    purple: '#8b5cf6',
    green: '#22c55e',
    amber: '#f59e0b',
    orange: '#f97316',
    red: '#ef4444',
};

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
 * Get the musical interval name for a specific semitone count.
 */
function getIntervalName(semitones: number): string {
    const intervalNames: Record<number, string> = {
        0: 'Unison',
        1: 'Minor 2nd',
        2: 'Major 2nd',
        3: 'Minor 3rd',
        4: 'Major 3rd',
        5: 'Perfect 4th',
        6: 'Tritone',
        7: 'Perfect 5th',
        8: 'Minor 6th',
        9: 'Major 6th',
        10: 'Minor 7th',
        11: 'Major 7th',
        12: 'Octave',
    };

    if (semitones === 0) return intervalNames[0];
    if (semitones > 12) return `Octave +${semitones - 12}`;
    return intervalNames[semitones] || `${semitones} semitones`;
}

// ============================================================
// Sub-components
// ============================================================

interface VerticalBarChartProps {
    stats: IntervalStats;
    total: number;
    maxCount: number;
    height: number;
    showIntervalNames: boolean;
}

function VerticalBarChart({ stats, total, maxCount, height, showIntervalNames }: VerticalBarChartProps) {
    return (
        <div className="interval-chart__vertical" style={{ height: `${height}px` }}>
            {/* Y-Axis Labels */}
            <div className="interval-chart__y-axis">
                <span style={{ bottom: '100%' }}>{maxCount}</span>
                <span style={{ bottom: '50%' }}>{Math.round(maxCount / 2)}</span>
                <span style={{ bottom: '0' }}>0</span>
            </div>

            {/* Bars Container */}
            <div className="interval-chart__bars">
                {INTERVAL_CATEGORIES.map((category) => {
                    const count = stats[category.key];
                    const percent = calculatePercent(count, total);
                    const barHeight = maxCount > 0 ? (count / maxCount) * 100 : 0;

                    return (
                        <div
                            key={category.key}
                            className={cn(
                                'interval-chart__bar-wrapper',
                                `interval-chart__bar-wrapper--${category.color}`
                            )}
                            title={`${category.label}: ${count} intervals (${percent}%)`}
                        >
                            <div
                                className="interval-chart__bar"
                                style={{
                                    height: `${barHeight}%`,
                                    backgroundColor: CATEGORY_COLORS[category.color],
                                }}
                            >
                                {count > 0 && (
                                    <span className="interval-chart__bar-value">{count}</span>
                                )}
                            </div>
                            <div className="interval-chart__bar-label">
                                <span className="interval-chart__bar-name">{category.label}</span>
                                <span className="interval-chart__bar-range">({category.semitoneRange} st)</span>
                            </div>
                            {showIntervalNames && (
                                <div className="interval-chart__interval-names">
                                    {category.intervalNames.map((name, i) => (
                                        <span key={i} className="interval-chart__interval-name">
                                            {name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface HorizontalBarChartProps {
    stats: IntervalStats;
    total: number;
    showIntervalNames: boolean;
}

function HorizontalBarChart({ stats, total, showIntervalNames }: HorizontalBarChartProps) {
    return (
        <div className="interval-chart__horizontal">
            {INTERVAL_CATEGORIES.map((category) => {
                const count = stats[category.key];
                const percent = calculatePercent(count, total);

                return (
                    <div
                        key={category.key}
                        className={cn(
                            'interval-chart__hbar',
                            `interval-chart__hbar--${category.color}`
                        )}
                        title={`${category.label}: ${count} intervals (${percent}%)`}
                    >
                        <div className="interval-chart__hbar-header">
                            <span className="interval-chart__hbar-label">{category.label}</span>
                            <span className="interval-chart__hbar-range">({category.semitoneRange} st)</span>
                            {showIntervalNames && (
                                <span className="interval-chart__hbar-symbol">{category.symbol}</span>
                            )}
                        </div>
                        <div className="interval-chart__hbar-track">
                            <div
                                className="interval-chart__hbar-fill"
                                style={{
                                    width: `${percent}%`,
                                    backgroundColor: CATEGORY_COLORS[category.color],
                                }}
                            />
                        </div>
                        <div className="interval-chart__hbar-stats">
                            <span className="interval-chart__hbar-count">{count}</span>
                            <span className="interval-chart__hbar-percent">{percent}%</span>
                        </div>
                        {showIntervalNames && (
                            <div className="interval-chart__hbar-intervals">
                                {category.intervalNames.map((name, i) => (
                                    <span key={i} className="interval-chart__hbar-interval">
                                        {name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

export function IntervalDistributionChart({
    stats,
    height = 180,
    showIntervalNames = true,
    showLegend = true,
    layout = 'horizontal',
    className,
}: IntervalDistributionChartProps) {
    // Calculate totals
    const { total, maxCount } = useMemo(() => {
        const t = stats.unison + stats.small + stats.medium + stats.large + stats.very_large;
        const m = Math.max(
            stats.unison,
            stats.small,
            stats.medium,
            stats.large,
            stats.very_large,
            1
        );
        return { total: t, maxCount: m };
    }, [stats]);

    // Empty state
    if (total === 0) {
        return (
            <div className={cn('interval-distribution-chart', 'interval-distribution-chart--empty', className)}>
                <div className="interval-chart__header">
                    <BarChart3 size={16} className="interval-chart__icon" />
                    <span className="interval-chart__title">Interval Distribution</span>
                </div>
                <div className="interval-chart__empty-content">
                    <Music size={24} className="interval-chart__empty-icon" />
                    <p>No interval data available</p>
                    <p className="interval-chart__empty-hint">
                        Interval analysis runs during melody contour analysis.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('interval-distribution-chart', className)}>
            {/* Header */}
            <div className="interval-chart__header">
                <BarChart3 size={16} className="interval-chart__icon" />
                <span className="interval-chart__title">Interval Distribution</span>
                <span className="interval-chart__total">
                    {total} intervals analyzed
                </span>
            </div>

            {/* Chart */}
            {layout === 'vertical' ? (
                <VerticalBarChart
                    stats={stats}
                    total={total}
                    maxCount={maxCount}
                    height={height}
                    showIntervalNames={showIntervalNames}
                />
            ) : (
                <HorizontalBarChart
                    stats={stats}
                    total={total}
                    showIntervalNames={showIntervalNames}
                />
            )}

            {/* Legend */}
            {showLegend && (
                <div className="interval-chart__legend">
                    <div className="interval-chart__legend-title">Musical Intervals:</div>
                    <div className="interval-chart__legend-items">
                        {INTERVAL_CATEGORIES.map((category) => (
                            <div
                                key={category.key}
                                className={cn(
                                    'interval-chart__legend-item',
                                    `interval-chart__legend-item--${category.color}`
                                )}
                            >
                                <span
                                    className="interval-chart__legend-color"
                                    style={{ backgroundColor: CATEGORY_COLORS[category.color] }}
                                />
                                <span className="interval-chart__legend-label">
                                    {category.label}
                                </span>
                                <span className="interval-chart__legend-range">
                                    ({category.semitoneRange} st)
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Interval Reference */}
            {showIntervalNames && (
                <div className="interval-chart__reference">
                    <div className="interval-chart__reference-title">
                        <Music size={12} />
                        Interval Reference
                    </div>
                    <div className="interval-chart__reference-grid">
                        <div className="interval-chart__reference-item">
                            <span className="interval-chart__reference-semitone">0</span>
                            <span className="interval-chart__reference-name">Unison</span>
                        </div>
                        <div className="interval-chart__reference-item">
                            <span className="interval-chart__reference-semitone">1</span>
                            <span className="interval-chart__reference-name">Minor 2nd</span>
                        </div>
                        <div className="interval-chart__reference-item">
                            <span className="interval-chart__reference-semitone">2</span>
                            <span className="interval-chart__reference-name">Major 2nd</span>
                        </div>
                        <div className="interval-chart__reference-item">
                            <span className="interval-chart__reference-semitone">3</span>
                            <span className="interval-chart__reference-name">Minor 3rd</span>
                        </div>
                        <div className="interval-chart__reference-item">
                            <span className="interval-chart__reference-semitone">4</span>
                            <span className="interval-chart__reference-name">Major 3rd</span>
                        </div>
                        <div className="interval-chart__reference-item">
                            <span className="interval-chart__reference-semitone">5</span>
                            <span className="interval-chart__reference-name">Perfect 4th</span>
                        </div>
                        <div className="interval-chart__reference-item">
                            <span className="interval-chart__reference-semitone">6</span>
                            <span className="interval-chart__reference-name">Tritone</span>
                        </div>
                        <div className="interval-chart__reference-item">
                            <span className="interval-chart__reference-semitone">7</span>
                            <span className="interval-chart__reference-name">Perfect 5th</span>
                        </div>
                        <div className="interval-chart__reference-item">
                            <span className="interval-chart__reference-semitone">8</span>
                            <span className="interval-chart__reference-name">Minor 6th</span>
                        </div>
                        <div className="interval-chart__reference-item">
                            <span className="interval-chart__reference-semitone">9</span>
                            <span className="interval-chart__reference-name">Major 6th</span>
                        </div>
                        <div className="interval-chart__reference-item">
                            <span className="interval-chart__reference-semitone">10</span>
                            <span className="interval-chart__reference-name">Minor 7th</span>
                        </div>
                        <div className="interval-chart__reference-item">
                            <span className="interval-chart__reference-semitone">11</span>
                            <span className="interval-chart__reference-name">Major 7th</span>
                        </div>
                        <div className="interval-chart__reference-item">
                            <span className="interval-chart__reference-semitone">12</span>
                            <span className="interval-chart__reference-name">Octave</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Export helper for external use
export { getIntervalName, INTERVAL_CATEGORIES, CATEGORY_COLORS };

export default IntervalDistributionChart;
