import React, { useState, useMemo } from 'react';
import { useXPCalculator, type XPBreakdown } from '../../hooks/useXPCalculator';
import { useSensorStore } from '../../store/sensorStore';
import { useCharacterStore } from '../../store/characterStore';
import { useCharacterUpdater } from '../../hooks/useCharacterUpdater';
import { StatusIndicator } from '../ui/StatusIndicator';
import { Card } from '../ui/Card';
import RawJsonDump from '../ui/RawJsonDump';
import { LevelUpDetailModal } from '../LevelUpDetailModal';
import { showToast } from '../ui/Toast';
import { User, ChevronDown, Settings, Activity, Cloud, Gamepad2, Gauge } from 'lucide-react';
import type { LevelUpDetail } from 'playlist-data-engine';
import {
    useProgressionConfig,
    useProgressionConfigActions,
} from '../../store/progressionConfigStore';
import { DEFAULT_PROGRESSION_CONFIG_SETTINGS, type ActivityBonuses } from '@/types';
import './XPCalculatorTab.css';

/**
 * Tab type for XP Calculator
 */
type XPCalculatorTabType = 'calculator' | 'results' | 'config';

/**
 * Pie chart data for XP source visualization
 */
interface XPPieSlice {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

/**
 * Manual override values for testing
 */
interface ManualOverrides {
  baseXP?: number;
  environmentalMultiplier?: number;
  gamingMultiplier?: number;
}

/**
 * Props for ConfigSlider component (Task 3.3)
 */
interface ConfigSliderProps {
  label: string;
  description: string;
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  isAdditive?: boolean;
  isModified?: boolean;
  appSpecific?: boolean;
  /** Optional marks to display below slider. If true, auto-generates marks for min/mid/max. */
  marks?: boolean | { value: number; label: string }[];
}

/**
 * ConfigSlider component for progression config settings (Task 3.3)
 * Renders a slider with label, value display, and default indicator.
 *
 * IMPORTANT: This component is defined outside XPCalculatorTab and memoized
 * to prevent re-creation on every parent render, which would break drag interactions.
 */
const ConfigSlider = React.memo(function ConfigSlider({
  label,
  description,
  value,
  defaultValue,
  min,
  max,
  step,
  onChange,
  formatValue,
  isAdditive = false,
  isModified = false,
  appSpecific = false,
  marks,
}: ConfigSliderProps) {
  const displayValue = formatValue ? formatValue(value) : (isAdditive ? `+${value.toFixed(2)}` : `${value.toFixed(2)}x`);
  const defaultDisplay = formatValue ? formatValue(defaultValue) : (isAdditive ? `+${defaultValue}` : `${defaultValue}`);

  // Compute mark positions for linear scale
  const sliderMarks = useMemo(() => {
    if (!marks) return null;

    // If marks is true, auto-generate min/mid/max marks
    if (marks === true) {
      const midValue = (min + max) / 2;
      const formatMark = (v: number) => formatValue ? formatValue(v) : (isAdditive ? `+${v.toFixed(2)}` : `${v.toFixed(1)}x`);
      return [
        { value: min, label: formatMark(min) },
        { value: midValue, label: formatMark(midValue) },
        { value: max, label: formatMark(max) },
      ];
    }

    // Otherwise use provided marks array
    return marks;
  }, [marks, min, max, formatValue, isAdditive]);

  // Calculate position percentage for a mark value
  const getMarkPosition = (markValue: number): number => {
    return ((markValue - min) / (max - min)) * 100;
  };

  return (
    <div className={`xp-config-row ${isModified ? 'xp-config-row-modified' : ''}`}>
      <div className="xp-config-label-group">
        <span className="xp-config-label">
          {label}
          {appSpecific && <span className="xp-config-app-specific" title="App-specific - not in engine">🏔️</span>}
        </span>
        <span className="xp-config-description">{description}</span>
      </div>
      <div className="xp-config-control">
        <div className="xp-config-slider-wrapper">
          <div className="xp-config-slider-container">
            <input
              type="range"
              className="xp-config-slider"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              aria-label={label}
            />
            {sliderMarks && (
              <div className="xp-config-slider-marks">
                {sliderMarks.map((mark) => (
                  <span
                    key={mark.value}
                    className="xp-config-slider-mark"
                    style={{ left: `${getMarkPosition(mark.value)}%` }}
                  >
                    {mark.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className={`xp-config-value-display ${isModified ? 'xp-config-value-modified' : ''}`}>
            {displayValue}
          </span>
        </div>
        <span className="xp-config-default">
          {isModified ? '(default: ' : '('}
          {defaultDisplay}
          {isModified ? ')' : ')'}
        </span>
      </div>
    </div>
  );
});

/**
 * XPCalculatorTab - XP Calculator Tab Component
 *
 * Demonstrates the XPCalculator from playlist-data-engine.
 * Allows users to calculate XP earned based on listening duration.
 *
 * ## Tabs
 *
 * 1. **Calculator Tab**: Main interface for calculating XP
 *    - Duration input (in seconds)
 *    - Environmental and gaming context display
 *    - Manual override mode for testing
 *    - Real-time estimated XP preview
 *
 * 2. **Results Tab**: Detailed XP breakdown after calculation
 *    - Total XP with multiplier breakdown
 *    - Environmental and gaming bonus details
 *    - Animated donut chart visualization
 *    - Raw JSON dump for debugging
 *
 * 3. **Config Tab**: Progression configuration panel
 *    - Customize XP multiplier values
 *    - Changes persist to LocalStorage
 *    - Syncs with engine via mergeProgressionConfig()
 *    - Reset to defaults button
 *
 * ## Progression Config vs Manual Mode
 *
 * - **Progression Config** (Config tab): Changes default multipliers for ALL calculations
 * - **Manual Mode** (Calculator tab): One-time override for a SINGLE calculation
 *
 * Features:
 * - Duration input (in seconds)
 * - XP calculation button
 * - Display of total XP earned
 * - Environmental context integration
 * - Gaming context integration
 * - Detailed bonus breakdown table (Task 4.5.3)
 * - Manual override mode for testing (Task 4.5.5)
 * - Animated donut chart for XP breakdown
 * - Celebration animation when leveling up
 * - Progression config panel (Phase 3)
 */
export function XPCalculatorTab() {
  const { calculateXP } = useXPCalculator();
  const { environmentalContext, gamingContext } = useSensorStore();
  const { getActiveCharacter, characters, setActiveCharacter } = useCharacterStore();
  const { addXPFromSource } = useCharacterUpdater();

  // Progression config store - for reading and modifying XP multiplier values
  const config = useProgressionConfig();
  const { updateProgressionConfig, updateActivityBonus, resetProgressionConfig, isActivityBonusModified } = useProgressionConfigActions();

  const [duration, setDuration] = useState(180);
  const [result, setResult] = useState<XPBreakdown | null>(null);
  const [isMastered, setIsMastered] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpDetails, setLevelUpDetails] = useState<LevelUpDetail[]>([]);

  // Three-tab system state
  const [activeTab, setActiveTab] = useState<XPCalculatorTabType>('calculator');

  // Manual mode state (Task 4.5.5)
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualOverrides, setManualOverrides] = useState<ManualOverrides>({});

  // Character selector state
  const activeCharacter = getActiveCharacter();

  // Handle character selection change
  const handleCharacterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSeed = e.target.value;
    setActiveCharacter(selectedSeed);
  };

  // Calculate XP to next level for the selected character
  const getXPToNextLevel = (): number => {
    if (!activeCharacter) return 0;
    const nextLevel = activeCharacter.xp.next_level;
    const currentXP = activeCharacter.xp.current;
    return Math.max(0, nextLevel - currentXP);
  };

  // Get character avatar emoji based on class
  const getCharacterAvatar = (charClass: string): string => {
    const classEmojis: Record<string, string> = {
      'Fighter': '⚔️',
      'Wizard': '🧙',
      'Rogue': '🗡️',
      'Cleric': '✨',
      'Ranger': '🏹',
      'Barbarian': '🪓',
      'Bard': '🎸',
      'Druid': '🌿',
      'Monk': '👊',
      'Paladin': '🛡️',
      'Sorcerer': '🔮',
      'Warlock': '👁️',
    };
    return classEmojis[charClass] || '👤';
  };

  // Estimated XP calculation - updates in real-time as inputs change (Task 3.3.1)
  const estimatedXP = useMemo<XPBreakdown | null>(() => {
    return calculateXP(
      duration,
      isManualMode ? undefined : environmentalContext || undefined,
      isManualMode ? undefined : gamingContext || undefined,
      isMastered,
      isManualMode ? manualOverrides : undefined
    );
  }, [duration, environmentalContext, gamingContext, isMastered, isManualMode, manualOverrides, calculateXP]);

  const handleCalculate = async () => {
    const xpResult = calculateXP(
      duration,
      isManualMode ? undefined : environmentalContext || undefined,
      isManualMode ? undefined : gamingContext || undefined,
      isMastered,
      isManualMode ? manualOverrides : undefined
    );
    setResult(xpResult);

    // Trigger celebration if this is a new result
    if (xpResult && xpResult.totalXP > 0) {
      setIsCelebrating(true);
      setTimeout(() => setIsCelebrating(false), 3000);
    }

    // Auto-switch to results tab after calculation
    setActiveTab('results');

    // If a character is selected, immediately apply the XP
    if (xpResult && activeCharacter && !isApplying) {
      setIsApplying(true);
      try {
        const addResult = addXPFromSource(activeCharacter, xpResult.totalXP, 'xp_calculator');

        if (addResult.leveledUp) {
          // Show level-up modal with details
          if (addResult.levelUpDetails && addResult.levelUpDetails.length > 0) {
            setLevelUpDetails(addResult.levelUpDetails);
            setShowLevelUpModal(true);
          }
          // Trigger celebration
          setIsCelebrating(true);
          setTimeout(() => setIsCelebrating(false), 3000);
        }

        // Show success toast
        showToast(`⭐ Applied ${xpResult.totalXP.toLocaleString()} XP to ${activeCharacter.name}`, 'success');
        console.log(`Applied ${xpResult.totalXP} XP from calculator to ${activeCharacter.name}`);
      } finally {
        setIsApplying(false);
      }
    } else if (xpResult && !activeCharacter) {
      // Show warning toast if no character selected
      showToast(`⚠️ No character selected - XP calculated but not applied`, 'warning');
    }
  };

  // Handler for closing level-up modal
  const handleCloseLevelUpModal = () => {
    setShowLevelUpModal(false);
    setLevelUpDetails([]);
  };

  const handleManualOverrideChange = (field: keyof ManualOverrides, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setManualOverrides(prev => ({ ...prev, [field]: numValue }));
  };

  // Handler for xp_per_second changes
  const handleXpPerSecondChange = (value: number) => {
    updateProgressionConfig({ xp_per_second: value });
  };

  // Handler for activity bonus changes
  const handleActivityBonusChange = (key: keyof ActivityBonuses) => (value: number) => {
    updateActivityBonus(key, value);
  };

  // Handler for reset to defaults
  const handleResetConfig = () => {
    resetProgressionConfig();
    showToast('Progression config reset to defaults', 'success');
  };

  /**
   * Calculate pie chart data from XP breakdown
   * Shows the percentage of XP from each source
   */
  const pieData = useMemo<XPPieSlice[] | null>(() => {
    if (!result) return null;

    const slices: XPPieSlice[] = [];
    const total = result.totalXP;

    // Base XP (gray)
    slices.push({
      label: 'Base XP',
      value: result.baseXP,
      color: '#9ca3af', // gray-400
      percentage: (result.baseXP / total) * 100
    });

    // Environmental Bonus (green)
    if (result.environmentalBonusXP > 0) {
      slices.push({
        label: 'Environmental',
        value: result.environmentalBonusXP,
        color: 'hsl(174 65% 55%)', // cute-teal
        percentage: (result.environmentalBonusXP / total) * 100
      });
    }

    // Gaming Bonus (blue)
    if (result.gamingBonusXP > 0) {
      slices.push({
        label: 'Gaming',
        value: result.gamingBonusXP,
        color: 'hsl(217.2 91.2% 59.8%)', // primary
        percentage: (result.gamingBonusXP / total) * 100
      });
    }

    // Mastery Bonus (purple)
    if (result.masteryBonusXP > 0) {
      slices.push({
        label: 'Mastery',
        value: result.masteryBonusXP,
        color: 'hsl(268 75% 60%)', // cute-purple
        percentage: (result.masteryBonusXP / total) * 100
      });
    }

    return slices;
  }, [result]);

  /**
   * Generate CSS conic-gradient for pie chart
   */
  const pieChartGradient = useMemo(() => {
    if (!pieData || pieData.length === 0) return '';

    let gradient = '';
    let currentPercentage = 0;

    pieData.forEach((slice, index) => {
      const endPercentage = currentPercentage + slice.percentage;
      if (index === pieData.length - 1) {
        // Last slice extends to 100%
        gradient += `${slice.color} ${currentPercentage}% 100%`;
      } else {
        gradient += `${slice.color} ${currentPercentage}% ${endPercentage}%, `;
      }
      currentPercentage = endPercentage;
    });

    return `conic-gradient(${gradient})`;
  }, [pieData]);

  return (
    <>
      {/* Confetti celebration */}
      {isCelebrating && (
        <div className="xp-confetti-container">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="xp-confetti" />
          ))}
        </div>
      )}

      <div className="xp-calculator-container">
        {/* Header */}
        <div className="xp-calculator-header">
          <div className="xp-calculator-header-icon">⭐</div>
          <div className="xp-calculator-header-content">
            <h2>XP Calculator</h2>
            <div className="xp-calculator-header-subtitle">
              Calculate experience points from listening sessions
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="xp-calculator-tabs">
          <button
            className={`xp-calculator-tab ${activeTab === 'calculator' ? 'xp-calculator-tab-active' : ''}`}
            onClick={() => setActiveTab('calculator')}
            aria-current={activeTab === 'calculator' ? 'true' : undefined}
          >
            <span className="xp-calculator-tab-label">Calculator</span>
          </button>
          <button
            className={`xp-calculator-tab ${activeTab === 'results' ? 'xp-calculator-tab-active' : ''}`}
            onClick={() => setActiveTab('results')}
            aria-current={activeTab === 'results' ? 'true' : undefined}
            disabled={!result}
          >
            <span className="xp-calculator-tab-label">Results</span>
            {result && <span className="xp-calculator-tab-indicator" />}
          </button>
          <button
            className={`xp-calculator-tab ${activeTab === 'config' ? 'xp-calculator-tab-active' : ''}`}
            onClick={() => setActiveTab('config')}
            aria-current={activeTab === 'config' ? 'true' : undefined}
          >
            <span className="xp-calculator-tab-label">Config</span>
          </button>
        </div>

        {/* Calculator Tab Content */}
        {activeTab === 'calculator' && (
          <>
            {/* Character Selector Card */}
        {characters.length > 0 && (
          <Card variant="default" padding="md" className="xp-calculator-character-card">
            {activeCharacter ? (
              <div className="xp-character-display">
                <div className="xp-character-info">
                  <div className="xp-character-avatar">
                    <span className="xp-avatar-emoji">{getCharacterAvatar(activeCharacter.class)}</span>
                    <div className="xp-avatar-badge">Lv {activeCharacter.level}</div>
                  </div>
                  <div className="xp-character-details">
                    <h3 className="xp-character-name">{activeCharacter.name}</h3>
                    <div className="xp-character-class">{activeCharacter.race} {activeCharacter.class}</div>
                  </div>
                </div>
                <div className="xp-character-stats">
                  <div className="xp-character-stat">
                    <span className="xp-stat-label">Current XP</span>
                    <span className="xp-stat-value">{activeCharacter.xp.current.toLocaleString()}</span>
                  </div>
                  <div className="xp-character-stat">
                    <span className="xp-stat-label">XP to Next Level</span>
                    <span className="xp-stat-value xp-stat-highlight">{getXPToNextLevel().toLocaleString()}</span>
                  </div>
                </div>
                {characters.length > 1 && (
                  <div className="xp-character-selector">
                    <label htmlFor="xp-character-select" className="xp-selector-label">
                      <User size={14} />
                      Change Character
                    </label>
                    <div className="xp-select-wrapper">
                      <select
                        id="xp-character-select"
                        className="xp-character-select"
                        onChange={handleCharacterChange}
                        value={activeCharacter.seed}
                      >
                        {characters.map((char) => (
                          <option key={char.seed} value={char.seed}>
                            {char.name} - Lv {char.level} {char.race} {char.class}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="xp-select-icon" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="xp-character-empty">
                <User size={32} className="xp-empty-icon" />
                <h3 className="xp-empty-title">No Character Selected</h3>
                <div className="xp-empty-description">
                  Select a character to apply calculated XP
                </div>
                {characters.length > 0 && (
                  <div className="xp-character-selector">
                    <label htmlFor="xp-character-select-empty" className="xp-selector-label">
                      Choose a character:
                    </label>
                    <div className="xp-select-wrapper">
                      <select
                        id="xp-character-select-empty"
                        className="xp-character-select"
                        onChange={handleCharacterChange}
                        value=""
                      >
                        <option value="" disabled>
                          Select a character...
                        </option>
                        {characters.map((char) => (
                          <option key={char.seed} value={char.seed}>
                            {char.name} - Lv {char.level} {char.race} {char.class}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="xp-select-icon" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Combined Duration & XP Calculator Card */}
        <Card variant="default" padding="md" className="xp-calculator-main-card">
          <div className="xp-calculator-main-grid">
            {/* Left: Duration Input Section */}
            <div className="xp-duration-section">
              <div className="xp-duration-header">
                <h3 className="xp-duration-title">Session Duration</h3>
                <span className="xp-duration-readable">
                  {Math.floor(duration / 60)}m {duration % 60}s
                </span>
              </div>

              <div className="xp-duration-input-wrapper">
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min="0"
                  max="3600"
                  className="xp-duration-number-input"
                  aria-label="Duration in seconds"
                />
                <span className="xp-duration-unit">sec</span>
              </div>

              {/* Quick Duration Presets */}
              <div className="xp-duration-presets">
                <button
                  className={`xp-preset-btn ${duration === 60 ? 'xp-preset-active' : ''}`}
                  onClick={() => setDuration(60)}
                  aria-label="1 minute"
                >
                  1m
                </button>
                <button
                  className={`xp-preset-btn ${duration === 180 ? 'xp-preset-active' : ''}`}
                  onClick={() => setDuration(180)}
                  aria-label="3 minutes"
                >
                  3m
                </button>
                <button
                  className={`xp-preset-btn ${duration === 300 ? 'xp-preset-active' : ''}`}
                  onClick={() => setDuration(300)}
                  aria-label="5 minutes"
                >
                  5m
                </button>
                <button
                  className={`xp-preset-btn ${duration === 600 ? 'xp-preset-active' : ''}`}
                  onClick={() => setDuration(600)}
                  aria-label="10 minutes"
                >
                  10m
                </button>
                <button
                  className={`xp-preset-btn ${duration === 900 ? 'xp-preset-active' : ''}`}
                  onClick={() => setDuration(900)}
                  aria-label="15 minutes"
                >
                  15m
                </button>
                <button
                  className={`xp-preset-btn ${duration === 1800 ? 'xp-preset-active' : ''}`}
                  onClick={() => setDuration(1800)}
                  aria-label="30 minutes"
                >
                  30m
                </button>
              </div>

              {/* Active Bonuses Pills */}
              <div className="xp-active-bonuses">
                {estimatedXP && estimatedXP.totalMultiplier > 1 && (
                  <span className="xp-bonus-pill xp-bonus-total">
                    {estimatedXP.totalMultiplier.toFixed(2)}x total
                  </span>
                )}
                {isMastered && (
                  <span className="xp-bonus-pill xp-bonus-mastery">
                    +50 Mastery
                  </span>
                )}
                {environmentalContext && !isManualMode && (
                  <span className="xp-bonus-pill xp-bonus-environmental">
                    Env Active
                  </span>
                )}
                {gamingContext?.isActivelyGaming && !isManualMode && (
                  <span className="xp-bonus-pill xp-bonus-gaming">
                    Gaming
                  </span>
                )}
                {isManualMode && (
                  <span className="xp-bonus-pill xp-bonus-manual">
                    Manual
                  </span>
                )}
              </div>
            </div>

            {/* Right: XP Estimate Display */}
            <div className="xp-estimate-section">
              <div className="xp-estimate-hero">
                <span className="xp-estimate-hero-value">
                  {estimatedXP ? estimatedXP.totalXP.toLocaleString() : '0'}
                </span>
                <span className="xp-estimate-hero-label">XP</span>
              </div>

              {estimatedXP && (
                <div className="xp-estimate-mini-breakdown">
                  <div className="xp-mini-row">
                    <span className="xp-mini-label">Base</span>
                    <span className="xp-mini-value">{estimatedXP.baseXP}</span>
                  </div>
                  {estimatedXP.environmentalBonusXP > 0 && (
                    <div className="xp-mini-row xp-mini-environmental">
                      <span className="xp-mini-label">Env</span>
                      <span className="xp-mini-value">+{estimatedXP.environmentalBonusXP}</span>
                    </div>
                  )}
                  {estimatedXP.gamingBonusXP > 0 && (
                    <div className="xp-mini-row xp-mini-gaming">
                      <span className="xp-mini-label">Game</span>
                      <span className="xp-mini-value">+{estimatedXP.gamingBonusXP}</span>
                    </div>
                  )}
                  {estimatedXP.masteryBonusXP > 0 && (
                    <div className="xp-mini-row xp-mini-mastery">
                      <span className="xp-mini-label">Mastery</span>
                      <span className="xp-mini-value">+{estimatedXP.masteryBonusXP}</span>
                    </div>
                  )}
                </div>
              )}

              {estimatedXP && estimatedXP.totalMultiplier >= 3.0 && (
                <div className="xp-cap-indicator">
                  Capped at 3.0x
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Calculate & Apply Button */}
        <div className="xp-calculate-section">
          {activeCharacter ? (
            <>
              <button
                onClick={handleCalculate}
                className="xp-calculate-button"
                disabled={isApplying}
              >
                {isApplying ? 'Calculating & Applying...' : 'Calculate & Apply XP'}
              </button>
              <div className="xp-calculate-hint">
                XP will be immediately applied to <strong>{activeCharacter.name}</strong> (Level {activeCharacter.level})
              </div>
            </>
          ) : (
            <>
              <button
                onClick={handleCalculate}
                className="xp-calculate-button"
              >
                Calculate XP
              </button>
              <div className="xp-calculate-hint xp-calculate-hint-warning">
                ⚠️ No character selected - XP will be calculated but not applied
              </div>
            </>
          )}
        </div>

        {/* Context & Settings Section - Secondary Info */}
        <div className="xp-calculator-context-grid">
          {/* Mastery Toggle Card */}
          <Card variant="default" padding="md">
            <div className="xp-toggle-header">
              <div className="xp-toggle-content">
                <h3 className="xp-toggle-title">Track Mastery Bonus</h3>
                <div className="xp-toggle-description">
                  Simulate a mastered track (+50 bonus XP)
                </div>
              </div>
              <label className="xp-toggle-switch">
                <input
                  type="checkbox"
                  className="xp-toggle-checkbox"
                  checked={isMastered}
                  onChange={(e) => setIsMastered(e.target.checked)}
                />
                <span className="xp-toggle-label">Mastered</span>
              </label>
            </div>
          </Card>

          {/* Manual Mode Card */}
          <Card variant="default" padding="md">
            <div className="xp-toggle-header">
              <div className="xp-toggle-content">
                <h3 className="xp-toggle-title">Manual Mode</h3>
                <div className="xp-toggle-description">
                  Override automatic calculation with custom values
                </div>
              </div>
              <label className="xp-toggle-switch">
                <input
                  type="checkbox"
                  className="xp-toggle-checkbox"
                  checked={isManualMode}
                  onChange={(e) => setIsManualMode(e.target.checked)}
                />
                <span className="xp-toggle-label">Enable</span>
              </label>
            </div>

            {isManualMode && (
              <div className="xp-manual-overrides">
                <div className="xp-override-field">
                  <label className="xp-override-label">Base XP Override</label>
                  <input
                    type="number"
                    className="xp-override-input"
                    value={manualOverrides.baseXP ?? ''}
                    onChange={(e) => handleManualOverrideChange('baseXP', e.target.value)}
                    placeholder="Leave empty to use duration × rate"
                    min="0"
                  />
                  <div className="xp-override-hint">
                    {manualOverrides.baseXP
                      ? `${manualOverrides.baseXP} XP (manual)`
                      : `${Math.floor(duration * 1)} XP (auto: ${duration}s × 1.0)`}
                  </div>
                </div>

                <div className="xp-override-field">
                  <label className="xp-override-label">Environmental Multiplier (0.5 - 3.0)</label>
                  <input
                    type="number"
                    className="xp-override-input"
                    value={manualOverrides.environmentalMultiplier ?? ''}
                    onChange={(e) => handleManualOverrideChange('environmentalMultiplier', e.target.value)}
                    placeholder="Leave empty to use sensor data"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                  />
                  <div className="xp-override-hint">
                    {manualOverrides.environmentalMultiplier
                      ? `${manualOverrides.environmentalMultiplier}x (manual)`
                      : environmentalContext
                        ? 'Using sensor data'
                        : '1.0x (no data)'}
                  </div>
                </div>

                <div className="xp-override-field">
                  <label className="xp-override-label">Gaming Multiplier (1.0 - 1.75)</label>
                  <input
                    type="number"
                    className="xp-override-input"
                    value={manualOverrides.gamingMultiplier ?? ''}
                    onChange={(e) => handleManualOverrideChange('gamingMultiplier', e.target.value)}
                    placeholder="Leave empty to use gaming data"
                    min="1.0"
                    max="1.75"
                    step="0.05"
                  />
                  <div className="xp-override-hint">
                    {manualOverrides.gamingMultiplier
                      ? `${manualOverrides.gamingMultiplier}x (manual)`
                      : gamingContext?.isActivelyGaming
                        ? 'Using gaming data'
                        : '1.0x (not gaming)'}
                  </div>
                </div>

                <div className="xp-manual-hint">
                  Leave fields empty to use automatic values from sensors/stores
                </div>
              </div>
            )}
          </Card>

          {/* Environmental Context Card */}
          <Card variant="default" padding="md">
            <div className="xp-context-card-header">
              <h3 className="xp-context-card-title">Environmental Context</h3>
              <StatusIndicator
                status={environmentalContext ? 'healthy' : 'degraded'}
                label={environmentalContext ? 'Active' : 'Not set'}
              />
            </div>

            {environmentalContext ? (
              <div className="xp-context-card-body">
                <div className="xp-context-row">
                  <span className="xp-context-label">Last Updated:</span>
                  <span className="xp-context-value">
                    {new Date(environmentalContext.timestamp || Date.now()).toLocaleTimeString()}
                  </span>
                </div>

                {environmentalContext.motion && (
                  <div className="xp-context-row">
                    <span className="xp-context-label">Motion Data:</span>
                    <span className="xp-context-value active">Active</span>
                  </div>
                )}

                {(environmentalContext as any).geolocation && (
                  <div className="xp-context-row">
                    <span className="xp-context-label">GPS:</span>
                    <span className="xp-context-value">
                      {(environmentalContext as any).geolocation.latitude?.toFixed(4) || 'N/A'},{' '}
                      {(environmentalContext as any).geolocation.longitude?.toFixed(4) || 'N/A'}
                    </span>
                  </div>
                )}

                {(environmentalContext as any).weather && (
                  <div className="xp-context-row">
                    <span className="xp-context-label">Weather:</span>
                    <span className="xp-context-value">
                      {(environmentalContext as any).weather.weather_type || 'Unknown'}
                      {(environmentalContext as any).weather.temperature && (
                        <span className="ml-2">
                          {Math.round((environmentalContext as any).weather.temperature)}°C
                        </span>
                      )}
                    </span>
                  </div>
                )}

                <div className="xp-context-hint">From Environmental Sensors tab</div>
              </div>
            ) : (
              <div className="xp-context-empty">
                No environmental data available. Visit the Environmental Sensors tab to set up sensors.
              </div>
            )}
          </Card>

          {/* Gaming Context Card */}
          <Card variant="default" padding="md">
            <div className="xp-context-card-header">
              <h3 className="xp-context-card-title">Gaming Context</h3>
              <StatusIndicator
                status={gamingContext?.isActivelyGaming ? 'healthy' : 'degraded'}
                label={gamingContext?.isActivelyGaming ? 'Gaming' : 'Not gaming'}
              />
            </div>

            {gamingContext ? (
              <div className="xp-context-card-body">
                <div className="xp-context-row">
                  <span className="xp-context-label">Status:</span>
                  <span className={`xp-context-value ${gamingContext.isActivelyGaming ? 'active' : 'inactive'}`}>
                    {gamingContext.isActivelyGaming ? 'Currently Gaming' : 'Not Gaming'}
                  </span>
                </div>

                {(gamingContext as any).currentGame && (
                  <div className="xp-context-row">
                    <span className="xp-context-label">Game:</span>
                    <span className="xp-context-value">{(gamingContext as any).currentGame.name || 'Unknown'}</span>
                  </div>
                )}

                {(gamingContext as any).steamId && (
                  <div className="xp-context-row">
                    <span className="xp-context-label">Steam ID:</span>
                    <span className="xp-context-value font-mono">
                      {(gamingContext as any).steamId}
                    </span>
                  </div>
                )}

                <div className="xp-context-hint">From Gaming Platforms tab</div>
              </div>
            ) : (
              <div className="xp-context-empty">
                No gaming data available. Visit the Gaming Platforms tab to connect platforms.
              </div>
            )}
          </Card>
        </div>
          </>
        )}

        {/* Results Tab Content */}
        {activeTab === 'results' && (
          result ? (
          <div className={`xp-results-section ${isCelebrating ? 'xp-level-up-celebration' : ''}`}>
            {/* Total XP Display */}
            <div className={`xp-total-card ${isCelebrating ? 'xp-level-up-pulse' : ''}`}>
              <div className="xp-total-label">Total XP</div>
              <div className="xp-total-value">{result.totalXP}</div>
              <div className="xp-total-multiplier">
                Total Multiplier: <strong>{result.totalMultiplier.toFixed(2)}x</strong>
                {result.totalMultiplier >= 3.0 && ' (capped)'}
              </div>
              {activeCharacter && (
                <div className="xp-total-applied">
                  ✅ Applied to {activeCharacter.name}
                </div>
              )}
            </div>

            {/* Bonus Breakdown */}
            <Card variant="default" padding="md">
              <h3 className="xp-breakdown-title">XP Bonus Breakdown</h3>
              <div>
                {/* Base XP */}
                <div className="xp-breakdown-row">
                  <div className="xp-breakdown-info">
                    <span className="xp-breakdown-name">Base XP</span>
                    <span className="xp-breakdown-detail">
                      ({duration}s × {(result.baseXP / duration).toFixed(2)}/s)
                    </span>
                  </div>
                  <span className="xp-breakdown-amount">{result.baseXP} XP</span>
                </div>

                {/* Environmental Bonus */}
                {result.environmentalBonusXP > 0 && (
                  <div className="xp-breakdown-row">
                    <div className="xp-breakdown-info">
                      <span className="xp-breakdown-name bonus-environmental">Environmental Bonus</span>
                      <span className="xp-breakdown-detail">
                        ({result.environmentalMultiplier.toFixed(2)}x)
                      </span>
                      {result.environmentalDetails && (
                        <div className="xp-breakdown-detail-list">
                          {result.environmentalDetails.activity && (
                            <span className="xp-breakdown-detail-item">
                              Activity: {result.environmentalDetails.activity}
                            </span>
                          )}
                          {result.environmentalDetails.isNightTime && (
                            <span className="xp-breakdown-detail-item">🌙 Night Time</span>
                          )}
                          {result.environmentalDetails.weather && (
                            <span className="xp-breakdown-detail-item">
                              Weather: {result.environmentalDetails.weather}
                            </span>
                          )}
                          {result.environmentalDetails.altitude && (
                            <span className="xp-breakdown-detail-item">
                              Altitude: {result.environmentalDetails.altitude}m
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="xp-breakdown-amount bonus-environmental">+{result.environmentalBonusXP} XP</span>
                  </div>
                )}

                {/* Gaming Bonus */}
                {result.gamingBonusXP > 0 && (
                  <div className="xp-breakdown-row">
                    <div className="xp-breakdown-info">
                      <span className="xp-breakdown-name bonus-gaming">Gaming Bonus</span>
                      <span className="xp-breakdown-detail">
                        ({result.gamingMultiplier.toFixed(2)}x)
                      </span>
                      {result.gamingDetails && (
                        <div className="xp-breakdown-detail-list">
                          {result.gamingDetails.gameName && (
                            <span className="xp-breakdown-detail-item">
                              Game: {result.gamingDetails.gameName}
                            </span>
                          )}
                          {result.gamingDetails.gameGenre && (
                            <span className="xp-breakdown-detail-item">
                              ({result.gamingDetails.gameGenre})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="xp-breakdown-amount bonus-gaming">+{result.gamingBonusXP} XP</span>
                  </div>
                )}

                {/* Mastery Bonus */}
                {result.masteryBonusXP > 0 && (
                  <div className="xp-breakdown-row">
                    <div className="xp-breakdown-info">
                      <span className="xp-breakdown-name bonus-mastery">Mastery Bonus</span>
                      <span className="xp-breakdown-detail">(Track mastered)</span>
                    </div>
                    <span className="xp-breakdown-amount bonus-mastery">+{result.masteryBonusXP} XP</span>
                  </div>
                )}

                {/* No bonuses message */}
                {result.environmentalBonusXP === 0 && result.gamingBonusXP === 0 && result.masteryBonusXP === 0 && (
                  <div className="xp-no-bonuses">
                    No active bonuses. Enable environmental sensors or start gaming to earn bonus XP!
                  </div>
                )}
              </div>
            </Card>

            {/* XP Source Visualization - Donut Chart */}
            {pieData && pieData.length > 0 && (
              <Card variant="default" padding="md">
                <h3 className="xp-donut-title">XP Source Distribution</h3>
                <div className="xp-donut-content">
                  {/* Donut Chart */}
                  <div className="xp-donut-chart">
                    <div
                      className="xp-donut-ring"
                      style={{
                        background: pieChartGradient,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                      }}
                    />
                    <div className="xp-donut-center">
                      <span className="xp-donut-center-value">{result.totalXP}</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="xp-donut-legend">
                    {pieData.map((slice) => (
                      <div key={slice.label} className="xp-donut-legend-item">
                        <div className="xp-donut-legend-left">
                          <div
                            className="xp-donut-legend-color"
                            style={{ backgroundColor: slice.color }}
                          />
                          <span className="xp-donut-legend-label">{slice.label}</span>
                        </div>
                        <div className="xp-donut-legend-right">
                          <span className="xp-donut-legend-value">{slice.value} XP</span>
                          <span className="xp-donut-legend-percent">
                            {slice.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="xp-donut-hint">
                  Visual breakdown of XP sources for this session
                </div>
              </Card>
            )}

            {/* Multiplier Cap Warning */}
            {result.totalMultiplier >= 3.0 && (
              <div className="xp-cap-warning">
                <span className="xp-cap-warning-icon">⚠️</span>
                <span className="xp-cap-warning-text">
                  Total multiplier capped at 3.0x (engine limit)
                </span>
              </div>
            )}

            {/* Raw JSON Dump Section */}
            <RawJsonDump
              data={result}
              title="Raw XP Calculation Result"
              timestamp={new Date().toISOString()}
              status="healthy"
            />
          </div>
          ) : (
            <div className="xp-results-empty">
              <div className="xp-results-empty-icon">⭐</div>
              <h3 className="xp-results-empty-title">No Calculation Yet</h3>
              <p className="xp-results-empty-description">
                Go to the Calculator tab to calculate XP from your listening session.
              </p>
            </div>
          )
        )}

        {/* Config Tab Content */}
        {activeTab === 'config' && (
          <div className="xp-config-section">
            {/* Base Settings Section */}
            <Card variant="default" padding="md" className="xp-config-card">
              <div className="xp-config-section-header">
                <Settings size={18} className="xp-config-section-icon" />
                <h3 className="xp-config-section-title">Base Settings</h3>
              </div>
              <div className="xp-config-section-content">
                <ConfigSlider
                  label="Base XP Rate"
                  description="XP earned per second of listening"
                  value={config.xp_per_second}
                  defaultValue={DEFAULT_PROGRESSION_CONFIG_SETTINGS.xp_per_second}
                  min={0.1}
                  max={5.0}
                  step={0.1}
                  onChange={handleXpPerSecondChange}
                  formatValue={(v) => `${v.toFixed(1)}x`}
                  isModified={config.xp_per_second !== DEFAULT_PROGRESSION_CONFIG_SETTINGS.xp_per_second}
                  marks={[
                    { value: 0.1, label: '0.1x' },
                    { value: 1.0, label: '1.0x' },
                    { value: 5.0, label: '5.0x' },
                  ]}
                />
              </div>
            </Card>

            {/* Environmental Activity Section */}
            <Card variant="default" padding="md" className="xp-config-card">
              <div className="xp-config-section-header">
                <Activity size={18} className="xp-config-section-icon" />
                <h3 className="xp-config-section-title">Environmental Activity</h3>
              </div>
              <div className="xp-config-section-content">
                <ConfigSlider
                  label="Running"
                  description="Multiplier when user is running"
                  value={config.activity_bonuses.running}
                  defaultValue={DEFAULT_PROGRESSION_CONFIG_SETTINGS.activity_bonuses.running}
                  min={1.0}
                  max={3.0}
                  step={0.05}
                  onChange={handleActivityBonusChange('running')}
                  isModified={isActivityBonusModified('running')}
                />
                <ConfigSlider
                  label="Walking"
                  description="Multiplier when user is walking"
                  value={config.activity_bonuses.walking}
                  defaultValue={DEFAULT_PROGRESSION_CONFIG_SETTINGS.activity_bonuses.walking}
                  min={1.0}
                  max={2.0}
                  step={0.05}
                  onChange={handleActivityBonusChange('walking')}
                  isModified={isActivityBonusModified('walking')}
                />
                <ConfigSlider
                  label="Altitude"
                  description="High altitude bonus (≥2000m)"
                  value={config.activity_bonuses.altitude}
                  defaultValue={DEFAULT_PROGRESSION_CONFIG_SETTINGS.activity_bonuses.altitude}
                  min={1.0}
                  max={2.0}
                  step={0.05}
                  onChange={handleActivityBonusChange('altitude')}
                  isModified={isActivityBonusModified('altitude')}
                  appSpecific
                />
              </div>
            </Card>

            {/* Time & Weather Section */}
            <Card variant="default" padding="md" className="xp-config-card">
              <div className="xp-config-section-header">
                <Cloud size={18} className="xp-config-section-icon" />
                <h3 className="xp-config-section-title">Time & Weather</h3>
              </div>
              <div className="xp-config-section-content">
                <ConfigSlider
                  label="Night Time"
                  description="Bonus for listening at night"
                  value={config.activity_bonuses.night_time}
                  defaultValue={DEFAULT_PROGRESSION_CONFIG_SETTINGS.activity_bonuses.night_time}
                  min={1.0}
                  max={2.0}
                  step={0.05}
                  onChange={handleActivityBonusChange('night_time')}
                  isModified={isActivityBonusModified('night_time')}
                />
                <ConfigSlider
                  label="Rain"
                  description="Bonus when it's raining"
                  value={config.activity_bonuses.rain}
                  defaultValue={DEFAULT_PROGRESSION_CONFIG_SETTINGS.activity_bonuses.rain}
                  min={1.0}
                  max={2.0}
                  step={0.05}
                  onChange={handleActivityBonusChange('rain')}
                  isModified={isActivityBonusModified('rain')}
                />
                <ConfigSlider
                  label="Snow"
                  description="Bonus when it's snowing"
                  value={config.activity_bonuses.snow}
                  defaultValue={DEFAULT_PROGRESSION_CONFIG_SETTINGS.activity_bonuses.snow}
                  min={1.0}
                  max={2.0}
                  step={0.05}
                  onChange={handleActivityBonusChange('snow')}
                  isModified={isActivityBonusModified('snow')}
                />
                <ConfigSlider
                  label="Storm"
                  description="Bonus during storms"
                  value={config.activity_bonuses.storm}
                  defaultValue={DEFAULT_PROGRESSION_CONFIG_SETTINGS.activity_bonuses.storm}
                  min={1.0}
                  max={2.0}
                  step={0.05}
                  onChange={handleActivityBonusChange('storm')}
                  isModified={isActivityBonusModified('storm')}
                />
              </div>
            </Card>

            {/* Gaming Bonuses Section */}
            <Card variant="default" padding="md" className="xp-config-card">
              <div className="xp-config-section-header">
                <Gamepad2 size={18} className="xp-config-section-icon" />
                <h3 className="xp-config-section-title">Gaming Bonuses</h3>
              </div>
              <div className="xp-config-section-content">
                <ConfigSlider
                  label="Base Gaming"
                  description="Base multiplier when gaming"
                  value={config.activity_bonuses.gaming_base}
                  defaultValue={DEFAULT_PROGRESSION_CONFIG_SETTINGS.activity_bonuses.gaming_base}
                  min={1.0}
                  max={2.0}
                  step={0.05}
                  onChange={handleActivityBonusChange('gaming_base')}
                  isModified={isActivityBonusModified('gaming_base')}
                />
                <ConfigSlider
                  label="RPG Bonus"
                  description="Additive bonus for RPG games"
                  value={config.activity_bonuses.rpg_game}
                  defaultValue={DEFAULT_PROGRESSION_CONFIG_SETTINGS.activity_bonuses.rpg_game}
                  min={0.0}
                  max={0.5}
                  step={0.01}
                  onChange={handleActivityBonusChange('rpg_game')}
                  isAdditive
                  isModified={isActivityBonusModified('rpg_game')}
                />
                <ConfigSlider
                  label="Action/FPS Bonus"
                  description="Additive bonus for Action/FPS games"
                  value={config.activity_bonuses.action_fps}
                  defaultValue={DEFAULT_PROGRESSION_CONFIG_SETTINGS.activity_bonuses.action_fps}
                  min={0.0}
                  max={0.5}
                  step={0.01}
                  onChange={handleActivityBonusChange('action_fps')}
                  isAdditive
                  isModified={isActivityBonusModified('action_fps')}
                />
                <ConfigSlider
                  label="Multiplayer Bonus"
                  description="Additive bonus for multiplayer games"
                  value={config.activity_bonuses.multiplayer}
                  defaultValue={DEFAULT_PROGRESSION_CONFIG_SETTINGS.activity_bonuses.multiplayer}
                  min={0.0}
                  max={0.5}
                  step={0.01}
                  onChange={handleActivityBonusChange('multiplayer')}
                  isAdditive
                  isModified={isActivityBonusModified('multiplayer')}
                />
              </div>
            </Card>

            {/* Global Cap Section */}
            <Card variant="default" padding="md" className="xp-config-card">
              <div className="xp-config-section-header">
                <Gauge size={18} className="xp-config-section-icon" />
                <h3 className="xp-config-section-title">Global Cap</h3>
              </div>
              <div className="xp-config-section-content">
                <ConfigSlider
                  label="Max Multiplier"
                  description="Total XP multiplier cannot exceed this value"
                  value={config.activity_bonuses.max_multiplier}
                  defaultValue={DEFAULT_PROGRESSION_CONFIG_SETTINGS.activity_bonuses.max_multiplier}
                  min={1.5}
                  max={5.0}
                  step={0.1}
                  onChange={handleActivityBonusChange('max_multiplier')}
                  formatValue={(v) => `${v.toFixed(1)}x`}
                  isModified={isActivityBonusModified('max_multiplier')}
                />
              </div>
            </Card>

            {/* Reset Button */}
            <div className="xp-config-reset-section">
              <button
                className="xp-config-reset-button"
                onClick={handleResetConfig}
                aria-label="Reset all settings to defaults"
              >
                Reset to Defaults
              </button>
            </div>

            {/* Config Info */}
            <div className="xp-config-info">
              <span className="xp-config-info-icon">💡</span>
              <span className="xp-config-info-text">
                Changes are saved automatically and affect all XP calculations.
                Config is synced with engine. Use Manual Mode for one-time overrides.
              </span>
            </div>
          </div>
        )}

        {/* Level-Up Detail Modal */}
        <LevelUpDetailModal
          levelUpDetails={levelUpDetails}
          isOpen={showLevelUpModal}
          onClose={handleCloseLevelUpModal}
        />
      </div>
    </>
  );
}

export default XPCalculatorTab;
