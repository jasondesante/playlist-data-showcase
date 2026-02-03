import { useState, useEffect, useRef } from 'react';
import { Waves, Music, Sparkles } from 'lucide-react';
import './AudioAnalysisTab.css';
import { usePlaylistStore } from '../../store/playlistStore';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { useAudioAnalyzer } from '../../hooks/useAudioAnalyzer';
import { RawJsonDump } from '../ui/RawJsonDump';
import { StatusIndicator } from '../ui/StatusIndicator';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useTabContext } from '../../App';

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
 * 8. Interactive multiplier controls for real-time frequency adjustment
 */
export function AudioAnalysisTab() {
  const { selectedTrack, audioProfile, setAudioProfile } = usePlaylistStore();
  const { playbackState } = useAudioPlayerStore();
  const { analyzeTrackWithPalette, isAnalyzing, progress, setAudioAnalyzerOptions } = useAudioAnalyzer();
  const [animateBars, setAnimateBars] = useState(false);
  const tabContext = useTabContext();
  const previousTabRef = useRef<string | undefined>(undefined);

  // Local state for multiplier controls (actual values) - all default to 1.0 (neutral)
  const [trebleBoost, setTrebleBoost] = useState(1.0);
  const [bassBoost, setBassBoost] = useState(1.0);
  const [midBoost, setMidBoost] = useState(1.0);

  // Internal slider positions (0-100 scale for the 3-zone slider) - 50 = 1.0 (neutral)
  const [trebleSliderPos, setTrebleSliderPos] = useState(50); // 1.0
  const [bassSliderPos, setBassSliderPos] = useState(50);     // 1.0
  const [midSliderPos, setMidSliderPos] = useState(50);       // 1.0

  /**
   * Map slider position (0-100) to boost value (0.1-10.0)
   * Scale 1 (0-46): 0.1-0.9 (attenuation zone)
   * Scale 2 (47-53): stuck at 1.0 (neutral zone - 7 positions for light stickiness)
   * Scale 3 (54-100): 1.1-10.0 (boost zone)
   */
  const sliderPosToValue = (pos: number): number => {
    if (pos <= 46) {
      // Scale 1: 0-46 maps to 0.1-0.9
      return 0.1 + (pos / 46) * 0.8;
    } else if (pos <= 53) {
      // Scale 2: 47-53 stuck at 1.0 (small sticky zone)
      return 1.0;
    } else {
      // Scale 3: 54-100 maps to 1.1-10.0
      return 1.1 + ((pos - 54) / 46) * 8.9;
    }
  };

  /**
   * Map boost value (0.1-10.0) to slider position (0-100)
   */
  const valueToSliderPos = (value: number): number => {
    if (value < 1.0) {
      // Scale 1: 0.1-0.9 maps to 0-46
      return ((value - 0.1) / 0.8) * 46;
    } else if (value === 1.0) {
      // Scale 2: 1.0 maps to center of sticky zone
      return 50;
    } else {
      // Scale 3: 1.1-10.0 maps to 54-100
      return 54 + ((value - 1.1) / 8.9) * 46;
    }
  };

  // Update slider positions when values change (on mount/init)
  useEffect(() => {
    setTrebleSliderPos(valueToSliderPos(trebleBoost));
    setBassSliderPos(valueToSliderPos(bassBoost));
    setMidSliderPos(valueToSliderPos(midBoost));
  }, []); // Only run on mount

  /**
   * Handle slider change - convert position to value and update both value and slider position
   * When value is 1.0 (sticky zone), don't update the slider position - makes it visually stuck
   */
  const handleSliderChange = (
    pos: number,
    setter: (value: number) => void,
    posSetter: (pos: number) => void
  ) => {
    const value = sliderPosToValue(pos);
    setter(value);
    // Only update slider position if NOT in sticky zone (value is 1.0)
    // This makes the thumb visually "stick" in the middle of the sticky zone
    if (value !== 1.0) {
      posSetter(pos);
    } else {
      // In sticky zone - always stick thumb in the middle (position 50)
      posSetter(50);
    }
  };

  // Wrapper functions for each slider
  const handleTrebleChange = (pos: number) => handleSliderChange(pos, setTrebleBoost, setTrebleSliderPos);
  const handleBassChange = (pos: number) => handleSliderChange(pos, setBassBoost, setBassSliderPos);
  const handleMidChange = (pos: number) => handleSliderChange(pos, setMidBoost, setMidSliderPos);

  const handleAnalyze = async () => {
    if (!selectedTrack?.audio_url) return;
    const profile = await analyzeTrackWithPalette(selectedTrack.audio_url, selectedTrack.image_url);
    if (profile) {
      setAudioProfile(profile);
      // Trigger bar animation after profile is set
      setTimeout(() => setAnimateBars(true), 100);
    }
  };

  const handleApplyMultipliers = async () => {
    if (!selectedTrack?.audio_url) return;

    // Create override options with current slider values
    const overrideOptions = {
      includeAdvancedMetrics: true,
      trebleBoost,
      bassBoost,
      midBoost,
    };

    // Update the analyzer options state for future analyses
    setAudioAnalyzerOptions(overrideOptions);

    // Re-analyze with the new multipliers immediately (using override to avoid state delay)
    const profile = await analyzeTrackWithPalette(selectedTrack.audio_url, selectedTrack.image_url, overrideOptions);
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

  // Re-trigger animation when switching back to audio tab with existing profile
  useEffect(() => {
    if (!tabContext) return;

    const currentTab = tabContext.activeTab;
    const previousTab = previousTabRef.current;

    // Check if we just switched TO the audio tab FROM a different tab
    if (currentTab === 'audio' && previousTab !== 'audio' && audioProfile) {
      // Reset and re-trigger the animation
      setAnimateBars(false);
      setTimeout(() => setAnimateBars(true), 50);
    }

    // Update previous tab ref
    previousTabRef.current = currentTab;
  }, [tabContext?.activeTab, audioProfile]);

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
      {/* Header with Icon Badge, Title, Selected Song, and Status */}
      <div className="audio-analysis-header">
        <div className="audio-analysis-header-left">
          <div className="audio-analysis-header-title-row">
            <div className="audio-analysis-header-icon-wrapper">
              <Waves className="audio-analysis-header-icon" />
            </div>
            <div className="audio-analysis-header-titles">
              <h2 className="audio-analysis-header-title">Audio Analysis</h2>
              <div className="audio-analysis-header-subtitle">Analyze audio frequencies and extract color palettes</div>
            </div>
          </div>
        </div>
        <div className="audio-analysis-header-right">
          {selectedTrack && (
            <div className="audio-analysis-selected-track">
              <div className="audio-analysis-selected-track-image">
                {selectedTrack.image_url ? (
                  <img src={selectedTrack.image_url} alt={selectedTrack.title} />
                ) : (
                  <Music className="audio-analysis-selected-track-fallback" />
                )}
              </div>
              <div className="audio-analysis-selected-track-info">
                <div className="audio-analysis-selected-track-title">{selectedTrack.title}</div>
                <div className="audio-analysis-selected-track-artist">{selectedTrack.artist}</div>
              </div>
            </div>
          )}
          <StatusIndicator status={getAnalysisStatus()} label={getStatusLabel()} />
        </div>
      </div>

      {/* Empty State - No Track Selected */}
      {!selectedTrack && (
        <div className="audio-analysis-empty-state">
          <div className="audio-analysis-empty-icon">🎵</div>
          <h2 className="audio-analysis-empty-title">Select a Track</h2>
          <p className="audio-analysis-empty-subtitle">Choose from the Playlist tab to begin</p>
        </div>
      )}

      {selectedTrack && !audioProfile && (
        <div className="audio-analysis-ready-state">
          <div className="audio-analysis-ready-track">
            <div className="audio-analysis-ready-image">
              {selectedTrack.image_url ? (
                <img src={selectedTrack.image_url} alt={selectedTrack.title} />
              ) : (
                <Music className="audio-analysis-ready-fallback" />
              )}
            </div>
            <div className="audio-analysis-ready-info">
              <div className="audio-analysis-ready-title">{selectedTrack.title}</div>
              <div className="audio-analysis-ready-artist">{selectedTrack.artist}</div>
            </div>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || playbackState !== 'playing'}
            isLoading={isAnalyzing}
            variant="primary"
            size="lg"
            className="audio-analysis-analyze-button-large"
            title={playbackState !== 'playing' ? 'Start playing audio first to analyze' : ''}
          >
            {isAnalyzing ? `Analyzing audio and extracting colors... ${progress}%` : 'Analyze Audio'}
          </Button>
        </div>
      )}

      {/* 3-Band EQ Controls - shown when track is selected */}
      {selectedTrack && (
        <Card variant="elevated" padding="md" className="audio-analysis-card audio-analysis-eq-card">
          <div className="audio-analysis-card-title">3-Band EQ</div>
          <div className="audio-analysis-card-subtitle">Adjust frequency bands and re-analyze to see the effect on readings</div>

          <div className="audio-analysis-eq-content">
            {/* Bass Slider */}
            <div className="audio-analysis-eq-band">
              <div className="audio-analysis-eq-label">Bass</div>
              <div className="audio-analysis-eq-value">{bassBoost.toFixed(1)}x</div>
              <div className="audio-analysis-eq-slider-wrapper">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={bassSliderPos}
                  onChange={(e) => handleBassChange(parseFloat(e.target.value))}
                  className="audio-analysis-eq-slider"
                  style={{ '--slider-value': `${bassSliderPos}%` } as React.CSSProperties}
                />
              </div>
              <div className="audio-analysis-eq-description">Low freq</div>
            </div>

            {/* Mid Slider */}
            <div className="audio-analysis-eq-band">
              <div className="audio-analysis-eq-label">Mid</div>
              <div className="audio-analysis-eq-value">{midBoost.toFixed(1)}x</div>
              <div className="audio-analysis-eq-slider-wrapper">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={midSliderPos}
                  onChange={(e) => handleMidChange(parseFloat(e.target.value))}
                  className="audio-analysis-eq-slider"
                  style={{ '--slider-value': `${midSliderPos}%` } as React.CSSProperties}
                />
              </div>
              <div className="audio-analysis-eq-description">Mid freq</div>
            </div>

            {/* Treble Slider */}
            <div className="audio-analysis-eq-band">
              <div className="audio-analysis-eq-label">Treble</div>
              <div className="audio-analysis-eq-value">{trebleBoost.toFixed(1)}x</div>
              <div className="audio-analysis-eq-slider-wrapper">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={trebleSliderPos}
                  onChange={(e) => handleTrebleChange(parseFloat(e.target.value))}
                  className="audio-analysis-eq-slider"
                  style={{ '--slider-value': `${trebleSliderPos}%` } as React.CSSProperties}
                />
              </div>
              <div className="audio-analysis-eq-description">High freq</div>
            </div>
          </div>

          {/* Re-analyze Button */}
          {audioProfile && (
            <Button
              onClick={handleApplyMultipliers}
              disabled={isAnalyzing || playbackState !== 'playing'}
              isLoading={isAnalyzing}
              variant="secondary"
              size="md"
              className="audio-analysis-reanalyze-button"
              title={playbackState !== 'playing' ? 'Start playing audio first to analyze' : ''}
            >
              {isAnalyzing ? `Re-analyzing... ${progress}%` : 'Re-Analyze with New EQ'}
            </Button>
          )}
        </Card>
      )}

      {selectedTrack && audioProfile && (
        <div className="audio-analysis-results fade-in">
          {/* Frequency Band Bar Chart Visualization */}
          <Card variant="elevated" padding="md" className="audio-analysis-card">
            <div className="audio-analysis-card-title">
              <Waves className="audio-analysis-card-title-icon" />
              Frequency Band Visualization
            </div>
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
                <div className="audio-analysis-bar-label audio-analysis-bar-label-bass">Bass</div>
                <div className="audio-analysis-bar-value">{(audioProfile.bass_dominance * 100).toFixed(1)}%</div>
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
                <div className="audio-analysis-bar-label audio-analysis-bar-label-mid">Mid</div>
                <div className="audio-analysis-bar-value">{(audioProfile.mid_dominance * 100).toFixed(1)}%</div>
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
                <div className="audio-analysis-bar-label audio-analysis-bar-label-treble">Treble</div>
                <div className="audio-analysis-bar-value">{(audioProfile.treble_dominance * 100).toFixed(1)}%</div>
              </div>
            </div>
            <div className="audio-analysis-frequency-divider" />
          </Card>

          {/* Average Amplitude */}
          <Card variant="elevated" padding="md" className="audio-analysis-card">
            <div className="audio-analysis-card-title">Average Amplitude</div>
            <div className="audio-analysis-amplitude-value">{audioProfile.average_amplitude.toFixed(3)}</div>
          </Card>

          {/* Advanced Metrics - Always shown now */}
          <Card variant="elevated" padding="md" className="audio-analysis-card">
            <div className="audio-analysis-card-title">
              Advanced Metrics
              <span className="audio-analysis-card-subtitle">(Spectral characteristics of audio)</span>
            </div>
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

          {/* Color Palette Display */}
          {audioProfile.color_palette && (
            <Card variant="elevated" padding="md" className="audio-analysis-card">
              <div className="audio-analysis-card-title">
                <Sparkles className="audio-analysis-card-title-icon" />
                Color Palette
                <span className="audio-analysis-card-subtitle">(from artwork)</span>
              </div>

              {/* Color Swatches */}
              <div className="audio-analysis-color-swatches">
                <div className="audio-analysis-color-swatch">
                  <div
                    className="audio-analysis-color-box"
                    style={{ backgroundColor: audioProfile.color_palette.primary_color }}
                    title={audioProfile.color_palette.primary_color}
                  />
                  <div className="audio-analysis-color-name">Primary</div>
                  <div className="audio-analysis-color-hex">{audioProfile.color_palette.primary_color}</div>
                </div>

                {audioProfile.color_palette.secondary_color && (
                  <div className="audio-analysis-color-swatch">
                    <div
                      className="audio-analysis-color-box"
                      style={{ backgroundColor: audioProfile.color_palette.secondary_color }}
                      title={audioProfile.color_palette.secondary_color}
                    />
                    <div className="audio-analysis-color-name">Secondary</div>
                    <div className="audio-analysis-color-hex">{audioProfile.color_palette.secondary_color}</div>
                  </div>
                )}

                {audioProfile.color_palette.accent_color && (
                  <div className="audio-analysis-color-swatch">
                    <div
                      className="audio-analysis-color-box"
                      style={{ backgroundColor: audioProfile.color_palette.accent_color }}
                      title={audioProfile.color_palette.accent_color}
                    />
                    <div className="audio-analysis-color-name">Accent</div>
                    <div className="audio-analysis-color-hex">{audioProfile.color_palette.accent_color}</div>
                  </div>
                )}
              </div>

              {/* All Colors */}
              {audioProfile.color_palette.colors.length > 0 && (
                <div className="audio-analysis-all-colors">
                  <div className="audio-analysis-all-colors-label">All detected colors:</div>
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
            <div className="audio-analysis-card-title">Sampling Timeline</div>

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
          <Card variant="elevated" padding="md" className="audio-analysis-card audio-analysis-card--metadata">
            <div className="audio-analysis-card-title">Analysis Metadata</div>
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
    </div>
  );
}

export default AudioAnalysisTab;
