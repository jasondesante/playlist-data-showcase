import { useState, useEffect, useMemo } from 'react';
import { useCharacterStore } from '../../store/characterStore';
import { useCharacterUpdater } from '../../hooks/useCharacterUpdater';
import { usePlaylistStore } from '../../store/playlistStore';
import { useSessionStore } from '../../store/sessionStore';
import { useMastery } from '../../hooks/useMastery';
import { RawJsonDump } from '../ui/RawJsonDump';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LevelUpDetailModal } from '../LevelUpDetailModal';
import { StatSelectionModal, type StatEffect } from '../StatSelectionModal';
import { StatStrategySelector } from '../ui/StatStrategySelector';
import { UncappedProgressionPanel } from '../ui/UncappedProgressionPanel';
import { showToast } from '../ui/Toast';
import type { LevelUpDetail, Ability, CharacterSheet } from 'playlist-data-engine';
import type { StatIncreaseStrategyType } from '../ui/StatStrategySelector';
import { TrendingUp, Heart, Shield, Star, Zap, Scroll, Sword, Compass, AlertTriangle, UserCircle2, ChevronDown, Swords, Hammer, Users, Headphones, Music, Crown } from 'lucide-react';
import { MasteryBadge } from '../ui/MasteryBadge';
import { MasteryProgressBar } from '../ui/MasteryProgressBar';
import { PrestigeButton } from '../ui/PrestigeButton';
import { PrestigeSystem } from '@/types';
import type { ISessionTracker } from 'playlist-data-engine';
import './CharacterLevelingTab.css';

/**
 * CharacterLevelingTab Component
 *
 * Primary interface for character progression, demonstrating the CharacterUpdater
 * engine module and showcasing playlist-data-engine capabilities.
 *
 * Core Features:
 * 1. XP Progress Display - Visual progress bar with XP to next level breakdown
 * 2. XP Source Buttons - 6 activity types (Quest, Boss, Exploration, Combat, Crafting, Social)
 *    with hover tooltips showing descriptions and color-coded styling
 * 3. Manual XP Input - Custom XP amounts for testing
 * 4. Level-Up Handling - Automatic detection and celebration with detail modal
 * 5. Stat Management - Manual selection modal or smart auto-selection based on game mode
 * 6. Uncapped Progression Panel - Per-character XP formula customization (Phase 1 feature)
 *
 * Game Modes:
 * - Standard: Stats capped at 20, manual stat selection required, D&D 5e XP curve
 * - Uncapped: No stat limit, smart stat selection, customizable XP curves (4 presets)
 *
 * Props Passed to StatSelectionModal:
 * - gameMode: Determines stat cap warnings visibility
 * - activeEffects: Extracted from character.equipment_effects and feature_effects
 *
 * XP Sources Configuration (XP_SOURCES constant):
 * - quest: 500 XP - Story quests and major objectives
 * - boss_defeat: 5000 XP - Major boss encounters
 * - exploration: 250 XP - Location discovery
 * - combat: 300 XP - Combat victories
 * - crafting: 150 XP - Item creation
 * - social: 100 XP - Social encounters
 *
 * @example
 * ```tsx
 * // In the app, this tab is accessed after generating a character
 * <CharacterLevelingTab />
 * ```
 */
