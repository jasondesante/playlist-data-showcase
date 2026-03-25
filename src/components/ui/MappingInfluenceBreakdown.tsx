/**
 * MappingInfluenceBreakdown Component
 *
 * A visualization showing the breakdown of pitch vs pattern influence on button mapping.
 * Displays a pie chart, the pitch influence weight setting, and explains
 * the probability threshold effects.
 *
 * Features:
 * - Pie/donut chart showing pitch vs pattern influenced beats
 * - Display of pitchInfluenceWeight setting from Step 1
 * - Explanation of voicing threshold effects
 * - Interactive hover effects with detailed stats
 *
 * Task 6.6: MappingInfluenceBreakdown Component
 */

import { useMemo } from 'react';
import { PieChart, Settings, Info } from 'lucide-react';
import './MappingInfluenceBreakdown.css';
import { cn } from '../../utils/cn';

// ============================================================
// Types
// ============================================================

export interface MappingInfluenceBreakdownProps {
    /** Number of beats influenced by pitch analysis */
    pitchInfluencedBeats: number;
    /** Number of beats influenced by pattern matching */
    patternInfluencedBeats: number;
    /** Total beats in the chart */
    totalBeats: number;
    /** Pitch influence weight setting (0-1, from Step 1 settings) */
    pitchInfluenceWeight?: number;
    /** Voicing threshold setting (0-1, from Step 1 settings) */
    voicingThreshold?: number;
    /** Size of the chart in pixels (default: 160) */
    size?: number;
    /** Whether to show the settings info section */
    showSettingsInfo?: boolean;
    /** Whether to show compact view */
    compact?: boolean;
    /** Additional CSS class names */
    className?: string;
}

/** Data for a pie slice */
interface PieSlice {
    label: string;
    value: number;
    percent: number;
    color: string;
    pathD: string;
    textX: number;
    textY: number;
}

// ============================================================
// Constants
// ============================================================

