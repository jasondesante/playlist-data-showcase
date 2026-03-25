/**
 * MultiBandPitchVisualization Component
 *
 * Displays three stacked timelines (Low/Mid/High) for pitch detection results.
 * Features:
 * - Three stacked timelines (Low/Mid/High) - similar to rhythm multi-band
 * - Each shows pitches for that band only
 * - Probability shown as opacity
 * - Voiced/unvoiced status visible
 * - Vertical time alignment
 * - Highlight dominant band with border/glow effect
 * - Sync with audio playback
 *
 * Task 4.1: MultiBandPitchVisualization Component
 * Task 4.2: Uses extracted BandPitchTimeline component
 */

import { useState, useMemo } from 'react';
import { Layers, Star } from 'lucide-react';
import './MultiBandPitchVisualization.css';
import { ZoomControls } from './ZoomControls';
import {
    BandPitchTimeline,
    BAND_COLORS,
    BAND_RANGES,
    type Band
} from './BandPitchTimeline';
import type { PitchAtBeat, BandPitchAtBeat } from '../../types/levelGeneration';
import { useTrackDuration } from '../../hooks/useTrackDuration';
import { cn } from '../../utils/cn';

// ============================================================
// Types
// ============================================================

export interface MultiBandPitchVisualizationProps {
    /** Band pitch data from the pitch analysis */
    bandPitches: Map<string, BandPitchAtBeat> | Record<string, BandPitchAtBeat> | null;
    /** The dominant band (highlighted) */
    dominantBand?: 'low' | 'mid' | 'high' | null;
    /** Current audio playback time in seconds (optional - uses store if not provided) */
    currentTime?: number;
    /** Total audio duration in seconds (optional - uses store if not provided) */
    duration?: number;
    /** Whether audio is currently playing (optional - uses store if not provided) */
    isPlaying?: boolean;
    /** Callback when user clicks on a pitch */
    onPitchClick?: (pitch: PitchAtBeat) => void;
    /** Callback when user seeks to a time position */
    onSeek?: (time: number) => void;
    /** Anticipation window in seconds for future pitches */
    anticipationWindow?: number;
    /** Past window in seconds for showing pitches that have passed */
    pastWindow?: number;
    /** The index of the currently selected pitch (for visual highlight) */
    selectedPitchIndex?: number;
    /** Additional CSS class names */
    className?: string;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Convert bandPitches from potential object to Map
 */
function normalizeBandPitches(
    bandPitches: Map<string, BandPitchAtBeat> | Record<string, BandPitchAtBeat> | null
): Map<Band, BandPitchAtBeat> {
    const map = new Map<Band, BandPitchAtBeat>();

    if (!bandPitches) return map;

    if (bandPitches instanceof Map) {
        bandPitches.forEach((value, key) => {
            map.set(key as Band, value);
        });
    } else {
        Object.entries(bandPitches).forEach(([key, value]) => {
            map.set(key as Band, value);
        });
    }

    return map;
}

// ============================================================
// Main Component
// ============================================================

/**
 * MultiBandPitchVisualization
 *
 * Displays three stacked timelines for pitch detection by frequency band.
 * Uses the extracted BandPitchTimeline component for each band.
 */
export function MultiBandPitchVisualization({
    bandPitches: bandPitchesProp,
    dominantBand,
    currentTime,
    duration: propDuration,
    isPlaying,
    onPitchClick,
    onSeek,
    anticipationWindow: propAnticipationWindow,
    pastWindow: propPastWindow,
    selectedPitchIndex,
    className,
}: MultiBandPitchVisualizationProps) {
    // Normalize band pitches to Map
    const bandPitchesMap = useMemo(
        () => normalizeBandPitches(bandPitchesProp),
        [bandPitchesProp]
    );

    // Get duration from store if not provided
    const storeDuration = useTrackDuration();
    const duration = propDuration ?? storeDuration ?? 0;

    // Zoom state
    const [zoomLevel, setZoomLevel] = useState(1);
    const baseAnticipationWindow = 2.0;
    const basePastWindow = 4.0;
    const anticipationWindow = propAnticipationWindow ?? baseAnticipationWindow / zoomLevel;
    const pastWindow = propPastWindow ?? basePastWindow / zoomLevel;

    // Get bands in order
    const bands: Band[] = ['low', 'mid', 'high'];

    // Calculate total pitches per band for summary
    const bandCounts = useMemo(() => {
        return {
            low: bandPitchesMap.get('low')?.pitches.length ?? 0,
            mid: bandPitchesMap.get('mid')?.pitches.length ?? 0,
            high: bandPitchesMap.get('high')?.pitches.length ?? 0,
        };
    }, [bandPitchesMap]);

    const totalPitches = bandCounts.low + bandCounts.mid + bandCounts.high;
    const totalVoiced = useMemo(() => {
        let count = 0;
        bandPitchesMap.forEach((bandData) => {
            count += bandData.voicedBeatCount;
        });
        return count;
    }, [bandPitchesMap]);

    // Empty state
    if (totalPitches === 0) {
        return (
            <div className={cn('multi-pitch-visualization', 'multi-pitch-visualization--empty', className)}>
                <div className="multi-pitch-header">
                    <div className="multi-pitch-title">
                        <Layers size={18} />
                        <span>Multi-Band Pitch Analysis</span>
                    </div>
                </div>
                <div className="multi-pitch-empty-content">
                    <p>No pitch data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('multi-pitch-visualization', className)}>
            {/* Header */}
            <div className="multi-pitch-header">
                <div className="multi-pitch-title">
                    <Layers size={18} />
                    <span>Multi-Band Pitch Analysis</span>
                </div>
                <div className="multi-pitch-summary">
                    <span className="multi-pitch-summary-voiced">{totalVoiced}</span>
                    <span className="multi-pitch-summary-divider">/</span>
                    <span className="multi-pitch-summary-total">{totalPitches}</span>
                    <span className="multi-pitch-summary-label">voiced beats</span>
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

            {/* Stacked timelines - using extracted BandPitchTimeline component */}
            <div className="multi-pitch-timelines">
                {bands.map((band) => {
                    const bandData = bandPitchesMap.get(band);
                    return (
                        <BandPitchTimeline
                            key={band}
                            band={band}
                            pitches={bandData?.pitches ?? []}
                            currentTime={currentTime}
                            isPlaying={isPlaying}
                            duration={duration}
                            isDominant={dominantBand === band}
                            onPitchClick={onPitchClick}
                            onSeek={onSeek}
                            anticipationWindow={anticipationWindow}
                            pastWindow={pastWindow}
                            selectedPitchIndex={selectedPitchIndex}
                            className="multi-pitch-timeline-wrapper"
                        />
                    );
                })}
            </div>

            {/* Legend */}
            <div className="multi-pitch-legend">
                {bands.map((band) => {
                    const isDominant = dominantBand === band;
                    return (
                        <div
                            key={band}
                            className={cn(
                                'multi-pitch-legend-item',
                                isDominant && 'multi-pitch-legend-item--dominant'
                            )}
                        >
                            <div
                                className="multi-pitch-legend-marker"
                                style={{ backgroundColor: BAND_COLORS[band] }}
                            />
                            <span className="multi-pitch-legend-label">
                                {band.charAt(0).toUpperCase() + band.slice(1)} ({BAND_RANGES[band]})
                            </span>
                            {isDominant && (
                                <span className="multi-pitch-legend-dominant">
                                    <Star size={10} />
                                </span>
                            )}
                            <span className="multi-pitch-legend-count">
                                {bandCounts[band]}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default MultiBandPitchVisualization;
