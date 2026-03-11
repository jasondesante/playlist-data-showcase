import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ServerlessPlaylist, PlaylistTrack, AudioProfile, GenreProfile } from '@/types';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';

interface PlaylistState {
    /** Currently loaded playlist with tracks */
    currentPlaylist: ServerlessPlaylist | null;
    /** Track selected for analysis/character generation */
    selectedTrack: PlaylistTrack | null;
    /** Audio analysis result for selected track (shared with Character Gen tab) */
    audioProfile: AudioProfile | null;
    /** Genre analysis result for selected track (ML-based classification) */
    genreProfile: GenreProfile | null;
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
    /** Set genre profile for current track after ML analysis */
    setGenreProfile: (profile: GenreProfile | null) => void;
    /** Set loading state for playlist operations */
    setLoading: (loading: boolean) => void;
    /** Set error message from playlist operations */
    setError: (error: string | null) => void;
    /** Clear all playlist state including tracks and audio data */
    clearPlaylist: () => void;
}

// Callback type for playlist load events
type PlaylistLoadCallback = (playlist: ServerlessPlaylist | null) => void;

// Global registry of callbacks to notify when playlist is loaded
// This allows characterStore to be notified when playlist becomes available
const playlistLoadCallbacks: Set<PlaylistLoadCallback> = new Set();

/**
 * Register a callback to be invoked when the playlist is loaded or changed.
 * Useful for components/stores that need to react to playlist availability.
 * @returns Cleanup function to unregister the callback
 */
export function onPlaylistLoad(callback: PlaylistLoadCallback): () => void {
    playlistLoadCallbacks.add(callback);
    return () => {
        playlistLoadCallbacks.delete(callback);
    };
}

/**
 * Notify all registered callbacks that the playlist has been loaded.
 */
function notifyPlaylistLoadCallbacks(playlist: ServerlessPlaylist | null) {
    for (const callback of playlistLoadCallbacks) {
        try {
            callback(playlist);
        } catch (error) {
            logger.error('Store', 'Error in playlist load callback', error);
        }
    }
}

export const usePlaylistStore = create<PlaylistState>()(
    persist(
        (set) => ({
            currentPlaylist: null,
            selectedTrack: null,
            audioProfile: null,
            genreProfile: null,
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
                    audioProfile: null,
                    // Clear genre profile when loading new playlist
                    genreProfile: null
                });

                // Notify all registered callbacks that playlist has been loaded
                notifyPlaylistLoadCallbacks(playlist);
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
                set({ selectedTrack: track, audioProfile: null, genreProfile: null }); // Clear profiles when changing tracks
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
             * Set the genre profile result after ML analysis
             * @param profile - GenreProfile from GenreAnalyzer or null to clear
             * @example
             * ```ts
             * const profile = await genreAnalyzer.analyzeGenre(audioUrl);
             * setGenreProfile(profile);
             * ```
             */
            setGenreProfile: (profile) => {
                logger.debug('Store', 'Setting genre profile', {
                    primary: profile?.primary_genre,
                    genreCount: profile?.genres?.length
                });
                set({ genreProfile: profile });
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
                    genreProfile: null,
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
                genreProfile: state.genreProfile,
                isLoading: state.isLoading,
                error: state.error,
                rawResponseData: state.rawResponseData,
                parsedTimestamp: state.parsedTimestamp,
            }),
            // Callback after zustand finishes hydrating from localStorage
            // This is critical because setPlaylist is NOT called during hydration
            // So we need to notify listeners that the playlist is now available
            onRehydrateStorage: () => {
                return (state) => {
                    if (state?.currentPlaylist) {
                        logger.info('Store', 'Playlist rehydrated from storage, notifying listeners', {
                            name: state.currentPlaylist.name,
                            tracks: state.currentPlaylist.tracks.length
                        });
                        // Notify all registered callbacks that playlist has been loaded from storage
                        notifyPlaylistLoadCallbacks(state.currentPlaylist);
                    }
                };
            },
        }
    )
);
