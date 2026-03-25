/**
 * GuitarHeroModeVisualization Component
 *
 * A fretboard-style visualization for Guitar Hero button mapping (Secondary View).
 * Features:
 * - 5 horizontal lanes (frets 1-5)
 * - Beats appear as notes moving from right to left
 * - Pitch range indicators per fret
 * - Current beat highlight synced with audio playback
 * - Collapsible/expandable view
 *
 * Task 6.4: Create GuitarHeroModeVisualization Component (Secondary View)
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronUp, Guitar, Music } from 'lucide-react';
import './GuitarHeroModeVisualization.css';
import { cn } from '../../utils/cn';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useTrackDuration } from '../../hooks/useTrackDuration';

// ============================================================
// Types
// ============================================================

export interface GuitarHeroVisualizationBeat {
    /** Beat timestamp in seconds */
    timestamp: number;
    /** Beat index in the chart */
    beatIndex: number;
    /** Assigned Guitar Hero fret (1-5) */
    key: '1' | '2' | '3' | '4' | '5';
    /** Pitch direction at this beat */
    direction?: 'up' | 'down' | 'stable' | 'none';
    /** Whether this beat's key was influenced by pitch */
    isPitchInfluenced?: boolean;
    /** MIDI note number for pitch display */
    midiNote?: number | null;
}

export interface GuitarHeroModeVisualizationProps {
    /** Array of beats with Guitar Hero fret assignments */
    beats: GuitarHeroVisualizationBeat[];
    /** Callback when a beat is clicked */
    onBeatClick?: (beat: GuitarHeroVisualizationBeat) => void;
    /** The index of the currently selected beat */
    selectedBeatIndex?: number;
    /** Whether the visualization is disabled */
    disabled?: boolean;
    /** Time window in seconds to show beats */
    timeWindow?: number;
    /** Height of the visualization in pixels */
    height?: number;
    /** Whether the panel starts collapsed */
    defaultCollapsed?: boolean;
    /** Additional CSS class names */
    className?: string;
}

/** Guitar Hero fret configuration */
interface FretConfig {
    key: '1' | '2' | '3' | '4' | '5';
    color: string;
    label: string;
    pitchRange: string;
}

/** Internal representation of a visible beat */
interface VisibleBeat {
    beat: GuitarHeroVisualizationBeat;
    lane: number; // 0-4, where 0 is bottom (fret 1)
    horizontalPosition: number; // 0-1, where 0 is past, 1 is future
    isPast: boolean;
    isCurrent: boolean;
    isNext: boolean;
}

// ============================================================
// Constants
// ============================================================

/** Guitar Hero fret configuration with colors and pitch ranges */
const GUITAR_HERO_FRETS: FretConfig[] = [
    { key: '1', color: '#ef4444', label: 'Fret 1', pitchRange: 'Low (E2-A3)' },
    { key: '2', color: '#f97316', label: 'Fret 2', pitchRange: 'Mid-Low (A3-D4)' },
    { key: '3', color: '#eab308', label: 'Fret 3', pitchRange: 'Mid (D4-G4)' },
    { key: '4', color: '#22c55e', label: 'Fret 4', pitchRange: 'Mid-High (G4-C5)' },
    { key: '5', color: '#3b82f6', label: 'Fret 5', pitchRange: 'High (C5+)' },
];

/** Map fret key to config */
const FRETS_MAP = new Map(GUITAR_HERO_FRETS.map((fret) => [fret.key, fret]));

// ============================================================
// Helper Functions
// ============================================================

/**
 * Format time in MM:SS format
 */
function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get MIDI note name from number
 */
function getMidiNoteName(midiNote: number | null | undefined): string {
    if (midiNote === null || midiNote === undefined) return '';
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const noteName = noteNames[midiNote % 12];
    return `${noteName}${octave}`;
}

// ============================================================
// Main Component
// ============================================================

