import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ListeningSession, PlaylistTrack, ListeningSessionWithTrack } from '@/types';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';

interface ActiveSessionData {
    sessionId: string;
    trackId: string;
    track: PlaylistTrack;
    startTime: number; // Unix timestamp in seconds
    elapsedSeconds: number;
    isPaused: boolean;
}

interface SessionState {
    currentSessionId: string | null;
    sessionHistory: ListeningSessionWithTrack[];
    activeSession: ActiveSessionData | null;

    startSession: (sessionId: string, trackId: string, track: PlaylistTrack) => void;
    endSession: (session: ListeningSession, track?: PlaylistTrack) => void;
    pauseSession: () => void;
    resumeSession: () => void;
    updateElapsedTime: (elapsedSeconds: number) => void;
    clearHistory: () => void;
    /** Clear all sessions for a specific track (used by prestige system) */
    clearTrackSessions: (trackUuid: string) => number;
    /** Get total XP earned for a specific track */
    getTrackXPTotal: (trackUuid: string) => number;
}

export const useSessionStore = create<SessionState>()(
    persist(
        (set, get) => ({
            currentSessionId: null,
            sessionHistory: [],
            activeSession: null,

            startSession: (sessionId, trackId, track) => {
                logger.info('Store', 'Starting session', { sessionId, trackId });
                set({
                    currentSessionId: sessionId,
                    activeSession: {
                        sessionId,
                        trackId,
                        track,
                        startTime: Math.floor(Date.now() / 1000),
                        elapsedSeconds: 0,
                        isPaused: false
                    }
                });
            },

            endSession: (session, track) => {
                logger.info('Store', 'Ending session', { track: session.track_uuid, xp: session.total_xp_earned });

                // Create extended session with track metadata
                const sessionWithTrack: ListeningSessionWithTrack = {
                    ...session,
                    track_title: track?.title,
                    track_artist: track?.artist,
                    track_image_url: track?.image_url
                };

                set((state) => ({
                    currentSessionId: null,
                    activeSession: null,
                    sessionHistory: [sessionWithTrack, ...state.sessionHistory] // Newest first
                }));
            },

            pauseSession: () => {
                logger.info('Store', 'Pausing session');
                set((state) => ({
                    activeSession: state.activeSession ? { ...state.activeSession, isPaused: true } : null
                }));
            },

            resumeSession: () => {
                logger.info('Store', 'Resuming session');
                set((state) => ({
                    activeSession: state.activeSession ? { ...state.activeSession, isPaused: false } : null
                }));
            },

            updateElapsedTime: (elapsedSeconds: number) => {
                set((state) => ({
                    activeSession: state.activeSession ? { ...state.activeSession, elapsedSeconds } : null
                }));
            },

            clearHistory: () => {
                logger.warn('Store', 'Clearing session history');
                set({ sessionHistory: [] });
            },

            /**
             * Clear all sessions for a specific track.
             * Used by the prestige system to reset track progress after prestiging.
             * @param trackUuid - The track UUID to clear sessions for
             * @returns Number of sessions that were removed
             */
            clearTrackSessions: (trackUuid: string): number => {
                const state = get();
                const initialLength = state.sessionHistory.length;
                const newHistory = state.sessionHistory.filter(
                    (session) => session.track_uuid !== trackUuid
                );
                const removedCount = initialLength - newHistory.length;

                if (removedCount > 0) {
                    logger.info('Store', 'Cleared track sessions', { trackUuid, removedCount });
                    set({ sessionHistory: newHistory });
                }

                return removedCount;
            },

            /**
             * Get total XP earned for a specific track.
             * Used by the prestige system to calculate track-level XP.
             * @param trackUuid - The track UUID
             * @returns Total XP earned from sessions for this track
             */
            getTrackXPTotal: (trackUuid: string): number => {
                const state = get();
                return state.sessionHistory
                    .filter((session) => session.track_uuid === trackUuid)
                    .reduce((total, session) => total + (session.total_xp_earned || 0), 0);
            }
        }),
        {
            name: 'session-storage',
            storage: createJSONStorage(() => storage),
            // Only persist completed session history, NOT active session
            // Active sessions can't be restored (SessionTracker engine is fresh on page load)
            partialize: (state) => ({ sessionHistory: state.sessionHistory }),
        }
    )
);
