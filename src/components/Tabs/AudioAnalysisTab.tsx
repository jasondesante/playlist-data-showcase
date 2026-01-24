import { usePlaylistStore } from '../../store/playlistStore';
import { useAudioAnalyzer } from '../../hooks/useAudioAnalyzer';
import { RawJsonDump } from '../ui/RawJsonDump';
import { StatusIndicator } from '../ui/StatusIndicator';

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
 * 7. Storing audioProfile in playlistStore for Character Gen tab to use
 */
export function AudioAnalysisTab() {
  const { selectedTrack, audioProfile, setAudioProfile } = usePlaylistStore();
  const { analyzeTrack, isAnalyzing, progress } = useAudioAnalyzer();

  const handleAnalyze = async () => {
    if (!selectedTrack?.audio_url) return;
    const profile = await analyzeTrack(selectedTrack.audio_url);
    if (profile) setAudioProfile(profile);
  };

  // Determine status indicator based on current state
  const getAnalysisStatus = (): 'healthy' | 'degraded' | 'error' => {
    if (audioProfile) return 'healthy';      // Analysis completed
    if (isAnalyzing) return 'degraded';       // Analysis in progress
    if (selectedTrack) return 'degraded';     // Has track but not analyzed yet
    return 'error';                           // No track selected
  };

  const getStatusLabel = (): string => {
    if (audioProfile) return 'Analyzed';
    if (isAnalyzing) return 'Analyzing...';
    if (selectedTrack) return 'Ready';
    return 'No Track';
  };

  return (
    <div className="space-y-6">
      {/* Header with Status Indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Audio Analysis</h2>
        <StatusIndicator
          status={getAnalysisStatus()}
          label={getStatusLabel()}
        />
      </div>

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

              {/* Sampling Timeline Visualization */}
              <div className="p-4 bg-card border border-border rounded-md">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Sampling Timeline</h3>

                {/* Timeline bar */}
                <div className="relative h-12 bg-muted rounded-md overflow-hidden mb-2">
                  {/* Timeline background track */}
                  <div className="absolute inset-0 flex items-center px-2">
                    <div className="w-full h-1 bg-border rounded" />
                  </div>

                  {/* Start marker */}
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/50" />
                  <div className="absolute left-1 bottom-0 text-xs text-muted-foreground">0%</div>

                  {/* End marker */}
                  <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-primary/50" />
                  <div className="absolute right-1 bottom-0 text-xs text-muted-foreground">100%</div>

                  {/* Sample position markers */}
                  {audioProfile.analysis_metadata.sample_positions.map((position, idx) => (
                    <div key={idx} className="absolute top-0 bottom-0 flex flex-col items-center" style={{ left: `${position * 100}%` }}>
                      {/* Marker line */}
                      <div className="w-0.5 h-full bg-primary" />
                      {/* Percentage label above */}
                      <div className="absolute -top-5 text-xs font-medium text-primary whitespace-nowrap">
                        {(position * 100).toFixed(0)}%
                      </div>
                      {/* Sample dot */}
                      <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background shadow-sm" />
                      {/* Sample number label */}
                      <div className="absolute -bottom-5 text-xs text-muted-foreground">
                        #{idx + 1}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Timeline legend/info */}
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Track Duration</span>
                  <span className="font-medium">
                    {audioProfile.analysis_metadata.full_buffer_analyzed
                      ? 'Full buffer analyzed'
                      : `Duration: ${audioProfile.analysis_metadata.duration_analyzed.toFixed(2)}s`}
                  </span>
                </div>
              </div>

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

              {/* Raw JSON Dump Section */}
              <RawJsonDump
                data={audioProfile}
                title="Raw Audio Profile JSON"
                defaultOpen={false}
                timestamp={audioProfile.analysis_metadata.analyzed_at}
                status="healthy"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AudioAnalysisTab;
