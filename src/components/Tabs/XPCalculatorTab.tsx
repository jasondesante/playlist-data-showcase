import { useState, useMemo } from 'react';
import { useXPCalculator, type XPBreakdown } from '../../hooks/useXPCalculator';
import { useSensorStore } from '../../store/sensorStore';
import { useCharacterStore } from '../../store/characterStore';
import { useCharacterUpdater } from '../../hooks/useCharacterUpdater';
import { StatusIndicator } from '../ui/StatusIndicator';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import RawJsonDump from '../ui/RawJsonDump';
import { LevelUpDetailModal } from '../LevelUpDetailModal';
import { showToast } from '../ui/Toast';
import { User, ChevronDown } from 'lucide-react';
import type { LevelUpDetail } from 'playlist-data-engine';
import './XPCalculatorTab.css';

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
 * XPCalculatorTab - XP Calculator Tab Component
 *
 * Demonstrates the XPCalculator from playlist-data-engine.
 * Allows users to calculate XP earned based on listening duration.
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
 */
export function XPCalculatorTab() {
  const { calculateXP } = useXPCalculator();
  const { environmentalContext, gamingContext } = useSensorStore();
  const { getActiveCharacter, characters, setActiveCharacter } = useCharacterStore();
  const { addXPFromSource } = useCharacterUpdater();
  const [duration, setDuration] = useState(180);
  const [result, setResult] = useState<XPBreakdown | null>(null);
  const [isMastered, setIsMastered] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpDetails, setLevelUpDetails] = useState<LevelUpDetail[]>([]);

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

  const handleCalculate = () => {
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
  };

  const handleApplyXP = async () => {
    if (!result || !activeCharacter || isApplying) return;

    setIsApplying(true);
    try {
      const addResult = addXPFromSource(activeCharacter, result.totalXP, 'xp_calculator');

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
      showToast(`⭐ Applied ${result.totalXP.toLocaleString()} XP to ${activeCharacter.name}`, 'success');
      console.log(`Applied ${result.totalXP} XP from calculator to ${activeCharacter.name}`);
    } finally {
      setIsApplying(false);
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
            <p className="xp-calculator-header-subtitle">
              Calculate experience points from listening sessions
            </p>
          </div>
        </div>

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
                    <p className="xp-character-class">{activeCharacter.race} {activeCharacter.class}</p>
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
                <p className="xp-empty-description">
                  Select a character to apply calculated XP
                </p>
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

        <div className="xp-calculator-context-grid">
          {/* Duration Input Card */}
          <Card variant="default" padding="md" className="xp-calculator-context-grid">
            <Input
              label="Duration (seconds)"
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min="0"
              max="3600"
              helperText={`${Math.floor(duration / 60)} minutes ${duration % 60} seconds`}
            />
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

                <p className="xp-context-hint">From Environmental Sensors tab</p>
              </div>
            ) : (
              <p className="xp-context-empty">
                No environmental data available. Visit the Environmental Sensors tab to set up sensors.
              </p>
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

                <p className="xp-context-hint">From Gaming Platforms tab</p>
              </div>
            ) : (
              <p className="xp-context-empty">
                No gaming data available. Visit the Gaming Platforms tab to connect platforms.
              </p>
            )}
          </Card>

          {/* Mastery Toggle Card */}
          <Card variant="default" padding="md">
            <div className="xp-toggle-header">
              <div className="xp-toggle-content">
                <h3 className="xp-toggle-title">Track Mastery Bonus</h3>
                <p className="xp-toggle-description">
                  Simulate a mastered track (+50 bonus XP)
                </p>
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
                <p className="xp-toggle-description">
                  Override automatic calculation with custom values
                </p>
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
                  <p className="xp-override-hint">
                    {manualOverrides.baseXP
                      ? `${manualOverrides.baseXP} XP (manual)`
                      : `${Math.floor(duration * 1)} XP (auto: ${duration}s × 1.0)`}
                  </p>
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
                  <p className="xp-override-hint">
                    {manualOverrides.environmentalMultiplier
                      ? `${manualOverrides.environmentalMultiplier}x (manual)`
                      : environmentalContext
                        ? 'Using sensor data'
                        : '1.0x (no data)'}
                  </p>
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
                  <p className="xp-override-hint">
                    {manualOverrides.gamingMultiplier
                      ? `${manualOverrides.gamingMultiplier}x (manual)`
                      : gamingContext?.isActivelyGaming
                        ? 'Using gaming data'
                        : '1.0x (not gaming)'}
                  </p>
                </div>

                <p className="xp-manual-hint">
                  Leave fields empty to use automatic values from sensors/stores
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Calculate Button */}
        <div className="xp-calculate-section">
          <button
            onClick={handleCalculate}
            className="xp-calculate-button"
          >
            Calculate XP
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className={`xp-results-section ${isCelebrating ? 'xp-level-up-celebration' : ''}`}>
            {/* Total XP Display */}
            <div className={`xp-total-card ${isCelebrating ? 'xp-level-up-pulse' : ''}`}>
              <p className="xp-total-label">Total XP</p>
              <p className="xp-total-value">{result.totalXP}</p>
              <p className="xp-total-multiplier">
                Total Multiplier: <strong>{result.totalMultiplier.toFixed(2)}x</strong>
                {result.totalMultiplier >= 3.0 && ' (capped)'}
              </p>
            </div>

            {/* Apply XP Button */}
            {activeCharacter ? (
              <div className="xp-apply-section">
                <button
                  onClick={handleApplyXP}
                  className="xp-apply-button"
                  disabled={isApplying}
                >
                  {isApplying ? (
                    <>Applying...</>
                  ) : (
                    <>Apply {result.totalXP.toLocaleString()} XP to {activeCharacter.name}</>
                  )}
                </button>
                <p className="xp-apply-hint">
                  This will add the calculated XP to {activeCharacter.name} (Level {activeCharacter.level})
                </p>
              </div>
            ) : (
              <div className="xp-apply-section xp-apply-disabled">
                <p className="xp-apply-disabled-message">
                  Select a character first to apply XP
                </p>
              </div>
            )}

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
                  <p className="xp-no-bonuses">
                    No active bonuses. Enable environmental sensors or start gaming to earn bonus XP!
                  </p>
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
                <p className="xp-donut-hint">
                  Visual breakdown of XP sources for this session
                </p>
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
