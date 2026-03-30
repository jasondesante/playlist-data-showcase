/**
 * DDRModeVisualization Component
 *
 * Simple DDR pad visualization: 4 arrow buttons in a cross layout
 * that light up in sync with the chart during audio playback.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import './DDRModeVisualization.css';
import { cn } from '../../utils/cn';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useTrackDuration } from '../../hooks/useTrackDuration';

// ============================================================
// Types
// ============================================================

export interface DDRVisualizationBeat {
    timestamp: number;
    beatIndex: number;
    key: 'up' | 'down' | 'left' | 'right';
    direction?: 'up' | 'down' | 'stable' | 'none';
    isPitchInfluenced?: boolean;
}

export interface DDRModeVisualizationProps {
    beats: DDRVisualizationBeat[];
    onBeatClick?: (beat: DDRVisualizationBeat) => void;
    selectedBeatIndex?: number;
    disabled?: boolean;
    windowSize?: number;
    size?: number;
    defaultCollapsed?: boolean;
    className?: string;
}

// ============================================================
// Helpers
// ============================================================

function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** How long (ms) a button stays fully lit after a beat hit */
const FLASH_DURATION = 120;
/** How long (ms) the fade-out lasts after the flash */
const FADE_DURATION = 180;

// ============================================================
// Component
// ============================================================

export function DDRModeVisualization({
    beats,
    disabled = false,
    className,
}: DDRModeVisualizationProps) {
    const currentTime = useAudioPlayerStore((s) => s.currentTime);
    const playbackState = useAudioPlayerStore((s) => s.playbackState);
    const resume = useAudioPlayerStore((s) => s.resume);
    const pause = useAudioPlayerStore((s) => s.pause);
    const play = useAudioPlayerStore((s) => s.play);
    const currentUrl = useAudioPlayerStore((s) => s.currentUrl);
    const { selectedTrack } = usePlaylistStore();
    const duration = useTrackDuration();

    const isPlaying = playbackState === 'playing';

    // Smooth interpolated time via RAF
    const [smoothTime, setSmoothTime] = useState(currentTime);
    const rafRef = useRef<number | null>(null);
    const lastAudioRef = useRef({ time: currentTime, ts: performance.now() });
    const isPlayingRef = useRef(isPlaying);

    // Keep audio time ref in sync
    useEffect(() => {
        lastAudioRef.current = { time: currentTime, ts: performance.now() };
    }, [currentTime]);

    // Detect play state transitions
    const prevPlayingRef = useRef(isPlaying);
    useEffect(() => {
        isPlayingRef.current = isPlaying;
        if (isPlaying && !prevPlayingRef.current) {
            lastAudioRef.current = { time: currentTime, ts: performance.now() };
            setSmoothTime(currentTime);
        }
        prevPlayingRef.current = isPlaying;
    }, [isPlaying, currentTime]);

    // RAF loop
    useEffect(() => {
        if (!isPlaying) {
            setSmoothTime(currentTime);
            return;
        }
        const tick = () => {
            const { time, ts } = lastAudioRef.current;
            const t = Math.min(time + (performance.now() - ts) / 1000, duration ?? 9999);
            setSmoothTime(t);
            if (isPlayingRef.current && t < (duration ?? 9999)) {
                rafRef.current = requestAnimationFrame(tick);
            }
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [isPlaying, duration]);

    // Sync when not playing
    useEffect(() => { if (!isPlaying) setSmoothTime(currentTime); }, [currentTime, isPlaying]);

    // Determine which buttons are active/fading
    const activeButtons = useMemo((): Record<string, 'active' | 'fade' | null> => {
        const result: Record<string, 'active' | 'fade' | null> = {
            up: null, down: null, left: null, right: null,
        };
        if (beats.length === 0) return result;

        const nowMs = smoothTime * 1000;
        const windowMs = FLASH_DURATION + FADE_DURATION;

        // Binary search for the first beat at or past smoothTime
        let lo = 0, hi = beats.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (beats[mid].timestamp * 1000 < nowMs) lo = mid + 1;
            else hi = mid;
        }
        // lo is now the index of the first beat at or after smoothTime.
        // Check a small window before and after for flash/fade.
        const start = Math.max(0, lo - 2);
        const end = Math.min(beats.length, lo + 1);

        for (let i = start; i < end; i++) {
            const beat = beats[i];
            const beatMs = beat.timestamp * 1000;
            const age = nowMs - beatMs; // positive = beat is in the past

            if (age > windowMs || age < -50) continue; // outside the window (allow 50ms early for precision)

            const key = beat.key;
            if (age < 0) {
                // Beat hasn't quite hit yet — skip
                continue;
            }
            if (age < FLASH_DURATION) {
                result[key] = 'active';
            } else {
                // Only set fade if we don't already have an active for this key
                if (result[key] !== 'active') {
                    result[key] = 'fade';
                }
            }
        }

        return result;
    }, [beats, smoothTime]);

    // Play/pause
    const handlePlayPause = useCallback(() => {
        if (isPlaying) {
            pause();
        } else if (selectedTrack && !currentUrl) {
            play(selectedTrack.audio_url);
        } else {
            resume();
        }
    }, [isPlaying, pause, resume, play, selectedTrack, currentUrl]);

    if (beats.length === 0) {
        return (
            <div className={cn('ddr-viz', 'ddr-viz--empty', className)}>
                <p>No button mapping data</p>
            </div>
        );
    }

    return (
        <div className={cn('ddr-viz', className)}>
            {/* DDR pad cross layout */}
            <div className="ddr-pad">
                {/* Up */}
                <div className={cn('ddr-pad-cell--up', 'ddr-btn', 'ddr-btn--up',
                    activeButtons.up ? `ddr-btn--${activeButtons.up}` : false
                )}>
                    <ArrowUp size={28} className="ddr-btn__icon" />
                    <div className="ddr-btn__flash" />
                </div>

                {/* Left */}
                <div className={cn('ddr-pad-cell--left', 'ddr-btn', 'ddr-btn--left',
                    activeButtons.left ? `ddr-btn--${activeButtons.left}` : false
                )}>
                    <ArrowLeft size={28} className="ddr-btn__icon" />
                    <div className="ddr-btn__flash" />
                </div>

                {/* Right */}
                <div className={cn('ddr-pad-cell--right', 'ddr-btn', 'ddr-btn--right',
                    activeButtons.right ? `ddr-btn--${activeButtons.right}` : false
                )}>
                    <ArrowRight size={28} className="ddr-btn__icon" />
                    <div className="ddr-btn__flash" />
                </div>

                {/* Down */}
                <div className={cn('ddr-pad-cell--down', 'ddr-btn', 'ddr-btn--down',
                    activeButtons.down ? `ddr-btn--${activeButtons.down}` : false
                )}>
                    <ArrowDown size={28} className="ddr-btn__icon" />
                    <div className="ddr-btn__flash" />
                </div>
            </div>

            {/* Play/pause + time */}
            <div className="ddr-viz-controls">
                <button
                    className="ddr-viz-play"
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
                <span className="ddr-viz-time">
                    {formatTime(smoothTime)} / {formatTime(duration)}
                </span>
            </div>
        </div>
    );
}

export default DDRModeVisualization;