/** Colors for pie slices */
const COLORS = {
    pitch: '#22c55e',    // Green for pitch-influenced
    pattern: '#f59e0b',  // Amber for pattern-influenced
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Calculate percentage from count and total.
 */
function calculatePercent(count: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
}

/**
 * Helper functions for SVG path calculations
 */
function x1FromAngle(angle: number, radius: number, centerX: number, _centerY: number): number {
    return centerX + radius * Math.cos(angle - Math.PI / 2);
}

function y1FromAngle(angle: number, radius: number, _centerX: number, centerY: number): number {
    return centerY + radius * Math.sin(angle - Math.PI / 2);
}

// ============================================================
// Sub-components
// ============================================================

interface PieChartSVGProps {
    pitchInfluencedBeats: number;
    patternInfluencedBeats: number;
    totalBeats: number;
    size: number;
}

function PieChartSVG({ pitchInfluencedBeats, patternInfluencedBeats, totalBeats, size }: PieChartSVGProps) {
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size / 2) - 10; // Leave room for labels
    const innerRadius = radius * 0.5; // Donut hole size

    // Calculate slices
    const slices = useMemo((): PieSlice[] => {
        if (totalBeats === 0) {
            return [];
        }

        const pitchPercent = pitchInfluencedBeats / totalBeats;

        const result: PieSlice[] = [];

        // Pitch slice
        if (pitchInfluencedBeats > 0) {
            const startAngle = 0;
            const endAngle = pitchPercent * 2 * Math.PI;

            // Create inner arc for donut
            const innerStart = (startAngle - Math.PI / 2);
            const innerEnd = (endAngle - Math.PI / 2);
            const ix1 = centerX + innerRadius * Math.cos(innerStart);
            const iy1 = centerY + innerRadius * Math.sin(innerStart);
            const ix2 = centerX + innerRadius * Math.cos(innerEnd);
            const iy2 = centerY + innerRadius * Math.sin(innerEnd);
            const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;

            const donutPath = [
                `M ${ix1} ${iy1}`,
                `L ${x1FromAngle(startAngle, radius, centerX, centerY)} ${y1FromAngle(startAngle, radius, centerX, centerY)}`,
                `A ${radius} ${radius} 0 ${largeArc} 1 ${x1FromAngle(endAngle, radius, centerX, centerY)} ${y1FromAngle(endAngle, radius, centerX, centerY)}`,
                `L ${ix2} ${iy2}`,
                `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
                'Z'
            ].join(' ');

            result.push({
                label: 'Pitch',
                value: pitchInfluencedBeats,
                percent: Math.round(pitchPercent * 100),
                color: COLORS.pitch,
                pathD: donutPath,
                textX: centerX,
                textY: centerY,
            });
        }

        // Pattern slice
        if (patternInfluencedBeats > 0) {
            const startAngle = pitchPercent * 2 * Math.PI;
            const endAngle = 2 * Math.PI;

            // Create inner arc for donut
            const innerStart = (startAngle - Math.PI / 2);
            const innerEnd = (endAngle - Math.PI / 2);
            const ix1 = centerX + innerRadius * Math.cos(innerStart);
            const iy1 = centerY + innerRadius * Math.sin(innerStart);
            const ix2 = centerX + innerRadius * Math.cos(innerEnd);
            const iy2 = centerY + innerRadius * Math.sin(innerEnd);
            const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;

            const donutPath = [
                `M ${ix1} ${iy1}`,
                `L ${x1FromAngle(startAngle, radius, centerX, centerY)} ${y1FromAngle(startAngle, radius, centerX, centerY)}`,
                `A ${radius} ${radius} 0 ${largeArc} 1 ${x1FromAngle(endAngle, radius, centerX, centerY)} ${y1FromAngle(endAngle, radius, centerX, centerY)}`,
                `L ${ix2} ${iy2}`,
                `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
                'Z'
            ].join(' ');

            result.push({
                label: 'Pattern',
                value: patternInfluencedBeats,
                percent: Math.round((1 - pitchPercent) * 100),
                color: COLORS.pattern,
                pathD: donutPath,
                textX: centerX,
                textY: centerY,
            });
        }

        return result;
    }, [pitchInfluencedBeats, patternInfluencedBeats, totalBeats, radius, centerX, centerY, innerRadius]);

    // Empty state
    if (totalBeats === 0 || slices.length === 0) {
        return (
            <svg width={size} height={size} className="mapping-pie-chart mapping-pie-chart--empty">
                <circle
                    cx={centerX}
                    cy={centerY}
                    r={radius}
                    fill="none"
                    stroke="var(--border-color, #2a2a4a)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                />
                <text
                    x={centerX}
                    y={centerY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="mapping-pie-empty-text"
                >
                    No data
                </text>
            </svg>
        );
    }

    return (
        <svg width={size} height={size} className="mapping-pie-chart">
            {slices.map((slice, index) => (
                <g key={index} className="mapping-pie-slice">
                    <path
                        d={slice.pathD}
                        fill={slice.color}
                        className="mapping-pie-path"
                        style={{ '--slice-color': slice.color } as React.CSSProperties}
                    >
                        <title>{`${slice.label}: ${slice.value} beats (${slice.percent}%)`}</title>
                    </path>
                </g>
            ))}
            {/* Center label */}
            <text
                x={centerX}
                y={centerY - 8}
                textAnchor="middle"
                dominantBaseline="middle"
                className="mapping-pie-center-value"
            >
                {totalBeats}
            </text>
            <text
                x={centerX}
                y={centerY + 10}
                textAnchor="middle"
                dominantBaseline="middle"
                className="mapping-pie-center-label"
            >
                beats
            </text>
        </svg>
    );
}

interface SettingsInfoProps {
    pitchInfluenceWeight?: number;
    voicingThreshold?: number;
}

function SettingsInfo({ pitchInfluenceWeight, voicingThreshold }: SettingsInfoProps) {
    // Determine the influence mode description
    const getInfluenceModeDescription = (weight: number): string => {
        if (weight >= 0.9) return 'Strong pitch influence - buttons mostly follow melody contour';
        if (weight >= 0.7) return 'High pitch influence - buttons primarily follow melody';
        if (weight >= 0.5) return 'Balanced - pitch and patterns equally weighted';
        if (weight >= 0.3) return 'Pattern-heavy - patterns dominate with some pitch influence';
        if (weight > 0) return 'Minimal pitch influence - buttons mostly from patterns';
        return 'Pattern-only - no pitch analysis used';
    };

    // Determine the threshold description
    const getThresholdDescription = (threshold: number): string => {
        if (threshold >= 0.8) return 'Strict - only very confident pitch detections used';
        if (threshold >= 0.6) return 'High - requires strong pitch confidence';
        if (threshold >= 0.4) return 'Moderate - balanced confidence requirement';
        if (threshold >= 0.2) return 'Low - accepts most pitch detections';
        return 'Permissive - accepts all pitch detections';
    };

    return (
        <div className="mapping-settings-info">
            <div className="mapping-settings-header">
                <Settings size={14} className="mapping-settings-icon" />
                <span className="mapping-settings-title">Settings Used</span>
            </div>

            <div className="mapping-settings-grid">
                {/* Pitch Influence Weight */}
                <div className="mapping-setting-item">
                    <div className="mapping-setting-label">
                        <span>Pitch Influence</span>
                        <span className="mapping-setting-value">
                            {pitchInfluenceWeight !== undefined
                                ? `${Math.round(pitchInfluenceWeight * 100)}%`
                                : 'Not set'}
                        </span>
                    </div>
                    <div className="mapping-setting-bar">
                        <div
                            className="mapping-setting-bar-fill mapping-setting-bar-fill--pitch"
                            style={{ width: `${(pitchInfluenceWeight ?? 0.8) * 100}%` }}
                        />
                    </div>
                    <div className="mapping-setting-description">
                        {pitchInfluenceWeight !== undefined
                            ? getInfluenceModeDescription(pitchInfluenceWeight)
                            : getInfluenceModeDescription(0.8)}
                    </div>
                </div>

                {/* Voicing Threshold */}
                <div className="mapping-setting-item">
                    <div className="mapping-setting-label">
                        <span>Voicing Threshold</span>
                        <span className="mapping-setting-value">
                            {voicingThreshold !== undefined
                                ? `${Math.round(voicingThreshold * 100)}%`
                                : 'Not set'}
                        </span>
                    </div>
                    <div className="mapping-setting-bar">
                        <div
                            className="mapping-setting-bar-fill mapping-setting-bar-fill--threshold"
                            style={{ width: `${(voicingThreshold ?? 0.5) * 100}%` }}
                        />
                    </div>
                    <div className="mapping-setting-description">
                        {voicingThreshold !== undefined
                            ? getThresholdDescription(voicingThreshold)
                            : getThresholdDescription(0.5)}
                    </div>
                </div>
            </div>

            {/* How it works section */}
            <div className="mapping-how-it-works">
                <div className="mapping-how-header">
                    <Info size={12} />
                    <span>How Button Mapping Works</span>
                </div>
                <div className="mapping-how-content">
                    <p>
                        <strong>Pitch Influence</strong> determines how much melody direction
                        affects button assignment. Higher values map ascending pitches to
                        clockwise button movements and descending to counter-clockwise.
                    </p>
                    <p>
                        <strong>Voicing Threshold</strong> sets the minimum confidence level
                        for a pitch detection to be considered "voiced". Higher thresholds
                        exclude uncertain detections.
                    </p>
                    <p>
                        When pitch is unavailable or low confidence, <strong>patterns</strong>
                        {' '}from the button pattern library are used to ensure musical flow.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

export function MappingInfluenceBreakdown({
    pitchInfluencedBeats,
    patternInfluencedBeats,
    totalBeats,
    pitchInfluenceWeight,
    voicingThreshold,
    size = 160,
    showSettingsInfo = true,
    compact = false,
    className,
}: MappingInfluenceBreakdownProps) {
    // Calculate percentages
    const pitchPercent = calculatePercent(pitchInfluencedBeats, totalBeats);
    const patternPercent = calculatePercent(patternInfluencedBeats, totalBeats);

    return (
        <div className={cn(
            'mapping-influence-breakdown',
            compact && 'mapping-influence-breakdown--compact',
            className
        )}>
            {/* Header */}
            <div className="mapping-influence-header">
                <PieChart size={16} className="mapping-influence-icon" />
                <h4 className="mapping-influence-title">Mapping Influence</h4>
            </div>

            {/* Main content */}
            <div className="mapping-influence-content">
                {/* Pie Chart */}
                <div className="mapping-chart-section">
                    <PieChartSVG
                        pitchInfluencedBeats={pitchInfluencedBeats}
                        patternInfluencedBeats={patternInfluencedBeats}
                        totalBeats={totalBeats}
                        size={size}
                    />

                    {/* Legend */}
                    <div className="mapping-chart-legend">
                        <div className="mapping-legend-item mapping-legend-pitch">
                            <span className="mapping-legend-color" />
                            <span className="mapping-legend-label">Pitch</span>
                            <span className="mapping-legend-stats">
                                {pitchInfluencedBeats} ({pitchPercent}%)
                            </span>
                        </div>
                        <div className="mapping-legend-item mapping-legend-pattern">
                            <span className="mapping-legend-color" />
                            <span className="mapping-legend-label">Pattern</span>
                            <span className="mapping-legend-stats">
                                {patternInfluencedBeats} ({patternPercent}%)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Settings Info */}
                {showSettingsInfo && (
                    <SettingsInfo
                        pitchInfluenceWeight={pitchInfluenceWeight}
                        voicingThreshold={voicingThreshold}
                    />
                )}
            </div>
        </div>
    );
}

export default MappingInfluenceBreakdown;
