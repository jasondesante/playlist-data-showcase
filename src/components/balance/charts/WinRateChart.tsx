/**
 * WinRateChart
 *
 * Bar chart displaying player win rate with confidence interval (margin of error).
 * Color-coded by difficulty assessment. Supports overlaying multiple simulation
 * results for side-by-side comparison.
 *
 * (Task 9.2.1)
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
    ErrorBar,
} from 'recharts';
import type { SimulationResults } from 'playlist-data-engine';
import ChartContainer from './ChartContainer';
import {
    axisProps,
    gridProps,
    tooltipProps,
    difficultyReferenceLines,
    getWinRateChartColor,
    CHART_COLORS,
} from './chartTheme';
import './WinRateChart.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WinRateChartProps {
    /** Primary simulation results to display */
    results: SimulationResults;
    /** Optional label for the primary result (defaults to "Current") */
    label?: string;
    /** Optional additional results to overlay for comparison */
    comparisonResults?: Array<{ results: SimulationResults; label: string }>;
    /** Additional CSS class */
    className?: string;
}

interface ChartDataPoint {
    name: string;
    /** Win rate as percentage (0–100) for Y-axis */
    winRatePct: number;
    /** Margin of error as percentage (0–100) for ErrorBar */
    moePct: number;
    /** Raw win rate (0–1) for tooltip calculations */
    winRateRaw: number;
    runs: number;
    playerWins: number;
    enemyWins: number;
    draws: number;
    avgRounds: number;
}

