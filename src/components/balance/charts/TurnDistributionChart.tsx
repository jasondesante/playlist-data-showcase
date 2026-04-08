/**
 * TurnDistributionChart
 *
 * Histogram showing the number of rounds to combat resolution.
 * Separate distributions for player wins vs enemy wins vs draws.
 * Mean and median reference lines help understand combat pacing.
 *
 * Requires `collectDetailedLogs: true` in simulation config for per-run
 * round data. Falls back to summary stats when detailed logs are unavailable.
 *
 * (Task 9.2.4)
 */

import { useMemo, useCallback, memo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer,
    Legend,
    ReferenceArea,
} from 'recharts';
import type { SimulationResults } from 'playlist-data-engine';
import ChartContainer from './ChartContainer';
import { axisProps, gridProps, tooltipProps, CHART_COLORS } from './chartTheme';
import './TurnDistributionChart.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TurnDistributionChartProps {
    /** Simulation results containing run details and summary */
    results: SimulationResults;
    /** Currently selected round range filter (from bucket click) */
    selectedRoundRange?: { min: number; max: number; label: string } | null;
    /** Callback when a histogram bucket is clicked */
    onBucketClick?: (rangeStart: number, rangeEnd: number, label: string) => void;
    /** Additional CSS class */
    className?: string;
}

interface RoundBucket {
    /** Display label for X-axis (e.g., "3", "4–5", "6–7") */
    label: string;
    /** Start of round range (inclusive) */
    rangeStart: number;
    /** End of round range (exclusive, except last bucket) */
    rangeEnd: number;
    /** Midpoint for reference line positioning */
    mid: number;
    /** Player wins in this bucket */
    playerWins: number;
    /** Enemy wins in this bucket */
    enemyWins: number;
    /** Draws in this bucket */
    draws: number;
    /** Total runs in this bucket */
    total: number;
}

