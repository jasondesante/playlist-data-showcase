/**
 * BeatDetectionSettings Component
 *
 * Settings panel for beat detection mode with EQ-style sliders for:
 * - BPM Range (min/max)
 * - Sensitivity (0.1-10.0) - pre-processing, how aggressively beats are detected
 * - Filter (0.0-1.0) - post-processing, removes weak beats
 * - Tempo Center
 *
 * Uses the beatDetectionStore for state management.
 *
 * Part of Task 7.2: Includes note about tracks with no clear beat.
 */
import { Info, RotateCcw } from 'lucide-react';
import './BeatDetectionSettings.css';
import { useBeatDetectionStore } from '../../store/beatDetectionStore';

// Default values for beat detection options (must match engine defaults)
const DEFAULTS = {
  minBpm: 60,
  maxBpm: 180,
  sensitivity: 1.0,  // Default: 1.0 (range 0.1-10.0)
  filter: 0.0,       // Default: 0.0 (range 0.0-1.0)
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
  const sensitivity = generatorOptions.sensitivity ?? DEFAULTS.sensitivity;
  const filter = generatorOptions.filter ?? DEFAULTS.filter;
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

  // Handle Sensitivity change (0.1 - 10.0)
  const handleSensitivityChange = (value: number) => {
    setGeneratorOptions({ sensitivity: value });
  };

  // Handle Filter change (0.0 - 1.0)
  const handleFilterChange = (value: number) => {
    setGeneratorOptions({ filter: value });
  };

  // Handle Tempo Center change (0.3 - 0.7 seconds)
  // Slider is inverted: left (0.3) = slow (~200 BPM), right (0.7) = fast (~86 BPM)
  // We invert the value so left = slow (86 BPM), right = fast (200 BPM)
  const handleTempoCenterChange = (value: number) => {
    const invertedValue = 1.0 - value; // Invert: 0.3↔0.7
    setGeneratorOptions({ tempoCenter: invertedValue });
  };

  // Check if values differ from defaults (for visual indicators)
  const isSensitivityDefault = sensitivity === DEFAULTS.sensitivity;
  const isFilterDefault = filter === DEFAULTS.filter;

  // Reset handlers - restore individual settings to defaults
  const handleSensitivityReset = () => {
    setGeneratorOptions({ sensitivity: DEFAULTS.sensitivity });
  };

  const handleFilterReset = () => {
    setGeneratorOptions({ filter: DEFAULTS.filter });
  };

  // Calculate slider percentages for CSS styling
  const minBpmPercent = ((minBpm - 40) / 200) * 100;
  const maxBpmPercent = ((maxBpm - 40) / 200) * 100;
  // Sensitivity range: 0.1 to 10.0 (use linear for now, could be logarithmic later)
  const sensitivityPercent = ((sensitivity - 0.1) / 9.9) * 100;
  // Filter range: 0.0 to 1.0
  const filterPercent = (filter / 1.0) * 100;

  // Convert tempo center to BPM for display (BPM = 60 / seconds)
  const tempoBpm = Math.round(60 / tempoCenter);

  // Invert tempoCenter for slider display (so right = faster)
  const sliderTempoValue = 1.0 - tempoCenter;
  // Use inverted value for slider visual fill
  const tempoCenterPercent = ((sliderTempoValue - 0.3) / 0.4) * 100;

  return (
    <div className="beat-detection-settings">
      {/* Sensitivity Slider (0.1 - 10.0) - Primary Control */}
      <div className="beat-detection-settings-section">
        <div className="beat-detection-settings-header">
          <span className="beat-detection-settings-label">Sensitivity</span>
          <div className="beat-detection-settings-header-right">
            <span className={`beat-detection-settings-value ${!isSensitivityDefault ? 'beat-detection-settings-value--modified' : ''}`}>
              {sensitivity.toFixed(1)}
            </span>
            {!isSensitivityDefault && (
              <button
                type="button"
                className="beat-detection-reset-btn"
                onClick={handleSensitivityReset}
                disabled={disabled}
                aria-label="Reset sensitivity to default"
                title="Reset to default (1.0)"
              >
                <RotateCcw className="beat-detection-reset-btn-icon" />
              </button>
            )}
          </div>
        </div>

        <div className="beat-detection-slider-container">
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={sensitivity}
            onChange={(e) => handleSensitivityChange(parseFloat(e.target.value))}
            className="beat-detection-slider"
            style={{ '--slider-value': `${sensitivityPercent}%` } as React.CSSProperties}
            disabled={disabled}
            aria-label="Beat detection sensitivity"
          />
          <div className="beat-detection-slider-marks">
            <span className="beat-detection-slider-mark">0.1</span>
            <span className="beat-detection-slider-mark">1.0</span>
            <span className="beat-detection-slider-mark">10</span>
          </div>
          <div className="beat-detection-slider-description">
            Lower = fewer beats, Higher = more beats
          </div>
        </div>
      </div>

      {/* Filter Slider (0.0 - 1.0) - Primary Control */}
      <div className="beat-detection-settings-section">
        <div className="beat-detection-settings-header">
          <span className="beat-detection-settings-label">Filter</span>
          <div className="beat-detection-settings-header-right">
            <span className={`beat-detection-settings-value ${!isFilterDefault ? 'beat-detection-settings-value--modified' : ''}`}>
              {filter.toFixed(2)}
            </span>
            {!isFilterDefault && (
              <button
                type="button"
                className="beat-detection-reset-btn"
                onClick={handleFilterReset}
                disabled={disabled}
                aria-label="Reset filter to default"
                title="Reset to default (0.0)"
              >
                <RotateCcw className="beat-detection-reset-btn-icon" />
              </button>
            )}
          </div>
        </div>

        <div className="beat-detection-slider-container">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={filter}
            onChange={(e) => handleFilterChange(parseFloat(e.target.value))}
            className="beat-detection-slider"
            style={{ '--slider-value': `${filterPercent}%` } as React.CSSProperties}
            disabled={disabled}
            aria-label="Beat intensity filter"
          />
          <div className="beat-detection-slider-marks">
            <span className="beat-detection-slider-mark">0 (all)</span>
            <span className="beat-detection-slider-mark">0.5</span>
            <span className="beat-detection-slider-mark">1.0</span>
          </div>
          <div className="beat-detection-slider-description">
            Removes weak beats. 0 = keep all, 1 = only strongest
          </div>
        </div>
      </div>

      {/* Advanced Settings - Collapsible Section (Task 4.1) */}
      <details className="beat-detection-advanced">
        <summary className="beat-detection-advanced-summary">
          <span className="beat-detection-advanced-summary-text">Advanced Settings</span>
          <span className="beat-detection-advanced-summary-icon">▶</span>
        </summary>
        <div className="beat-detection-advanced-content">
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
        </div>
      </details>

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
