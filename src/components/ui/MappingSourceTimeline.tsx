/**
 * MappingSourceTimeline Component
 *
 * A timeline visualization showing where each button assignment came from:
 * pitch detection influence or pattern library influence. Allows comparing
 * mapping sources across all 4 difficulty levels.
 *
 * Features:
 * - Audio-synced horizontal timeline with playhead
 * - Each beat colored by mapping source (green=pitch, amber=pattern)
 * - Pattern-sourced beats show pattern name on hover
 * - Difficulty switcher to compare across Natural/Easy/Medium/Hard
 * - Summary stats showing pitch vs pattern counts
 * - Filter to show only pitch or only pattern beats
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, GitBranch, Music } from 'lucide-react';
import './MappingSourceTimeline.css';
import { cn } from '../../utils/cn';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useTrackDuration } from '../../hooks/useTrackDuration';
import {
    useAllDifficultyLevels,
    useBeatDetectionActions,
} from '../../store/beatDetectionStore';
import { useSelectedDifficulty } from '../../hooks/useLevelGeneration';
import { DifficultySwitcher } from './DifficultySwitcher';
import type {
    DifficultyLevel,
    AllDifficultiesWithNatural,
} from '../../types/levelGeneration';
import type {
    ChartedBeat,
    ChartedBeatMap,
    ControllerMode,
    GeneratedLevel,
} from 'playlist-data-engine';
import { getPatternById, DDR_PATTERN_LIBRARY, GUITAR_HERO_PATTERN_LIBRARY } from 'playlist-data-engine';

// ============================================================
// Types
// ============================================================

export interface MappingSourceTimelineProps {
    className?: string;
}

interface BeatWithSource {
    beat: ChartedBeat;
    index: number;
    mappingSource: 'pitch' | 'pattern' | 'unknown';
    patternName: string | null;
    patternKeys: string[];
}

/** A group of consecutive beats sharing the same patternId */
interface PatternGroup {
    patternId: string;
    startIdx: number;
    endIdx: number;
    length: number;
}

// ============================================================
// Constants
// ============================================================

const DDR_BUTTON_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    up: { icon: <ArrowUp size={12} />, color: '#eab308', label: 'Up' },
    down: { icon: <ArrowDown size={12} />, color: '#3b82f6', label: 'Down' },
    left: { icon: <ArrowLeft size={12} />, color: '#a855f7', label: 'Left' },
    right: { icon: <ArrowRight size={12} />, color: '#22c55e', label: 'Right' },
};

const GH_BUTTON_CONFIG: Record<string, { color: string; label: string }> = {
    '1': { color: '#ef4444', label: 'Fret 1' },
    '2': { color: '#f97316', label: 'Fret 2' },
    '3': { color: '#eab308', label: 'Fret 3' },
    '4': { color: '#22c55e', label: 'Fret 4' },
    '5': { color: '#3b82f6', label: 'Fret 5' },
};

const SOURCE_COLORS = {
    pitch: '#22c55e',
    pattern: '#f59e0b',
    unknown: '#6b7280',
};

// ============================================================
// Helpers
// ============================================================

function getButtonConfig(key: string | undefined, mode: ControllerMode): { icon?: React.ReactNode; color: string; label: string } {
    if (!key) return { color: '#6b7280', label: 'None' };
    if (mode === 'ddr') return DDR_BUTTON_CONFIG[key] ?? { color: '#6b7280', label: key };
    return GH_BUTTON_CONFIG[key] ?? { color: '#6b7280', label: key };
}

function resolvePatternName(patternId: string | undefined, mode: ControllerMode): { name: string | null; keys: string[] } {
    if (!patternId) return { name: null, keys: [] };
    const library = mode === 'ddr' ? DDR_PATTERN_LIBRARY : GUITAR_HERO_PATTERN_LIBRARY;
    const pattern = getPatternById(library as any, patternId);
    if (!pattern) return { name: patternId, keys: [] };
    return { name: pattern.name, keys: pattern.keys as string[] };
}

function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTimePrecise(seconds: number): string {
    if (!Number.isFinite(seconds)) return '0:00.00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toFixed(2).padStart(5, '0')}`;
}

// ============================================================
// Main Component
// ============================================================