export function CharacterLevelingTab() {
  const { getActiveCharacter, setActiveCharacter, characters, setCharacterStrategy, getCharacterStrategy, getPrestigeInfo, canPrestige, prestigeCharacter } = useCharacterStore();
  const { addXPFromSource, applyPendingStatIncrease, updateStatStrategy } = useCharacterUpdater();
  const { selectedTrack, audioProfile } = usePlaylistStore();
  const { clearTrackSessions, getTrackXPTotal } = useSessionStore();
  const { getMasteryInfo, getTrackListenCount } = useMastery();
  const [xpAmount, setXpAmount] = useState(100);
  const [currentXP, setCurrentXP] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [levelUpPulse, setLevelUpPulse] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpDetails, setLevelUpDetails] = useState<LevelUpDetail[]>([]);
  const [showStatModal, setShowStatModal] = useState(false);

  const activeChar = getActiveCharacter();

  // Initialize stat strategy based on character's game mode
  // Standard mode (stats capped at 20) uses manual stat selection ('dnD5e')
  // Uncapped mode uses smart auto-selection ('dnD5e_smart')
  const getInitialStrategy = (): StatIncreaseStrategyType => {
    if (activeChar?.gameMode === 'standard') {
      return 'dnD5e'; // Manual mode for capped characters
    }
    return 'dnD5e_smart'; // Auto mode for uncapped characters (default)
  };

  const [statStrategy, setStatStrategy] = useState<StatIncreaseStrategyType>(getInitialStrategy);

  // Create ISessionTracker adapter for engine methods (used by prestige system)
  const sessionTrackerAdapter: ISessionTracker = useMemo(() => ({
    getTrackListenCount: (trackUuid: string) => getTrackListenCount(trackUuid),
    getTrackXPTotal: (trackUuid: string) => getTrackXPTotal(trackUuid),
    clearTrackSessions: (trackUuid: string) => clearTrackSessions(trackUuid),
  }), [getTrackListenCount, getTrackXPTotal, clearTrackSessions]);

  // Get mastery info for the selected track (uses character's prestige level)
  const masteryInfo = useMemo(() => {
    if (!selectedTrack) return null;
    const prestigeLevel = activeChar?.prestige_level ?? 0;
    return getMasteryInfo(selectedTrack.id, prestigeLevel);
  }, [selectedTrack, getMasteryInfo, activeChar?.prestige_level]);

  // Get prestige info for the active character (for PrestigeButton)
  const prestigeInfo = useMemo(() => {
    if (!activeChar) return null;
    return getPrestigeInfo(activeChar.seed, sessionTrackerAdapter);
  }, [activeChar, getPrestigeInfo, sessionTrackerAdapter]);

  // Check if character can prestige
  const canPrestigeState = useMemo(() => {
    if (!activeChar) return false;
    return canPrestige(activeChar.seed, sessionTrackerAdapter);
  }, [activeChar, canPrestige, sessionTrackerAdapter]);

  /**
   * Extract active stat effects from a character's equipment and feature effects.
   * Transforms engine format to StatEffect[] format for the StatSelectionModal.
   *
   * Task 3.4.1: Extract Active Effects from Character
   *
   * This helper function bridges the gap between the engine's effect format and
   * the UI's display format. The engine stores effects in a nested structure
   * with different formats for equipment vs feature effects, which we flatten
   * into a unified StatEffect array for the modal.
   *
   * Engine Format Differences:
   * --------------------------
   * Equipment effects come in arrays with nested 'effects' properties:
   *   equipment_effects: [{ source: "Ring of Strength", effects: [{ type: "stat_bonus", target: "STR", value: 2 }] }]
   *
   * Feature effects are simpler, direct objects:
   *   feature_effects: [{ type: "stat_bonus", target: "DEX", value: -1, description: "Curse" }]
   *
   * @param character - The character sheet to extract effects from
   * @returns Array of StatEffect objects for display in the modal
   *
   * @example
   * const effects = getActiveStatEffects(character);
   * // Returns: [{ ability: 'STR', amount: 2, source: 'Ring of Strength', type: 'buff' }]
   */
  const getActiveStatEffects = (character: CharacterSheet): StatEffect[] => {
    const effects: StatEffect[] = [];

    // Extract from equipment effects
    // Equipment effects have a nested structure: equipment_effects[].effects[]
    // - equipment_effects: Array of equipment items with their attached effects
    // - Each item has a 'source' (item name) and 'effects' array
    // - The 'effects' array contains individual effect objects
    if (character.equipment_effects) {
      for (const equipmentEffect of character.equipment_effects) {
        // Skip if this equipment has no effects attached
        if (!equipmentEffect.effects) continue;

        // Process each effect from this equipment item
        for (const prop of equipmentEffect.effects) {
          // We only care about stat_bonus effects (not other effect types like AC bonus)
          // - type: 'stat_bonus' indicates this modifies an ability score
          // - target: The ability being modified (STR, DEX, CON, INT, WIS, CHA)
          // - value: The amount of modification (positive = buff, negative = debuff)
          if (prop.type === 'stat_bonus' && prop.target && typeof prop.value === 'number') {
            effects.push({
              ability: prop.target as Ability,
              amount: prop.value,
              source: equipmentEffect.source || 'Equipment', // Use item name, fallback to generic
              type: prop.value > 0 ? 'buff' : 'debuff' // Determine buff/debuff from sign
            });
          }
        }
      }
    }

    // Extract from feature effects
    // Feature effects have a simpler flat structure compared to equipment
    // - feature_effects: Direct array of effect objects (no nested structure)
    // - Each effect has 'type', 'target', 'value', and 'description' directly
    if (character.feature_effects) {
      for (const featureEffect of character.feature_effects) {
        // Check for stat_bonus type effects (same logic as equipment)
        // Feature effects use 'description' for the source name instead of 'source'
        if (featureEffect.type === 'stat_bonus' && featureEffect.target && typeof featureEffect.value === 'number') {
          effects.push({
            ability: featureEffect.target as Ability,
            amount: featureEffect.value,
            source: featureEffect.description || 'Feature', // Use feature name, fallback to generic
            type: featureEffect.value > 0 ? 'buff' : 'debuff'
          });
        }
      }
    }

    return effects;
  };

  // Memoize active effects for the active character to avoid recalculating on every render
  const activeStatEffects = useMemo(() => {
    if (!activeChar) return [];
    return getActiveStatEffects(activeChar);
  }, [activeChar?.equipment_effects, activeChar?.feature_effects]);

  // Handle character selection change
  const handleCharacterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSeed = e.target.value;
    setActiveCharacter(selectedSeed);
    showToast(`Switched to ${characters.find(c => c.seed === selectedSeed)?.name || 'character'}`, 'success');
  };

  // Helper function to get pending stat increase count
  const getPendingStatIncreaseCount = (character: typeof activeChar): number => {
    return character?.pendingStatIncreases ?? 0;
  };

  // Helper function to check if character has pending stat increases
  const hasPendingStatIncreases = (character: typeof activeChar): boolean => {
    return getPendingStatIncreaseCount(character) > 0;
  };

  // Sync currentXP when character changes
  useEffect(() => {
    if (activeChar) {
      setCurrentXP(activeChar.xp.current);
    }
  }, [activeChar]);

  // Initialize stat strategy on mount and update when switching characters
  useEffect(() => {
    if (activeChar) {
      const persistedStrategy = getCharacterStrategy(activeChar.seed);
      const initialStrategy = persistedStrategy || (activeChar.gameMode === 'standard' ? 'dnD5e' : 'dnD5e_smart');
      setStatStrategy(initialStrategy);
      updateStatStrategy(initialStrategy);
    }
  }, [activeChar?.seed]); // Re-run when active character changes

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

  // D&D 5e XP thresholds for levels 1-20
  const xpThresholds = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

  // Helper function to format XP values to 1 decimal place
  const formatXP = (xp: number): string => {
    const rounded = Math.round(xp * 10) / 10;
    return rounded.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  };


  const handleAddCustomXP = async (amount: number) => {
    if (!activeChar || isProcessing) return;
    setIsProcessing(true);
    try {
      const result = addXPFromSource(activeChar, amount, 'custom_xp');
      if (result.leveledUp) {
        triggerLevelUpCelebration();

        // For uncapped mode, show auto-apply notification if stats were increased
        if (activeChar.gameMode === 'uncapped' && result.levelUpDetails && result.levelUpDetails.length > 0) {
          showUncappedStatNotification(result.levelUpDetails);
        }

        // Show level-up modal with details
        if (result.levelUpDetails && result.levelUpDetails.length > 0) {
          setLevelUpDetails(result.levelUpDetails);
          setShowLevelUpModal(true);
        }
      }
      // Show success toast notification
      showToast(`⭐ Added ${amount.toLocaleString()} XP`, 'success');
      console.log(`Added ${amount} XP. Total: ${result.character.xp.current}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerLevelUpCelebration = () => {
    setShowConfetti(true);
    setLevelUpPulse(true);
    setTimeout(() => setShowConfetti(false), 3000);
    setTimeout(() => setLevelUpPulse(false), 600);
  };

  // Helper function to show auto-apply notification for uncapped mode
  const showUncappedStatNotification = (levelUpDetails: LevelUpDetail[]) => {
    // Collect all stat increases from all level-ups
    const allStatIncreases: Array<{ ability: string; delta: number; oldValue: number; newValue: number }> = [];

    for (const detail of levelUpDetails) {
      if (detail.statIncreases) {
        for (const stat of detail.statIncreases) {
          allStatIncreases.push({
            ability: stat.ability,
            delta: stat.delta,
            oldValue: stat.oldValue,
            newValue: stat.newValue
          });
        }
      }
    }

    // If there are stat increases, show notification
    if (allStatIncreases.length > 0) {
      const statChangeText = allStatIncreases
        .map((inc) => `${inc.ability} +${inc.delta} (${inc.oldValue} → ${inc.newValue})`)
        .join(', ');

      // Show blue toast notification for uncapped mode stat increases
      showToast(`📊 Stats auto-increased: ${statChangeText}`, 'info');

      // Also log to console for debugging
      console.log(`📊 Stats auto-increased: ${statChangeText}`);
    }
  };

  // XP Source Configuration
  // Centralized config for all XP sources with metadata
  // Includes description field for hover tooltips
  const XP_SOURCES = [
    { id: 'quest', label: 'Complete Quest', xp: 500, toastIcon: '✅', toastMessage: 'Quest completed!', description: 'Complete a story quest or major objective' },
    { id: 'boss_defeat', label: 'Defeat Boss', xp: 5000, toastIcon: '⚔️', toastMessage: 'Boss defeated!', description: 'Defeat a major boss or powerful enemy' },
    { id: 'exploration', label: 'Exploration', xp: 250, toastIcon: '🧭', toastMessage: 'Exploration completed!', description: 'Discover new locations or hidden areas' },
    { id: 'combat', label: 'Combat Victory', xp: 300, toastIcon: '⚔️', toastMessage: 'Combat victory!', description: 'Win a combat encounter against enemies' },
    { id: 'crafting', label: 'Crafting', xp: 150, toastIcon: '🔨', toastMessage: 'Crafting successful!', description: 'Create or improve items through crafting' },
    { id: 'social', label: 'Social Encounter', xp: 100, toastIcon: '👥', toastMessage: 'Social encounter completed!', description: 'Successfully navigate social situations' },
  ] as const;

  // Generic XP Source Handler (Task 2.2.3)
  // Reduces code duplication by centralizing the XP addition logic
  const handleXPSource = async (sourceId: string) => {
    if (!activeChar || isProcessing) return;

    const source = XP_SOURCES.find(s => s.id === sourceId);
    if (!source) {
      console.error(`Unknown XP source: ${sourceId}`);
      return;
    }

    setIsProcessing(true);
    try {
      const result = addXPFromSource(activeChar, source.xp, sourceId);
      if (result.leveledUp) {
        triggerLevelUpCelebration();

        // For uncapped mode, show auto-apply notification if stats were increased
        if (activeChar.gameMode === 'uncapped' && result.levelUpDetails && result.levelUpDetails.length > 0) {
          showUncappedStatNotification(result.levelUpDetails);
        }

        // Show level-up modal with details
        if (result.levelUpDetails && result.levelUpDetails.length > 0) {
          setLevelUpDetails(result.levelUpDetails);
          setShowLevelUpModal(true);
        }
      }
      // Show success toast notification with source-specific message
      showToast(`${source.toastIcon} ${source.toastMessage} +${source.xp.toLocaleString()} XP awarded`, 'success');
      console.log(`${source.toastMessage} +${source.xp.toLocaleString()} XP. Total: ${result.character.xp.current}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Convenience wrappers for backward compatibility with button onClick handlers
  const handleCompleteQuest = () => handleXPSource('quest');
  const handleDefeatBoss = () => handleXPSource('boss_defeat');
  const handleExploration = () => handleXPSource('exploration');
  const handleCombatVictory = () => handleXPSource('combat');
  const handleCrafting = () => handleXPSource('crafting');
  const handleSocialEncounter = () => handleXPSource('social');

  // Handler for closing level-up modal
  const handleCloseLevelUpModal = () => {
    setShowLevelUpModal(false);
    setLevelUpDetails([]);
  };

  // Handler for opening stat modal
  const handleOpenStatModal = () => {
    setShowStatModal(true);
  };

  // Handler for canceling stat modal
  const handleCloseStatModal = () => {
    setShowStatModal(false);
  };

  // Handler for applying stat increases
  const handleApplyStats = (primary: Ability, secondary?: Ability[]) => {
    if (!activeChar) return;

    const result = applyPendingStatIncrease(activeChar, primary, secondary);

    // Show success notification with stat changes
    const statChangeText = result.statIncreases
      .map((inc) => `${inc.ability} +${inc.delta} (${inc.oldValue} → ${inc.newValue})`)
      .join(', ');

    showToast(`✅ Stats applied: ${statChangeText}`, 'success');
    console.log(`✅ Stats applied: ${statChangeText}`);
    console.log(`Remaining pending increases: ${result.remainingPending}`);

    // Close the modal
    setShowStatModal(false);
  };

  // Handler for strategy changes
  const handleStrategyChange = (strategy: StatIncreaseStrategyType) => {
    setStatStrategy(strategy);
    updateStatStrategy(strategy);
    // Persist to local state map
    if (activeChar) {
      setCharacterStrategy(activeChar.seed, strategy);
    }
    console.log(`📊 Stat strategy changed to: ${strategy}`);
    console.log(`This strategy will be used for future level-ups only.`);
  };

  // Handler for prestiging the character
  const handlePrestige = () => {
    if (!activeChar || !selectedTrack) return;

    // Use audioProfile from store, or create a default one
    const profile = audioProfile || {
      bass_dominance: 0.5,
      mid_dominance: 0.5,
      treble_dominance: 0.5,
      average_amplitude: 0.5,
      analysis_metadata: {
        duration_analyzed: 0,
        full_buffer_analyzed: true,
        sample_positions: [0],
        analyzed_at: new Date().toISOString()
      }
    };

    const result = prestigeCharacter(
      activeChar.seed,
      profile,
      selectedTrack,
      sessionTrackerAdapter
    );

    if (result.success) {
      showToast(`👑 Prestiged to level ${result.newPrestigeLevel > 0 ? ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][result.newPrestigeLevel - 1] : ''}!`, 'success');
    } else {
      showToast(`❌ ${result.message}`, 'error');
    }
  };

  if (!activeChar) {
    // If there are characters but none active, show selector
    if (characters.length > 0) {
      return (
        <div className="leveling-tab">
          <header className="leveling-header">
            <div className="leveling-header-icon">
              <TrendingUp size={24} />
            </div>
            <div className="leveling-header-text">
              <h1 className="leveling-header-title">Character Leveling</h1>
              <h2 className="leveling-header-subtitle">Track your character&#39;s growth and adventure</h2>
            </div>
          </header>

          <Card variant="elevated" className="leveling-empty-state">
            <div className="leveling-empty-icon">
              <UserCircle2 size={64} strokeWidth={1.5} />
            </div>
            <h3 className="leveling-empty-title">No Active Character Selected</h3>
            <div className="leveling-empty-description">
              Select a character to begin tracking their progress.
            </div>
            <div className="leveling-character-selector">
              <label htmlFor="character-select" className="leveling-selector-label">
                Choose a character:
              </label>
              <div className="leveling-select-wrapper">
                <select
                  id="character-select"
                  className="leveling-character-select"
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
                <ChevronDown size={16} className="leveling-select-icon" />
              </div>
            </div>
          </Card>
        </div>
      );
    }

    // No characters at all
    return (
      <div className="leveling-tab">
        <header className="leveling-header">
          <div className="leveling-header-icon">
            <TrendingUp size={24} />
          </div>
          <div className="leveling-header-text">
            <h1 className="leveling-header-title">Character Leveling</h1>
            <h2 className="leveling-header-subtitle">Track your character&#39;s growth and adventure</h2>
          </div>
        </header>

        <Card variant="elevated" className="leveling-empty-state">
          <div className="leveling-empty-icon">👤</div>
          <h3 className="leveling-empty-title">No Character Generated</h3>
          <div className="leveling-empty-description">
            Go to the Character Generation tab to create a character first.
          </div>
        </Card>
      </div>
    );
  }

  const nextLevel = activeChar.xp.next_level;
  const prevLevelThreshold = xpThresholds[activeChar.level - 1] || 0;
  const currentLevelProgress = currentXP - prevLevelThreshold;
  const levelXPNeeded = nextLevel - prevLevelThreshold;
  const levelProgressPercent = (currentLevelProgress / levelXPNeeded) * 100;

  return (
    <div className="leveling-tab">
      {/* Confetti celebration */}
      {showConfetti && (
        <div className="leveling-confetti-container">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="leveling-confetti" style={{ animationDelay: `${i * 0.05}s` }} />
          ))}
        </div>
      )}

      <header className="leveling-header">
        <div className="leveling-header-left">
          <div className="leveling-header-icon">
            <TrendingUp size={24} />
          </div>
          <div className="leveling-header-text">
            <h1 className="leveling-header-title">Character Leveling</h1>
            <h2 className="leveling-header-subtitle">Track your character&#39;s growth and adventure</h2>
          </div>
        </div>

        {/* Character Selector - Inline in header when there are multiple characters */}
        {characters.length > 1 && (
          <div className="leveling-header-selector">
            <div className="leveling-selector-info">
              <UserCircle2 size={18} className="leveling-selector-icon" />
              <span className="leveling-selector-label">Active Character</span>
            </div>
            <div className="leveling-select-wrapper leveling-select-inline">
              <select
                className="leveling-character-select"
                onChange={handleCharacterChange}
                value={activeChar.seed}
              >
                {characters.map((char) => (
                  <option key={char.seed} value={char.seed}>
                    {char.name} - Lv {char.level} {char.race} {char.class}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="leveling-select-icon" />
            </div>
          </div>
        )}
      </header>

      {/* Character Card with Avatar and XP Progress */}
      <Card variant="elevated" padding="lg" className={`leveling-character-card ${levelUpPulse ? 'leveling-pulse' : ''}`}>
        <div className="leveling-character-header">
          <div className="leveling-character-avatar">
            <span className="leveling-avatar-emoji">{getCharacterAvatar(activeChar.class)}</span>
            <div className="leveling-avatar-badge">Lv {activeChar.level}</div>
          </div>
          <div className="leveling-character-info">
            <h3 className="leveling-character-name">{activeChar.name}</h3>
            <div className="leveling-character-class">{activeChar.race} {activeChar.class}</div>
            {/* Quick Stats - Small inline badges */}
            <div className="leveling-quick-stats">
              <span className="leveling-quick-stat leveling-quick-stat-hp" title="Hit Points">
                <Heart size={12} />
                <span>{activeChar.hp?.max ?? 0}</span>
              </span>
              <span className="leveling-quick-stat leveling-quick-stat-ac" title="Armor Class">
                <Shield size={12} />
                <span>{activeChar.armor_class}</span>
              </span>
              <span className="leveling-quick-stat leveling-quick-stat-prof" title="Proficiency Bonus">
                <Star size={12} />
                <span>+{activeChar.proficiency_bonus}</span>
              </span>
              {(activeChar.prestige_level ?? 0) > 0 && (
                <span className="leveling-quick-stat leveling-quick-stat-prestige" title={`Prestige Level ${PrestigeSystem.toRomanNumeral(activeChar.prestige_level ?? 0)}`}>
                  <MasteryBadge
                    isMastered={true}
                    prestigeLevel={activeChar.prestige_level ?? 0}
                    prestigeRoman={PrestigeSystem.toRomanNumeral(activeChar.prestige_level ?? 0)}
                    isMaxPrestige={(activeChar.prestige_level ?? 0) >= 10}
                    size="sm"
                  />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="leveling-xp-section">
          <div className="leveling-xp-header">
            <span className="leveling-xp-label">Experience Progress</span>
            <span className="leveling-xp-values">{formatXP(currentXP)} / {formatXP(nextLevel)}</span>
          </div>
          <div className="leveling-progress-bar">
            <div
              className="leveling-progress-fill"
              style={{ width: `${levelProgressPercent}%` }}
            >
              <div className="leveling-progress-glow" />
            </div>
          </div>
          <div className="leveling-xp-hint">
            {formatXP(levelXPNeeded - currentLevelProgress)} XP needed for next level
          </div>
        </div>
      </Card>

      {/* Pending Stat Increases Badge - Shows at the TOP for visibility */}
      {hasPendingStatIncreases(activeChar) && (
        <Card variant="elevated" padding="md" className="leveling-pending-badge-card">
          <div className="leveling-pending-badge-content">
            <div className="leveling-pending-badge-icon">
              <AlertTriangle size={24} />
            </div>
            <div className="leveling-pending-badge-text">
              <h4 className="leveling-pending-badge-title">
                Pending Stat Increases: {getPendingStatIncreaseCount(activeChar)}
              </h4>
              <div className="leveling-pending-badge-description">
                You have stat increases waiting to be applied. When using manual strategy, stat increases must be applied manually.
                {activeChar.gameMode === 'standard' ? ' In standard mode, increases are awarded at levels 4, 8, 12, 16, and 19.' : ' In uncapped mode, increases are awarded at every level-up.'}
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={handleOpenStatModal}
            className="leveling-apply-stats-button"
          >
            Apply Stat Increases
          </Button>
        </Card>
      )}

      {/* Level Milestones - Dynamic view centered around current level */}
      <Card variant="default" padding="md" className="leveling-milestones-card">
        <h4 className="leveling-milestones-title">Level Milestones</h4>
        <div className="leveling-milestones-grid">
          {/* Calculate which levels to show: current level in middle-ish, with some levels ahead */}
          {(() => {
            const currentLevel = activeChar.level;
            const totalLevels = 10; // Show 10 milestones at a time
            const levelsAhead = 4; // Show 4 levels ahead of current
            const levelsBehind = totalLevels - levelsAhead - 1; // Rest are behind

            let startLevel = Math.max(2, currentLevel - levelsBehind);
            // If we're near the end, shift the window to show all available levels
            const maxLevel = 20;
            if (startLevel + totalLevels - 1 > maxLevel) {
              startLevel = Math.max(2, maxLevel - totalLevels + 1);
            }

            const levelsToShow = [];
            for (let lvl = startLevel; lvl < startLevel + totalLevels && lvl <= maxLevel; lvl++) {
              levelsToShow.push(lvl);
            }

            return levelsToShow.map((levelNum) => {
              const threshold = xpThresholds[levelNum - 1]; // level 2 is at index 1
              const isReached = currentXP >= threshold;
              const isCurrent = activeChar.level === levelNum;
              return (
                <div
                  key={levelNum}
                  className={`leveling-milestone ${isReached ? 'leveling-milestone-reached' : ''} ${isCurrent ? 'leveling-milestone-current' : ''}`}
                >
                  <div className="leveling-milestone-dot">
                    {isReached && <span className="leveling-milestone-check">✓</span>}
                    {isCurrent && <span className="leveling-milestone-star">★</span>}
                  </div>
                  <div className="leveling-milestone-info">
                    <span className="leveling-milestone-level">Lv {levelNum}</span>
                    <span className="leveling-milestone-xp">{threshold.toLocaleString()}</span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </Card>

      {/* Track Mastery Card - Shows mastery progress for selected track */}
      <Card variant="elevated" padding="lg" className="leveling-mastery-card">
        <div className="leveling-mastery-header">
          <Crown className="leveling-mastery-icon" size={20} />
          <h3 className="leveling-mastery-title">Track Mastery</h3>
        </div>

        {!selectedTrack ? (
          <div className="leveling-mastery-empty">
            <Music size={32} className="leveling-mastery-empty-icon" />
            <p className="leveling-mastery-empty-text">No track selected</p>
            <p className="leveling-mastery-empty-hint">Select a track from the Playlist tab to view mastery progress</p>
          </div>
        ) : (
          <div className="leveling-mastery-content">
            {/* Track Info */}
            <div className="leveling-mastery-track-info">
              <div className="leveling-mastery-track-title-row">
                <h4 className="leveling-mastery-track-title">{selectedTrack.title}</h4>
                {masteryInfo && (masteryInfo.isMastered || masteryInfo.prestigeLevel > 0) && (
                  <MasteryBadge
                    isMastered={masteryInfo.isMastered}
                    prestigeLevel={masteryInfo.prestigeLevel}
                    prestigeRoman={masteryInfo.prestigeRoman}
                    isMaxPrestige={masteryInfo.isMaxPrestige}
                    size="sm"
                  />
                )}
              </div>
              <p className="leveling-mastery-track-artist">{selectedTrack.artist}</p>
            </div>

            {/* Mastery Progress */}
            {masteryInfo && masteryInfo.listenCount > 0 && (
              <>
                <MasteryProgressBar
                  listenCount={masteryInfo.listenCount}
                  totalXP={masteryInfo.totalXP}
                  playsThreshold={masteryInfo.playsThreshold}
                  xpThreshold={masteryInfo.xpThreshold}
                  isMastered={masteryInfo.isMastered}
                  prestigeLevel={masteryInfo.prestigeLevel}
                  prestigeRoman={masteryInfo.prestigeRoman}
                  isMaxPrestige={masteryInfo.isMaxPrestige}
                  compact={true}
                />

                <div className="leveling-mastery-listen-count">
                  <Headphones size={12} />
                  <span>Listened {masteryInfo.listenCount} time{masteryInfo.listenCount !== 1 ? 's' : ''}</span>
                </div>

                {/* Prestige Button */}
                {canPrestigeState && prestigeInfo && activeChar && (
                  <PrestigeButton
                    canPrestige={canPrestigeState}
                    prestigeInfo={prestigeInfo}
                    character={activeChar}
                    onPrestige={handlePrestige}
                  />
                )}
              </>
            )}

            {/* No listens yet */}
            {masteryInfo && masteryInfo.listenCount === 0 && (
              <div className="leveling-mastery-no-listens">
                <Headphones size={16} />
                <span>Start a session with this track to begin earning mastery progress</span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Stat Strategy Settings (Leveling Tab Only) */}
      <Card variant="default" padding="md" className="leveling-strategy-card">
        <StatStrategySelector
          value={statStrategy}
          onChange={handleStrategyChange}
          disabled={!activeChar}
        />
        <div className="leveling-strategy-note">
          Note: Changing strategy won't affect existing pending stat increases.
        </div>
      </Card>

      {/* Uncapped Progression Settings - Only shown for uncapped mode characters */}
      {activeChar.gameMode === 'uncapped' && (
        <UncappedProgressionPanel character={activeChar} />
      )}

      {/* XP Addition Section */}
      <Card variant="default" padding="md" className="leveling-xp-actions">
        <h4 className="leveling-actions-title">Add Experience</h4>

        {/* Quick Add Buttons */}
        <div className="leveling-quick-add">
          <span className="leveling-quick-label">Quick Add</span>
          <div className="leveling-quick-grid">
            <Button variant="outline" size="md" onClick={() => handleAddCustomXP(50)} leftIcon={Zap} disabled={isProcessing || !activeChar}>+50 XP</Button>
            <Button variant="outline" size="md" onClick={() => handleAddCustomXP(100)} leftIcon={Zap} disabled={isProcessing || !activeChar}>+100 XP</Button>
            <Button variant="outline" size="md" onClick={() => handleAddCustomXP(300)} leftIcon={Zap} disabled={isProcessing || !activeChar}>+300 XP</Button>
            <Button variant="outline" size="md" onClick={() => handleAddCustomXP(1000)} leftIcon={Zap} disabled={isProcessing || !activeChar}>+1,000 XP</Button>
          </div>
        </div>

        {/* Custom XP Input */}
        <div className="leveling-custom-xp">
          <Input
            type="number"
            label="Custom XP Amount"
            value={xpAmount.toString()}
            onChange={(e) => setXpAmount(Number(e.target.value))}
            min="1"
            helperText="Enter a custom amount of XP to add"
            size="md"
            disabled={isProcessing || !activeChar}
          />
          <Button
            variant="primary"
            size="lg"
            onClick={() => handleAddCustomXP(xpAmount)}
            leftIcon={Star}
            className="leveling-add-button"
            disabled={isProcessing || !activeChar}
          >
            Add {xpAmount.toLocaleString()} XP
          </Button>
        </div>

        {/* XP Sources (Simulate Activities) */}
        {/* Task 2.2.2: Added hover tooltips with source descriptions */}
        <div className="leveling-xp-sources">
          <span className="leveling-xp-sources-label">XP Sources (Simulate Activities)</span>
          <div className="leveling-xp-sources-grid">
            <div className="leveling-xp-source-wrapper">
              <Button
                variant="outline"
                size="md"
                onClick={handleCompleteQuest}
                leftIcon={Scroll}
                disabled={isProcessing || !activeChar}
                className="leveling-xp-source-btn leveling-xp-source-quest"
              >
                <span className="leveling-xp-source-content">
                  <span className="leveling-xp-source-label">Complete Quest</span>
                  <span className="leveling-xp-source-amount">+500 XP</span>
                </span>
              </Button>
              <span className="leveling-xp-source-tooltip">Complete a story quest or major objective</span>
            </div>
            <div className="leveling-xp-source-wrapper">
              <Button
                variant="outline"
                size="md"
                onClick={handleDefeatBoss}
                leftIcon={Sword}
                disabled={isProcessing || !activeChar}
                className="leveling-xp-source-btn leveling-xp-source-boss"
              >
                <span className="leveling-xp-source-content">
                  <span className="leveling-xp-source-label">Defeat Boss</span>
                  <span className="leveling-xp-source-amount">+5,000 XP</span>
                </span>
              </Button>
              <span className="leveling-xp-source-tooltip">Defeat a major boss or powerful enemy</span>
            </div>
            <div className="leveling-xp-source-wrapper">
              <Button
                variant="outline"
                size="md"
                onClick={handleExploration}
                leftIcon={Compass}
                disabled={isProcessing || !activeChar}
                className="leveling-xp-source-btn leveling-xp-source-exploration"
              >
                <span className="leveling-xp-source-content">
                  <span className="leveling-xp-source-label">Exploration</span>
                  <span className="leveling-xp-source-amount">+250 XP</span>
                </span>
              </Button>
              <span className="leveling-xp-source-tooltip">Discover new locations or hidden areas</span>
            </div>
            <div className="leveling-xp-source-wrapper">
              <Button
                variant="outline"
                size="md"
                onClick={handleCombatVictory}
                leftIcon={Swords}
                disabled={isProcessing || !activeChar}
                className="leveling-xp-source-btn leveling-xp-source-combat"
              >
                <span className="leveling-xp-source-content">
                  <span className="leveling-xp-source-label">Combat Victory</span>
                  <span className="leveling-xp-source-amount">+300 XP</span>
                </span>
              </Button>
              <span className="leveling-xp-source-tooltip">Win a combat encounter against enemies</span>
            </div>
            <div className="leveling-xp-source-wrapper">
              <Button
                variant="outline"
                size="md"
                onClick={handleCrafting}
                leftIcon={Hammer}
                disabled={isProcessing || !activeChar}
                className="leveling-xp-source-btn leveling-xp-source-crafting"
              >
                <span className="leveling-xp-source-content">
                  <span className="leveling-xp-source-label">Crafting</span>
                  <span className="leveling-xp-source-amount">+150 XP</span>
                </span>
              </Button>
              <span className="leveling-xp-source-tooltip">Create or improve items through crafting</span>
            </div>
            <div className="leveling-xp-source-wrapper">
              <Button
                variant="outline"
                size="md"
                onClick={handleSocialEncounter}
                leftIcon={Users}
                disabled={isProcessing || !activeChar}
                className="leveling-xp-source-btn leveling-xp-source-social"
              >
                <span className="leveling-xp-source-content">
                  <span className="leveling-xp-source-label">Social Encounter</span>
                  <span className="leveling-xp-source-amount">+100 XP</span>
                </span>
              </Button>
              <span className="leveling-xp-source-tooltip">Successfully navigate social situations</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Raw JSON Dump Section */}
      <RawJsonDump
        data={{
          seed: activeChar.seed,
          name: activeChar.name,
          race: activeChar.race,
          class: activeChar.class,
          level: activeChar.level,
          xp: activeChar.xp,
          hp: activeChar.hp,
          armor_class: activeChar.armor_class,
          proficiency_bonus: activeChar.proficiency_bonus,
          ability_scores: activeChar.ability_scores,
        }}
        title="Raw Character Leveling Data"
        timestamp={new Date()}
        status="healthy"
      />

      {/* Level-Up Detail Modal */}
      <LevelUpDetailModal
        levelUpDetails={levelUpDetails}
        isOpen={showLevelUpModal}
        onClose={handleCloseLevelUpModal}
      />

      {/* Stat Selection Modal */}
      <StatSelectionModal
        isOpen={showStatModal}
        pendingCount={activeChar.pendingStatIncreases ?? 0}
        currentStats={activeChar.ability_scores}
        gameMode={activeChar.gameMode}
        activeEffects={activeStatEffects}
        onApply={handleApplyStats}
        onCancel={handleCloseStatModal}
      />
    </div>
  );
}

export default CharacterLevelingTab;
