/**
 * BeatDetectionSettings Component
 *
 * A settings panel for configuring beat detection parameters with EQ-style sliders.
 * Provides real-time control over how the beat detection algorithm analyzes audio.
 *
 * @component
 *
 * @description
 * This component renders sliders for the following beat detection parameters:
 *
 * **Sensitivity** (0.1-10.0, default: 1.0)
 * - Pre-processing parameter controlling beat detection aggressiveness
 * - Uses logarithmic scale for natural slider feel (default at center)
 * - Lower values = fewer beats (only strong beats)
 * - Higher values = more beats (includes subtle beats)
 *
 * **Filter** (0.0-1.0, default: 0.0)
 * - Post-processing parameter that removes weak beats after detection
 * - Linear scale: 0 = keep all, 1 = only strongest
 * - Works independently from sensitivity
 *
 * **BPM Range** (40-240, default: 60-180)
 * - Min/Max dual sliders for expected tempo range
 * - Helps algorithm focus on relevant tempo window
 *
 * **Tempo Center** (~86-200 BPM, default: ~120 BPM)
 * - Bias for tempo detection toward a specific BPM
 * - Useful for tracks with known tempo range
 *
 * @param {BeatDetectionSettingsProps} props - Component props
 * @param {boolean} [props.disabled=false] - Whether the settings should be disabled
 *
 * @returns {JSX.Element} The settings panel with sliders and advanced options
 *
 * @example
 * ```tsx
 * // Basic usage
 * <BeatDetectionSettings />
 *
 * // Disabled during analysis
 * <BeatDetectionSettings disabled={isAnalyzing} />
 * ```
 *
 * @see {@link useBeatDetectionStore} - Zustand store for beat detection state
 * @see {@link BeatMapGenerator} - Engine that uses these parameters
 *
 * @remarks
 * - Component includes reset buttons for non-default values
 * - Advanced settings (BPM Range, Tempo Center) are collapsible
 * - Includes info note about tracks without clear beat patterns
 * - Supports both mouse and touch interaction
 * - Responsive design for mobile, tablet, and desktop viewports
 */
import { Info, RotateCcw, AlertTriangle } from 'lucide-react';
import './BeatDetectionSettings.css';
import { useBeatDetectionStore, useOseSettingsChanged } from '../../store/beatDetectionStore';
import {
    HopSizeMode,
    MelBandsMode,
    GaussianSmoothMode,
    HOP_SIZE_PRESETS,
    MEL_BANDS_PRESETS,
    GAUSSIAN_SMOOTH_PRESETS,
} from '@/types';

/**
 * Default values for beat detection options.
 * These must match the engine defaults (see beatDetectionStore.ts).
 *
 * SENSITIVITY (default: 1.0, range: 0.1-10.0)
 * - Pre-processing parameter that controls beat detection aggressiveness
 * - Lower values = fewer beats detected (only strong beats)
 * - Higher values = more beats detected (includes subtle beats)
 *
 * FILTER (default: 0.0, range: 0.0-1.0)
 * - Post-processing parameter that removes weak beats after detection
 * - 0 = keep all detected beats
 * - 1 = keep only the strongest beats
 */
const DEFAULTS = {
  minBpm: 60,
  maxBpm: 180,
  sensitivity: 1.0,  // Default: 1.0 (range 0.1-10.0)
  filter: 0.0,       // Default: 0.0 (range 0.0-1.0)
  tempoCenter: 0.5,
};

// ============================================
// TASK 5.2: Logarithmic scale for sensitivity
// The sensitivity range (0.1-10.0) is large (100x),
// so we use logarithmic mapping to make the slider feel natural.
// This places the default (1.0) at the center of the slider.
// ============================================
const SENSITIVITY_MIN = 0.1;
const SENSITIVITY_MAX = 10.0;
const SENSITIVITY_LOG_RANGE = Math.log10(SENSITIVITY_MAX / SENSITIVITY_MIN); // log10(100) = 2

