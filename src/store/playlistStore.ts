import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ServerlessPlaylist, PlaylistTrack, AudioProfile } from '@/types';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';

interface PlaylistState {
    /** Currently loaded playlist with tracks */
    currentPlaylist: ServerlessPlaylist | null;
    /** Track selected for analysis/character generation */
    selectedTrack: PlaylistTrack | null;
    /** Audio analysis result for selected track (shared with Character Gen tab) */
    audioProfile: AudioProfile | null;
    /** Loading state for playlist operations */
    isLoading: boolean;
    /** Error message from playlist operations */
    error: string | null;
    /** Raw Arweave response or input JSON (for debugging/engine verification) */
    rawResponseData: unknown;
    /** ISO timestamp of when playlist was parsed */
    parsedTimestamp: string | null;

    /** Set the current playlist and clear previous state */
    setPlaylist: (playlist: ServerlessPlaylist, rawData?: unknown) => void;
    /** Select a track for analysis and clear any previous audio profile */
    selectTrack: (track: PlaylistTrack) => void;
    /** Set audio profile for current track after analysis */
    setAudioProfile: (profile: AudioProfile | null) => void;
    /** Set loading state for playlist operations */
    setLoading: (loading: boolean) => void;
    /** Set error message from playlist operations */
    setError: (error: string | null) => void;
    /** Clear all playlist state including tracks and audio data */
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

            /**
             * Set the current playlist and update state
             * @param playlist - The parsed ServerlessPlaylist object
             * @param rawData - Optional raw response data for debugging
             * @example
             * ```ts
             * const playlist = await parser.parse(jsonString);
             * setPlaylist(playlist, jsonString);
             * ```
             */
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

                // Trigger track restoration after playlist is set
                // This handles the race condition where restoration is called before playlist loads
                // Use dynamic import to avoid circular dependency issues
                import('@/store/characterStore').then(({ useCharacterStore }) => {
                    useCharacterStore.getState().restoreSelectedTrackFromActiveCharacter();
                }).catch((error) => {
                    // Character store may not be initialized yet, which is fine
                    logger.debug('Store', 'Could not trigger restoration after playlist load', error);
                });
            },

            /**
             * Select a track from the playlist for analysis
             * Automatically clears any previous audio profile
             * @param track - The PlaylistTrack to select
             * @example
             * ```ts
             * selectTrack(playlist.tracks[0]);
             * ```
             */
            selectTrack: (track) => {
                logger.debug('Store', 'Selected track', track.title);
                set({ selectedTrack: track, audioProfile: null }); // Clear audio profile when changing tracks
            },

            /**
             * Set the audio profile result after analysis
             * @param profile - AudioProfile from AudioAnalyzer or null to clear
             * @example
             * ```ts
             * const profile = await analyzer.extractSonicFingerprint(audioUrl);
             * setAudioProfile(profile);
             * ```
             */
            setAudioProfile: (profile) => {
                logger.debug('Store', 'Setting audio profile', {
                    bass: profile?.bass_dominance,
                    mid: profile?.mid_dominance,
                    treble: profile?.treble_dominance
                });
                set({ audioProfile: profile });
            },

            /**
             * Set the loading state for playlist operations
             * @param loading - True when loading, false when complete
             */
            setLoading: (loading) => set({ isLoading: loading }),

            /**
             * Set or clear error message from playlist operations
             * @param error - Error message string, or null to clear
             */
            setError: (error) => {
                if (error) logger.error('Store', 'Playlist error', error);
                set({ error });
            },

            /**
             * Clear all playlist state including tracks and audio data
             * Useful for resetting the app or loading a new playlist
             * @example
             * ```ts
             * clearPlaylist(); // Resets all playlist state
             * ```
             */
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
            // Don't persist selectedTrack - it causes race conditions with session tracking
            // When a new track is selected, stale persisted data can cause incorrect behavior
            partialize: (state) => ({
                currentPlaylist: state.currentPlaylist,
                audioProfile: state.audioProfile,
                isLoading: state.isLoading,
                error: state.error,
                rawResponseData: state.rawResponseData,
                parsedTimestamp: state.parsedTimestamp,
            }),
        }
    )
);