export function MappingSourceTimeline({ className }: MappingSourceTimelineProps) {
    const allDifficulties = useAllDifficultyLevels();
    const selectedDifficulty = useSelectedDifficulty();
    const actions = useBeatDetectionActions();

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

    // Seek helper
    const seek = useCallback((time: number) => {
        storeSeek(time, currentUrl || selectedTrack?.audio_url);
    }, [storeSeek, currentUrl, selectedTrack?.audio_url]);

    // Animation state
    const [smoothTime, setSmoothTime] = useState(currentTime);
    const animationFrameRef = useRef<number | null>(null);
    const lastAudioTimeRef = useRef({ time: currentTime, timestamp: performance.now() });
    const isPlayingRef = useRef(isPlaying);
    const smoothTimeRef = useRef(smoothTime);
    const prevIsPlayingRef = useRef(isPlaying);

    // Drag state
    const [isDragging, setIsDragging] = useState(false);
    const trackRef = useRef<HTMLDivElement>(null);
    const dragStartXRef = useRef(0);
    const dragStartTimeRef = useRef(0);

    // Quick scroll state
    const quickScrollRef = useRef<HTMLDivElement>(null);
    const [isQuickScrollDragging, setIsQuickScrollDragging] = useState(false);

    // Hover
    const [hoveredBeat, setHoveredBeat] = useState<BeatWithSource | null>(null);

    // Filter state
    type SourceFilter = 'all' | 'pitch' | 'pattern';
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

    // Zoom
    const MAX_ZOOM = 8;
    const MIN_ZOOM = 0.03;
    const [zoomLevel, setZoomLevel] = useState(0.5);
    const baseAnticipationWindow = 2.0;
    const basePastWindow = 4.0;
    const anticipationWindow = baseAnticipationWindow / zoomLevel;
    const pastWindow = basePastWindow / zoomLevel;
    const totalWindow = pastWindow + anticipationWindow;

    // Get current level and its chart
    const levels = allDifficulties as AllDifficultiesWithNatural | null;
    const currentLevel = levels?.[selectedDifficulty as keyof AllDifficultiesWithNatural] as GeneratedLevel | undefined;
    const chart: ChartedBeatMap | null = currentLevel?.chart ?? null;
    const controllerMode: ControllerMode = currentLevel?.metadata?.controllerMode ?? 'ddr';
    const trackDuration = duration || chart?.duration || 0;

    // Resolve beats with mapping source info
    const beatsWithSource = useMemo((): BeatWithSource[] => {
        if (!chart?.beats) return [];
        return chart.beats.map((beat, index) => {
            const source: BeatWithSource['mappingSource'] = beat.mappingSource ?? 'unknown';
            const { name, keys } = resolvePatternName(beat.patternId, controllerMode);
            return {
                beat,
                index,
                mappingSource: source,
                patternName: source === 'pattern' ? name : null,
                patternKeys: source === 'pattern' ? keys : [],
            };
        });
    }, [chart?.beats, controllerMode]);

    // Filtered beats
    const filteredBeats = useMemo(() => {
        if (sourceFilter === 'all') return beatsWithSource;
        return beatsWithSource.filter((b) => b.mappingSource === sourceFilter);
    }, [beatsWithSource, sourceFilter]);

    // Stats
    const stats = useMemo(() => {
        const total = beatsWithSource.length;
        const pitchCount = beatsWithSource.filter((b) => b.mappingSource === 'pitch').length;
        const patternCount = beatsWithSource.filter((b) => b.mappingSource === 'pattern').length;
        const unknownCount = total - pitchCount - patternCount;
        return { total, pitchCount, patternCount, unknownCount };
    }, [beatsWithSource]);

    // Pattern groups: consecutive beats sharing the same patternId
    const patternGroups = useMemo((): PatternGroup[] => {
        const groups: PatternGroup[] = [];
        let i = 0;
        while (i < beatsWithSource.length) {
            const bws = beatsWithSource[i];
            if (bws.mappingSource !== 'pattern' || !bws.beat.patternId) {
                i++;
                continue;
            }
            const pid = bws.beat.patternId;
            const start = i;
            while (i < beatsWithSource.length && beatsWithSource[i].mappingSource === 'pattern' && beatsWithSource[i].beat.patternId === pid) {
                i++;
            }
            if (i - start >= 2) {
                groups.push({ patternId: pid, startIdx: start, endIdx: i - 1, length: i - start });
            }
        }
        return groups;
    }, [beatsWithSource]);

    // Set of beat indices belonging to a multi-beat pattern group
    const patternGroupIndexSet = useMemo(() => {
        const set = new Set<number>();
        for (const g of patternGroups) {
            for (let i = g.startIdx; i <= g.endIdx; i++) set.add(i);
        }
        return set;
    }, [patternGroups]);

    // Map from beat index to its pattern group
    const beatIndexToGroup = useMemo(() => {
        const map = new Map<number, PatternGroup>();
        for (const g of patternGroups) {
            for (let i = g.startIdx; i <= g.endIdx; i++) map.set(i, g);
        }
        return map;
    }, [patternGroups]);

    // Beat counts per difficulty
    const beatCounts = useMemo((): Record<DifficultyLevel, number> => {
        if (!levels) return { natural: 0, easy: 0, medium: 0, hard: 0 };
        return {
            natural: (levels.natural?.chart?.beats?.length) ?? 0,
            easy: levels.easy?.chart?.beats?.length ?? 0,
            medium: levels.medium?.chart?.beats?.length ?? 0,
            hard: levels.hard?.chart?.beats?.length ?? 0,
        };
    }, [levels]);

    // Keep refs in sync
    useEffect(() => { lastAudioTimeRef.current = { time: currentTime, timestamp: performance.now() }; }, [currentTime]);
    useEffect(() => { smoothTimeRef.current = smoothTime; }, [smoothTime]);

    // Playback transitions
    useEffect(() => {
        isPlayingRef.current = isPlaying;
        if (isPlaying && !prevIsPlayingRef.current) {
            lastAudioTimeRef.current = { time: currentTime, timestamp: performance.now() };
            setSmoothTime(currentTime);
        }
        prevIsPlayingRef.current = isPlaying;
    }, [isPlaying, currentTime]);

    // Animation loop
    useEffect(() => {
        if (!isPlaying) { setSmoothTime(currentTime); return; }
        const animate = () => {
            const now = performance.now();
            const { time, timestamp } = lastAudioTimeRef.current;
            const elapsed = (now - timestamp) / 1000;
            const interpolated = Math.min(time + elapsed, duration || 9999);
            setSmoothTime(interpolated);
            if (isPlayingRef.current && interpolated < (duration || 9999)) {
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };
        animationFrameRef.current = requestAnimationFrame(animate);
        return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
    }, [isPlaying, duration]);

    useEffect(() => { if (!isPlaying) setSmoothTime(currentTime); }, [currentTime, isPlaying]);

    // Calculate position
    const calculatePosition = useCallback((timestamp: number) => {
        return 0.5 + ((timestamp - smoothTime) / anticipationWindow) * 0.5;
    }, [smoothTime, anticipationWindow]);

    // Visible beats
    const visibleBeats = useMemo(() => {
        const windowStart = smoothTime - pastWindow;
        const windowEnd = smoothTime + anticipationWindow;
        return filteredBeats
            .filter((b) => b.beat.timestamp >= windowStart && b.beat.timestamp <= windowEnd)
            .map(({ beat, index, mappingSource, patternName, patternKeys }) => {
                const position = calculatePosition(beat.timestamp);
                if (position < 0 || position > 1) return null;
                return {
                    beat,
                    index,
                    mappingSource,
                    patternName,
                    patternKeys,
                    position,
                    isPast: beat.timestamp < smoothTime - 0.05,
                    isCurrent: !isPast(beat) && beat.timestamp < smoothTime + 0.1,
                };
            })
            .filter((vb): vb is NonNullable<typeof vb> => vb !== null);

        function isPast(beat: ChartedBeat) { return beat.timestamp < smoothTime - 0.05; }
    }, [filteredBeats, smoothTime, pastWindow, anticipationWindow, calculatePosition]);

    // Visible pattern groups for connecting line rendering
    const visiblePatternGroups = useMemo(() => {
        const groupDataMap = new Map<string, { positions: number[]; totalLength: number; pid: string }>();

        for (const vb of visibleBeats) {
            const group = beatIndexToGroup.get(vb.index);
            if (!group) continue;
            const key = `${group.patternId}:${group.startIdx}`;
            const existing = groupDataMap.get(key);
            if (existing) {
                existing.positions.push(vb.position);
            } else {
                groupDataMap.set(key, { positions: [vb.position], totalLength: group.length, pid: group.patternId });
            }
        }

        return Array.from(groupDataMap.entries())
            .filter(([, data]) => data.positions.length >= 2)
            .map(([key, data]) => {
                const sorted = data.positions.sort((a, b) => a - b);
                return {
                    key,
                    patternId: data.pid,
                    leftPosition: sorted[0],
                    rightPosition: sorted[sorted.length - 1],
                    visibleBeatCount: sorted.length,
                    totalBeatCount: data.totalLength,
                };
            });
    }, [visibleBeats, beatIndexToGroup]);

    // Drag-to-scrub
    const DRAG_THRESHOLD = 5;
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!trackRef.current) return;
        e.preventDefault();
        setIsDragging(true);
        dragStartXRef.current = e.clientX;
        dragStartTimeRef.current = smoothTimeRef.current;
    }, []);
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const deltaX = e.clientX - dragStartXRef.current;
        if (Math.abs(deltaX) > DRAG_THRESHOLD) {
            const timePerPixel = totalWindow / rect.width;
            seek(Math.max(0, Math.min(duration || 9999, dragStartTimeRef.current - deltaX * timePerPixel)));
        }
    }, [isDragging, totalWindow, duration, seek]);
    const handleMouseUp = useCallback((e: MouseEvent) => {
        if (!isDragging || !trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const deltaX = e.clientX - dragStartXRef.current;
        if (Math.abs(deltaX) <= DRAG_THRESHOLD) {
            const ratio = (e.clientX - rect.left) / rect.width;
            seek(Math.max(0, Math.min(duration || 9999, (smoothTimeRef.current - pastWindow) + ratio * totalWindow)));
        }
        setIsDragging(false);
    }, [isDragging, totalWindow, duration, seek, pastWindow]);
    useEffect(() => {
        if (!isDragging) return;
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Quick scroll handlers
    const handleQuickScrollClick = useCallback((e: React.MouseEvent) => {
        if (!quickScrollRef.current || trackDuration === 0) return;
        const rect = quickScrollRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        seek(ratio * trackDuration);
    }, [trackDuration, seek]);

    const handleQuickScrollDragStart = useCallback((e: React.MouseEvent) => {
        if (!quickScrollRef.current || trackDuration === 0) return;
        e.preventDefault();
        setIsQuickScrollDragging(true);
        const rect = quickScrollRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        seek(ratio * trackDuration);
    }, [trackDuration, seek]);

    useEffect(() => {
        if (!isQuickScrollDragging || trackDuration === 0) return;
        let pendingSeek: number | null = null;
        let rafId: number | null = null;
        const handleMove = (e: MouseEvent) => {
            if (!quickScrollRef.current) return;
            const rect = quickScrollRef.current.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            pendingSeek = ratio * trackDuration;
            if (!rafId) {
                rafId = requestAnimationFrame(() => {
                    if (pendingSeek !== null) { seek(pendingSeek); pendingSeek = null; }
                    rafId = null;
                });
            }
        };
        const handleEnd = () => {
            setIsQuickScrollDragging(false);
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        };
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [isQuickScrollDragging, trackDuration, seek]);

    // Play/pause
    const handlePlayPause = useCallback(() => {
        if (isPlaying) pause();
        else if (selectedTrack && !currentUrl) play(selectedTrack.audio_url);
        else resume();
    }, [isPlaying, pause, resume, play, selectedTrack, currentUrl]);

    // Difficulty change
    const handleDifficultyChange = useCallback((d: DifficultyLevel) => {
        actions.setSelectedDifficulty(d);
    }, [actions]);

    // Empty state
    if (!chart || !chart.beats || chart.beats.length === 0) {
        return (
            <div className={cn('mapping-source-timeline', 'mapping-source-timeline--empty', className)}>
                <p className="mapping-source-empty-message">No mapping source data available. Generate a level first.</p>
            </div>
        );
    }

    const isDDR = controllerMode === 'ddr';
    const pitchPercent = stats.total > 0 ? Math.round((stats.pitchCount / stats.total) * 100) : 0;
    const patternPercent = stats.total > 0 ? Math.round((stats.patternCount / stats.total) * 100) : 0;

    return (
        <div className={cn('mapping-source-timeline', className)}>
            {/* Header with difficulty switcher */}
            <div className="mapping-source-header">
                <div className="mapping-source-header-left">
                    <GitBranch size={16} className="mapping-source-header-icon" />
                    <span className="mapping-source-header-title">Mapping Sources</span>
                </div>
                <DifficultySwitcher
                    selected={selectedDifficulty}
                    onChange={handleDifficultyChange}
                    beatCounts={beatCounts}
                    size="compact"
                    showCounts={true}
                />
            </div>

            {/* Summary bar */}
            <div className="mapping-source-summary">
                <div className="mapping-source-summary-item mapping-source-summary-pitch">
                    <span className="mapping-source-summary-dot" style={{ background: SOURCE_COLORS.pitch }} />
                    <span className="mapping-source-summary-label">Pitch</span>
                    <span className="mapping-source-summary-value">{stats.pitchCount}</span>
                    <span className="mapping-source-summary-pct">({pitchPercent}%)</span>
                </div>
                <div className="mapping-source-summary-item mapping-source-summary-pattern">
                    <span className="mapping-source-summary-dot" style={{ background: SOURCE_COLORS.pattern }} />
                    <span className="mapping-source-summary-label">Pattern</span>
                    <span className="mapping-source-summary-value">{stats.patternCount}</span>
                    <span className="mapping-source-summary-pct">({patternPercent}%)</span>
                </div>
                {stats.unknownCount > 0 && (
                    <div className="mapping-source-summary-item mapping-source-summary-unknown">
                        <span className="mapping-source-summary-dot" style={{ background: SOURCE_COLORS.unknown }} />
                        <span className="mapping-source-summary-label">Unknown</span>
                        <span className="mapping-source-summary-value">{stats.unknownCount}</span>
                    </div>
                )}
                <div className="mapping-source-summary-divider" />
                <div className="mapping-source-summary-item mapping-source-summary-total">
                    <span className="mapping-source-summary-label">Total</span>
                    <span className="mapping-source-summary-value">{stats.total}</span>
                </div>
            </div>

            {/* Filter buttons */}
            <div className="mapping-source-filters">
                <button
                    className={cn('mapping-source-filter-btn', sourceFilter === 'all' && 'mapping-source-filter-btn--active')}
                    onClick={() => setSourceFilter('all')}
                >
                    All ({stats.total})
                </button>
                <button
                    className={cn('mapping-source-filter-btn', 'mapping-source-filter-btn--pitch', sourceFilter === 'pitch' && 'mapping-source-filter-btn--active')}
                    onClick={() => setSourceFilter('pitch')}
                >
                    <Music size={12} /> Pitch ({stats.pitchCount})
                </button>
                <button
                    className={cn('mapping-source-filter-btn', 'mapping-source-filter-btn--pattern', sourceFilter === 'pattern' && 'mapping-source-filter-btn--active')}
                    onClick={() => setSourceFilter('pattern')}
                >
                    <GitBranch size={12} /> Pattern ({stats.patternCount})
                </button>
            </div>

            {/* Proportional bar showing pitch vs pattern split */}
            <div className="mapping-source-bar">
                {stats.pitchCount > 0 && (
                    <div
                        className="mapping-source-bar-fill mapping-source-bar-pitch"
                        style={{ width: `${pitchPercent}%` }}
                        title={`Pitch-influenced: ${stats.pitchCount} beats`}
                    />
                )}
                {stats.patternCount > 0 && (
                    <div
                        className="mapping-source-bar-fill mapping-source-bar-pattern"
                        style={{ width: `${patternPercent}%` }}
                        title={`Pattern-influenced: ${stats.patternCount} beats`}
                    />
                )}
                {stats.unknownCount > 0 && (
                    <div
                        className="mapping-source-bar-fill mapping-source-bar-unknown"
                        style={{ width: `${100 - pitchPercent - patternPercent}%` }}
                        title={`Unknown source: ${stats.unknownCount} beats`}
                    />
                )}
            </div>

            {/* Timeline Track */}
            <div
                ref={trackRef}
                className={cn('mapping-source-track', isDragging && 'mapping-source-track--dragging')}
                onMouseDown={handleMouseDown}
                role="slider"
                aria-label="Mapping source timeline"
                tabIndex={0}
            >
                <div className="mapping-source-track-bg" />

                {/* Pattern group connecting lines */}
                {visiblePatternGroups.map((vg) => (
                    <div
                        key={`pg-${vg.key}`}
                        className="mapping-source-pattern-connector"
                        style={{
                            left: `${vg.leftPosition * 100}%`,
                            width: `${(vg.rightPosition - vg.leftPosition) * 100}%`,
                        }}
                        title={
                            vg.visibleBeatCount < vg.totalBeatCount
                                ? `${vg.patternId} (${vg.visibleBeatCount} of ${vg.totalBeatCount} beats visible)`
                                : `${vg.patternId} (${vg.totalBeatCount} beats)`
                        }
                    />
                ))}

                {/* Beat markers */}
                {visibleBeats.map((vb, index) => {
                    const config = getButtonConfig(vb.beat.requiredKey, controllerMode);
                    const sourceColor = SOURCE_COLORS[vb.mappingSource];

                    return (
                        <div
                            key={`src-${vb.beat.timestamp}-${index}`}
                            className={cn(
                                'mapping-source-marker',
                                vb.isPast && 'mapping-source-marker--past',
                                vb.isCurrent && 'mapping-source-marker--current',
                                vb.beat.isDownbeat && 'mapping-source-marker--downbeat',
                                !vb.beat.isDetected && 'mapping-source-marker--generated',
                                patternGroupIndexSet.has(vb.index) && 'mapping-source-marker--grouped',
                            )}
                            style={{
                                left: `${vb.position * 100}%`,
                                '--source-color': sourceColor,
                                '--btn-color': config.color,
                            } as React.CSSProperties}
                            onMouseEnter={() => setHoveredBeat(vb)}
                            onMouseLeave={() => setHoveredBeat(null)}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            {/* Outer ring = mapping source color */}
                            <span className="mapping-source-marker-ring">
                                {/* Inner icon = button */}
                                {isDDR ? (
                                    <span className="mapping-source-marker-icon" style={{ color: config.color }}>
                                        {config.icon}
                                    </span>
                                ) : (
                                    <span className="mapping-source-marker-fret" style={{ color: config.color }}>
                                        {vb.beat.requiredKey}
                                    </span>
                                )}
                            </span>
                        </div>
                    );
                })}

                {/* Playhead */}
                <div className="mapping-source-playhead" style={{ left: '50%' }}>
                    <div className="mapping-source-playhead-line" />
                </div>
            </div>

            {/* Quick scroll bar */}
            {trackDuration > 0 && (
                <div className="mapping-source-quickscroll">
                    <div
                        ref={quickScrollRef}
                        className="mapping-source-quickscroll-track"
                        onClick={handleQuickScrollClick}
                        onMouseDown={handleQuickScrollDragStart}
                    >
                        {filteredBeats
                            .filter((_, idx) => idx % Math.max(1, Math.floor(filteredBeats.length / 100)) === 0)
                            .map((b, index) => {
                                const position = b.beat.timestamp / trackDuration;
                                return (
                                    <div
                                        key={`qs-${b.beat.timestamp}-${index}`}
                                        className="mapping-source-quickscroll-marker"
                                        style={{
                                            left: `${position * 100}%`,
                                            backgroundColor: SOURCE_COLORS[b.mappingSource],
                                        }}
                                    />
                                );
                            })}

                        <div
                            className="mapping-source-quickscroll-viewport"
                            style={{
                                left: `${Math.max(0, ((smoothTime - pastWindow) / trackDuration) * 100)}%`,
                                width: `${Math.min(100, (totalWindow / trackDuration) * 100)}%`,
                            }}
                        />

                        <div
                            className="mapping-source-quickscroll-position"
                            style={{ left: `${(smoothTime / trackDuration) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Tooltip bar */}
            <div className="mapping-source-tooltip">
                {hoveredBeat ? (
                    <div className="mapping-source-tooltip-content">
                        <div className="mapping-source-tooltip-row">
                            <span className="mapping-source-tooltip-btn" style={{ color: getButtonConfig(hoveredBeat.beat.requiredKey, controllerMode).color }}>
                                {getButtonConfig(hoveredBeat.beat.requiredKey, controllerMode).label}
                            </span>
                            <span className="mapping-source-tooltip-time">{formatTimePrecise(hoveredBeat.beat.timestamp)}</span>
                            <span className="mapping-source-tooltip-source"
                                style={{ color: SOURCE_COLORS[hoveredBeat.mappingSource] }}>
                                {hoveredBeat.mappingSource === 'pitch' ? 'Pitch' : hoveredBeat.mappingSource === 'pattern' ? 'Pattern' : 'Unknown'}
                            </span>
                            {hoveredBeat.beat.isDownbeat && <span className="mapping-source-tooltip-downbeat">Downbeat</span>}
                            {hoveredBeat.beat.isDetected
                                ? <span className="mapping-source-tooltip-det">&lt;10ms</span>
                                : <span className="mapping-source-tooltip-gen">&ge;10ms</span>}
                        </div>
                        {hoveredBeat.beat.sourceBand && (
                            <div className="mapping-source-tooltip-band">
                                <span>Band: </span>
                                <span className="mapping-source-tooltip-band-name">{hoveredBeat.beat.sourceBand}</span>
                            </div>
                        )}
                        {(() => {
                            const isPatternWithInfo = hoveredBeat.mappingSource === 'pattern' && hoveredBeat.patternName;
                            if (!isPatternWithInfo) {
                                return (
                                    <div className="mapping-source-tooltip-pattern" aria-hidden="true" style={{ visibility: 'hidden' }}>
                                        <span className="mapping-source-tooltip-pattern-label">Pattern:</span>
                                        <span className="mapping-source-tooltip-pattern-name">&nbsp;</span>
                                    </div>
                                );
                            }
                            const group = beatIndexToGroup.get(hoveredBeat.index);
                            const posInPattern = group ? (hoveredBeat.index - group.startIdx + 1) : null;
                            const patternLen = group?.length ?? null;
                            return (
                                <div className="mapping-source-tooltip-pattern">
                                    <span className="mapping-source-tooltip-pattern-label">Pattern:</span>
                                    <span className="mapping-source-tooltip-pattern-name">{hoveredBeat.patternName}</span>
                                    {posInPattern !== null && patternLen !== null && patternLen > 1 && (
                                        <span className="mapping-source-tooltip-pattern-position">
                                            beat {posInPattern} of {patternLen}
                                        </span>
                                    )}
                                    {hoveredBeat.patternKeys.length > 0 && (
                                        <span className="mapping-source-tooltip-pattern-keys">
                                            [{hoveredBeat.patternKeys.join(' ')}]
                                        </span>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                ) : (
                    <div className="mapping-source-tooltip-content mapping-source-tooltip-skeleton">
                        <div className="mapping-source-tooltip-row">
                            <span className="mapping-source-tooltip-btn">--</span>
                            <span className="mapping-source-tooltip-time">0:00.00</span>
                            <span className="mapping-source-tooltip-source">--</span>
                        </div>
                        <div className="mapping-source-tooltip-band" aria-hidden="true">
                            <span>&nbsp;</span>
                        </div>
                        <div className="mapping-source-tooltip-pattern" aria-hidden="true">
                            <span>&nbsp;</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="mapping-source-controls">
                <button className="mapping-source-play-btn" onClick={handlePlayPause} title={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? (
                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                            <polygon points="5,3 19,12 5,21" />
                        </svg>
                    )}
                </button>
                <span className="mapping-source-time">{formatTime(smoothTime)} / {formatTime(duration || chart.duration)}</span>
                <span className="mapping-source-visible">{visibleBeats.length} beats visible</span>
                <div className="mapping-source-zoom">
                    <button onClick={() => setZoomLevel((z) => Math.max(z / 1.5, MIN_ZOOM))} disabled={zoomLevel <= MIN_ZOOM} title="Zoom out">-</button>
                    <span onClick={() => setZoomLevel(0.5)} title="Reset zoom">{(zoomLevel * 100).toFixed(0)}%</span>
                    <button onClick={() => setZoomLevel((z) => Math.min(z * 1.5, MAX_ZOOM))} disabled={zoomLevel >= MAX_ZOOM} title="Zoom in">+</button>
                </div>
            </div>
        </div>
    );
}

export default MappingSourceTimeline;
