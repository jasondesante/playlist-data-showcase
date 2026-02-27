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
 * Find the index of the first beat at or after the given time using binary search.
 * This is O(log n) instead of O(n) for finding beats in long tracks.
 *
 * @param beats - Array of beats sorted by timestamp
 * @param time - The time to search for
 * @returns Index of the first beat at or after the time, or beats.length if none
 */
function findFirstBeatAtOrAfter(beats: Beat[], time: number): number {
    let left = 0;
    let right = beats.length;

    while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (beats[mid].timestamp < time) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    return left;
}

/**
 * Find the index of the last beat at or before the given time using binary search.
 * This is O(log n) instead of O(n) for finding beats in long tracks.
 *
 * @param beats - Array of beats sorted by timestamp
 * @param time - The time to search for
 * @returns Index of the last beat at or before the time, or -1 if none
 */
function findLastBeatAtOrBefore(beats: Beat[], time: number): number {
    let left = -1;
    let right = beats.length - 1;

    while (left < right) {
        const mid = Math.floor((left + right + 1) / 2);
        if (beats[mid].timestamp > time) {
            right = mid - 1;
        } else {
            left = mid;
        }
    }

    return left;
}

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
     *
     * Also updates the current BPM continuously, which is important for
     * tracks with irregular tempo where the rolling BPM should update
     * even between beat events.
     */
    const updateUpcomingBeats = useCallback(() => {
        if (!beatStreamRef.current || !isActive) return;

        const beats = beatStreamRef.current.getUpcomingBeats(UPCOMING_BEATS_COUNT);
        setUpcomingBeats(beats);

        // Update current BPM on every frame for smooth updates
        // This is especially important for tracks with irregular tempo
        // where the rolling BPM calculation needs to update continuously
        const bpm = beatStreamRef.current.getCurrentBpm();
        setCurrentBpm(bpm);

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
     *
     * IMPORTANT: We use beatStream.getCurrentTime() which returns the BeatStream's
     * internally calculated audio time (accounting for start time and latency compensation),
     * NOT the raw AudioContext.currentTime. Beat timestamps are in seconds from audio start,
     * so we need to compare against the BeatStream's calculated position, not the context's
     * clock which started when the AudioContext was created.
     */
    const checkTap = useCallback((): ButtonPressResult | null => {
        if (!beatStreamRef.current || !isActive) {
            return null;
        }

        // Use BeatStream's calculated current time, which accounts for:
        // - When playback started (startTime)
        // - Latency compensation (output + base + user offset)
        const currentTime = beatStreamRef.current.getCurrentTime();
        const result = beatStreamRef.current.checkButtonPress(currentTime);

        logger.debug('BeatDetection', 'Tap checked', {
            accuracy: result.accuracy,
            offset: result.offset * 1000, // Convert to ms
            beatTime: result.matchedBeat.timestamp,
        });

        return result;
    }, [isActive]);

    /**
     * Get beats within a time range for visualization.
     * Uses binary search for O(log n) performance with long tracks.
     */
    const getBeatsInRange = useCallback((startTime: number, endTime: number): Beat[] => {
        if (!beatMap || beatMap.beats.length === 0) return [];

        const beats = beatMap.beats;

        // Use binary search to find the range bounds
        const startIndex = findFirstBeatAtOrAfter(beats, startTime);
        const endIndex = findLastBeatAtOrBefore(beats, endTime);

        // If no beats in range
        if (startIndex > endIndex || startIndex >= beats.length || endIndex < 0) {
            return [];
        }

        // Return the slice of beats in the range
        return beats.slice(startIndex, endIndex + 1);
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
     * Also detects and corrects drift between BeatStream and audio player.
     */
    useEffect(() => {
        if (!isActive || !beatStreamRef.current) return;

        const beatStreamTime = beatStreamRef.current.getCurrentTime();
        const drift = Math.abs(currentTime - beatStreamTime);
        const DRIFT_THRESHOLD = 0.3; // 300ms - resync if drift exceeds this

        // Detect significant drift or seek event
        if (drift > DRIFT_THRESHOLD) {
            logger.debug('BeatDetection', 'Correcting BeatStream drift', {
                audioPlayerTime: currentTime,
                beatStreamTime,
                drift: drift * 1000, // ms
            });
            beatStreamRef.current.seek(currentTime);
        }

        updateUpcomingBeats();
    }, [currentTime, isActive, updateUpcomingBeats]);

    /**
     * Auto-start/stop based on practice mode and playback state.
     *
     * CRITICAL: When starting the stream, we must sync to the audio player's
     * current position. The BeatStream uses AudioContext.currentTime which
     * starts from 0, but the HTML5 Audio element may already be at a different
     * position (e.g., if practice mode starts mid-song).
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
                // CRITICAL: Sync BeatStream to current audio position immediately
                // The BeatStream starts at time 0, but audio may be at any position
                if (beatStreamRef.current && currentTime > 0) {
                    beatStreamRef.current.seek(currentTime);
                    logger.debug('BeatDetection', 'Synced BeatStream to audio position', {
                        audioPosition: currentTime,
                    });
                }
            }
        } else if (!isPlaying && isActive) {
            // Stop when playback pauses/ends
            stopStream();
        }
    }, [practiceModeActive, playbackState, beatMap, isActive, initializeStream, startStream, stopStream, currentTime]);

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
