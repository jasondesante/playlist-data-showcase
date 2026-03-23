/**
 * CompositeStreamPanel Component
 *
 * Container for composite stream visualization in the rhythm generation feature.
 * Displays:
 * - Header with composite beat count
* - Summary statistics (beats per band, sections per band)
* - 3 Stacked band stream timelines (quantized beats)
* - Composite timeline with section boundaries and color-coded by sourceBand
* - Quick scroll bar for navigation
* - Zoom controls
*
 * Part of Phase 1: CompositeStreamPanel (Task 1.1)
 */

import { useMemo, useState } from 'react';
import { Combine, PieChart, Layers } from 'lucide-react';
import './CompositeStreamPanel.css';
import { ZoomControls } from '../../ZoomControls';
import type {
    GeneratedRhythm,
    Band,
    HighlightedRegion,
} from '../../../../types/rhythmGeneration';

// ============================================================
// Types
// ============================================================

export interface CompositeStreamPanelProps {
    /** The generated rhythm containing composite stream data */
    rhythm: GeneratedRhythm;
    /** Current audio playback time in seconds (for timeline sync) */
    currentTime?: number;
    /** Total audio duration in seconds */
    duration?: number;
    /** Whether audio is currently playing */
    isPlaying?: boolean;
    /** Callback when user seeks to a time position */
    onSeek?: (time: number) => void;
    /** Highlighted regions to show on timelines (for phrase occurrences) */
    highlightedRegions?: HighlightedRegion[];
    /** Additional CSS class names */
    className?: string;
}

/**
 * Band color scheme (consistent across components)
 */
const BAND_COLORS: Record<Band, string> = {
    low: '#3b82f6',    // Blue
    mid: '#22c55e',    // Green
    high: '#f97316',   // Orange
};

/** Band list for iteration */
const BANDS: Band[] = ['low', 'mid', 'high'];

// ============================================================
// Sub-components
// ============================================================

/**
 * Summary stat card component
 */
interface StatCardProps {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    color?: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
    return (
        <div className="composite-stat-card">
            {icon && <div className="composite-stat-icon">{icon}</div>}
            <div className="composite-stat-content">
                <span className="composite-stat-label">{label}</span>
                <span className="composite-stat-value" style={{ color }}>{value}</span>
            </div>
        </div>
    );
}

/**
 * Band beats distribution bar component
 */
interface BandDistributionBarProps {
    low: number;
    mid: number;
    high: number;
}