interface TooltipPayloadEntry {
    payload: RoundBucket;
    dataKey: string;
    value: number;
    color?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determine bucket size based on round range.
 * Small ranges (≤10) use 1 round per bucket.
 * Larger ranges use grouped buckets for readability.
 */
function getBucketSize(maxRounds: number): number {
    if (maxRounds <= 6) return 1;
    if (maxRounds <= 15) return 2;
    if (maxRounds <= 30) return 3;
    return 5;
}

/**
 * Build histogram buckets from per-run round data.
 */
function buildBuckets(results: SimulationResults): {
    buckets: RoundBucket[];
    mean: number;
    median: number;
    totalRuns: number;
} {
    const { runDetails, summary } = results;

    // If we have detailed logs, build from per-run data
    if (runDetails && runDetails.length > 0) {
        const allRounds: number[] = [];
        const winRounds: number[] = [];
        const lossRounds: number[] = [];
        const drawRounds: number[] = [];

        for (const detail of runDetails) {
            const rounds = detail.result.roundsElapsed;
            allRounds.push(rounds);

            switch (detail.result.winnerSide) {
                case 'player':
                    winRounds.push(rounds);
                    break;
                case 'enemy':
                    lossRounds.push(rounds);
                    break;
                case 'draw':
                    drawRounds.push(rounds);
                    break;
            }
        }

        const maxRounds = Math.max(...allRounds, 1);
        const bucketSize = getBucketSize(maxRounds);
        const bucketCount = Math.ceil(maxRounds / bucketSize);

        // Build buckets
        const buckets: RoundBucket[] = [];
        for (let i = 0; i < bucketCount; i++) {
            const start = i * bucketSize + 1; // rounds start at 1
            const end = (i + 1) * bucketSize + 1;
            const mid = (start + end - 1) / 2;

            const playerWins = winRounds.filter(r => r >= start && r < end).length;
            const enemyWins = lossRounds.filter(r => r >= start && r < end).length;
            const draws = drawRounds.filter(r => r >= start && r < end).length;

            // For last bucket, include end value
            const isLast = i === bucketCount - 1;
            const playerWinsLast = isLast ? winRounds.filter(r => r >= start && r <= end).length : playerWins;
            const enemyWinsLast = isLast ? lossRounds.filter(r => r >= start && r <= end).length : enemyWins;
            const drawsLast = isLast ? drawRounds.filter(r => r >= start && r <= end).length : draws;

            const label = bucketSize === 1
                ? `${start}`
                : isLast
                    ? `${start}+`
                    : `${start}–${end - 1}`;

            buckets.push({
                label,
                rangeStart: start,
                rangeEnd: end,
                mid,
                playerWins: playerWinsLast,
                enemyWins: enemyWinsLast,
                draws: drawsLast,
                total: playerWinsLast + enemyWinsLast + drawsLast,
            });
        }

        // Compute mean and median
        const mean = allRounds.length > 0
            ? allRounds.reduce((a, b) => a + b, 0) / allRounds.length
            : 0;

        let median = 0;
        if (allRounds.length > 0) {
            const sorted = [...allRounds].sort((a, b) => a - b);
            const midIdx = Math.floor(sorted.length / 2);
            median = sorted.length % 2 === 0
                ? (sorted[midIdx - 1] + sorted[midIdx]) / 2
                : sorted[midIdx];
        }

        return { buckets, mean, median, totalRuns: allRounds.length };
    }

    // Fallback: build from summary stats (single-bar approximation)
    const avg = summary.averageRounds;
    const med = summary.medianRounds;
    const bucketSize = getBucketSize(Math.ceil(avg + med) || 10);

    // Create a minimal 3-bucket approximation centered on average/median
    const centerBucket = Math.floor(avg / bucketSize);
    const buckets: RoundBucket[] = [];

    for (let i = Math.max(0, centerBucket - 1); i <= centerBucket + 1; i++) {
        const start = i * bucketSize + 1;
        const end = (i + 1) * bucketSize + 1;
        const mid = (start + end - 1) / 2;

        // Distribute wins/losses/draws proportionally around the center
        const isCenter = i === centerBucket;
        const count = isCenter ? summary.totalRuns : 0;

        buckets.push({
            label: bucketSize === 1 ? `${start}` : `${start}–${end - 1}`,
            rangeStart: start,
            rangeEnd: end,
            mid,
            playerWins: isCenter ? summary.playerWins : 0,
            enemyWins: isCenter ? summary.enemyWins : 0,
            draws: isCenter ? summary.draws : 0,
            total: count,
        });
    }

    return {
        buckets,
        mean: avg,
        median: med,
        totalRuns: summary.totalRuns,
    };
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function TurnDistTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
        <div className="tdc-tooltip">
            <div className="tdc-tooltip-title">Rounds: {data.label}</div>
            {data.playerWins > 0 && (
                <div className="tdc-tooltip-row">
                    <span className="tdc-tooltip-dot" style={{ backgroundColor: CHART_COLORS.player }} />
                    <span className="tdc-tooltip-label">Player Wins</span>
                    <span className="tdc-tooltip-value">{data.playerWins}</span>
                </div>
            )}
            {data.enemyWins > 0 && (
                <div className="tdc-tooltip-row">
                    <span className="tdc-tooltip-dot" style={{ backgroundColor: CHART_COLORS.enemy }} />
                    <span className="tdc-tooltip-label">Enemy Wins</span>
                    <span className="tdc-tooltip-value">{data.enemyWins}</span>
                </div>
            )}
            {data.draws > 0 && (
                <div className="tdc-tooltip-row">
                    <span className="tdc-tooltip-dot" style={{ backgroundColor: CHART_COLORS.critical }} />
                    <span className="tdc-tooltip-label">Draws</span>
                    <span className="tdc-tooltip-value">{data.draws}</span>
                </div>
            )}
            <div className="tdc-tooltip-divider" />
            <div className="tdc-tooltip-row">
                <span className="tdc-tooltip-label">Total</span>
                <span className="tdc-tooltip-value">{data.total}</span>
            </div>
        </div>
    );
}

// ─── Legend Formatter ─────────────────────────────────────────────────────────

