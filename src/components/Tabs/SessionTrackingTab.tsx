import { useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { usePlaylistStore } from '../../store/playlistStore';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { useSessionTracker } from '../../hooks/useSessionTracker';
import { StatusIndicator } from '../ui/StatusIndicator';
import { RawJsonDump } from '../ui/RawJsonDump';
import type { ListeningSession } from 'playlist-data-engine';

/**
 * SessionTrackingTab Component
 *
 * Demonstrates the SessionTracker module from playlist-data-engine.
 * Allows users to start/end listening sessions and tracks elapsed time.
 *
 * Engine module: SessionTracker
 */
export function SessionTrackingTab() {
  const { selectedTrack } = usePlaylistStore();
  const { play, stop } = useAudioPlayerStore();
  const { startSession, endSession: hookEndSession, isActive, elapsedTime } = useSessionTracker();
  const [lastSession, setLastSession] = useState<ListeningSession | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleStart = () => {
    if (!selectedTrack) return;

    // Start the audio playback
    play(selectedTrack.audio_url);

    // Start session tracker and store the session ID
    // Per engine API: startSession(trackId: string, track: PlaylistTrack, options?: { environmental_context, gaming_context })
    // Reference: USAGE_IN_OTHER_PROJECTS.md lines 146, 414-417
    const newSessionId = startSession(selectedTrack.id, selectedTrack);
    setSessionId(newSessionId);
  };

  const handleEnd = () => {
    // End session and capture the session data
    const session = hookEndSession();
    if (session) {
      setLastSession(session);
    }
    // Stop audio
    stop();
  };

  return (
    <div className="session-container">
      <div className="session-header">
        <h2 className="session-header-title">Session Tracker</h2>
        <StatusIndicator
          status={isActive ? 'healthy' : lastSession ? 'healthy' : 'degraded'}
          label={isActive ? 'Active' : lastSession ? 'Session Complete' : 'No Session'}
        />
      </div>

      {!selectedTrack ? (
        <p className="session-prompt">Select a track from the Playlist tab first</p>
      ) : (
        <>
          <div className="session-selected-track">
            <p className="session-track-title">{selectedTrack.title}</p>
            <p className="session-track-artist">{selectedTrack.artist}</p>
          </div>

          {!isActive ? (
            <button
              onClick={handleStart}
              className="session-start-button session-button-base session-button-primary"
            >
              <Play className="session-button-icon" />
              <span>Start Session & Play Audio</span>
            </button>
          ) : (
            <>
              <div className="session-timer-section">
                <p className="session-timer-label">Elapsed Time</p>
                <p className="session-timer-time">
                  {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}
                </p>
                <div className="session-progress-section">
                  <div className="session-progress-bar">
                    <div
                      className="session-progress-fill"
                      style={{ width: `${Math.min((elapsedTime / (selectedTrack.duration || 180)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                {sessionId && (
                  <p className="session-track-url">
                    Session ID: {sessionId}
                  </p>
                )}
              </div>
              <button
                onClick={handleEnd}
                className="session-start-button session-button-base session-button-destructive"
              >
                <Pause className="session-button-icon" />
                <span>End Session & Stop Audio</span>
              </button>
            </>
          )}

          {/* Show last session data after session ends */}
          {lastSession && !isActive && (
            <RawJsonDump
              data={lastSession}
              title="Last Session Data"
              defaultOpen={true}
              timestamp={new Date(lastSession.end_time * 1000)}
              status="healthy"
            />
          )}
        </>
      )}
    </div>
  );
}

export default SessionTrackingTab;