interface TooltipPayloadEntry {
    payload: ChartDataPoint;
    value: number;
    dataKey: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute margin of error for a proportion using normal approximation.
 * MOE = z * sqrt(p * (1 - p) / n), where z = 1.96 for 95% confidence.
 * Returns a value in 0–1 range.
 */
function computeMOE(winRate: number, totalRuns: number): number {
    if (totalRuns < 2) return 0;
    const p = Math.max(0, Math.min(1, winRate));
    return 1.96 * Math.sqrt((p * (1 - p)) / totalRuns);
}

function formatPct(value01: number): string {
    return `${(value01 * 100).toFixed(1)}%`;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function WinRateTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    const color = getWinRateChartColor(data.winRateRaw);
    const moeRaw = data.moePct / 100;
    const lowCI = Math.max(0, data.winRateRaw - moeRaw);
    const highCI = Math.min(1, data.winRateRaw + moeRaw);

    return (
        <div className="wrc-tooltip">
            <div className="wrc-tooltip-title">{data.name}</div>
            <div className="wrc-tooltip-row">
                <span className="wrc-tooltip-dot" style={{ backgroundColor: color }} />
                <span className="wrc-tooltip-label">Win Rate</span>
                <span className="wrc-tooltip-value">{formatPct(data.winRateRaw)}</span>
            </div>
            <div className="wrc-tooltip-row wrc-tooltip-detail">
                <span className="wrc-tooltip-label">95% CI</span>
                <span className="wrc-tooltip-value">
                    {formatPct(lowCI)} — {formatPct(highCI)}
                </span>
            </div>
            <div className="wrc-tooltip-divider" />
            <div className="wrc-tooltip-row">
                <span className="wrc-tooltip-label">Runs</span>
                <span className="wrc-tooltip-value">{data.runs.toLocaleString()}</span>
            </div>
            <div className="wrc-tooltip-row">
                <span className="wrc-tooltip-label">W / L / D</span>
                <span className="wrc-tooltip-value">
                    {data.playerWins} / {data.enemyWins} / {data.draws}
                </span>
            </div>
            <div className="wrc-tooltip-row">
                <span className="wrc-tooltip-label">Avg Rounds</span>
                <span className="wrc-tooltip-value">{data.avgRounds.toFixed(1)}</span>
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

function WinRateChartComponent({
    results,
    label = 'Current',
    comparisonResults = [],
    className = '',
}: WinRateChartProps) {
    // Build chart data — values in percentage scale (0–100) for Y-axis
    const chartData = useMemo<ChartDataPoint[]>(() => {
        const build = (r: SimulationResults, name: string): ChartDataPoint => {
            const wr = r.summary.playerWinRate;
            return {
                name,
                winRatePct: +(wr * 100).toFixed(1),
                moePct: +(computeMOE(wr, r.summary.totalRuns) * 100).toFixed(1),
                winRateRaw: wr,
                runs: r.summary.totalRuns,
                playerWins: r.summary.playerWins,
                enemyWins: r.summary.enemyWins,
                draws: r.summary.draws,
                avgRounds: r.summary.averageRounds,
            };
        };

        return [
            build(results, label),
            ...comparisonResults.map(c => build(c.results, c.label)),
        ];
    }, [results, label, comparisonResults]);

    const hasComparison = comparisonResults.length > 0;

    // Subtitle shows confidence interval for single result, count for comparison
    const subtitle = useMemo(() => {
        if (hasComparison) return `${chartData.length} simulations compared`;
        const d = chartData[0];
        const low = Math.max(0, d.winRateRaw - d.moePct / 100);
        const high = Math.min(1, d.winRateRaw + d.moePct / 100);
        return `${formatPct(d.winRateRaw)} (${formatPct(low)} — ${formatPct(high)})`;
    }, [chartData, hasComparison]);

    return (
        <ChartContainer
            title="Player Win Rate"
            subtitle={subtitle}
            className={`wrc-chart ${className}`}
            minHeight={240}
            maxHeight={360}
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 20, bottom: 8, left: 8 }}
                    barCategoryGap="20%"
                    barSize={hasComparison ? undefined : 60}
                >
                    <CartesianGrid {...gridProps} />
                    <XAxis
                        {...axisProps.x}
                        dataKey="name"
                        tick={{ ...axisProps.x.tick, fontSize: 12 }}
                    />
                    <YAxis
                        {...axisProps.y}
                        domain={[0, 100]}
                        tickFormatter={(v: number) => `${v}%`}
                        tick={{ ...axisProps.y.tick, fontSize: 11 }}
                    />
                    <Tooltip
                        {...tooltipProps}
                        content={<WinRateTooltip />}
                        cursor={false}
                    />

                    {/* Difficulty threshold reference lines */}
                    <ReferenceLine
                        y={90}
                        {...difficultyReferenceLines.easy}
                        label={{
                            value: 'Easy',
                            position: 'insideTopRight',
                            fill: CHART_COLORS.positive,
                            fontSize: 10,
                            fontWeight: 600,
                        }}
                    />
                    <ReferenceLine
                        y={75}
                        {...difficultyReferenceLines.medium}
                        label={{
                            value: 'Medium',
                            position: 'insideTopRight',
                            fill: CHART_COLORS.accent,
                            fontSize: 10,
                            fontWeight: 600,
                        }}
                    />
                    <ReferenceLine
                        y={55}
                        {...difficultyReferenceLines.hard}
                        label={{
                            value: 'Hard',
                            position: 'insideTopRight',
                            fill: CHART_COLORS.critical,
                            fontSize: 10,
                            fontWeight: 600,
                        }}
                    />
                    <ReferenceLine
                        y={35}
                        {...difficultyReferenceLines.deadly}
                        label={{
                            value: 'Deadly',
                            position: 'insideTopRight',
                            fill: CHART_COLORS.negative,
                            fontSize: 10,
                            fontWeight: 600,
                        }}
                    />

                    {/* Win rate bar with confidence interval whiskers */}
                    <Bar
                        dataKey="winRatePct"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={80}
                        isAnimationActive={true}
                        animationDuration={600}
                    >
                        {chartData.map((entry, index) => (
                            <Cell
                                key={index}
                                fill={getWinRateChartColor(entry.winRateRaw)}
                                opacity={index === 0 ? 1 : 0.75}
                            />
                        ))}
                        <ErrorBar
                            dataKey="moePct"
                            width={8}
                            strokeWidth={2}
                            stroke={CHART_COLORS.muted}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
}

export const WinRateChart = memo(WinRateChartComponent);
export default WinRateChart;
