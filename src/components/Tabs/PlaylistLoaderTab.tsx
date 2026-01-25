import { useState } from 'react';
import { Music, Download, Sparkles, Search } from 'lucide-react';
import { usePlaylistParser } from '../../hooks/usePlaylistParser';
import { useDebounce } from '../../hooks/useDebounce';
import { usePlaylistStore } from '../../store/playlistStore';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { RawJsonDump } from '../ui/RawJsonDump';
import { StatusIndicator } from '../ui/StatusIndicator';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { TrackCard } from '../ui/TrackCard';
import { TrackCardSkeleton, PlaylistHeaderSkeleton } from '../ui/Skeleton';
import type { PlaylistTrack } from '../../types';
import { EXAMPLE_PLAYLIST_ARWEAVE_TX_ID } from '../../constants/examplePlaylists';

/**
 * PlaylistLoaderTab Component
 *
 * Demonstrates the PlaylistParser engine module by:
 * 1. Accepting an Arweave transaction ID
 * 2. Fetching and parsing the playlist JSON
 * 3. Displaying track list with selection
 * 4. Showing raw response data (for debugging/engine verification)
 */
export function PlaylistLoaderTab() {
  const [txId, setTxId] = useState(EXAMPLE_PLAYLIST_ARWEAVE_TX_ID);
  const [searchQuery, setSearchQuery] = useState('');
  // Debounce search query to avoid excessive filtering on every keystroke
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { parsePlaylist } = usePlaylistParser();
  const {
    currentPlaylist,
    selectedTrack,
    isLoading,
    error,
    selectTrack,
    rawResponseData,
    parsedTimestamp
  } = usePlaylistStore();
  const { playbackState, currentUrl, togglePlay } = useAudioPlayerStore();

  const handleParse = async () => {
    if (!txId.trim()) return;
    await parsePlaylist(txId.trim());
  };

  // Handle play button click - select the track and toggle play/pause
  const handlePlayTrack = (track: PlaylistTrack) => {
    selectTrack(track);
    togglePlay(track.audio_url);
  };

  // Check if a track is currently playing
  const isTrackPlaying = (track: PlaylistTrack): boolean => {
    return playbackState === 'playing' && currentUrl === track.audio_url;
  };

  // Check if a track is the currently selected track (regardless of playing state)
  const isTrackSelected = (track: PlaylistTrack): boolean => {
    return selectedTrack?.title === track.title && selectedTrack?.artist === track.artist;
  };

  // Handle card click - if clicking on the selected/playing track, toggle play/pause
  const handleCardClick = (track: PlaylistTrack) => {
    // If this is the currently selected track, toggle play/pause
    if (isTrackSelected(track)) {
      togglePlay(track.audio_url);
    } else {
      // Otherwise, just select the track (doesn't auto-play)
      selectTrack(track);
    }
  };

  // Filter tracks based on debounced search query
  const filteredTracks = currentPlaylist?.tracks.filter((track) => {
    if (!debouncedSearchQuery.trim()) return true;
    const query = debouncedSearchQuery.toLowerCase();
    return (
      track.title?.toLowerCase().includes(query) ||
      track.artist?.toLowerCase().includes(query) ||
      track.album?.toLowerCase().includes(query)
    );
  }) || [];

  // Determine status indicator based on current state
  const getFetchStatus = (): 'healthy' | 'degraded' | 'error' => {
    if (error) return 'error';
    if (isLoading) return 'degraded';
    if (currentPlaylist) return 'healthy';
    return 'degraded'; // Default state
  };

  return (
    <div className="playlist-tab-container">
      {/* Header with Status Indicator - More compact */}
      <div className="playlist-header">
        <div className="playlist-header-content">
          <div className="playlist-header-title-row">
            <div className="playlist-header-icon-wrapper">
              <Music className="playlist-header-icon" />
            </div>
            <h2 className="playlist-header-title">Playlist Parser</h2>
          </div>
          <p className="playlist-header-subtitle">Load playlists from Arweave</p>
        </div>
        <StatusIndicator
          status={getFetchStatus()}
          label={error ? 'Error' : isLoading ? 'Loading...' : currentPlaylist ? 'Ready' : 'Idle'}
        />
      </div>

      {/* Input Section - Redesigned with Card, Input, and Button components */}
      <Card variant="default" padding="sm">
        <CardHeader>
          <CardTitle>Load a Playlist</CardTitle>
          <CardDescription>
            Enter an Arweave transaction ID to fetch and parse a playlist
          </CardDescription>
        </CardHeader>

        <div className="space-y-4">
          <Input
            id="arweave-tx-id"
            label="Arweave Transaction ID"
            value={txId}
            onChange={(e) => setTxId(e.target.value)}
            placeholder="Enter Arweave TX ID..."
            disabled={isLoading}
            leftIcon={Music}
            helperText="The transaction should contain a valid ServerlessPlaylist JSON"
          />

          <Button
            onClick={handleParse}
            disabled={isLoading || !txId.trim()}
            isLoading={isLoading}
            leftIcon={Download}
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
          >
            {isLoading ? 'Fetching...' : 'Fetch & Parse Playlist'}
          </Button>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-md">
              <span className="text-xl" role="img" aria-label="Warning">⚠️</span>
              <div className="flex-1">
                <p className="text-destructive font-semibold">Error Loading Playlist</p>
                <p className="text-sm text-destructive/80 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Loading Skeletons - Show during fetch */}
      {isLoading && (
        <div className="playlist-loading fade-in">
          {/* Playlist Header Skeleton */}
          <PlaylistHeaderSkeleton />

          {/* Track List Skeletons */}
          <div className="playlist-track-skeletons">
            <div className="playlist-track-skeleton-list">
              {Array.from({ length: 5 }).map((_, idx) => (
                <TrackCardSkeleton key={idx} size="default" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State - No Playlist Loaded - Refined with smaller, more elegant proportions */}
      {!currentPlaylist && !isLoading && !error && (
        <Card variant="flat" padding="md">
          <div className="playlist-empty-state">
            <div className="playlist-empty-icon-wrapper">
              <span className="playlist-empty-icon" role="img" aria-label="Music">🎵</span>
            </div>
            <h4 className="playlist-empty-title">No Playlist Loaded</h4>
            <p className="playlist-empty-description">
              Enter an Arweave transaction ID above to load a playlist, or try the example playlist to get started.
            </p>
            <Button
              onClick={() => {
                setTxId(EXAMPLE_PLAYLIST_ARWEAVE_TX_ID);
                handleParse();
              }}
              variant="secondary"
              size="sm"
              leftIcon={Music}
            >
              Load Example Playlist
            </Button>
          </div>
        </Card>
      )}

      {currentPlaylist && (
        <div className="playlist-content">
          {/* Spotify-style Playlist Header - Refined with smaller, balanced image */}
          <div className="playlist-display-header">
            <div className="playlist-display-header-inner">
              {/* Refined Album Art - Using pure CSS classes instead of tailwind */}
              <div className="playlist-header-art group">
                <div className="album-art-wrapper">
                  {currentPlaylist.image ? (
                    <img
                      src={currentPlaylist.image}
                      alt={currentPlaylist.name}
                      className="album-art-image"
                      width={64}
                      height={64}
                      loading="lazy"
                      onError={(e) => {
                        // Fallback to gradient on error
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="album-art-fallback">
                              <svg style="width: 20px; height: 20px; color: hsl(var(--primary-foreground) / 0.7);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                              </svg>
                            </div>
                          `;
                        }
                      }}
                    />
                  ) : (
                    <div className="album-art-fallback">
                      <Music style={{ width: '20px', height: '20px', color: 'hsl(var(--primary-foreground) / 0.7)' }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Playlist Info */}
              <div className="playlist-display-info">
                {/* Playlist Type Badge - Smaller, more subtle */}
                <div className="playlist-badge">
                  <Sparkles className="playlist-badge-icon" />
                  <span>Playlist</span>
                </div>

                {/* Title - More refined sizing */}
                <h3 className="playlist-display-title">
                  {currentPlaylist.name}
                </h3>

                {/* Description - Smaller text */}
                {currentPlaylist.description && (
                  <p className="playlist-display-description">
                    {currentPlaylist.description}
                  </p>
                )}

                {/* Quick Stats Row - More compact */}
                <div className="playlist-display-stats">
                  <span className="playlist-display-creator">
                    {currentPlaylist.creator}
                  </span>
                  <span className="playlist-display-separator" />
                  <span className="playlist-display-track-count">
                    {currentPlaylist.tracks.length} {currentPlaylist.tracks.length === 1 ? 'track' : 'tracks'}
                  </span>
                  {currentPlaylist.genre && (
                    <>
                      <span className="playlist-display-separator" />
                      <span className="playlist-display-genre">
                        {currentPlaylist.genre}
                      </span>
                    </>
                  )}
                </div>

                {/* Tags - More compact styling */}
                {currentPlaylist.tags && currentPlaylist.tags.length > 0 && (
                  <div className="playlist-display-tags">
                    {currentPlaylist.tags.slice(0, 5).map((tag, idx) => (
                      <span
                        key={idx}
                        className="playlist-display-tag"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search Bar Section */}
          <div className="playlist-search-section">
            {/* Sticky Search Bar */}
            <div className="playlist-search-sticky">
              <Input
                id="track-search"
                label="Search Tracks"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by title, artist, or album..."
                leftIcon={Search}
                helperText={searchQuery !== debouncedSearchQuery
                  ? 'Filtering...'
                  : searchQuery.trim()
                    ? `Found ${filteredTracks.length} of ${currentPlaylist.tracks.length} tracks`
                    : `${currentPlaylist.tracks.length} tracks total`
                }
              />
            </div>

            {/* Track List - Refined spacing */}
            <div className="playlist-track-list">
              {filteredTracks.length === 0 ? (
                /* No Search Results State - More compact */
                <div className="playlist-no-results">
                  <span className="playlist-no-results-icon" role="img" aria-label="Search">🔍</span>
                  <h4 className="playlist-no-results-title">No tracks found</h4>
                  <p className="playlist-no-results-description">
                    Try adjusting your search query
                  </p>
                </div>
              ) : (
                <div className="playlist-track-scroll">
                  {filteredTracks.map((track: PlaylistTrack) => {
                    // Find the original track number in the full playlist
                    const originalIndex = currentPlaylist.tracks.findIndex(t => t.title === track.title && t.artist === track.artist) + 1;
                    return (
                      <TrackCard
                        key={`${track.title}-${track.artist}-${originalIndex}`}
                        track={track}
                        index={originalIndex > 0 ? originalIndex : undefined}
                        isSelected={selectedTrack?.title === track.title}
                        isPlaying={isTrackPlaying(track)}
                        onClick={() => handleCardClick(track)}
                        onPlay={() => handlePlayTrack(track)}
                        size="default"
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Raw JSON Dump Section - for debugging and engine verification */}
          <div className="playlist-debug-section">
            <h4 className="playlist-debug-title">Raw Data (Debug)</h4>

            {/* Raw Arweave Response */}
            {rawResponseData != null && parsedTimestamp && (
              <RawJsonDump
                data={rawResponseData}
                title="Raw Arweave Response / Input JSON"
                timestamp={parsedTimestamp}
                status={error ? 'error' : 'healthy'}
                defaultOpen={false}
              />
            )}

            {/* Parsed ServerlessPlaylist Object */}
            {parsedTimestamp && (
              <RawJsonDump
                data={currentPlaylist}
                title="Parsed ServerlessPlaylist Object"
                timestamp={parsedTimestamp}
                status="healthy"
                defaultOpen={false}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PlaylistLoaderTab;
