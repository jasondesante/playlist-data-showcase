import { useState, useCallback, useEffect } from 'react';
import { SessionTracker, ListeningSession, PlaylistTrack, EnvironmentalContext, GamingContext } from 'playlist-data-engine';
import { useSessionStore } from '@/store/sessionStore';
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
    const [tracker] = useState(() => new SessionTracker());

    // Derive state directly from store - no local state sync issues
    const isActive = !!activeSession;
    const elapsedTime = activeSession?.elapsedSeconds ?? 0;

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

    return { startSession, endSession, isActive, elapsedTime };
};
