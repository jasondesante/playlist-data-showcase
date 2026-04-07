/**
 * DPRComparisonChart
 *
 * Horizontal bar chart comparing average damage per round (DPR) across
 * all combatants. Players and enemies are shown in separate sections
 * with side-specific color coding.
 *
 * (Task 9.2.2)
 */

import { useMemo, memo } from 'react';
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
} from 'recharts';
import type { CombatantSimulationMetrics } from 'playlist-data-engine';
import ChartContainer from './ChartContainer';
import { axisProps, gridProps, tooltipProps, getSideColor, CHART_COLORS } from './chartTheme';
import './DPRComparisonChart.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DPRComparisonChartProps {
    /** Per-combatant metrics from simulation results (Map keyed by combatant ID) */
    metrics: Map<string, CombatantSimulationMetrics>;
    /** Additional CSS class */
    className?: string;
}

interface ChartRow {
    /** Display name */
    name: string;
    /** Combatant ID */
    id: string;
    /** DPR value */
    dpr: number;
    /** Which side */
    side: 'player' | 'enemy';
    /** Average total damage dealt */
    avgDamageDealt: number;
    /** Average total damage taken */
    avgDamageTaken: number;
    /** Survival rate (0–1) */
    survivalRate: number;
    /** Kill rate (0–1) */
    killRate: number;
    /** Most used action */
    mostUsedAction: string;
    /** Critical hit rate (0–1) */
    critRate: number;
    /** Average rounds survived */
    avgRoundsSurvived: number;
}

