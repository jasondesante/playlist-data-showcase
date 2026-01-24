import { useState, useCallback, useRef } from 'react';
import { SessionTracker, ListeningSession, PlaylistTrack, EnvironmentalContext, GamingContext } from 'playlist-data-engine';
import { useSessionStore } from '@/store/sessionStore';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';

interface SessionStartOptions {
    environmental_context?: EnvironmentalContext;
    gaming_context?: GamingContext;
}

export const useSessionTracker = () => {
    const { startSession: storeStartSession, endSession: storeEndSession } = useSessionStore();
    const [tracker] = useState(() => new SessionTracker());
    const [isActive, setIsActive] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerRef = useRef<number | null>(null);
    const sessionIdRef = useRef<string | null>(null);

    const startSession = useCallback((trackId: string, track: PlaylistTrack, options?: SessionStartOptions) => {
        logger.info('SessionTracker', 'Starting session', { trackId, hasContext: !!options });

        try {
            // SessionTracker.startSession API: startSession(trackId: string, track: PlaylistTrack, options?: { environmental_context, gaming_context })
            // Reference: USAGE_IN_OTHER_PROJECTS.md lines 146, 414-417
            const sessionId = tracker.startSession(trackId, track, options);
            sessionIdRef.current = sessionId;
            storeStartSession(sessionId);
            setIsActive(true);
            setElapsedTime(0);

            // Start local timer for UI display
            timerRef.current = window.setInterval(() => {
                setElapsedTime(t => t + 1);
            }, 1000);

            return sessionId;
        } catch (error) {
            handleError(error, 'SessionTracker');
            return null;
        }
    }, [tracker, storeStartSession]);

    const endSession = useCallback((): ListeningSession | null => {
        if (!isActive) return null;

        logger.info('SessionTracker', 'Ending session');

        try {
            const currentSessionId = sessionIdRef.current;
            if (!currentSessionId) {
                logger.warn('SessionTracker', 'Attempted to end session but no active sessionId found.');
                return null;
            }

            // endSession takes sessionId only, returns ListeningSession | null
            const session = tracker.endSession(currentSessionId);

            if (session) {
                storeEndSession(session);
            }
            setIsActive(false);
            sessionIdRef.current = null;

            if (timerRef.current !== null) {
                window.clearInterval(timerRef.current);
                timerRef.current = null;
            }

            return session;
        } catch (error) {
            handleError(error, 'SessionTracker');
            return null;
        }
    }, [tracker, isActive, storeEndSession]);

    return { startSession, endSession, isActive, elapsedTime };
};
