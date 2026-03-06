import { useCallback, useEffect, useMemo } from 'react';
import { SessionTracker, ListeningSession, PlaylistTrack, EnvironmentalContext, GamingContext, BASE_PLAYS_THRESHOLD } from 'playlist-data-engine';
import { useSessionStore } from '@/store/sessionStore';
import { useAudioPlayerStore } from '@/store/audioPlayerStore';
import { usePlaylistStore } from '@/store/playlistStore';
import { useSensorStore } from '@/store/sensorStore';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';

interface SessionStartOptions {
    environmental_context?: EnvironmentalContext;
    gaming_context?: GamingContext;
}

/**
 * Aggregate statistics from session history
 */
export interface SessionStats {
    /** Total number of completed sessions */
    totalSessions: number;
    /** Total XP earned across all sessions */
    totalXP: number;
    /** Total listening time in seconds */
    totalListeningTime: number;
    /** Average XP per session */
    averageXPPerSession: number;
    /** Average session duration in seconds */
    averageSessionDuration: number;
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

// Global singleton tracker - ensures all components share the same SessionTracker instance
// This prevents issues where one component starts a session and another tries to end it
const globalTracker = new SessionTracker();

// Global flag to ensure zombie cleanup only runs ONCE per app load
// (not once per component instance that uses the hook)
let hasRunZombieCleanup = false;

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
 * const {
 *   startSession,
 *   endSession,
 *   isActive,
 *   elapsedTime,
 *   sessionHistory,
 *   getTrackListenCount,
 *   isTrackMastered,
 *   getSessionStats
 * } = useSessionTracker();
 *
 * const sessionId = startSession(trackId, track, { environmental_context, gaming_context });
 * // ... user listens ...
 * const session = endSession();
 *
 * // Get track listen count
 * const listenCount = getTrackListenCount('track-uuid');
 *
 * // Check if track is mastered
 * const mastered = isTrackMastered('track-uuid');
 *
 * // Get aggregate stats
 * const stats = getSessionStats();
 * console.log(`Total XP: ${stats.totalXP}, Sessions: ${stats.totalSessions}`);
 * ```
 *
 * @returns {Object} Hook return object
 * @returns {Function} startSession - Starts a new session (returns sessionId)
 * @returns {Function} endSession - Ends the current session (returns ListeningSession or null)
 * @returns {boolean} isActive - Whether a session is currently active
 * @returns {number} elapsedTime - Elapsed time in seconds for the current session
 * @returns {string|null} sessionId - Current session ID or null
 * @returns {Array} sessionHistory - Array of completed ListeningSession objects
 * @returns {Function} getTrackListenCount - Get listen count for a track by UUID
 * @returns {Function} isTrackMastered - Check if track has reached mastery threshold
 * @returns {Function} getSessionStats - Get aggregate statistics from session history
 */
export const useSessionTracker = () => {
    const { startSession: storeStartSession, endSession: storeEndSession, activeSession, sessionHistory } = useSessionStore();
    const { playbackState, currentUrl } = useAudioPlayerStore();
    const { environmentalContext, gamingContext } = useSensorStore();
    // Use global singleton tracker instead of per-component instance
    const tracker = globalTracker;

    // Derive state directly from store - no local state sync issues
    const isActive = !!activeSession;
    const elapsedTime = activeSession?.elapsedSeconds ?? 0;

    /**
     * Get the number of times a track has been listened to
     * by counting sessions in the history for that track UUID
     */
    const getTrackListenCount = useCallback((trackId: string): number => {
        return sessionHistory.filter(session => session.track_uuid === trackId).length;
    }, [sessionHistory]);

    /**
     * Check if a track is mastered (has reached the mastery threshold)
     * Note: This is a simple listen-count check. For prestige-aware mastery,
     * use useMastery().isTrackMastered() instead.
     * @param trackId - The track UUID to check
     * @param threshold - Optional custom threshold (defaults to base threshold)
     */
    const isTrackMastered = useCallback((trackId: string, threshold: number = BASE_PLAYS_THRESHOLD): boolean => {
        const listenCount = getTrackListenCount(trackId);
        return listenCount >= threshold;
    }, [getTrackListenCount]);

    /**
     * Calculate aggregate statistics from all sessions in history
     */
    const getSessionStats = useCallback((): SessionStats => {
        const totalSessions = sessionHistory.length;
        const totalXP = sessionHistory.reduce((sum, s) => sum + (s.total_xp_earned || 0), 0);
        const totalListeningTime = sessionHistory.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
        const averageXPPerSession = totalSessions > 0 ? Math.round(totalXP / totalSessions) : 0;
        const averageSessionDuration = totalSessions > 0 ? Math.round(totalListeningTime / totalSessions) : 0;

        return {
            totalSessions,
            totalXP,
            totalListeningTime,
            averageXPPerSession,
            averageSessionDuration
        };
    }, [sessionHistory]);

    // Session cleanup on page load: ALWAYS clear any persisted session
    // The SessionTracker engine instance is fresh on page load and can't restore previous sessions
    // So we must clear the store to avoid orphaned sessions that can't be ended
    useEffect(() => {
        if (hasRunZombieCleanup) return;

        const activeSessionOnMount = useSessionStore.getState().activeSession;
        if (activeSessionOnMount) {
            logger.info('SessionTracker', 'Clearing persisted session on page load (cannot restore)', { sessionId: activeSessionOnMount.sessionId });
            timerManager.stop();
            useSessionStore.setState({ activeSession: null, currentSessionId: null });
        }

        // Only clear stale selectedTrack if there's an actual URL mismatch
        // CRITICAL: Do NOT clear selectedTrack if currentUrl is null - this means nothing is playing yet
        // and the selectedTrack may have been intentionally restored from the active character
        const selectedTrackOnMount = usePlaylistStore.getState().selectedTrack;
        const currentUrlOnMount = useAudioPlayerStore.getState().currentUrl;

        logger.info('SessionTracker', 'Zombie cleanup: checking selectedTrack state', {
            hasSelectedTrack: !!selectedTrackOnMount,
            selectedTrackId: selectedTrackOnMount?.id,
            selectedTrackUrl: selectedTrackOnMount?.audio_url,
            currentUrl: currentUrlOnMount,
            urlMismatch: selectedTrackOnMount ? selectedTrackOnMount.audio_url !== currentUrlOnMount : 'N/A',
            currentUrlIsNull: currentUrlOnMount === null
        });

        // Only clear selectedTrack if BOTH URLs are non-null AND different
        // If currentUrl is null, it means audio hasn't started - don't interfere with restoration
        if (selectedTrackOnMount && currentUrlOnMount !== null && selectedTrackOnMount.audio_url !== currentUrlOnMount) {
            logger.info('SessionTracker', 'Clearing stale selectedTrack on page load (URL mismatch with playing audio)', {
                trackId: selectedTrackOnMount.id,
                trackUrl: selectedTrackOnMount.audio_url,
                currentUrl: currentUrlOnMount
            });
            usePlaylistStore.setState({ selectedTrack: null });
        } else if (selectedTrackOnMount && currentUrlOnMount === null) {
            logger.info('SessionTracker', 'Preserving selectedTrack - currentUrl is null (audio not started yet)', {
                trackId: selectedTrackOnMount.id,
                trackUrl: selectedTrackOnMount.audio_url
            });
        }

        hasRunZombieCleanup = true;
    }, []); // Empty deps - only runs once on mount

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

    // Auto-start session when audio plays (if not already started)
    // This ensures that playing audio from any tab (including playlist) starts a session
    useEffect(() => {
        // CRITICAL: Always read fresh selectedTrack from store to avoid stale closure values
        // The zombie cleanup may have cleared selectedTrack, but we need to see that change
        const freshSelectedTrack = usePlaylistStore.getState().selectedTrack;
        const playlist = usePlaylistStore.getState().currentPlaylist;

        logger.debug('SessionTracker', 'Auto-start effect check', {
            playbackState,
            hasActiveSession: !!activeSession,
            hasSelectedTrack: !!freshSelectedTrack,
            currentUrl,
            selectedTrackId: freshSelectedTrack?.id,
            selectedTrackTitle: freshSelectedTrack?.title,
            hasPlaylist: !!playlist,
            playlistTrackCount: playlist?.tracks.length
        });

        if (playbackState === 'playing' && !activeSession) {
            if (!freshSelectedTrack) {
                logger.debug('SessionTracker', 'CANNOT AUTO-START: selectedTrack is null!', {
                    currentUrl,
                    playlist: playlist?.name
                });
                // Try to find track from playlist using currentUrl
                if (currentUrl && playlist) {
                    const trackFromPlaylist = playlist.tracks.find(t => t.audio_url === currentUrl);
                    if (trackFromPlaylist) {
                        logger.debug('SessionTracker', 'Found track from playlist via currentUrl', {
                            trackId: trackFromPlaylist.id,
                            trackTitle: trackFromPlaylist.title
                        });
                        usePlaylistStore.setState({ selectedTrack: trackFromPlaylist });
                        logger.debug('SessionTracker', 'Auto-starting session after setting selectedTrack', {
                            trackId: trackFromPlaylist.id,
                            currentUrl,
                            hasEnvironmentalContext: !!environmentalContext,
                            hasGamingContext: !!gamingContext
                        });
                        startSession(trackFromPlaylist.id, trackFromPlaylist, {
                            environmental_context: environmentalContext || undefined,
                            gaming_context: gamingContext || undefined
                        });
                        return;
                    }
                }
            } else {
                logger.debug('SessionTracker', 'Auto-starting session', {
                    trackId: freshSelectedTrack.id,
                    trackTitle: freshSelectedTrack.title,
                    currentUrl,
                    hasEnvironmentalContext: !!environmentalContext,
                    hasGamingContext: !!gamingContext
                });
                startSession(freshSelectedTrack.id, freshSelectedTrack, {
                    environmental_context: environmentalContext || undefined,
                    gaming_context: gamingContext || undefined
                });
            }
        }
    }, [playbackState, activeSession, startSession, currentUrl, environmentalContext, gamingContext]);

    // Auto-end session when audio pauses or ends
    // This ensures pausing music stops the session and awards XP
    useEffect(() => {
        logger.debug('SessionTracker', 'Auto-end effect check', {
            playbackState,
            hasActiveSession: !!activeSession,
            shouldEnd: (playbackState === 'paused' || playbackState === 'ended') && !!activeSession
        });

        if ((playbackState === 'paused' || playbackState === 'ended') && activeSession) {
            logger.debug('SessionTracker', '✓ Auto-ending session on pause/end', {
                playbackState,
                sessionTrackId: activeSession.trackId,
                sessionDuration: activeSession.elapsedSeconds
            });
            // Get the endSession function directly to avoid dependency issues
            const currentSessionId = activeSession.sessionId;
            const track = activeSession.track;
            if (currentSessionId) {
                try {
                    const session = globalTracker.endSession(currentSessionId);
                    if (session) {
                        logger.debug('SessionTracker', 'Session ended, duration:', {
                            duration: session.duration_seconds,
                            xp: session.total_xp_earned
                        });
                        storeEndSession(session, track);
                    }
                    timerManager.stop();
                } catch (error) {
                    handleError(error, 'SessionTracker');
                }
            }
        }
    }, [playbackState, activeSession, storeEndSession]);

    // Auto-end and restart session when switching to a different track while playing
    // This ensures XP is awarded for the previous track before starting a new session
    useEffect(() => {
        logger.debug('SessionTracker', 'Track-change effect check', {
            playbackState,
            hasActiveSession: !!activeSession,
            activeSessionTrackId: activeSession?.trackId,
            activeSessionUrl: activeSession?.track.audio_url,
            currentUrl,
            urlMismatch: activeSession ? activeSession.track.audio_url !== currentUrl : 'N/A'
        });

        if (playbackState === 'playing' && activeSession) {
            // Check if the currentUrl is different from the active session's track URL
            // This is more reliable than comparing track IDs because URLs update atomically
            if (activeSession.track.audio_url !== currentUrl) {
                const freshSelectedTrack = usePlaylistStore.getState().selectedTrack;

                // CRITICAL: Only end session if we're switching to a DIFFERENT track
                // If currentUrl is null or there's no selected track, don't end the session
                // The audio is still playing, so the session should continue
                if (!currentUrl || !freshSelectedTrack || freshSelectedTrack.audio_url === activeSession.track.audio_url) {
                    logger.debug('SessionTracker', 'URL mismatch but NOT ending session - no actual track change', {
                        activeSessionUrl: activeSession.track.audio_url,
                        currentUrl,
                        hasSelectedTrack: !!freshSelectedTrack,
                        selectedTrackUrl: freshSelectedTrack?.audio_url
                    });
                    return;
                }

                logger.debug('SessionTracker', 'Track changed while playing - ending old session and starting new', {
                    oldUrl: activeSession.track.audio_url,
                    newUrl: currentUrl,
                    oldTrackId: activeSession.trackId,
                    newTrackId: freshSelectedTrack?.id
                });

                // End the current session
                const currentSessionId = activeSession.sessionId;
                const track = activeSession.track;
                if (currentSessionId) {
                    try {
                        const session = globalTracker.endSession(currentSessionId);
                        if (session) {
                            storeEndSession(session, track);
                        }
                        timerManager.stop();
                    } catch (error) {
                        handleError(error, 'SessionTracker');
                    }
                }

                // Start a new session for the new track
                // Note: This will be handled by the auto-start effect since activeSession will be null after storeEndSession
            }
        }
    }, [playbackState, activeSession, storeEndSession, currentUrl]); // Note: selectedTrack NOT in deps

    const endSession = useCallback((): ListeningSession | null => {
        // Check store state directly, not local state
        if (!activeSession) return null;

        logger.info('SessionTracker', 'Ending session');

        try {
            const currentSessionId = activeSession.sessionId;
            const track = activeSession.track;
            if (!currentSessionId) {
                logger.warn('SessionTracker', 'Attempted to end session but no active sessionId found.');
                return null;
            }

            // endSession takes sessionId only, returns ListeningSession | null
            const session = tracker.endSession(currentSessionId);

            if (session) {
                storeEndSession(session, track);
            }
            timerManager.stop();

            return session;
        } catch (error) {
            handleError(error, 'SessionTracker');
            return null;
        }
    }, [tracker, storeEndSession, activeSession]);

    return useMemo(() => ({
        startSession,
        endSession,
        isActive,
        elapsedTime,
        sessionId: activeSession?.sessionId ?? null,
        // New methods for Phase 5
        sessionHistory,
        getTrackListenCount,
        isTrackMastered,
        getSessionStats
    }), [
        startSession,
        endSession,
        isActive,
        elapsedTime,
        activeSession?.sessionId,
        sessionHistory,
        getTrackListenCount,
        isTrackMastered,
        getSessionStats
    ]);
};
