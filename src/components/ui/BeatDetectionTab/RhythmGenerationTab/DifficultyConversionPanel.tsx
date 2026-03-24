/**
 * DifficultyConversionPanel Component
 *
 * Visualizes how the composite stream is converted to 3 difficulty variants
 * through simplification or enhancement.
 *
 * Displays:
 * - Header with natural difficulty badge
 * - Info banner explaining the natural difficulty
 * - Composite baseline timeline (source reference)
 * - 3 side-by-side difficulty columns with diff visualization:
 *   - Active beats (solid) - Beats present in final variant
 *   - Ghost beats (faded/dashed) - Beats in composite but removed
 *   - Added beats (highlighted) - Beats not in composite but added
 * - Conversion metadata for simplified variants
 * - Enhancement metadata for enhanced variants
 *
 * Part of Phase 2: DifficultyConversionPanel (Task 2.1)
 */

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { GitBranch, CheckCircle, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import './DifficultyConversionPanel.css';
import { ZoomControls } from '../../ZoomControls';
import { useAudioPlayerStore } from '../../../../store/audioPlayerStore';
import { usePlaylistStore } from '../../../../store/playlistStore';
import type {
    GeneratedRhythm,
    DifficultyVariant,
    DifficultyLevel,
    EditType,
    CompositeBeat,
} from '../../../../types/rhythmGeneration';

// Type alias for variant beats
type VariantBeat = GeneratedRhythm['difficultyVariants']['easy']['beats'][number];

// ============================================================
// Types
// ============================================================

export interface DifficultyConversionPanelProps {
    /** The generated rhythm containing composite and variant data */
    rhythm: GeneratedRhythm;
    /** Current audio playback time in seconds (for timeline sync) */
    currentTime?: number;
    /** Total audio duration in seconds */
    duration?: number;
    /** Whether audio is currently playing */
    isPlaying?: boolean;
    /** Callback when user seeks to a time position */
    onSeek?: (time: number) => void;
    /** Additional CSS class names */
    className?: string;
}

/**
 * Difficulty color scheme
 */
const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
    easy: '#22c55e',    // Green
    medium: '#f59e0b',  // Amber
    hard: '#ef4444',    // Red
};

/**
 * Edit type display labels
 */
const EDIT_TYPE_LABELS: Record<EditType, string> = {
    none: 'Unedited',
    simplified: 'Simplified',
    interpolated: 'Interpolated',
    pattern_inserted: 'Pattern Added',
};

/**
 * Edit type icons configuration
 */
const EDIT_TYPE_ICONS: Record<EditType, React.ElementType> = {
    none: Minus,
    simplified: TrendingDown,
    interpolated: TrendingUp,
    pattern_inserted: TrendingUp,
};

/** Pixels of movement before treating as drag (vs click) */
const DRAG_THRESHOLD = 5;

// ============================================================
// Utility Functions
// ============================================================

/**
 * Detect beats removed from composite (ghost beats)
 * Returns composite beats that are NOT in the variant
 */
function detectGhostBeats(
    compositeBeats: CompositeBeat[],
    variantBeats: VariantBeat[]
): CompositeBeat[] {
    const variantTimestamps = new Set(
        variantBeats.map(b => b.timestamp.toFixed(4))
    );
    return compositeBeats.filter(b => !variantTimestamps.has(b.timestamp.toFixed(4)));
}

/**
 * Detect beats added to variant (not in composite)
 * Returns variant beats that are NOT in the composite
 */
function detectAddedBeats(
    compositeBeats: CompositeBeat[],
    variantBeats: VariantBeat[]
): VariantBeat[] {
    const compositeTimestamps = new Set(
        compositeBeats.map(b => b.timestamp.toFixed(4))
    );
    return variantBeats.filter(b => !compositeTimestamps.has(b.timestamp.toFixed(4)));
}

// ============================================================
// Sub-components
// ============================================================

/**
 * Header for a difficulty conversion column
 */
interface ConversionHeaderProps {
    difficulty: DifficultyLevel;
    isNatural: boolean;
    editType: EditType;
    color: string;
}

