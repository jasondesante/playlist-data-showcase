/**
 * useSubdivisionPlayback Hook
 *
 * React hook for real-time subdivision switching during practice mode.
 * Wraps the engine's SubdivisionPlaybackController and provides reactive state for:
 * - Current subdivision type
 * - Beat events for visualization
 * - Play/pause/seek handling
 * - Subdivision switching via UI buttons
 *
 * This hook integrates with the beatDetectionStore for controller management
 * and the audioPlayerStore for playback synchronization.
 *
 * @example
 * ```tsx
 * const {
 *   currentSubdivision,
 *   lastBeatEvent,
 *   setSubdivision,
 *   startPlayback,
 *   stopPlayback,
 *   isActive,
 * } = useSubdivisionPlayback();
 *
 * // Start playback when practice mode begins
 * startPlayback();
 *
 * // Switch subdivision type
 * setSubdivision('eighth');
 *
 * // Render subdivision buttons
 * <button onClick={() => setSubdivision('quarter')}>Quarter</button>
 * <button onClick={() => setSubdivision('eighth')}>Eighth</button>
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
    SubdivisionType,
    SubdivisionBeatEvent,
    SubdividedBeat,
    ButtonPressResult,
} from 'playlist-data-engine';
import {
    useBeatDetectionStore,
    useUnifiedBeatMap,
    useCurrentSubdivision,
    getActiveSubdivisionPlaybackController,
} from '@/store/beatDetectionStore';
import { useAudioPlayerStore } from '@/store/audioPlayerStore';
import { logger } from '@/utils/logger';

/**
 * Number of upcoming beats to pre-render for visualization.
 */
const UPCOMING_BEATS_COUNT = 10;

/**
 * Return type for the useSubdivisionPlayback hook.
 */
export interface UseSubdivisionPlaybackReturn {
    /** Current subdivision type */
    currentSubdivision: SubdivisionType;
    /** The last beat event emitted (for pulse animations) */
    lastBeatEvent: SubdivisionBeatEvent | null;
    /** Upcoming beats for visualization */
    upcomingBeats: SubdividedBeat[];
    /** Whether the controller is currently active */
    isActive: boolean;
    /** Whether the controller is paused (active but not playing) */
    isPaused: boolean;
    /** Change subdivision type in real-time */
    setSubdivision: (type: SubdivisionType) => void;
    /** Start playback (call when practice mode begins) */
    startPlayback: () => void;
    /** Stop playback (call when practice mode ends) */
    stopPlayback: () => void;
    /** Pause playback */
    pausePlayback: () => void;
    /** Resume playback */
    resumePlayback: () => void;
    /** Seek to a specific time */
    seek: (time: number) => void;
    /** Get beats within a time range for visualization */
    getBeatsInRange: (startTime: number, endTime: number) => SubdividedBeat[];
    /** Get the beat at a specific time */
    getBeatAtTime: (time: number) => SubdividedBeat | null;
    /** Get the current beat */
    getCurrentBeat: () => SubdividedBeat | null;
    /** Get the next beat */
    getNextBeat: () => SubdividedBeat | null;
    /** Check tap accuracy against current subdivision's beats */
    checkTap: () => ButtonPressResult | null;
}

/**
 * Props for the useSubdivisionPlayback hook.
 */
export interface UseSubdivisionPlaybackProps {
    /** Whether practice mode is active (controls automatic start/stop) */
    practiceModeActive?: boolean;
}

/**
 * React hook for real-time subdivision playback.
 *
 * This hook manages the SubdivisionPlaybackController lifecycle and provides
 * reactive state for beat visualization and subdivision switching. It integrates
 * with the audio player store for synchronization.
 *
 * Features:
 * - Automatic controller initialization when practice mode starts
 * - Real-time subdivision switching
 * - Beat event subscription with reactive state updates
 * - Sync with audio player's current time
 * - Play/pause/seek handling
 * - Cleanup on unmount
 *
 * @param practiceModeActive - Whether practice mode is active
 * @returns Hook return object with subdivision state and methods
 */