function legendFormatter(value: string): React.ReactNode {
    const colors: Record<string, string> = {
        'Player Wins': CHART_COLORS.player,
        'Enemy Wins': CHART_COLORS.enemy,
        'Draws': CHART_COLORS.critical,
    };
    const color = colors[value] || CHART_COLORS.muted;
    return (
        <span style={{ color, fontSize: 12 }}>
            {value}
        </span>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

function TurnDistributionChartComponent({
    results,
    selectedRoundRange,
    onBucketClick,
    className = '',
}: TurnDistributionChartProps) {
    const { buckets, mean, median, totalRuns } = useMemo(
        () => buildBuckets(results),
        [results],
    );

    const hasDetailedLogs = !!results.runDetails && results.runDetails.length > 0;
    const isFilterActive = selectedRoundRange !== undefined && selectedRoundRange !== null;

    const subtitle = useMemo(() => {
        if (!hasDetailedLogs) {
            return `Mean ${mean.toFixed(1)} / Median ${median.toFixed(1)} (enable detailed logs for histogram)`;
        }
        const filterLabel = isFilterActive ? ` — Filtered: ${selectedRoundRange!.label} rounds` : '';
        return `${totalRuns.toLocaleString()} runs — Mean ${mean.toFixed(1)} / Median ${median.toFixed(1)}${filterLabel}`;
    }, [hasDetailedLogs, totalRuns, mean, median, isFilterActive, selectedRoundRange]);

    const handleBarClick = useCallback((data: unknown) => {
        const entry = data as { payload?: RoundBucket };
        if (!onBucketClick || !entry.payload || entry.payload.total === 0) return;
        onBucketClick(entry.payload.rangeStart, entry.payload.rangeEnd, entry.payload.label);
    }, [onBucketClick]);

    // Determine if a bucket matches the selected round range
    const isBucketSelected = useCallback((bucket: RoundBucket): boolean => {
        if (!isFilterActive || !selectedRoundRange) return false;
        return bucket.rangeStart === selectedRoundRange.min && bucket.rangeEnd === selectedRoundRange.max;
    }, [isFilterActive, selectedRoundRange]);

    // Reference line position — snap to nearest bucket midpoint
    const meanBucketMid = useMemo(() => {
        if (buckets.length === 0) return 0;
        let closest = buckets[0].mid;
        let minDist = Math.abs(mean - closest);
        for (const b of buckets) {
            const dist = Math.abs(mean - b.mid);
            if (dist < minDist) {
                minDist = dist;
                closest = b.mid;
            }
        }
        return closest;
    }, [buckets, mean]);

    const medianBucketMid = useMemo(() => {
        if (buckets.length === 0) return 0;
        let closest = buckets[0].mid;
        let minDist = Math.abs(median - closest);
        for (const b of buckets) {
            const dist = Math.abs(median - b.mid);
            if (dist < minDist) {
                minDist = dist;
                closest = b.mid;
            }
        }
        return closest;
    }, [buckets, median]);

    return (
        <ChartContainer
            title="Turn Distribution"
            subtitle={subtitle}
            className={`tdc-chart ${className}`}
            minHeight={hasDetailedLogs ? 120 : 260}
            maxHeight={380}
        >
            {!hasDetailedLogs ? (
                <div className="tdc-summary">
                    <div className="tdc-summary-row">
                        <span className="tdc-summary-label">Average Rounds</span>
                        <span className="tdc-summary-value">{mean.toFixed(1)}</span>
                    </div>
                    <div className="tdc-summary-row">
                        <span className="tdc-summary-label">Median Rounds</span>
                        <span className="tdc-summary-value">{median.toFixed(1)}</span>
                    </div>
                    <div className="tdc-summary-row">
                        <span className="tdc-summary-label">Avg on Win</span>
                        <span className="tdc-summary-value">{results.summary.averageRoundsOnWin.toFixed(1)}</span>
                    </div>
                    <div className="tdc-summary-row">
                        <span className="tdc-summary-label">Avg on Loss</span>
                        <span className="tdc-summary-value">{results.summary.averageRoundsOnLoss.toFixed(1)}</span>
                    </div>
                    <p className="tdc-summary-hint">
                        Enable "Collect detailed logs" to see per-round histogram
                    </p>
                </div>
            ) : (
                <div className="tdc-summary">
                    <div className="tdc-summary-row">
                        <span className="tdc-summary-label">Average Rounds</span>
                        <span className="tdc-summary-value">{mean.toFixed(1)}</span>
                    </div>
                    <div className="tdc-summary-row">
                        <span className="tdc-summary-label">Median Rounds</span>
                        <span className="tdc-summary-value">{median.toFixed(1)}</span>
                    </div>
                    <div className="tdc-summary-row">
                        <span className="tdc-summary-label">Avg on Win</span>
                        <span className="tdc-summary-value">{results.summary.averageRoundsOnWin.toFixed(1)}</span>
                    </div>
                    <div className="tdc-summary-row">
                        <span className="tdc-summary-label">Avg on Loss</span>
                        <span className="tdc-summary-value">{results.summary.averageRoundsOnLoss.toFixed(1)}</span>
                    </div>
                </div>
            )}
            {hasDetailedLogs && (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={buckets}
                        margin={{ top: 20, right: 20, bottom: 8, left: 8 }}
                        barCategoryGap="10%"
                    >
                        <CartesianGrid {...gridProps} />
                        <XAxis
                            {...axisProps.x}
                            dataKey="label"
                            tick={{ ...axisProps.x.tick, fontSize: 10 }}
                            label={{
                                value: 'Rounds',
                                position: 'insideBottom',
                                offset: -2,
                                style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 },
                            }}
                        />
                        <YAxis
                            {...axisProps.y}
                            tick={{ ...axisProps.y.tick, fontSize: 10 }}
                            allowDecimals={false}
                            label={{
                                value: 'Runs',
                                angle: -90,
                                position: 'insideLeft',
                                style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 },
                            }}
                        />
                        <Tooltip
                            {...tooltipProps}
                            content={<TurnDistTooltip />}
                            cursor={false}
                        />

                        {/* Mean reference line */}
                        <ReferenceLine
                            x={buckets.find(b => b.mid === meanBucketMid)?.label}
                            stroke={CHART_COLORS.series[3]}
                            strokeDasharray="4 3"
                            strokeWidth={1.5}
                            label={{
                                value: `Mean: ${mean.toFixed(1)}`,
                                position: 'insideTopRight',
                                fill: CHART_COLORS.series[3],
                                fontSize: 10,
                                fontWeight: 600,
                            }}
                        />

                        {/* Median reference line */}
                        <ReferenceLine
                            x={buckets.find(b => b.mid === medianBucketMid)?.label}
                            stroke={CHART_COLORS.series[4]}
                            strokeDasharray="6 3"
                            strokeWidth={1.5}
                            label={{
                                value: `Median: ${median.toFixed(1)}`,
                                position: 'insideBottomRight',
                                fill: CHART_COLORS.series[4],
                                fontSize: 10,
                                fontWeight: 600,
                            }}
                        />

                        <Legend
                            formatter={legendFormatter}
                            wrapperStyle={{
                                paddingTop: 8,
                                borderTop: `1px solid ${CHART_COLORS.neutral}`,
                            }}
                        />

                        {/* Highlight selected bucket with reference area */}
                        {isFilterActive && selectedRoundRange && (
                            <ReferenceArea
                                x1={buckets.find(b => isBucketSelected(b))?.label}
                                x2={buckets.find(b => isBucketSelected(b))?.label}
                                fill={CHART_COLORS.player}
                                fillOpacity={0.12}
                                stroke={CHART_COLORS.player}
                                strokeOpacity={0.4}
                                strokeWidth={1}
                                ifOverflow="extendDomain"
                            />
                        )}

                        {/* Stacked bars: wins + losses + draws */}
                        <Bar
                            dataKey="playerWins"
                            stackId="rounds"
                            fill={CHART_COLORS.player}
                            radius={[0, 0, 0, 0]}
                            maxBarSize={50}
                            isAnimationActive={true}
                            animationDuration={500}
                            name="Player Wins"
                            cursor={onBucketClick ? 'pointer' : undefined}
                        />
                        <Bar
                            dataKey="enemyWins"
                            stackId="rounds"
                            fill={CHART_COLORS.enemy}
                            radius={[0, 0, 0, 0]}
                            maxBarSize={50}
                            isAnimationActive={true}
                            animationDuration={500}
                            name="Enemy Wins"
                            cursor={onBucketClick ? 'pointer' : undefined}
                        />
                        <Bar
                            dataKey="draws"
                            stackId="rounds"
                            fill={CHART_COLORS.critical}
                            radius={[3, 3, 0, 0]}
                            maxBarSize={50}
                            isAnimationActive={true}
                            animationDuration={500}
                            name="Draws"
                            cursor={onBucketClick ? 'pointer' : undefined}
                            onClick={(data) => handleBarClick(data)}
                        />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </ChartContainer>
    );
}

export const TurnDistributionChart = memo(TurnDistributionChartComponent);
export default TurnDistributionChart;
