import { useState } from 'react';
import { usePlaylistStore } from '../../store/playlistStore';
import { useAudioAnalyzer } from '../../hooks/useAudioAnalyzer';
import type { AudioProfile } from '../../types';

/**
 * AudioAnalysisTab Component
 *
 * Demonstrates the AudioAnalyzer engine module by:
 * 1. Requiring a selected track from the Playlist tab
 * 2. Analyzing the audio using Web Audio API
 * 3. Displaying frequency band analysis (bass, mid, treble)
 * 4. Showing average amplitude metrics
 * 5. Displaying analysis metadata (duration, sample positions)
 */
export function AudioAnalysisTab() {
  const { selectedTrack } = usePlaylistStore();
  const { analyzeTrack, isAnalyzing, progress } = useAudioAnalyzer();
  const [audioProfile, setAudioProfile] = useState<AudioProfile | null>(null);

  const handleAnalyze = async () => {
    if (!selectedTrack?.audio_url) return;
    const profile = await analyzeTrack(selectedTrack.audio_url);
    if (profile) setAudioProfile(profile);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Audio Analysis</h2>

      {!selectedTrack ? (
        <p className="text-muted-foreground">Select a track from the Playlist tab first</p>
      ) : (
        <>
          <div className="p-4 bg-accent rounded-md">
            <p className="font-medium">{selectedTrack.title}</p>
            <p className="text-sm text-muted-foreground">{selectedTrack.artist}</p>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {isAnalyzing ? `Analyzing... ${progress}%` : 'Analyze Audio'}
          </button>

          {audioProfile && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-card border border-border rounded-md">
                  <p className="text-sm text-muted-foreground">Bass</p>
                  <p className="text-2xl font-bold">{(audioProfile.bass_dominance * 100).toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-card border border-border rounded-md">
                  <p className="text-sm text-muted-foreground">Mid</p>
                  <p className="text-2xl font-bold">{(audioProfile.mid_dominance * 100).toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-card border border-border rounded-md">
                  <p className="text-sm text-muted-foreground">Treble</p>
                  <p className="text-2xl font-bold">{(audioProfile.treble_dominance * 100).toFixed(1)}%</p>
                </div>
              </div>
              <div className="p-4 bg-card border border-border rounded-md">
                <p className="text-sm text-muted-foreground">Average Amplitude</p>
                <p className="text-lg font-bold">{audioProfile.average_amplitude.toFixed(3)}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AudioAnalysisTab;
