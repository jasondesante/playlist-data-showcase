/**
 * TransientInspector Component
 *
 * A side panel/inspector component showing detailed information about a selected transient.
 * Displays: timestamp, intensity, band, detection method, nearest beat info.
 *
 * Features:
 * - Color-coded band indicator
 * - Visual intensity bar
 * - Clear button to deselect
 * - Accessible keyboard navigation
 * - Support for showing relative position to playhead
 *
 * Part of Phase 4: Transient Detection Visualization (Task 4.4)
 */

import { X, Zap, Music, Clock, Activity } from 'lucide-react';
import './TransientInspector.css';
import type { TransientResult, Band } from '../../types/rhythmGeneration';

// ============================================================
// Types
// ============================================================

export interface TransientInspectorProps {
    /** The currently selected transient (null if none selected) */
    selectedTransient: TransientResult | null;
    /** Index of the selected transient in the array (optional, for display) */
    selectedIndex?: number | null;
    /** Current audio playback time for relative position display */
    currentTime?: number;
    /** Callback when user clears the selection */
    onClear?: () => void;
    /** Callback when user seeks to the transient timestamp */
    onSeek?: (time: number) => void;
    /** Additional CSS class names */
    className?: string;
}

// ============================================================
// Constants
// ============================================================

/**
 * Band color scheme (as defined in the plan)
 */
const BAND_COLORS: Record<Band, string> = {
    low: '#3b82f6',    // Blue
    mid: '#22c55e',    // Green
    high: '#f97316',   // Orange
};

/**
 * Frequency range labels for each band
 */
const BAND_RANGES: Record<Band, string> = {
    low: '20-500 Hz',
    mid: '500-2000 Hz',
    high: '2000-20000 Hz',
};

/**
 * Detection method display names and descriptions
 */
