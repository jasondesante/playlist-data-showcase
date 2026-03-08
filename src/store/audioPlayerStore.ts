/**
 * Audio Player Store
 *
 * Manages audio playback state using HTML5 Audio API.
 * Provides a global audio player instance that can be controlled from any component.
 *
 * Includes Arweave gateway fallback support - when playing Arweave URLs,
 * automatically tries alternate gateways if the primary gateway fails.
 */

import { create } from 'zustand';
import { isArweaveUrl } from '@/utils/arweaveUtils';
import { arweaveGatewayManager } from '@/utils/arweaveGatewayManager';
import { logger } from '@/utils/logger';

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

interface AudioPlayerState {
    /** The URL of the currently loaded audio */
    currentUrl: string | null;
    /** Current playback state */
    playbackState: PlaybackState;
    /** Current playback position in seconds */
    currentTime: number;
    /** Total duration in seconds */
    duration: number;
    /** Volume level (0-1) */
    volume: number;
    /** Whether audio is muted */
    isMuted: boolean;
    /** Error message if playback failed */
    error: string | null;

    /** Actions */
    play: (url: string) => Promise<void>;
    pause: () => void;
    resume: () => void;
    togglePlay: (url: string) => Promise<void>;  // Toggle play/pause for given URL
    stop: () => void;
    seek: (time: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    updateTime: (time: number) => void;
    updateDuration: (duration: number) => void;
    setPlaybackState: (state: PlaybackState) => void;
    setError: (error: string | null) => void;
    /** Load a track URL without starting playback (preloads the audio) */
    load: (url: string) => Promise<void>;
}

// Global HTML5 Audio instance
let audioElement: HTMLAudioElement | null = null;

const getAudioElement = (): HTMLAudioElement => {
    if (!audioElement) {
        audioElement = new Audio();
        audioElement.preload = 'metadata';

        // Set up event listeners
        audioElement.addEventListener('loadstart', () => {
            useAudioPlayerStore.getState().setPlaybackState('loading');
        });

        audioElement.addEventListener('canplay', () => {
            const store = useAudioPlayerStore.getState();

            // CRITICAL: Check the actual audio element state, not the store state
            // The 'play' event might have set store.playbackState to 'playing', but due to
            // React batching, it might not be visible here. So we check audioElement.paused directly.
            const isActuallyPlaying = audioElement && !audioElement.paused && audioElement.readyState >= 2; // HAVE_CURRENT_DATA

            // If audio is actually playing, keep it as 'playing' - don't override to 'paused'
            if (isActuallyPlaying) {
                // Ensure the store reflects reality
                if (store.playbackState !== 'playing') {
                    useAudioPlayerStore.getState().setPlaybackState('playing');
                }
                return;
            }

            // Only set to 'paused' if currently 'loading' AND not actually playing
            if (store.playbackState === 'loading' && !isActuallyPlaying) {
                // Don't auto-play, just transition to ready state
                useAudioPlayerStore.getState().setPlaybackState('paused');
            }
        });

        audioElement.addEventListener('play', () => {
            useAudioPlayerStore.getState().setPlaybackState('playing');
        });

        audioElement.addEventListener('pause', () => {
            const store = useAudioPlayerStore.getState();
            if (store.playbackState === 'playing') {
                useAudioPlayerStore.getState().setPlaybackState('paused');
            }
        });

        audioElement.addEventListener('ended', () => {
            useAudioPlayerStore.getState().setPlaybackState('ended');
        });

        audioElement.addEventListener('error', () => {
            useAudioPlayerStore.getState().setError('Failed to load audio');
            useAudioPlayerStore.getState().setPlaybackState('error');
        });

        audioElement.addEventListener('timeupdate', () => {
            if (audioElement) {
                useAudioPlayerStore.getState().updateTime(audioElement.currentTime);
            }
        });

        audioElement.addEventListener('loadedmetadata', () => {
            if (audioElement) {
                useAudioPlayerStore.getState().updateDuration(audioElement.duration);
            }
        });
    }
    return audioElement;
};

export const useAudioPlayerStore = create<AudioPlayerState>((set, get) => ({
    currentUrl: null,
    playbackState: 'idle',
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    error: null,

    play: async (url: string) => {
        const audio = getAudioElement();
        const currentUrl = get().currentUrl;

        // Resolve Arweave URLs through gateway manager (handles non-Arweave URLs too)
        let resolvedUrl = url;
        if (isArweaveUrl(url)) {
            set({ playbackState: 'loading' });
            try {
                resolvedUrl = await arweaveGatewayManager.resolveUrl(url);
                if (resolvedUrl !== url) {
                    logger.info('Store', 'Arweave URL resolved to alternate gateway', {
                        originalUrl: url,
                        resolvedUrl,
                    });
                }
            } catch (err) {
                logger.error('Store', 'Arweave gateway resolution failed', { url, error: err });
                // Fall back to original URL
                resolvedUrl = url;
            }
        }

        if (currentUrl !== url) {
            // New track - load and play
            audio.src = resolvedUrl;
            set({ currentUrl: url, currentTime: 0, error: null, playbackState: 'loading' });
            audio.play().catch((err) => {
                console.error('Playback failed:', err);
                set({ error: err.message, playbackState: 'error' });
            });
        } else {
            // Same track - resume if paused or restart if ended
            const state = get().playbackState;
            if (state === 'paused') {
                audio.play().catch((err) => {
                    console.error('Playback failed:', err);
                    set({ error: err.message, playbackState: 'error' });
                });
            } else if (state === 'ended') {
                // Restart from beginning when song has ended
                // Don't set playbackState to 'loading' here - the canplay event handler
                // would override it to 'paused' before play() actually starts.
                // Let the 'play' event naturally set state to 'playing'.
                audio.currentTime = 0;
                set({ currentTime: 0 });
                audio.play().catch((err) => {
                    console.error('Playback failed:', err);
                    set({ error: err.message, playbackState: 'error' });
                });
            }
        }
    },

    pause: () => {
        const audio = getAudioElement();
        if (get().playbackState === 'playing') {
            audio.pause();
        }
    },

    resume: () => {
        const audio = getAudioElement();
        const state = get().playbackState;
        
        if (state === 'paused' && get().currentUrl) {
            audio.play().catch((err) => {
                console.error('Playback failed:', err);
                set({ error: err.message, playbackState: 'error' });
            });
        } else if (state === 'ended' && get().currentUrl) {
            // Restart from beginning when song has ended
            // Don't set playbackState to 'loading' here - the canplay event handler
            // would override it to 'paused' before play() actually starts.
            // Let the 'play' event naturally set state to 'playing'.
            audio.currentTime = 0;
            set({ currentTime: 0 });
            audio.play().catch((err) => {
                console.error('Playback failed:', err);
                set({ error: err.message, playbackState: 'error' });
            });
        }
    },

    togglePlay: async (url: string) => {
        const audio = getAudioElement();
        const currentUrl = get().currentUrl;
        const playbackState = get().playbackState;

        // Check if it's the same track by comparing URLs
        const isSameTrack = currentUrl === url;
        // Also check the actual audio element state in case store state is out of sync
        const isActuallyPlaying = !audio.paused && audio.readyState >= 2; // HAVE_CURRENT_DATA

        if (isSameTrack) {
            // Same track - toggle play/pause based on actual audio state
            if (playbackState === 'playing' || isActuallyPlaying) {
                audio.pause();
                // Immediately update state to ensure sync
                set({ playbackState: 'paused' });
            } else if (playbackState === 'paused') {
                audio.play().catch((err) => {
                    console.error('Playback failed:', err);
                    set({ error: err.message, playbackState: 'error' });
                });
            } else if (playbackState === 'ended') {
                // Restart from beginning when song has ended
                // Don't set playbackState to 'loading' here - the canplay event handler
                // would override it to 'paused' before play() actually starts.
                // Let the 'play' event naturally set state to 'playing'.
                audio.currentTime = 0;
                set({ currentTime: 0 });
                audio.play().catch((err) => {
                    console.error('Playback failed:', err);
                    set({ error: err.message, playbackState: 'error' });
                });
            }
        } else {
            // Different track - resolve URL and play
            let resolvedUrl = url;
            if (isArweaveUrl(url)) {
                set({ playbackState: 'loading' });
                try {
                    resolvedUrl = await arweaveGatewayManager.resolveUrl(url);
                    if (resolvedUrl !== url) {
                        logger.info('Store', 'Arweave URL resolved to alternate gateway', {
                            originalUrl: url,
                            resolvedUrl,
                        });
                    }
                } catch (err) {
                    logger.error('Store', 'Arweave gateway resolution failed', { url, error: err });
                    // Fall back to original URL
                    resolvedUrl = url;
                }
            }

            audio.src = resolvedUrl;
            set({ currentUrl: url, currentTime: 0, error: null, playbackState: 'loading' });
            audio.play().catch((err) => {
                console.error('Playback failed:', err);
                set({ error: err.message, playbackState: 'error' });
            });
        }
    },

    stop: () => {
        const audio = getAudioElement();
        audio.pause();
        audio.currentTime = 0;
        set({ currentUrl: null, playbackState: 'idle', currentTime: 0, duration: 0, error: null });
    },

    load: async (url: string) => {
        const audio = getAudioElement();
        const currentUrl = get().currentUrl;

        // Only load if it's a different URL
        if (currentUrl !== url) {
            // Resolve Arweave URLs through gateway manager
            let resolvedUrl = url;
            if (isArweaveUrl(url)) {
                set({ playbackState: 'loading' });
                try {
                    resolvedUrl = await arweaveGatewayManager.resolveUrl(url);
                    if (resolvedUrl !== url) {
                        logger.info('Store', 'Arweave URL resolved to alternate gateway', {
                            originalUrl: url,
                            resolvedUrl,
                        });
                    }
                } catch (err) {
                    logger.error('Store', 'Arweave gateway resolution failed', { url, error: err });
                    // Fall back to original URL
                    resolvedUrl = url;
                }
            }

            audio.src = resolvedUrl;
            // Set to paused state (ready to play) rather than loading
            // The canplay event will transition to 'paused' when ready
            set({ currentUrl: url, currentTime: 0, error: null, playbackState: 'loading' });
        }
    },

    seek: (time: number) => {
        const audio = getAudioElement();
        if (get().currentUrl) {
            audio.currentTime = Math.max(0, Math.min(time, get().duration));
            set({ currentTime: audio.currentTime });
        }
    },

    setVolume: (volume: number) => {
        const audio = getAudioElement();
        const clampedVolume = Math.max(0, Math.min(1, volume));
        audio.volume = clampedVolume;
        // If user drags volume above 0, unmute the audio
        // (they expect sound to come back when dragging up from muted state)
        if (clampedVolume > 0 && audio.muted) {
            audio.muted = false;
        }
        set({ volume: clampedVolume, isMuted: clampedVolume === 0 });
    },

    toggleMute: () => {
        const audio = getAudioElement();
        const newMutedState = !get().isMuted;
        audio.muted = newMutedState;
        set({ isMuted: newMutedState });
    },

    updateTime: (time: number) => set({ currentTime: time }),
    updateDuration: (duration: number) => set({ duration }),
    setPlaybackState: (state: PlaybackState) => set({ playbackState: state }),
    setError: (error: string | null) => set({ error }),
}));