interface TooltipPayloadEntry {
    payload: ChartRow;
    value: number;
    dataKey: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDPR(value: number): string {
    return value.toFixed(1);
}

function formatPct(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

function toRow(m: CombatantSimulationMetrics): ChartRow {
    return {
        name: m.name,
        id: m.combatantId,
        dpr: m.averageDamagePerRound,
        side: m.side,
        avgDamageDealt: m.averageTotalDamageDealt,
        avgDamageTaken: m.averageTotalDamageTaken,
        survivalRate: m.survivalRate,
        killRate: m.killRate,
        mostUsedAction: m.mostUsedAction,
        critRate: m.criticalHitRate,
        avgRoundsSurvived: m.averageRoundsSurvived,
    };
}

function buildChartData(metrics: Map<string, CombatantSimulationMetrics>): ChartRow[] {
    const entries = Array.from(metrics.values());

    // Sort: enemies first (descending DPR), then players (descending DPR)
    // This creates a natural visual grouping in the horizontal bar chart
    const enemies = entries
        .filter(m => m.side === 'enemy')
        .sort((a, b) => b.averageDamagePerRound - a.averageDamagePerRound)
        .map(toRow);
    const players = entries
        .filter(m => m.side === 'player')
        .sort((a, b) => b.averageDamagePerRound - a.averageDamagePerRound)
        .map(toRow);

    // Insert a visual separator row between enemies and players
    const separator: ChartRow = {
        name: '─── Players ───',
        id: '__separator__',
        dpr: 0,
        side: 'player',
        avgDamageDealt: 0,
        avgDamageTaken: 0,
        survivalRate: 0,
        killRate: 0,
        mostUsedAction: '',
        critRate: 0,
        avgRoundsSurvived: 0,
    };

    return [...enemies, separator, ...players];
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function DPRTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    // Skip the separator row
    if (data.id === '__separator__') return null;

    const color = getSideColor(data.side);

    return (
        <div className="dpr-tooltip">
            <div className="dpr-tooltip-title" style={{ color }}>
                {data.name}
            </div>
            <div className="dpr-tooltip-row">
                <span className="dpr-tooltip-dot" style={{ backgroundColor: color }} />
                <span className="dpr-tooltip-label">Avg DPR</span>
                <span className="dpr-tooltip-value">{formatDPR(data.dpr)}</span>
            </div>
            <div className="dpr-tooltip-divider" />
            <div className="dpr-tooltip-row">
                <span className="dpr-tooltip-label">Total Damage / Run</span>
                <span className="dpr-tooltip-value">{formatDPR(data.avgDamageDealt)}</span>
            </div>
            <div className="dpr-tooltip-row">
                <span className="dpr-tooltip-label">Damage Taken / Run</span>
                <span className="dpr-tooltip-value">{formatDPR(data.avgDamageTaken)}</span>
            </div>
            <div className="dpr-tooltip-row">
                <span className="dpr-tooltip-label">Survival Rate</span>
                <span className="dpr-tooltip-value">{formatPct(data.survivalRate)}</span>
            </div>
            <div className="dpr-tooltip-row">
                <span className="dpr-tooltip-label">Kill Rate</span>
                <span className="dpr-tooltip-value">{formatPct(data.killRate)}</span>
            </div>
            <div className="dpr-tooltip-row">
                <span className="dpr-tooltip-label">Crit Rate</span>
                <span className="dpr-tooltip-value">{formatPct(data.critRate)}</span>
            </div>
            <div className="dpr-tooltip-row">
                <span className="dpr-tooltip-label">Avg Rounds Survived</span>
                <span className="dpr-tooltip-value">{data.avgRoundsSurvived.toFixed(1)}</span>
            </div>
            <div className="dpr-tooltip-row">
                <span className="dpr-tooltip-label">Most Used Action</span>
                <span className="dpr-tooltip-value">{data.mostUsedAction || '—'}</span>
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

function DPRComparisonChartComponent({
    metrics,
    className = '',
}: DPRComparisonChartProps) {
    const chartData = useMemo(() => buildChartData(metrics), [metrics]);

    const maxDPR = useMemo(() => {
        let max = 0;
        for (const row of chartData) {
            if (row.dpr > max) max = row.dpr;
        }
        return max;
    }, [chartData]);

    // Calculate row height based on number of combatants (min 28, max 36)
    const rowCount = chartData.length;
    const barSize = rowCount <= 4 ? 32 : rowCount <= 8 ? 28 : 22;
    const chartHeight = Math.max(200, rowCount * (barSize + 6) + 40);

    const subtitle = useMemo(() => {
        const entries = Array.from(metrics.values());
        const players = entries.filter(m => m.side === 'player').length;
        const enemies = entries.filter(m => m.side === 'enemy').length;
        return `${players} players, ${enemies} enemies`;
    }, [metrics]);

    return (
        <ChartContainer
            title="Damage Per Round (DPR)"
            subtitle={subtitle}
            className={`dpr-chart ${className}`}
            minHeight={200}
            maxHeight={Math.min(chartHeight, 500)}
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 8, right: 20, bottom: 8, left: 8 }}
                    barCategoryGap="15%"
                    barSize={barSize}
                >
                    <CartesianGrid {...gridProps} horizontal={false} />
                    <XAxis
                        {...axisProps.x}
                        type="number"
                        domain={[0, 'auto']}
                        tickFormatter={(v: number) => formatDPR(v)}
                        tick={{ ...axisProps.x.tick, fontSize: 10 }}
                    />
                    <YAxis
                        {...axisProps.y}
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ ...axisProps.y.tick, fontSize: 11 }}
                        tickFormatter={(v: string) => {
                            // Style the separator row differently
                            if (v.startsWith('───')) return '';
                            return v;
                        }}
                    />
                    <Tooltip
                        {...tooltipProps}
                        content={<DPRTooltip />}
                        cursor={false}
                    />

                    {/* Average DPR reference line */}
                    {maxDPR > 0 && (
                        <ReferenceLine
                            x={maxDPR / 2}
                            stroke={CHART_COLORS.neutral}
                            strokeDasharray="4 4"
                            strokeWidth={1}
                        />
                    )}

                    <Bar
                        dataKey="dpr"
                        radius={[0, 3, 3, 0]}
                        maxBarSize={36}
                        isAnimationActive={true}
                        animationDuration={500}
                    >
                        {chartData.map((entry, index) => {
                            // Separator row: invisible
                            if (entry.id === '__separator__') {
                                return (
                                    <Cell
                                        key={index}
                                        fill="transparent"
                                        stroke="none"
                                    />
                                );
                            }
                            return (
                                <Cell
                                    key={index}
                                    fill={getSideColor(entry.side)}
                                    opacity={0.85}
                                />
                            );
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
}

export const DPRComparisonChart = memo(DPRComparisonChartComponent);
export default DPRComparisonChart;
