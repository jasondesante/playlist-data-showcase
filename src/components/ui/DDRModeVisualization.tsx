/**
 * DDRModeVisualization Component
 *
 * A circular motion visualization for DDR button mapping (Secondary View).
 * Features:
 * - Circular layout with 4 DDR buttons (up, down, left, right)
 * - Path showing button sequence progression
 * - Clockwise motion = ascending pitch
 * - Counter-clockwise motion = descending pitch
 * - Current beat highlight synced with audio playback
 * - Collapsible/expandable view
 *
 * Task 6.3: Create DDRModeVisualization Component (Secondary View)
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Gamepad2 } from 'lucide-react';
import './DDRModeVisualization.css';
import { cn } from '../../utils/cn';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useTrackDuration } from '../../hooks/useTrackDuration';

// ============================================================
// Types
// ============================================================

export interface DDRVisualizationBeat {
    /** Beat timestamp in seconds */
    timestamp: number;
    /** Beat index in the chart */
    beatIndex: number;
    /** Assigned DDR button */
    key: 'up' | 'down' | 'left' | 'right';
    /** Pitch direction at this beat */
    direction?: 'up' | 'down' | 'stable' | 'none';
    /** Whether this beat's key was influenced by pitch */
    isPitchInfluenced?: boolean;
}

export interface DDRModeVisualizationProps {
    /** Array of beats with DDR button assignments */
    beats: DDRVisualizationBeat[];
    /** Callback when a beat is clicked */
    onBeatClick?: (beat: DDRVisualizationBeat) => void;
    /** The index of the currently selected beat */
    selectedBeatIndex?: number;
    /** Whether the visualization is disabled */
    disabled?: boolean;
    /** Number of beats to show in the sequence window */
    windowSize?: number;
    /** Size of the visualization in pixels */
    size?: number;
    /** Whether the panel starts collapsed */
    defaultCollapsed?: boolean;
    /** Additional CSS class names */
    className?: string;
}

/** DDR button position on the circle */
interface ButtonPosition {
    key: 'up' | 'down' | 'left' | 'right';
    angle: number; // in radians, 0 = right, PI/2 = up
    x: number;
    y: number;
    color: string;
    icon: React.ReactNode;
    label: string;
}

/** Internal representation of a visible beat on the circle */
interface VisibleBeat {
    beat: DDRVisualizationBeat;
    position: ButtonPosition;
    angle: number;
    isPast: boolean;
    isCurrent: boolean;
    isNext: boolean;
    pathFromPrevious: string | null;
    motionDirection: 'clockwise' | 'counter-clockwise' | 'none';
}

// ============================================================
// Constants
// ============================================================

/** DDR button positions on a circle (like a compass) */
const DDR_BUTTON_POSITIONS: ButtonPosition[] = [
    { key: 'up', angle: -Math.PI / 2, x: 0, y: -1, color: '#eab308', icon: <ArrowUp size={20} />, label: 'Up' },
    { key: 'right', angle: 0, x: 1, y: 0, color: '#22c55e', icon: <ArrowRight size={20} />, label: 'Right' },
    { key: 'down', angle: Math.PI / 2, x: 0, y: 1, color: '#3b82f6', icon: <ArrowDown size={20} />, label: 'Down' },
    { key: 'left', angle: Math.PI, x: -1, y: 0, color: '#a855f7', icon: <ArrowLeft size={20} />, label: 'Left' },
];

/** Map button key to position info */
const BUTTON_MAP = new Map(DDR_BUTTON_POSITIONS.map((pos) => [pos.key, pos]));

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
 * Determine motion direction between two buttons.
 * Uses pitch direction when available, otherwise calculates shortest path.
 */
function getMotionDirection(
    fromKey: string,
    toKey: string,
    pitchDirection?: 'up' | 'down' | 'stable' | 'none'
): 'clockwise' | 'counter-clockwise' | 'none' {
    if (fromKey === toKey) return 'none';

    // If pitch direction is available, use it
    // Clockwise for ascending pitch (up), counter-clockwise for descending (down)
    if (pitchDirection === 'up') return 'clockwise';
    if (pitchDirection === 'down') return 'counter-clockwise';

    // Calculate shortest path between buttons
    const fromPos = BUTTON_MAP.get(fromKey as 'up' | 'down' | 'left' | 'right');
    const toPos = BUTTON_MAP.get(toKey as 'up' | 'down' | 'left' | 'right');

    if (!fromPos || !toPos) return 'none';

    // Calculate angle difference
    let diff = toPos.angle - fromPos.angle;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    // Positive = clockwise, negative = counter-clockwise
    return diff > 0 ? 'clockwise' : 'counter-clockwise';
}

