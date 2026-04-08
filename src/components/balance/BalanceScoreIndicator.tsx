import { useState, useMemo, memo, useId } from 'react';
import { Info } from 'lucide-react';
import type { BalanceReport } from 'playlist-data-engine';
import './BalanceScoreIndicator.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps a 0-100 score to an HSL color along the red → yellow → green gradient.
 * 0 = pure red, 50 = yellow, 100 = pure green.
 */
function getScoreColor(score: number): string {
    if (score <= 50) {
        // Red (0) → Yellow (50): hue 0 → 48
        const t = score / 50;
        return `hsl(${Math.round(t * 48)} 90% 50%)`;
    }
    // Yellow (50) → Green (100): hue 48 → 142
    const t = (score - 50) / 50;
    return `hsl(${Math.round(48 + t * 94)} 76% 46%)`;
}

function getScoreColorWithAlpha(score: number, alpha: number): string {
    if (score <= 50) {
        const t = score / 50;
        return `hsl(${Math.round(t * 48)} 90% 50% / ${alpha})`;
    }
    const t = (score - 50) / 50;
    return `hsl(${Math.round(48 + t * 94)} 76% 46% / ${alpha})`;
}

/**
 * Returns a human-readable label for the score range.
 */
function getScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Acceptable';
    if (score >= 30) return 'Poor';
    return 'Very Poor';
}

/**
 * Returns a detailed explanation for the tooltip.
 */
function getScoreExplanation(report: BalanceReport): string {
    const { balanceScore, difficultyVariance, intendedDifficulty, actualDifficulty, confidence, totalRuns } = report;
    const pct = Math.round(confidence * 100);

    let explanation = `Balance Score: ${balanceScore}/100 — ${getScoreLabel(balanceScore)}. `;

    switch (difficultyVariance) {
        case 'balanced':
            explanation += `The "${actualDifficulty}" outcome matches the intended "${intendedDifficulty}" difficulty.`;
            break;
        case 'underpowered':
            explanation += `Encounter is easier than predicted (${actualDifficulty} vs "${intendedDifficulty}"). The party wins more often than expected.`;
            break;
        case 'overpowered':
            explanation += `Encounter is harder than predicted (${actualDifficulty} vs "${intendedDifficulty}"). The party struggles more than expected.`;
            break;
    }

    explanation += ` Confidence: ${pct}% (${totalRuns} runs).`;

    return explanation;
}

// ─── SVG Gauge Constants ──────────────────────────────────────────────────────

const GAUGE_RADIUS = 54;
const GAUGE_STROKE = 10;
const GAUGE_CENTER = 60;
const GAUGE_VIEWBOX = 120;
// Arc spans 180 degrees (semicircle), from left (180°) to right (0°) in standard math coords
const ARC_START_ANGLE = 180; // left side
const ARC_END_ANGLE = 0; // right side
const ARC_TOTAL_DEGREES = ARC_START_ANGLE - ARC_END_ANGLE; // 180

/**
 * Converts a value (0-100) to an angle in degrees for the gauge arc.
 * 0 maps to 180° (left), 100 maps to 0° (right).
 */
function valueToAngle(value: number): number {
    return ARC_START_ANGLE - (value / 100) * ARC_TOTAL_DEGREES;
}

/**
 * Generates an SVG arc path for the gauge background.
 * Draws a semicircle from left to right.
 */
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = startAngle - endAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
    };
}

// ─── Tick Marks ───────────────────────────────────────────────────────────────