export const useSubdivisionPlayback = (
    practiceModeActive: boolean = false
): UseSubdivisionPlaybackReturn => {
    // State for reactive updates
    const [lastBeatEvent, setLastBeatEvent] = useState<SubdivisionBeatEvent | null>(null);
    const [upcomingBeats, setUpcomingBeats] = useState<SubdividedBeat[]>([]);
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Refs for controller access
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Store state
    const unifiedBeatMap = useUnifiedBeatMap();
    const currentSubdivision = useCurrentSubdivision();
    const initializeSubdivisionPlayback = useBeatDetectionStore(
        (state) => state.actions.initializeSubdivisionPlayback
    );
    const cleanupSubdivisionPlayback = useBeatDetectionStore(
        (state) => state.actions.cleanupSubdivisionPlayback
    );
    const setCurrentSubdivision = useBeatDetectionStore(
        (state) => state.actions.setCurrentSubdivision
    );

    // Audio player state for sync
    const currentTime = useAudioPlayerStore((state) => state.currentTime);
    const playbackState = useAudioPlayerStore((state) => state.playbackState);
    const isPlaying = playbackState === 'playing';

    // Ref to check if playing in callbacks
    const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;

    // Track audio time updates for interpolation
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

    /**
     * Get interpolated audio time for precise tap checking.
     */
    const getInterpolatedTime = useCallback((): number => {
        // When not playing, use the raw currentTime directly
        if (!isPlayingRef.current) {
            return currentTime;
        }

        // Interpolate between last known audio time updates for smooth precision
        const { time: lastAudioTime, timestamp: lastUpdateTimestamp } = lastAudioUpdateRef.current;
        const elapsedMs = performance.now() - lastUpdateTimestamp;
        const elapsedSeconds = elapsedMs / 1000;
        const interpolated = lastAudioTime + elapsedSeconds;

        // Clamp to track duration
        return Math.min(unifiedBeatMap?.duration ?? 0, interpolated);
    }, [currentTime, unifiedBeatMap?.duration]);

    /**
     * Check tap accuracy against the current subdivision's beats.
     */
    const checkTap = useCallback((): ButtonPressResult | null => {
        const controller = getActiveSubdivisionPlaybackController();
        if (!controller || !isActive) {
            return null;
        }
        const tapTime = getInterpolatedTime();
        const thresholds = useBeatDetectionStore.getState().actions.getAccuracyThresholds();
        return controller.checkButtonPress(tapTime, thresholds);
    }, [isActive, getInterpolatedTime]);

    /**
     * Create or get the AudioContext.
     * AudioContext must be created after a user gesture.
     */
    const getAudioContext = useCallback((): AudioContext | null => {
        try {
            // Create a new AudioContext - the store's initializeSubdivisionPlayback
            // will handle this, but we need one for the initialization call
            return new AudioContext();
        } catch (error) {
            logger.error('SubdivisionPlayback', 'Failed to create AudioContext', { error });
            return null;
        }
    }, []);

    /**
     * Subscribe to beat events from the controller.
     */
    const subscribeToEvents = useCallback(() => {
        const controller = getActiveSubdivisionPlaybackController();
        if (!controller) return;

        // Unsubscribe from previous subscription
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
        }

        const unsubscribe = controller.subscribe((event: SubdivisionBeatEvent) => {
            setLastBeatEvent(event);

            // Log beat events for debugging
            logger.debug('SubdivisionPlayback', 'Beat event', {
                type: event.type,
                beatTime: event.beat.timestamp,
                subdivision: event.currentSubdivision,
                timeUntilBeat: event.timeUntilBeat,
            });
        });

        unsubscribeRef.current = unsubscribe;
        logger.debug('SubdivisionPlayback', 'Subscribed to beat events');
    }, []);

    /**
     * Update upcoming beats for visualization.
     * Called on each animation frame during playback.
     */
    const updateUpcomingBeats = useCallback(() => {
        const controller = getActiveSubdivisionPlaybackController();
        if (!controller || !isActive) return;

        const beats = controller.getUpcomingBeats(UPCOMING_BEATS_COUNT);
        setUpcomingBeats(beats);
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
     * Initialize and start the controller.
     */
    const startPlayback = useCallback(() => {
        const controller = getActiveSubdivisionPlaybackController();

        if (!controller) {
            // Initialize new controller if needed
            const audioContext = getAudioContext();
            if (!audioContext) return;

            const newController = initializeSubdivisionPlayback(audioContext);
            if (!newController) {
                logger.warn('SubdivisionPlayback', 'Failed to initialize controller');
                return;
            }
        }

        // Get the controller (either existing or newly created)
        const activeController = getActiveSubdivisionPlaybackController();
        if (!activeController) return;

        // Resume AudioContext if suspended
        if (activeController.getOptions().compensateOutputLatency) {
            // The controller handles audio context internally
        }

        subscribeToEvents();
        activeController.play();
        setIsActive(true);
        setIsPaused(false);
        startAnimationLoop();

        logger.info('SubdivisionPlayback', 'Playback started');
    }, [getAudioContext, initializeSubdivisionPlayback, subscribeToEvents, startAnimationLoop]);

    /**
     * Stop the controller.
     */
    const stopPlayback = useCallback(() => {
        stopAnimationLoop();

        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        const controller = getActiveSubdivisionPlaybackController();
        if (controller) {
            controller.stop();
        }

        setIsActive(false);
        setIsPaused(false);
        setUpcomingBeats([]);
        setLastBeatEvent(null);

        logger.info('SubdivisionPlayback', 'Playback stopped');
    }, [stopAnimationLoop]);

    /**
     * Pause playback.
     */
    const pausePlayback = useCallback(() => {
        const controller = getActiveSubdivisionPlaybackController();
        if (!controller) return;

        controller.pause();
        stopAnimationLoop();
        setIsPaused(true);

        logger.debug('SubdivisionPlayback', 'Playback paused');
    }, [stopAnimationLoop]);

    /**
     * Resume playback.
     */
    const resumePlayback = useCallback(() => {
        const controller = getActiveSubdivisionPlaybackController();
        if (!controller || !isActive) return;

        controller.resume();
        startAnimationLoop();
        setIsPaused(false);

        logger.debug('SubdivisionPlayback', 'Playback resumed');
    }, [isActive, startAnimationLoop]);

    /**
     * Seek to a specific time.
     */
    const seek = useCallback((time: number) => {
        const controller = getActiveSubdivisionPlaybackController();
        if (!controller) return;

        controller.seek(time);

        // Update upcoming beats after seek
        const beats = controller.getUpcomingBeats(UPCOMING_BEATS_COUNT);
        setUpcomingBeats(beats);

        logger.debug('SubdivisionPlayback', 'Seeked to time', { time });
    }, []);

    /**
     * Change subdivision type.
     */
    const setSubdivision = useCallback((type: SubdivisionType) => {
        // Update store state (this also updates the controller if it exists)
        setCurrentSubdivision(type);

        logger.info('SubdivisionPlayback', 'Subdivision changed', {
            subdivision: type,
        });
    }, [setCurrentSubdivision]);

    /**
     * Get beats within a time range.
     */
    const getBeatsInRange = useCallback((startTime: number, endTime: number): SubdividedBeat[] => {
        const controller = getActiveSubdivisionPlaybackController();
        if (!controller) return [];

        return controller.getBeatsInRange(startTime, endTime);
    }, []);

    /**
     * Get the beat at a specific time.
     */
    const getBeatAtTime = useCallback((time: number): SubdividedBeat | null => {
        const controller = getActiveSubdivisionPlaybackController();
        if (!controller) return null;

        return controller.getBeatAtTime(time);
    }, []);

    /**
     * Get the current beat.
     */
    const getCurrentBeat = useCallback((): SubdividedBeat | null => {
        const controller = getActiveSubdivisionPlaybackController();
        if (!controller) return null;

        return controller.getCurrentBeat();
    }, []);

    /**
     * Get the next beat.
     */
    const getNextBeat = useCallback((): SubdividedBeat | null => {
        const controller = getActiveSubdivisionPlaybackController();
        if (!controller) return null;

        return controller.getNextBeat();
    }, []);

    /**
     * Sync with audio player when time changes.
     */
    useEffect(() => {
        if (!isActive) return;

        const controller = getActiveSubdivisionPlaybackController();
        if (!controller) return;

        const controllerTime = controller.getCurrentTime();
        const drift = Math.abs(currentTime - controllerTime);
        const DRIFT_THRESHOLD = 0.3; // 300ms

        if (drift > DRIFT_THRESHOLD) {
            logger.debug('SubdivisionPlayback', 'Correcting drift', {
                audioPlayerTime: currentTime,
                controllerTime,
                drift: drift * 1000,
            });
            controller.seek(currentTime);
        }

        updateUpcomingBeats();
    }, [currentTime, isActive, updateUpcomingBeats]);

    /**
     * Auto-start/stop based on practice mode and playback state.
     */
    useEffect(() => {
        if (!practiceModeActive || !unifiedBeatMap) {
            if (isActive) {
                stopPlayback();
            }
            return;
        }

        if (isPlaying && !isActive) {
            // Start when playback begins
            startPlayback();
            // Sync to current audio position
            const controller = getActiveSubdivisionPlaybackController();
            if (controller && currentTime > 0) {
                controller.seek(currentTime);
                logger.debug('SubdivisionPlayback', 'Synced to audio position', {
                    audioPosition: currentTime,
                });
            }
        } else if (isPlaying && isActive && isPaused) {
            // Resume from paused state
            resumePlayback();
        } else if (!isPlaying && isActive && !isPaused) {
            // Pause when playback pauses
            pausePlayback();
        }
    }, [
        practiceModeActive,
        isPlaying,
        unifiedBeatMap,
        isActive,
        isPaused,
        startPlayback,
        stopPlayback,
        pausePlayback,
        resumePlayback,
        currentTime,
    ]);

    /**
     * Cleanup on unmount.
     */
    useEffect(() => {
        return () => {
            stopPlayback();
            cleanupSubdivisionPlayback();
        };
    }, [stopPlayback, cleanupSubdivisionPlayback]);

    /**
     * Initialize when practice mode becomes active.
     */
    useEffect(() => {
        if (practiceModeActive && unifiedBeatMap) {
            // Pre-initialize the controller when practice mode starts
            const audioContext = getAudioContext();
            if (audioContext) {
                initializeSubdivisionPlayback(audioContext);
            }
        }

        return () => {
            if (!practiceModeActive) {
                stopPlayback();
            }
        };
    }, [
        practiceModeActive,
        unifiedBeatMap,
        getAudioContext,
        initializeSubdivisionPlayback,
        stopPlayback,
    ]);

    return {
        currentSubdivision,
        lastBeatEvent,
        upcomingBeats,
        isActive,
        isPaused,
        setSubdivision,
        startPlayback,
        stopPlayback,
        pausePlayback,
        resumePlayback,
        seek,
        getBeatsInRange,
        getBeatAtTime,
        getCurrentBeat,
        getNextBeat,
        checkTap,
    };
};

// ============================================================
// Utility Hooks
// ============================================================

/**
 * Hook to get just the current subdivision type.
 * Useful for simple displays that don't need full playback functionality.
 *
 * @returns The current subdivision type
 */
export const useCurrentSubdivisionType = (): SubdivisionType => {
    return useCurrentSubdivision();
};

/**
 * Hook to check if subdivision playback is available.
 * Returns true if a UnifiedBeatMap exists.
 *
 * @returns Whether subdivision playback is available
 */
export const useSubdivisionPlaybackAvailable = (): boolean => {
    const unifiedBeatMap = useUnifiedBeatMap();
    return unifiedBeatMap !== null;
};
