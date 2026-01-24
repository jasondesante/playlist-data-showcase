import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ServerlessPlaylist, PlaylistTrack } from '@/types';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';

interface PlaylistState {
    currentPlaylist: ServerlessPlaylist | null;
    selectedTrack: PlaylistTrack | null;
    isLoading: boolean;
    error: string | null;
    rawResponseData: unknown; // Raw Arweave response or input JSON (for debugging/engine verification)
    parsedTimestamp: string | null; // ISO timestamp of when playlist was parsed

    setPlaylist: (playlist: ServerlessPlaylist, rawData?: unknown) => void;
    selectTrack: (track: PlaylistTrack) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearPlaylist: () => void;
}

export const usePlaylistStore = create<PlaylistState>()(
    persist(
        (set) => ({
            currentPlaylist: null,
            selectedTrack: null,
            isLoading: false,
            error: null,
            rawResponseData: null,
            parsedTimestamp: null,

            setPlaylist: (playlist, rawData) => {
                logger.info('Store', 'Setting playlist', { name: playlist.name, tracks: playlist.tracks.length });
                set({
                    currentPlaylist: playlist,
                    error: null,
                    rawResponseData: rawData ?? null,
                    parsedTimestamp: new Date().toISOString()
                });
            },

            selectTrack: (track) => {
                logger.debug('Store', 'Selected track', track.title);
                set({ selectedTrack: track });
            },

            setLoading: (loading) => set({ isLoading: loading }),

            setError: (error) => {
                if (error) logger.error('Store', 'Playlist error', error);
                set({ error });
            },

            clearPlaylist: () => {
                logger.info('Store', 'Clearing playlist');
                set({
                    currentPlaylist: null,
                    selectedTrack: null,
                    error: null,
                    rawResponseData: null,
                    parsedTimestamp: null
                });
            },
        }),
        {
            name: 'playlist-storage',
            storage: createJSONStorage(() => storage),
        }
    )
);
