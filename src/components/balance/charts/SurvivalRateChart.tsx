/**
 * SurvivalRateChart
 *
 * Horizontal bar chart showing per-combatant survival rate across
 * simulation runs. Players and enemies are grouped in separate sections
 * with side-specific color coding. Lowest survival rates are highlighted
 * to identify which combatants die most often.
 *
 * (Task 9.2.5)
 */

import { useMemo, useCallback, memo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine,
    LabelList,
} from 'recharts';
import type { RenderableText } from 'recharts';
import type { CombatantSimulationMetrics } from 'playlist-data-engine';
import ChartContainer from './ChartContainer';
import { axisProps, gridProps, tooltipProps, getSideColor, CHART_COLORS } from './chartTheme';
import './SurvivalRateChart.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SurvivalRateChartProps {
    /** Per-combatant metrics from simulation results (Map keyed by combatant ID) */
    metrics: Map<string, CombatantSimulationMetrics>;
    /** Currently highlighted combatant ID (from metrics table click) */
    highlightedCombatantId?: string | null;
    /** Callback when a bar is clicked */
    onCombatantClick?: (combatantId: string | null) => void;
    /** Additional CSS class */
    className?: string;
}

interface ChartRow {
    /** Display name */
    name: string;
    /** Combatant ID */
    id: string;
    /** Survival rate as percentage (0-100) */
    survivalPct: number;
    /** Raw survival rate (0-1) */
    survivalRate: number;
    /** Which side */
    side: 'player' | 'enemy';
    /** Kill rate (0-1) */
    killRate: number;
    /** Average rounds survived */
    avgRoundsSurvived: number;
    /** Average total damage dealt */
    avgDamageDealt: number;
    /** Average total damage taken */
    avgDamageTaken: number;
    /** Most used action */
    mostUsedAction: string;
}

interface TooltipPayloadEntry {
    payload: ChartRow;
    value: number;
    dataKey: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPct(value: number): string {
    return `${value.toFixed(1)}%`;
}

/** Color for survival rate bars — green for high, red for low */
function getSurvivalColor(pct: number, side: 'player' | 'enemy'): string {
    const base = getSideColor(side);
    if (pct >= 80) return CHART_COLORS.positive;
    if (pct >= 50) return base;
    if (pct >= 25) return CHART_COLORS.critical;
    return CHART_COLORS.negative;
}

function toRow(m: CombatantSimulationMetrics): ChartRow {
    return {
        name: m.name,
        id: m.combatantId,
        survivalPct: m.survivalRate * 100,
        survivalRate: m.survivalRate,
        side: m.side,
        killRate: m.killRate,
        avgRoundsSurvived: m.averageRoundsSurvived,
        avgDamageDealt: m.averageTotalDamageDealt,
        avgDamageTaken: m.averageTotalDamageTaken,
        mostUsedAction: m.mostUsedAction,
    };
}

function buildChartData(metrics: Map<string, CombatantSimulationMetrics>): ChartRow[] {
    const entries = Array.from(metrics.values());

    // Sort enemies by survival rate ascending (fragile first), then players
    const enemies = entries
        .filter(m => m.side === 'enemy')
        .sort((a, b) => a.survivalRate - b.survivalRate)
        .map(toRow);
    const players = entries
        .filter(m => m.side === 'player')
        .sort((a, b) => a.survivalRate - b.survivalRate)
        .map(toRow);

    const separator: ChartRow = {
        name: '─── Players ───',
        id: '__separator__',
        survivalPct: 0,
        survivalRate: 0,
        side: 'player',
        killRate: 0,
        avgRoundsSurvived: 0,
        avgDamageDealt: 0,
        avgDamageTaken: 0,
        mostUsedAction: '',
    };

    return [...enemies, separator, ...players];
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function SurvivalTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    if (data.id === '__separator__') return null;

    const color = getSideColor(data.side);
    const survivalColor = getSurvivalColor(data.survivalPct, data.side);

    return (
        <div className="survival-tooltip">
            <div className="survival-tooltip-title" style={{ color }}>
                {data.name}
            </div>
            <div className="survival-tooltip-row">
                <span className="survival-tooltip-dot" style={{ backgroundColor: survivalColor }} />
                <span className="survival-tooltip-label">Survival Rate</span>
                <span className="survival-tooltip-value" style={{ color: survivalColor }}>
                    {formatPct(data.survivalPct)}
                </span>
            </div>
            <div className="survival-tooltip-divider" />
            <div className="survival-tooltip-row">
                <span className="survival-tooltip-label">Kill Rate</span>
                <span className="survival-tooltip-value">{formatPct(data.killRate * 100)}</span>
            </div>
            <div className="survival-tooltip-row">
                <span className="survival-tooltip-label">Avg Rounds Survived</span>
                <span className="survival-tooltip-value">{data.avgRoundsSurvived.toFixed(1)}</span>
            </div>
            <div className="survival-tooltip-row">
                <span className="survival-tooltip-label">Avg Damage Dealt</span>
                <span className="survival-tooltip-value">{data.avgDamageDealt.toFixed(1)}</span>
            </div>
            <div className="survival-tooltip-row">
                <span className="survival-tooltip-label">Avg Damage Taken</span>
                <span className="survival-tooltip-value">{data.avgDamageTaken.toFixed(1)}</span>
            </div>
            <div className="survival-tooltip-row">
                <span className="survival-tooltip-label">Most Used Action</span>
                <span className="survival-tooltip-value">{data.mostUsedAction || '—'}</span>
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

function SurvivalRateChartComponent({
    metrics,
    highlightedCombatantId,
    onCombatantClick,
    className = '',
}: SurvivalRateChartProps) {
    const chartData = useMemo(() => buildChartData(metrics), [metrics]);

    const rowCount = chartData.length;
    const barSize = rowCount <= 4 ? 32 : rowCount <= 8 ? 28 : 22;
    const chartHeight = Math.max(200, rowCount * (barSize + 6) + 40);

    const subtitle = useMemo(() => {
        const entries = Array.from(metrics.values());
        const players = entries.filter(m => m.side === 'player').length;
        const enemies = entries.filter(m => m.side === 'enemy').length;
        return `${players} players, ${enemies} enemies`;
    }, [metrics]);

    const hasHighlight = highlightedCombatantId !== undefined && highlightedCombatantId !== null;

    const handleClick = useCallback((data: unknown) => {
        const entry = data as { payload?: ChartRow };
        if (!entry.payload || entry.payload.id === '__separator__') return;
        onCombatantClick?.(entry.payload.id);
    }, [onCombatantClick]);

    return (
        <ChartContainer
            title="Survival Rate"
            subtitle={subtitle}
            className={`survival-chart ${className}`}
            minHeight={200}
            maxHeight={Math.min(chartHeight, 500)}
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 8, right: 30, bottom: 8, left: 8 }}
                    barCategoryGap="15%"
                    barSize={barSize}
                >
                    <CartesianGrid {...gridProps} horizontal={false} />
                    <XAxis
                        {...axisProps.x}
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={(v: number) => `${v}%`}
                        tick={{ ...axisProps.x.tick, fontSize: 10 }}
                    />
                    <YAxis
                        {...axisProps.y}
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ ...axisProps.y.tick, fontSize: 11 }}
                        tickFormatter={(v: string) => {
                            if (v.startsWith('───')) return '';
                            return v;
                        }}
                    />
                    <Tooltip
                        {...tooltipProps}
                        content={<SurvivalTooltip />}
                        cursor={false}
                    />

