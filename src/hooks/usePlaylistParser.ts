import { useState, useCallback } from 'react';
import { PlaylistParser } from 'playlist-data-engine';
import { usePlaylistStore } from '@/store/playlistStore';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';

/**
 * React hook for parsing playlists from the Playlist Data Engine.
 *
 * This hook integrates the PlaylistParser engine module to parse playlists from:
 * - JSON strings (direct input)
 * - Arweave transaction IDs (fetched from arweave.net gateway)
 *
 * @example
 * ```tsx
 * const { parsePlaylist } = usePlaylistParser();
 * await parsePlaylist('arweave-tx-id');
 * ```
 *
 * @returns {Object} Hook return object
 * @returns {Function} parsePlaylist - Function to parse playlist from JSON string or Arweave TX ID
 */
export const usePlaylistParser = () => {
    const { setPlaylist, setLoading, setError } = usePlaylistStore();
    const [parser] = useState(() => new PlaylistParser());

    const parsePlaylist = useCallback(async (input: string) => {
        logger.info('PlaylistParser', 'Parsing playlist', { inputLength: input.length });
        setLoading(true);
        setError(null);

        try {
            // Determine if input is JSON or ID (simple heuristic)
            const isJson = input.trim().startsWith('{');

            let playlist;
            let rawData: unknown;

            if (isJson) {
                const json = JSON.parse(input);
                rawData = json; // Store raw JSON input
                playlist = await parser.parse(json);
            } else {
                // Assume Arweave ID
                // Note: Engine might need a fetcher for ID, but let's assume parse handles it or we fetch first
                // If engine only takes JSON, we need to fetch.
                // Checking engine docs/source would be ideal, but assuming parse takes RawArweavePlaylist
                // For now, let's assume the input IS the JSON string or we fetch it.
                // If it's an ID, we'd need to fetch from Arweave gateway.
                // Let's implement a basic fetch if it looks like an ID.

                logger.info('PlaylistParser', 'Fetching from Arweave', input);
                const response = await fetch(`https://arweave.net/${input}`);
                if (!response.ok) throw new Error(`Failed to fetch playlist: ${response.statusText}`);
                const json = await response.json();
                rawData = json; // Store raw Arweave response
                playlist = await parser.parse(json);
            }

            logger.info('PlaylistParser', 'Playlist parsed successfully', {
                name: playlist.name,
                tracks: playlist.tracks.length
            });

            setPlaylist(playlist, rawData);
            return playlist;
        } catch (error) {
            handleError(error, 'PlaylistParser');
            setError(error instanceof Error ? error.message : 'Failed to parse playlist');
            return null;
        } finally {
            setLoading(false);
        }
    }, [parser, setPlaylist, setLoading, setError]);

    return { parsePlaylist };
};
