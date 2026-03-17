/**
 * useTrackDuration Hook
 *
 * Provides a validated track duration with automatic fallback to metadata.
 *
 * The HTML5 Audio API can return NaN or Infinity for duration before metadata loads.
 * This hook centralizes the fallback logic to use track metadata duration when
 * the audio player duration is invalid.
 *
 * Usage:
 *   const duration = useTrackDuration(); // Returns validated duration in seconds
 */

import { useAudioPlayerStore } from '@/store/audioPlayerStore';
import { usePlaylistStore } from '@/store/playlistStore';

/**
 * Hook that returns the current track duration with fallback to metadata.
 *
 * @returns Duration in seconds, validated to be a finite number.
 *          Falls back to selectedTrack.duration from playlist metadata,
 *          or 0 if no valid duration is available.
 */
export function useTrackDuration(): number {
    const audioPlayerDuration = useAudioPlayerStore((state) => state.duration);
    const selectedTrack = usePlaylistStore((state) => state.selectedTrack);

    // Use audio player duration if valid, otherwise fall back to track metadata
    return Number.isFinite(audioPlayerDuration) ? audioPlayerDuration : (selectedTrack?.duration || 0);
}

/**
 * Utility function to get validated duration outside of React components.
 * Useful for one-off calculations or non-hook contexts.
 *
 * @param audioPlayerDuration - Raw duration from audio player
 * @param trackMetadataDuration - Duration from track metadata (optional)
 * @returns Validated duration in seconds
 */
export function getValidatedDuration(
    audioPlayerDuration: number,
    trackMetadataDuration?: number
): number {
    return Number.isFinite(audioPlayerDuration) ? audioPlayerDuration : (trackMetadataDuration || 0);
}