                    {/* 50% reference line — coin flip threshold */}
                    <ReferenceLine
                        x={50}
                        stroke={CHART_COLORS.neutral}
                        strokeDasharray="4 4"
                        strokeWidth={1}
                        label={{
                            value: '50%',
                            position: 'top',
                            fill: CHART_COLORS.neutral,
                            fontSize: 10,
                            fontFamily: 'ui-monospace, monospace',
                        }}
                    />

                    <Bar
                        dataKey="survivalPct"
                        radius={[0, 3, 3, 0]}
                        maxBarSize={36}
                        isAnimationActive={true}
                        animationDuration={500}
                        cursor={onCombatantClick ? 'pointer' : undefined}
                        onClick={(data) => handleClick(data)}
                    >
                        {chartData.map((entry, index) => {
                            if (entry.id === '__separator__') {
                                return (
                                    <Cell
                                        key={index}
                                        fill="transparent"
                                        stroke="none"
                                    />
                                );
                            }
                            const isHighlighted = highlightedCombatantId === entry.id;
                            const isDimmed = hasHighlight && !isHighlighted;
                            return (
                                <Cell
                                    key={index}
                                    fill={getSurvivalColor(entry.survivalPct, entry.side)}
                                    opacity={isHighlighted ? 1 : isDimmed ? 0.3 : 0.85}
                                    stroke={isHighlighted ? getSurvivalColor(entry.survivalPct, entry.side) : 'none'}
                                    strokeWidth={isHighlighted ? 2 : 0}
                                    className={isHighlighted ? 'survival-bar-highlighted' : ''}
                                />
                            );
                        })}
                        {/* Show percentage label at end of each bar */}
                        <LabelList
                            dataKey="survivalPct"
                            position="right"
                            formatter={(v: RenderableText) => v != null ? `${Number(v).toFixed(0)}%` : ''}
                            style={{
                                fontSize: 10,
                                fontFamily: 'ui-monospace, monospace',
                                fill: CHART_COLORS.neutral,
                            }}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
}

export const SurvivalRateChart = memo(SurvivalRateChartComponent);
export default SurvivalRateChart;
