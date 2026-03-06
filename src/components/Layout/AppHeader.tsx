/**
 * AppHeader Component
 *
 * Displays the application header with title and subtitle.
 * Extracted from App.tsx lines 35-40 as part of Phase 3.2.1 refactoring.
 * Extended with mini audio player for Task 4.2.
 *
 * XP processing and level-up modals are handled by useSessionCompletion hook at the App level.
 */

import { useState, useEffect } from 'react';
import { Play, Pause, Square, Music, Volume2, Volume1, VolumeX } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
import { useAudioPlayerStore } from '@/store/audioPlayerStore';
import { useSessionTracker } from '@/hooks/useSessionTracker';
import { usePlaylistStore } from '@/store/playlistStore';
import { formatTime } from '@/utils/formatters';
import { logger } from '@/utils/logger';
import { TabBadge } from '@/components/ui/TabBadge';
import type { TabItem } from './Sidebar';

interface AppHeaderProps {
  /** Main title displayed in the header */
  title?: string;
  /** Subtitle/tagline displayed below the title */
  subtitle?: string;
  /** Tab items for navigation */
  tabs?: TabItem[];
  /** Currently active tab ID */
  activeTab?: string;
  /** Callback when a tab is clicked */
  onTabChange?: (tabId: string) => void;
}

// Default subtitle
const defaultSubtitle = 'Explore the Data Engine visually';

export function AppHeader({
  title = 'Playlist Data Engine Showcase',
  subtitle = defaultSubtitle,
  tabs,
  activeTab,
  onTabChange
}: AppHeaderProps) {
  const [hasStopped, setHasStopped] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const { activeSession, pauseSession, resumeSession } = useSessionStore();
  const { playbackState, currentTime, duration, pause, resume, seek, play, currentUrl, volume, isMuted, setVolume, toggleMute } = useAudioPlayerStore();
  const { isActive: isSessionActive } = useSessionTracker();
  const { selectedTrack } = usePlaylistStore();

  // Log the track state for debugging
  useEffect(() => {
    logger.debug('System', 'AppHeader: Mini player track state', {
      hasActiveSession: !!activeSession,
      hasSelectedTrack: !!selectedTrack,
      selectedTrackId: selectedTrack?.id,
      selectedTrackTitle: selectedTrack?.title,
      trackIsSelectedTrack: !activeSession && !!selectedTrack,
      currentUrl
    });
  }, [activeSession, selectedTrack, currentUrl]);

  // Always show mini player (with placeholder state when no audio is loaded)
  const showMiniPlayer = true;

  // Use activeSession track if available, otherwise fall back to selectedTrack
  const track = activeSession?.track || selectedTrack;

  const handlePlayPause = () => {
    if (playbackState === 'playing') {
      // Pause both audio and session
      pause();
      pauseSession();
    } else {
      // If was stopped, seek to beginning first
      if (hasStopped) {
        seek(0);
        setHasStopped(false);
      }

      // CRITICAL FIX: If there's a selectedTrack but no currentUrl loaded, play the track
      // This handles the case where:
      // 1. Page loads and track is restored (selectedTrack set, but currentUrl is null)
      // 2. User switches active hero in party tab (selectedTrack set, but currentUrl is null)
      if (selectedTrack && !currentUrl) {
        play(selectedTrack.audio_url);
        // Session will auto-start via useSessionTracker hook when playbackState becomes 'playing'
      } else {
        // Resume both audio and session (normal case)
        resume();
        resumeSession();
      }
    }
  };

  const handleStop = () => {
    // Pause both audio and session
    pause();
    pauseSession();

    // Set hasStopped flag (don't call pause - it triggers auto-end effect causing double XP)
    setHasStopped(true);
  };

  const isPlaying = playbackState === 'playing';

  // Helper to determine which volume icon to show
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return VolumeX;
    if (volume <= 0.5) return Volume1;
    return Volume2;
  };
  const VolumeIcon = getVolumeIcon();

  // Display 0 for time when hasStopped
  const displayTime = hasStopped ? 0 : currentTime;

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          {/* Row 1: Title/Subtitle + Mini Player */}
          <div className="app-header-row">
            <div className="app-header-text">
              <h1 className="app-header-title">{title}</h1>
              <div className="app-header-subtitle">{subtitle}</div>
            </div>

            {/* Mini Audio Player - always shown, with placeholder when no track */}
            {showMiniPlayer && (
              <div className="app-header-mini-player">
                {track ? (
                  <>
                    <div className="mini-player-track-info">
                      <div className="mini-player-artwork">
                        {track.image_url ? (
                          <img src={track.image_url} alt={track.title} className="mini-player-artwork-image" />
                        ) : (
                          <div className="mini-player-artwork-placeholder">
                            <Music size={16} />
                          </div>
                        )}
                      </div>
                      <div className="mini-player-text">
                        <div className="mini-player-title">{track.title}</div>
                        <div className="mini-player-artist">{track.artist}</div>
                      </div>
                    </div>

                    <div className="mini-player-controls">
                      <button
                        className="mini-player-btn mini-player-play-btn"
                        onClick={handlePlayPause}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                      <button
                        className="mini-player-btn mini-player-stop-btn"
                        onClick={handleStop}
                        aria-label="Stop"
                        title={isSessionActive ? "End Session" : "Stop Audio"}
                      >
                        <Square size={16} />
                      </button>
                    </div>

                    {/* Volume Control */}
                    <div
                      className="mini-player-volume-container"
                      onMouseEnter={() => setShowVolumeSlider(true)}
                      onMouseLeave={() => setShowVolumeSlider(false)}
                    >
                      <button
                        className={`mini-player-btn mini-player-volume-btn ${isMuted ? 'mini-player-volume-btn--muted' : ''}`}
                        onClick={toggleMute}
                        aria-label={isMuted ? 'Unmute' : `Mute (currently ${Math.round(volume * 100)}%)`}
                        aria-pressed={isMuted}
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        <VolumeIcon size={16} />
                      </button>

                      {/* Volume Slider Popup */}
                      {showVolumeSlider && (
                        <div className="mini-player-volume-popup">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="mini-player-volume-slider"
                            aria-label="Volume"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(volume * 100)}
                          />
                          <div className="mini-player-volume-value">
                            {Math.round(volume * 100)}%
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mini-player-time">
                      <span className="mini-player-current-time">
                        {formatTime(Math.floor(displayTime))}
                      </span>
                      <span className="mini-player-time-separator">/</span>
                      <span className="mini-player-total-time">
                        {formatTime(Number.isFinite(duration) ? Math.floor(duration) : (track.duration || 0))}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="mini-player-placeholder">
                    <Music size={16} />
                    <span className="mini-player-placeholder-text">No audio loaded</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Row 2: Tab Navigation (separate, full width) */}
          {tabs && onTabChange && (
            <nav className="app-header-tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                    className={`app-header-tab ${activeTab === tab.id ? 'app-header-tab-active' : ''}`}
                    style={{ position: 'relative' }}
                  >
                    <Icon className="app-header-tab-icon" />
                    <span className="app-header-tab-label">{tab.label}</span>
                    {tab.badgeCount !== undefined && (
                      <TabBadge count={tab.badgeCount} showGlow={tab.showBadgeGlow} />
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </header>
    </>
  );
}

export default AppHeader;
