import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ServerlessPlaylist, PlaylistTrack, AudioProfile } from '@/types';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';

interface PlaylistState {
    currentPlaylist: ServerlessPlaylist | null;
    selectedTrack: PlaylistTrack | null;
    audioProfile: AudioProfile | null; // Audio analysis result for selected track (shared with Character Gen tab)
    isLoading: boolean;
    error: string | null;
    rawResponseData: unknown; // Raw Arweave response or input JSON (for debugging/engine verification)
    parsedTimestamp: string | null; // ISO timestamp of when playlist was parsed

    setPlaylist: (playlist: ServerlessPlaylist, rawData?: unknown) => void;
    selectTrack: (track: PlaylistTrack) => void;
    setAudioProfile: (profile: AudioProfile | null) => void; // Set audio profile for current track
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearPlaylist: () => void;
}

export const usePlaylistStore = create<PlaylistState>()(
    persist(
        (set) => ({
            currentPlaylist: null,
            selectedTrack: null,
            audioProfile: null,
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
                    parsedTimestamp: new Date().toISOString(),
                    // Clear audio profile when loading new playlist
                    audioProfile: null
                });
            },

            selectTrack: (track) => {
                logger.debug('Store', 'Selected track', track.title);
                set({ selectedTrack: track, audioProfile: null }); // Clear audio profile when changing tracks
            },

            setAudioProfile: (profile) => {
                logger.debug('Store', 'Setting audio profile', {
                    bass: profile?.bass_dominance,
                    mid: profile?.mid_dominance,
                    treble: profile?.treble_dominance
                });
                set({ audioProfile: profile });
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
                    audioProfile: null,
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
