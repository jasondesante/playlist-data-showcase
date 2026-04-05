import { useState, useEffect, useRef } from 'react';
import { Waves, Music, Sparkles, Zap, Activity, Clock, Disc } from 'lucide-react';
import './AudioAnalysisTab.css';
import { usePlaylistStore } from '../../store/playlistStore';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { useAudioAnalyzer } from '../../hooks/useAudioAnalyzer';
import { useMusicClassifier, GENRE_PRESET_LABELS, MOOD_PRESET_LABELS, type UseMusicClassifierOptions } from '../../hooks/useMusicClassifier';
import type { GenrePreset, MoodPreset } from 'playlist-data-engine';
import { useTrackDuration } from '../../hooks/useTrackDuration';
import { GenreClassificationCard } from '../AudioAnalysis/GenreClassificationCard';
import { MoodClassificationCard } from '../AudioAnalysis/MoodClassificationCard';
import { VibeMetricsCard } from '../AudioAnalysis/VibeMetricsCard';
import { RawJsonDump } from '../ui/RawJsonDump';
import { StatusIndicator } from '../ui/StatusIndicator';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useTabContext } from '../../App';
import { ArweaveImage } from '../shared/ArweaveImage';
import { RadarChart } from '../ui/RadarChart';
import { TimelineScrubber } from '../ui/TimelineScrubber';
import { ColorExtractor } from 'playlist-data-engine';
import type { PitchAlgorithm } from '../../types/rhythmGeneration';

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
  const { selectedTrack, audioProfile, setAudioProfile, musicClassification } = usePlaylistStore();
  const { playbackState, currentTime, seek } = useAudioPlayerStore();
  // Use shared hook for validated duration with metadata fallback
  const duration = useTrackDuration();
  const { analyzeTrackWithPalette, isAnalyzing, progress, setAudioAnalyzerOptions, analyzeTimeline, isTimelineAnalyzing, timelineData } = useAudioAnalyzer();
  const {
    analyze,
    setOptions,
    isModelLoading: isGenreModelLoading,
    isAnalyzing: isGenreAnalyzing,
    progress: genreProgress,
    error: genreError,
    retry: retryGenreAnalysis,
  } = useMusicClassifier();
  const [animateBars, setAnimateBars] = useState(false);
  const tabContext = useTabContext();
  const previousTabRef = useRef<string | undefined>(undefined);

  // Timeline visualization state for Phase 6
  const [selectedTimelineIndex, setSelectedTimelineIndex] = useState(0);
  const [audioSyncEnabled, setAudioSyncEnabled] = useState(false);

  // Local state for multiplier controls (actual values) - all default to 1.0 (neutral)
  const [trebleBoost, setTrebleBoost] = useState(1.0);
  const [bassBoost, setBassBoost] = useState(1.0);
  const [midBoost, setMidBoost] = useState(1.0);

  // Internal slider positions (0-100 scale for the 3-zone slider) - 50 = 1.0 (neutral)
  const [trebleSliderPos, setTrebleSliderPos] = useState(50); // 1.0
  const [bassSliderPos, setBassSliderPos] = useState(50);     // 1.0
  const [midSliderPos, setMidSliderPos] = useState(50);       // 1.0

  // Analysis mode state for Phase 3: Normal vs Timeline vs Genre analysis
  const [analysisMode, setAnalysisMode] = useState<'normal' | 'timeline' | 'genre' | 'pitch'>('normal');
  // Timeline mode options - count vs interval toggle
  const [timelineMode, setTimelineMode] = useState<'count' | 'interval'>('count');
  // Timeline slider values
  const [timelineCount, setTimelineCount] = useState(20); // 5-100 data points
  const [timelineInterval, setTimelineInterval] = useState(2); // 1-10 seconds

  // Genre mode options - topN (threshold always 1 to show all results)
  const [genreTopN, setGenreTopN] = useState(10); // 1-20 genres to return
  const genreThreshold = 0.01; // Fixed at 1% - always show all results

  // Model selection state - preset names from the engine
  const [selectedGenreModel, setSelectedGenreModel] = useState<GenrePreset | null>(null);
  const [selectedMoodModel, setSelectedMoodModel] = useState<MoodPreset | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);

  // Pitch mode options
  const [pitchAlgorithm, setPitchAlgorithm] = useState<PitchAlgorithm>('pitch_melodia');
  const [pitchMinFreq, setPitchMinFreq] = useState(80);
  const [pitchMaxFreq, setPitchMaxFreq] = useState(20000);
  const [pitchIncludeContour, setPitchIncludeContour] = useState(true);

  // When opening model selector, initialize with defaults
  const handleToggleModelSelector = (show: boolean) => {
    if (show) {
      // Set defaults when opening
      setSelectedGenreModel('discogs400');
      setSelectedMoodModel('jamendo');
    }
    setShowModelSelector(show);
  };

  // Model selection handlers - always require one selection (no deselection allowed)
  const handleSelectGenreModel = (key: GenrePreset) => {
    // Only change if selecting a different model (prevent deselection)
    if (selectedGenreModel !== key) {
      setSelectedGenreModel(key);
    }
  };

  const handleSelectMoodModel = (key: MoodPreset) => {
    // Only change if selecting a different model (prevent deselection)
    if (selectedMoodModel !== key) {
      setSelectedMoodModel(key);
    }
  };

  /**
   * Map slider position (0-100) to boost value (0.1-10.0)
   * Scale 1 (0-44): 0.1-0.9 (attenuation zone)
   * Scale 2 (45-55): stuck at 1.0 (neutral zone - 7 positions for light stickiness)
   * Scale 3 (56-100): 1.1-10.0 (boost zone)
   */
  const sliderPosToValue = (pos: number): number => {
    if (pos <= 44) {
      // Scale 1: 0-44 maps to 0.1-0.9
      return 0.1 + (pos / 44) * 0.8;
    } else if (pos <= 55) {
      // Scale 2: 45-55 stuck at 1.0 (small sticky zone)
      return 1.0;
    } else {
      // Scale 3: 56-100 maps to 1.1-10.0
      return 1.1 + ((pos - 56) / 44) * 8.9;
    }
  };

  /**
   * Map boost value (0.1-10.0) to slider position (0-100)
   */
  const valueToSliderPos = (value: number): number => {
    if (value < 1.0) {
      // Scale 1: 0.1-0.9 maps to 0-44
      return ((value - 0.1) / 0.8) * 44;
    } else if (value === 1.0) {
      // Scale 2: 1.0 maps to center of sticky zone
      return 50;
    } else {
      // Scale 3: 1.1-10.0 maps to 56-100
      return 56 + ((value - 1.1) / 8.9) * 44;
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

    if (analysisMode === 'genre') {
      // Genre analysis mode - ML-based classification
      // Pass preset names to the engine — it resolves them to URLs internally

      const preset: UseMusicClassifierOptions['preset'] = {
        genre: selectedGenreModel ?? 'discogs400',
        mood: selectedMoodModel ?? 'jamendo',
        danceability: 'default',
      };

      const classifierOptions: UseMusicClassifierOptions = {
        preset,
        topN: genreTopN,
        threshold: genreThreshold,
      };

      // Also update state for UI consistency
      setOptions(classifierOptions);

      // Analyze music - pass options directly to bypass async state issue
      await analyze(selectedTrack.audio_url, classifierOptions);
    } else if (analysisMode === 'timeline') {
      // Timeline analysis mode - analyze full song with timeline data points
      const strategy = timelineMode === 'count'
        ? { type: 'count' as const, count: timelineCount }
        : { type: 'interval' as const, intervalSeconds: timelineInterval };

      // Run timeline analysis and color extraction in parallel
      const [events, colorPalette] = await Promise.all([
        analyzeTimeline(selectedTrack.audio_url, strategy),
        selectedTrack.image_url
          ? new ColorExtractor().extractPalette(selectedTrack.image_url).catch(() => undefined)
          : Promise.resolve(undefined)
      ]);

      if (events.length > 0) {
        // Calculate average values from timeline events for the audio profile
        const avgBass = events.reduce((sum, e) => sum + e.bass, 0) / events.length;
        const avgMid = events.reduce((sum, e) => sum + e.mid, 0) / events.length;
        const avgTreble = events.reduce((sum, e) => sum + e.treble, 0) / events.length;
        const avgAmplitude = events.reduce((sum, e) => sum + e.amplitude, 0) / events.length;
        const avgRmsEnergy = events.reduce((sum, e) => sum + e.rms_energy, 0) / events.length;
        const avgDynamicRange = events.reduce((sum, e) => sum + e.dynamic_range, 0) / events.length;

        // Calculate advanced metrics if available
        const eventsWithCentroid = events.filter(e => e.spectral_centroid !== undefined);
        const eventsWithRolloff = events.filter(e => e.spectral_rolloff !== undefined);
        const eventsWithZcr = events.filter(e => e.zero_crossing_rate !== undefined);

        const avgSpectralCentroid = eventsWithCentroid.length > 0
          ? eventsWithCentroid.reduce((sum, e) => sum + e.spectral_centroid!, 0) / eventsWithCentroid.length
          : undefined;
        const avgSpectralRolloff = eventsWithRolloff.length > 0
          ? eventsWithRolloff.reduce((sum, e) => sum + e.spectral_rolloff!, 0) / eventsWithRolloff.length
          : undefined;
        const avgZeroCrossingRate = eventsWithZcr.length > 0
          ? eventsWithZcr.reduce((sum, e) => sum + e.zero_crossing_rate!, 0) / eventsWithZcr.length
          : undefined;

        // Create a synthetic AudioProfile from timeline data
        const profile = {
          bass_dominance: avgBass,
          mid_dominance: avgMid,
          treble_dominance: avgTreble,
          average_amplitude: avgAmplitude,
          rms_energy: avgRmsEnergy,
          dynamic_range: avgDynamicRange,
          spectral_centroid: avgSpectralCentroid,
          spectral_rolloff: avgSpectralRolloff,
          zero_crossing_rate: avgZeroCrossingRate,
          color_palette: colorPalette,
          analysis_metadata: {
            duration_analyzed: events[events.length - 1].timestamp + events[events.length - 1].duration,
            full_buffer_analyzed: true,
            sample_positions: events.map(e => e.timestamp / (events[events.length - 1].timestamp + events[events.length - 1].duration)),
            analyzed_at: new Date().toISOString(),
          },
        };

        setAudioProfile(profile);
        setTimeout(() => setAnimateBars(true), 100);
      }
    } else {
      // Normal analysis mode - 3 samples
      const profile = await analyzeTrackWithPalette(selectedTrack.audio_url, selectedTrack.image_url);
      if (profile) {
        setAudioProfile(profile);
        // Trigger bar animation after profile is set
        setTimeout(() => setAnimateBars(true), 100);
      }
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

    if (analysisMode === 'timeline') {
      // Timeline analysis mode with multipliers - re-run timeline analysis
      const strategy = timelineMode === 'count'
        ? { type: 'count' as const, count: timelineCount }
        : { type: 'interval' as const, intervalSeconds: timelineInterval };

      const events = await analyzeTimeline(selectedTrack.audio_url, strategy);

      if (events.length > 0) {
        // Calculate average values from timeline events for the audio profile
        const avgBass = events.reduce((sum, e) => sum + e.bass, 0) / events.length;
        const avgMid = events.reduce((sum, e) => sum + e.mid, 0) / events.length;
        const avgTreble = events.reduce((sum, e) => sum + e.treble, 0) / events.length;
        const avgAmplitude = events.reduce((sum, e) => sum + e.amplitude, 0) / events.length;
        const avgRmsEnergy = events.reduce((sum, e) => sum + e.rms_energy, 0) / events.length;
        const avgDynamicRange = events.reduce((sum, e) => sum + e.dynamic_range, 0) / events.length;

        // Calculate advanced metrics if available
        const eventsWithCentroid = events.filter(e => e.spectral_centroid !== undefined);
        const eventsWithRolloff = events.filter(e => e.spectral_rolloff !== undefined);
        const eventsWithZcr = events.filter(e => e.zero_crossing_rate !== undefined);

        const avgSpectralCentroid = eventsWithCentroid.length > 0
          ? eventsWithCentroid.reduce((sum, e) => sum + e.spectral_centroid!, 0) / eventsWithCentroid.length
          : undefined;
        const avgSpectralRolloff = eventsWithRolloff.length > 0
          ? eventsWithRolloff.reduce((sum, e) => sum + e.spectral_rolloff!, 0) / eventsWithRolloff.length
          : undefined;
        const avgZeroCrossingRate = eventsWithZcr.length > 0
          ? eventsWithZcr.reduce((sum, e) => sum + e.zero_crossing_rate!, 0) / eventsWithZcr.length
          : undefined;

        // Create a synthetic AudioProfile from timeline data (preserve existing color_palette)
        const profile = {
          bass_dominance: avgBass,
          mid_dominance: avgMid,
          treble_dominance: avgTreble,
          average_amplitude: avgAmplitude,
          rms_energy: avgRmsEnergy,
          dynamic_range: avgDynamicRange,
          spectral_centroid: avgSpectralCentroid,
          spectral_rolloff: avgSpectralRolloff,
          zero_crossing_rate: avgZeroCrossingRate,
          color_palette: audioProfile?.color_palette,
          analysis_metadata: {
            duration_analyzed: events[events.length - 1].timestamp + events[events.length - 1].duration,
            full_buffer_analyzed: true,
            sample_positions: events.map(e => e.timestamp / (events[events.length - 1].timestamp + events[events.length - 1].duration)),
            analyzed_at: new Date().toISOString(),
          },
        };

        setAudioProfile(profile);
        setTimeout(() => setAnimateBars(true), 100);
      }
    } else {
      // Normal analysis mode - re-analyze with the new multipliers immediately
      const profile = await analyzeTrackWithPalette(selectedTrack.audio_url, selectedTrack.image_url, overrideOptions);
      if (profile) {
        setAudioProfile(profile);
        // Trigger bar animation after profile is set
        setTimeout(() => setAnimateBars(true), 100);
      }
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
    if (isAnalyzing || isTimelineAnalyzing) return 'degraded';
    if (selectedTrack) return 'degraded';
    return 'error';
  };

  const getStatusLabel = (): string => {
    if (audioProfile) return 'Analyzed';
    if (isTimelineAnalyzing) return 'Timeline...';
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

      {/* Primary Control Card - Cohesive Song Info + EQ + Analysis Action */}
      {selectedTrack && (
        <Card variant="elevated" padding="lg" className="audio-analysis-primary-card">
          <div className="audio-analysis-primary-layout">

            {/* 1. Song Display Section */}
            <div className="audio-analysis-song-display">
              <div className="audio-analysis-song-artwork">
                {selectedTrack.image_url ? (
                  <ArweaveImage
                    src={selectedTrack.image_url}
                    alt={selectedTrack.title}
                    className="audio-analysis-artwork-image"
                    fallback={<Music className="audio-analysis-ready-fallback" />}
                  />
                ) : (
                  <Music className="audio-analysis-ready-fallback" />
                )}
                {isAnalyzing && (
                  <div className="audio-analysis-artwork-overlay">
                    <Sparkles className="audio-analysis-sparkle-icon" />
                  </div>
                )}
              </div>
              <div className="audio-analysis-song-meta">
                <div className="audio-analysis-song-title-large">{selectedTrack.title}</div>
                <div className="audio-analysis-song-artist-large">{selectedTrack.artist}</div>
                <div className="audio-analysis-song-status-badge">
                  <StatusIndicator status={getAnalysisStatus()} label={getStatusLabel()} />
                </div>
              </div>
            </div>

            {/* 2. Integrated EQ Section - Hidden in Genre mode (not applicable to ML classification) */}
            {analysisMode !== 'genre' && (
            <div className="audio-analysis-eq-integration">
                <div className="audio-analysis-eq-header-row">
                  <div className="audio-analysis-eq-title-main">EQ</div>
                  <div className="audio-analysis-eq-subtitle-main">Adjust for analysis</div>
                </div>

                <div className="audio-analysis-eq-grid">
                  {/* Bass Slider */}
                  <div className="audio-analysis-eq-band-compact">
                    <div className="audio-analysis-eq-slider-vertical">
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
                    <div className="audio-analysis-eq-metadata">
                      <span className="audio-analysis-eq-name">Bass</span>
                      <span className="audio-analysis-eq-multiplier">{bassBoost.toFixed(1)}x</span>
                    </div>
                  </div>

                  {/* Mid Slider */}
                  <div className="audio-analysis-eq-band-compact">
                    <div className="audio-analysis-eq-slider-vertical">
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
                    <div className="audio-analysis-eq-metadata">
                      <span className="audio-analysis-eq-name">Mid</span>
                      <span className="audio-analysis-eq-multiplier">{midBoost.toFixed(1)}x</span>
                    </div>
                  </div>

                  {/* Treble Slider */}
                  <div className="audio-analysis-eq-band-compact">
                    <div className="audio-analysis-eq-slider-vertical">
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
                    <div className="audio-analysis-eq-metadata">
                      <span className="audio-analysis-eq-name">Treble</span>
                      <span className="audio-analysis-eq-multiplier">{trebleBoost.toFixed(1)}x</span>
                    </div>
                  </div>
                </div>
            </div>
            )}

            {/* 3. Analysis Mode Selector */}
            <div className={`audio-analysis-mode-card${analysisMode === 'genre' ? ' audio-analysis-mode-card--genre' : ''}`}>
              <div className="audio-analysis-mode-header">
                <span className="audio-analysis-mode-title">Mode</span>
                <span className="audio-analysis-mode-subtitle">Sampling strategy</span>
              </div>
              <div className="audio-analysis-mode-buttons" role="radiogroup" aria-label="Analysis mode selection">
                <button
                  type="button"
                  className={`audio-analysis-mode-btn ${analysisMode === 'normal' ? 'audio-analysis-mode-btn-active' : ''}`}
                  onClick={() => setAnalysisMode('normal')}
                  aria-checked={analysisMode === 'normal'}
                  role="radio"
                >
                  <Activity className="audio-analysis-mode-icon" size={16} />
                  <span className="audio-analysis-mode-label">Normal</span>
                  <span className="audio-analysis-mode-desc">3 samples</span>
                </button>
                <button
                  type="button"
                  className={`audio-analysis-mode-btn ${analysisMode === 'timeline' ? 'audio-analysis-mode-btn-active' : ''}`}
                  onClick={() => setAnalysisMode('timeline')}
                  aria-checked={analysisMode === 'timeline'}
                  role="radio"
                >
                  <Clock className="audio-analysis-mode-icon" size={16} />
                  <span className="audio-analysis-mode-label">Timeline</span>
                  <span className="audio-analysis-mode-desc">Full analysis</span>
                </button>
                <button
                  type="button"
                  className={`audio-analysis-mode-btn ${analysisMode === 'genre' ? 'audio-analysis-mode-btn-active' : ''}`}
                  onClick={() => setAnalysisMode('genre')}
                  aria-checked={analysisMode === 'genre'}
                  role="radio"
                >
                  <Disc className="audio-analysis-mode-icon" size={16} />
                  <span className="audio-analysis-mode-label">Genre</span>
                  <span className="audio-analysis-mode-desc">ML classification</span>
                </button>
              </div>

              {/* Timeline Options Sub-component - shown when Timeline mode is selected */}
              {analysisMode === 'timeline' && (
                <div className="audio-analysis-timeline-options">
                  <div className="audio-analysis-timeline-toggle" role="radiogroup" aria-label="Timeline sampling mode">
                    <button
                      type="button"
                      className={`audio-analysis-timeline-toggle-btn ${timelineMode === 'count' ? 'audio-analysis-timeline-toggle-btn-active' : ''}`}
                      onClick={() => setTimelineMode('count')}
                      aria-checked={timelineMode === 'count'}
                      role="radio"
                    >
                      <span className="audio-analysis-timeline-toggle-label">Count</span>
                      <span className="audio-analysis-timeline-toggle-value">{timelineCount} pts</span>
                    </button>
                    <button
                      type="button"
                      className={`audio-analysis-timeline-toggle-btn ${timelineMode === 'interval' ? 'audio-analysis-timeline-toggle-btn-active' : ''}`}
                      onClick={() => setTimelineMode('interval')}
                      aria-checked={timelineMode === 'interval'}
                      role="radio"
                    >
                      <span className="audio-analysis-timeline-toggle-label">Interval</span>
                      <span className="audio-analysis-timeline-toggle-value">{timelineInterval}s</span>
                    </button>
                  </div>

                  {/* Count slider - shown when count mode is selected */}
                  {timelineMode === 'count' && (
                    <div className="audio-analysis-timeline-slider-container">
                      <div className="audio-analysis-timeline-slider-header">
                        <span className="audio-analysis-timeline-slider-label">Data Points</span>
                        <span className="audio-analysis-timeline-slider-value">{timelineCount}</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        step="1"
                        value={timelineCount}
                        onChange={(e) => setTimelineCount(parseInt(e.target.value, 10))}
                        className="audio-analysis-timeline-slider"
                        style={{ '--slider-value': `${((timelineCount - 5) / 95) * 100}%` } as React.CSSProperties}
                        aria-label="Number of data points"
                      />
                      <div className="audio-analysis-timeline-slider-marks">
                        <span className="audio-analysis-timeline-slider-mark">5</span>
                        <span className="audio-analysis-timeline-slider-mark">100</span>
                      </div>
                    </div>
                  )}

                  {/* Interval slider - shown when interval mode is selected */}
                  {timelineMode === 'interval' && (
                    <div className="audio-analysis-timeline-slider-container">
                      <div className="audio-analysis-timeline-slider-header">
                        <span className="audio-analysis-timeline-slider-label">Interval (seconds)</span>
                        <span className="audio-analysis-timeline-slider-value">{timelineInterval}s</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={timelineInterval}
                        onChange={(e) => setTimelineInterval(parseInt(e.target.value, 10))}
                        className="audio-analysis-timeline-slider"
                        style={{ '--slider-value': `${((timelineInterval - 1) / 9) * 100}%` } as React.CSSProperties}
                        aria-label="Sampling interval in seconds"
                      />
                      <div className="audio-analysis-timeline-slider-marks">
                        <span className="audio-analysis-timeline-slider-mark">1s</span>
                        <span className="audio-analysis-timeline-slider-mark">10s</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Genre Options Sub-component - shown when Genre mode is selected */}
              {analysisMode === 'genre' && (
                <div className={`audio-analysis-genre-options ${isGenreAnalyzing || isGenreModelLoading ? 'audio-analysis-genre-options-disabled' : ''}`}>
                  {/* Top N slider */}
                  <div className="audio-analysis-genre-slider-container">
                    <div className="audio-analysis-genre-slider-header">
                      <span className="audio-analysis-genre-slider-label">Top Genres</span>
                      <span className="audio-analysis-genre-slider-value">{genreTopN}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={genreTopN}
                      onChange={(e) => setGenreTopN(parseInt(e.target.value, 10))}
                      className="audio-analysis-genre-slider"
                      style={{ '--slider-value': `${((genreTopN - 1) / 19) * 100}%` } as React.CSSProperties}
                      aria-label="Number of top genres to return"
                      disabled={isGenreAnalyzing || isGenreModelLoading}
                    />
                    <div className="audio-analysis-genre-slider-marks">
                      <span className="audio-analysis-genre-slider-mark">1</span>
                      <span className="audio-analysis-genre-slider-mark">20</span>
                    </div>
                  </div>

                  {/* Model Selection Section */}
                  <div className="audio-analysis-model-section">
                    <div className="audio-analysis-model-header">
                      <span className="audio-analysis-model-title">Models</span>
                      <button
                        type="button"
                        className={`audio-analysis-model-toggle ${showModelSelector ? 'audio-analysis-model-toggle-active' : ''}`}
                        onClick={() => handleToggleModelSelector(!showModelSelector)}
                        disabled={isGenreAnalyzing || isGenreModelLoading}
                      >
                        {showModelSelector ? 'Use Defaults' : 'Change Models'}
                      </button>
                    </div>

                    {/* Default models display */}
                    {!showModelSelector && (
                      <div className="audio-analysis-model-defaults">
                        <div className="audio-analysis-model-default-item">
                          <span className="audio-analysis-model-label">Genre:</span>
                          <span className="audio-analysis-model-value">{GENRE_PRESET_LABELS.discogs400.label}</span>
                          <span className="audio-analysis-model-desc">{GENRE_PRESET_LABELS.discogs400.description}</span>
                        </div>
                        <div className="audio-analysis-model-default-item">
                          <span className="audio-analysis-model-label">Mood:</span>
                          <span className="audio-analysis-model-value">{MOOD_PRESET_LABELS.jamendo.label}</span>
                          <span className="audio-analysis-model-desc">{MOOD_PRESET_LABELS.jamendo.description}</span>
                        </div>
                        <div className="audio-analysis-model-default-item">
                          <span className="audio-analysis-model-label">Danceability:</span>
                          <span className="audio-analysis-model-value">Danceability</span>
                          <span className="audio-analysis-model-desc">(fixed)</span>
                        </div>
                      </div>
                    )}

                    {/* Model selector buttons */}
                    {showModelSelector && (
                      <div className="audio-analysis-model-selectors">
                        {/* Genre model selector */}
                        <div className="audio-analysis-model-selector-group">
                          <span className="audio-analysis-model-selector-label">Genre Model</span>
                          <div className="audio-analysis-model-buttons" role="radiogroup" aria-label="Genre model selection">
                            {Object.entries(GENRE_PRESET_LABELS).map(([key, preset]) => (
                              <button
                                key={key}
                                type="button"
                                className={`audio-analysis-model-btn ${selectedGenreModel === key ? 'audio-analysis-model-btn-active' : ''}`}
                                onClick={() => handleSelectGenreModel(key as GenrePreset)}
                                disabled={isGenreAnalyzing || isGenreModelLoading}
                                role="radio"
                                aria-checked={selectedGenreModel === key}
                              >
                                <span className="audio-analysis-model-btn-name">{preset.label}</span>
                                <span className="audio-analysis-model-btn-desc">{preset.description}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Mood model selector */}
                        <div className="audio-analysis-model-selector-group">
                          <span className="audio-analysis-model-selector-label">Mood Model</span>
                          <div className="audio-analysis-model-buttons" role="radiogroup" aria-label="Mood model selection">
                            {Object.entries(MOOD_PRESET_LABELS).map(([key, preset]) => (
                              <button
                                key={key}
                                type="button"
                                className={`audio-analysis-model-btn ${selectedMoodModel === key ? 'audio-analysis-model-btn-active' : ''}`}
                                onClick={() => handleSelectMoodModel(key as MoodPreset)}
                                disabled={isGenreAnalyzing || isGenreModelLoading}
                                role="radio"
                                aria-checked={selectedMoodModel === key}
                              >
                                <span className="audio-analysis-model-btn-name">{preset.label}</span>
                                <span className="audio-analysis-model-btn-desc">{preset.description}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Danceability - fixed */}
                        <div className="audio-analysis-model-selector-group audio-analysis-model-selector-group-fixed">
                          <span className="audio-analysis-model-selector-label">Danceability</span>
                          <div className="audio-analysis-model-fixed">
                            <span className="audio-analysis-model-fixed-name">Danceability</span>
                            <span className="audio-analysis-model-fixed-desc">(fixed model)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Action Section */}
            <div className="audio-analysis-action-integration">
              <Button
                onClick={analysisMode === 'genre' ? handleAnalyze : (audioProfile ? handleApplyMultipliers : handleAnalyze)}
                disabled={isAnalyzing || isTimelineAnalyzing || isGenreAnalyzing || (analysisMode !== 'genre' && playbackState !== 'playing')}
                isLoading={isAnalyzing || isTimelineAnalyzing || isGenreAnalyzing}
                variant="primary"
                size="lg"
                className="audio-analysis-primary-action-button"
                title={analysisMode !== 'genre' && playbackState !== 'playing' ? 'Start playing audio first to analyze' : ''}
              >
                {isGenreAnalyzing
                  ? `${genreProgress}%`
                  : isAnalyzing || isTimelineAnalyzing
                    ? `${progress}%`
                    : analysisMode === 'genre'
                      ? (musicClassification ? 'Re-Analyze Genre' : 'Analyze Genre')
                      : (audioProfile ? 'Re-Analyze' : 'Analyze Audio')}
              </Button>

              {analysisMode !== 'genre' && playbackState !== 'playing' && !isAnalyzing && !isTimelineAnalyzing && (
                <div className="audio-analysis-playback-warning">
                  Play audio to enable
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Genre Analysis Results - shown when in genre mode with results, during analysis, or on error */}
      {selectedTrack && analysisMode === 'genre' && (musicClassification || isGenreAnalyzing || isGenreModelLoading || genreError) && (
        <div className="audio-analysis-results fade-in">
          {/* Left Column: Genre Classification */}
          <div className="audio-analysis-genre-column">
            <GenreClassificationCard
              profile={musicClassification}
              isAnalyzing={isGenreAnalyzing}
              isModelLoading={isGenreModelLoading}
              progress={genreProgress}
              error={genreError}
              onRetry={retryGenreAnalysis}
              className="audio-analysis-genre-card"
            />
          </div>
          
          {/* Right Column: Mood Classification */}
          <div className="audio-analysis-mood-column">
            <MoodClassificationCard
              profile={musicClassification}
              className="audio-analysis-mood-card"
            />
          </div>
          
          {/* Full Width Bottom: Vibe Metrics + Metadata + Export */}
          <div className="audio-analysis-vibe-column full-width">
            <VibeMetricsCard
              profile={musicClassification}
              trackInfo={{
                title: selectedTrack.title,
                artist: selectedTrack.artist,
                url: selectedTrack.audio_url,
              }}
              threshold={genreThreshold}
              className="audio-analysis-vibe-card"
            />
          </div>

          {/* Raw Classification JSON Dump */}
          {musicClassification && (
            <RawJsonDump
              data={musicClassification}
              title="Raw Classification Profile JSON"
              defaultOpen={false}
              status="healthy"
            />
          )}
        </div>
      )}

      {/* Audio Analysis Results - Only show when NOT in genre mode */}
      {selectedTrack && audioProfile && analysisMode !== 'genre' && (
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

          {/* Energy Metrics - RMS Energy and Dynamic Range */}
          {(audioProfile.rms_energy !== undefined || audioProfile.dynamic_range !== undefined) && (
            <Card variant="elevated" padding="md" className="audio-analysis-card">
              <div className="audio-analysis-card-title">
                <Zap className="audio-analysis-card-title-icon" />
                Energy Metrics
                <span className="audio-analysis-card-subtitle">(Loudness & punch)</span>
              </div>
              <div className="audio-analysis-energy-grid">
                {audioProfile.rms_energy !== undefined && (
                  <div className="audio-analysis-energy-item">
                    <div className="audio-analysis-energy-label">RMS Energy</div>
                    <div className="audio-analysis-energy-value">{audioProfile.rms_energy.toFixed(3)}</div>
                    <div className="audio-analysis-energy-description">Perceived loudness</div>
                  </div>
                )}
                {audioProfile.dynamic_range !== undefined && (
                  <div className="audio-analysis-energy-item">
                    <div className="audio-analysis-energy-label">Dynamic Range</div>
                    <div className="audio-analysis-energy-value">{audioProfile.dynamic_range.toFixed(3)}</div>
                    <div className="audio-analysis-energy-description">Track "punch"</div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Timeline Visualization - Radar Chart + Scrubber (only in timeline mode with data) */}
          {analysisMode === 'timeline' && timelineData.length > 0 && (
            <Card variant="elevated" padding="md" className="audio-analysis-card audio-analysis-card--timeline-viz full-width">
              <div className="audio-analysis-card-title">
                <Activity className="audio-analysis-card-title-icon" />
                Timeline Visualization
                <span className="audio-analysis-card-subtitle">(Interactive frequency analysis)</span>
              </div>

              <div className="audio-analysis-timeline-viz-layout">
                {/* Left: Radar Chart with live metrics */}
                <div className="audio-analysis-radar-section">
                  <RadarChart
                    data={timelineData[selectedTimelineIndex] ? {
                      bass: timelineData[selectedTimelineIndex].bass,
                      mid: timelineData[selectedTimelineIndex].mid,
                      treble: timelineData[selectedTimelineIndex].treble,
                      energy: timelineData[selectedTimelineIndex].amplitude,
                    } : null}
                    size={200}
                    animated={true}
                    animationDuration={300}
                  />
                  {/* Live metric values below radar chart */}
                  <div className="audio-analysis-radar-metrics">
                    {timelineData[selectedTimelineIndex] && (
                      <>
                        <div className="audio-analysis-radar-metric">
                          <span className="audio-analysis-radar-metric-label" style={{ color: 'hsl(221, 83%, 53%)' }}>Bass</span>
                          <span className="audio-analysis-radar-metric-value">{(timelineData[selectedTimelineIndex].bass * 100).toFixed(1)}%</span>
                        </div>
                        <div className="audio-analysis-radar-metric">
                          <span className="audio-analysis-radar-metric-label" style={{ color: 'hsl(142, 76%, 50%)' }}>Mid</span>
                          <span className="audio-analysis-radar-metric-value">{(timelineData[selectedTimelineIndex].mid * 100).toFixed(1)}%</span>
                        </div>
                        <div className="audio-analysis-radar-metric">
                          <span className="audio-analysis-radar-metric-label" style={{ color: 'hsl(24, 95%, 53%)' }}>Treble</span>
                          <span className="audio-analysis-radar-metric-value">{(timelineData[selectedTimelineIndex].treble * 100).toFixed(1)}%</span>
                        </div>
                        <div className="audio-analysis-radar-metric">
                          <span className="audio-analysis-radar-metric-label" style={{ color: 'hsl(280, 75%, 60%)' }}>RMS</span>
                          <span className="audio-analysis-radar-metric-value">{(timelineData[selectedTimelineIndex].rms_energy * 100).toFixed(1)}%</span>
                        </div>
                        <div className="audio-analysis-radar-metric">
                          <span className="audio-analysis-radar-metric-label" style={{ color: 'hsl(45, 93%, 47%)' }}>DR</span>
                          <span className="audio-analysis-radar-metric-value">{(timelineData[selectedTimelineIndex].dynamic_range * 100).toFixed(1)}%</span>
                        </div>
                        {timelineData[selectedTimelineIndex].spectral_centroid !== undefined && (
                          <div className="audio-analysis-radar-metric">
                            <span className="audio-analysis-radar-metric-label" style={{ color: 'hsl(180, 70%, 45%)' }}>Centroid</span>
                            <span className="audio-analysis-radar-metric-value">{Math.round(timelineData[selectedTimelineIndex].spectral_centroid!)} Hz</span>
                          </div>
                        )}
                        {timelineData[selectedTimelineIndex].zero_crossing_rate !== undefined && (
                          <div className="audio-analysis-radar-metric">
                            <span className="audio-analysis-radar-metric-label" style={{ color: 'hsl(330, 70%, 50%)' }}>ZCR</span>
                            <span className="audio-analysis-radar-metric-value">{timelineData[selectedTimelineIndex].zero_crossing_rate!.toFixed(3)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Timeline Scrubber */}
                <div className="audio-analysis-scrubber-section">
                  <TimelineScrubber
                    events={timelineData}
                    selectedIndex={selectedTimelineIndex}
                    onSelectionChange={setSelectedTimelineIndex}
                    currentTime={currentTime}
                    duration={duration}
                    audioSyncEnabled={audioSyncEnabled}
                    onAudioSyncToggle={() => setAudioSyncEnabled(!audioSyncEnabled)}
                    onSeek={seek}
                    contextWindow={2}
                  />
                </div>
              </div>
            </Card>
          )}

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
            data={analysisMode === 'timeline' && timelineData.length > 0
              ? { ...audioProfile, timeline_events: timelineData }
              : audioProfile}
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
