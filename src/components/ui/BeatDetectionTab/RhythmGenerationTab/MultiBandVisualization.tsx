/**
 * MultiBandVisualization Component
 *
 * Displays three stacked timelines for Low/Mid/High frequency bands.
 * Features:
 * - Three stacked timelines (Low/Mid/High)
 * - Band label with frequency range
 * - Detection method indicator
 * - Transients for each band only
 * - Vertical alignment so transients line up by time
 * - Sync with audio playback
 *
 * Part of Phase 5: Multi-Band Visualization (Task 5.1)
 */

import { useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import './MultiBandVisualization.css';
import { ZoomControls } from '../../ZoomControls';
import type { GeneratedRhythm, TransientResult, Band } from '../../../../types/rhythmGeneration';

// ============================================================
// Types
// ============================================================

export interface MultiBandVisualizationProps {
    /** The generated rhythm containing transient analysis */
    rhythm: GeneratedRhythm;
    /** Current audio playback time in seconds */
    currentTime?: number;
    /** Total audio duration in seconds */
    duration?: number;
    /** Whether audio is currently playing */
    isPlaying?: boolean;
    /** Callback when user clicks on a transient */
    onTransientClick?: (transient: TransientResult, index: number) => void;
    /** Callback when user seeks to a time position */
    onSeek?: (time: number) => void;
    /** Intensity threshold filter (0-1) */
    intensityThreshold?: number;
    /** Anticipation window in seconds for future transients */
    anticipationWindow?: number;
    /** Past window in seconds for showing transients that have passed */
    pastWindow?: number;
    /** Additional CSS class names */
    className?: string;
}

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
 * Detection method display names
 */
const DETECTION_METHOD_LABELS: Record<string, string> = {
    energy: 'Energy',
    spectral_flux: 'Spectral Flux',
    hfc: 'HFC',
};

// ============================================================
// Sub-components
// ============================================================

/**
 * Single band timeline component
 */
interface BandTimelineProps {
    band: Band;
    transients: TransientResult[];
    color: string;
    frequencyRange: string;
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    onSeek?: (time: number) => void;
    onTransientClick?: (transient: TransientResult, index: number) => void;
    intensityThreshold: number;
    anticipationWindow: number;
    pastWindow: number;
}

function BandTimeline({
    band,
    transients,
    color,
    frequencyRange,
    currentTime,
    duration,
    isPlaying: _isPlaying,
    onSeek,
    onTransientClick,
    intensityThreshold,
    anticipationWindow,
    pastWindow,
}: BandTimelineProps) {
    // Filter transients by intensity
    const filteredTransients = useMemo(() => {
        return transients.filter((t) => t.intensity >= intensityThreshold);
    }, [transients, intensityThreshold]);

    // Calculate statistics
    const stats = useMemo(() => {
        const count = filteredTransients.length;
        const avgIntensity = count > 0
            ? filteredTransients.reduce((sum, t) => sum + t.intensity, 0) / count
            : 0;

        // Get detection method breakdown
        const methodCounts = filteredTransients.reduce((acc, t) => {
            acc[t.detectionMethod] = (acc[t.detectionMethod] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const primaryMethod = Object.entries(methodCounts)
            .sort((a, b) => b[1] - a[1])[0];

        return { count, avgIntensity, primaryMethod };
    }, [filteredTransients]);

    // Calculate time window for visible transients
    const minTime = currentTime - pastWindow;
    const maxTime = currentTime + anticipationWindow;

    // Calculate position for a transient
    const calculatePosition = (timestamp: number): number => {
        const timeUntilTransient = timestamp - currentTime;
        const position = 0.5 + (timeUntilTransient / anticipationWindow) * 0.5;
        return position;
    };

    // Get visible transients
    const visibleTransients = useMemo(() => {
        return filteredTransients
            .map((transient, index) => ({
                transient,
                index,
                position: calculatePosition(transient.timestamp),
                isPast: transient.timestamp < currentTime - 0.05,
            }))
            .filter((item) => {
                const timeMatch = item.transient.timestamp >= minTime && item.transient.timestamp <= maxTime;
                const positionMatch = item.position >= 0 && item.position <= 1;
                return timeMatch && positionMatch;
            });
    }, [filteredTransients, currentTime, minTime, maxTime]);

    // Handle click on transient
    const handleTransientClick = (transient: TransientResult, index: number, event: React.MouseEvent) => {
        event.stopPropagation();
        if (onTransientClick) {
            onTransientClick(transient, index);
        }
    };

    // Handle seek on track click
    const handleTrackClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!onSeek || duration === 0) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const position = clickX / rect.width;

        // Calculate time based on position relative to current time center
        const timeDelta = (position - 0.5) * anticipationWindow * 2;
        const newTime = Math.max(0, Math.min(duration, currentTime + timeDelta));
        onSeek(newTime);
    };

    return (
        <div className="multi-band-timeline" data-band={band}>
            {/* Band header */}
            <div className="multi-band-timeline-header">
                <div className="multi-band-timeline-label" style={{ color }}>
                    {band.charAt(0).toUpperCase() + band.slice(1)}
                </div>
                <div className="multi-band-timeline-range">{frequencyRange}</div>
                <div className="multi-band-timeline-stats">
                    <span className="multi-band-timeline-count">{stats.count}</span>
                    <span className="multi-band-timeline-divider">|</span>
                    <span className="multi-band-timeline-method">
                        {stats.primaryMethod ? DETECTION_METHOD_LABELS[stats.primaryMethod[0]] : '-'}
                    </span>
                </div>
            </div>

            {/* Timeline track */}
            <div
                className="multi-band-timeline-track"
                onClick={handleTrackClick}
                role="button"
                tabIndex={0}
                aria-label={`${band} band timeline`}
            >
                {/* Background */}
                <div className="multi-band-timeline-background" style={{
                    background: `linear-gradient(90deg,
                        hsl(var(--surface-3)) 0%,
                        hsl(var(--surface-2)) 30%,
                        hsl(var(--surface-2)) 70%,
                        hsl(var(--surface-3)) 100%
                    )`
                }} />

                {/* Band color accent line */}
                <div className="multi-band-timeline-accent" style={{ backgroundColor: color }} />

                {/* Transient markers */}
                {visibleTransients.map(({ transient, index, position, isPast }) => (
                    <div
                        key={`transient-${transient.timestamp.toFixed(3)}-${index}`}
                        className={`multi-band-marker ${isPast ? 'multi-band-marker--past' : ''}`}
                        style={{
                            left: `${position * 100}%`,
                        }}
                        onClick={(e) => handleTransientClick(transient, index, e)}
                        title={`${transient.timestamp.toFixed(3)}s | ${(transient.intensity * 100).toFixed(0)}%`}
                    >
                        <div
                            className="multi-band-marker-dot"
                            style={{
                                width: `${6 + transient.intensity * 10}px`,
                                height: `${6 + transient.intensity * 10}px`,
                                backgroundColor: color,
                            }}
                        />
                    </div>
                ))}

                {/* Now line (playhead) */}
                <div className="multi-band-now-line">
                    <div className="multi-band-now-line-inner" style={{ backgroundColor: color }} />
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

/**
 * MultiBandVisualization
 *
 * Displays three stacked timelines for frequency band analysis.
 * Each timeline shows transients for that band only, vertically aligned.
 */
export function MultiBandVisualization({
    rhythm,
    currentTime = 0,
    duration: propDuration,
    isPlaying = false,
    onTransientClick,
    onSeek,
    intensityThreshold = 0,
    anticipationWindow: propAnticipationWindow,
    pastWindow: propPastWindow,
    className,
}: MultiBandVisualizationProps) {
    // Get transient analysis from the rhythm
    const transientAnalysis = rhythm.analysis.transientAnalysis;
    const allTransients = transientAnalysis.transients;

    // Get duration from metadata or estimate from last transient
    const duration = propDuration ?? rhythm.metadata.duration > 0
        ? rhythm.metadata.duration
        : Math.max(...allTransients.map(t => t.timestamp), 0) + 1;

    // Zoom state - controls the visible time window
    const [zoomLevel, setZoomLevel] = useState(1);
    // Base windows at zoom level 1
    const baseAnticipationWindow = 2.0;
    const basePastWindow = 4.0;
    // Calculate windows based on zoom (higher zoom = smaller windows = more detail)
    // Use prop overrides if provided, otherwise use zoom-based calculation
    const anticipationWindow = propAnticipationWindow ?? baseAnticipationWindow / zoomLevel;
    const pastWindow = propPastWindow ?? basePastWindow / zoomLevel;

    // Group transients by band
    const transientsByBand = useMemo(() => {
        const groups: Record<Band, TransientResult[]> = {
            low: [],
            mid: [],
            high: [],
        };
        allTransients.forEach((t) => {
            groups[t.band].push(t);
        });
        return groups;
    }, [allTransients]);

    // Get bands in order (high to low for visual stacking)
    const bands: Band[] = ['low', 'mid', 'high'];

    // Calculate total transients per band for summary
    const bandCounts = useMemo(() => {
        return {
            low: transientsByBand.low.length,
            mid: transientsByBand.mid.length,
            high: transientsByBand.high.length,
        };
    }, [transientsByBand]);

    const totalTransients = bandCounts.low + bandCounts.mid + bandCounts.high;

    return (
        <div className={`multi-band-visualization ${className || ''}`}>
            {/* Header */}
            <div className="multi-band-header">
                <div className="multi-band-title">
                    <Layers size={18} />
                    <span>Multi-Band Analysis</span>
                </div>
                <div className="multi-band-summary">
                    <span className="multi-band-summary-total">{totalTransients}</span>
                    <span className="multi-band-summary-label">total transients</span>
                </div>
                {/* Zoom controls */}
                <ZoomControls
                    zoomLevel={zoomLevel}
                    onZoomChange={setZoomLevel}
                    minZoom={0.5}
                    maxZoom={4}
                    size="sm"
                />
            </div>

            {/* Stacked timelines */}
            <div className="multi-band-timelines">
                {bands.map((band) => (
                    <BandTimeline
                        key={band}
                        band={band}
                        transients={transientsByBand[band]}
                        color={BAND_COLORS[band]}
                        frequencyRange={BAND_RANGES[band]}
                        currentTime={currentTime}
                        duration={duration}
                        isPlaying={isPlaying}
                        onSeek={onSeek}
                        onTransientClick={onTransientClick}
                        intensityThreshold={intensityThreshold}
                        anticipationWindow={anticipationWindow}
                        pastWindow={pastWindow}
                    />
                ))}
            </div>

            {/* Legend */}
            <div className="multi-band-legend">
                {bands.map((band) => (
                    <div key={band} className="multi-band-legend-item">
                        <div
                            className="multi-band-legend-marker"
                            style={{ backgroundColor: BAND_COLORS[band] }}
                        />
                        <span className="multi-band-legend-label">
                            {band.charAt(0).toUpperCase() + band.slice(1)} ({BAND_RANGES[band]})
                        </span>
                        <span className="multi-band-legend-count">
                            {bandCounts[band]}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default MultiBandVisualization;
