import { useState } from 'react';
import { Play, Pause, Clock, Music } from 'lucide-react';
import { usePlaylistStore } from '../../store/playlistStore';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { useSessionTracker } from '../../hooks/useSessionTracker';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { TrackCard } from '../ui/TrackCard';
import type { ListeningSession } from 'playlist-data-engine';
import './SessionTrackingTab.css';

/**
 * SessionTrackingTab Component
 *
 * Demonstrates the SessionTracker module from playlist-data-engine.
 * Allows users to start/end listening sessions and tracks elapsed time.
 *
 * Features:
 * - Card-based layout for session info
 * - Animated timer with ring progress
 * - Pulse effect on active session
 * - Selected track displayed in TrackCard
 *
 * Engine module: SessionTracker
 */

interface TimerRingProps {
  progress: number;
  size: number;
  strokeWidth: number;
  isActive: boolean;
}

function TimerRing({ progress, size, strokeWidth, isActive }: TimerRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="timer-ring-container" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="timer-ring-svg"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          className="timer-ring-bg"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`timer-ring-progress ${isActive ? 'timer-ring-active' : ''}`}
        />
      </svg>
    </div>
  );
}

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

  // Calculate progress percentage
  const trackDuration = selectedTrack?.duration || 180;
  const progress = Math.min((elapsedTime / trackDuration) * 100, 100);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Format session start time
  const formatSessionTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="session-tab-container">
      {/* Header Section */}
      <div className="session-tab-header">
        <div className="session-tab-icon-badge">
          <Clock className="session-tab-icon" />
        </div>
        <div>
          <h1 className="session-tab-title">Session Tracker</h1>
          <p className="session-tab-subtitle">Track your listening sessions and view detailed analytics</p>
        </div>
      </div>

      {/* Empty State */}
      {!selectedTrack ? (
        <Card variant="elevated" padding="lg" className="session-empty-card">
          <div className="session-empty-state">
            <Music className="session-empty-icon" />
            <h3 className="session-empty-title">No Track Selected</h3>
            <p className="session-empty-description">
              Select a track from the Playlist tab to start a listening session
            </p>
          </div>
        </Card>
      ) : (
        <div className="session-content">
          {/* Selected Track Card */}
          <Card variant="elevated" padding="md" className="session-track-card">
            <CardHeader className="session-track-card-header">
              <CardTitle className="session-track-card-title">Now Playing</CardTitle>
            </CardHeader>
            <CardContent className="session-track-card-content">
              <TrackCard
                track={selectedTrack}
                isSelected={false}
                onClick={() => {}}
                size="compact"
              />
            </CardContent>
          </Card>

          {/* Timer Section */}
          <div className="session-timer-layout">
            {/* Timer Ring Card */}
            <Card variant="elevated" padding="lg" className={`session-timer-card ${isActive ? 'session-timer-card-active' : ''}`}>
              <div className="session-timer-display">
                <TimerRing
                  progress={isActive ? progress : 0}
                  size={180}
                  strokeWidth={12}
                  isActive={isActive}
                />
                <div className="session-timer-text-container">
                  <p className="session-time-label">
                    {isActive ? 'Listening' : 'Ready'}
                  </p>
                  <p className="session-time-value">
                    {formatTime(elapsedTime)}
                  </p>
                  <p className="session-time-total">
                    / {formatTime(trackDuration)}
                  </p>
                </div>
              </div>

              {isActive && sessionId && (
                <div className="session-id-display">
                  <span className="session-id-label">Session ID:</span>
                  <span className="session-id-value">{sessionId}</span>
                </div>
              )}
            </Card>

            {/* Session Info Card */}
            <Card variant="elevated" padding="lg" className="session-info-card">
              <CardHeader className="session-info-header">
                <CardTitle>Session Details</CardTitle>
                <CardDescription>
                  {isActive ? 'Session in progress' : 'Start a session to track your listening'}
                </CardDescription>
              </CardHeader>
              <CardContent className="session-info-content">
                <div className="session-info-item">
                  <span className="session-info-label">Status</span>
                  <span className={`session-info-value ${isActive ? 'session-status-active' : 'session-status-inactive'}`}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="session-info-item">
                  <span className="session-info-label">Track</span>
                  <span className="session-info-value">{selectedTrack.title}</span>
                </div>
                <div className="session-info-item">
                  <span className="session-info-label">Artist</span>
                  <span className="session-info-value">{selectedTrack.artist}</span>
                </div>
                <div className="session-info-item">
                  <span className="session-info-label">Duration</span>
                  <span className="session-info-value">{formatTime(trackDuration)}</span>
                </div>
              </CardContent>
              <CardFooter className="session-info-footer">
                {!isActive ? (
                  <Button
                    variant="primary"
                    size="lg"
                    leftIcon={Play}
                    onClick={handleStart}
                    className="session-action-button"
                  >
                    Start Session & Play Audio
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    size="lg"
                    leftIcon={Pause}
                    onClick={handleEnd}
                    className="session-action-button"
                  >
                    End Session & Stop Audio
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>

          {/* Last Session Data Card */}
          {lastSession && !isActive && (
            <Card variant="elevated" padding="lg" className="session-history-card">
              <CardHeader className="session-history-header">
                <CardTitle>Last Session</CardTitle>
                <CardDescription>
                  Completed at {formatSessionTime(lastSession.end_time)}
                </CardDescription>
              </CardHeader>
              <CardContent className="session-history-content">
                <div className="session-history-grid">
                  <div className="session-history-item">
                    <span className="session-history-label">Track UUID</span>
                    <span className="session-history-value">{lastSession.track_uuid}</span>
                  </div>
                  <div className="session-history-item">
                    <span className="session-history-label">Duration</span>
                    <span className="session-history-value">
                      {formatTime(lastSession.duration_seconds)}
                    </span>
                  </div>
                  <div className="session-history-item">
                    <span className="session-history-label">Start Time</span>
                    <span className="session-history-value">
                      {formatSessionTime(lastSession.start_time)}
                    </span>
                  </div>
                  <div className="session-history-item">
                    <span className="session-history-label">End Time</span>
                    <span className="session-history-value">
                      {formatSessionTime(lastSession.end_time)}
                    </span>
                  </div>
                  <div className="session-history-item">
                    <span className="session-history-label">XP Earned</span>
                    <span className="session-history-value">
                      {lastSession.total_xp_earned} XP
                    </span>
                  </div>
                  <div className="session-history-item">
                    <span className="session-history-label">Activity</span>
                    <span className="session-history-value">
                      {lastSession.activity_type || 'Listening'}
                    </span>
                  </div>
                </div>

                {/* Environmental Context */}
                {lastSession.environmental_context && (
                  <div className="session-context-section">
                    <h4 className="session-context-title">Environmental Context</h4>
                    <div className="session-context-grid">
                      {lastSession.environmental_context.geolocation && (
                        <div className="session-context-item">
                          <span className="session-context-label">Location</span>
                          <span className="session-context-value">
                            {lastSession.environmental_context.geolocation.latitude?.toFixed(4)}, {lastSession.environmental_context.geolocation.longitude?.toFixed(4)}
                          </span>
                        </div>
                      )}
                      {lastSession.environmental_context.biome && (
                        <div className="session-context-item">
                          <span className="session-context-label">Biome</span>
                          <span className="session-context-value">
                            {lastSession.environmental_context.biome}
                          </span>
                        </div>
                      )}
                      {lastSession.environmental_context.weather && (
                        <div className="session-context-item">
                          <span className="session-context-label">Weather</span>
                          <span className="session-context-value">
                            {typeof lastSession.environmental_context.weather === 'string'
                              ? lastSession.environmental_context.weather
                              : 'Recorded'}
                          </span>
                        </div>
                      )}
                      {lastSession.environmental_context.light && (
                        <div className="session-context-item">
                          <span className="session-context-label">Light Level</span>
                          <span className="session-context-value">
                            {typeof lastSession.environmental_context.light === 'number'
                              ? `${Math.round(lastSession.environmental_context.light)} lux`
                              : 'Recorded'}
                          </span>
                        </div>
                      )}
                      {lastSession.environmental_context.motion && (
                        <div className="session-context-item">
                          <span className="session-context-label">Motion</span>
                          <span className="session-context-value">
                            Recorded
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Gaming Context */}
                {lastSession.gaming_context && (
                  <div className="session-context-section">
                    <h4 className="session-context-title">Gaming Context</h4>
                    <div className="session-context-grid">
                      <div className="session-context-item">
                        <span className="session-context-label">Is Gaming</span>
                        <span className="session-context-value">
                          {lastSession.gaming_context.isActivelyGaming ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="session-context-item">
                        <span className="session-context-label">Platform</span>
                        <span className="session-context-value">
                          {lastSession.gaming_context.platformSource}
                        </span>
                      </div>
                      {lastSession.gaming_context.currentGame && (
                        <>
                          <div className="session-context-item">
                            <span className="session-context-label">Game</span>
                            <span className="session-context-value">
                              {lastSession.gaming_context.currentGame.name}
                            </span>
                          </div>
                          <div className="session-context-item">
                            <span className="session-context-label">Session</span>
                            <span className="session-context-value">
                              {lastSession.gaming_context.currentGame.sessionDuration
                                ? `${lastSession.gaming_context.currentGame.sessionDuration} min`
                                : 'N/A'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default SessionTrackingTab;
