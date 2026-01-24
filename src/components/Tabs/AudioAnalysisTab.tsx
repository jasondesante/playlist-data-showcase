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
 * 5. Displaying color palette (if available from artwork)
 * 6. Displaying analysis metadata (duration, sample positions)
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
              {/* Frequency Band Bar Chart Visualization */}
              <div className="p-4 bg-card border border-border rounded-md">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Frequency Band Visualization</h3>
                <div className="flex items-end justify-center gap-8 h-48">
                  {/* Bass Bar */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-16 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all duration-500 ease-out"
                      style={{ height: `${Math.max(4, audioProfile.bass_dominance * 100) * 1.5}px` }}
                      title={`Bass: ${(audioProfile.bass_dominance * 100).toFixed(1)}%`}
                    />
                    <p className="text-sm font-medium text-blue-500">Bass</p>
                    <p className="text-lg font-bold">{(audioProfile.bass_dominance * 100).toFixed(1)}%</p>
                  </div>

                  {/* Mid Bar */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-16 bg-gradient-to-t from-green-600 to-green-400 rounded-t-md transition-all duration-500 ease-out"
                      style={{ height: `${Math.max(4, audioProfile.mid_dominance * 100) * 1.5}px` }}
                      title={`Mid: ${(audioProfile.mid_dominance * 100).toFixed(1)}%`}
                    />
                    <p className="text-sm font-medium text-green-500">Mid</p>
                    <p className="text-lg font-bold">{(audioProfile.mid_dominance * 100).toFixed(1)}%</p>
                  </div>

                  {/* Treble Bar */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-16 bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-md transition-all duration-500 ease-out"
                      style={{ height: `${Math.max(4, audioProfile.treble_dominance * 100) * 1.5}px` }}
                      title={`Treble: ${(audioProfile.treble_dominance * 100).toFixed(1)}%`}
                    />
                    <p className="text-sm font-medium text-orange-500">Treble</p>
                    <p className="text-lg font-bold">{(audioProfile.treble_dominance * 100).toFixed(1)}%</p>
                  </div>
                </div>
                <div className="flex justify-center mt-3">
                  <div className="w-64 h-0.5 bg-border rounded" />
                </div>
              </div>

              {/* Average Amplitude */}
              <div className="p-4 bg-card border border-border rounded-md">
                <p className="text-sm text-muted-foreground">Average Amplitude</p>
                <p className="text-lg font-bold">{audioProfile.average_amplitude.toFixed(3)}</p>
              </div>

              {/* Advanced Metrics (Optional) */}
              {(audioProfile.spectral_centroid !== undefined ||
                audioProfile.spectral_rolloff !== undefined ||
                audioProfile.zero_crossing_rate !== undefined) && (
                <div className="p-4 bg-card border border-border rounded-md">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Advanced Metrics
                    <span className="ml-2 text-xs font-normal">(Only shown when includeAdvancedMetrics=true)</span>
                  </h3>
                  <div className="space-y-2">
                    {audioProfile.spectral_centroid !== undefined && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Spectral Centroid:</span>{' '}
                        <span className="font-medium">{audioProfile.spectral_centroid.toFixed(2)} Hz</span>
                      </p>
                    )}
                    {audioProfile.spectral_rolloff !== undefined && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Spectral Rolloff:</span>{' '}
                        <span className="font-medium">{audioProfile.spectral_rolloff.toFixed(2)} Hz</span>
                      </p>
                    )}
                    {audioProfile.zero_crossing_rate !== undefined && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Zero Crossing Rate:</span>{' '}
                        <span className="font-medium">{audioProfile.zero_crossing_rate.toFixed(4)}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Color Palette Display */}
              {audioProfile.color_palette && (
                <div className="p-4 bg-card border border-border rounded-md">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Color Palette (from artwork)</h3>

                  {/* Color Swatches */}
                  <div className="flex gap-2 mb-3">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-16 h-16 rounded-md border border-border"
                        style={{ backgroundColor: audioProfile.color_palette.primary_color }}
                        title="Primary Color"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Primary</p>
                      <p className="text-xs font-mono">{audioProfile.color_palette.primary_color}</p>
                    </div>

                    {audioProfile.color_palette.secondary_color && (
                      <div className="flex flex-col items-center">
                        <div
                          className="w-16 h-16 rounded-md border border-border"
                          style={{ backgroundColor: audioProfile.color_palette.secondary_color }}
                          title="Secondary Color"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Secondary</p>
                        <p className="text-xs font-mono">{audioProfile.color_palette.secondary_color}</p>
                      </div>
                    )}

                    {audioProfile.color_palette.accent_color && (
                      <div className="flex flex-col items-center">
                        <div
                          className="w-16 h-16 rounded-md border border-border"
                          style={{ backgroundColor: audioProfile.color_palette.accent_color }}
                          title="Accent Color"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Accent</p>
                        <p className="text-xs font-mono">{audioProfile.color_palette.accent_color}</p>
                      </div>
                    )}
                  </div>

                  {/* All Colors */}
                  {audioProfile.color_palette.colors.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-1">All detected colors:</p>
                      <div className="flex gap-1 flex-wrap">
                        {audioProfile.color_palette.colors.map((color, idx) => (
                          <div
                            key={idx}
                            className="w-6 h-6 rounded border border-border"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Color Properties */}
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Brightness:</span>{' '}
                      <span className="font-medium">{(audioProfile.color_palette.brightness * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Saturation:</span>{' '}
                      <span className="font-medium">{(audioProfile.color_palette.saturation * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Monochrome:</span>{' '}
                      <span className="font-medium">{audioProfile.color_palette.is_monochrome ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Analysis Metadata */}
              <div className="p-4 bg-card border border-border rounded-md">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Analysis Metadata</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Duration analyzed:</span>{' '}
                    <span className="font-medium">{audioProfile.analysis_metadata.duration_analyzed.toFixed(2)}s</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Full buffer analyzed:</span>{' '}
                    <span className="font-medium">{audioProfile.analysis_metadata.full_buffer_analyzed ? 'Yes' : 'No'}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Sample positions:</span>{' '}
                    <span className="font-medium">{audioProfile.analysis_metadata.sample_positions.map(p => `${(p * 100).toFixed(0)}%`).join(', ')}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Analyzed at:</span>{' '}
                    <span className="font-medium">{new Date(audioProfile.analysis_metadata.analyzed_at).toLocaleString()}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AudioAnalysisTab;
