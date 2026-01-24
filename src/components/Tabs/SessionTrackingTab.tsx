import { useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { usePlaylistStore } from '../../store/playlistStore';
import { useSessionTracker } from '../../hooks/useSessionTracker';

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
  const { startSession, endSession, isActive, elapsedTime } = useSessionTracker();
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const handleStart = () => {
    if (!selectedTrack) return;

    // Start session tracker
    startSession(selectedTrack.title);

    // Start audio playback
    if (selectedTrack.audio_url) {
      const audioElement = new Audio(selectedTrack.audio_url);
      audioElement.play();
      setAudio(audioElement);
    }
  };

  const handleEnd = () => {
    // Stop audio
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setAudio(null);
    }

    // End session
    endSession();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Session Tracker</h2>

      {!selectedTrack ? (
        <p className="text-muted-foreground">Select a track from the Playlist tab first</p>
      ) : (
        <>
          <div className="p-4 bg-accent rounded-md">
            <p className="font-medium">{selectedTrack.title}</p>
            <p className="text-sm text-muted-foreground">{selectedTrack.artist}</p>
          </div>

          {!isActive ? (
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Session & Play Audio
            </button>
          ) : (
            <>
              <div className="p-6 bg-card border border-border rounded-md text-center">
                <p className="text-sm text-muted-foreground mb-2">Elapsed Time</p>
                <p className="text-4xl font-bold font-mono">
                  {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}
                </p>
                <div className="mt-4">
                  <div className="h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-1000"
                      style={{ width: `${Math.min((elapsedTime / (selectedTrack.duration || 180)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={handleEnd}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:opacity-90 flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                End Session & Stop Audio
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default SessionTrackingTab;
