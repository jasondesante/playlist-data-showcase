import { useState, useCallback, useEffect, useRef } from 'react';
import { SessionTracker, ListeningSession, PlaylistTrack, EnvironmentalContext, GamingContext } from 'playlist-data-engine';
import { useSessionStore } from '@/store/sessionStore';
import { useAudioPlayerStore } from '@/store/audioPlayerStore';
import { usePlaylistStore } from '@/store/playlistStore';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';

interface SessionStartOptions {
    environmental_context?: EnvironmentalContext;
    gaming_context?: GamingContext;
}

// Global singleton timer manager - persists across component unmounts
class SessionTimerManager {
    private timerId: number | null = null;

    start() {
        if (this.timerId !== null) return; // Already running

        this.timerId = window.setInterval(() => {
            const state = useSessionStore.getState();
            if (state.activeSession && !state.activeSession.isPaused) {
                const newTime = state.activeSession.elapsedSeconds + 1;
                state.updateElapsedTime(newTime);
            } else {
                this.stop();
            }
        }, 1000);
    }

    stop() {
        if (this.timerId !== null) {
            window.clearInterval(this.timerId);
            this.timerId = null;
        }
    }
}

const timerManager = new SessionTimerManager();

/**
 * React hook for tracking listening sessions with the SessionTracker engine module.
 *
 * Manages active listening sessions with elapsed time tracking and supports
 * optional environmental and gaming context for XP modifier calculations.
 *
 * The timer persists across tab changes because it's managed by a global singleton,
 * not component lifecycle.
 *
 * @example
 * ```tsx
 * const { startSession, endSession, isActive, elapsedTime } = useSessionTracker();
 * const sessionId = startSession(trackId, track, { environmental_context, gaming_context });
 * // ... user listens ...
 * const session = endSession();
 * ```
 *
 * @returns {Object} Hook return object
 * @returns {Function} startSession - Starts a new session (returns sessionId)
 * @returns {Function} endSession - Ends the current session (returns ListeningSession or null)
 * @returns {boolean} isActive - Whether a session is currently active
 * @returns {number} elapsedTime - Elapsed time in seconds for the current session
 */
export const useSessionTracker = () => {
    const { startSession: storeStartSession, endSession: storeEndSession, activeSession } = useSessionStore();
    const { playbackState } = useAudioPlayerStore();
    const { selectedTrack } = usePlaylistStore();
    const [tracker] = useState(() => new SessionTracker());
    const [hasAutoStartedSession, setHasAutoStartedSession] = useState(false);

    // Derive state directly from store - no local state sync issues
    const isActive = !!activeSession;
    const elapsedTime = activeSession?.elapsedSeconds ?? 0;

    // Kill zombie sessions on page load - but check if we should preserve the session
    // We check synchronously if audio might be playing by checking the audio element directly
    useEffect(() => {
        const activeSessionOnMount = useSessionStore.getState().activeSession;
        if (activeSessionOnMount) {
            // Try to check the actual audio element state
            // The audio element is a global singleton that might still be playing
            let isAudioActuallyPlaying = false;

            // Check if there's an audio element and if it's playing
            // We can't import audioPlayerStore here due to potential circular dependency
            // But we can check the DOM directly as a workaround
            const audioElements = document.getElementsByTagName('audio');
            if (audioElements.length > 0) {
                const audioEl = audioElements[0];
                isAudioActuallyPlaying = !audioEl.paused && audioEl.readyState >= 2; // HAVE_CURRENT_DATA
            }

            if (isAudioActuallyPlaying) {
                // Audio is playing - preserve the session and restart timer
                logger.info('SessionTracker', 'Session restored - audio is playing', { sessionId: activeSessionOnMount.sessionId });
                timerManager.start();
            } else {
                // Audio is not playing - this is a zombie session, kill it
                logger.info('SessionTracker', 'Cleaning up zombie session on page load', { sessionId: activeSessionOnMount.sessionId });
                timerManager.stop();
                // Clear the active session from store without adding to history
                useSessionStore.setState({ activeSession: null, currentSessionId: null });
            }
        }
        // Run once on mount - empty deps array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Manage timer based on active session state from store
    useEffect(() => {
        if (activeSession && !activeSession.isPaused) {
            timerManager.start();
        } else {
            timerManager.stop();
        }
    }, [activeSession]);

    const startSession = useCallback((trackId: string, track: PlaylistTrack, options?: SessionStartOptions) => {
        logger.info('SessionTracker', 'Starting session', { trackId, hasContext: !!options });

        try {
            // SessionTracker.startSession API: startSession(trackId: string, track: PlaylistTrack, options?: { environmental_context, gaming_context })
            // Reference: USAGE_IN_OTHER_PROJECTS.md lines 146, 414-417
            const sessionId = tracker.startSession(trackId, track, options);
            storeStartSession(sessionId, trackId, track);

            return sessionId;
        } catch (error) {
            handleError(error, 'SessionTracker');
            return null;
        }
    }, [tracker, storeStartSession]);

    // Store startSession in a ref for use in auto-start effect
    const startSessionRef = useRef(startSession);
    startSessionRef.current = startSession;

    // Auto-start session when audio plays (if not already started)
    // This ensures that playing audio from any tab (including playlist) starts a session
    useEffect(() => {
        // Only auto-start if:
        // 1. Audio is playing
        // 2. No active session exists
        // 3. A track is selected in the playlist store
        // 4. We haven't already auto-started (prevents loops)
        if (
            playbackState === 'playing' &&
            !activeSession &&
            selectedTrack &&
            !hasAutoStartedSession
        ) {
            logger.info('SessionTracker', 'Auto-starting session due to audio playback', { trackId: selectedTrack.id });
            setHasAutoStartedSession(true);
            startSessionRef.current(selectedTrack.id, selectedTrack);
        }

        // Reset flag when audio stops or session ends
        if (playbackState !== 'playing' || !activeSession) {
            setHasAutoStartedSession(false);
        }
    }, [playbackState, activeSession, selectedTrack, hasAutoStartedSession]);

    const endSession = useCallback((): ListeningSession | null => {
        // Check store state directly, not local state
        if (!activeSession) return null;

        logger.info('SessionTracker', 'Ending session');

        try {
            const currentSessionId = activeSession.sessionId;
            if (!currentSessionId) {
                logger.warn('SessionTracker', 'Attempted to end session but no active sessionId found.');
                return null;
            }

            // endSession takes sessionId only, returns ListeningSession | null
            const session = tracker.endSession(currentSessionId);

            if (session) {
                storeEndSession(session);
            }
            timerManager.stop();

            return session;
        } catch (error) {
            handleError(error, 'SessionTracker');
            return null;
        }
    }, [tracker, storeEndSession, activeSession]);

    return { startSession, endSession, isActive, elapsedTime, sessionId: activeSession?.sessionId ?? null };
};
