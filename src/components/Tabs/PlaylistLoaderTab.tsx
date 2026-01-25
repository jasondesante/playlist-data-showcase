import { useState } from 'react';
import { Music, Download, Sparkles, Search } from 'lucide-react';
import { usePlaylistParser } from '../../hooks/usePlaylistParser';
import { usePlaylistStore } from '../../store/playlistStore';
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

  const handleParse = async () => {
    if (!txId.trim()) return;
    await parsePlaylist(txId.trim());
  };

  // Filter tracks based on search query
  const filteredTracks = currentPlaylist?.tracks.filter((track) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
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
    <div className="space-y-5">
      {/* Header with Status Indicator - More compact */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15">
              <Music className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Playlist Parser</h2>
          </div>
          <p className="text-xs text-muted-foreground pl-10">Load playlists from Arweave</p>
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
        <div className="space-y-5 fade-in">
          {/* Playlist Header Skeleton */}
          <PlaylistHeaderSkeleton />

          {/* Track List Skeletons */}
          <div className="space-y-1.5">
            <div className="space-y-2">
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
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center mb-4">
              <span className="text-3xl" role="img" aria-label="Music">🎵</span>
            </div>
            <h4 className="font-semibold text-base mb-1.5">No Playlist Loaded</h4>
            <p className="text-xs text-muted-foreground mb-4 max-w-sm leading-relaxed">
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
        <div className="space-y-5">
          {/* Spotify-style Playlist Header - Refined with smaller, balanced image */}
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/8 via-surface-2 to-accent/8 border border-border/40 p-2.5 md:p-3 transition-all duration-300 hover:shadow-md hover:shadow-primary/5">
            <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
              {/* Refined Album Art - Smaller for better proportions */}
              <div className="flex-shrink-0 group mx-auto sm:mx-0">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden shadow-md transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/10 group-hover:scale-[1.02]">
                  {currentPlaylist.image ? (
                    <img
                      src={currentPlaylist.image}
                      alt={currentPlaylist.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to gradient on error
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full bg-gradient-to-br from-primary/30 to-accent flex items-center justify-center">
                              <svg class="w-5 h-5 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                              </svg>
                            </div>
                          `;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent flex items-center justify-center">
                      <Music className="w-5 h-5 text-primary/60" />
                    </div>
                  )}
                </div>
              </div>

              {/* Playlist Info */}
              <div className="flex-1 space-y-2 min-w-0">
                {/* Playlist Type Badge - Smaller, more subtle */}
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 border border-primary/25 text-[10px] font-medium text-primary uppercase tracking-wide">
                  <Sparkles className="w-3 h-3" />
                  <span>Playlist</span>
                </div>

                {/* Title - More refined sizing */}
                <h3 className="text-lg md:text-xl font-semibold tracking-tight">
                  {currentPlaylist.name}
                </h3>

                {/* Description - Smaller text */}
                {currentPlaylist.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {currentPlaylist.description}
                  </p>
                )}

                {/* Quick Stats Row - More compact */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {currentPlaylist.creator}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                  <span>
                    {currentPlaylist.tracks.length} {currentPlaylist.tracks.length === 1 ? 'track' : 'tracks'}
                  </span>
                  {currentPlaylist.genre && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                      <span className="px-2 py-0.5 rounded-md bg-muted text-xs">
                        {currentPlaylist.genre}
                      </span>
                    </>
                  )}
                </div>

                {/* Tags - More compact styling */}
                {currentPlaylist.tags && currentPlaylist.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {currentPlaylist.tags.slice(0, 5).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-full bg-surface-2 border border-border/50 text-[10px] text-muted-foreground"
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
          <div className="space-y-4">
            {/* Sticky Search Bar */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 -mx-2 px-2">
              <Input
                id="track-search"
                label="Search Tracks"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by title, artist, or album..."
                leftIcon={Search}
                helperText={searchQuery.trim()
                  ? `Found ${filteredTracks.length} of ${currentPlaylist.tracks.length} tracks`
                  : `${currentPlaylist.tracks.length} tracks total`
                }
              />
            </div>

            {/* Track List - Refined spacing */}
            <div className="space-y-1.5">
              {filteredTracks.length === 0 ? (
                /* No Search Results State - More compact */
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <span className="text-2xl mb-2" role="img" aria-label="Search">🔍</span>
                  <h4 className="font-medium text-sm mb-1">No tracks found</h4>
                  <p className="text-xs text-muted-foreground">
                    Try adjusting your search query
                  </p>
                </div>
              ) : (
                <div className="max-h-[280px] md:max-h-[320px] overflow-y-auto space-y-1.5 pr-1.5">
                  {filteredTracks.map((track: PlaylistTrack) => {
                    // Find the original track number in the full playlist
                    const originalIndex = currentPlaylist.tracks.findIndex(t => t.title === track.title && t.artist === track.artist) + 1;
                    return (
                      <TrackCard
                        key={`${track.title}-${track.artist}-${originalIndex}`}
                        track={track}
                        index={originalIndex > 0 ? originalIndex : undefined}
                        isSelected={selectedTrack?.title === track.title}
                        onClick={() => selectTrack(track)}
                        onPlay={() => selectTrack(track)}
                        size="default"
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Raw JSON Dump Section - for debugging and engine verification */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Raw Data (Debug)</h4>

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
