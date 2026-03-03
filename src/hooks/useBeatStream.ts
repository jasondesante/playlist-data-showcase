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
    BeatStreamOptions,
    AudioSyncState,
    InterpolatedBeatMap,
    BeatWithSource,
    SubdividedBeatMap,
    BeatAccuracy,
} from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { useAudioPlayerStore } from '@/store/audioPlayerStore';
import { useBeatDetectionStore, useIgnoreKeyRequirements } from '@/store/beatDetectionStore';
import type {
    AccuracyThresholds,
    ExtendedBeatAccuracy,
    ExtendedButtonPressResult,
    BeatStreamMode,
    ExtendedBeatEvent,
    BeatSource,
} from '@/types';

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
 * Type guard to check if a beat map is a SubdividedBeatMap.
 *
 * SubdividedBeatMap is identified by having a `subdivisionMetadata` property
 * and a `beats` array containing SubdividedBeat objects.
 *
 * @param beatMap - The beat map to check
 * @returns true if the beat map is a SubdividedBeatMap
 */
function isSubdividedBeatMap(beatMap: BeatMap | InterpolatedBeatMap | SubdividedBeatMap | null): beatMap is SubdividedBeatMap {
    return beatMap !== null && 'subdivisionMetadata' in beatMap && 'subdivisionConfig' in beatMap;
}

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
    /** The last beat event emitted (for pulse animations) - includes source info when available */
    lastBeatEvent: ExtendedBeatEvent | null;
    /** Current audio sync state for debugging */
    syncState: AudioSyncState | null;
    /** Whether the stream is currently active */
    isActive: boolean;
    /** Whether the stream is paused (active but not animating) */
    isPaused: boolean;
    /** Check tap accuracy against the nearest beat (includes 'ok' accuracy level and key matching) */
    checkTap: (pressedKey?: string) => ExtendedButtonPressResult | null;
    /** Start the beat stream (call when practice mode begins) */
    startStream: () => void;
    /** Stop the beat stream (call when practice mode ends) */
    stopStream: () => void;
    /** Pause the beat stream (lighter weight than stop, keeps beats visible) */
    pauseStream: () => void;
    /** Resume the beat stream after pause */
    resumeStream: () => void;
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
    /** The beat map to stream beats from (can be BeatMap, InterpolatedBeatMap, or SubdividedBeatMap) */
    beatMap: BeatMap | InterpolatedBeatMap | SubdividedBeatMap | null;
    /** Optional override for stream options */
    options?: Partial<BeatStreamOptions>;
    /** Whether practice mode is active (controls automatic start/stop) */
    practiceModeActive?: boolean;
    /**
     * Which beat stream mode to use:
     * - 'detected': Use only originally detected beats (original behavior)
     * - 'merged': Use interpolated beats with detected beats as anchors (fills gaps)
     * - 'subdivided': Use pre-calculated subdivided beats (e.g., eighth notes, triplets)
     *
     * When 'merged' and beatMap is an InterpolatedBeatMap, the hook will pass
     * useInterpolatedBeats: true to the engine's BeatStream.
     *
     * When 'subdivided' and beatMap is a SubdividedBeatMap, the hook will use
     * the subdivided beats array directly.
     *
     * @default 'detected'
     */
    beatStreamMode?: BeatStreamMode;
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
 * - Support for BeatMap, InterpolatedBeatMap, and SubdividedBeatMap
 * - Beat stream mode selection (detected, merged, or subdivided)
 *
 * @param beatMap - The beat map to stream beats from (BeatMap, InterpolatedBeatMap, or SubdividedBeatMap)
 * @param options - Optional override for stream options
 * @param practiceModeActive - Whether practice mode is active
 * @param beatStreamMode - Which beat stream to use ('detected', 'merged', or 'subdivided')
 * @returns Hook return object with stream state and methods
 */