/**
 * Convert sensitivity value (0.1-10) to slider position (0-100)
 * Using logarithmic scale: position = log10(sensitivity/0.1) / log10(100) * 100
 */
const sensitivityToSlider = (sensitivity: number): number => {
  const clamped = Math.max(SENSITIVITY_MIN, Math.min(SENSITIVITY_MAX, sensitivity));
  return (Math.log10(clamped / SENSITIVITY_MIN) / SENSITIVITY_LOG_RANGE) * 100;
};

/**
 * Convert slider position (0-100) to sensitivity value (0.1-10)
 * Using inverse logarithmic: sensitivity = 0.1 * 10^(position/100 * 2)
 */
const sliderToSensitivity = (position: number): number => {
  const clampedPosition = Math.max(0, Math.min(100, position));
  return SENSITIVITY_MIN * Math.pow(10, (clampedPosition / 100) * SENSITIVITY_LOG_RANGE);
};

/**
 * Props for the BeatDetectionSettings component.
 */
interface BeatDetectionSettingsProps {
  /**
   * Whether the settings controls should be disabled.
   * When true, all sliders and buttons are non-interactive.
   * Typically used during audio analysis to prevent mid-analysis changes.
   * @default false
   */
  disabled?: boolean;
}

export function BeatDetectionSettings({ disabled = false }: BeatDetectionSettingsProps) {
  const generatorOptions = useBeatDetectionStore((state) => state.generatorOptions);
  const setGeneratorOptions = useBeatDetectionStore((state) => state.actions.setGeneratorOptions);
  const hopSizeConfig = useBeatDetectionStore((state) => state.hopSizeConfig);
  const setHopSizeConfig = useBeatDetectionStore((state) => state.actions.setHopSizeConfig);
  const melBandsConfig = useBeatDetectionStore((state) => state.melBandsConfig);
  const setMelBandsConfig = useBeatDetectionStore((state) => state.actions.setMelBandsConfig);
  const gaussianSmoothConfig = useBeatDetectionStore((state) => state.gaussianSmoothConfig);
  const setGaussianSmoothConfig = useBeatDetectionStore((state) => state.actions.setGaussianSmoothConfig);

  // Check if OSE settings have changed since last beat map generation
  const oseSettingsChanged = useOseSettingsChanged();

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

  /**
   * Handle Sensitivity change (0.1 - 10.0)
   *
   * Converts slider position (0-100) to actual sensitivity value using
   * logarithmic mapping (Task 5.2). This ensures the default (1.0) sits
   * at the center of the slider, making fine adjustments easier.
   *
   * @param sliderPosition - Raw slider value (0-100)
   */
  const handleSensitivityChange = (sliderPosition: number) => {
    const sensitivity = sliderToSensitivity(sliderPosition);
    setGeneratorOptions({ sensitivity });
  };

  /**
   * Handle Filter change (0.0 - 1.0)
   *
   * Direct mapping - slider value is the actual filter value.
   * Higher values remove more beats, keeping only the strongest.
   *
   * @param value - Filter value (0.0-1.0)
   */
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

  /**
   * Check if values differ from defaults.
   * Used to show visual indicators (modified value styling) and reset buttons.
   */
  const isSensitivityDefault = sensitivity === DEFAULTS.sensitivity;
  const isFilterDefault = filter === DEFAULTS.filter;

  /**
   * Reset handlers - restore individual settings to their default values.
   * Each reset button only appears when its corresponding value differs from default.
   */
  const handleSensitivityReset = () => {
    setGeneratorOptions({ sensitivity: DEFAULTS.sensitivity });
  };

  const handleFilterReset = () => {
    setGeneratorOptions({ filter: DEFAULTS.filter });
  };

  // ============================================================
  // TASK 3.1: Hop Size Control
  // ============================================================

  /**
   * Handle Hop Size mode change.
   * Updates the hop size configuration with the selected mode.
   *
   * @param mode - The selected hop size mode
   */
  const handleHopSizeModeChange = (mode: HopSizeMode) => {
    if (mode === 'custom') {
      // For custom mode, preserve existing customValue or use default (4ms)
      setHopSizeConfig({
        mode,
        customValue: hopSizeConfig.customValue ?? 4,
      });
    } else {
      setHopSizeConfig({ mode });
    }
  };

  /**
   * Get the display value for the current hop size configuration.
   * Shows the preset value or custom value in milliseconds.
   */
  const getHopSizeDisplayValue = (): string => {
    if (hopSizeConfig.mode === 'custom') {
      return `${hopSizeConfig.customValue ?? 4}ms`;
    }
    return `${HOP_SIZE_PRESETS[hopSizeConfig.mode].value}ms`;
  };

  /**
   * Check if hop size is at default (standard mode).
   */
  const isHopSizeDefault = hopSizeConfig.mode === 'standard';

  /**
   * Preset modes for iteration (excludes 'custom' which is handled separately).
   */
  const HOP_SIZE_PRESET_MODES: Exclude<HopSizeMode, 'custom'>[] = ['efficient', 'standard', 'hq'];

  // ============================================================
  // TASK 3.3: Mel Bands Control
  // ============================================================

  /**
   * Handle Mel Bands mode change.
   * Updates the mel bands configuration with the selected mode.
   *
   * @param mode - The selected mel bands mode
   */
  const handleMelBandsModeChange = (mode: MelBandsMode) => {
    setMelBandsConfig({ mode });
  };

  /**
   * Get the display value for the current mel bands configuration.
   * Shows the preset value in bands.
   */
  const getMelBandsDisplayValue = (): string => {
    return `${MEL_BANDS_PRESETS[melBandsConfig.mode].value} bands`;
  };

  /**
   * Check if mel bands is at default (standard mode).
   */
  const isMelBandsDefault = melBandsConfig.mode === 'standard';

  /**
   * All mel bands modes for iteration.
   */
  const MEL_BANDS_MODES: MelBandsMode[] = ['standard', 'detailed', 'maximum'];

  // ============================================================
  // TASK 3.4: Gaussian Smooth Control
  // ============================================================

  /**
   * Handle Gaussian Smooth mode change.
   * Updates the gaussian smooth configuration with the selected mode.
   *
   * @param mode - The selected gaussian smooth mode
   */
  const handleGaussianSmoothModeChange = (mode: GaussianSmoothMode) => {
    setGaussianSmoothConfig({ mode });
  };

  /**
   * Get the display value for the current gaussian smooth configuration.
   * Shows the preset value in milliseconds.
   */
  const getGaussianSmoothDisplayValue = (): string => {
    return `${GAUSSIAN_SMOOTH_PRESETS[gaussianSmoothConfig.mode].value}ms`;
  };

  /**
   * Check if gaussian smooth is at default (standard mode).
   */
  const isGaussianSmoothDefault = gaussianSmoothConfig.mode === 'standard';

  /**
   * All gaussian smooth modes for iteration.
   */
  const GAUSSIAN_SMOOTH_MODES: GaussianSmoothMode[] = ['minimal', 'standard', 'smooth'];

  // ============================================================
  // TASK 6.1: Keyboard Navigation for Toggle Buttons
  // ============================================================

  /**
   * All hop size modes including custom for keyboard navigation.
   */
  const ALL_HOP_SIZE_MODES: HopSizeMode[] = ['efficient', 'standard', 'hq', 'custom'];

  /**
   * Handle keyboard navigation for toggle button groups.
   * Implements standard radiogroup behavior:
   * - Arrow Left/Up: Move to previous option
   * - Arrow Right/Down: Move to next option
   * - Home: Move to first option
   * - End: Move to last option
   *
   * @param e - The keyboard event
   * @param modes - Array of mode values in order
   * @param currentMode - The currently selected mode
   * @param onChangeMode - Handler to change the mode
   */
  const createKeyboardNavHandler = <T extends string>(
    modes: T[],
    currentMode: T,
    onChangeMode: (mode: T) => void
  ) => (e: React.KeyboardEvent) => {
    const currentIndex = modes.indexOf(currentMode);
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : modes.length - 1;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        newIndex = currentIndex < modes.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = modes.length - 1;
        break;
      default:
        return;
    }

    // Select the new mode
    onChangeMode(modes[newIndex]);

    // Focus the button for the new mode
    // Use a data attribute to find the button
    const container = e.currentTarget;
    const buttons = container.querySelectorAll('[data-mode-index]');
    const targetButton = buttons[newIndex] as HTMLElement;
    if (targetButton) {
      targetButton.focus();
    }
  };

  /**
   * Get tabIndex for toggle buttons in a radiogroup.
   * Only the active button should be in the tab order (tabIndex=0).
   * All other buttons should have tabIndex=-1.
   */
  const getToggleTabIndex = <T extends string>(mode: T, currentMode: T): number => {
    return mode === currentMode ? 0 : -1;
  };

  // ============================================================
  // TASK 3.2: Custom Hop Size Input
  // ============================================================

  /**
   * Handle custom hop size value change.
   * Validates and clamps the input to the valid range (1-50ms).
   *
   * @param value - The raw input value
   */
  const handleCustomHopSizeChange = (value: string) => {
    // Parse the input value
    const numValue = parseInt(value, 10);

    // If empty or invalid, don't update (keep previous value)
    if (isNaN(numValue)) {
      return;
    }

    // Clamp to valid range (1-50ms)
    const clampedValue = Math.max(1, Math.min(50, numValue));

    // Update the config with the clamped custom value
    setHopSizeConfig({
      mode: 'custom',
      customValue: clampedValue,
    });
  };

  /**
   * Handle blur event on custom input.
   * Ensures the value is valid and clamped when focus leaves the input.
   */
  const handleCustomHopSizeBlur = () => {
    const currentValue = hopSizeConfig.customValue ?? 4;
    // Re-apply clamping on blur to catch any edge cases
    const clampedValue = Math.max(1, Math.min(50, currentValue));
    setHopSizeConfig({
      mode: 'custom',
      customValue: clampedValue,
    });
  };

  // Calculate slider percentages for CSS styling
  const minBpmPercent = ((minBpm - 40) / 200) * 100;
  const maxBpmPercent = ((maxBpm - 40) / 200) * 100;
  // Sensitivity: Use logarithmic scale (Task 5.2) - position directly maps to percentage
  const sensitivitySliderPosition = sensitivityToSlider(sensitivity);
  const sensitivityPercent = sensitivitySliderPosition;
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
      {/* ============================================================
       * SENSITIVITY SLIDER (Task 3.2)
       *
       * What it does: Controls how aggressively the beat detection
       * algorithm identifies potential beats during the initial
       * analysis phase (pre-processing).
       *
       * Range: 0.1 to 10.0 (logarithmic scale)
       * - 0.1 = Very conservative: detects only the most obvious beats
       * - 1.0 = Default: balanced detection for most music
       * - 10.0 = Very aggressive: detects many beats, including subtle ones
       *
       * Effect on output:
       * - Lower values = fewer beats detected, only strong beats
       * - Higher values = more beats detected, includes weaker beats
       *
       * Use with Filter: Sensitivity determines what beats are CANDIDATES,
       * then Filter removes the weakest ones. For best results:
       * - If too few beats: increase sensitivity
       * - If too many weak beats: increase filter (or decrease sensitivity)
       *
       * Note: Uses logarithmic slider mapping (Task 5.2) so the default
       * value (1.0) sits at the center of the slider.
       * ============================================================ */}
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
            min="0"
            max="100"
            step="1"
            value={sensitivitySliderPosition}
            onChange={(e) => handleSensitivityChange(parseFloat(e.target.value))}
            className="beat-detection-slider beat-detection-slider--sensitivity"
            style={{
              '--slider-value': `${sensitivityPercent}%`,
              '--slider-color': sensitivity < 1.0 ? 'var(--cute-green)' : sensitivity > 1.0 ? 'var(--cute-orange)' : 'var(--primary)',
            } as React.CSSProperties}
            disabled={disabled}
            aria-label="Beat detection sensitivity"
          />
          <div className="beat-detection-slider-marks beat-detection-slider-marks--logarithmic">
            <span className="beat-detection-slider-mark">0.1</span>
            <span className="beat-detection-slider-mark">1.0</span>
            <span className="beat-detection-slider-mark">10</span>
          </div>
          <div className="beat-detection-slider-description">
            Lower = fewer beats, Higher = more beats
          </div>
        </div>
      </div>

      {/* ============================================================
       * FILTER SLIDER (Task 3.3)
       *
       * What it does: Removes weak beats AFTER detection by filtering
       * based on beat intensity/confidence (post-processing).
       * This is a grid-alignment filter that prioritizes beats with
       * higher confidence scores.
       *
       * Range: 0.0 to 1.0 (linear scale)
       * - 0.0 = Default: keep all detected beats
       * - 0.5 = Moderate: remove the weakest half of beats
       * - 1.0 = Strict: keep only the strongest beats
       *
       * Effect on output:
       * - Lower values = more beats kept (including weaker ones)
       * - Higher values = fewer beats kept (only the strongest)
       *
       * Relationship to Sensitivity:
       * - Sensitivity controls detection (what COULD be a beat)
       * - Filter controls selection (which beats to KEEP)
       * - They work independently: you can have high sensitivity with
       *   high filter to catch subtle beats but only keep the best ones
       *
       * Migration note: This replaces the old 'intensityThreshold' parameter.
       * Users with cached settings will have their intensityThreshold value
       * automatically migrated to filter.
       * ============================================================ */}
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
            className="beat-detection-slider beat-detection-slider--filter"
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

          {/* ============================================================
           * HOP SIZE CONTROL (Task 3.1)
           *
           * What it does: Controls the analysis precision for beat detection.
           * Hop size determines how frequently the algorithm samples the audio
           * during onset strength envelope computation.
           *
           * Modes:
           * - Efficient (10ms): Fast, reduced precision - good for quick previews
           * - Standard (4ms): Paper spec default - balanced for most use cases
           * - HQ (2ms): Maximum precision - slower but more accurate
           * - Custom (1-50ms): User-defined hop size for specific needs
           *
           * Effect on output:
           * - Smaller hop size = more precise beat detection, longer analysis time
           * - Larger hop size = faster analysis, potentially missing subtle beats
           *
           * Tier: 1 (Primary Control) - Most impactful OSE parameter
           * ============================================================ */}
          <div className="beat-detection-ose-section">
            <div className="beat-detection-settings-section">
              <div className="beat-detection-settings-header">
                <span className="beat-detection-settings-label">Hop Size</span>
                <span className={`beat-detection-settings-value ${!isHopSizeDefault ? 'beat-detection-settings-value--modified' : ''}`}>
                  {getHopSizeDisplayValue()}
                </span>
              </div>
              <div
                className="beat-detection-ose-toggles"
                role="radiogroup"
                aria-label="Hop size mode"
                onKeyDown={createKeyboardNavHandler(ALL_HOP_SIZE_MODES, hopSizeConfig.mode, handleHopSizeModeChange)}
              >
                {HOP_SIZE_PRESET_MODES.map((mode, index) => (
                  <button
                    key={mode}
                    type="button"
                    data-mode-index={index}
                    className={`beat-detection-ose-toggle ${hopSizeConfig.mode === mode ? 'beat-detection-ose-toggle--active' : ''}`}
                    onClick={() => handleHopSizeModeChange(mode)}
                    disabled={disabled}
                    tabIndex={getToggleTabIndex(mode, hopSizeConfig.mode)}
                    aria-checked={hopSizeConfig.mode === mode}
                    role="radio"
                    aria-label={`${HOP_SIZE_PRESETS[mode].label}: ${HOP_SIZE_PRESETS[mode].value}ms - ${HOP_SIZE_PRESETS[mode].description}`}
                  >
                    <span className="beat-detection-ose-toggle-label">{HOP_SIZE_PRESETS[mode].label}</span>
                    <span className="beat-detection-ose-toggle-value">{HOP_SIZE_PRESETS[mode].value}ms</span>
                  </button>
                ))}
                {/* Custom mode button */}
                <button
                  type="button"
                  data-mode-index={3}
                  className={`beat-detection-ose-toggle ${hopSizeConfig.mode === 'custom' ? 'beat-detection-ose-toggle--active' : ''}`}
                  onClick={() => handleHopSizeModeChange('custom')}
                  disabled={disabled}
                  tabIndex={getToggleTabIndex('custom' as HopSizeMode, hopSizeConfig.mode)}
                  aria-checked={hopSizeConfig.mode === 'custom'}
                  role="radio"
                  aria-label={`Custom: ${hopSizeConfig.customValue ?? 4}ms - User-defined hop size`}
                >
                  <span className="beat-detection-ose-toggle-label">Custom</span>
                  <span className="beat-detection-ose-toggle-value">{hopSizeConfig.customValue ?? 4}ms</span>
                </button>
              </div>

              {/* ============================================================
               * TASK 3.2: Custom Hop Size Input
               *
               * Shows a number input field when "Custom" mode is selected.
               * Validates input: min 1, max 50, step 1 (integers only).
               * Displays value in ms with live update.
               * ============================================================ */}
              {hopSizeConfig.mode === 'custom' && (
                <div className="beat-detection-ose-custom-input-container">
                  <label
                    htmlFor="custom-hop-size-input"
                    className="beat-detection-ose-custom-input-label"
                  >
                    Custom value (1-50ms)
                  </label>
                  <div className="beat-detection-ose-custom-input-wrapper">
                    <input
                      id="custom-hop-size-input"
                      type="number"
                      min="1"
                      max="50"
                      step="1"
                      value={hopSizeConfig.customValue ?? 4}
                      onChange={(e) => handleCustomHopSizeChange(e.target.value)}
                      onBlur={handleCustomHopSizeBlur}
                      disabled={disabled}
                      className="beat-detection-ose-custom-input"
                      aria-label="Custom hop size in milliseconds"
                      aria-describedby="custom-hop-size-hint"
                    />
                    <span className="beat-detection-ose-custom-input-unit">ms</span>
                  </div>
                  <span id="custom-hop-size-hint" className="beat-detection-ose-custom-input-hint">
                    Lower = more precise, Higher = faster
                  </span>
                </div>
              )}
            </div>

            {/* ============================================================
             * MEL BANDS CONTROL (Task 3.3)
             *
             * What it does: Controls the frequency resolution for beat detection.
             * Mel bands determine how the audio spectrum is divided for analysis.
             *
             * Modes:
             * - Standard (40 bands): Default - good for most music
             * - Detailed (64 bands): More frequency detail, better for complex mixes
             * - Maximum (80 bands): Maximum frequency resolution, slower processing
             *
             * Effect on output:
             * - More bands = finer frequency resolution, can detect subtle rhythmic elements
             * - Fewer bands = faster processing, may miss some frequency-specific beats
             *
             * Tier: 2 (Advanced Control) - For fine-tuning detection quality
             * ============================================================ */}
            <div className="beat-detection-settings-section">
              <div className="beat-detection-settings-header">
                <span className="beat-detection-settings-label">Mel Bands</span>
                <span className={`beat-detection-settings-value ${!isMelBandsDefault ? 'beat-detection-settings-value--modified' : ''}`}>
                  {getMelBandsDisplayValue()}
                </span>
              </div>
              <div
                className="beat-detection-ose-toggles"
                role="radiogroup"
                aria-label="Mel bands mode"
                onKeyDown={createKeyboardNavHandler(MEL_BANDS_MODES, melBandsConfig.mode, handleMelBandsModeChange)}
              >
                {MEL_BANDS_MODES.map((mode, index) => (
                  <button
                    key={mode}
                    type="button"
                    data-mode-index={index}
                    className={`beat-detection-ose-toggle ${melBandsConfig.mode === mode ? 'beat-detection-ose-toggle--active' : ''}`}
                    onClick={() => handleMelBandsModeChange(mode)}
                    disabled={disabled}
                    tabIndex={getToggleTabIndex(mode, melBandsConfig.mode)}
                    aria-checked={melBandsConfig.mode === mode}
                    role="radio"
                    aria-label={`${MEL_BANDS_PRESETS[mode].label}: ${MEL_BANDS_PRESETS[mode].value} bands - ${MEL_BANDS_PRESETS[mode].description}`}
                  >
                    <span className="beat-detection-ose-toggle-label">{MEL_BANDS_PRESETS[mode].label}</span>
                    <span className="beat-detection-ose-toggle-value">{MEL_BANDS_PRESETS[mode].value}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ============================================================
             * GAUSSIAN SMOOTH CONTROL (Task 3.4)
             *
             * What it does: Controls the peak clarity for beat detection.
             * Gaussian smoothing determines how much temporal smoothing is applied
             * to the onset strength envelope.
             *
             * Modes:
             * - Minimal (10ms): Fast transients - preserves sharp rhythmic details
             * - Standard (20ms): Balanced - good for most music (default)
             * - Smooth (40ms): Cleaner peaks - better for noisy or complex audio
             *
             * Effect on output:
             * - Less smoothing = sharper peaks, may detect more false positives
             * - More smoothing = cleaner peaks, may miss very fast transients
             *
             * Tier: 2 (Advanced Control) - For fine-tuning detection quality
             * ============================================================ */}
            <div className="beat-detection-settings-section">
              <div className="beat-detection-settings-header">
                <span className="beat-detection-settings-label">Smoothing</span>
                <span className={`beat-detection-settings-value ${!isGaussianSmoothDefault ? 'beat-detection-settings-value--modified' : ''}`}>
                  {getGaussianSmoothDisplayValue()}
                </span>
              </div>
              <div
                className="beat-detection-ose-toggles"
                role="radiogroup"
                aria-label="Gaussian smooth mode"
                onKeyDown={createKeyboardNavHandler(GAUSSIAN_SMOOTH_MODES, gaussianSmoothConfig.mode, handleGaussianSmoothModeChange)}
              >
                {GAUSSIAN_SMOOTH_MODES.map((mode, index) => (
                  <button
                    key={mode}
                    type="button"
                    data-mode-index={index}
                    className={`beat-detection-ose-toggle ${gaussianSmoothConfig.mode === mode ? 'beat-detection-ose-toggle--active' : ''}`}
                    onClick={() => handleGaussianSmoothModeChange(mode)}
                    disabled={disabled}
                    tabIndex={getToggleTabIndex(mode, gaussianSmoothConfig.mode)}
                    aria-checked={gaussianSmoothConfig.mode === mode}
                    role="radio"
                    aria-label={`${GAUSSIAN_SMOOTH_PRESETS[mode].label}: ${GAUSSIAN_SMOOTH_PRESETS[mode].value}ms - ${GAUSSIAN_SMOOTH_PRESETS[mode].description}`}
                  >
                    <span className="beat-detection-ose-toggle-label">{GAUSSIAN_SMOOTH_PRESETS[mode].label}</span>
                    <span className="beat-detection-ose-toggle-value">{GAUSSIAN_SMOOTH_PRESETS[mode].value}ms</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ============================================================
             * TASK 3.5: Re-Analyze Needed Indicator
             *
             * Shows when OSE settings have changed since the current beat map
             * was generated. Indicates to the user that they need to re-analyze
             * to apply the new settings.
             * ============================================================ */}
            {oseSettingsChanged && (
              <div className="beat-detection-reanalyze-indicator" role="status" aria-live="polite">
                <AlertTriangle className="beat-detection-reanalyze-indicator-icon" />
                <span className="beat-detection-reanalyze-indicator-text">
                  Settings changed - re-analyze to apply
                </span>
              </div>
            )}
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
