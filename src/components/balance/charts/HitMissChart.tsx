/**
 * HitMissChart
 *
 * Grouped horizontal bar chart comparing average hits and misses per run
 * across all combatants. Players and enemies are shown in separate sections.
 * Tooltip uses a portal to escape overflow:hidden ancestors.
 */

import { useMemo, useCallback, useState, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Legend,
} from 'recharts';
import type { CombatantSimulationMetrics } from 'playlist-data-engine';
import ChartContainer from './ChartContainer';
import { axisProps, gridProps, tooltipProps, getSideColor, CHART_COLORS } from './chartTheme';
import './HitMissChart.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HitMissChartProps {
    metrics: Map<string, CombatantSimulationMetrics>;
    highlightedCombatantId?: string | null;
    onCombatantClick?: (combatantId: string | null) => void;
    className?: string;
}

interface ChartRow {
    name: string;
    id: string;
    side: 'player' | 'enemy';
    hits: number;
    misses: number;
    hitRate: number;
}

interface TooltipPayloadEntry {
    payload: ChartRow;
    value: number;
    dataKey: string;
    color: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toRow(m: CombatantSimulationMetrics): ChartRow {
    return {
        name: m.name,
        id: m.combatantId,
        side: m.side,
        hits: m.averageHitsPerRun,
        misses: m.averageMissesPerRun,
        hitRate: m.averageHitRate,
    };
}

function buildChartData(metrics: Map<string, CombatantSimulationMetrics>): ChartRow[] {
    const entries = Array.from(metrics.values());

    const enemies = entries
        .filter(m => m.side === 'enemy')
        .sort((a, b) => b.averageHitsPerRun - a.averageHitsPerRun)
        .map(toRow);
    const players = entries
        .filter(m => m.side === 'player')
        .sort((a, b) => b.averageHitsPerRun - a.averageHitsPerRun)
        .map(toRow);

    const separator: ChartRow = {
        name: '─── Players ───',
        id: '__separator__',
        side: 'player',
        hits: 0,
        misses: 0,
        hitRate: 0,
    };

    return [...enemies, separator, ...players];
}

/** Keep tooltip within viewport bounds */
function clampToViewport(x: number, y: number, width: number, height: number) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;

    if (x + width + pad > vw) x = x - width - 24;
    else x = x + 12;

    if (y + height + pad > vh) y = vh - height - pad;
    if (y < pad) y = pad;

    return { x, y };
}

// ─── Portal Tooltip ──────────────────────────────────────────────────────────

const TOOLTIP_WIDTH = 200;
const TOOLTIP_HEIGHT = 140;

