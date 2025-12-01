import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ListeningSession } from '@/types';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';

interface SessionState {
    currentSessionId: string | null;
    sessionHistory: ListeningSession[];

    startSession: (sessionId: string) => void;
    endSession: (session: ListeningSession) => void;
    clearHistory: () => void;
}

export const useSessionStore = create<SessionState>()(
    persist(
        (set) => ({
            currentSessionId: null,
            sessionHistory: [],

            startSession: (sessionId) => {
                logger.info('Store', 'Starting session', sessionId);
                set({ currentSessionId: sessionId });
            },

            endSession: (session) => {
                logger.info('Store', 'Ending session', { track: session.track_uuid, xp: session.total_xp_earned });
                set((state) => ({
                    currentSessionId: null,
                    sessionHistory: [session, ...state.sessionHistory] // Newest first
                }));
            },

            clearHistory: () => {
                logger.warn('Store', 'Clearing session history');
                set({ sessionHistory: [] });
            }
        }),
        {
            name: 'session-storage',
            storage: createJSONStorage(() => storage),
        }
    )
);
