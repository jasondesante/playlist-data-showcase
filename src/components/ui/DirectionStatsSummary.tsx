/**
 * DirectionStatsSummary Component
 *
 * A card component displaying melody direction statistics with visual percentage bars,
 * average interval size, and the largest leap detected.
 *
 * Features:
 * - Direction distribution with visual percentage bars
 * - Average interval size calculation
 * - Largest leap detection display
 * - Compact card layout for use in MelodyContourPanel
 *
 * Task 5.6: DirectionStatsSummary Component
 */

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Circle, ArrowUpRight, ArrowDownRight, Ruler, Zap } from 'lucide-react';
import './DirectionStatsSummary.css';
import { cn } from '../../utils/cn';
import type { DirectionStats, PitchAtBeat } from '../../types/levelGeneration';

// ============================================================
// Types
// ============================================================

export interface DirectionStatsSummaryProps {
    /** Direction statistics from melody contour analysis */
    directionStats: DirectionStats;
    /** Pitch data by beat (for interval calculations) */
    pitchByBeat?: PitchAtBeat[];
    /** Additional CSS class names */
    className?: string;
    /** Whether to show the detailed breakdown */
    showDetails?: boolean;
}

/** Configuration for a direction category */
interface DirectionConfig {
    key: keyof DirectionStats;
    label: string;
    icon: React.ReactNode;
    color: string;
}

// ============================================================
// Constants
// ============================================================

const DIRECTION_CONFIGS: DirectionConfig[] = [
    { key: 'up', label: 'Up', icon: <TrendingUp size={12} />, color: 'green' },
    { key: 'down', label: 'Down', icon: <TrendingDown size={12} />, color: 'red' },
    { key: 'stable', label: 'Stable', icon: <Minus size={12} />, color: 'blue' },
    { key: 'none', label: 'None', icon: <Circle size={12} />, color: 'gray' },
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
 * Get the musical interval name for a specific semitone count.
 */
function getIntervalName(semitones: number): string {
    const absSemitones = Math.abs(semitones);
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

    if (absSemitones === 0) return 'Unison';
    if (absSemitones > 12) return `${Math.floor(absSemitones / 12)} oct + ${absSemitones % 12} st`;
    return intervalNames[absSemitones] || `${absSemitones} semitones`;
}

/**
 * Calculate interval statistics from pitchByBeat data.
 */
function calculateIntervalStats(pitchByBeat: PitchAtBeat[] | undefined): {
    averageIntervalSize: number;
    largestLeap: number;
    largestLeapDirection: 'up' | 'down' | 'none';
    largestLeapBeatIndex: number;
    totalIntervals: number;
} {
    if (!pitchByBeat || pitchByBeat.length === 0) {
        return {
            averageIntervalSize: 0,
            largestLeap: 0,
            largestLeapDirection: 'none',
            largestLeapBeatIndex: 0,
            totalIntervals: 0,
        };
    }

    // Collect all interval values (absolute)
    const intervals: number[] = [];
    let largestLeap = 0;
    let largestLeapDirection: 'up' | 'down' | 'none' = 'none';
    let largestLeapBeatIndex = 0;

    pitchByBeat.forEach((beat, index) => {
        if (beat.intervalFromPrevious !== undefined && beat.intervalFromPrevious !== 0) {
            const absInterval = Math.abs(beat.intervalFromPrevious);
            intervals.push(absInterval);

            if (absInterval > largestLeap) {
                largestLeap = absInterval;
                largestLeapDirection = beat.intervalFromPrevious > 0 ? 'up' : 'down';
                largestLeapBeatIndex = index;
            }
        }
    });

    const totalIntervals = intervals.length;
    const averageIntervalSize = totalIntervals > 0
        ? intervals.reduce((sum, val) => sum + val, 0) / totalIntervals
        : 0;

    return {
        averageIntervalSize,
        largestLeap,
        largestLeapDirection,
        largestLeapBeatIndex,
        totalIntervals,
    };
}

// ============================================================
// Sub-components
// ============================================================

interface DirectionBarProps {
    config: DirectionConfig;
    count: number;
    percent: number;
}

function DirectionBar({ config, count, percent }: DirectionBarProps) {
    return (
        <div className={cn('direction-stats-summary__bar', `direction-stats-summary__bar--${config.color}`)}>
            <div className="direction-stats-summary__bar-header">
                <span className="direction-stats-summary__bar-icon">{config.icon}</span>
                <span className="direction-stats-summary__bar-label">{config.label}</span>
            </div>
            <div className="direction-stats-summary__bar-track">
                <div
                    className="direction-stats-summary__bar-fill"
                    style={{ width: `${percent}%` }}
                />
            </div>
            <div className="direction-stats-summary__bar-stats">
                <span className="direction-stats-summary__bar-count">{count}</span>
                <span className="direction-stats-summary__bar-percent">{percent}%</span>
            </div>
        </div>
    );
}

interface IntervalMetricProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    subValue?: string;
    color?: string;
}

