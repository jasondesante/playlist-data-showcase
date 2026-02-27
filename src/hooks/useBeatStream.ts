/**
 * useBeatStream Hook
 *
 * React hook for real-time beat synchronization during practice mode.
 * Wraps the engine's BeatStream class and provides reactive state for:
 * - Current BPM (rolling calculation)
 * - Upcoming beats for visualization
 * - Tap accuracy checking
 * - Audio-visual synchronization
 *
 * @example
 * ```tsx
 * const {
 *   currentBpm,
 *   upcomingBeats,
 *   lastBeatEvent,
 *   checkTap,
 *   startStream,
 *   stopStream,
 *   seekStream,
 *   isActive,
 * } = useBeatStream(beatMap);
 *
 * // Start streaming when practice mode begins
 * startStream();
 *
 * // Check tap accuracy
 * const result = checkTap();
 * console.log(result.accuracy, result.offset);
 *
 * // Handle seek
 * seekStream(30.5); // Jump to 30.5 seconds
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { BeatStream } from 'playlist-data-engine';
import type {
    BeatMap,
    Beat,
    BeatEvent,
    ButtonPressResult,
    BeatStreamOptions,
    AudioSyncState,
} from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { useAudioPlayerStore } from '@/store/audioPlayerStore';

/**
 * Default options for BeatStream.
 * These match the engine's defaults.
 */
const DEFAULT_BEAT_STREAM_OPTIONS: BeatStreamOptions = {
    anticipationTime: 2.0, // Show beats 2 seconds before they hit
    userOffsetMs: 0, // No calibrated offset by default
    compensateOutputLatency: true, // Auto-adjust for output latency
    timingTolerance: 0.01, // 10ms tolerance for sync
};

/**
 * Number of upcoming beats to pre-render for visualization.
 */
const UPCOMING_BEATS_COUNT = 10;

/**
 * Return type for the useBeatStream hook.
 */
export interface UseBeatStreamReturn {
    /** Current BPM calculated from recent beat intervals */
    currentBpm: number;
    /** Array of upcoming beats for visualization */
    upcomingBeats: Beat[];
    /** The last beat event emitted (for pulse animations) */
    lastBeatEvent: BeatEvent | null;
    /** Current audio sync state for debugging */
    syncState: AudioSyncState | null;
    /** Whether the stream is currently active */
    isActive: boolean;
    /** Check tap accuracy against the nearest beat */
    checkTap: () => ButtonPressResult | null;
    /** Start the beat stream (call when practice mode begins) */
    startStream: () => void;
    /** Stop the beat stream (call when practice mode ends) */
    stopStream: () => void;
    /** Seek to a specific time in the audio */
    seekStream: (time: number) => void;
    /** Get beats within a time range for visualization */
    getBeatsInRange: (startTime: number, endTime: number) => Beat[];
    /** Get the current beat at the given audio time */
    getBeatAtTime: (time: number) => Beat | null;
    /** The AudioContext instance (for timing reference) */
    audioContext: AudioContext | null;
}

/**
 * Props for the useBeatStream hook.
 */
export interface UseBeatStreamProps {
    /** The beat map to stream beats from */
    beatMap: BeatMap | null;
    /** Optional override for stream options */
    options?: Partial<BeatStreamOptions>;
    /** Whether practice mode is active (controls automatic start/stop) */
    practiceModeActive?: boolean;
}

/**
 * React hook for real-time beat synchronization.
 *
 * This hook manages the BeatStream lifecycle and provides reactive state
 * for beat visualization and tap accuracy. It integrates with the audio
 * player store for synchronization.
 *
 * Features:
 * - Automatic AudioContext creation and management
 * - Beat event subscription with reactive state updates
 * - Sync with audio player's current time
 * - Tap accuracy checking
 * - Seek handling
 *
 * @param beatMap - The beat map to stream beats from
 * @param options - Optional override for stream options
 * @param practiceModeActive - Whether practice mode is active
 * @returns Hook return object with stream state and methods
 */
