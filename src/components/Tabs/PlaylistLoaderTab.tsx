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
    <div className="space-y-6">
      {/* Header with Status Indicator */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Playlist Parser</h2>
          </div>
          <p className="text-sm text-muted-foreground pl-13">Load playlists from Arweave</p>
        </div>
        <StatusIndicator
          status={getFetchStatus()}
          label={error ? 'Error' : isLoading ? 'Loading...' : currentPlaylist ? 'Ready' : 'Idle'}
        />
      </div>

      {/* Input Section - Redesigned with Card, Input, and Button components */}
      <Card variant="default" padding="md">
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
        <div className="space-y-6 fade-in">
          {/* Playlist Header Skeleton */}
          <PlaylistHeaderSkeleton />

          {/* Track List Skeletons */}
          <div className="space-y-4">
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <TrackCardSkeleton key={idx} size="default" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State - No Playlist Loaded */}
      {!currentPlaylist && !isLoading && !error && (
        <Card variant="flat" padding="lg">
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6">
              <span className="text-5xl" role="img" aria-label="Music">🎵</span>
            </div>
            <h4 className="font-semibold text-xl mb-2">No Playlist Loaded</h4>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Enter an Arweave transaction ID above to load a playlist, or try the example playlist to get started.
            </p>
            <Button
              onClick={() => {
                setTxId(EXAMPLE_PLAYLIST_ARWEAVE_TX_ID);
                handleParse();
              }}
              variant="secondary"
              size="md"
              leftIcon={Music}
            >
              Load Example Playlist
            </Button>
          </div>
        </Card>
      )}

      {currentPlaylist && (
        <div className="space-y-6">
          {/* Spotify-style Playlist Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-surface-2 to-accent/10 border border-border/50 p-6 md:p-8 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              {/* Large Album Art */}
              <div className="flex-shrink-0 group">
                <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-xl overflow-hidden shadow-xl transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-primary/20 group-hover:scale-[1.02]">
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
                              <svg class="w-20 h-20 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                              </svg>
                            </div>
                          `;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent flex items-center justify-center">
                      <Music className="w-20 h-20 text-primary/60" />
                    </div>
                  )}
                </div>
              </div>

              {/* Playlist Info */}
              <div className="flex-1 space-y-3 min-w-0">
                {/* Playlist Type Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-xs font-medium text-primary">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Playlist</span>
                </div>

                {/* Title */}
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {currentPlaylist.name}
                </h3>

                {/* Description */}
                {currentPlaylist.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {currentPlaylist.description}
                  </p>
                )}

                {/* Quick Stats Row */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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

                {/* Tags */}
                {currentPlaylist.tags && currentPlaylist.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {currentPlaylist.tags.slice(0, 5).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-full bg-surface-3 border border-border text-xs text-muted-foreground"
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

            {/* Track List */}
            <div className="space-y-2">
              {filteredTracks.length === 0 ? (
                /* No Search Results State */
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <span className="text-4xl mb-3" role="img" aria-label="Search">🔍</span>
                  <h4 className="font-semibold text-lg mb-1">No tracks found</h4>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search query
                  </p>
                </div>
              ) : (
                <div className="max-h-[300px] md:max-h-[400px] overflow-y-auto space-y-2 pr-2">
                  {filteredTracks.map((track: PlaylistTrack, idx: number) => (
                    <TrackCard
                      key={idx}
                      track={track}
                      index={idx + 1}
                      isSelected={selectedTrack?.title === track.title}
                      onClick={() => selectTrack(track)}
                      size="default"
                    />
                  ))}
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