function PortalTooltip({
    active,
    payload,
    mousePos,
}: {
    active?: boolean;
    payload?: TooltipPayloadEntry[];
    mousePos: { x: number; y: number };
}) {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    if (data.id === '__separator__') return null;

    const color = getSideColor(data.side);
    const pos = clampToViewport(mousePos.x, mousePos.y, TOOLTIP_WIDTH, TOOLTIP_HEIGHT);

    return createPortal(
        <div
            className="hm-tooltip hm-tooltip-portal"
            style={{
                position: 'fixed',
                left: pos.x,
                top: pos.y,
                zIndex: 9999,
                pointerEvents: 'none',
            }}
        >
            <div className="hm-tooltip-title" style={{ color }}>
                {data.name}
            </div>
            <div className="hm-tooltip-row">
                <span className="hm-tooltip-dot" style={{ backgroundColor: CHART_COLORS.positive }} />
                <span className="hm-tooltip-label">Hits / Run</span>
                <span className="hm-tooltip-value">{data.hits.toFixed(1)}</span>
            </div>
            <div className="hm-tooltip-row">
                <span className="hm-tooltip-dot" style={{ backgroundColor: CHART_COLORS.negative }} />
                <span className="hm-tooltip-label">Misses / Run</span>
                <span className="hm-tooltip-value">{data.misses.toFixed(1)}</span>
            </div>
            <div className="hm-tooltip-divider" />
            <div className="hm-tooltip-row">
                <span className="hm-tooltip-label">Hit Rate</span>
                <span className="hm-tooltip-value">{(data.hitRate * 100).toFixed(1)}%</span>
            </div>
        </div>,
        document.body,
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

function HitMissChartComponent({
    metrics,
    highlightedCombatantId,
    onCombatantClick,
    className = '',
}: HitMissChartProps) {
    const chartData = useMemo(() => buildChartData(metrics), [metrics]);
    const mousePosRef = useRef({ x: 0, y: 0 });
    const [, forceUpdate] = useState(0);

    const rowCount = chartData.length;
    const barSize = rowCount <= 4 ? 14 : rowCount <= 8 ? 12 : 10;
    const chartHeight = Math.max(200, rowCount * (barSize * 2 + 8) + 50);

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

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        mousePosRef.current = { x: e.clientX, y: e.clientY };
        forceUpdate(n => n + 1);
    }, []);

    return (
        <ChartContainer
            title="Hits & Misses Per Run"
            subtitle={subtitle}
            className={`hm-chart ${className}`}
            minHeight={200}
            maxHeight={Math.min(chartHeight, 500)}
            onMouseMove={handleMouseMove}
        >
            <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 8, right: 20, bottom: 8, left: 8 }}
                        barCategoryGap="20%"
                        barSize={barSize}
                    >
                        <CartesianGrid {...gridProps} horizontal={false} />
                        <XAxis
                            {...axisProps.x}
                            type="number"
                            domain={[0, 'auto']}
                            tickFormatter={(v: number) => v.toFixed(0)}
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
                            content={<PortalTooltip mousePos={mousePosRef.current} />}
                            cursor={false}
                        />
                        <Legend
                            verticalAlign="top"
                            height={24}
                            iconType="square"
                            iconSize={8}
                            wrapperStyle={{ fontSize: 11, paddingTop: 2 }}
                        />

                        <Bar
                            dataKey="hits"
                            name="Hits"
                            fill={CHART_COLORS.positive}
                            radius={[0, 2, 2, 0]}
                            maxBarSize={18}
                            isAnimationActive={true}
                            animationDuration={500}
                            cursor={onCombatantClick ? 'pointer' : undefined}
                            onClick={(data) => handleClick(data)}
                            stackId="a"
                        >
                            {chartData.map((entry, index) => {
                                if (entry.id === '__separator__') {
                                    return <Cell key={index} fill="transparent" stroke="none" />;
                                }
                                const isHighlighted = highlightedCombatantId === entry.id;
                                const isDimmed = hasHighlight && !isHighlighted;
                                return (
                                    <Cell
                                        key={index}
                                        fill={CHART_COLORS.positive}
                                        opacity={isHighlighted ? 1 : isDimmed ? 0.3 : 0.85}
                                    />
                                );
                            })}
                        </Bar>

                        <Bar
                            dataKey="misses"
                            name="Misses"
                            fill={CHART_COLORS.negative}
                            radius={[0, 2, 2, 0]}
                            maxBarSize={18}
                            isAnimationActive={true}
                            animationDuration={500}
                            cursor={onCombatantClick ? 'pointer' : undefined}
                            onClick={(data) => handleClick(data)}
                        >
                            {chartData.map((entry, index) => {
                                if (entry.id === '__separator__') {
                                    return <Cell key={index} fill="transparent" stroke="none" />;
                                }
                                const isHighlighted = highlightedCombatantId === entry.id;
                                const isDimmed = hasHighlight && !isHighlighted;
                                return (
                                    <Cell
                                        key={index}
                                        fill={CHART_COLORS.negative}
                                        opacity={isHighlighted ? 1 : isDimmed ? 0.3 : 0.85}
                                    />
                                );
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
        </ChartContainer>
    );
}

export const HitMissChart = memo(HitMissChartComponent);
export default HitMissChart;
