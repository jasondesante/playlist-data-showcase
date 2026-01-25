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
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-bold">Session Tracker</h2>
        <StatusIndicator
          status={isActive ? 'healthy' : lastSession ? 'healthy' : 'degraded'}
          label={isActive ? 'Active' : lastSession ? 'Session Complete' : 'No Session'}
        />
      </div>

      {!selectedTrack ? (
        <p className="text-muted-foreground">Select a track from the Playlist tab first</p>
      ) : (
        <>
          <div className="p-3 md:p-4 bg-accent rounded-md">
            <p className="font-medium text-sm md:text-base">{selectedTrack.title}</p>
            <p className="text-xs md:text-sm text-muted-foreground">{selectedTrack.artist}</p>
          </div>

          {!isActive ? (
            <button
              onClick={handleStart}
              className="w-full sm:w-auto px-4 py-3 md:py-2 min-h-[44px] bg-primary text-primary-foreground rounded-md hover:opacity-90 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              <span className="text-sm md:text-base">Start Session & Play Audio</span>
            </button>
          ) : (
            <>
              <div className="p-4 md:p-6 bg-card border border-border rounded-md text-center">
                <p className="text-xs md:text-sm text-muted-foreground mb-2">Elapsed Time</p>
                <p className="text-3xl md:text-4xl font-bold font-mono tabular-nums">
                  {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}
                </p>
                <div className="mt-3 md:mt-4">
                  <div className="h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-1000"
                      style={{ width: `${Math.min((elapsedTime / (selectedTrack.duration || 180)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                {sessionId && (
                  <p className="text-xs text-muted-foreground mt-2 break-all">
                    Session ID: {sessionId}
                  </p>
                )}
              </div>
              <button
                onClick={handleEnd}
                className="w-full sm:w-auto px-4 py-3 md:py-2 min-h-[44px] bg-destructive text-destructive-foreground rounded-md hover:opacity-90 flex items-center justify-center gap-2"
              >
                <Pause className="w-4 h-4" />
                <span className="text-sm md:text-base">End Session & Stop Audio</span>
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
