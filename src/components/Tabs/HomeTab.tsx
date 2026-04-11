import { useState } from 'react';
import './HomeTab.css';
import { Music, Download, Search, Sparkles, Github } from 'lucide-react';
import { usePlaylistParser } from '../../hooks/usePlaylistParser';
import { useDebounce } from '../../hooks/useDebounce';
import { usePlaylistStore } from '../../store/playlistStore';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { useCharacterStore } from '../../store/characterStore';
import { useBeatDetectionStore } from '../../store/beatDetectionStore';
import { useBeatDetection } from '../../hooks/useBeatDetection';
import { useTabContext } from '../../App';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { TrackCard } from '../ui/TrackCard';
import { ArweaveImage } from '../shared/ArweaveImage';
import { EXAMPLE_PLAYLIST_ARWEAVE_TX_ID } from '../../constants/examplePlaylists';
import type { PlaylistTrack } from '../../types';

export function HomeTab() {
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
  } = usePlaylistStore();
  const { characters } = useCharacterStore();
  const { playbackState, currentUrl, togglePlay } = useAudioPlayerStore();
  const tabContext = useTabContext();
  const navigateToTab = tabContext?.navigateToTab ?? (() => { });

  // Beat detection store actions for triggering analyze from home
  const setGenerationMode = useBeatDetectionStore((state) => state.actions.setGenerationMode);
  const { generateBeatMap } = useBeatDetection();

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

  const handleAnalyzeFromHome = () => {
    if (!selectedTrack?.audio_url) return;

    // Ensure we're in automatic mode
    const store = useBeatDetectionStore.getState();
    if (store.generationMode !== 'automatic') {
      setGenerationMode('automatic');
    }

    // Navigate to beat detection tab first
    navigateToTab('beat');

    // Trigger the same analysis as clicking "Analyze Beats" on step 1
    const audioId = selectedTrack.id || selectedTrack.audio_url;
    const existingBeatMap = useBeatDetectionStore.getState().beatMap;
    const forceRegenerate = !!existingBeatMap;
    generateBeatMap(selectedTrack.audio_url, audioId, undefined, forceRegenerate);
  };

  return (
    <div className="home-tab-container">
      {/* Hero / Intro Section */}
      <section className="home-hero">
        <div className="home-hero-text">
          <h2 className="home-hero-title">Playlist Data Engine</h2>
          <p className="home-hero-subtitle">
            An RPG game engine, rhythm game engine, interactive music playback engine, and
            Arweave playlist parser — all in one.
          </p>
        </div>
      </section>

      {/* Two-column layout: Playlist + Quick Actions */}
      <div className="home-columns">
        {/* Left Column: Playlist */}
        <div className="home-playlist-column">
          {!currentPlaylist && !isLoading && (
            <>
              {/* Input to load a playlist */}
              <div className="home-load-section">
                <h3 className="home-section-title">
                  <Music size={16} />
                  Load a Playlist
                </h3>
                <p className="home-section-desc">
                  Enter an Arweave transaction ID to load a serverless playlist.
                </p>
                <div className="home-load-row">
                  <Input
                    id="home-tx-id"
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                    placeholder="Enter transaction ID..."
                    disabled={isLoading}
                    leftIcon={Music}
                    size="sm"
                    containerClassName="home-input"
                  />
                  <Button
                    onClick={handleParse}
                    disabled={isLoading || !txId.trim()}
                    isLoading={isLoading}
                    leftIcon={Download}
                    variant="primary"
                    size="md"
                  >
                    {isLoading ? 'Fetching...' : 'Load'}
                  </Button>
                </div>
                {error && (
                  <div className="home-error">
                    <span className="home-error-icon">&#9888;</span>
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Playlist loaded — show track list */}
          {currentPlaylist && (
            <div className="home-playlist-loaded">
              <div className="home-playlist-header">
                <div className="home-playlist-art">
                  {currentPlaylist.image ? (
                    <ArweaveImage
                      src={currentPlaylist.image}
                      alt={currentPlaylist.name}
                      className="home-art-image"
                      width={40}
                      height={40}
                    />
                  ) : (
                    <div className="home-art-fallback">
                      <Music style={{ width: '14px', height: '14px', color: 'hsl(var(--primary-foreground) / 0.7)' }} />
                    </div>
                  )}
                </div>
                <div className="home-playlist-info">
                  <h3 className="home-playlist-name">{currentPlaylist.name}</h3>
                  <span className="home-playlist-meta">
                    {currentPlaylist.creator.slice(0, 6)}...{currentPlaylist.creator.slice(-4)} &middot; {currentPlaylist.tracks.length} tracks
                    {currentPlaylist.genre && <>&middot; {currentPlaylist.genre}</>}
                  </span>
                </div>
              </div>

              {/* Search bar */}
              <div className="home-search-bar">
                <Search className="home-search-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${currentPlaylist.tracks.length} tracks...`}
                  className="home-search-input"
                />
                {searchQuery && (
                  <span className="home-search-count">{filteredTracks.length} found</span>
                )}
              </div>

              {/* Track list */}
              <div className="home-track-list">
                {filteredTracks.length === 0 ? (
                  <div className="home-no-results">
                    No tracks found matching "{searchQuery}"
                  </div>
                ) : (
                  filteredTracks.map((track: PlaylistTrack) => {
                    const originalIndex = currentPlaylist.tracks.findIndex(
                      t => t.title === track.title && t.artist === track.artist
                    ) + 1;
                    const characterForTrack = characters.find(
                      c => c.seed === track.id || c.seed.startsWith(`${track.id}-`)
                    );
                    return (
                      <TrackCard
                        key={`${track.title}-${track.artist}-${originalIndex}`}
                        track={track}
                        index={originalIndex > 0 ? originalIndex : undefined}
                        isSelected={selectedTrack?.title === track.title}
                        isPlaying={isTrackPlaying(track)}
                        character={characterForTrack}
                        onClick={() => handleCardClick(track)}
                        onPlay={() => handlePlayTrack(track)}
                        size="compact"
                      />
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Quick Actions + About */}
        <div className="home-actions-column">
          {/* Quick Actions */}
          <div className="home-quick-actions">
            <h3 className="home-section-title">
              <Sparkles size={16} />
              Quick Actions
            </h3>

            {/* Analyze Button */}
            <button
              className="home-analyze-btn"
              onClick={handleAnalyzeFromHome}
              disabled={!selectedTrack}
              title={
                selectedTrack
                  ? `Analyze "${selectedTrack.title}" and jump to Beat Detection`
                  : 'Select a track first to analyze it'
              }
            >
              <div className="home-analyze-btn-inner">
                <Sparkles size={18} />
                <span>Analyze & Play</span>
              </div>
              <span className="home-analyze-btn-desc">
                {selectedTrack
                  ? `Generate a level for "${selectedTrack.title}" and start practicing`
                  : 'Select a track from the playlist to get started'}
              </span>
            </button>
          </div>

          {/* About Section */}
          <div className="home-about">
            <h3 className="home-section-title">
              <Github size={16} />
              About
            </h3>
            <div className="home-about-text">
              <p>
                <strong><a href="https://github.com/jasondesante/playlist-data-engine" target="_blank" rel="noopener noreferrer" className="home-about-link">playlist-data-engine</a></strong> and <strong><a href="https://github.com/jasondesante/playlist-data-showcase" target="_blank" rel="noopener noreferrer" className="home-about-link">playlist-data-showcase</a></strong> are both on GitHub.
              </p>
              <p>
                The engine is a toolkit for working with serverless playlists — decentralized,
                Arweave-hosted audio playlists. Parse them, fetch audio links, and handle Arweave
                gateways automatically.
              </p>
              <p>
                It's an <strong>RPG game engine</strong> that generates characters from audio data.
                Analyze the full song, pitch data, and genre/style classification. Create unique
                RPG characters tied to each track. Earn XP for listening, with stacking
                bonuses from weather, location, motion, or Steam gameplay. The engine also
                includes <strong>enemy generation</strong> and <strong>turn-based combat</strong> with
                balancing tools that can simulate encounters to test difficulty.
              </p>
              <p>
                It's a <strong>rhythm game engine</strong> — run beat detection on any track, then
                manually chart rhythm game patterns or use the <strong>customizable automatic level
                  generator</strong> to create full levels with configurable difficulty scaling.
              </p>
              <p>
                All of these interactive features are part of the <strong>Interactive Mix </strong>
                system, and the engine makes them easy to integrate into your own projects.
                Create new ways to experience music.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeTab;
