import { useState } from 'react';
import './PlaylistLoaderTab.css';
import { Music, Download, Search } from 'lucide-react';
import { usePlaylistParser } from '../../hooks/usePlaylistParser';
import { useDebounce } from '../../hooks/useDebounce';
import { usePlaylistStore } from '../../store/playlistStore';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { RawJsonDump } from '../ui/RawJsonDump';
import { StatusIndicator } from '../ui/StatusIndicator';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
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

  const handlePlayTrack = (track: PlaylistTrack) => {
    selectTrack(track);
    togglePlay(track.audio_url);
  };

  const isTrackPlaying = (track: PlaylistTrack): boolean => {
    return playbackState === 'playing' && currentUrl === track.audio_url;
  };

  const isTrackSelected = (track: PlaylistTrack): boolean => {
    return selectedTrack?.title === track.title && selectedTrack?.artist === track.artist;
  };

  const handleCardClick = (track: PlaylistTrack) => {
    if (isTrackSelected(track)) {
      togglePlay(track.audio_url);
    } else {
      selectTrack(track);
    }
  };

  const filteredTracks = currentPlaylist?.tracks.filter((track) => {
    if (!debouncedSearchQuery.trim()) return true;
    const query = debouncedSearchQuery.toLowerCase();
    return (
      track.title?.toLowerCase().includes(query) ||
      track.artist?.toLowerCase().includes(query) ||
      track.album?.toLowerCase().includes(query)
    );
  }) || [];

  const getFetchStatus = (): 'healthy' | 'degraded' | 'error' => {
    if (error) return 'error';
    if (isLoading) return 'degraded';
    if (currentPlaylist) return 'healthy';
    return 'degraded';
  };

  return (
    <div className="playlist-tab-container">
      {/* Compact Header + Input Section */}
      <div className="playlist-header-input">
        {/* Label 1 */}
        <h2 className="playlist-header-title">Playlist Parser</h2>

        {/* Label 2 */}
        <label htmlFor="arweave-tx-id" className="playlist-header-title">Arweave TX ID</label>

        {/* Content 1 */}
        <div className="playlist-header-content-left">
          <div className="playlist-header-icon-wrapper">
            <Music className="playlist-header-icon" />
          </div>
          <StatusIndicator
            status={getFetchStatus()}
            label={error ? 'Error' : isLoading ? 'Loading...' : currentPlaylist ? 'Ready' : 'Idle'}
          />
        </div>

        {/* Content 2 */}
        <div className="playlist-header-content-right">
          <Input
            id="arweave-tx-id"
            value={txId}
            onChange={(e) => setTxId(e.target.value)}
            placeholder="Enter transaction ID..."
            disabled={isLoading}
            leftIcon={Music}
            size="sm"
            containerClassName="playlist-input-compact"
          />
          <Button
            onClick={handleParse}
            disabled={isLoading || !txId.trim()}
            isLoading={isLoading}
            leftIcon={Download}
            variant="primary"
            className="playlist-load-button-compact"
          >
            {isLoading ? 'Fetching...' : 'Load'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="playlist-error-compact">
          <span className="playlist-error-icon" role="img" aria-label="Warning">⚠️</span>
          <span className="playlist-error-message">{error}</span>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="playlist-loading fade-in">
          <PlaylistHeaderSkeleton />
          <div className="playlist-track-skeletons">
            <div className="playlist-track-skeleton-list">
              {Array.from({ length: 5 }).map((_, idx) => (
                <TrackCardSkeleton key={idx} size="default" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State - Compact */}
      {!currentPlaylist && !isLoading && !error && (
        <div className="playlist-empty-state-compact">
          <span className="playlist-empty-icon" role="img" aria-label="Music">🎵</span>
          <span className="playlist-empty-text">No playlist loaded. <button onClick={() => { setTxId(EXAMPLE_PLAYLIST_ARWEAVE_TX_ID); handleParse(); }} className="playlist-empty-link">Load example</button></span>
        </div>
      )}

      {currentPlaylist && (
        <div className="playlist-content">
          {/* Compact Playlist Header */}
          <div className="playlist-display-header-compact">
            <div className="playlist-display-header-left">
              <div className="album-art-wrapper-compact">
                {currentPlaylist.image ? (
                  <img
                    src={currentPlaylist.image}
                    alt={currentPlaylist.name}
                    className="album-art-image-compact"
                    width={40}
                    height={40}
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="album-art-fallback-compact">
                            <svg style="width: 14px; height: 14px; color: hsl(var(--primary-foreground) / 0.7);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                            </svg>
                          </div>
                        `;
                      }
                    }}
                  />
                ) : (
                  <div className="album-art-fallback-compact">
                    <Music style={{ width: '14px', height: '14px', color: 'hsl(var(--primary-foreground) / 0.7)' }} />
                  </div>
                )}
              </div>

              <div className="playlist-display-info-compact">
                <div className="playlist-info-row-primary">
                  <h3 className="playlist-display-title-compact">{currentPlaylist.name}</h3>
                  <div className="playlist-display-meta-row">
                    <span className="playlist-display-creator-badge">
                      <span className="playlist-display-creator-label">Created by</span>
                      <span className="playlist-display-creator-value">{currentPlaylist.creator.slice(0, 6)}...{currentPlaylist.creator.slice(-4)}</span>
                    </span>
                    <span className="playlist-display-separator" />
                    <span className="playlist-display-tracks-badge">{currentPlaylist.tracks.length} tracks</span>
                    {currentPlaylist.genre && (
                      <>
                        <span className="playlist-display-separator" />
                        <span className="playlist-display-genre-badge">{currentPlaylist.genre}</span>
                      </>
                    )}
                  </div>
                </div>
                {currentPlaylist.description && (
                  <p className="playlist-display-description-compact">{currentPlaylist.description}</p>
                )}
                {currentPlaylist.tags && currentPlaylist.tags.length > 0 && (
                  <div className="playlist-display-tags-compact">
                    {currentPlaylist.tags.slice(0, 4).map((tag, idx) => (
                      <span key={idx} className="playlist-display-tag-compact">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Selected Track Display */}
          {selectedTrack && (
            <div className="playlist-selected-track-compact">
              <div className="selected-track-status">
                <span className="selected-track-pulse" />
                <span className="selected-track-label">NOW PLAYING</span>
              </div>
              <div className="selected-track-info">
                <span className="selected-track-index">
                  #{currentPlaylist.tracks.findIndex(t => t.title === selectedTrack.title && t.artist === selectedTrack.artist) + 1}
                </span>
                <span className="selected-track-separator" />
                <span className="selected-track-title">{selectedTrack.title}</span>
                <span className="selected-track-separator" />
                <span className="selected-track-artist">{selectedTrack.artist}</span>
                {selectedTrack.album && (
                  <>
                    <span className="selected-track-separator" />
                    <span className="selected-track-album">{selectedTrack.album}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Compact Search + Track List */}
          <div className="playlist-search-section-compact">
            <div className="playlist-search-bar-compact">
              <Search className="search-icon-compact" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${currentPlaylist.tracks.length} tracks...`}
                className="search-input-compact"
              />
              {searchQuery && (
                <span className="search-count-compact">
                  {filteredTracks.length} found
                </span>
              )}
            </div>

            <div className="playlist-track-list-compact">
              {filteredTracks.length === 0 ? (
                <div className="playlist-no-results-compact">
                  <span className="playlist-no-results-icon" role="img" aria-label="Search">🔍</span>
                  <span className="playlist-no-results-text">No tracks found matching "{searchQuery}"</span>
                </div>
              ) : (
                filteredTracks.map((track: PlaylistTrack) => {
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
                      size="compact"
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Raw JSON Dump Section */}
          <div className="playlist-debug-section">
            <h4 className="playlist-debug-title">Raw Data (Debug)</h4>
            {rawResponseData != null && parsedTimestamp && (
              <RawJsonDump
                data={rawResponseData}
                title="Raw Arweave Response / Input JSON"
                timestamp={parsedTimestamp}
                status={error ? 'error' : 'healthy'}
                defaultOpen={false}
              />
            )}
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
