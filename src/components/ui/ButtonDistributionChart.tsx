/**
 * ButtonDistributionChart Component
 *
 * A bar chart visualization showing the distribution of button usage
 * in the generated level.
 *
 * Features:
 * - Bar chart of button usage
 * - Count and percentage display
 * - Color-coded to buttons
 * - Adapts to DDR (4 bars) or Guitar Hero (5 bars)
 * - Interactive hover effects with button details
 *
 * Task 6.5: Create ButtonDistributionChart Component
 */

import { useMemo } from 'react';
import { BarChart3, Gamepad2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import './ButtonDistributionChart.css';
import { cn } from '../../utils/cn';
import type { ControllerMode } from 'playlist-data-engine';

// ============================================================
// Types
// ============================================================

export interface ButtonDistributionChartProps {
    /** Controller mode (DDR or Guitar Hero) */
    controllerMode: ControllerMode;
    /** Button distribution map (button name -> count) */
    distribution: Map<string, number> | Record<string, number>;
    /** Total beats in the chart */
    totalBeats: number;
    /** Height of the chart in pixels (default: 180) */
    height?: number;
    /** Whether to show the header */
    showHeader?: boolean;
    /** Whether to show as horizontal bars (default) or vertical bars */
    layout?: 'horizontal' | 'vertical';
    /** Whether to show compact view (no header, smaller bars) */
    compact?: boolean;
    /** Additional CSS class names */
    className?: string;
}

/** Configuration for a DDR button */
interface DDRButtonConfig {
    name: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    hex: string;
}

/** Configuration for a Guitar Hero button */
interface GuitarHeroButtonConfig {
    name: string;
    label: string;
    color: string;
    hex: string;
}

// ============================================================
// Constants
// ============================================================

/** DDR button configurations */
const DDR_BUTTON_CONFIGS: DDRButtonConfig[] = [
    { name: 'up', label: 'Up', icon: <ArrowUp size={14} />, color: 'yellow', hex: '#eab308' },
    { name: 'down', label: 'Down', icon: <ArrowDown size={14} />, color: 'blue', hex: '#3b82f6' },
    { name: 'left', label: 'Left', icon: <ArrowLeft size={14} />, color: 'purple', hex: '#a855f7' },
    { name: 'right', label: 'Right', icon: <ArrowRight size={14} />, color: 'green', hex: '#22c55e' },
];

/** Guitar Hero button configurations */
const GUITAR_HERO_BUTTON_CONFIGS: GuitarHeroButtonConfig[] = [
    { name: '1', label: 'Fret 1', color: 'red', hex: '#ef4444' },
    { name: '2', label: 'Fret 2', color: 'orange', hex: '#f97316' },
    { name: '3', label: 'Fret 3', color: 'yellow', hex: '#eab308' },
    { name: '4', label: 'Fret 4', color: 'green', hex: '#22c55e' },
    { name: '5', label: 'Fret 5', color: 'blue', hex: '#3b82f6' },
];

// ============================================================
// Helper Functions
// ============================================================

/**
 * Convert distribution to a normalized map
 */
function normalizeDistribution(
    distribution: Map<string, number> | Record<string, number>
): Map<string, number> {
    if (distribution instanceof Map) {
        return distribution;
    }
    return new Map(Object.entries(distribution));
}

/**
 * Calculate percentage from count and total.
 */
function calculatePercent(count: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
}

// ============================================================
// Sub-components
// ============================================================

interface VerticalBarChartProps {
    configs: DDRButtonConfig[] | GuitarHeroButtonConfig[];
    distribution: Map<string, number>;
    totalBeats: number;
    maxCount: number;
    height: number;
    isDDR: boolean;
}

function VerticalBarChart({ configs, distribution, totalBeats, maxCount, height, isDDR }: VerticalBarChartProps) {
    return (
        <div className="btn-dist-chart__vertical" style={{ height: `${height}px` }}>
            {/* Y-Axis Labels */}
            <div className="btn-dist-chart__y-axis">
                <span style={{ bottom: '100%' }}>{maxCount}</span>
                <span style={{ bottom: '50%' }}>{Math.round(maxCount / 2)}</span>
                <span style={{ bottom: '0' }}>0</span>
            </div>

            {/* Bars Container */}
            <div className="btn-dist-chart__bars">
                {configs.map((config) => {
                    const count = distribution.get(config.name) ?? 0;
                    const percent = calculatePercent(count, totalBeats);
                    const barHeight = maxCount > 0 ? (count / maxCount) * 100 : 0;

                    return (
                        <div
                            key={config.name}
                            className={cn(
                                'btn-dist-chart__bar-wrapper',
                                `btn-dist-chart__bar-wrapper--${config.color}`
                            )}
                            title={`${config.label}: ${count} beats (${percent}%)`}
                        >
                            <div
                                className="btn-dist-chart__bar"
                                style={{
                                    height: `${barHeight}%`,
                                    backgroundColor: config.hex,
                                }}
                            >
                                {count > 0 && (
                                    <span className="btn-dist-chart__bar-value">{count}</span>
                                )}
                            </div>
                            <div className="btn-dist-chart__bar-label">
                                {isDDR ? (
                                    <span className="btn-dist-chart__bar-icon">
                                        {(config as DDRButtonConfig).icon}
                                    </span>
                                ) : (
                                    <span className="btn-dist-chart__bar-fret">{config.name}</span>
                                )}
                                <span className="btn-dist-chart__bar-name">{config.label}</span>
                            </div>
                            <div className="btn-dist-chart__bar-percent">{percent}%</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface HorizontalBarChartProps {
    configs: DDRButtonConfig[] | GuitarHeroButtonConfig[];
    distribution: Map<string, number>;
    totalBeats: number;
    isDDR: boolean;
    compact: boolean;
}

function HorizontalBarChart({ configs, distribution, totalBeats, isDDR, compact }: HorizontalBarChartProps) {
    return (
        <div className="btn-dist-chart__horizontal">
            {configs.map((config) => {
                const count = distribution.get(config.name) ?? 0;
                const percent = calculatePercent(count, totalBeats);

                return (
                    <div
                        key={config.name}
                        className={cn(
                            'btn-dist-chart__hbar',
                            `btn-dist-chart__hbar--${config.color}`,
                            compact && 'btn-dist-chart__hbar--compact'
                        )}
                        title={`${config.label}: ${count} beats (${percent}%)`}
                    >
                        <div className="btn-dist-chart__hbar-header">
                            {isDDR ? (
                                <span className="btn-dist-chart__hbar-icon">
                                    {(config as DDRButtonConfig).icon}
                                </span>
                            ) : (
                                <span
                                    className="btn-dist-chart__hbar-fret"
                                    style={{ backgroundColor: `${config.hex}20`, color: config.hex }}
                                >
                                    {config.name}
                                </span>
                            )}
                            <span className="btn-dist-chart__hbar-label">{config.label}</span>
                        </div>
                        <div className="btn-dist-chart__hbar-track">
                            <div
                                className="btn-dist-chart__hbar-fill"
                                style={{
                                    width: `${percent}%`,
                                    background: `linear-gradient(90deg, ${config.hex}, ${config.hex}cc)`,
                                }}
                            />
                        </div>
                        <div className="btn-dist-chart__hbar-stats">
                            <span className="btn-dist-chart__hbar-count">{count}</span>
                            <span className="btn-dist-chart__hbar-percent">{percent}%</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

export function ButtonDistributionChart({
    controllerMode,
    distribution: distributionProp,
    totalBeats,
    height = 180,
    showHeader = true,
    layout = 'horizontal',
    compact = false,
    className,
}: ButtonDistributionChartProps) {
    // Normalize distribution to Map
    const distribution = useMemo(
        () => normalizeDistribution(distributionProp),
        [distributionProp]
    );

    // Get configs based on controller mode
    const isDDR = controllerMode === 'ddr';
    const configs = isDDR ? DDR_BUTTON_CONFIGS : GUITAR_HERO_BUTTON_CONFIGS;

    // Calculate totals and max
    const { total, maxCount } = useMemo(() => {
        let t = 0;
        let m = 0;
        distribution.forEach((count) => {
            t += count;
            if (count > m) m = count;
        });
        return { total: t, maxCount: Math.max(m, 1) };
    }, [distribution]);

    // Empty state
    if (total === 0) {
        return (
            <div className={cn('button-distribution-chart', 'button-distribution-chart--empty', className)}>
                {showHeader && (
                    <div className="btn-dist-chart__header">
                        <BarChart3 size={16} className="btn-dist-chart__icon" />
                        <span className="btn-dist-chart__title">Button Distribution</span>
                    </div>
                )}
                <div className="btn-dist-chart__empty-content">
                    <Gamepad2 size={24} className="btn-dist-chart__empty-icon" />
                    <p>No button distribution data available</p>
                    <p className="btn-dist-chart__empty-hint">
                        Button mapping runs during level generation.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('button-distribution-chart', compact && 'button-distribution-chart--compact', className)}>
            {/* Header */}
            {showHeader && (
                <div className="btn-dist-chart__header">
                    <BarChart3 size={16} className="btn-dist-chart__icon" />
                    <span className="btn-dist-chart__title">Button Distribution</span>
                    <span className={cn('btn-dist-chart__mode-badge', isDDR ? 'btn-dist-chart__mode-ddr' : 'btn-dist-chart__mode-guitar')}>
                        {isDDR ? 'DDR' : 'Guitar Hero'}
                    </span>
                </div>
            )}

            {/* Summary */}
            {!compact && (
                <div className="btn-dist-chart__summary">
                    <span className="btn-dist-chart__summary-item">
                        <span className="btn-dist-chart__summary-value">{totalBeats}</span>
                        <span className="btn-dist-chart__summary-label">Total Beats</span>
                    </span>
                    <span className="btn-dist-chart__summary-item">
                        <span className="btn-dist-chart__summary-value">{configs.length}</span>
                        <span className="btn-dist-chart__summary-label">Keys Used</span>
                    </span>
                </div>
            )}

            {/* Chart */}
            {layout === 'vertical' ? (
                <VerticalBarChart
                    configs={configs}
                    distribution={distribution}
                    totalBeats={totalBeats}
                    maxCount={maxCount}
                    height={height}
                    isDDR={isDDR}
                />
            ) : (
                <HorizontalBarChart
                    configs={configs}
                    distribution={distribution}
                    totalBeats={totalBeats}
                    isDDR={isDDR}
                    compact={compact}
                />
            )}

            {/* Legend */}
            {!compact && (
                <div className="btn-dist-chart__legend">
                    {configs.map((config) => {
                        const count = distribution.get(config.name) ?? 0;
                        const percent = calculatePercent(count, totalBeats);

                        return (
                            <div
                                key={config.name}
                                className={cn(
                                    'btn-dist-chart__legend-item',
                                    `btn-dist-chart__legend-item--${config.color}`
                                )}
                            >
                                <span
                                    className="btn-dist-chart__legend-color"
                                    style={{ backgroundColor: config.hex }}
                                />
                                <span className="btn-dist-chart__legend-label">
                                    {config.label}
                                </span>
                                <span className="btn-dist-chart__legend-stats">
                                    {count} ({percent}%)
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// Export configurations for external use
export { DDR_BUTTON_CONFIGS, GUITAR_HERO_BUTTON_CONFIGS };

export default ButtonDistributionChart;