const DETECTION_METHODS: Record<string, { label: string; description: string }> = {
    energy: {
        label: 'Energy',
        description: 'Based on amplitude envelope changes',
    },
    spectral_flux: {
        label: 'Spectral Flux',
        description: 'Based on spectral change over time',
    },
    hfc: {
        label: 'HFC',
        description: 'High Frequency Content analysis',
    },
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Format time in seconds to MM:SS.ms display format
 */
function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return '--:--.--';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

/**
 * Format time offset (relative to current time)
 */
function formatOffset(offset: number): string {
    const sign = offset >= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const secs = Math.floor(absOffset);
    const ms = Math.floor((absOffset % 1) * 1000);
    return `${sign}${secs}.${ms.toString().padStart(3, '0')}s`;
}

/**
 * Get intensity level label
 */
function getIntensityLevel(intensity: number): { label: string; className: string } {
    if (intensity >= 0.8) return { label: 'Very High', className: 'intensity--very-high' };
    if (intensity >= 0.6) return { label: 'High', className: 'intensity--high' };
    if (intensity >= 0.4) return { label: 'Medium', className: 'intensity--medium' };
    if (intensity >= 0.2) return { label: 'Low', className: 'intensity--low' };
    return { label: 'Very Low', className: 'intensity--very-low' };
}

// ============================================================
// Sub-components
// ============================================================

interface InspectorRowProps {
    label: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
}

function InspectorRow({ label, value, icon, className = '' }: InspectorRowProps) {
    return (
        <div className={`transient-inspector-row ${className}`}>
            <div className="transient-inspector-row-label">
                {icon && <span className="transient-inspector-row-icon">{icon}</span>}
                <span>{label}</span>
            </div>
            <div className="transient-inspector-row-value">{value}</div>
        </div>
    );
}

interface IntensityBarProps {
    intensity: number;
}

function IntensityBar({ intensity }: IntensityBarProps) {
    const intensityLevel = getIntensityLevel(intensity);
    const percentage = Math.round(intensity * 100);

    return (
        <div className={`transient-inspector-intensity ${intensityLevel.className}`}>
            <div className="transient-inspector-intensity-header">
                <span className="transient-inspector-intensity-label">Intensity</span>
                <span className="transient-inspector-intensity-value">{percentage}%</span>
            </div>
            <div className="transient-inspector-intensity-bar-container">
                <div
                    className="transient-inspector-intensity-bar"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="transient-inspector-intensity-level">
                {intensityLevel.label}
            </div>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

/**
 * TransientInspector
 *
 * Displays detailed information about a selected transient.
 * Shows a placeholder message when no transient is selected.
 */
export function TransientInspector({
    selectedTransient,
    selectedIndex,
    currentTime = 0,
    onClear,
    onSeek,
    className,
}: TransientInspectorProps) {
    // No transient selected - show placeholder
    if (!selectedTransient) {
        return (
            <div className={`transient-inspector transient-inspector--empty ${className || ''}`}>
                <div className="transient-inspector-empty-content">
                    <div className="transient-inspector-empty-icon">
                        <Zap size={24} />
                    </div>
                    <div className="transient-inspector-empty-title">
                        No Transient Selected
                    </div>
                    <p className="transient-inspector-empty-description">
                        Click on a transient marker in the timeline to see detailed information
                    </p>
                </div>
            </div>
        );
    }

    // Get transient data
    const { timestamp, intensity, band, detectionMethod, nearestBeat } = selectedTransient;
    const bandColor = BAND_COLORS[band];
    const bandRange = BAND_RANGES[band];
    const methodInfo = DETECTION_METHODS[detectionMethod] || {
        label: detectionMethod,
        description: 'Unknown detection method',
    };

    // Calculate relative position to current time
    const timeOffset = timestamp - currentTime;
    const isPast = timeOffset < -0.05;
    const isFuture = timeOffset > 0.05;

    return (
        <div
            className={`transient-inspector ${className || ''}`}
            style={{ '--band-color': bandColor } as React.CSSProperties}
        >
            {/* Header */}
            <div className="transient-inspector-header">
                <div className="transient-inspector-header-left">
                    <div
                        className="transient-inspector-band-indicator"
                        style={{ backgroundColor: bandColor }}
                    />
                    <div className="transient-inspector-title">
                        <span className="transient-inspector-title-text">
                            {band.charAt(0).toUpperCase() + band.slice(1)} Transient
                        </span>
                        {selectedIndex !== null && selectedIndex !== undefined && (
                            <span className="transient-inspector-index">
                                #{selectedIndex + 1}
                            </span>
                        )}
                    </div>
                </div>
                {onClear && (
                    <button
                        className="transient-inspector-clear-btn"
                        onClick={onClear}
                        aria-label="Clear selection"
                        title="Clear selection"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Intensity Bar */}
            <IntensityBar intensity={intensity} />

            {/* Details */}
            <div className="transient-inspector-details">
                {/* Timestamp */}
                <InspectorRow
                    label="Timestamp"
                    icon={<Clock size={14} />}
                    value={
                        <div className="transient-inspector-timestamp-group">
                            <span className="transient-inspector-timestamp">
                                {formatTime(timestamp)}
                            </span>
                            {currentTime > 0 && (
                                <span className={`transient-inspector-offset ${
                                    isPast ? 'offset--past' : isFuture ? 'offset--future' : 'offset--now'
                                }`}>
                                    {isPast ? '◀ ' : isFuture ? '▶ ' : ''}
                                    {formatOffset(timeOffset)}
                                </span>
                            )}
                        </div>
                    }
                />

                {/* Band Info */}
                <InspectorRow
                    label="Frequency Band"
                    icon={<Activity size={14} />}
                    value={
                        <div className="transient-inspector-band-group">
                            <span
                                className="transient-inspector-band-badge"
                                style={{ backgroundColor: bandColor }}
                            >
                                {band.toUpperCase()}
                            </span>
                            <span className="transient-inspector-band-range">
                                {bandRange}
                            </span>
                        </div>
                    }
                />

                {/* Detection Method */}
                <InspectorRow
                    label="Detection Method"
                    icon={<Zap size={14} />}
                    value={
                        <div className="transient-inspector-method-group">
                            <span className="transient-inspector-method-badge">
                                {methodInfo.label}
                            </span>
                            <span className="transient-inspector-method-desc">
                                {methodInfo.description}
                            </span>
                        </div>
                    }
                />

                {/* Nearest Beat */}
                {nearestBeat && (
                    <InspectorRow
                        label="Nearest Beat"
                        icon={<Music size={14} />}
                        value={
                            <div className="transient-inspector-beat-group">
                                <span className="transient-inspector-beat-index">
                                    Beat #{nearestBeat.index + 1}
                                </span>
                                <span className="transient-inspector-beat-distance">
                                    {(nearestBeat.distance * 1000).toFixed(1)}ms away
                                </span>
                            </div>
                        }
                    />
                )}
            </div>

            {/* Actions */}
            {onSeek && (
                <div className="transient-inspector-actions">
                    <button
                        className="transient-inspector-seek-btn"
                        onClick={() => onSeek(timestamp)}
                        aria-label={`Seek to ${formatTime(timestamp)}`}
                    >
                        <Clock size={14} />
                        <span>Seek to Transient</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default TransientInspector;