/**
 * Generate SVG arc path between two button positions
 */
function generateArcPath(
    fromPos: ButtonPosition,
    toPos: ButtonPosition,
    radius: number,
    centerX: number,
    centerY: number,
    direction: 'clockwise' | 'counter-clockwise' | 'none'
): string {
    if (direction === 'none') {
        return '';
    }

    const fromX = centerX + fromPos.x * radius;
    const fromY = centerY + fromPos.y * radius;
    const toX = centerX + toPos.x * radius;
    const toY = centerY + toPos.y * radius;

    // For same button, no path
    if (fromPos.key === toPos.key) {
        return '';
    }

    // Calculate arc parameters
    const largeArc = 0; // 0 for small arc (< 180 degrees)

    // Clockwise sweep = 1, counter-clockwise = 0
    const sweep = direction === 'clockwise' ? 1 : 0;

    return `M ${fromX} ${fromY} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${toX} ${toY}`;
}

// ============================================================
// Main Component
// ============================================================

export function DDRModeVisualization({
    beats,
    onBeatClick,
    selectedBeatIndex,
    disabled = false,
    windowSize = 8,
    size = 200,
    defaultCollapsed = true,
    className,
}: DDRModeVisualizationProps) {
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
    const [hoveredBeat, setHoveredBeat] = useState<DDRVisualizationBeat | null>(null);

    // SVG ref
    const svgRef = useRef<SVGSVGElement>(null);

    // Circle dimensions
    const centerX = size / 2;
    const centerY = size / 2;
    const buttonRadius = size * 0.38;
    const innerRadius = size * 0.15;

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

    // Get visible beats within the time window around current time
    const visibleBeats = useMemo((): VisibleBeat[] => {
        if (beats.length === 0) return [];

        // Find current beat index based on time
        const currentBeatIndex = beats.findIndex((beat, index) => {
            const nextBeat = beats[index + 1];
            if (!nextBeat) return beat.timestamp <= smoothTime;
            return beat.timestamp <= smoothTime && nextBeat.timestamp > smoothTime;
        });

        // Get window of beats around current
        const startIndex = Math.max(0, currentBeatIndex - 2);
        const endIndex = Math.min(beats.length, startIndex + windowSize);
        const windowBeats = beats.slice(startIndex, endIndex);

        return windowBeats.map((beat, index) => {
            const position = BUTTON_MAP.get(beat.key) || DDR_BUTTON_POSITIONS[0];
            const beatTime = beat.timestamp;
            const isPast = beatTime < smoothTime - 0.1;
            const isCurrent = !isPast && beatTime < smoothTime + 0.15;
            const isNext = !isPast && !isCurrent && index === windowBeats.findIndex(b => b.timestamp > smoothTime);

            // Calculate path from previous beat
            let pathFromPrevious: string | null = null;
            let motionDirection: 'clockwise' | 'counter-clockwise' | 'none' = 'none';

            if (index > 0) {
                const prevBeat = windowBeats[index - 1];
                const prevPos = BUTTON_MAP.get(prevBeat.key as 'up' | 'down' | 'left' | 'right');
                motionDirection = getMotionDirection(prevBeat.key, beat.key, beat.direction);

                if (prevPos) {
                    pathFromPrevious = generateArcPath(
                        prevPos,
                        position,
                        buttonRadius,
                        centerX,
                        centerY,
                        motionDirection
                    );
                }
            }

            return {
                beat,
                position,
                angle: position.angle,
                isPast,
                isCurrent,
                isNext,
                pathFromPrevious,
                motionDirection,
            };
        });
    }, [beats, smoothTime, windowSize, buttonRadius, centerX, centerY]);

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
    const handleBeatClick = useCallback((event: React.MouseEvent, beat: DDRVisualizationBeat) => {
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

    // SVG click handler for seeking
    const handleSvgClick = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
        if (disabled || !svgRef.current || !duration) return;

        const rect = svgRef.current.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;


        // Check if click is on center (seek control)
        const dx = clickX - centerX;
        const dy = clickY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < innerRadius) {
            // Click on center - play/pause
            handlePlayPause();
            return;
        }

        // Calculate angle to determine approximate time
        const angle = Math.atan2(dy, dx);
        // Map angle to progress (0-1) based on duration
        const normalizedAngle = (angle + Math.PI) / (2 * Math.PI); // 0 to 1
        const newTime = normalizedAngle * duration;
        seek(Math.max(0, Math.min(duration, newTime)));
    }, [disabled, duration, centerX, centerY, innerRadius, handlePlayPause, seek]);

    // Empty state
    if (beats.length === 0) {
        return (
            <div className={cn('ddr-visualization', 'ddr-visualization--empty', className)}>
                <div className="ddr-visualization-panel">
                    <div className="ddr-visualization-header">
                        <Gamepad2 className="ddr-visualization-panel-icon" />
                        <h3 className="ddr-visualization-panel-title">DDR Mode Visualization</h3>
                    </div>
                    <p className="ddr-visualization-empty-message">
                        No button mapping data available
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('ddr-visualization', className)}>
            <div className="ddr-visualization-panel">
                {/* Header */}
                <div className="ddr-visualization-header">
                    <Gamepad2 className="ddr-visualization-panel-icon" />
                    <h3 className="ddr-visualization-panel-title">DDR Mode Visualization</h3>
                    <span className="ddr-visualization-mode-badge">DDR</span>
                    <button
                        className="ddr-visualization-toggle"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        aria-expanded={!isCollapsed}
                        aria-label={isCollapsed ? 'Expand visualization' : 'Collapse visualization'}
                    >
                        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                </div>

                {/* Collapsed hint */}
                {isCollapsed && (
                    <div className="ddr-visualization-collapsed-hint">
                        <p>Click to expand circular motion visualization</p>
                    </div>
                )}

                {/* Main content when not collapsed */}
                {!isCollapsed && (
                    <>
                        {/* SVG Container */}
                        <svg
                            ref={svgRef}
                            className={cn(
                                'ddr-visualization-svg',
                                disabled && 'ddr-visualization-svg--disabled'
                            )}
                            viewBox={`0 0 ${size} ${size}`}
                            preserveAspectRatio="xMidYMid meet"
                            onClick={handleSvgClick}
                            onKeyDown={handleKeyDown}
                            role="img"
                            aria-label="DDR circular motion visualization"
                            tabIndex={disabled ? -1 : 0}
                        >
                            {/* Center circle (seek control) */}
                            <circle
                                className="ddr-visualization-center"
                                cx={centerX}
                                cy={centerY}
                                r={innerRadius}
                                fill="transparent"
                                stroke="var(--border-color, #2a2a4a)"
                            />
                            <text
                                className="ddr-visualization-center-text"
                                x={centerX}
                                y={centerY}
                                textAnchor="middle"
                                dominantBaseline="middle"
                            >
                                {isPlaying ? '❚❚' : '▶'}
                            </text>

                            {/* Arc paths for motion */}
                            {visibleBeats.map((vb, index) => {
                                if (!vb.pathFromPrevious || index === 0) return null;

                                const isPast = vb.isPast;

                                return (
                                    <path
                                        key={`arc-${vb.beat.beatIndex}`}
                                        className={cn(
                                            'ddr-visualization-arc',
                                            vb.motionDirection === 'clockwise' && 'ddr-visualization-arc--clockwise',
                                            vb.motionDirection === 'counter-clockwise' && 'ddr-visualization-arc--counter',
                                            isPast && 'ddr-visualization-arc--past'
                                        )}
                                        d={vb.pathFromPrevious}
                                        fill="none"
                                    />
                                );
                            })}

                            {/* Button positions */}
                            {DDR_BUTTON_POSITIONS.map((pos) => {
                                const x = centerX + pos.x * buttonRadius;
                                const y = centerY + pos.y * buttonRadius;
                                const isActive = currentBeat?.position.key === pos.key;

                                return (
                                    <g
                                        key={pos.key}
                                        className={cn(
                                            'ddr-visualization-button',
                                            isActive && 'ddr-visualization-button--active'
                                        )}
                                        transform={`translate(${x}, ${y})`}
                                    >
                                        {/* Button background */}
                                        <circle
                                            className="ddr-visualization-button-bg"
                                            r={24}
                                            fill={isActive ? pos.color : 'transparent'}
                                            stroke={pos.color}
                                            strokeWidth={2}
                                        />
                                        {/* Button icon */}
                                        <foreignObject
                                            x={-12}
                                            y={-12}
                                            width={24}
                                            height={24}
                                            style={{ color: isActive ? '#000' : pos.color }}
                                        >
                                            <div className="ddr-visualization-button-icon">
                                                {pos.icon}
                                            </div>
                                        </foreignObject>
                                    </g>
                                );
                            })}

                            {/* Beat markers on the circle */}
                            {visibleBeats.map((vb) => {
                                const x = centerX + vb.position.x * buttonRadius;
                                const y = centerY + vb.position.y * buttonRadius;
                                const isSelected = vb.beat.beatIndex === selectedBeatIndex;
                                const isHovered = hoveredBeat?.beatIndex === vb.beat.beatIndex;

                                // Skip past beats
                                if (vb.isPast && !vb.isCurrent) return null;

                                return (
                                    <circle
                                        key={`beat-${vb.beat.beatIndex}`}
                                        className={cn(
                                            'ddr-visualization-beat-marker',
                                            vb.isCurrent && 'ddr-visualization-beat-marker--current',
                                            vb.isNext && 'ddr-visualization-beat-marker--next',
                                            isSelected && 'ddr-visualization-beat-marker--selected',
                                            isHovered && 'ddr-visualization-beat-marker--hovered'
                                        )}
                                        cx={x}
                                        cy={y}
                                        r={vb.isCurrent ? 10 : vb.isNext ? 8 : 6}
                                        fill={vb.position.color}
                                        stroke={isSelected ? '#fff' : 'transparent'}
                                        strokeWidth={2}
                                        onClick={(e) => handleBeatClick(e, vb.beat)}
                                        onMouseEnter={() => setHoveredBeat(vb.beat)}
                                        onMouseLeave={() => setHoveredBeat(null)}
                                        style={{ cursor: onBeatClick ? 'pointer' : 'default' }}
                                    />
                                );
                            })}
                        </svg>

                        {/* Beat sequence preview */}
                        <div className="ddr-visualization-sequence">
                            <div className="ddr-visualization-sequence-label">
                                Upcoming:
                            </div>
                            <div className="ddr-visualization-sequence-beats">
                                {visibleBeats
                                    .filter((vb) => !vb.isPast || vb.isCurrent)
                                    .slice(0, 6)
                                    .map((vb, index) => (
                                        <span
                                            key={vb.beat.beatIndex}
                                            className={cn(
                                                'ddr-visualization-sequence-beat',
                                                vb.isCurrent && 'ddr-visualization-sequence-beat--current',
                                                index === 0 && !vb.isCurrent && 'ddr-visualization-sequence-beat--next'
                                            )}
                                            style={{ color: vb.position.color }}
                                            onClick={(e) => handleBeatClick(e, vb.beat)}
                                        >
                                            {vb.position.label}
                                            {vb.motionDirection === 'clockwise' && ' ↻'}
                                            {vb.motionDirection === 'counter-clockwise' && ' ↺'}
                                        </span>
                                    ))}
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="ddr-visualization-controls">
                            <button
                                className="ddr-visualization-play-btn"
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
                            <span className="ddr-visualization-time">
                                {formatTime(smoothTime)} / {formatTime(duration)}
                            </span>
                        </div>

                        {/* Tooltip */}
                        {hoveredBeat && (
                            <div className="ddr-visualization-tooltip">
                                <span className="ddr-visualization-tooltip-button">
                                    {BUTTON_MAP.get(hoveredBeat.key)?.label}
                                </span>
                                <span className="ddr-visualization-tooltip-time">
                                    {hoveredBeat.timestamp.toFixed(2)}s
                                </span>
                                {hoveredBeat.direction && (
                                    <span className="ddr-visualization-tooltip-direction">
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

export default DDRModeVisualization;