export const useBeatStream = (
    beatMap: BeatMap | null,
    options?: Partial<BeatStreamOptions>,
    practiceModeActive: boolean = false
): UseBeatStreamReturn => {
    // State for reactive updates
    const [currentBpm, setCurrentBpm] = useState(0);
    const [upcomingBeats, setUpcomingBeats] = useState<Beat[]>([]);
    const [lastBeatEvent, setLastBeatEvent] = useState<BeatEvent | null>(null);
    const [syncState, setSyncState] = useState<AudioSyncState | null>(null);
    const [isActive, setIsActive] = useState(false);

    // Refs for BeatStream and AudioContext
    const beatStreamRef = useRef<BeatStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Get audio player state for sync
    const currentTime = useAudioPlayerStore((state) => state.currentTime);
    const playbackState = useAudioPlayerStore((state) => state.playbackState);

    /**
     * Create or get the AudioContext.
     * AudioContext must be created after a user gesture.
     */
    const getAudioContext = useCallback((): AudioContext | null => {
        if (!audioContextRef.current) {
            try {
                audioContextRef.current = new AudioContext();
                logger.info('BeatDetection', 'AudioContext created', {
                    sampleRate: audioContextRef.current.sampleRate,
                    outputLatency: audioContextRef.current.outputLatency,
                });
            } catch (error) {
                logger.error('BeatDetection', 'Failed to create AudioContext', { error });
                return null;
            }
        }
        return audioContextRef.current;
    }, []);

    /**
     * Initialize the BeatStream with the beat map.
     */
    const initializeStream = useCallback(() => {
        if (!beatMap) {
            logger.warn('BeatDetection', 'Cannot initialize stream without beat map');
            return false;
        }

        const audioContext = getAudioContext();
        if (!audioContext) {
            return false;
        }

        // Clean up existing stream
        if (beatStreamRef.current) {
            beatStreamRef.current.stop();
            beatStreamRef.current = null;
        }

        // Merge options with defaults
        const streamOptions: BeatStreamOptions = {
            ...DEFAULT_BEAT_STREAM_OPTIONS,
            ...options,
        };

        try {
            beatStreamRef.current = new BeatStream(beatMap, audioContext, streamOptions);
            logger.info('BeatDetection', 'BeatStream initialized', {
                beatCount: beatMap.beats.length,
                anticipationTime: streamOptions.anticipationTime,
            });
            return true;
        } catch (error) {
            logger.error('BeatDetection', 'Failed to create BeatStream', { error });
            return false;
        }
    }, [beatMap, options, getAudioContext]);

    /**
     * Subscribe to beat events.
     */
    const subscribeToEvents = useCallback(() => {
        if (!beatStreamRef.current) return;

        // Unsubscribe from previous subscription
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
        }

        const unsubscribe = beatStreamRef.current.subscribe((event: BeatEvent) => {
            setLastBeatEvent(event);
            setCurrentBpm(event.currentBpm);

            // Log beat events for debugging
            logger.debug('BeatDetection', 'Beat event', {
                type: event.type,
                beatTime: event.beat.timestamp,
                currentBpm: event.currentBpm,
                timeUntilBeat: event.timeUntilBeat,
            });
        });

        unsubscribeRef.current = unsubscribe;
        logger.debug('BeatDetection', 'Subscribed to beat events');
    }, []);

    /**
     * Update upcoming beats for visualization.
     * Called on each animation frame during playback.
     */
    const updateUpcomingBeats = useCallback(() => {
        if (!beatStreamRef.current || !isActive) return;

        const beats = beatStreamRef.current.getUpcomingBeats(UPCOMING_BEATS_COUNT);
        setUpcomingBeats(beats);

        // Update sync state for debugging
        const state = beatStreamRef.current.getSyncState();
        setSyncState(state);
    }, [isActive]);

    /**
     * Animation loop for smooth updates.
     */
    const startAnimationLoop = useCallback(() => {
        const loop = () => {
            updateUpcomingBeats();
            animationFrameRef.current = requestAnimationFrame(loop);
        };
        loop();
    }, [updateUpcomingBeats]);

    const stopAnimationLoop = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, []);

    /**
     * Start the beat stream.
     */
    const startStream = useCallback(() => {
        if (!beatStreamRef.current) {
            const initialized = initializeStream();
            if (!initialized) return;
        }

        // Resume AudioContext if suspended
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }

        subscribeToEvents();
        beatStreamRef.current?.start();
        setIsActive(true);
        startAnimationLoop();

        logger.info('BeatDetection', 'Stream started');
    }, [initializeStream, subscribeToEvents, startAnimationLoop]);

    /**
     * Stop the beat stream.
     */
    const stopStream = useCallback(() => {
        stopAnimationLoop();

        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        if (beatStreamRef.current) {
            beatStreamRef.current.stop();
        }

        setIsActive(false);
        setUpcomingBeats([]);
        setLastBeatEvent(null);

        logger.info('BeatDetection', 'Stream stopped');
    }, [stopAnimationLoop]);

    /**
     * Seek to a specific time in the audio.
     */
    const seekStream = useCallback((time: number) => {
        if (!beatStreamRef.current) return;

        beatStreamRef.current.seek(time);
        updateUpcomingBeats();

        logger.debug('BeatDetection', 'Seeked to time', { time });
    }, [updateUpcomingBeats]);

    /**
     * Check tap accuracy against the nearest beat.
     */
    const checkTap = useCallback((): ButtonPressResult | null => {
        if (!beatStreamRef.current || !audioContextRef.current || !isActive) {
            return null;
        }

        const result = beatStreamRef.current.checkButtonPress(audioContextRef.current.currentTime);

        logger.debug('BeatDetection', 'Tap checked', {
            accuracy: result.accuracy,
            offset: result.offset * 1000, // Convert to ms
            beatTime: result.matchedBeat.timestamp,
        });

        return result;
    }, [isActive]);

    /**
     * Get beats within a time range for visualization.
     */
    const getBeatsInRange = useCallback((startTime: number, endTime: number): Beat[] => {
        if (!beatMap) return [];

        return beatMap.beats.filter(
            (beat) => beat.timestamp >= startTime && beat.timestamp <= endTime
        );
    }, [beatMap]);

    /**
     * Get the beat at a specific time.
     */
    const getBeatAtTime = useCallback((time: number): Beat | null => {
        if (!beatStreamRef.current) return null;
        return beatStreamRef.current.getBeatAtTime(time);
    }, []);

    /**
     * Sync with audio player when time changes.
     * This handles the case where the user seeks via the audio player controls.
     */
    useEffect(() => {
        if (!isActive || !beatStreamRef.current) return;

        // Check if the time has jumped significantly (seek event)
        // The BeatStream will handle this internally via its own sync mechanism
        // but we can also update our upcoming beats here
        updateUpcomingBeats();
    }, [currentTime, isActive, updateUpcomingBeats]);

    /**
     * Auto-start/stop based on practice mode and playback state.
     */
    useEffect(() => {
        if (!practiceModeActive || !beatMap) {
            if (isActive) {
                stopStream();
            }
            return;
        }

        const isPlaying = playbackState === 'playing';

        if (isPlaying && !isActive) {
            // Initialize and start when playback begins
            if (initializeStream()) {
                startStream();
            }
        } else if (!isPlaying && isActive) {
            // Stop when playback pauses/ends
            stopStream();
        }
    }, [practiceModeActive, playbackState, beatMap, isActive, initializeStream, startStream, stopStream]);

    /**
     * Cleanup on unmount.
     */
    useEffect(() => {
        return () => {
            stopStream();

            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }

            beatStreamRef.current = null;
        };
    }, [stopStream]);

    /**
     * Initialize stream when beat map changes.
     */
    useEffect(() => {
        if (beatMap && practiceModeActive) {
            initializeStream();
        }

        return () => {
            if (beatStreamRef.current) {
                beatStreamRef.current.stop();
                beatStreamRef.current = null;
            }
        };
    }, [beatMap, practiceModeActive, initializeStream]);

    return {
        currentBpm,
        upcomingBeats,
        lastBeatEvent,
        syncState,
        isActive,
        checkTap,
        startStream,
        stopStream,
        seekStream,
        getBeatsInRange,
        getBeatAtTime,
        audioContext: audioContextRef.current,
    };
};

// ============================================================
// Utility Hooks
// ============================================================

/**
 * Hook to get just the current BPM from a beat map.
 * Useful for simple displays that don't need full stream functionality.
 *
 * @param beatMap - The beat map to get BPM from
 * @returns The initial BPM estimate from the beat map
 */
export const useBeatMapBpm = (beatMap: BeatMap | null): number => {
    return beatMap?.bpm ?? 0;
};

/**
 * Hook to get beat count from a beat map.
 *
 * @param beatMap - The beat map to count beats from
 * @returns The total number of beats in the beat map
 */
export const useBeatCount = (beatMap: BeatMap | null): number => {
    return beatMap?.beats.length ?? 0;
};

/**
 * Hook to get downbeat count from a beat map.
 *
 * @param beatMap - The beat map to count downbeats from
 * @returns The number of downbeats (measure starts) in the beat map
 */
export const useDownbeatCount = (beatMap: BeatMap | null): number => {
    if (!beatMap) return 0;
    return beatMap.beats.filter((beat) => beat.isDownbeat).length;
};
