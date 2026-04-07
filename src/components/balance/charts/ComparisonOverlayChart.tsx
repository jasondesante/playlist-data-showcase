/**
 * ComparisonOverlayChart
 *
 * Line chart overlaying per-combatant metrics from two simulation results
 * (Config A vs Config B). Supports multiple metric types via dropdown selector,
 * detects crossover points where the two configs swap advantage, and provides
 * a clear legend distinguishing the two configurations.
 *
 * (Task 9.3.2)
 */

import { useState, useMemo, memo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer,
    ReferenceDot,
} from 'recharts';
import type { SimulationResults, CombatantSimulationMetrics } from 'playlist-data-engine';
import ChartContainer from './ChartContainer';
import {
    axisProps,
    gridProps,
    tooltipProps,
    CHART_COLORS,
} from './chartTheme';
import './ComparisonOverlayChart.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComparisonOverlayChartProps {
    /** Simulation results for configuration A */
    resultsA: SimulationResults;
    /** Simulation results for configuration B */
    resultsB: SimulationResults;
    /** Display label for Config A (defaults to "Config A") */
    labelA?: string;
    /** Display label for Config B (defaults to "Config B") */
    labelB?: string;
    /** Additional CSS class */
    className?: string;
}

/** Selectable metric for the Y-axis */
type MetricKey =
    | 'dpr'
    | 'survivalRate'
    | 'damageDealt'
    | 'damageTaken'
    | 'killRate'
    | 'criticalHitRate'
    | 'roundsSurvived';

interface MetricOption {
    key: MetricKey;
    label: string;
    shortLabel: string;
    accessor: (m: CombatantSimulationMetrics) => number;
    format: (v: number) => string;
    isPercent: boolean;
}

/** A single data point on the chart (one combatant) */
interface ChartDataPoint {
    name: string;
    side: 'player' | 'enemy';
    valueA: number;
    valueB: number;
    delta: number;
    metricsA: CombatantSimulationMetrics;
    metricsB: CombatantSimulationMetrics;
}