function BandDistributionBar({ low, mid, high }: BandDistributionBarProps) {
    const total = low + mid + high;
    const percentages = {
        low: total > 0 ? (low / total) * 100 : 0,
        mid: total > 0 ? (mid / total) * 100 : 0,
        high: total > 0 ? (high / total) * 100 : 0,
    };

    return (
        <div className="composite-distribution-bar">
            <div className="composite-distribution-bar-track">
                <div
                    className="composite-distribution-segment composite-distribution-segment--low"
                    style={{ width: `${percentages.low}%` }}
                    title={`Low: ${low} (${percentages.low.toFixed(1)}%)`}
                />
                <div
                    className="composite-distribution-segment composite-distribution-segment--mid"
                    style={{ width: `${percentages.mid}%` }}
                    title={`Mid: ${mid} (${percentages.mid.toFixed(1)}%)`}
                />
                <div
                    className="composite-distribution-segment composite-distribution-segment--high"
                    style={{ width: `${percentages.high}%` }}
                    title={`High: ${high} (${percentages.high.toFixed(1)}%)`}
                />
            </div>
            <div className="composite-distribution-legend">
                {BANDS.map((band, index) => (
                    <div key={band} className="composite-distribution-legend-item">
                        <span
                            className="composite-distribution-marker"
                            style={{ backgroundColor: BAND_COLORS[band] }}
                        />
                        <span className="composite-distribution-label">
                            {band.charAt(0).toUpperCase() + band.slice(1)}
                        </span>
                        <span className="composite-distribution-count">
                            {[low, mid, high][index]}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

/**
 * CompositeStreamPanel
 *
 * Main container for composite stream visualization.
 * Displays summary statistics and stacked timelines.
 */
export function CompositeStreamPanel({
    rhythm,
    currentTime: _currentTime = 0,
    duration: _duration,
    isPlaying: _isPlaying = false,
    onSeek: _onSeek,
    highlightedRegions: _highlightedRegions = [],
    className,
}: CompositeStreamPanelProps) {
    // Get composite data from the rhythm
    const composite = rhythm.composite;
    const bandStreams = rhythm.bandStreams;

    // Zoom state
    const [zoomLevel, setZoomLevel] = useState(1);

    // Calculate overall statistics
    const stats = useMemo(() => {
        const beatsPerBand = composite.metadata.beatsPerBand;
        const sectionsPerBand = composite.metadata.sectionsPerBand;
        const totalSections = composite.sections.length;

        return {
            totalBeats: composite.beats.length,
            totalSections,
            beatsPerBand,
            sectionsPerBand,
        };
    }, [composite]);

    // Get bands in order
    const bands: Band[] = ['low', 'mid', 'high'];

    return (
        <div className={`composite-stream-panel ${className || ''}`}>
            {/* Header with total count */}
            <div className="composite-header">
                <div className="composite-title">
                    <Combine size={18} />
                    <span>Composite Stream Generation</span>
                </div>
                <div className="composite-count">
                    <span className="composite-count-value">{stats.totalBeats}</span>
                    <span className="composite-count-label">composite beats</span>
                </div>
            </div>

            {/* Summary statistics */}
            <div className="composite-summary">
                <StatCard
                    label="Total Beats"
                    value={stats.totalBeats}
                    icon={<Combine size={16} />}
                    color="var(--text-primary)"
                />
                <StatCard
                    label="Total Sections"
                    value={stats.totalSections}
                    icon={<Layers size={16} />}
                />
                <StatCard
                    label="Beats per Band"
                    value={`${stats.beatsPerBand.low} / ${stats.beatsPerBand.mid} / ${stats.beatsPerBand.high}`}
                    icon={<PieChart size={16} />}
                />
            </div>

            {/* Beats per band distribution bar */}
            <div className="composite-distribution-section">
                <h4 className="composite-section-title">Beats Distribution by Band</h4>
                <BandDistributionBar
                    low={stats.beatsPerBand.low}
                    mid={stats.beatsPerBand.mid}
                    high={stats.beatsPerBand.high}
                />
            </div>

            {/* Sections per band distribution bar */}
            <div className="composite-distribution-section">
                <h4 className="composite-section-title">Sections Distribution by Band</h4>
                <BandDistributionBar
                    low={stats.sectionsPerBand.low}
                    mid={stats.sectionsPerBand.mid}
                    high={stats.sectionsPerBand.high}
                />
            </div>

            {/* Placeholder for timelines (Tasks 1.2 and 1.3) */}
            <div className="composite-timelines-section">
                <div className="composite-timelines-header">
                    <h4 className="composite-section-title">Band Stream Timelines</h4>
                    <div className="composite-timelines-controls">
                        <ZoomControls
                            zoomLevel={zoomLevel}
                            onZoomChange={setZoomLevel}
                            minZoom={0.5}
                            maxZoom={4}
                            size="sm"
                        />
                    </div>
                </div>

                {/* TODO: BandStreamTimeline inline components (Task 1.2) */}
                <div className="composite-band-timelines">
                    {bands.map((band) => (
                        <div key={band} className="composite-band-timeline-placeholder">
                            <div className="composite-band-timeline-header">
                                <span
                                    className="composite-band-timeline-label"
                                    style={{ color: BAND_COLORS[band] }}
                                >
                                    {band.charAt(0).toUpperCase() + band.slice(1)} Band
                                </span>
                                <span className="composite-band-timeline-count">
                                    {bandStreams[band].beats.length} beats
                                </span>
                            </div>
                            <div className="composite-band-timeline-track">
                                <div className="composite-band-timeline-track-background" />
                                <div
                                    className="composite-band-timeline-track-accent"
                                    style={{ backgroundColor: BAND_COLORS[band] }}
                                />
                                {/* Playhead line */}
                                <div className="composite-band-timeline-now-line">
                                    <div
                                        className="composite-band-timeline-now-line-inner"
                                        style={{ backgroundColor: BAND_COLORS[band] }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* TODO: CompositeTimeline inline component (Task 1.3) */}
                <div className="composite-timeline-section">
                    <h4 className="composite-section-title">Composite Timeline</h4>
                    <div className="composite-timeline-track">
                        <div className="composite-timeline-track-background" />
                        {/* Playhead line */}
                        <div className="composite-timeline-now-line">
                            <div className="composite-timeline-now-line-inner" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="composite-legend">
                {bands.map((band) => (
                    <div key={band} className="composite-legend-item">
                        <div
                            className="composite-legend-marker"
                            style={{ backgroundColor: BAND_COLORS[band] }}
                        />
                        <span className="composite-legend-label">
                            {band.charAt(0).toUpperCase() + band.slice(1)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

