import { useState, useEffect } from 'react';
import { Waves, Music, Sparkles } from 'lucide-react';
import { usePlaylistStore } from '../../store/playlistStore';
import { useAudioAnalyzer } from '../../hooks/useAudioAnalyzer';
import { RawJsonDump } from '../ui/RawJsonDump';
import { StatusIndicator } from '../ui/StatusIndicator';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

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
  const [animateBars, setAnimateBars] = useState(false);

  const handleAnalyze = async () => {
    if (!selectedTrack?.audio_url) return;
    const profile = await analyzeTrack(selectedTrack.audio_url);
    if (profile) {
      setAudioProfile(profile);
      // Trigger bar animation after profile is set
      setTimeout(() => setAnimateBars(true), 100);
    }
  };

  // Reset animation when track changes
  useEffect(() => {
    setAnimateBars(false);
  }, [selectedTrack]);

  // Determine status indicator based on current state
  const getAnalysisStatus = (): 'healthy' | 'degraded' | 'error' => {
    if (audioProfile) return 'healthy';
    if (isAnalyzing) return 'degraded';
    if (selectedTrack) return 'degraded';
    return 'error';
  };

  const getStatusLabel = (): string => {
    if (audioProfile) return 'Analyzed';
    if (isAnalyzing) return 'Analyzing...';
    if (selectedTrack) return 'Ready';
    return 'No Track';
  };

  return (
    <div className="audio-analysis-container">
      {/* Header with Icon Badge and Status Indicator */}
      <div className="audio-analysis-header">
        <div className="audio-analysis-header-content">
          <div className="audio-analysis-header-title-row">
            <div className="audio-analysis-header-icon-wrapper">
              <Waves className="audio-analysis-header-icon" />
            </div>
            <h2 className="audio-analysis-header-title">Audio Analysis</h2>
          </div>
          <p className="audio-analysis-header-subtitle">Analyze audio frequencies and extract color palettes</p>
        </div>
        <StatusIndicator
          status={getAnalysisStatus()}
          label={getStatusLabel()}
        />
      </div>

      {/* Empty State - No Track Selected */}
      {!selectedTrack && (
        <Card variant="flat" padding="lg">
          <div className="audio-analysis-empty-state">
            <div className="audio-analysis-empty-icon-wrapper">
              <span className="audio-analysis-empty-icon" role="img" aria-label="Music">
                🎵
              </span>
            </div>
            <h4 className="audio-analysis-empty-title">No Track Selected</h4>
            <p className="audio-analysis-empty-description">
              Select a track from the Playlist tab to analyze its audio frequencies and extract color palettes.
            </p>
          </div>
        </Card>
      )}

      {selectedTrack && (
        <>
          {/* Selected Track Card */}
          <Card variant="elevated" padding="md" className="audio-analysis-track-card">
            <div className="audio-analysis-track-info">
              <div className="audio-analysis-track-icon">
                <Music className="audio-analysis-track-music-icon" />
              </div>
              <div className="audio-analysis-track-details">
                <p className="audio-analysis-track-title">{selectedTrack.title}</p>
                <p className="audio-analysis-track-artist">{selectedTrack.artist}</p>
              </div>
            </div>
          </Card>

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            isLoading={isAnalyzing}
            variant="primary"
            size="lg"
            className="audio-analysis-analyze-button"
          >
            {isAnalyzing ? `Analyzing... ${progress}%` : 'Analyze Audio'}
          </Button>

          {audioProfile && (
            <div className="audio-analysis-results fade-in">
              {/* Frequency Band Bar Chart Visualization */}
              <Card variant="elevated" padding="md" className="audio-analysis-card">
                <h3 className="audio-analysis-card-title">
                  <Waves className="audio-analysis-card-title-icon" />
                  Frequency Band Visualization
                </h3>
                <div className="audio-analysis-frequency-container">
                  {/* Bass Bar */}
                  <div className="audio-analysis-frequency-bar">
                    <div className="audio-analysis-bar-container">
                      <div
                        className="audio-analysis-bar audio-analysis-bar-bass"
                        style={{
                          height: animateBars ? `${Math.max(16, audioProfile.bass_dominance * 160)}px` : '16px',
                        }}
                        title={`Bass: ${(audioProfile.bass_dominance * 100).toFixed(1)}%`}
                      />
                    </div>
                    <p className="audio-analysis-bar-label audio-analysis-bar-label-bass">Bass</p>
                    <p className="audio-analysis-bar-value">{(audioProfile.bass_dominance * 100).toFixed(1)}%</p>
                  </div>

                  {/* Mid Bar */}
                  <div className="audio-analysis-frequency-bar">
                    <div className="audio-analysis-bar-container">
                      <div
                        className="audio-analysis-bar audio-analysis-bar-mid"
                        style={{
                          height: animateBars ? `${Math.max(16, audioProfile.mid_dominance * 160)}px` : '16px',
                          transitionDelay: '100ms',
                        }}
                        title={`Mid: ${(audioProfile.mid_dominance * 100).toFixed(1)}%`}
                      />
                    </div>
                    <p className="audio-analysis-bar-label audio-analysis-bar-label-mid">Mid</p>
                    <p className="audio-analysis-bar-value">{(audioProfile.mid_dominance * 100).toFixed(1)}%</p>
                  </div>

                  {/* Treble Bar */}
                  <div className="audio-analysis-frequency-bar">
                    <div className="audio-analysis-bar-container">
                      <div
                        className="audio-analysis-bar audio-analysis-bar-treble"
                        style={{
                          height: animateBars ? `${Math.max(16, audioProfile.treble_dominance * 160)}px` : '16px',
                          transitionDelay: '200ms',
                        }}
                        title={`Treble: ${(audioProfile.treble_dominance * 100).toFixed(1)}%`}
                      />
                    </div>
                    <p className="audio-analysis-bar-label audio-analysis-bar-label-treble">Treble</p>
                    <p className="audio-analysis-bar-value">{(audioProfile.treble_dominance * 100).toFixed(1)}%</p>
                  </div>
                </div>
                <div className="audio-analysis-frequency-divider" />
              </Card>

              {/* Average Amplitude */}
              <Card variant="elevated" padding="md" className="audio-analysis-card">
                <h3 className="audio-analysis-card-title">Average Amplitude</h3>
                <p className="audio-analysis-amplitude-value">{audioProfile.average_amplitude.toFixed(3)}</p>
              </Card>

              {/* Advanced Metrics (Optional) */}
              {(audioProfile.spectral_centroid !== undefined ||
                audioProfile.spectral_rolloff !== undefined ||
                audioProfile.zero_crossing_rate !== undefined) && (
                <Card variant="elevated" padding="md" className="audio-analysis-card">
                  <h3 className="audio-analysis-card-title">
                    Advanced Metrics
                    <span className="audio-analysis-card-subtitle">(Only shown when includeAdvancedMetrics=true)</span>
                  </h3>
                  <div className="audio-analysis-metrics-list">
                    {audioProfile.spectral_centroid !== undefined && (
                      <div className="audio-analysis-metric-item">
                        <span className="audio-analysis-metric-label">Spectral Centroid:</span>
                        <span className="audio-analysis-metric-value">{audioProfile.spectral_centroid.toFixed(2)} Hz</span>
                      </div>
                    )}
                    {audioProfile.spectral_rolloff !== undefined && (
                      <div className="audio-analysis-metric-item">
                        <span className="audio-analysis-metric-label">Spectral Rolloff:</span>
                        <span className="audio-analysis-metric-value">{audioProfile.spectral_rolloff.toFixed(2)} Hz</span>
                      </div>
                    )}
                    {audioProfile.zero_crossing_rate !== undefined && (
                      <div className="audio-analysis-metric-item">
                        <span className="audio-analysis-metric-label">Zero Crossing Rate:</span>
                        <span className="audio-analysis-metric-value">{audioProfile.zero_crossing_rate.toFixed(4)}</span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Color Palette Display */}
              {audioProfile.color_palette && (
                <Card variant="elevated" padding="md" className="audio-analysis-card">
                  <h3 className="audio-analysis-card-title">
                    <Sparkles className="audio-analysis-card-title-icon" />
                    Color Palette
                    <span className="audio-analysis-card-subtitle">(from artwork)</span>
                  </h3>

                  {/* Color Swatches */}
                  <div className="audio-analysis-color-swatches">
                    <div className="audio-analysis-color-swatch">
                      <div
                        className="audio-analysis-color-box"
                        style={{ backgroundColor: audioProfile.color_palette.primary_color }}
                        title={audioProfile.color_palette.primary_color}
                      />
                      <p className="audio-analysis-color-name">Primary</p>
                      <p className="audio-analysis-color-hex">{audioProfile.color_palette.primary_color}</p>
                    </div>

                    {audioProfile.color_palette.secondary_color && (
                      <div className="audio-analysis-color-swatch">
                        <div
                          className="audio-analysis-color-box"
                          style={{ backgroundColor: audioProfile.color_palette.secondary_color }}
                          title={audioProfile.color_palette.secondary_color}
                        />
                        <p className="audio-analysis-color-name">Secondary</p>
                        <p className="audio-analysis-color-hex">{audioProfile.color_palette.secondary_color}</p>
                      </div>
                    )}

                    {audioProfile.color_palette.accent_color && (
                      <div className="audio-analysis-color-swatch">
                        <div
                          className="audio-analysis-color-box"
                          style={{ backgroundColor: audioProfile.color_palette.accent_color }}
                          title={audioProfile.color_palette.accent_color}
                        />
                        <p className="audio-analysis-color-name">Accent</p>
                        <p className="audio-analysis-color-hex">{audioProfile.color_palette.accent_color}</p>
                      </div>
                    )}
                  </div>

                  {/* All Colors */}
                  {audioProfile.color_palette.colors.length > 0 && (
                    <div className="audio-analysis-all-colors">
                      <p className="audio-analysis-all-colors-label">All detected colors:</p>
                      <div className="audio-analysis-all-colors-grid">
                        {audioProfile.color_palette.colors.map((color, idx) => (
                          <div
                            key={idx}
                            className="audio-analysis-color-dot"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Color Properties */}
                  <div className="audio-analysis-color-properties">
                    <div className="audio-analysis-color-property">
                      <span className="audio-analysis-property-label">Brightness:</span>
                      <span className="audio-analysis-property-value">{(audioProfile.color_palette.brightness * 100).toFixed(0)}%</span>
                    </div>
                    <div className="audio-analysis-color-property">
                      <span className="audio-analysis-property-label">Saturation:</span>
                      <span className="audio-analysis-property-value">{(audioProfile.color_palette.saturation * 100).toFixed(0)}%</span>
                    </div>
                    <div className="audio-analysis-color-property">
                      <span className="audio-analysis-property-label">Monochrome:</span>
                      <span className="audio-analysis-property-value">{audioProfile.color_palette.is_monochrome ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </Card>
              )}

              {/* Sampling Timeline Visualization */}
              <Card variant="elevated" padding="md" className="audio-analysis-card">
                <h3 className="audio-analysis-card-title">Sampling Timeline</h3>

                {/* Timeline bar */}
                <div className="audio-analysis-timeline">
                  {/* Timeline background track */}
                  <div className="audio-analysis-timeline-track">
                    <div className="audio-analysis-timeline-line" />
                  </div>

                  {/* Start marker */}
                  <div className="audio-analysis-timeline-marker audio-analysis-timeline-marker-start">
                    <div className="audio-analysis-timeline-marker-line" />
                    <div className="audio-analysis-timeline-marker-label">0%</div>
                  </div>

                  {/* End marker */}
                  <div className="audio-analysis-timeline-marker audio-analysis-timeline-marker-end">
                    <div className="audio-analysis-timeline-marker-line" />
                    <div className="audio-analysis-timeline-marker-label">100%</div>
                  </div>

                  {/* Sample position markers */}
                  {audioProfile.analysis_metadata.sample_positions.map((position, idx) => (
                    <div
                      key={idx}
                      className="audio-analysis-sample-marker"
                      style={{ left: `${position * 100}%` }}
                    >
                      <div className="audio-analysis-sample-marker-line" />
                      <div className="audio-analysis-sample-marker-percent">{(position * 100).toFixed(0)}%</div>
                      <div className="audio-analysis-sample-marker-dot" />
                      <div className="audio-analysis-sample-marker-number">#{idx + 1}</div>
                    </div>
                  ))}
                </div>

                {/* Timeline legend/info */}
                <div className="audio-analysis-timeline-legend">
                  <span>Track Duration</span>
                  <span className="audio-analysis-timeline-duration">
                    {audioProfile.analysis_metadata.full_buffer_analyzed
                      ? 'Full buffer analyzed'
                      : `Duration: ${audioProfile.analysis_metadata.duration_analyzed.toFixed(2)}s`}
                  </span>
                </div>
              </Card>

              {/* Analysis Metadata */}
              <Card variant="elevated" padding="md" className="audio-analysis-card">
                <h3 className="audio-analysis-card-title">Analysis Metadata</h3>
                <div className="audio-analysis-metadata-list">
                  <div className="audio-analysis-metadata-item">
                    <span className="audio-analysis-metadata-label">Duration analyzed:</span>
                    <span className="audio-analysis-metadata-value">{audioProfile.analysis_metadata.duration_analyzed.toFixed(2)}s</span>
                  </div>
                  <div className="audio-analysis-metadata-item">
                    <span className="audio-analysis-metadata-label">Full buffer analyzed:</span>
                    <span className="audio-analysis-metadata-value">{audioProfile.analysis_metadata.full_buffer_analyzed ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="audio-analysis-metadata-item">
                    <span className="audio-analysis-metadata-label">Sample positions:</span>
                    <span className="audio-analysis-metadata-value">
                      {audioProfile.analysis_metadata.sample_positions.map(p => `${(p * 100).toFixed(0)}%`).join(', ')}
                    </span>
                  </div>
                  <div className="audio-analysis-metadata-item">
                    <span className="audio-analysis-metadata-label">Analyzed at:</span>
                    <span className="audio-analysis-metadata-value">
                      {new Date(audioProfile.analysis_metadata.analyzed_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>

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