function GaugeTicks() {
    const ticks = [0, 25, 50, 75, 100];
    return (
        <g className="bsi-gauge-ticks">
            {ticks.map((val) => {
                const angle = valueToAngle(val);
                const inner = polarToCartesian(GAUGE_CENTER, GAUGE_CENTER, GAUGE_RADIUS - GAUGE_STROKE - 4, angle);
                const outer = polarToCartesian(GAUGE_CENTER, GAUGE_CENTER, GAUGE_RADIUS - 2, angle);
                const labelPos = polarToCartesian(GAUGE_CENTER, GAUGE_CENTER, GAUGE_RADIUS - GAUGE_STROKE - 14, angle);
                return (
                    <g key={val}>
                        <line
                            x1={inner.x}
                            y1={inner.y}
                            x2={outer.x}
                            y2={outer.y}
                            className="bsi-tick-line"
                        />
                        <text
                            x={labelPos.x}
                            y={labelPos.y}
                            className="bsi-tick-label"
                            textAnchor="middle"
                            dominantBaseline="central"
                        >
                            {val}
                        </text>
                    </g>
                );
            })}
        </g>
    );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BalanceScoreIndicatorProps {
    /** Balance report containing the score and context */
    report: BalanceReport;
    /** Optional CSS class */
    className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

function BalanceScoreIndicatorComponent({
    report,
    className = '',
}: BalanceScoreIndicatorProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const tooltipId = useId();

    const score = report.balanceScore;

    const scoreColor = useMemo(() => getScoreColor(score), [score]);
    const scoreColorBg = useMemo(() => getScoreColorWithAlpha(score, 0.12), [score]);
    const scoreColorBorder = useMemo(() => getScoreColorWithAlpha(score, 0.25), [score]);
    const scoreLabel = useMemo(() => getScoreLabel(score), [score]);

    // Build the colored arc path (from left to the score position)
    // Extend 2° past the start to ensure the round cap fully overlaps the background arc
    const filledArcAngle = valueToAngle(score);
    const filledArcPath = useMemo(
        () => describeArc(GAUGE_CENTER, GAUGE_CENTER, GAUGE_RADIUS, ARC_START_ANGLE, filledArcAngle),
        // [filledArcAngle],
        [],
    );

    // Background arc (full semicircle)
    const bgArcPath = useMemo(
        () => describeArc(GAUGE_CENTER, GAUGE_CENTER, GAUGE_RADIUS, ARC_START_ANGLE, ARC_END_ANGLE),
        [],
    );

    // Needle position
    const needleAngle = valueToAngle(score);
    const needleTip = polarToCartesian(GAUGE_CENTER, GAUGE_CENTER, GAUGE_RADIUS - 2, needleAngle);
    const needleBase1 = polarToCartesian(GAUGE_CENTER, GAUGE_CENTER, GAUGE_RADIUS - GAUGE_STROKE - 8, needleAngle - 4);
    const needleBase2 = polarToCartesian(GAUGE_CENTER, GAUGE_CENTER, GAUGE_RADIUS - GAUGE_STROKE - 8, needleAngle + 4);

    const explanation = useMemo(() => getScoreExplanation(report), [report]);

    return (
        <div
            className={`bsi-container ${className}`}
            style={{
                '--bsi-score-color': scoreColor,
                '--bsi-score-bg': scoreColorBg,
                '--bsi-score-border': scoreColorBorder,
            } as React.CSSProperties}
        >
            {/* SVG Gauge */}
            <div className="bsi-gauge-wrapper">
                <svg
                    viewBox={`0 0 ${GAUGE_VIEWBOX} ${GAUGE_VIEWBOX}`}
                    className="bsi-gauge"
                    role="img"
                    aria-label={`Balance score: ${score} out of 100`}
                >
                    {/* Gradient definitions */}
                    <defs>
                        <linearGradient id="bsi-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="hsl(0 84% 60%)" />
                            <stop offset="35%" stopColor="hsl(28 96% 53%)" />
                            <stop offset="50%" stopColor="hsl(48 96% 53%)" />
                            <stop offset="75%" stopColor="hsl(100 70% 42%)" />
                            <stop offset="100%" stopColor="hsl(142 76% 46%)" />
                        </linearGradient>
                        <filter id="bsi-glow">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Background arc (full semicircle, muted) */}
                    <path
                        d={bgArcPath}
                        fill="none"
                        className="bsi-gauge-bg"
                        strokeWidth={GAUGE_STROKE}
                        strokeLinecap="round"
                    />

                    {/* Gradient background (thin track showing full spectrum) */}
                    <path
                        d={bgArcPath}
                        fill="none"
                        stroke="url(#bsi-gradient)"
                        strokeWidth={GAUGE_STROKE}
                        strokeLinecap="round"
                        opacity={0.3}
                    />

                    {/* Filled arc to score position */}
                    {score > 0 && (
                        <path
                            d={filledArcPath}
                            fill="none"
                            stroke={scoreColor}
                            strokeWidth={GAUGE_STROKE}
                            strokeLinecap="round"
                            className="bsi-gauge-fill"
                        />
                    )}

                    {/* Needle */}
                    <polygon
                        points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
                        className="bsi-needle"
                        fill={scoreColor}
                    />

                    {/* Tick marks */}
                    <GaugeTicks />
                </svg>

                {/* Center score display */}
                <div className="bsi-score-center">
                    <span className="bsi-score-value">{score}</span>
                    <span className="bsi-score-max">/100</span>
                </div>
            </div>

            {/* Score label below the gauge */}
            <span className="bsi-score-label">{scoreLabel}</span>

            {/* Info tooltip trigger */}
            <div className="bsi-info-row">
                <span className="bsi-variance-badge" data-variance={report.difficultyVariance}>
                    {report.difficultyVariance === 'underpowered' ? 'Easier Than Predicted' : report.difficultyVariance === 'overpowered' ? 'Harder Than Predicted' : 'As Predicted'}
                </span>
                <button
                    className="bsi-info-btn"
                    type="button"
                    aria-describedby={showTooltip ? tooltipId : undefined}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    onFocus={() => setShowTooltip(true)}
                    onBlur={() => setShowTooltip(false)}
                    onClick={() => setShowTooltip((v) => !v)}
                >
                    <Info size={12} />
                </button>
                {showTooltip && (
                    <div
                        id={tooltipId}
                        className="bsi-tooltip"
                        role="tooltip"
                    >
                        {explanation}
                    </div>
                )}
            </div>
        </div>
    );
}

export const BalanceScoreIndicator = memo(BalanceScoreIndicatorComponent);
export default BalanceScoreIndicator;
