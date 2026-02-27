/**
 * BeatDetectionSettings Component
 *
 * Settings panel for beat detection mode with EQ-style sliders for:
 * - BPM Range (min/max)
 * - Intensity Threshold
 * - Tempo Center
 *
 * Uses the beatDetectionStore for state management.
 *
 * Part of Task 7.2: Includes note about tracks with no clear beat.
 */
import { Info } from 'lucide-react';
import './BeatDetectionSettings.css';
import { useBeatDetectionStore } from '../../store/beatDetectionStore';

// Default values for beat detection options
const DEFAULTS = {
  minBpm: 60,
  maxBpm: 180,
  intensityThreshold: 0.3,
  tempoCenter: 0.5,
};

interface BeatDetectionSettingsProps {
  /** Whether the settings should be disabled (e.g., during analysis) */
  disabled?: boolean;
}

export function BeatDetectionSettings({ disabled = false }: BeatDetectionSettingsProps) {
  const generatorOptions = useBeatDetectionStore((state) => state.generatorOptions);
  const setGeneratorOptions = useBeatDetectionStore((state) => state.actions.setGeneratorOptions);

  // Extract values with fallbacks for potentially undefined properties
  const minBpm = generatorOptions.minBpm ?? DEFAULTS.minBpm;
  const maxBpm = generatorOptions.maxBpm ?? DEFAULTS.maxBpm;
  const intensityThreshold = generatorOptions.intensityThreshold ?? DEFAULTS.intensityThreshold;
  const tempoCenter = generatorOptions.tempoCenter ?? DEFAULTS.tempoCenter;

  // Handle BPM Range changes
  const handleMinBpmChange = (value: number) => {
    // Ensure min doesn't exceed max
    const newMin = Math.min(value, maxBpm - 10);
    setGeneratorOptions({ minBpm: newMin });
  };

  const handleMaxBpmChange = (value: number) => {
    // Ensure max doesn't go below min
    const newMax = Math.max(value, minBpm + 10);
    setGeneratorOptions({ maxBpm: newMax });
  };

  // Handle Intensity Threshold change (0.1 - 1.0)
  const handleIntensityChange = (value: number) => {
    setGeneratorOptions({ intensityThreshold: value });
  };

  // Handle Tempo Center change (0.3 - 0.7 seconds)
  // Slider is inverted: left (0.3) = slow (~200 BPM), right (0.7) = fast (~86 BPM)
  // We invert the value so left = slow (86 BPM), right = fast (200 BPM)
  const handleTempoCenterChange = (value: number) => {
    const invertedValue = 1.0 - value; // Invert: 0.3↔0.7
    setGeneratorOptions({ tempoCenter: invertedValue });
  };

  // Calculate slider percentages for CSS styling
  const minBpmPercent = ((minBpm - 40) / 200) * 100;
  const maxBpmPercent = ((maxBpm - 40) / 200) * 100;
  const intensityPercent = ((intensityThreshold - 0.1) / 0.9) * 100;

  // Convert tempo center to BPM for display (BPM = 60 / seconds)
  const tempoBpm = Math.round(60 / tempoCenter);

  // Invert tempoCenter for slider display (so right = faster)
  const sliderTempoValue = 1.0 - tempoCenter;
  // Use inverted value for slider visual fill
  const tempoCenterPercent = ((sliderTempoValue - 0.3) / 0.4) * 100;

  return (
    <div className="beat-detection-settings">
      {/* BPM Range Section - Dual Sliders */}
      <div className="beat-detection-settings-section">
        <div className="beat-detection-settings-header">
          <span className="beat-detection-settings-label">BPM Range</span>
          <span className="beat-detection-settings-value">
            {minBpm} - {maxBpm} BPM
          </span>
        </div>

        {/* Dual slider for BPM range */}
        <div className="beat-detection-dual-slider">
          {/* Track with range highlight - sliders are siblings, not children */}
          <div className="beat-detection-dual-slider-track">
            {/* Highlight the selected range */}
            <div
              className="beat-detection-dual-slider-range"
              style={{
                left: `${minBpmPercent}%`,
                width: `${maxBpmPercent - minBpmPercent}%`,
              }}
            />
          </div>

          {/* Sliders positioned separately to avoid stacking context issues */}
          <div className="beat-detection-dual-slider-inputs">
            {/* Max BPM slider - rendered first so min slider is on top */}
            <input
              type="range"
              min="40"
              max="240"
              step="5"
              value={maxBpm}
              onChange={(e) => handleMaxBpmChange(parseInt(e.target.value, 10))}
              className="beat-detection-slider beat-detection-slider--max"
              disabled={disabled}
              aria-label="Maximum BPM"
            />

            {/* Min BPM slider - rendered last so it's on top */}
            <input
              type="range"
              min="40"
              max="240"
              step="5"
              value={minBpm}
              onChange={(e) => handleMinBpmChange(parseInt(e.target.value, 10))}
              className="beat-detection-slider beat-detection-slider--min"
              disabled={disabled}
              aria-label="Minimum BPM"
            />
          </div>

          <div className="beat-detection-slider-marks">
            <span className="beat-detection-slider-mark">40</span>
            <span className="beat-detection-slider-mark">120</span>
            <span className="beat-detection-slider-mark">240</span>
          </div>
        </div>
      </div>

      {/* Intensity Threshold Slider */}
      <div className="beat-detection-settings-section">
        <div className="beat-detection-settings-header">
          <span className="beat-detection-settings-label">Intensity Threshold</span>
          <span className="beat-detection-settings-value">
            {intensityThreshold.toFixed(1)}
          </span>
        </div>

        <div className="beat-detection-slider-container">
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={intensityThreshold}
            onChange={(e) => handleIntensityChange(parseFloat(e.target.value))}
            className="beat-detection-slider"
            style={{ '--slider-value': `${intensityPercent}%` } as React.CSSProperties}
            disabled={disabled}
            aria-label="Intensity threshold"
          />
          <div className="beat-detection-slider-marks">
            <span className="beat-detection-slider-mark">Low</span>
            <span className="beat-detection-slider-mark">High</span>
          </div>
        </div>
      </div>

      {/* Tempo Center Slider */}
      <div className="beat-detection-settings-section">
        <div className="beat-detection-settings-header">
          <span className="beat-detection-settings-label">Tempo Center</span>
          <span className="beat-detection-settings-value">
            {tempoBpm} BPM
          </span>
        </div>

        <div className="beat-detection-slider-container">
          <input
            type="range"
            min="0.3"
            max="0.7"
            step="0.02"
            value={sliderTempoValue}
            onChange={(e) => handleTempoCenterChange(parseFloat(e.target.value))}
            className="beat-detection-slider"
            style={{ '--slider-value': `${tempoCenterPercent}%` } as React.CSSProperties}
            disabled={disabled}
            aria-label="Tempo center"
          />
          <div className="beat-detection-slider-marks">
            <span className="beat-detection-slider-mark">~86 BPM</span>
            <span className="beat-detection-slider-mark">~120 BPM</span>
            <span className="beat-detection-slider-mark">~200 BPM</span>
          </div>
        </div>
      </div>

      {/* Note about tracks without clear beat (Task 7.2) */}
      <div className="beat-detection-settings-note">
        <Info className="beat-detection-settings-note-icon" />
        <span className="beat-detection-settings-note-text">
          Beat detection works best with rhythmic music. Ambient, classical, or non-percussive tracks may not produce reliable results.
        </span>
      </div>
    </div>
  );
}
