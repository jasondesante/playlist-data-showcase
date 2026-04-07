/**
 * DamageDistributionChart
 *
 * Histogram showing per-round damage dealt distribution for a selected
 * combatant. A dropdown lets the user pick which combatant to view.
 * Mean and median reference lines help understand typical vs burst damage.
 *
 * (Task 9.2.6)
 */

import { useMemo, useState, useRef, memo, useCallback } from 'react';
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
import type { CombatantSimulationMetrics, HistogramBucket } from 'playlist-data-engine';
import ChartContainer from './ChartContainer';
import { axisProps, gridProps, tooltipProps, CHART_COLORS } from './chartTheme';
import './DamageDistributionChart.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DamageDistributionChartProps {
    /** Per-combatant metrics from simulation results (Map keyed by combatant ID) */
    metrics: Map<string, CombatantSimulationMetrics>;
    /** Currently highlighted combatant ID — auto-selects in dropdown */
    highlightedCombatantId?: string | null;
    /** Additional CSS class */
    className?: string;
}

interface BucketRow {
    /** Display label for X-axis */
    label: string;
    /** Midpoint of the bucket range for positioning */
    rangeMid: number;
    /** Number of runs in this bucket */
    count: number;
    /** Percentage of total runs in this bucket */
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

interface CombatantOption {
    id: string;
    name: string;
    side: 'player' | 'enemy';
    avgDPR: number;
    medianDPR: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBucketLabel(start: number, end: number): string {
    // Use integer labels when ranges are whole numbers
    if (Number.isInteger(start) && Number.isInteger(end)) {
        return `${start}–${end}`;
    }
    return `${start.toFixed(1)}–${end.toFixed(1)}`;
}

/** Get a color for a bucket based on DPR value (teal = moderate, gold = high, red = extreme) */
function getBucketColor(rangeMid: number, maxDPR: number): string {
    if (maxDPR === 0) return CHART_COLORS.accent;
    const ratio = rangeMid / maxDPR;
    if (ratio >= 0.75) return CHART_COLORS.negative;    // red — extreme damage
    if (ratio >= 0.5) return CHART_COLORS.critical;     // gold — high damage
    if (ratio >= 0.25) return CHART_COLORS.accent;      // teal — moderate
    return CHART_COLORS.series[6];                       // pink — low damage
}

/**
 * Convert engine HistogramBucket[] to display BucketRow[].
 * Handles edge cases: empty distribution, single bucket, zero-width buckets.
 */
function buildBuckets(distribution: HistogramBucket[]): BucketRow[] {
    if (!distribution || distribution.length === 0) return [];

    return distribution.map(bucket => ({
        label: formatBucketLabel(bucket.rangeStart, bucket.rangeEnd),
        rangeMid: (bucket.rangeStart + bucket.rangeEnd) / 2,
        count: bucket.count,
        percent: bucket.percent,
        rangeStart: bucket.rangeStart,
        rangeEnd: bucket.rangeEnd,
    }));
}

/** Build sorted list of combatant options for the dropdown */
function buildCombatantOptions(metrics: Map<string, CombatantSimulationMetrics>): CombatantOption[] {
    const entries = Array.from(metrics.values());
    // Sort: players first, then enemies; alphabetical within each group
    const players = entries
        .filter(m => m.side === 'player')
        .sort((a, b) => a.name.localeCompare(b.name));
    const enemies = entries
        .filter(m => m.side === 'enemy')
        .sort((a, b) => a.name.localeCompare(b.name));

    return [...players, ...enemies].map(m => ({
        id: m.combatantId,
        name: m.name,
        side: m.side,
        avgDPR: m.averageDamagePerRound,
        medianDPR: m.medianDamagePerRound,
    }));
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function DamageDistTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    const color = CHART_COLORS.accent;

    return (
        <div className="ddd-tooltip">
            <div className="ddd-tooltip-title">Damage Per Round</div>
            <div className="ddd-tooltip-row">
                <span className="ddd-tooltip-dot" style={{ backgroundColor: color }} />
                <span className="ddd-tooltip-label">Range</span>
                <span className="ddd-tooltip-value">{data.label}</span>
            </div>
            <div className="ddd-tooltip-row">
                <span className="ddd-tooltip-label">Runs</span>
                <span className="ddd-tooltip-value">{data.count.toLocaleString()}</span>
            </div>
            <div className="ddd-tooltip-row">
                <span className="ddd-tooltip-label">Share</span>
                <span className="ddd-tooltip-value">{data.percent.toFixed(1)}%</span>
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

function DamageDistributionChartComponent({
    metrics,
    highlightedCombatantId,
    className = '',
}: DamageDistributionChartProps) {
    const options = useMemo(() => buildCombatantOptions(metrics), [metrics]);

    // Default to first combatant, or update if current selection is gone
    const [selectedId, setSelectedId] = useState<string>(() =>
        options.length > 0 ? options[0].id : ''
    );

    // Auto-select when highlighted combatant changes (from metrics table click)
    const prevHighlightRef = useRef<string | null | undefined>(undefined);
    if (highlightedCombatantId !== prevHighlightRef.current) {
        prevHighlightRef.current = highlightedCombatantId;
        if (highlightedCombatantId && options.some(o => o.id === highlightedCombatantId)) {
            setSelectedId(highlightedCombatantId);
        }
    }

    // Keep selection valid when options change
    const validId = useMemo(() => {
        if (options.length === 0) return '';
        if (options.some(o => o.id === selectedId)) return selectedId;
        return options[0].id;
    }, [options, selectedId]);

    const handleSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedId(e.target.value);
    }, []);

    // Selected combatant's data
    const selectedOption = useMemo(
        () => options.find(o => o.id === validId) ?? null,
        [options, validId]
    );

    const selectedMetrics = useMemo(
        () => (validId ? metrics.get(validId) ?? null : null),
        [metrics, validId]
    );

    const buckets = useMemo(
        () => (selectedMetrics ? buildBuckets(selectedMetrics.damageDistribution) : []),
        [selectedMetrics]
    );

    const totalRuns = useMemo(
        () => buckets.reduce((sum, b) => sum + b.count, 0),
        [buckets]
    );

    const hasData = buckets.length > 0 && totalRuns > 0;

    // Compute mean/median from the distribution
    const { mean, median } = useMemo(() => {
        if (!hasData) return { mean: 0, median: 0 };

        const allValues: number[] = [];
        for (const bucket of buckets) {
            const mid = bucket.rangeMid;
            for (let i = 0; i < bucket.count; i++) {
                allValues.push(mid);
            }
        }

        if (allValues.length === 0) return { mean: 0, median: 0 };

        const m = allValues.reduce((a, b) => a + b, 0) / allValues.length;
        const sorted = [...allValues].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const med = sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];

        return { mean: m, median: med };
    }, [buckets, hasData]);

