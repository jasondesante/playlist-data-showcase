/**
 * SweepResultsChart
 *
 * Line chart showing how player win rate changes as a parameter varies
 * across a parameter sweep. Displays difficulty threshold reference lines
 * (Easy, Medium, Hard, Deadly) and highlights "sweet spot" ranges where
 * the win rate falls within each difficulty tier.
 *
 * (Task 9.2.7)
 */

import { useMemo, memo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ReferenceArea,
    ResponsiveContainer,
} from 'recharts';
import type { SweepResults, SweepDataPoint, SweepVariable } from 'playlist-data-engine';
import ChartContainer from './ChartContainer';
import {
    axisProps,
    gridProps,
    tooltipProps,
    difficultyReferenceLines,
    CHART_COLORS,
} from './chartTheme';
import './SweepResultsChart.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SweepResultsChartProps {
    /** Sweep results containing data points to plot */
    results: SweepResults;
    /** Additional CSS class */
    className?: string;
}

interface TooltipPayloadEntry {
    payload: SweepDataPoint;
    value: number;
    dataKey: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Display label for sweep variables */
function getVariableLabel(variable: SweepVariable): string {
    const labels: Record<SweepVariable, string> = {
        cr: 'Challenge Rating',
        enemyCount: 'Enemy Count',
        partyLevel: 'Party Level',
        difficultyMultiplier: 'Difficulty Multiplier',
        rarity: 'Rarity Tier',
        hpLevel: 'HP Level',
        attackLevel: 'Attack Level',
        defenseLevel: 'Defense Level',
    };
    return labels[variable] || variable;
}

/** Format a parameter value for display based on the sweep variable */
function formatParamValue(variable: SweepVariable, value: number): string {
    switch (variable) {
        case 'cr':
            return value < 1 ? `${value}` : `${value}`;
        case 'rarity':
            return ['Common', 'Uncommon', 'Elite', 'Boss'][value] || `${value}`;
        case 'difficultyMultiplier':
            return value.toFixed(1);
        default:
            return `${value}`;
    }
}

/** Compute a display label for the X-axis based on the sweep variable */
function getXAxisLabel(variable: SweepVariable): string {
    return getVariableLabel(variable);
}

/**
 * Find "sweet spot" ranges — contiguous data points where win rate falls
 * within each difficulty tier. Returns highlight regions for the chart.
 */
function findSweetSpots(
    dataPoints: SweepDataPoint[],
): Array<{ start: number; end: number; tier: string; color: string }> {
    if (dataPoints.length < 2) return [];

    const tiers = [
        { min: 0.9, max: 1.01, label: 'Easy', color: CHART_COLORS.positive },
        { min: 0.7, max: 0.9, label: 'Medium', color: CHART_COLORS.accent },
        { min: 0.5, max: 0.7, label: 'Hard', color: CHART_COLORS.critical },
        { min: 0.3, max: 0.5, label: 'Deadly', color: CHART_COLORS.negative },
    ];

    const sweetSpots: Array<{ start: number; end: number; tier: string; color: string }> = [];

    for (const tier of tiers) {
        // Find contiguous runs of data points within this tier
        let runStart: number | null = null;
        let runEnd: number | null = null;

        for (const point of dataPoints) {
            const wr = point.playerWinRate;
            if (wr >= tier.min && wr < tier.max) {
                if (runStart === null) {
                    runStart = point.parameterValue;
                    runEnd = point.parameterValue;
                } else {
                    runEnd = point.parameterValue;
                }
            } else {
                if (runStart !== null && runEnd !== null) {
                    sweetSpots.push({
                        start: runStart,
                        end: runEnd,
                        tier: tier.label,
                        color: tier.color,
                    });
                    runStart = null;
                    runEnd = null;
                }
            }
        }

        // Close any open run
        if (runStart !== null && runEnd !== null) {
            sweetSpots.push({
                start: runStart,
                end: runEnd,
                tier: tier.label,
                color: tier.color,
            });
        }
    }

    return sweetSpots;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function SweepTooltip({
    active,
    payload,
    variable,
}: {
    active?: boolean;
    payload?: TooltipPayloadEntry[];
    variable: SweepVariable;
}) {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    const wrPct = (data.playerWinRate * 100).toFixed(1);
    const wrColor = data.playerWinRate >= 0.8
        ? CHART_COLORS.positive
        : data.playerWinRate >= 0.5
            ? CHART_COLORS.accent
            : data.playerWinRate >= 0.3
                ? CHART_COLORS.critical
                : CHART_COLORS.negative;

    return (
        <div className="swrc-tooltip">
            <div className="swrc-tooltip-title">
                {getVariableLabel(variable)}: {formatParamValue(variable, data.parameterValue)}
            </div>
            <div className="swrc-tooltip-row">
                <span className="swrc-tooltip-dot" style={{ backgroundColor: wrColor }} />
                <span className="swrc-tooltip-label">Win Rate</span>
                <span className="swrc-tooltip-value">{wrPct}%</span>
            </div>
            <div className="swrc-tooltip-divider" />
            <div className="swrc-tooltip-row">
                <span className="swrc-tooltip-label">Avg Rounds</span>
                <span className="swrc-tooltip-value">{data.averageRounds.toFixed(1)}</span>
            </div>
            <div className="swrc-tooltip-row">
                <span className="swrc-tooltip-label">Median Rounds</span>
                <span className="swrc-tooltip-value">{data.medianRounds.toFixed(1)}</span>
            </div>
            <div className="swrc-tooltip-row">
                <span className="swrc-tooltip-label">HP Remaining</span>
                <span className="swrc-tooltip-value">{(data.averageHPRemaining * 100).toFixed(1)}%</span>
            </div>
            <div className="swrc-tooltip-divider" />
            <div className="swrc-tooltip-row">
                <span className="swrc-tooltip-label">Player Deaths</span>
                <span className="swrc-tooltip-value" style={{ color: CHART_COLORS.negative }}>
                    {data.totalPlayerDeaths}
                </span>
            </div>
            <div className="swrc-tooltip-row">
                <span className="swrc-tooltip-label">Enemy Deaths</span>
                <span className="swrc-tooltip-value" style={{ color: CHART_COLORS.positive }}>
                    {data.totalEnemyDeaths}
                </span>
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

function SweepResultsChartComponent({
    results,
    className = '',
}: SweepResultsChartProps) {
    const { dataPoints, variable } = results;

    // Build chart data with formatted labels
    const chartData = useMemo(() => {
        return dataPoints.map(point => ({
            ...point,
            label: formatParamValue(variable, point.parameterValue),
            winRatePct: +(point.playerWinRate * 100).toFixed(1),
        }));
    }, [dataPoints, variable]);

    // Compute sweet spot highlight regions
    const sweetSpots = useMemo(() => findSweetSpots(dataPoints), [dataPoints]);

    // Determine if win rate generally increases or decreases
    const trendDirection = useMemo(() => {
        if (chartData.length < 2) return null;
        const first = chartData[0].playerWinRate;
        const last = chartData[chartData.length - 1].playerWinRate;
        if (Math.abs(last - first) < 0.05) return 'flat';
        return last > first ? 'increasing' : 'decreasing';
    }, [chartData]);

    // Subtitle
    const subtitle = useMemo(() => {
        const pointCount = chartData.length;
        const varLabel = getVariableLabel(variable);
        const trendLabel = trendDirection === 'increasing'
            ? '(increases with parameter)'
            : trendDirection === 'decreasing'
                ? '(decreases with parameter)'
                : '';
        return `${varLabel} sweep — ${pointCount} data points${trendLabel ? ` ${trendLabel}` : ''}`;
    }, [chartData.length, variable, trendDirection]);

    // Empty state
    if (dataPoints.length === 0) {
        return (
            <ChartContainer
                title="Parameter Sweep Results"
                subtitle="No data points available"
                className={`swrc-chart ${className}`}
                minHeight={240}
                maxHeight={360}
            >
                <div className="swrc-empty">
                    <p className="swrc-empty-text">No sweep data to display</p>
                    <p className="swrc-empty-hint">Run a parameter sweep to see how win rate changes.</p>
                </div>
            </ChartContainer>
        );
    }

    return (
        <ChartContainer
            title="Parameter Sweep — Win Rate Curve"
            subtitle={subtitle}
            className={`swrc-chart ${className}`}
            minHeight={300}
            maxHeight={420}
        >
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{ top: 20, right: 30, bottom: 10, left: 10 }}
                >
                    <CartesianGrid {...gridProps} />
                    <XAxis
                        {...axisProps.x}
                        dataKey="label"
                        tick={{ ...axisProps.x.tick, fontSize: 10 }}
                        label={{
                            value: getXAxisLabel(variable),
                            position: 'insideBottom',
                            offset: -2,
                            style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 },
                        }}
                    />
                    <YAxis
                        {...axisProps.y}
                        domain={[0, 100]}
                        tickFormatter={(v: number) => `${v}%`}
                        tick={{ ...axisProps.y.tick, fontSize: 11 }}
                        label={{
                            value: 'Player Win Rate',
                            angle: -90,
                            position: 'insideLeft',
                            style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 },
                        }}
                    />
                    <Tooltip
                        {...tooltipProps}
                        content={<SweepTooltip variable={variable} />}
                        cursor={{
                            stroke: CHART_COLORS.player,
                            strokeDasharray: '4 4',
                            opacity: 0.5,
                        }}
                    />

                    {/* Sweet spot highlight regions */}
                    {sweetSpots.map((spot, index) => (
                        <ReferenceArea
                            key={`sweet-${index}`}
                            x1={formatParamValue(variable, spot.start)}
                            x2={formatParamValue(variable, spot.end)}
                            fill={spot.color}
                            fillOpacity={0.08}
                            ifOverflow="extendDomain"
                        />
                    ))}

                    {/* Difficulty threshold reference lines */}
                    <ReferenceLine
                        y={90}
                        {...difficultyReferenceLines.easy}
                        label={{
                            value: 'Easy (90%)',
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
                            value: 'Medium (75%)',
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
                            value: 'Hard (55%)',
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
                            value: 'Deadly (35%)',
                            position: 'insideTopRight',
                            fill: CHART_COLORS.negative,
                            fontSize: 10,
                            fontWeight: 600,
                        }}
                    />

                    {/* Win rate line */}
                    <Line
                        type="monotone"
                        dataKey="winRatePct"
                        stroke={CHART_COLORS.player}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: CHART_COLORS.player, strokeWidth: 0 }}
                        activeDot={{
                            r: 6,
                            fill: CHART_COLORS.player,
                            stroke: CHART_COLORS.player,
                            strokeWidth: 2,
                            strokeOpacity: 0.3,
                        }}
                        isAnimationActive={true}
                        animationDuration={800}
                        name="Win Rate"
                    />
                </LineChart>
            </ResponsiveContainer>

            {/* Sweet spot legend below chart */}
            {sweetSpots.length > 0 && (
                <div className="swrc-sweet-spots">
                    <span className="swrc-sweet-spots-label">Sweet Spots:</span>
                    {sweetSpots.map((spot, index) => (
                        <span
                            key={index}
                            className="swrc-sweet-spot-tag"
                            style={{
                                borderColor: spot.color,
                                color: spot.color,
                                backgroundColor: `${spot.color}15`,
                            }}
                        >
                            {spot.tier}: {formatParamValue(variable, spot.start)}
                            {spot.start !== spot.end ? `–${formatParamValue(variable, spot.end)}` : ''}
                        </span>
                    ))}
                </div>
            )}
        </ChartContainer>
    );
}

export const SweepResultsChart = memo(SweepResultsChartComponent);
export default SweepResultsChart;