function IntervalMetric({ icon, label, value, subValue, color }: IntervalMetricProps) {
    return (
        <div className={cn('direction-stats-summary__metric', color && `direction-stats-summary__metric--${color}`)}>
            <div className="direction-stats-summary__metric-icon">{icon}</div>
            <div className="direction-stats-summary__metric-content">
                <div className="direction-stats-summary__metric-label">{label}</div>
                <div className="direction-stats-summary__metric-value">{value}</div>
                {subValue && <div className="direction-stats-summary__metric-sub">{subValue}</div>}
            </div>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

export function DirectionStatsSummary({
    directionStats,
    pitchByBeat,
    className,
    showDetails = true,
}: DirectionStatsSummaryProps) {
    // Calculate totals
    const total = useMemo(() => {
        return directionStats.up + directionStats.down + directionStats.stable + directionStats.none;
    }, [directionStats]);

    // Calculate interval statistics
    const intervalStats = useMemo(() => {
        return calculateIntervalStats(pitchByBeat);
    }, [pitchByBeat]);

    // Calculate overall direction trend
    const overallTrend = useMemo(() => {
        const netDirection = directionStats.up - directionStats.down;
        if (Math.abs(netDirection) < total * 0.1) return 'balanced';
        return netDirection > 0 ? 'ascending' : 'descending';
    }, [directionStats, total]);

    // Empty state
    if (total === 0) {
        return (
            <div className={cn('direction-stats-summary', 'direction-stats-summary--empty', className)}>
                <div className="direction-stats-summary__header">
                    <Zap size={14} className="direction-stats-summary__header-icon" />
                    <span className="direction-stats-summary__title">Direction Stats</span>
                </div>
                <div className="direction-stats-summary__empty">
                    No direction data available
                </div>
            </div>
        );
    }

    return (
        <div className={cn('direction-stats-summary', className)}>
            {/* Header */}
            <div className="direction-stats-summary__header">
                <Zap size={14} className="direction-stats-summary__header-icon" />
                <span className="direction-stats-summary__title">Direction Statistics</span>
                <span className={cn(
                    'direction-stats-summary__trend',
                    `direction-stats-summary__trend--${overallTrend}`
                )}>
                    {overallTrend === 'ascending' && <><ArrowUpRight size={12} /> Ascending</>}
                    {overallTrend === 'descending' && <><ArrowDownRight size={12} /> Descending</>}
                    {overallTrend === 'balanced' && <>Balanced</>}
                </span>
            </div>

            {/* Direction Bars */}
            <div className="direction-stats-summary__bars">
                {DIRECTION_CONFIGS.map((config) => {
                    const count = directionStats[config.key];
                    const percent = calculatePercent(count, total);

                    return (
                        <DirectionBar
                            key={config.key}
                            config={config}
                            count={count}
                            percent={percent}
                        />
                    );
                })}
            </div>

            {/* Interval Metrics */}
            {showDetails && (
                <div className="direction-stats-summary__metrics">
                    <IntervalMetric
                        icon={<Ruler size={14} />}
                        label="Avg Interval"
                        value={`${intervalStats.averageIntervalSize.toFixed(1)} st`}
                        subValue={getIntervalName(Math.round(intervalStats.averageIntervalSize))}
                    />
                    <IntervalMetric
                        icon={intervalStats.largestLeapDirection === 'up'
                            ? <ArrowUpRight size={14} />
                            : <ArrowDownRight size={14} />
                        }
                        label="Largest Leap"
                        value={`${intervalStats.largestLeap} st`}
                        subValue={getIntervalName(intervalStats.largestLeap)}
                        color={intervalStats.largestLeapDirection === 'up' ? 'green' : 'red'}
                    />
                </div>
            )}

            {/* Summary Footer */}
            <div className="direction-stats-summary__footer">
                <span className="direction-stats-summary__total">{total} beats analyzed</span>
                <span className="direction-stats-summary__intervals">
                    {intervalStats.totalIntervals} intervals
                </span>
            </div>
        </div>
    );
}

export default DirectionStatsSummary;