    // Max DPR for color scaling
    const maxBucket = useMemo(() => {
        let max = 0;
        for (const b of buckets) {
            if (b.rangeMid > max) max = b.rangeMid;
        }
        return max;
    }, [buckets]);

    // Subtitle
    const subtitle = useMemo(() => {
        if (!selectedOption) return 'No combatant selected';
        const sideLabel = selectedOption.side === 'player' ? 'Player' : 'Enemy';
        return `${selectedOption.name} (${sideLabel}) — Avg DPR: ${selectedOption.avgDPR.toFixed(1)}`;
    }, [selectedOption]);

    return (
        <ChartContainer
            title="Damage Distribution"
            subtitle={subtitle}
            className={`ddd-chart ${className}`}
            minHeight={240}
            maxHeight={380}
        >
            {/* Combatant selector dropdown */}
            {options.length > 0 && (
                <div className="ddd-selector">
                    <label className="ddd-selector-label" htmlFor="ddd-combatant-select">
                        Combatant
                    </label>
                    <select
                        id="ddd-combatant-select"
                        className="ddd-select"
                        value={validId}
                        onChange={handleSelect}
                    >
                        {options.map(opt => (
                            <option key={opt.id} value={opt.id}>
                                {opt.name} ({opt.side === 'player' ? 'Player' : 'Enemy'})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {!hasData ? (
                <div className="ddd-empty">
                    <span className="ddd-empty-text">
                        {options.length === 0
                            ? 'No combatant data available'
                            : 'No damage distribution data — enable detailed logs for per-round breakdown'}
                    </span>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={buckets}
                        margin={{ top: 20, right: 20, bottom: 8, left: 8 }}
                        barCategoryGap="8%"
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
                            content={<DamageDistTooltip />}
                            cursor={false}
                        />

                        {/* Mean reference line */}
                        <ReferenceLine
                            x={mean.toFixed(1)}
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
                            x={median.toFixed(1)}
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
                                    fill={getBucketColor(entry.rangeMid, maxBucket)}
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

export const DamageDistributionChart = memo(DamageDistributionChartComponent);
export default DamageDistributionChart;
