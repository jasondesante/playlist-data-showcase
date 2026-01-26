/**
 * AppHeader Component
 *
 * Displays the application header with title and subtitle.
 * Extracted from App.tsx lines 35-40 as part of Phase 3.2.1 refactoring.
 * Extended with mini audio player for Task 4.2.
 * Integrated with processSession for XP application (Task 2.2).
 */

import { useState } from 'react';
import { Play, Pause, Square, Music } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
import { useAudioPlayerStore } from '@/store/audioPlayerStore';
import { useSessionTracker } from '@/hooks/useSessionTracker';
import { useCharacterUpdater } from '@/hooks/useCharacterUpdater';
import { useCharacterStore } from '@/store/characterStore';
import { usePlaylistStore } from '@/store/playlistStore';
import { formatTime } from '@/utils/formatters';
import { showToast } from '@/components/ui/Toast';
import { LevelUpDetailModal } from '@/components/LevelUpDetailModal';
import { logger } from '@/utils/logger';
import type { LevelUpDetail } from 'playlist-data-engine';

interface AppHeaderProps {
  /** Main title displayed in the header */
  title?: string;
  /** Subtitle/tagline displayed below the title */
  subtitle?: string;
}

export function AppHeader({ title = 'Playlist Data Engine Showcase', subtitle = 'Technical validation • Console logging enabled' }: AppHeaderProps) {
  const { activeSession, pauseSession, resumeSession } = useSessionStore();
  const { playbackState, currentTime, duration, pause, resume, stop } = useAudioPlayerStore();
  const { endSession: hookEndSession, isActive: isSessionActive } = useSessionTracker();
  const { processSession } = useCharacterUpdater();
  const { getActiveCharacter } = useCharacterStore();
  const { selectedTrack } = usePlaylistStore();
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpDetails, setLevelUpDetails] = useState<LevelUpDetail[]>([]);

  // Show mini player when audio is playing OR when there's an active session
  // This ensures the player is visible even when session is being auto-started
  const showMiniPlayer = playbackState === 'playing' || activeSession !== null;

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
    // End the session and stop audio
    const session = hookEndSession();
    if (session) {
      // Process session for character XP
      const activeChar = getActiveCharacter();
      if (activeChar) {
        const result = processSession(activeChar, session);
        if (result) {
          // Show success toast when XP applied
          showToast(`⭐ +${session.total_xp_earned} XP earned!`, 'success');

          // Show level-up notification and modal if leveled up
          if (result.leveledUp) {
            // For uncapped mode, show auto-apply notification if stats were increased
            if (activeChar.gameMode === 'uncapped' && result.levelUpDetails && result.levelUpDetails.length > 0) {
              const allStatIncreases: Array<{ ability: string; delta: number; oldValue: number; newValue: number }> = [];
              for (const detail of result.levelUpDetails) {
                if (detail.statIncreases) {
                  for (const stat of detail.statIncreases) {
                    allStatIncreases.push({
                      ability: stat.ability,
                      delta: stat.delta,
                      oldValue: stat.oldValue,
                      newValue: stat.newValue
                    });
                  }
                }
              }
              if (allStatIncreases.length > 0) {
                const statChangeText = allStatIncreases
                  .map((inc) => `${inc.ability} +${inc.delta} (${inc.oldValue} → ${inc.newValue})`)
                  .join(', ');
                showToast(`📊 Stats auto-increased: ${statChangeText}`, 'info');
              }
            }

            // Show level-up modal with details
            if (result.levelUpDetails && result.levelUpDetails.length > 0) {
              setLevelUpDetails(result.levelUpDetails);
              setShowLevelUpModal(true);
            }
          }
        }
      } else {
        showToast('⚠️ No active character selected - XP not saved', 'warning');
        // Session ended but no character, show basic session end message
        showToast(`Session ended: ${session.duration_seconds}s tracked`, 'info');
      }
    } else {
      // No active session to end - just stop audio and notify
      logger.info('SessionTracker', 'Stop clicked but no active session - stopping audio only');
    }
    // Always stop audio
    stop();
  };

  // Handler for closing level-up modal
  const handleCloseLevelUpModal = () => {
    setShowLevelUpModal(false);
    setLevelUpDetails([]);
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

      {/* Level-Up Detail Modal */}
      <LevelUpDetailModal
        levelUpDetails={levelUpDetails}
        isOpen={showLevelUpModal}
        onClose={handleCloseLevelUpModal}
      />
    </>
  );
}

export default AppHeader;
