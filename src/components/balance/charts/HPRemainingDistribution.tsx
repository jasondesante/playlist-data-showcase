/**
 * HPRemainingDistribution
 *
 * Histogram showing HP remaining at end of combat for surviving combatants.
 * Each bar represents a bucket of HP percentages (0–100%).
 * Mean and median reference lines help understand how close fights were.
 *
 * (Task 9.2.3)
 */

import { useMemo, memo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import type { CombatantSimulationMetrics } from 'playlist-data-engine';
import ChartContainer from './ChartContainer';
import { axisProps, gridProps, tooltipProps, CHART_COLORS } from './chartTheme';
import './HPRemainingDistribution.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HPRemainingDistributionProps {
    /** Per-combatant metrics from simulation results (Map keyed by combatant ID) */
    metrics: Map<string, CombatantSimulationMetrics>;
    /** Additional CSS class */
    className?: string;
}

interface BucketRow {
    /** Display label for X-axis */
    label: string;
    /** Midpoint of the bucket range for positioning */
    rangeMid: number;
    /** Number of surviving combatant-runs in this bucket */
    count: number;
    /** Percentage of total survivors in this bucket */
    percent: number;
    /** Start of range (inclusive) */
    rangeStart: number;
    /** End of range (exclusive, except last) */
    rangeEnd: number;
}