function ConversionHeader({ difficulty, isNatural, editType, color }: ConversionHeaderProps) {
    const EditIcon = EDIT_TYPE_ICONS[editType];

    return (
        <div
            className="difficulty-conversion-header"
            style={{ '--variant-color': color } as React.CSSProperties}
        >
            <div className="difficulty-conversion-title-row">
                <span className="difficulty-conversion-title">
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </span>
                {isNatural && (
                    <span className="difficulty-conversion-natural-badge">
                        <CheckCircle size={12} />
                        <span>Natural</span>
                    </span>
                )}
            </div>
            <div className="difficulty-conversion-edit-type">
                <EditIcon size={14} />
                <span>{EDIT_TYPE_LABELS[editType]}</span>
            </div>
            <div className="difficulty-conversion-indicator" style={{ backgroundColor: color }} />
        </div>
    );
}

/**
 * Mini timeline showing the composite baseline
 * Features:
 * - Shows composite beats as markers
 * - Playhead synced with audio
 * - Drag-to-scrub functionality
 * - Click-to-seek
 * - Smooth animation with requestAnimationFrame
 */
interface CompositeBaselineTimelineProps {
    beats: CompositeBeat[];
    duration: number;
    currentTime?: number;
    zoomLevel?: number;
}

function CompositeBaselineTimeline({
    beats,
    duration,
    currentTime: propCurrentTime = 0,
    zoomLevel = 1,
}: CompositeBaselineTimelineProps) {
    const trackRef = useRef<HTMLDivElement>(null);

    // Direct store access for responsive seeking
    const storeSeek = useAudioPlayerStore((state) => state.seek);
    const currentAudioUrl = useAudioPlayerStore((state) => state.currentUrl);
    const storeCurrentTime = useAudioPlayerStore((state) => state.currentTime);
    const playbackState = useAudioPlayerStore((state) => state.playbackState);
    const isPlaying = playbackState === 'playing';

    // Get selected track from playlist store (for initiating playback when audio not loaded)
    const selectedTrack = usePlaylistStore((state) => state.selectedTrack);

    // Smart seek wrapper: loads audio first if not loaded
    const seek = useCallback((time: number) => {
        storeSeek(time, currentAudioUrl || selectedTrack?.audio_url);
    }, [storeSeek, currentAudioUrl, selectedTrack?.audio_url]);

    // ========================================
    // Smooth Animation with requestAnimationFrame
    // ========================================

    const animationFrameRef = useRef<number | null>(null);
    const [smoothTime, setSmoothTime] = useState(storeCurrentTime);
    const lastAudioTimeRef = useRef<{ time: number; timestamp: number }>({
        time: storeCurrentTime,
        timestamp: performance.now(),
    });
    const isPlayingRef = useRef(isPlaying);

    // CRITICAL: Use a ref to track smoothTime for stable callback references
    const smoothTimeRef = useRef(smoothTime);

    // Keep smoothTimeRef in sync with smoothTime state
    useEffect(() => {
        smoothTimeRef.current = smoothTime;
    }, [smoothTime]);

    // Keep refs in sync with props
    useEffect(() => {
        lastAudioTimeRef.current = {
            time: storeCurrentTime,
            timestamp: performance.now(),
        };
    }, [storeCurrentTime]);

    // Track previous isPlaying state to detect transitions
    const prevIsPlayingRef = useRef(isPlaying);

    useEffect(() => {
        isPlayingRef.current = isPlaying;

        const playbackJustStarted = isPlaying && !prevIsPlayingRef.current;
        if (playbackJustStarted) {
            lastAudioTimeRef.current = {
                time: storeCurrentTime,
                timestamp: performance.now(),
            };
            setSmoothTime(storeCurrentTime);
        }

        prevIsPlayingRef.current = isPlaying;
    }, [isPlaying, storeCurrentTime]);

    /**
     * Animation loop for smooth scrolling
     */
    useEffect(() => {
        if (!isPlaying) {
            setSmoothTime(storeCurrentTime);
            return;
        }

        const animate = () => {
            const now = performance.now();
            const { time: lastAudioTime, timestamp: lastUpdateTimestamp } = lastAudioTimeRef.current;
            const elapsedMs = now - lastUpdateTimestamp;
            const elapsedSeconds = elapsedMs / 1000;
            const interpolatedTime = lastAudioTime + elapsedSeconds;
            const clampedTime = duration > 0 ? Math.min(interpolatedTime, duration) : interpolatedTime;
            setSmoothTime(clampedTime);

            if (isPlayingRef.current && (duration <= 0 || clampedTime < duration)) {
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [isPlaying, duration]);

    /**
     * Handle seek events
     */
    useEffect(() => {
        if (!isPlaying) {
            setSmoothTime(storeCurrentTime);
        }
    }, [storeCurrentTime, isPlaying]);

    // Use smooth time for display, fall back to prop
    const currentTime = isPlaying ? smoothTime : storeCurrentTime || propCurrentTime;

    // ========================================
    // Drag-to-scrub and click-to-seek functionality
    // ========================================

    const [isDragging, setIsDragging] = useState(false);
    const dragStartXRef = useRef<number>(0);
    const dragStartTimeRef = useRef<number>(0);

    const handleMouseDown = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (!trackRef.current || duration === 0) return;

            event.preventDefault();
            setIsDragging(true);
            dragStartXRef.current = event.clientX;
            dragStartTimeRef.current = smoothTimeRef.current;
        },
        [duration]
    );

    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            if (!isDragging || !trackRef.current || duration === 0) return;

            const rect = trackRef.current.getBoundingClientRect();
            const trackWidth = rect.width;
            const deltaX = event.clientX - dragStartXRef.current;

            if (Math.abs(deltaX) > DRAG_THRESHOLD) {
                const timePerPixel = duration / trackWidth;
                const deltaTime = -deltaX * timePerPixel;
                const newTime = Math.max(0, Math.min(duration, dragStartTimeRef.current + deltaTime));
                seek(newTime);
            }
        },
        [isDragging, duration, seek]
    );

    const handleMouseUp = useCallback(
        (event: MouseEvent) => {
            if (!isDragging || !trackRef.current || duration === 0) return;

            const rect = trackRef.current.getBoundingClientRect();
            const deltaX = event.clientX - dragStartXRef.current;

            if (Math.abs(deltaX) <= DRAG_THRESHOLD) {
                // Click to seek
                const clickX = event.clientX - rect.left;
                const trackWidth = rect.width;
                const positionRatio = clickX / trackWidth;
                const newTime = Math.max(0, Math.min(duration, positionRatio * duration));
                seek(newTime);
            }

            setIsDragging(false);
        },
        [isDragging, duration, seek]
    );

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // ========================================
    // Beat rendering
    // ========================================

    // Calculate visible time range based on zoom
    const visibleDuration = duration / zoomLevel;

    // Calculate scroll offset to center on current time when zoomed
    const scrollOffset = useMemo(() => {
        if (zoomLevel <= 1) return 0;
        const halfVisible = visibleDuration / 2;
        return Math.max(0, Math.min(duration - visibleDuration, currentTime - halfVisible));
    }, [currentTime, duration, visibleDuration, zoomLevel]);

    const startTime = scrollOffset;
    const endTime = scrollOffset + visibleDuration;

    // Filter beats to visible range
    const displayBeats = useMemo(() => {
        const visible = beats.filter(beat =>
            beat.timestamp >= startTime - 0.1 &&
            beat.timestamp <= endTime + 0.1
        );

        // Limit for performance
        if (visible.length <= 150) return visible;
        const step = visible.length / 150;
        const sampled: CompositeBeat[] = [];
        for (let i = 0; i < visible.length; i += step) {
            sampled.push(visible[Math.floor(i)]);
        }
        return sampled;
    }, [beats, startTime, endTime]);

    // Playhead position
    const playheadPercent = useMemo(() => {
        if (currentTime < startTime || currentTime > endTime) return -1;
        return ((currentTime - startTime) / visibleDuration) * 100;
    }, [currentTime, startTime, endTime, visibleDuration]);

    return (
        <div className="difficulty-conversion-baseline">
            <div className="difficulty-conversion-baseline-label">
                Composite Baseline ({beats.length} beats)
            </div>
            <div className="difficulty-conversion-baseline-timeline">
                <div
                    ref={trackRef}
                    className={`difficulty-conversion-baseline-track difficulty-conversion-baseline-track--draggable ${isDragging ? 'difficulty-conversion-baseline-track--dragging' : ''}`}
                    onMouseDown={handleMouseDown}
                    role="slider"
                    tabIndex={0}
                    aria-label="Composite baseline timeline"
                    aria-valuemin={0}
                    aria-valuemax={duration}
                    aria-valuenow={currentTime}
                >
                    {displayBeats.map((beat, index) => {
                        const leftPercent = ((beat.timestamp - startTime) / visibleDuration) * 100;
                        const size = 4 + (beat.intensity || 0.5) * 6;

                        return (
                            <div
                                key={index}
                                className="difficulty-conversion-baseline-marker"
                                style={{
                                    left: `${leftPercent}%`,
                                    width: `${size}px`,
                                    height: `${size}px`,
                                    backgroundColor: DIFFICULTY_COLORS.medium,
                                }}
                                title={`${beat.timestamp.toFixed(3)}s`}
                            />
                        );
                    })}
                    {playheadPercent >= 0 && playheadPercent <= 100 && (
                        <div
                            className="difficulty-conversion-baseline-playhead"
                            style={{ left: `${playheadPercent}%` }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Diff timeline showing ghost beats, active beats, and added beats
 */
interface DiffTimelineProps {
    /** Composite beats (source) */
    compositeBeats: CompositeBeat[];
    /** Variant beats (result) */
    variantBeats: VariantBeat[];
    /** Beats removed from composite (ghost beats) */
    ghostBeats: CompositeBeat[];
    /** Beats added to variant */
    addedBeats: VariantBeat[];
    /** Total duration */
    duration: number;
    /** Variant color */
    color: string;
    /** Current playback time */
    currentTime?: number;
    /** Zoom level */
    zoomLevel?: number;
}

function DiffTimeline({
    ghostBeats,
    variantBeats,
    addedBeats,
    duration,
    color,
    currentTime = 0,
    zoomLevel = 1,
}: DiffTimelineProps) {
    const visibleDuration = duration / zoomLevel;

    const scrollOffset = useMemo(() => {
        if (zoomLevel <= 1) return 0;
        const halfVisible = visibleDuration / 2;
        return Math.max(0, Math.min(duration - visibleDuration, currentTime - halfVisible));
    }, [currentTime, duration, visibleDuration, zoomLevel]);

    const startTime = scrollOffset;
    const endTime = scrollOffset + visibleDuration;

    // Filter active beats (present in variant)
    const activeBeats = useMemo(() => {
        return variantBeats.filter(beat =>
            beat.timestamp >= startTime - 0.1 &&
            beat.timestamp <= endTime + 0.1
        );
    }, [variantBeats, startTime, endTime]);

    // Filter ghost beats (removed from composite)
    const visibleGhostBeats = useMemo(() => {
        return ghostBeats.filter(beat =>
            beat.timestamp >= startTime - 0.1 &&
            beat.timestamp <= endTime + 0.1
        );
    }, [ghostBeats, startTime, endTime]);

    // Filter added beats
    const visibleAddedBeats = useMemo(() => {
        return addedBeats.filter(beat =>
            beat.timestamp >= startTime - 0.1 &&
            beat.timestamp <= endTime + 0.1
        );
    }, [addedBeats, startTime, endTime]);

    // Playhead position
    const playheadPercent = useMemo(() => {
        if (currentTime < startTime || currentTime > endTime) return -1;
        return ((currentTime - startTime) / visibleDuration) * 100;
    }, [currentTime, startTime, endTime, visibleDuration]);

    return (
        <div className="difficulty-conversion-diff-timeline">
            <div className="difficulty-conversion-diff-track">
                {/* Ghost beats (removed) */}
                {visibleGhostBeats.map((beat, index) => {
                    const leftPercent = ((beat.timestamp - startTime) / visibleDuration) * 100;
                    return (
                        <div
                            key={`ghost-${index}`}
                            className="difficulty-conversion-diff-marker difficulty-conversion-diff-marker--ghost"
                            style={{ left: `${leftPercent}%` }}
                            title={`${beat.timestamp.toFixed(3)}s (removed)`}
                        />
                    );
                })}

                {/* Active beats (present in variant) */}
                {activeBeats.map((beat, index) => {
                    const leftPercent = ((beat.timestamp - startTime) / visibleDuration) * 100;
                    const size = 4 + (beat.intensity || 0.5) * 6;
                    return (
                        <div
                            key={`active-${index}`}
                            className="difficulty-conversion-diff-marker difficulty-conversion-diff-marker--active"
                            style={{
                                left: `${leftPercent}%`,
                                width: `${size}px`,
                                height: `${size}px`,
                                backgroundColor: color,
                            }}
                            title={`${beat.timestamp.toFixed(3)}s`}
                        />
                    );
                })}

                {/* Added beats */}
                {visibleAddedBeats.map((beat, index) => {
                    const leftPercent = ((beat.timestamp - startTime) / visibleDuration) * 100;
                    return (
                        <div
                            key={`added-${index}`}
                            className="difficulty-conversion-diff-marker difficulty-conversion-diff-marker--added"
                            style={{ left: `${leftPercent}%` }}
                            title={`${beat.timestamp.toFixed(3)}s (added)`}
                        />
                    );
                })}

                {/* Playhead */}
                {playheadPercent >= 0 && playheadPercent <= 100 && (
                    <div
                        className="difficulty-conversion-diff-playhead"
                        style={{ left: `${playheadPercent}%` }}
                    />
                )}
            </div>
        </div>
    );
}

/**
 * Conversion metadata display for simplified variants
 */
interface ConversionStatsProps {
    variant: DifficultyVariant;
    ghostBeatCount: number;
    addedBeatCount: number;
}

function ConversionStats({ variant, ghostBeatCount, addedBeatCount }: ConversionStatsProps) {
    // Show conversion metadata for simplified variants
    if (variant.editType === 'simplified' && variant.conversionMetadata) {
        const { conversionMetadata } = variant;
        const reductionPercent = conversionMetadata.totalBeatsBefore > 0
            ? ((conversionMetadata.totalBeatsBefore - conversionMetadata.totalBeatsAfter) /
               conversionMetadata.totalBeatsBefore) * 100
            : 0;

        return (
            <div className="difficulty-conversion-stats difficulty-conversion-stats--simplified">
                <div className="difficulty-conversion-stat">
                    <span className="difficulty-conversion-stat-label">16th → 8th</span>
                    <span className="difficulty-conversion-stat-value">
                        {conversionMetadata.sixteenthToEighth}
                    </span>
                </div>
                <div className="difficulty-conversion-stat">
                    <span className="difficulty-conversion-stat-label">Removed</span>
                    <span className="difficulty-conversion-stat-value">
                        {ghostBeatCount}
                    </span>
                </div>
                <div className="difficulty-conversion-stat">
                    <span className="difficulty-conversion-stat-label">Reduction</span>
                    <span className="difficulty-conversion-stat-value">
                        {reductionPercent.toFixed(0)}%
                    </span>
                </div>
            </div>
        );
    }

    // Show enhancement metadata for enhanced variants
    if ((variant.editType === 'pattern_inserted' || variant.editType === 'interpolated') &&
        variant.enhancementMetadata) {
        const { enhancementMetadata } = variant;
        const increasePercent = enhancementMetadata.totalBeatsBefore > 0
            ? ((enhancementMetadata.totalBeatsAfter - enhancementMetadata.totalBeatsBefore) /
               enhancementMetadata.totalBeatsBefore) * 100
            : 0;

        return (
            <div className="difficulty-conversion-stats difficulty-conversion-stats--enhanced">
                <div className="difficulty-conversion-stat">
                    <span className="difficulty-conversion-stat-label">Patterns</span>
                    <span className="difficulty-conversion-stat-value">
                        {enhancementMetadata.patternsInserted}
                    </span>
                </div>
                <div className="difficulty-conversion-stat">
                    <span className="difficulty-conversion-stat-label">Added</span>
                    <span className="difficulty-conversion-stat-value">
                        {addedBeatCount}
                    </span>
                </div>
                <div className="difficulty-conversion-stat">
                    <span className="difficulty-conversion-stat-label">Increase</span>
                    <span className="difficulty-conversion-stat-value">
                        +{increasePercent.toFixed(0)}%
                    </span>
                </div>
            </div>
        );
    }

    // Show "unedited" for natural difficulty
    if (variant.editType === 'none') {
        return (
            <div className="difficulty-conversion-stats difficulty-conversion-stats--none">
                <div className="difficulty-conversion-stat difficulty-conversion-stat--full">
                    <span className="difficulty-conversion-stat-label">Status</span>
                    <span className="difficulty-conversion-stat-value">
                        No modifications
                    </span>
                </div>
            </div>
        );
    }

    return null;
}

/**
 * Single difficulty conversion column
 */
interface DifficultyConversionColumnProps {
    difficulty: DifficultyLevel;
    variant: DifficultyVariant;
    isNatural: boolean;
    compositeBeats: CompositeBeat[];
    duration: number;
    color: string;
    currentTime?: number;
    zoomLevel?: number;
}

function DifficultyConversionColumn({
    difficulty,
    variant,
    isNatural,
    compositeBeats,
    duration,
    color,
    currentTime,
    zoomLevel = 1,
}: DifficultyConversionColumnProps) {
    // Calculate ghost beats and added beats
    const ghostBeats = useMemo(
        () => detectGhostBeats(compositeBeats, variant.beats),
        [compositeBeats, variant.beats]
    );

    const addedBeats = useMemo(
        () => detectAddedBeats(compositeBeats, variant.beats),
        [compositeBeats, variant.beats]
    );

    return (
        <div
            className={`difficulty-conversion-column ${isNatural ? 'difficulty-conversion-column--natural' : ''}`}
            style={{ '--variant-color': color } as React.CSSProperties}
        >
            <ConversionHeader
                difficulty={difficulty}
                isNatural={isNatural}
                editType={variant.editType}
                color={color}
            />

            <div className="difficulty-conversion-beat-count">
                <span className="difficulty-conversion-beat-count-value">{variant.beats.length}</span>
                <span className="difficulty-conversion-beat-count-label">beats</span>
            </div>

            <DiffTimeline
                compositeBeats={compositeBeats}
                variantBeats={variant.beats}
                ghostBeats={ghostBeats}
                addedBeats={addedBeats}
                duration={duration}
                color={color}
                currentTime={currentTime}
                zoomLevel={zoomLevel}
            />

            <ConversionStats
                variant={variant}
                ghostBeatCount={ghostBeats.length}
                addedBeatCount={addedBeats.length}
            />
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

/**
 * DifficultyConversionPanel
 *
 * Visualizes how the composite stream is converted to difficulty variants.
 * Shows the diff between composite baseline and each variant.
 */
export function DifficultyConversionPanel({
    rhythm,
    currentTime = 0,
    duration: propDuration,
    isPlaying: _isPlaying = false,
    onSeek: _onSeek,
    className,
}: DifficultyConversionPanelProps) {
    // Get data from rhythm
    const variants = rhythm.difficultyVariants;
    const naturalDifficulty = rhythm.metadata.naturalDifficulty;
    const compositeBeats = rhythm.composite.beats;

    // Zoom state
    const [zoomLevel, setZoomLevel] = useState(1);

    // Get duration
    const duration = useMemo(() => {
        if (propDuration && propDuration > 0) return propDuration;
        if (rhythm.metadata.duration > 0) return rhythm.metadata.duration;

        // Estimate from composite beats
        if (compositeBeats.length === 0) return 0;
        const maxTime = Math.max(...compositeBeats.map(b => b.timestamp));
        return maxTime + 1;
    }, [propDuration, rhythm.metadata.duration, compositeBeats]);

    // Difficulty levels in display order
    const difficulties: DifficultyLevel[] = ['easy', 'medium', 'hard'];

    // Calculate summary stats
    const summaryStats = useMemo(() => {
        const counts = {
            easy: variants.easy.beats.length,
            medium: variants.medium.beats.length,
            hard: variants.hard.beats.length,
        };

        return {
            compositeBeats: compositeBeats.length,
            variantCounts: counts,
            naturalDifficulty,
        };
    }, [variants, compositeBeats, naturalDifficulty]);

    return (
        <div className={`difficulty-conversion-panel ${className || ''}`}>
            {/* Header */}
            <div className="difficulty-conversion-panel-header">
                <div className="difficulty-conversion-panel-title">
                    <GitBranch size={18} />
                    <span>Difficulty Conversion</span>
                </div>
                <div className="difficulty-conversion-panel-summary">
                    <span className="difficulty-conversion-panel-summary-item">
                        Composite: {summaryStats.compositeBeats} beats
                    </span>
                    <span className="difficulty-conversion-panel-summary-divider">→</span>
                    <span className="difficulty-conversion-panel-summary-item">
                        E: {summaryStats.variantCounts.easy} |
                        M: {summaryStats.variantCounts.medium} |
                        H: {summaryStats.variantCounts.hard}
                    </span>
                </div>
                <ZoomControls
                    zoomLevel={zoomLevel}
                    onZoomChange={setZoomLevel}
                    minZoom={0.5}
                    maxZoom={4}
                    size="sm"
                />
            </div>

            {/* Natural difficulty info banner */}
            <div className="difficulty-conversion-natural-info">
                <span className="difficulty-conversion-natural-label">Natural Difficulty:</span>
                <span
                    className="difficulty-conversion-natural-value"
                    style={{ color: DIFFICULTY_COLORS[naturalDifficulty] }}
                >
                    {naturalDifficulty.charAt(0).toUpperCase() + naturalDifficulty.slice(1)}
                </span>
                <span className="difficulty-conversion-natural-hint">
                    (The unedited variant closest to the detected rhythm density)
                </span>
            </div>

            {/* Composite baseline timeline */}
            <CompositeBaselineTimeline
                beats={compositeBeats}
                duration={duration}
                currentTime={currentTime}
                zoomLevel={zoomLevel}
            />

            {/* Side-by-side difficulty columns */}
            <div className="difficulty-conversion-columns">
                {difficulties.map((difficulty) => (
                    <DifficultyConversionColumn
                        key={difficulty}
                        difficulty={difficulty}
                        variant={variants[difficulty]}
                        isNatural={difficulty === naturalDifficulty}
                        compositeBeats={compositeBeats}
                        duration={duration}
                        color={DIFFICULTY_COLORS[difficulty]}
                        currentTime={currentTime}
                        zoomLevel={zoomLevel}
                    />
                ))}
            </div>

            {/* Legend */}
            <div className="difficulty-conversion-legend">
                <div className="difficulty-conversion-legend-title">Beat Types:</div>
                <div className="difficulty-conversion-legend-items">
                    <div className="difficulty-conversion-legend-item">
                        <span className="difficulty-conversion-legend-marker difficulty-conversion-legend-marker--active" />
                        <span>Active (present)</span>
                    </div>
                    <div className="difficulty-conversion-legend-item">
                        <span className="difficulty-conversion-legend-marker difficulty-conversion-legend-marker--ghost" />
                        <span>Ghost (removed)</span>
                    </div>
                    <div className="difficulty-conversion-legend-item">
                        <span className="difficulty-conversion-legend-marker difficulty-conversion-legend-marker--added" />
                        <span>Added (new)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DifficultyConversionPanel;