interface TooltipPayloadEntry {
    payload: ChartDataPoint;
    value: number;
    dataKey: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR_A = CHART_COLORS.player;     // Blue
const COLOR_B = CHART_COLORS.critical;   // Amber/gold

const METRIC_OPTIONS: MetricOption[] = [
    {
        key: 'dpr',
        label: 'Avg Damage Per Round',
        shortLabel: 'DPR',
        accessor: (m) => m.averageDamagePerRound,
        format: (v) => v.toFixed(1),
        isPercent: false,
    },
    {
        key: 'survivalRate',
        label: 'Survival Rate',
        shortLabel: 'Survival %',
        accessor: (m) => m.survivalRate,
        format: (v) => `${(v * 100).toFixed(1)}%`,
        isPercent: true,
    },
    {
        key: 'damageDealt',
        label: 'Avg Total Damage Dealt',
        shortLabel: 'Dmg Dealt',
        accessor: (m) => m.averageTotalDamageDealt,
        format: (v) => v.toFixed(0),
        isPercent: false,
    },
    {
        key: 'damageTaken',
        label: 'Avg Total Damage Taken',
        shortLabel: 'Dmg Taken',
        accessor: (m) => m.averageTotalDamageTaken,
        format: (v) => v.toFixed(0),
        isPercent: false,
    },
    {
        key: 'killRate',
        label: 'Kill Rate',
        shortLabel: 'Kill %',
        accessor: (m) => m.killRate,
        format: (v) => `${(v * 100).toFixed(1)}%`,
        isPercent: true,
    },
    {
        key: 'criticalHitRate',
        label: 'Critical Hit Rate',
        shortLabel: 'Crit %',
        accessor: (m) => m.criticalHitRate,
        format: (v) => `${(v * 100).toFixed(1)}%`,
        isPercent: true,
    },
    {
        key: 'roundsSurvived',
        label: 'Avg Rounds Survived',
        shortLabel: 'Rounds',
        accessor: (m) => m.averageRoundsSurvived,
        format: (v) => v.toFixed(1),
        isPercent: false,
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build chart data by matching combatants from both results by side + index.
 * Only includes combatants that exist in both results (matched by position).
 */
function buildChartData(
    resultsA: SimulationResults,
    resultsB: SimulationResults,
): ChartDataPoint[] {
    const metricsA = Array.from(resultsA.perCombatantMetrics.values());
    const metricsB = Array.from(resultsB.perCombatantMetrics.values());

    // Group by side, then match by index position
    const playersA = metricsA.filter(m => m.side === 'player');
    const playersB = metricsB.filter(m => m.side === 'player');
    const enemiesA = metricsA.filter(m => m.side === 'enemy');
    const enemiesB = metricsB.filter(m => m.side === 'enemy');

    const points: ChartDataPoint[] = [];

    // Match players by index (take min count)
    const playerCount = Math.min(playersA.length, playersB.length);
    for (let i = 0; i < playerCount; i++) {
        const mA = playersA[i];
        const mB = playersB[i];
        points.push({
            name: mA.name || `Player ${i + 1}`,
            side: 'player',
            valueA: 0,
            valueB: 0,
            delta: 0,
            metricsA: mA,
            metricsB: mB,
        });
    }

    // Match enemies by index (take min count)
    const enemyCount = Math.min(enemiesA.length, enemiesB.length);
    for (let i = 0; i < enemyCount; i++) {
        const mA = enemiesA[i];
        const mB = enemiesB[i];
        points.push({
            name: mA.name || `Enemy ${i + 1}`,
            side: 'enemy',
            valueA: 0,
            valueB: 0,
            delta: 0,
            metricsA: mA,
            metricsB: mB,
        });
    }

    return points;
}

/**
 * Detect crossover points — indices where Config A and Config B swap
 * which one has the higher value.
 */
function findCrossovers(data: ChartDataPoint[]): number[] {
    const crossovers: number[] = [];
    for (let i = 1; i < data.length; i++) {
        const prevSign = Math.sign(data[i - 1].valueA - data[i - 1].valueB);
        const currSign = Math.sign(data[i].valueA - data[i].valueB);
        // Crossover when signs differ and neither is exactly zero
        if (prevSign !== 0 && currSign !== 0 && prevSign !== currSign) {
            crossovers.push(i);
        }
    }
    return crossovers;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ComparisonTooltip({
    active,
    payload,
    metric,
    labelA,
    labelB,
}: {
    active?: boolean;
    payload?: TooltipPayloadEntry[];
    metric: MetricOption;
    labelA: string;
    labelB: string;
}) {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    const deltaFormatted = metric.format(Math.abs(data.delta));
    const deltaSign = data.delta > 0 ? '+' : data.delta < 0 ? '-' : '';

    return (
        <div className="coc-tooltip">
            <div className="coc-tooltip-title">{data.name}</div>
            <div className="coc-tooltip-row">
                <span className="coc-tooltip-dot" style={{ backgroundColor: COLOR_A }} />
                <span className="coc-tooltip-label">{labelA}</span>
                <span className="coc-tooltip-value" style={{ color: COLOR_A }}>
                    {metric.format(data.valueA)}
                </span>
            </div>
            <div className="coc-tooltip-row">
                <span className="coc-tooltip-dot" style={{ backgroundColor: COLOR_B }} />
                <span className="coc-tooltip-label">{labelB}</span>
                <span className="coc-tooltip-value" style={{ color: COLOR_B }}>
                    {metric.format(data.valueB)}
                </span>
            </div>
            <div className="coc-tooltip-divider" />
            <div className="coc-tooltip-row">
                <span className="coc-tooltip-label">Delta</span>
                <span
                    className="coc-tooltip-value coc-tooltip-delta"
                    style={{
                        color: Math.abs(data.delta) < 0.001
                            ? CHART_COLORS.muted
                            : data.delta > 0
                                ? COLOR_A
                                : COLOR_B,
                    }}
                >
                    {deltaSign}{deltaFormatted}
                </span>
            </div>
            <div className="coc-tooltip-row coc-tooltip-side">
                <span className="coc-tooltip-label">Side</span>
                <span className="coc-tooltip-value" style={{
                    color: data.side === 'player' ? CHART_COLORS.player : CHART_COLORS.enemy,
                }}>
                    {data.side === 'player' ? 'Player' : 'Enemy'}
                </span>
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

function ComparisonOverlayChartComponent({
    resultsA,
    resultsB,
    labelA = 'Config A',
    labelB = 'Config B',
    className = '',
}: ComparisonOverlayChartProps) {
    const [selectedMetric, setSelectedMetric] = useState<MetricKey>('dpr');
    const metric = METRIC_OPTIONS.find(m => m.key === selectedMetric) ?? METRIC_OPTIONS[0];

    // Build base chart data (names + matched combatants)
    const baseData = useMemo(
        () => buildChartData(resultsA, resultsB),
        [resultsA, resultsB],
    );

    // Apply selected metric values
    const chartData = useMemo<ChartDataPoint[]>(() => {
        return baseData.map(point => {
            const vA = metric.accessor(point.metricsA);
            const vB = metric.accessor(point.metricsB);
            return {
                ...point,
                valueA: vA,
                valueB: vB,
                delta: vA - vB,
            };
        });
    }, [baseData, metric]);

    // Find crossover points
    const crossovers = useMemo(() => findCrossovers(chartData), [chartData]);

    // Compute Y-axis domain
    const yDomain = useMemo<[number, number]>(() => {
        if (chartData.length === 0) return metric.isPercent ? [0, 100] : [0, 100];
        const allValues = chartData.flatMap(d => [d.valueA, d.valueB]);
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        if (metric.isPercent) {
            return [0, 100];
        }
        // Add 15% padding
        const range = max - min || 1;
        const padding = range * 0.15;
        return [
            Math.max(0, +(min - padding).toFixed(2)),
            +(max + padding).toFixed(2),
        ];
    }, [chartData, metric.isPercent]);

    // Subtitle
    const subtitle = useMemo(() => {
        const combatantCount = chartData.length;
        const crossoverCount = crossovers.length;
        const parts = [`${combatantCount} combatants`];
        if (crossoverCount > 0) {
            parts.push(`${crossoverCount} crossover${crossoverCount > 1 ? 's' : ''}`);
        }
        return parts.join(' — ');
    }, [chartData.length, crossovers.length]);

    // Y-axis formatter
    const yTickFormatter = metric.isPercent
        ? (v: number) => `${v}%`
        : (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`;

    // Empty state
    if (baseData.length === 0) {
        return (
            <ChartContainer
                title="Comparison Overlay"
                subtitle="No matching combatants"
                className={`coc-chart ${className}`}
                minHeight={240}
                maxHeight={360}
            >
                <div className="coc-empty">
                    <p className="coc-empty-text">No combatant data to compare</p>
                    <p className="coc-empty-hint">
                        Both simulations need at least one combatant on the same side.
                    </p>
                </div>
            </ChartContainer>
        );
    }

    return (
        <ChartContainer
            title="Per-Combatant Comparison"
            subtitle={subtitle}
            className={`coc-chart ${className}`}
            minHeight={280}
            maxHeight={400}
        >
            {/* Metric Selector */}
            <div className="coc-metric-selector">
                <label className="coc-metric-label" htmlFor="coc-metric-select">
                    Metric:
                </label>
                <select
                    id="coc-metric-select"
                    className="coc-metric-select"
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value as MetricKey)}
                >
                    {METRIC_OPTIONS.map(opt => (
                        <option key={opt.key} value={opt.key}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Legend */}
            <div className="coc-legend">
                <span className="coc-legend-item">
                    <span className="coc-legend-line" style={{ backgroundColor: COLOR_A }} />
                    <span className="coc-legend-text">{labelA}</span>
                </span>
                <span className="coc-legend-item">
                    <span className="coc-legend-line" style={{ backgroundColor: COLOR_B }} />
                    <span className="coc-legend-text">{labelB}</span>
                </span>
                {crossovers.length > 0 && (
                    <span className="coc-legend-item coc-legend-crossover">
                        <span className="coc-legend-dot" />
                        <span className="coc-legend-text">Crossover</span>
                    </span>
                )}
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 20, bottom: 5, left: 10 }}
                >
                    <CartesianGrid {...gridProps} />
                    <XAxis
                        {...axisProps.x}
                        dataKey="name"
                        tick={{ ...axisProps.x.tick, fontSize: 10 }}
                        interval={0}
                        angle={chartData.length > 6 ? -25 : 0}
                        textAnchor={chartData.length > 6 ? 'end' : 'middle'}
                        height={chartData.length > 6 ? 60 : 30}
                    />
                    <YAxis
                        {...axisProps.y}
                        domain={yDomain}
                        tickFormatter={yTickFormatter}
                        tick={{ ...axisProps.y.tick, fontSize: 11 }}
                    />
                    <Tooltip
                        {...tooltipProps}
                        content={
                            <ComparisonTooltip
                                metric={metric}
                                labelA={labelA}
                                labelB={labelB}
                            />
                        }
                        cursor={{
                            stroke: CHART_COLORS.muted,
                            strokeDasharray: '4 4',
                            opacity: 0.5,
                        }}
                    />

                    {/* Zero reference line for percent metrics */}
                    {metric.isPercent && (
                        <ReferenceLine
                            y={0}
                            stroke={CHART_COLORS.muted}
                            strokeDasharray="2 4"
                            strokeWidth={1}
                        />
                    )}

                    {/* Crossover highlight dots */}
                    {crossovers.map(idx => (
                        <ReferenceDot
                            key={`crossover-${idx}`}
                            x={chartData[idx].name}
                            y={chartData[idx].valueA}
                            r={6}
                            fill={CHART_COLORS.critical}
                            stroke="hsl(222.2, 84%, 4.9%)"
                            strokeWidth={2}
                            className="coc-crossover-dot"
                        />
                    ))}

                    {/* Config A line */}
                    <Line
                        type="monotone"
                        dataKey="valueA"
                        stroke={COLOR_A}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: COLOR_A, strokeWidth: 0 }}
                        activeDot={{
                            r: 6,
                            fill: COLOR_A,
                            stroke: COLOR_A,
                            strokeWidth: 2,
                            strokeOpacity: 0.3,
                        }}
                        isAnimationActive={true}
                        animationDuration={600}
                        name={labelA}
                        connectNulls={false}
                    />

                    {/* Config B line */}
                    <Line
                        type="monotone"
                        dataKey="valueB"
                        stroke={COLOR_B}
                        strokeWidth={2.5}
                        strokeDasharray="8 4"
                        dot={{ r: 4, fill: COLOR_B, strokeWidth: 0 }}
                        activeDot={{
                            r: 6,
                            fill: COLOR_B,
                            stroke: COLOR_B,
                            strokeWidth: 2,
                            strokeOpacity: 0.3,
                        }}
                        isAnimationActive={true}
                        animationDuration={600}
                        animationBegin={200}
                        name={labelB}
                        connectNulls={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
}

export const ComparisonOverlayChart = memo(ComparisonOverlayChartComponent);
export default ComparisonOverlayChart;