interface TooltipPayloadEntry {
    payload: BucketRow;
    value: number;
    dataKey: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BUCKET_COUNT = 10;
const BUCKET_SIZE = 100 / BUCKET_COUNT;

function formatBucketLabel(start: number, end: number): string {
    return `${start}–${end}%`;
}

/** Get a color for a bucket based on HP remaining (green = high, red = low) */
function getBucketColor(rangeMid: number): string {
    if (rangeMid >= 75) return CHART_COLORS.positive;
    if (rangeMid >= 50) return CHART_COLORS.accent;
    if (rangeMid >= 25) return CHART_COLORS.critical;
    return CHART_COLORS.negative;
}

/**
 * Aggregate HP remaining distribution from all combatants.
 * Combines per-combatant histograms into a single party-wide distribution.
 * Only survivors contribute (defeated combatants have 0% HP).
 */
function buildDistribution(metrics: Map<string, CombatantSimulationMetrics>): {
    buckets: BucketRow[];
    mean: number;
    median: number;
    totalSurvivorRuns: number;
} {
    // Count survivors per bucket across all combatants
    const bucketCounts = new Array<number>(BUCKET_COUNT).fill(0);
    let totalSurvivorRuns = 0;
    const allHPValues: number[] = [];

    for (const m of metrics.values()) {
        const dist = m.hpRemainingDistribution;
        if (!dist || dist.length === 0) continue;

        for (const bucket of dist) {
            // Only count survivors (HP > 0)
            if (bucket.rangeEnd <= 0) continue;

            // Find which of our display buckets this engine bucket overlaps with
            for (let i = 0; i < BUCKET_COUNT; i++) {
                const dispStart = i * BUCKET_SIZE;
                const dispEnd = (i + 1) * BUCKET_SIZE;
                const overlapStart = Math.max(bucket.rangeStart, dispStart);
                const overlapEnd = Math.min(bucket.rangeEnd, dispEnd);
                if (overlapStart < overlapEnd) {
                    // Proportional split based on overlap
                    const engineBucketWidth = bucket.rangeEnd - bucket.rangeStart;
                    const overlapFraction = engineBucketWidth > 0
                        ? (overlapEnd - overlapStart) / engineBucketWidth
                        : 1;
                    bucketCounts[i] += Math.round(bucket.count * overlapFraction);
                }
            }

            // Collect values for mean/median (use midpoint of each engine bucket)
            for (let j = 0; j < bucket.count; j++) {
                const mid = (bucket.rangeStart + bucket.rangeEnd) / 2;
                allHPValues.push(mid);
                totalSurvivorRuns += 1;
            }
        }
    }

    // Build bucket rows
    const buckets: BucketRow[] = [];
    const totalBuckets = bucketCounts.reduce((a, b) => a + b, 0) || 1;

    for (let i = 0; i < BUCKET_COUNT; i++) {
        const start = Math.round(i * BUCKET_SIZE);
        const end = Math.round((i + 1) * BUCKET_SIZE);
        buckets.push({
            label: formatBucketLabel(start, end),
            rangeMid: start + BUCKET_SIZE / 2,
            count: bucketCounts[i],
            percent: (bucketCounts[i] / totalBuckets) * 100,
            rangeStart: start,
            rangeEnd: end,
        });
    }

    // Compute mean and median from collected values
    const mean = allHPValues.length > 0
        ? allHPValues.reduce((a, b) => a + b, 0) / allHPValues.length
        : 0;

    let median = 0;
    if (allHPValues.length > 0) {
        const sorted = [...allHPValues].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        median = sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    }

    return { buckets, mean, median, totalSurvivorRuns };
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function HPDistTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    const color = getBucketColor(data.rangeMid);

    return (
        <div className="hpd-tooltip">
            <div className="hpd-tooltip-title">HP Remaining</div>
            <div className="hpd-tooltip-row">
                <span className="hpd-tooltip-dot" style={{ backgroundColor: color }} />
                <span className="hpd-tooltip-label">Range</span>
                <span className="hpd-tooltip-value">{data.label}</span>
            </div>
            <div className="hpd-tooltip-row">
                <span className="hpd-tooltip-label">Runs</span>
                <span className="hpd-tooltip-value">{data.count.toLocaleString()}</span>
            </div>
            <div className="hpd-tooltip-row">
                <span className="hpd-tooltip-label">Share</span>
                <span className="hpd-tooltip-value">{data.percent.toFixed(1)}%</span>
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

function HPRemainingDistributionComponent({
    metrics,
    className = '',
}: HPRemainingDistributionProps) {
    const { buckets, mean, median, totalSurvivorRuns } = useMemo(
        () => buildDistribution(metrics),
        [metrics],
    );

    const hasData = totalSurvivorRuns > 0;

    const subtitle = useMemo(() => {
        if (!hasData) return 'No survivor data';
        return `${totalSurvivorRuns.toLocaleString()} surviving combatant-runs`;
    }, [hasData, totalSurvivorRuns]);

    return (
        <ChartContainer
            title="HP Remaining Distribution"
            subtitle={subtitle}
            className={`hpd-chart ${className}`}
            minHeight={240}
            maxHeight={360}
        >
            {!hasData ? (
                <div className="hpd-empty">
                    <span className="hpd-empty-text">
                        Enable detailed logs to see HP distribution
                    </span>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={buckets}
                        margin={{ top: 20, right: 20, bottom: 8, left: 8 }}
                        barCategoryGap="10%"
                        barSize={undefined}
                    >
                        <CartesianGrid {...gridProps} />
                        <XAxis
                            {...axisProps.x}
                            dataKey="label"
                            tick={{ ...axisProps.x.tick, fontSize: 10 }}
                            interval={0}
                            angle={-30}
                            textAnchor="end"
                            height={50}
                        />
                        <YAxis
                            {...axisProps.y}
                            tick={{ ...axisProps.y.tick, fontSize: 10 }}
                            label={{
                                value: 'Runs',
                                angle: -90,
                                position: 'insideLeft',
                                style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 },
                            }}
                        />
                        <Tooltip
                            {...tooltipProps}
                            content={<HPDistTooltip />}
                            cursor={false}
                        />

                        {/* Mean reference line */}
                        <ReferenceLine
                            x={Math.round(mean / BUCKET_SIZE) * BUCKET_SIZE}
                            stroke={CHART_COLORS.series[3]}
                            strokeDasharray="4 3"
                            strokeWidth={1.5}
                            label={{
                                value: `Mean: ${mean.toFixed(0)}%`,
                                position: 'insideTopRight',
                                fill: CHART_COLORS.series[3],
                                fontSize: 10,
                                fontWeight: 600,
                            }}
                        />

                        {/* Median reference line */}
                        <ReferenceLine
                            x={Math.round(median / BUCKET_SIZE) * BUCKET_SIZE}
                            stroke={CHART_COLORS.series[4]}
                            strokeDasharray="6 3"
                            strokeWidth={1.5}
                            label={{
                                value: `Median: ${median.toFixed(0)}%`,
                                position: 'insideBottomRight',
                                fill: CHART_COLORS.series[4],
                                fontSize: 10,
                                fontWeight: 600,
                            }}
                        />

                        <Bar
                            dataKey="count"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={50}
                            isAnimationActive={true}
                            animationDuration={500}
                        >
                            {buckets.map((entry, index) => (
                                <Cell
                                    key={index}
                                    fill={getBucketColor(entry.rangeMid)}
                                    opacity={entry.count === 0 ? 0.1 : 0.85}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </ChartContainer>
    );
}

export const HPRemainingDistribution = memo(HPRemainingDistributionComponent);
export default HPRemainingDistribution;
