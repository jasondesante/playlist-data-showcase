/**
 * GuitarHeroModeVisualization Component
 *
 * 5 fret lanes that light up in sync with the chart during audio playback.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import './GuitarHeroModeVisualization.css';
import { cn } from '../../utils/cn';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useTrackDuration } from '../../hooks/useTrackDuration';

// ============================================================
// Types
// ============================================================

export interface GuitarHeroVisualizationBeat {
    timestamp: number;
    beatIndex: number;
    key: '1' | '2' | '3' | '4' | '5';
    direction?: 'up' | 'down' | 'stable' | 'none';
    isPitchInfluenced?: boolean;
    midiNote?: number | null;
}

export interface GuitarHeroModeVisualizationProps {
    beats: GuitarHeroVisualizationBeat[];
    onBeatClick?: (beat: GuitarHeroVisualizationBeat) => void;
    selectedBeatIndex?: number;
    disabled?: boolean;
    timeWindow?: number;
    height?: number;
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

const FLASH_DURATION = 120;
const FADE_DURATION = 180;

const FRET_LABELS = ['1', '2', '3', '4', '5'] as const;

// ============================================================
// Component
// ============================================================

export function GuitarHeroModeVisualization({
    beats,
    disabled = false,
    className,
}: GuitarHeroModeVisualizationProps) {
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

    useEffect(() => {
        lastAudioRef.current = { time: currentTime, ts: performance.now() };
    }, [currentTime]);

    const prevPlayingRef = useRef(isPlaying);
    useEffect(() => {
        isPlayingRef.current = isPlaying;
        if (isPlaying && !prevPlayingRef.current) {
            lastAudioRef.current = { time: currentTime, ts: performance.now() };
            setSmoothTime(currentTime);
        }
        prevPlayingRef.current = isPlaying;
    }, [isPlaying, currentTime]);

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

    useEffect(() => { if (!isPlaying) setSmoothTime(currentTime); }, [currentTime, isPlaying]);

    // Determine which frets are active/fading
    const activeFrets = useMemo((): Record<string, 'active' | 'fade' | null> => {
        const result: Record<string, 'active' | 'fade' | null> = {
            '1': null, '2': null, '3': null, '4': null, '5': null,
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

        const start = Math.max(0, lo - 2);
        const end = Math.min(beats.length, lo + 1);

        for (let i = start; i < end; i++) {
            const beat = beats[i];
            const beatMs = beat.timestamp * 1000;
            const age = nowMs - beatMs;

            if (age > windowMs || age < -50) continue;
            if (age < 0) continue;

            const key = beat.key;
            if (age < FLASH_DURATION) {
                result[key] = 'active';
            } else if (result[key] !== 'active') {
                result[key] = 'fade';
            }
        }

        return result;
    }, [beats, smoothTime]);

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
            <div className={cn('gh-viz', 'gh-viz--empty', className)}>
                <p>No button mapping data</p>
            </div>
        );
    }

    return (
        <div className={cn('gh-viz', className)}>
            <div className="gh-fretboard">
                {FRET_LABELS.map((fret) => (
                    <div
                        key={fret}
                        className={cn(
                            'gh-lane',
                            `gh-lane--${fret}`,
                            activeFrets[fret] ? `gh-lane--${activeFrets[fret]}` : false
                        )}
                    >
                        <span className="gh-lane__label">F{fret}</span>
                        <div className="gh-lane__flash" />
                    </div>
                ))}
            </div>

            <div className="gh-viz-controls">
                <button
                    className="gh-viz-play"
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
                <span className="gh-viz-time">
                    {formatTime(smoothTime)} / {formatTime(duration)}
                </span>
            </div>
        </div>
    );
}

export default GuitarHeroModeVisualization;