export function GuitarHeroModeVisualization({
    beats,
    onBeatClick,
    selectedBeatIndex,
    disabled = false,
    timeWindow = 3.0,
    height = 200,
    defaultCollapsed = true,
    className,
}: GuitarHeroModeVisualizationProps) {
    // Audio player state
    const currentTime = useAudioPlayerStore((state) => state.currentTime);
    const playbackState = useAudioPlayerStore((state) => state.playbackState);
    const storeSeek = useAudioPlayerStore((state) => state.seek);
    const resume = useAudioPlayerStore((state) => state.resume);
    const pause = useAudioPlayerStore((state) => state.pause);
    const play = useAudioPlayerStore((state) => state.play);
    const currentUrl = useAudioPlayerStore((state) => state.currentUrl);
    const { selectedTrack } = usePlaylistStore();
    const duration = useTrackDuration();

    const isPlaying = playbackState === 'playing';

    // Collapse state
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    // Smart seek wrapper
    const seek = useCallback((time: number) => {
        storeSeek(time, currentUrl || selectedTrack?.audio_url);
    }, [storeSeek, currentUrl, selectedTrack?.audio_url]);

    // Animation state for smooth playhead
    const [smoothTime, setSmoothTime] = useState(currentTime);
    const animationFrameRef = useRef<number | null>(null);
    const lastAudioTimeRef = useRef<{ time: number; timestamp: number }>({
        time: currentTime,
        timestamp: performance.now(),
    });
    const isPlayingRef = useRef(isPlaying);

    // Hover state
    const [hoveredBeat, setHoveredBeat] = useState<GuitarHeroVisualizationBeat | null>(null);

    // Container ref
    const containerRef = useRef<HTMLDivElement>(null);

    // Lane height
    const laneHeight = height / 5;

    // Keep refs in sync
    useEffect(() => {
        lastAudioTimeRef.current = {
            time: currentTime,
            timestamp: performance.now(),
        };
    }, [currentTime]);

    // Track playback state
    const prevIsPlayingRef = useRef(isPlaying);
    useEffect(() => {
        isPlayingRef.current = isPlaying;

        const playbackJustStarted = isPlaying && !prevIsPlayingRef.current;
        if (playbackJustStarted) {
            lastAudioTimeRef.current = {
                time: currentTime,
                timestamp: performance.now(),
            };
            setSmoothTime(currentTime);
        }

        prevIsPlayingRef.current = isPlaying;
    }, [isPlaying, currentTime]);

    // Animation loop
    useEffect(() => {
        if (!isPlaying) {
            setSmoothTime(currentTime);
            return;
        }

        const animate = () => {
            const now = performance.now();
            const { time: lastAudioTime, timestamp: lastUpdateTimestamp } = lastAudioTimeRef.current;

            const elapsedMs = now - lastUpdateTimestamp;
            const elapsedSeconds = elapsedMs / 1000;
            const interpolatedTime = Math.min(lastAudioTime + elapsedSeconds, duration || 9999);

            setSmoothTime(interpolatedTime);

            if (isPlayingRef.current && interpolatedTime < (duration || 9999)) {
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying, duration]);

    // Handle seek events
    useEffect(() => {
        if (!isPlaying) {
            setSmoothTime(currentTime);
        }
    }, [currentTime, isPlaying]);

    // Get visible beats within the time window
    const visibleBeats = useMemo((): VisibleBeat[] => {
        const windowStart = smoothTime - 0.5; // Show a bit of past
        const windowEnd = smoothTime + timeWindow;

        return beats
            .filter((beat) => beat.timestamp >= windowStart && beat.timestamp <= windowEnd)
            .map((beat) => {
                const fretNum = parseInt(beat.key, 10);
                const lane = 5 - fretNum; // Fret 1 at bottom (lane 4), Fret 5 at top (lane 0)

                // Calculate horizontal position (0 = past/left, 1 = future/right)
                const timeOffset = beat.timestamp - smoothTime;
                const position = 0.5 + (timeOffset / timeWindow) * 0.5;

                const isPast = beat.timestamp < smoothTime - 0.05;
                const isCurrent = !isPast && beat.timestamp < smoothTime + 0.1;
                const isNext = !isPast && !isCurrent && beat.timestamp < smoothTime + 0.3;

                return {
                    beat,
                    lane,
                    horizontalPosition: position,
                    isPast,
                    isCurrent,
                    isNext,
                };
            })
            .filter((vb) => vb.horizontalPosition >= 0 && vb.horizontalPosition <= 1);
    }, [beats, smoothTime, timeWindow]);

    // Current beat (for highlighting)
    const currentBeat = useMemo(() => {
        return visibleBeats.find((vb) => vb.isCurrent) || visibleBeats.find((vb) => vb.isNext);
    }, [visibleBeats]);

    // Play/pause toggle
    const handlePlayPause = useCallback(() => {
        if (isPlaying) {
            pause();
        } else {
            if (selectedTrack && !currentUrl) {
                play(selectedTrack.audio_url);
            } else {
                resume();
            }
        }
    }, [isPlaying, pause, resume, play, selectedTrack, currentUrl]);

    // Handle beat click
    const handleBeatClick = useCallback((event: React.MouseEvent, beat: GuitarHeroVisualizationBeat) => {
        event.stopPropagation();
        onBeatClick?.(beat);
    }, [onBeatClick]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (currentBeat) {
                onBeatClick?.(currentBeat.beat);
            }
        }
    }, [currentBeat, onBeatClick]);

    // Container click handler for seeking
    const handleContainerClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (disabled || !containerRef.current || !duration) return;

        const rect = containerRef.current.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const trackWidth = rect.width;

        // Calculate time based on click position
        // Left side = past (-0.5s), right side = future (+timeWindow)
        const positionRatio = clickX / trackWidth;
        const timeOffset = (positionRatio - 0.5) * (timeWindow + 0.5) + 0.5;
        const newTime = smoothTime - 0.5 + timeOffset;

        seek(Math.max(0, Math.min(duration, newTime)));
    }, [disabled, duration, smoothTime, timeWindow, seek]);

    // Empty state
    if (beats.length === 0) {
        return (
            <div className={cn('gh-visualization', 'gh-visualization--empty', className)}>
                <div className="gh-visualization-panel">
                    <div className="gh-visualization-header">
                        <Guitar className="gh-visualization-panel-icon" />
                        <h3 className="gh-visualization-panel-title">Guitar Hero Mode Visualization</h3>
                    </div>
                    <p className="gh-visualization-empty-message">
                        No button mapping data available
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('gh-visualization', className)}>
            <div className="gh-visualization-panel">
                {/* Header */}
                <div className="gh-visualization-header">
                    <Guitar className="gh-visualization-panel-icon" />
                    <h3 className="gh-visualization-panel-title">Guitar Hero Mode Visualization</h3>
                    <span className="gh-visualization-mode-badge">Guitar Hero</span>
                    <button
                        className="gh-visualization-toggle"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        aria-expanded={!isCollapsed}
                        aria-label={isCollapsed ? 'Expand visualization' : 'Collapse visualization'}
                    >
                        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                </div>

                {/* Collapsed hint */}
                {isCollapsed && (
                    <div className="gh-visualization-collapsed-hint">
                        <p>Click to expand fretboard visualization</p>
                    </div>
                )}

                {/* Main content when not collapsed */}
                {!isCollapsed && (
                    <>
                        {/* Fretboard Container */}
                        <div
                            ref={containerRef}
                            className={cn(
                                'gh-visualization-fretboard',
                                disabled && 'gh-visualization-fretboard--disabled'
                            )}
                            style={{ height: `${height}px` }}
                            onClick={handleContainerClick}
                            onKeyDown={handleKeyDown}
                            role="slider"
                            aria-label="Guitar Hero fretboard visualization"
                            tabIndex={disabled ? -1 : 0}
                        >
                            {/* Fret lanes */}
                            {GUITAR_HERO_FRETS.map((fret, index) => {
                                const laneY = index * laneHeight;
                                const isActive = currentBeat?.beat.key === fret.key;

                                return (
                                    <div
                                        key={fret.key}
                                        className={cn(
                                            'gh-visualization-lane',
                                            isActive && 'gh-visualization-lane--active'
                                        )}
                                        style={{
                                            top: `${laneY}px`,
                                            height: `${laneHeight}px`,
                                            borderColor: fret.color,
                                        }}
                                    >
                                        {/* Fret indicator */}
                                        <div
                                            className="gh-visualization-fret-indicator"
                                            style={{ backgroundColor: fret.color }}
                                        >
                                            {fret.key}
                                        </div>

                                        {/* Pitch range label */}
                                        <span className="gh-visualization-pitch-range">
                                            {fret.pitchRange}
                                        </span>
                                    </div>
                                );
                            })}

                            {/* NOW line (strike line) */}
                            <div
                                className="gh-visualization-now-line"
                                style={{ left: '50%' }}
                            >
                                <div className="gh-visualization-now-line-inner" />
                            </div>

                            {/* Beat markers */}
                            {visibleBeats.map((vb) => {
                                const fretConfig = FRETS_MAP.get(vb.beat.key);
                                if (!fretConfig) return null;

                                const isSelected = vb.beat.beatIndex === selectedBeatIndex;
                                const isHovered = hoveredBeat?.beatIndex === vb.beat.beatIndex;

                                return (
                                    <div
                                        key={`beat-${vb.beat.beatIndex}`}
                                        className={cn(
                                            'gh-visualization-beat-marker',
                                            vb.isCurrent && 'gh-visualization-beat-marker--current',
                                            vb.isNext && 'gh-visualization-beat-marker--next',
                                            vb.isPast && 'gh-visualization-beat-marker--past',
                                            isSelected && 'gh-visualization-beat-marker--selected',
                                            isHovered && 'gh-visualization-beat-marker--hovered'
                                        )}
                                        style={{
                                            left: `${vb.horizontalPosition * 100}%`,
                                            top: `${vb.lane * laneHeight + laneHeight / 2}px`,
                                            backgroundColor: fretConfig.color,
                                            borderColor: fretConfig.color,
                                        }}
                                        onClick={(e) => handleBeatClick(e, vb.beat)}
                                        onMouseEnter={() => setHoveredBeat(vb.beat)}
                                        onMouseLeave={() => setHoveredBeat(null)}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`${fretConfig.label} at ${vb.beat.timestamp.toFixed(2)}s`}
                                    >
                                        <span className="gh-visualization-beat-marker-inner">
                                            {vb.beat.key}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Upcoming sequence preview */}
                        <div className="gh-visualization-sequence">
                            <div className="gh-visualization-sequence-label">
                                Upcoming:
                            </div>
                            <div className="gh-visualization-sequence-beats">
                                {visibleBeats
                                    .filter((vb) => !vb.isPast || vb.isCurrent)
                                    .slice(0, 8)
                                    .map((vb, index) => {
                                        const fretConfig = FRETS_MAP.get(vb.beat.key);
                                        return (
                                            <span
                                                key={vb.beat.beatIndex}
                                                className={cn(
                                                    'gh-visualization-sequence-beat',
                                                    vb.isCurrent && 'gh-visualization-sequence-beat--current',
                                                    index === 0 && !vb.isCurrent && 'gh-visualization-sequence-beat--next'
                                                )}
                                                style={{
                                                    color: fretConfig?.color,
                                                    borderColor: fretConfig?.color,
                                                }}
                                                onClick={(e) => handleBeatClick(e, vb.beat)}
                                            >
                                                F{vb.beat.key}
                                                {vb.beat.midiNote !== undefined && vb.beat.midiNote !== null && (
                                                    <span className="gh-visualization-sequence-note">
                                                        {getMidiNoteName(vb.beat.midiNote)}
                                                    </span>
                                                )}
                                            </span>
                                        );
                                    })}
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="gh-visualization-controls">
                            <button
                                className="gh-visualization-play-btn"
                                onClick={handlePlayPause}
                                disabled={disabled}
                                title={isPlaying ? 'Pause' : 'Play'}
                            >
                                {isPlaying ? (
                                    <svg viewBox="0 0 24 24" fill="currentColor" width={14} height={14}>
                                        <rect x="6" y="4" width="4" height="16" />
                                        <rect x="14" y="4" width="4" height="16" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="currentColor" width={14} height={14}>
                                        <polygon points="5,3 19,12 5,21" />
                                    </svg>
                                )}
                            </button>
                            <span className="gh-visualization-time">
                                {formatTime(smoothTime)} / {formatTime(duration)}
                            </span>
                            <div className="gh-visualization-info">
                                <Music size={12} />
                                <span>{visibleBeats.filter(vb => !vb.isPast).length} notes visible</span>
                            </div>
                        </div>

                        {/* Tooltip */}
                        {hoveredBeat && (
                            <div className="gh-visualization-tooltip">
                                <span
                                    className="gh-visualization-tooltip-fret"
                                    style={{ color: FRETS_MAP.get(hoveredBeat.key)?.color }}
                                >
                                    {FRETS_MAP.get(hoveredBeat.key)?.label}
                                </span>
                                <span className="gh-visualization-tooltip-time">
                                    {hoveredBeat.timestamp.toFixed(2)}s
                                </span>
                                {hoveredBeat.midiNote !== undefined && hoveredBeat.midiNote !== null && (
                                    <span className="gh-visualization-tooltip-note">
                                        {getMidiNoteName(hoveredBeat.midiNote)}
                                    </span>
                                )}
                                {hoveredBeat.direction && (
                                    <span className="gh-visualization-tooltip-direction">
                                        {hoveredBeat.direction === 'up' && '↑ Ascending'}
                                        {hoveredBeat.direction === 'down' && '↓ Descending'}
                                        {hoveredBeat.direction === 'stable' && '→ Stable'}
                                    </span>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default GuitarHeroModeVisualization;