export const useBeatStream = (
    beatMap: BeatMap | InterpolatedBeatMap | SubdividedBeatMap | null,
    options?: Partial<BeatStreamOptions>,
    practiceModeActive: boolean = false,
    beatStreamMode: BeatStreamMode = 'detected'
): UseBeatStreamReturn => {
    // State for reactive updates
    const [currentBpm, setCurrentBpm] = useState(0);
    const [upcomingBeats, setUpcomingBeats] = useState<Beat[]>([]);
    const [lastBeatEvent, setLastBeatEvent] = useState<ExtendedBeatEvent | null>(null);
    const [syncState, setSyncState] = useState<AudioSyncState | null>(null);
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Refs for BeatStream and AudioContext
    const beatStreamRef = useRef<BeatStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Get audio player state for sync
    const currentTime = useAudioPlayerStore((state) => state.currentTime);
    const playbackState = useAudioPlayerStore((state) => state.playbackState);

    // Get key requirements setting from store (easy mode toggle)
    const ignoreKeyRequirements = useIgnoreKeyRequirements();

    // ========================================
    // Interpolated Audio Time (matches BeatTimeline)
    // ========================================
    // Track when currentTime changes from the audio player for interpolation
    const [lastAudioUpdate, setLastAudioUpdate] = useState<{ time: number; timestamp: number }>({
        time: currentTime,
        timestamp: performance.now(),
    });

    // Update interpolation reference when audio time changes
    useEffect(() => {
        setLastAudioUpdate({
            time: currentTime,
            timestamp: performance.now(),
        });
    }, [currentTime]);

    // Ref to access lastAudioUpdate in callbacks without stale closure issues
    const lastAudioUpdateRef = useRef(lastAudioUpdate);
    lastAudioUpdateRef.current = lastAudioUpdate;

    // Ref to check if playing in callbacks
    const isPlayingRef = useRef(playbackState === 'playing');
    isPlayingRef.current = playbackState === 'playing';

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
     *
     * Handles BeatMap, InterpolatedBeatMap, and SubdividedBeatMap:
     * - For BeatMap: uses beats array directly
     * - For InterpolatedBeatMap with beatStreamMode='merged': uses mergedBeats
     * - For InterpolatedBeatMap with beatStreamMode='detected': uses detectedBeats
     * - For SubdividedBeatMap with beatStreamMode='subdivided': uses subdivided beats array
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

        // Check beat map types
        const isSubdivided = isSubdividedBeatMap(beatMap);
        const isInterpolated = !isSubdivided && 'mergedBeats' in beatMap && 'detectedBeats' in beatMap;

        // Determine if we should use interpolated beats
        // Only use interpolated beats if:
        // 1. The beatMap is an InterpolatedBeatMap
        // 2. beatStreamMode is 'merged'
        const useInterpolatedBeats = isInterpolated && beatStreamMode === 'merged';

        // Merge options with defaults, including useInterpolatedBeats and ignoreKeyRequirements
        const streamOptions: BeatStreamOptions = {
            ...DEFAULT_BEAT_STREAM_OPTIONS,
            ...options,
            useInterpolatedBeats,
            ignoreKeyRequirements,
        };

        try {
            beatStreamRef.current = new BeatStream(beatMap, audioContext, streamOptions);

            // Log beat count based on map type
            let beatCount: number;
            let mapType: string;

            if (isSubdivided) {
                const subdividedMap = beatMap as SubdividedBeatMap;
                beatCount = subdividedMap.beats.length;
                mapType = 'subdivided';
            } else if (isInterpolated) {
                const interpolatedMap = beatMap as InterpolatedBeatMap;
                beatCount = useInterpolatedBeats
                    ? interpolatedMap.mergedBeats.length
                    : interpolatedMap.detectedBeats.length;
                mapType = 'interpolated';
            } else {
                beatCount = (beatMap as BeatMap).beats.length;
                mapType = 'standard';
            }

            logger.info('BeatDetection', 'BeatStream initialized', {
                beatCount,
                mapType,
                anticipationTime: streamOptions.anticipationTime,
                isInterpolated,
                isSubdivided,
                beatStreamMode,
                useInterpolatedBeats,
                ignoreKeyRequirements,
            });
            return true;
        } catch (error) {
            logger.error('BeatDetection', 'Failed to create BeatStream', { error });
            return false;
        }
    }, [beatMap, options, getAudioContext, beatStreamMode, ignoreKeyRequirements]);

    /**
     * Subscribe to beat events.
     *
     * Task 6.3: Extracts source information from the beat if available
     * (when using InterpolatedBeatMap with mergedBeats) and includes
     * it in the ExtendedBeatEvent.
     */
    const subscribeToEvents = useCallback(() => {
        if (!beatStreamRef.current) return;

        // Unsubscribe from previous subscription
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
        }

        const unsubscribe = beatStreamRef.current.subscribe((event: BeatEvent) => {
            // Extract source from beat if it exists (BeatWithSource has source field)
            // At runtime, when using InterpolatedBeatMap.mergedBeats, the beat
            // object actually contains the source property even though TypeScript
            // types it as Beat.
            const beatWithSource = event.beat as BeatWithSource;
            const source: BeatSource | undefined = beatWithSource?.source;

            // Create extended event with source information
            const extendedEvent: ExtendedBeatEvent = {
                ...event,
                ...(source && { source }),
            };

            setLastBeatEvent(extendedEvent);
            setCurrentBpm(event.currentBpm);

            // Log beat events for debugging
            logger.debug('BeatDetection', 'Beat event', {
                type: event.type,
                beatTime: event.beat.timestamp,
                currentBpm: event.currentBpm,
                timeUntilBeat: event.timeUntilBeat,
                source: source ?? 'unknown',
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
        setIsPaused(false);
        setUpcomingBeats([]);
        setLastBeatEvent(null);

        logger.info('BeatDetection', 'Stream stopped');
    }, [stopAnimationLoop]);

    /**
     * Pause the beat stream (lighter weight than stop).
     * Keeps the BeatStream active but stops the animation loop.
     * Upcoming beats are preserved so timeline still shows something.
     */
    const pauseStream = useCallback(() => {
        stopAnimationLoop();
        setIsPaused(true);

        logger.debug('BeatDetection', 'Stream paused');
    }, [stopAnimationLoop]);

    /**
     * Resume the beat stream after pause.
     * Re-syncs to current audio position and restarts animation loop.
     */
    const resumeStream = useCallback(() => {
        if (!beatStreamRef.current || !isActive) {
            return;
        }

        // Re-sync to current audio position in case of drift during pause
        beatStreamRef.current.seek(currentTime);

        // Update upcoming beats for current position
        const beats = beatStreamRef.current.getUpcomingBeats(UPCOMING_BEATS_COUNT);
        setUpcomingBeats(beats);

        // Update current BPM
        const bpm = beatStreamRef.current.getCurrentBpm();
        setCurrentBpm(bpm);

        // Restart animation loop
        startAnimationLoop();
        setIsPaused(false);

        logger.debug('BeatDetection', 'Stream resumed', { currentTime });
    }, [currentTime, isActive, startAnimationLoop]);

    /**
     * Seek to a specific time in the audio.
     * Updates upcoming beats even when stream is paused.
     */
    const seekStream = useCallback((time: number) => {
        if (!beatStreamRef.current) return;

        beatStreamRef.current.seek(time);

        // Always update upcoming beats after seek, even when paused
        // This ensures the timeline shows the correct beats at the new position
        const beats = beatStreamRef.current.getUpcomingBeats(UPCOMING_BEATS_COUNT);
        setUpcomingBeats(beats);

        // Update current BPM and sync state
        const bpm = beatStreamRef.current.getCurrentBpm();
        setCurrentBpm(bpm);

        const state = beatStreamRef.current.getSyncState();
        setSyncState(state);

        logger.debug('BeatDetection', 'Seeked to time', { time });
    }, []);

    /**
     * Get interpolated audio time matching the timeline's time reference.
     * Uses performance.now() to interpolate between timeupdate events for 60fps precision.
     *
     * IMPORTANT: This MUST match the timing logic in BeatTimeline.tsx for tap accuracy
     * to align with visual beat positions. Both use HTML5 Audio currentTime + interpolation.
     */
    const getInterpolatedTime = useCallback((): number => {
        // When not playing, use the raw currentTime directly (no interpolation)
        if (!isPlayingRef.current) {
            return currentTime;
        }

        // Interpolate between last known audio time updates for smooth 60fps precision
        const { time: lastAudioTime, timestamp: lastUpdateTimestamp } = lastAudioUpdateRef.current;
        const elapsedMs = performance.now() - lastUpdateTimestamp;
        const elapsedSeconds = elapsedMs / 1000;
        const interpolated = lastAudioTime + elapsedSeconds;

        // Clamp to track duration
        return Math.min(beatMap?.duration ?? 0, interpolated);
    }, [currentTime, beatMap?.duration]);

    /**
     * Evaluate accuracy using custom thresholds.
     * Supports the 'ok' accuracy level which the engine doesn't have.
     */
    const evaluateAccuracy = useCallback((
        absoluteOffset: number,
        thresholds: AccuracyThresholds
    ): ExtendedBeatAccuracy => {
        if (absoluteOffset <= thresholds.perfect) {
            return 'perfect';
        } else if (absoluteOffset <= thresholds.great) {
            return 'great';
        } else if (absoluteOffset <= thresholds.good) {
            return 'good';
        } else if (absoluteOffset <= thresholds.ok) {
            return 'ok';
        } else {
            return 'miss';
        }
    }, []);

    /**
     * Check tap accuracy against the nearest beat.
     *
     * CRITICAL FIX: We use the audio player's interpolated time, which matches the
     * timeline visualization's time reference. The beat timestamps are in seconds
     * from audio start, same as audio.currentTime, so they're directly comparable.
     * This ensures tap accuracy is consistent with visual beat positions.
     *
     * We do NOT use beatStream.getCurrentTime() because it includes latency
     * compensation (outputLatency + baseLatency) which is meant for Web Audio
     * scheduling, not HTML5 Audio playback. Since playback is via HTML5 Audio,
     * audio.currentTime already represents the actual presentation time.
     *
     * ACCURACY EVALUATION: We use custom thresholds from the store to support
     * difficulty presets and the 'ok' accuracy level. The engine's checkButtonPress
     * only supports perfect/great/good/miss without 'ok'.
     *
     * KEY MATCHING: When a pressedKey is provided, we pass it to the engine's
     * checkButtonPress which handles key matching and returns keyMatch, pressedKey,
     * and requiredKey fields. The engine also handles wrongKey accuracy when the
     * key doesn't match. We respect the ignoreKeyRequirements option from the store.
     *
     * SOURCE EXTRACTION: When using InterpolatedBeatMap with mergedBeats, the
     * matched beat contains a 'source' field indicating whether it was detected
     * or interpolated. We extract this for tap statistics breakdown.
     *
     * @param pressedKey - Optional key that was pressed (for rhythm game chart mode)
     */
    const checkTap = useCallback((pressedKey?: string): ExtendedButtonPressResult | null => {
        if (!beatStreamRef.current || !isActive) {
            return null;
        }

        // Get custom accuracy thresholds from the store
        const thresholds = useBeatDetectionStore.getState().actions.getAccuracyThresholds();

        // Use interpolated audio player time, matching the timeline's time reference
        const tapTime = getInterpolatedTime();

        // Use engine's checkButtonPress to find the nearest beat and calculate offset
        // Pass the pressedKey to the engine for key matching
        const engineResult = beatStreamRef.current.checkButtonPress(tapTime, pressedKey);

        // Re-evaluate accuracy using our custom thresholds
        // Note: If the engine returned 'wrongKey', we keep it as-is
        let accuracy: ExtendedBeatAccuracy;
        if (engineResult.accuracy === 'wrongKey' as BeatAccuracy) {
            // Engine returned wrongKey - keep it
            accuracy = 'wrongKey';
        } else {
            accuracy = evaluateAccuracy(engineResult.absoluteOffset, thresholds);
        }

        // Extract source from matched beat (BeatWithSource has source field)
        // At runtime, when using InterpolatedBeatMap.mergedBeats, the beat
        // object actually contains the source property even though TypeScript
        // types it as Beat.
        const matchedBeatWithSource = engineResult.matchedBeat as BeatWithSource;
        const source: BeatSource | undefined = matchedBeatWithSource?.source;

        // Build the extended result with key matching info
        const result: ExtendedButtonPressResult = {
            ...engineResult,
            accuracy,
            source,
            // Include key matching fields from engine result
            keyMatch: (engineResult as any).keyMatch ?? true,
            pressedKey: (engineResult as any).pressedKey ?? pressedKey,
            requiredKey: (engineResult as any).requiredKey,
        };

        logger.debug('BeatDetection', 'Tap checked', {
            accuracy: result.accuracy,
            offset: result.offset * 1000, // Convert to ms
            beatTime: result.matchedBeat?.timestamp,
            tapTime,
            source: source ?? 'unknown',
            pressedKey: result.pressedKey,
            requiredKey: result.requiredKey,
            keyMatch: result.keyMatch,
            thresholds: {
                perfect: thresholds.perfect * 1000,
                great: thresholds.great * 1000,
                good: thresholds.good * 1000,
                ok: thresholds.ok * 1000,
            },
        });

        return result;
    }, [isActive, getInterpolatedTime, evaluateAccuracy]);

    /**
     * Get beats within a time range for visualization.
     * Uses binary search for O(log n) performance with long tracks.
     *
     * Note: This always uses the beat map's beats array directly, not the
     * interpolated beats. For interpolated beats, use the BeatStream's
     * getUpcomingBeats method instead.
     *
     * Supports SubdividedBeatMap - when beatStreamMode is 'subdivided', uses
     * the subdivided beats array which contains SubdividedBeat objects with
     * decimal beatInMeasure values.
     */
    const getBeatsInRange = useCallback((startTime: number, endTime: number): Beat[] => {
        if (!beatMap) return [];

        // Get the appropriate beats array based on map type and mode
        const isSubdivided = isSubdividedBeatMap(beatMap);
        const isInterpolated = !isSubdivided && 'mergedBeats' in beatMap && 'detectedBeats' in beatMap;
        let beats: Beat[];

        if (isSubdivided) {
            // For SubdividedBeatMap, use the subdivided beats array
            beats = (beatMap as SubdividedBeatMap).beats;
        } else if (isInterpolated) {
            const interpolatedMap = beatMap as InterpolatedBeatMap;
            beats = beatStreamMode === 'merged'
                ? interpolatedMap.mergedBeats
                : interpolatedMap.detectedBeats;
        } else {
            beats = (beatMap as BeatMap).beats;
        }

        if (beats.length === 0) return [];

        // Use binary search to find the range bounds
        const startIndex = findFirstBeatAtOrAfter(beats, startTime);
        const endIndex = findLastBeatAtOrBefore(beats, endTime);

        // If no beats in range
        if (startIndex > endIndex || startIndex >= beats.length || endIndex < 0) {
            return [];
        }

        // Return the slice of beats in the range
        return beats.slice(startIndex, endIndex + 1);
    }, [beatMap, beatStreamMode]);

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
     *
     * PAUSE/RESUME HANDLING:
     * - When audio pauses: use pauseStream() to keep BeatStream active but stop animation
     * - When audio resumes: use resumeStream() to restart animation and sync
     * - This prevents visual glitches and maintains beat continuity
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
            // Initialize and start when playback begins (first time)
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
        } else if (isPlaying && isActive && isPaused) {
            // Resume from paused state
            resumeStream();
        } else if (!isPlaying && isActive && !isPaused) {
            // Pause when playback pauses (but don't stop completely)
            pauseStream();
        }
    }, [practiceModeActive, playbackState, beatMap, isActive, isPaused, initializeStream, startStream, stopStream, pauseStream, resumeStream, currentTime]);

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
     * Initialize stream when beat map or beat stream mode changes.
     * Re-initializes if the user switches between detected and merged modes.
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
    }, [beatMap, practiceModeActive, beatStreamMode, initializeStream]);

    return {
        currentBpm,
        upcomingBeats,
        lastBeatEvent,
        syncState,
        isActive,
        isPaused,
        checkTap,
        startStream,
        stopStream,
        pauseStream,
        resumeStream,
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
