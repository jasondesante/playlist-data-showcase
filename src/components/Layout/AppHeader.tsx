/**
 * AppHeader Component
 *
 * Displays the application header with title and subtitle.
 * Extracted from App.tsx lines 35-40 as part of Phase 3.2.1 refactoring.
 * Extended with mini audio player for Task 4.2.
 *
 * XP processing and level-up modals are handled by useSessionCompletion hook at the App level.
 */

import { Play, Pause, Square, Music } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
import { useAudioPlayerStore } from '@/store/audioPlayerStore';
import { useSessionTracker } from '@/hooks/useSessionTracker';
import { usePlaylistStore } from '@/store/playlistStore';
import { formatTime } from '@/utils/formatters';
import { logger } from '@/utils/logger';

interface AppHeaderProps {
  /** Main title displayed in the header */
  title?: string;
  /** Subtitle/tagline displayed below the title */
  subtitle?: string;
}

export function AppHeader({ title = 'Playlist Data Engine Showcase', subtitle = 'Technical validation • Console logging enabled' }: AppHeaderProps) {
  const { activeSession, pauseSession, resumeSession } = useSessionStore();
  const { playbackState, currentTime, duration, pause, resume, stop, currentUrl } = useAudioPlayerStore();
  const { endSession: hookEndSession, isActive: isSessionActive } = useSessionTracker();
  const { selectedTrack } = usePlaylistStore();

  // Show mini player when audio is playing/loading OR when there's an active session OR when audio is loaded
  // This ensures the player is visible immediately when playback starts, even before session is created
  const showMiniPlayer = playbackState === 'playing' || playbackState === 'loading' || activeSession !== null || currentUrl !== null;

  // Use activeSession track if available, otherwise fall back to selectedTrack
  const track = activeSession?.track || selectedTrack;

  const handlePlayPause = () => {
    if (playbackState === 'playing') {
      // Pause both audio and session
      pause();
      pauseSession();
    } else {
      // Resume both audio and session
      resume();
      resumeSession();
    }
  };

  const handleStop = () => {
    // End the session - XP processing is handled by useSessionCompletion hook
    const session = hookEndSession();
    if (!session) {
      logger.info('SessionTracker', 'Stop clicked but no active session - stopping audio only');
    }
    // Always stop audio
    stop();
  };

  const isPlaying = playbackState === 'playing';

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-header-content">
            <div className="app-header-text">
              <h1 className="app-header-title">{title}</h1>
              <p className="app-header-subtitle">{subtitle}</p>
            </div>

            {/* Mini Audio Player - shown when audio is playing or session is active */}
            {showMiniPlayer && track && (
              <div className="app-header-mini-player">
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
                    <p className="mini-player-title">{track.title}</p>
                    <p className="mini-player-artist">{track.artist}</p>
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

                <div className="mini-player-time">
                  <span className="mini-player-current-time">
                    {formatTime(Math.floor(currentTime))}
                  </span>
                  <span className="mini-player-time-separator">/</span>
                  <span className="mini-player-total-time">
                    {formatTime(Math.floor(duration) || track.duration || 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

export default AppHeader;
