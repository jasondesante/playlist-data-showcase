import { useState, useEffect, useRef, useCallback } from 'react';
import { useCombatEngine, type Combatant } from '../../hooks/useCombatEngine';
import { useCharacterStore } from '../../store/characterStore';
import { useCharacterUpdater } from '../../hooks/useCharacterUpdater';
import { useEnemyGenerator } from '../../hooks/useEnemyGenerator';
import { StatusIndicator } from '../ui/StatusIndicator';
import { RawJsonDump } from '../ui/RawJsonDump';
import {
    SPELL_DATABASE,
    type CharacterSheet,
    type EncounterGenerationOptions,
    type EnemyRarity,
    type EnemyCategory,
    type EnemyArchetype,
    type EncounterDifficulty,
    type EnemyMixMode,
    getXPBudgetPerLevel,
    getXPForCR,
    getEncounterMultiplier,
    calculateAdjustedXP
} from 'playlist-data-engine';
import { logger } from '../../utils/logger';
import './CombatSimulatorTab.css';

/**
 * Template metadata for display in the UI
 */
interface TemplateInfo {
    id: string;
    name: string;
    category: EnemyCategory;
    archetype: EnemyArchetype;
    signatureAbility: string;
    signatureAbilityDescription: string;
}

/**
 * All available enemy templates organized by category
 * Based on docs/engine/docs/ENEMY_GENERATION.md
 */
const ENEMY_TEMPLATES: TemplateInfo[] = [
    // Humanoid - Brute
    { id: 'orc', name: 'Orc', category: 'humanoid', archetype: 'brute', signatureAbility: 'Savage Strike', signatureAbilityDescription: 'Bonus melee damage on hit' },
    { id: 'bandit', name: 'Bandit', category: 'humanoid', archetype: 'brute', signatureAbility: 'Cheap Shot', signatureAbilityDescription: 'Bonus damage vs flat-footed targets' },

    // Humanoid - Archer
    { id: 'hunter', name: 'Hunter', category: 'humanoid', archetype: 'archer', signatureAbility: 'Precise Shot', signatureAbilityDescription: 'Ignore half cover on ranged attacks' },
    { id: 'goblin-archer', name: 'Goblin Archer', category: 'humanoid', archetype: 'archer', signatureAbility: 'Sneaky Shot', signatureAbilityDescription: 'Bonus damage when attacking from hiding' },

    // Humanoid - Support
    { id: 'shaman', name: 'Shaman', category: 'humanoid', archetype: 'support', signatureAbility: 'Spirit Bond', signatureAbilityDescription: 'Boost ally damage output' },
    { id: 'cultist', name: 'Cultist', category: 'humanoid', archetype: 'support', signatureAbility: 'Dark Blessing', signatureAbilityDescription: 'Grant ally AC bonus' },

    // Beast - Brute
    { id: 'bear', name: 'Bear', category: 'beast', archetype: 'brute', signatureAbility: 'Maul', signatureAbilityDescription: 'Multiattack with grapple effect' },
    { id: 'boar', name: 'Boar', category: 'beast', archetype: 'brute', signatureAbility: 'Gore Charge', signatureAbilityDescription: 'Bonus damage on charge attacks' },

    // Beast - Ranged
    { id: 'giant-spider', name: 'Giant Spider', category: 'beast', archetype: 'archer', signatureAbility: 'Web Spray', signatureAbilityDescription: 'Ranged restrain ability' },
    { id: 'stirge', name: 'Stirge', category: 'beast', archetype: 'archer', signatureAbility: 'Blood Drain', signatureAbilityDescription: 'Ranged life steal attack' },

    // Undead - Archer
    { id: 'skeleton', name: 'Skeleton', category: 'undead', archetype: 'archer', signatureAbility: 'Bone Shot', signatureAbilityDescription: 'Bonus piercing damage on ranged attacks' },
    { id: 'ghost', name: 'Ghost', category: 'undead', archetype: 'archer', signatureAbility: 'Horrifying Visage', signatureAbilityDescription: 'Apply fear debuff to enemies' },

    // Undead - Brute
    { id: 'zombie', name: 'Zombie', category: 'undead', archetype: 'brute', signatureAbility: 'Undead Grip', signatureAbilityDescription: 'Grapple + bite combo attack' },
    { id: 'wight', name: 'Wight', category: 'undead', archetype: 'brute', signatureAbility: 'Life Drain', signatureAbilityDescription: 'Damage enemies and heal self' },

    // Fiend - Archer
    { id: 'imp', name: 'Imp', category: 'fiend', archetype: 'archer', signatureAbility: 'Sting', signatureAbilityDescription: 'Poison damage on hit' },

    // Fiend - Brute
    { id: 'lemure', name: 'Lemure', category: 'fiend', archetype: 'brute', signatureAbility: 'Hellish Resilience', signatureAbilityDescription: 'Reduce incoming damage' },
    { id: 'demon', name: 'Demon', category: 'fiend', archetype: 'brute', signatureAbility: 'Chaos Claw', signatureAbilityDescription: 'Random damage type attack' },

    // Fiend - Support
    { id: 'quasit', name: 'Quasit', category: 'fiend', archetype: 'support', signatureAbility: 'Fear Aura', signatureAbilityDescription: 'Apply debuff to nearby enemies' },

    // Elemental - Brute
    { id: 'fire-elemental', name: 'Fire Elemental', category: 'elemental', archetype: 'brute', signatureAbility: 'Burning Touch', signatureAbilityDescription: 'Fire damage + ongoing burn' },
    { id: 'earth-elemental', name: 'Earth Elemental', category: 'elemental', archetype: 'brute', signatureAbility: 'Earth Slam', signatureAbilityDescription: 'AoE attack with prone effect' },

    // Elemental - Archer
    { id: 'air-elemental', name: 'Air Elemental', category: 'elemental', archetype: 'archer', signatureAbility: 'Wind Blast', signatureAbilityDescription: 'Ranged push attack' },

    // Elemental - Support
    { id: 'water-elemental', name: 'Water Elemental', category: 'elemental', archetype: 'support', signatureAbility: 'Whirlpool', signatureAbilityDescription: 'Restrain and pull enemies' },

    // Construct - Brute
    { id: 'animated-armor', name: 'Animated Armor', category: 'construct', archetype: 'brute', signatureAbility: 'Slam', signatureAbilityDescription: 'Force damage attack' },
    { id: 'golem', name: 'Golem', category: 'construct', archetype: 'brute', signatureAbility: 'Immutable Form', signatureAbilityDescription: 'Immunity to status effects' },

    // Construct - Archer
    { id: 'flying-sword', name: 'Flying Sword', category: 'construct', archetype: 'archer', signatureAbility: 'Diving Strike', signatureAbilityDescription: 'Bonus damage on dive attacks' },

    // Construct - Support
    { id: 'shield-guardian', name: 'Shield Guardian', category: 'construct', archetype: 'support', signatureAbility: 'Protection Aura', signatureAbilityDescription: 'Grant ally AC bonus' },

    // Dragon - Brute
    { id: 'young-red-dragon', name: 'Young Red Dragon', category: 'dragon', archetype: 'brute', signatureAbility: 'Fire Breath', signatureAbilityDescription: 'AoE fire damage breath weapon' },
    { id: 'dragon-wyrmling', name: 'Dragon Wyrmling', category: 'dragon', archetype: 'brute', signatureAbility: 'Bite + Claw', signatureAbilityDescription: 'Multiattack combo' },
    { id: 'drake', name: 'Drake', category: 'dragon', archetype: 'brute', signatureAbility: 'Tail Swipe', signatureAbilityDescription: 'Knockback attack' },

    // Dragon - Archer
    { id: 'young-blue-dragon', name: 'Young Blue Dragon', category: 'dragon', archetype: 'archer', signatureAbility: 'Lightning Breath', signatureAbilityDescription: 'Line lightning damage' },

    // Monstrosity - Brute
    { id: 'owlbear', name: 'Owlbear', category: 'monstrosity', archetype: 'brute', signatureAbility: 'Multiattack', signatureAbilityDescription: 'Beak + claws combo attack' },
    { id: 'mimic', name: 'Mimic', category: 'monstrosity', archetype: 'brute', signatureAbility: 'Adhesive', signatureAbilityDescription: 'Auto-grapple on hit' },

    // Monstrosity - Archer
    { id: 'griffin', name: 'Griffin', category: 'monstrosity', archetype: 'archer', signatureAbility: 'Dive Attack', signatureAbilityDescription: 'Bonus damage from flight' },

    // Monstrosity - Support
    { id: 'basilisk', name: 'Basilisk', category: 'monstrosity', archetype: 'support', signatureAbility: 'Petrifying Gaze', signatureAbilityDescription: 'Save or be stunned' },
];

/**
 * Rarity tier information for display
 */
const RARITY_INFO: Record<EnemyRarity, { multiplier: string; extraAbilities: number; description: string }> = {
    common: { multiplier: '1.0x', extraAbilities: 0, description: 'Base stats, signature ability only' },
    uncommon: { multiplier: '1.1x', extraAbilities: 1, description: '+10% stats, 1 extra ability' },
    elite: { multiplier: '1.25x', extraAbilities: 2, description: '+25% stats, 2 extra abilities, resistances' },
    boss: { multiplier: '1.5x', extraAbilities: 3, description: '+50% stats, 3 extra abilities, legendary actions' },
};

/**
 * Archetype display names and icons
 */
const ARCHETYPE_INFO: Record<EnemyArchetype, { label: string; icon: string; color: string }> = {
    brute: { label: 'Brute', icon: '⚔️', color: 'hsl(0 70% 50%)' },
    archer: { label: 'Archer', icon: '🏹', color: 'hsl(142 70% 45%)' },
    support: { label: 'Support', icon: '✨', color: 'hsl(217 70% 55%)' },
};

/**
 * Difficulty display info with XP preview hint
 */
const DIFFICULTY_INFO: Record<EncounterDifficulty, { label: string; description: string; color: string }> = {
    easy: { label: 'Easy', description: 'Minor challenge, few resources spent', color: 'hsl(142 70% 50%)' },
    medium: { label: 'Medium', description: 'Balanced fight, some resource drain', color: 'hsl(48 96% 53%)' },
    hard: { label: 'Hard', description: 'Tough fight, significant resource use', color: 'hsl(24 95% 53%)' },
    deadly: { label: 'Deadly', description: 'Life-threatening, possible casualties', color: 'hsl(0 84% 60%)' },
};

/**
 * Enemy mix mode display info
 */
const ENEMY_MIX_INFO: Record<EnemyMixMode, { label: string; description: string }> = {
    uniform: { label: 'Uniform', description: 'All enemies same type' },
    category: { label: 'Category Mix', description: 'Mix from selected category' },
    custom: { label: 'Custom Mix', description: 'Specify exact templates' },
    random: { label: 'Random', description: 'Completely random enemies' },
};

/**
 * Category display names and icons
 */
const CATEGORY_INFO: Record<EnemyCategory, { label: string; icon: string }> = {
    humanoid: { label: 'Humanoid', icon: '👤' },
    beast: { label: 'Beast', icon: '🐾' },
    undead: { label: 'Undead', icon: '💀' },
    fiend: { label: 'Fiend', icon: '😈' },
    elemental: { label: 'Elemental', icon: '🔥' },
    construct: { label: 'Construct', icon: '🤖' },
    dragon: { label: 'Dragon', icon: '🐉' },
    monstrosity: { label: 'Monstrosity', icon: '👹' },
};

/**
 * Generation mode for enemy creation
 */
type EnemyGenerationMode = 'single' | 'party-balanced' | 'cr-based';

/**
 * Configuration for enemy generation in the combat simulator
 *
 * This config is used to generate enemies before combat starts.
 * It wraps the EncounterGenerationOptions with additional UI-specific fields.
 */
export interface EnemyGenerationConfig {
    /** Generation mode: single enemy, party-balanced, or CR-based */
    mode: EnemyGenerationMode;

    /** Seed for deterministic generation */
    seed: string;

    /** Number of enemies to generate (1-10) */
    count: number;

    /** Encounter difficulty for party-balanced mode */
    difficulty: EncounterDifficulty;

    /** Target CR for CR-based mode */
    targetCR: number;

    /** Base rarity for generated enemies */
    baseRarity: EnemyRarity;

    /** Optional: Filter by category */
    category?: EnemyCategory;

    /** Optional: Filter by archetype */
    archetype?: EnemyArchetype;

    /** Optional: Force specific template ID */
    templateId?: string;

    /** Enemy mix mode for encounter generation */
    enemyMix: EnemyMixMode;

    /** Optional: Template IDs for custom mix mode */
    templates?: string[];

    /** Optional: Difficulty multiplier */
    difficultyMultiplier: number;
}

/**
 * Default enemy generation configuration
 */
const DEFAULT_GENERATION_CONFIG: EnemyGenerationConfig = {
    mode: 'single',
    seed: 'combat-encounter',
    count: 1,
    difficulty: 'medium',
    targetCR: 1,
    baseRarity: 'common',
    enemyMix: 'uniform',
    difficultyMultiplier: 1.0
};

/**
 * CombatSimulatorTab Component
 *
 * Demonstrates the CombatEngine engine module by:
 * 1. Starting combat between player character(s) and enemies
 * 2. Rolling initiative for turn order
 * 3. Executing attacks with damage calculations
 * 4. Casting spells with slot management
 * 5. Advancing turns manually or via auto-play
 * 6. Displaying combat log with detailed action history
 * 7. Showing victory screen with XP awarded, rounds elapsed, total turns
 * 8. Providing manual attack controls for choosing specific targets
 * 9. Providing spell casting UI for spellcaster classes
 *
 * Features:
 * - D&D 5e combat rules implementation
 * - Initiative order sidebar with current turn highlighting
 * - Combatant cards with HP bars and status
 * - Color-coded combat log (green=hit, red=miss, blue=spell)
 * - Auto-play mode for hands-off combat simulation (1.5s per turn)
 * - Manual attack targeting
 * - Spell selection with slot availability checking
 * - Multi-target spell casting
 * - Victory overlay with combat statistics
 * - Raw JSON dump for debugging
 *
 * @example
 * ```tsx
 * // Requires at least one generated character
 * <CombatSimulatorTab />
 * ```
 */

// Helper function to determine log entry color based on action type and result
function getLogEntryColor(action: any): string {
  if (action.type === 'spell') return 'combat-log-entry-spell';
  if (action.result?.success) return 'combat-log-entry-success';
  if (action.result?.success === false) return 'combat-log-entry-fail';
  return 'combat-log-entry-neutral';
}

// Helper function to calculate which round an action occurred in
function getActionRound(actionIndex: number, totalCombatants: number): number {
  // Approximate round number based on action index and number of combatants
  return Math.floor(actionIndex / totalCombatants) + 1;
}

// Auto-play configuration (task 4.9.7)
const AUTO_PLAY_INTERVAL_MS = 1500; // Advance turns every 1.5 seconds

// Helper function to check if a character is a spellcaster
function isSpellcaster(character: any): boolean {
  const spellcastingClasses = ['Wizard', 'Cleric', 'Sorcerer', 'Bard', 'Druid', 'Warlock', 'Paladin', 'Ranger'];
  return spellcastingClasses.includes(character.class) && character.spells;
}

// Helper function to check if a character is an enemy (generated by EnemyGenerator)
function isEnemy(character: any): boolean {
  // Enemies have race='Enemy' and class='Monster' as placeholders
  return character.race === 'Enemy' && character.class === 'Monster';
}

// Helper function to look up enemy template metadata by name
function getEnemyTemplateByName(name: string): TemplateInfo | undefined {
  // Handle boss names which may have prefixes like "Warlord Orc"
  // Try exact match first, then try to find by base name
  let template = ENEMY_TEMPLATES.find(t => t.name === name);
  if (!template) {
    // For boss names like "Warlord Orc", extract the base creature name
    const bossPrefixes = ['Warlord ', 'Overlord ', 'Ancient ', 'Elder ', 'Grand ', 'Master ', 'Chieftain '];
    for (const prefix of bossPrefixes) {
      if (name.startsWith(prefix)) {
        const baseName = name.slice(prefix.length);
        template = ENEMY_TEMPLATES.find(t => t.name === baseName);
        if (template) break;
      }
    }
  }
  return template;
}

// Helper function to get spell level as a readable string
function getSpellLevelText(level: number): string {
  if (level === 0) return 'Cantrip';
  return `Level ${level}`;
}

export function CombatSimulatorTab() {
  const {
    startCombat,
    getCurrentCombatant,
    executeAttack,
    executeCastSpell,
    nextTurn,
    getCombatResult,
    resetCombat,
    getLivingCombatants,
    combat
  } = useCombatEngine();
  const { getActiveCharacter } = useCharacterStore();
  const { addXPFromSource } = useCharacterUpdater();

  // ============================================================
  // Phase 1.2: Enemy Generation State Management
  // ============================================================

  // Hook for enemy generation (Phase 1.1)
  const enemyGenerator = useEnemyGenerator();

  // State: Generated enemies ready for combat
  const [generatedEnemies, setGeneratedEnemies] = useState<CharacterSheet[]>([]);

  // State: Configuration for enemy generation
  const [generationConfig, setGenerationConfig] = useState<EnemyGenerationConfig>(DEFAULT_GENERATION_CONFIG);

  // State: Loading state for enemy generation (Phase 2.1)

  // Reset generated enemies when config changes (Phase 1.2 requirement)
  // This ensures stale enemies are cleared when user changes generation settings
  const prevConfigRef = useRef<EnemyGenerationConfig>(generationConfig);
  useEffect(() => {
    // Check if any config values changed that would invalidate generated enemies
    const hasConfigChanged = (
      prevConfigRef.current.mode !== generationConfig.mode ||
      prevConfigRef.current.seed !== generationConfig.seed ||
      prevConfigRef.current.count !== generationConfig.count ||
      prevConfigRef.current.difficulty !== generationConfig.difficulty ||
      prevConfigRef.current.targetCR !== generationConfig.targetCR ||
      prevConfigRef.current.baseRarity !== generationConfig.baseRarity ||
      prevConfigRef.current.category !== generationConfig.category ||
      prevConfigRef.current.archetype !== generationConfig.archetype ||
      prevConfigRef.current.templateId !== generationConfig.templateId ||
      prevConfigRef.current.enemyMix !== generationConfig.enemyMix ||
      prevConfigRef.current.templates !== generationConfig.templates
    );

    if (hasConfigChanged && generatedEnemies.length > 0) {
      logger.info('CombatSimulator', 'Config changed, clearing generated enemies', {
        previousMode: prevConfigRef.current.mode,
        newMode: generationConfig.mode
      });
      setGeneratedEnemies([]);
    }

    prevConfigRef.current = generationConfig;
  }, [generationConfig, generatedEnemies.length]);

  // Handler: Generate enemies based on current configuration
  // Note: _handleGenerateEnemies will be wired to UI in Phase 2
  const _handleGenerateEnemies = useCallback(() => {
    const activeChar = getActiveCharacter();
    if (!activeChar) {
      logger.warn('CombatSimulator', 'Cannot generate enemies: no active character');
      return;
    }

    setIsGenerating(true);
    logger.info('CombatSimulator', 'Generating enemies', {
      mode: generationConfig.mode,
      count: generationConfig.count,
      seed: generationConfig.seed
    });

    try {
      let enemies: CharacterSheet[] = [];

      const options: EncounterGenerationOptions = {
        seed: generationConfig.seed,
        count: generationConfig.count,
        difficulty: generationConfig.difficulty,
        targetCR: generationConfig.targetCR,
        baseRarity: generationConfig.baseRarity,
        category: generationConfig.category,
        archetype: generationConfig.archetype,
        templateId: generationConfig.templateId,
        enemyMix: generationConfig.enemyMix,
        templates: generationConfig.templates,
        difficultyMultiplier: generationConfig.difficultyMultiplier
      };

      switch (generationConfig.mode) {
        case 'single':
          // Generate a single enemy
          const singleEnemy = enemyGenerator.generate({
            seed: generationConfig.seed,
            templateId: generationConfig.templateId,
            rarity: generationConfig.baseRarity,
            category: generationConfig.category,
            archetype: generationConfig.archetype,
            difficultyMultiplier: generationConfig.difficultyMultiplier
          });
          if (singleEnemy) {
            enemies = [singleEnemy];
          }
          break;

        case 'party-balanced':
          // Generate party-balanced encounter
          enemies = enemyGenerator.generateEncounter([activeChar], options);
          break;

        case 'cr-based':
          // Generate CR-based encounter
          enemies = enemyGenerator.generateEncounterByCR(options);
          break;
      }

      logger.info('CombatSimulator', 'Enemy generation complete', {
        enemyCount: enemies.length,
        enemyNames: enemies.map(e => e.name)
      });

      setGeneratedEnemies(enemies);
    } catch (error) {
      logger.error('CombatSimulator', 'Failed to generate enemies', error);
      setGeneratedEnemies([]);
    } finally {
      setIsGenerating(false);
    }
  }, [generationConfig, getActiveCharacter, enemyGenerator]);

  // Handler: Update a single config field
  // Note: _updateGenerationConfig will be wired to UI in Phase 2
  const _updateGenerationConfig = useCallback(<K extends keyof EnemyGenerationConfig>(
    key: K,
    value: EnemyGenerationConfig[K]
  ) => {
    setGenerationConfig(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Wire up updateGenerationConfig function for Phase 2 UI
  const updateGenerationConfig = _updateGenerationConfig;

  // State for tracking if enemies have been generated (Phase 2.1)
  const [isGenerating, setIsGenerating] = useState(false);

  // Wrapper to set loading state during generation
  const handleGenerateEnemiesWithLoading = useCallback(() => {
    setIsGenerating(true);
    _handleGenerateEnemies();
    // Generation is synchronous in the current implementation
    // but we add a small delay for UX feedback
    setTimeout(() => setIsGenerating(false), 100);
  }, [_handleGenerateEnemies]);

  // End of Phase 1.2 state management
  // ============================================================

  // State for manual attack selection (task 4.9.6)
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  // State for spell casting (task 4.9.8)
  const [selectedSpellName, setSelectedSpellName] = useState<string | null>(null);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);

  // State for auto-play functionality (task 4.9.7)
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const combatLogRef = useRef<HTMLDivElement>(null);

  // Performance timing state (Phase 5.5.2)
  const combatStartTimeRef = useRef<number | null>(null);
  const [combatPerformance, setCombatPerformance] = useState<{
    totalTimeSeconds: string | null;
    totalTurns: number;
    roundsElapsed: number;
    performanceTarget: string;
  } | null>(null);

  // XP award state (Task 3.4)
  const [xpAwarded, setXpAwarded] = useState<{ amount: number; characterName: string; leveledUp: boolean } | null>(null);

  // Combat state from task 4.9.1 (moved before useEffect hooks to fix TS error)
  const currentTurnIndex = combat?.currentTurnIndex ?? null;
  const roundNumber = combat?.roundNumber ?? null;
  const combatLog = combat?.history ?? [];
  const isActive = combat?.isActive ?? false;

  /**
   * Start combat with generated enemies or fall back to single generated enemy
   *
   * Phase 1.3: Replace mock enemy with EnemyGenerator-generated enemies
   * - Uses generatedEnemies state if populated
   * - Falls back to generating a single enemy if none configured
   * - Passes generated enemies to startCombat()
   */
  const handleStartCombat = useCallback(() => {
    const activeChar = getActiveCharacter();
    if (!activeChar) {
      logger.warn('CombatSimulator', 'Cannot start combat: no active character');
      return;
    }

    let enemiesToUse: CharacterSheet[] = [];

    if (generatedEnemies.length > 0) {
      // Use pre-generated enemies from state
      logger.info('CombatSimulator', 'Using pre-generated enemies', {
        count: generatedEnemies.length,
        names: generatedEnemies.map(e => e.name)
      });
      enemiesToUse = generatedEnemies;
    } else {
      // Fall back to generating a single enemy using EnemyGenerator
      logger.info('CombatSimulator', 'No pre-generated enemies, generating single fallback enemy');

      const fallbackEnemy = enemyGenerator.generate({
        seed: generationConfig.seed || 'fallback-enemy',
        templateId: generationConfig.templateId,
        rarity: generationConfig.baseRarity,
        category: generationConfig.category,
        archetype: generationConfig.archetype,
        difficultyMultiplier: generationConfig.difficultyMultiplier
      });

      if (fallbackEnemy) {
        enemiesToUse = [fallbackEnemy];
        logger.info('CombatSimulator', 'Fallback enemy generated', {
          name: fallbackEnemy.name,
          level: fallbackEnemy.level
        });
      } else {
        // Last resort: log error and don't start combat
        logger.error('CombatSimulator', 'Failed to generate fallback enemy');
        return;
      }
    }

    // Start combat with the active character and generated enemies
    startCombat([activeChar], enemiesToUse);
  }, [
    getActiveCharacter,
    generatedEnemies,
    enemyGenerator,
    generationConfig,
    startCombat
  ]);

  const handleNextTurn = () => {
    if (!combat) return;

    const current = getCurrentCombatant();
    if (!current) return;

    // If a target is selected, execute manual attack
    if (selectedTargetId) {
      const target = combat.combatants.find((c: Combatant) => c.id === selectedTargetId);
      if (target && !target.isDefeated) {
        const action = executeAttack(current, target);
        if (action) {
          console.log('[Combat]', action.result?.description);
        }
      }
      setSelectedTargetId(null);
    } else {
      // Auto-attack first living target (original behavior)
      const livingTargets = combat.combatants.filter((c: Combatant) => !c.isDefeated && c.id !== current.id);
      if (livingTargets.length > 0) {
        const target = livingTargets[0];
        const action = executeAttack(current, target);
        if (action) {
          console.log('[Combat]', action.result?.description);
        }
      }
    }

    const updated = nextTurn();
    if (updated && !updated.isActive) {
      const result = getCombatResult();
      console.log('[Combat]', `Combat ended! Winner: ${result?.winner.character.name}`);
    }
  };

  // Manual attack handler for specific attack and target (task 4.9.6)
  const handleManualAttack = (target: Combatant) => {
    if (!combat) return;

    const current = getCurrentCombatant();
    if (!current) return;

    const action = executeAttack(current, target);
    if (action) {
      console.log('[Combat]', action.result?.description);
    }

    const updated = nextTurn();
    if (updated && !updated.isActive) {
      const result = getCombatResult();
      console.log('[Combat]', `Combat ended! Winner: ${result?.winner.character.name}`);
    }

    setSelectedTargetId(null);
  };

  // Auto-play functionality (task 4.9.7)
  // Execute a single turn for auto-play
  const executeAutoPlayTurn = () => {
    if (!combat) return;

    // Start performance timer on first turn of auto-play
    if (combatStartTimeRef.current === null) {
      combatStartTimeRef.current = performance.now();
      logger.info('CombatEngine', 'Auto-play started', {
        combatId: combat.id,
        combatants: combat.combatants.length,
        autoPlayInterval: `${AUTO_PLAY_INTERVAL_MS / 1000}s`
      });
    }

    const current = getCurrentCombatant();
    if (!current) return;

    // Auto-attack first living target
    const livingTargets = combat.combatants.filter((c: Combatant) => !c.isDefeated && c.id !== current.id);
    if (livingTargets.length > 0) {
      const target = livingTargets[0];
      const action = executeAttack(current, target);
      if (action) {
        console.log('[Combat Auto-Play]', action.result?.description);
      }
    }

    const updated = nextTurn();
    if (updated && !updated.isActive) {
      // Calculate and log performance metrics
      const endTime = performance.now();
      const elapsedSeconds = combatStartTimeRef.current !== null
        ? ((endTime - combatStartTimeRef.current) / 1000).toFixed(2)
        : null;

      const result = getCombatResult();
      const totalTurns = combat?.history?.length || 0;
      const roundsElapsed = result?.roundsElapsed || 0;

      // Performance target: <5 seconds for 50-round combat
      // For shorter combats, we scale the target proportionally
      const expectedSeconds = (roundsElapsed / 50) * 5;
      const performanceTarget = elapsedSeconds !== null && parseFloat(elapsedSeconds) < expectedSeconds ? 'PASS' : 'FAIL';

      setCombatPerformance({
        totalTimeSeconds: elapsedSeconds,
        totalTurns,
        roundsElapsed,
        performanceTarget
      });

      logger.info('CombatEngine', 'Combat ended - Performance metrics', {
        combatId: combat.id,
        winner: result?.winner.character.name,
        roundsElapsed,
        totalTurns,
        combatTimeSeconds: elapsedSeconds,
        performanceTarget,
        expectedTarget: `${expectedSeconds.toFixed(2)}s for ${roundsElapsed} rounds`
      });

      console.log('[Combat Auto-Play]', `Combat ended! Winner: ${result?.winner.character.name}`);
      // Stop auto-play when combat ends
      setIsAutoPlaying(false);
      // Reset start time ref
      combatStartTimeRef.current = null;
    }
  };

  // Start auto-play (task 4.9.7)
  const handleStartAutoPlay = () => {
    setIsAutoPlaying(true);
  };

  // Pause auto-play (task 4.9.7)
  const handlePauseAutoPlay = () => {
    setIsAutoPlaying(false);
  };

  // Spell casting handlers (task 4.9.8)
  const handleCastSpell = () => {
    if (!combat || !selectedSpellName) return;

    const current = getCurrentCombatant();
    if (!current) return;

    // Get the spell from database
    const spell = SPELL_DATABASE[selectedSpellName];
    if (!spell) {
      console.warn('[Combat] Spell not found:', selectedSpellName);
      return;
    }

    // Get selected targets
    const targets = selectedTargetIds
      .map(id => combat.combatants.find((c: Combatant) => c.id === id))
      .filter((c): c is Combatant => c !== undefined && !c.isDefeated);

    if (targets.length === 0) {
      console.warn('[Combat] No valid targets selected for spell');
      return;
    }

    // Execute spell cast
    const action = executeCastSpell(current, spell, targets);
    if (action) {
      console.log('[Combat]', action.result?.description);
    }

    // Reset selections
    setSelectedSpellName(null);
    setSelectedTargetIds([]);

    // Advance to next turn
    const updated = nextTurn();
    if (updated && !updated.isActive) {
      const result = getCombatResult();
      console.log('[Combat]', `Combat ended! Winner: ${result?.winner.character.name}`);
    }
  };

  const handleTargetToggle = (targetId: string) => {
    setSelectedTargetIds(prev =>
      prev.includes(targetId)
        ? prev.filter(id => id !== targetId)
        : [...prev, targetId]
    );
  };

  // Auto-play interval effect (task 4.9.7)
  useEffect(() => {
    if (isAutoPlaying && isActive) {
      autoPlayIntervalRef.current = setInterval(() => {
        executeAutoPlayTurn();
      }, AUTO_PLAY_INTERVAL_MS);
    } else {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
        autoPlayIntervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, [isAutoPlaying, isActive]); // Note: executeAutoPlayTurn is not in deps to avoid recreating interval

  // Auto-scroll combat log to bottom (task 4.9.7)
  useEffect(() => {
    if (combatLogRef.current && combatLog.length > 0) {
      combatLogRef.current.scrollTop = combatLogRef.current.scrollHeight;
    }
  }, [combatLog.length]);

  // Award XP when combat ends (Task 3.4)
  // Updated in Phase 1.3: Check if winner is the player character instead of checking for 'Goblin'
  useEffect(() => {
    const result = combat && !combat.isActive ? getCombatResult() : null;
    const activeChar = getActiveCharacter();
    // Award XP if player (active character) won the combat
    if (result && activeChar && result.winner.character.name === activeChar.name) {
      // Award XP to the active character
      const xpResult = addXPFromSource(activeChar, result.xpAwarded, 'combat');

      console.log(`[Combat] ${activeChar.name} received ${result.xpAwarded} XP from combat!`);

      if (xpResult.leveledUp) {
        console.log(`[Combat] ${activeChar.name} leveled up to ${xpResult.newLevel}!`);
        // TODO: Could trigger level-up modal here if needed
      }

      setXpAwarded({
        amount: result.xpAwarded,
        characterName: activeChar.name,
        leveledUp: xpResult.leveledUp ?? false
      });
    }
    // Only run when combat transitions from active to inactive
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat?.isActive]);

  // Get combat result if combat has ended
  const combatResult = combat && !combat.isActive ? getCombatResult() : null;

  return (
    <div className="combat-container">
      <div className="combat-header">
        <h2 className="combat-title">Combat Engine</h2>
        {combat && <StatusIndicator status={isActive ? 'healthy' : 'error'} label={isActive ? 'Active' : 'Ended'} />}
      </div>

      {!getActiveCharacter() ? (
        <div className="combat-prompt">Generate a character first</div>
      ) : !combat ? (
        <div className="combat-pregame">
          {/* Phase 2.1: Enemy Configuration Panel */}
          <div className="combat-config-panel">
            <h3 className="combat-config-title">Enemy Configuration</h3>

            {/* Generation Mode Selector */}
            <div className="combat-config-section">
              <label className="combat-config-label">Generation Mode</label>
              <select
                value={generationConfig.mode}
                onChange={(e) => updateGenerationConfig('mode', e.target.value as EnemyGenerationMode)}
                className="combat-config-select"
              >
                <option value="single">Single Enemy</option>
                <option value="party-balanced">Party-Balanced Encounter</option>
                <option value="cr-based">CR-Based Encounter</option>
              </select>
              <p className="combat-config-hint">
                {generationConfig.mode === 'single' && 'Generate a single enemy based on template and rarity.'}
                {generationConfig.mode === 'party-balanced' && 'Generate an encounter balanced to your party\'s level and chosen difficulty.'}
                {generationConfig.mode === 'cr-based' && 'Generate enemies at a specific Challenge Rating regardless of party level.'}
              </p>
            </div>

            {/* Mode-specific config sections (Phase 2.1: Show/hide based on mode) */}

            {/* Single Enemy Options - shown only for single mode */}
            {generationConfig.mode === 'single' && (
              <div className="combat-config-section combat-config-section-highlight">
                {/* Template Selector - Phase 2.2 */}
                <div className="combat-config-field" style={{ marginBottom: '0.75rem' }}>
                  <label className="combat-config-label">Enemy Template</label>
                  <select
                    value={generationConfig.templateId || ''}
                    onChange={(e) => updateGenerationConfig('templateId', e.target.value || undefined)}
                    className="combat-config-select combat-template-select"
                  >
                    <option value="">Random (by category filter)</option>
                    {/* Group templates by category */}
                    {(Object.keys(CATEGORY_INFO) as EnemyCategory[]).map(category => {
                      const categoryTemplates = ENEMY_TEMPLATES.filter(t => t.category === category);
                      if (categoryTemplates.length === 0) return null;
                      const catInfo = CATEGORY_INFO[category];
                      return (
                        <optgroup key={category} label={`${catInfo.icon} ${catInfo.label}`}>
                          {categoryTemplates.map(template => {
                            const archInfo = ARCHETYPE_INFO[template.archetype];
                            return (
                              <option key={template.id} value={template.id}>
                                {template.name} [{archInfo.icon} {archInfo.label}]
                              </option>
                            );
                          })}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>

                {/* Selected Template Info - Phase 2.2 */}
                {generationConfig.templateId && (
                  <div className="combat-template-info">
                    {(() => {
                      const template = ENEMY_TEMPLATES.find(t => t.id === generationConfig.templateId);
                      if (!template) return null;
                      const archInfo = ARCHETYPE_INFO[template.archetype];
                      const catInfo = CATEGORY_INFO[template.category];
                      return (
                        <>
                          <div className="combat-template-badges">
                            <span
                              className="combat-template-badge combat-template-badge-category"
                              title={`Category: ${catInfo.label}`}
                            >
                              {catInfo.icon} {catInfo.label}
                            </span>
                            <span
                              className="combat-template-badge combat-template-badge-archetype"
                              style={{ backgroundColor: archInfo.color }}
                              title={`Archetype: ${archInfo.label}`}
                            >
                              {archInfo.icon} {archInfo.label}
                            </span>
                          </div>
                          <div className="combat-template-ability" title={template.signatureAbilityDescription}>
                            <span className="combat-template-ability-label">Signature:</span>
                            <span className="combat-template-ability-name">{template.signatureAbility}</span>
                            <span className="combat-template-ability-desc">{template.signatureAbilityDescription}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                <div className="combat-config-row">
                  {/* Rarity Selector with info - Phase 2.2 */}
                  <div className="combat-config-field">
                    <label className="combat-config-label">Rarity Tier</label>
                    <select
                      value={generationConfig.baseRarity}
                      onChange={(e) => updateGenerationConfig('baseRarity', e.target.value as EnemyRarity)}
                      className="combat-config-select"
                    >
                      <option value="common">Common</option>
                      <option value="uncommon">Uncommon</option>
                      <option value="elite">Elite</option>
                      <option value="boss">Boss</option>
                    </select>
                    {/* Rarity info tooltip - Phase 2.2 */}
                    <div className="combat-rarity-info">
                      {(() => {
                        const info = RARITY_INFO[generationConfig.baseRarity];
                        return (
                          <>
                            <span className="combat-rarity-multiplier">{info.multiplier} stats</span>
                            <span className="combat-rarity-abilities">
                              {info.extraAbilities > 0 ? `+${info.extraAbilities} abilities` : 'Signature only'}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Category Filter - optional when no template selected */}
                  <div className="combat-config-field">
                    <label className="combat-config-label">
                      Category Filter
                      {generationConfig.templateId && <span className="combat-config-optional"> (optional)</span>}
                    </label>
                    <select
                      value={generationConfig.category || ''}
                      onChange={(e) => updateGenerationConfig('category', (e.target.value || undefined) as EnemyCategory | undefined)}
                      className="combat-config-select"
                      disabled={!!generationConfig.templateId}
                    >
                      <option value="">Any Category</option>
                      {(Object.keys(CATEGORY_INFO) as EnemyCategory[]).map(cat => {
                        const info = CATEGORY_INFO[cat];
                        return (
                          <option key={cat} value={cat}>
                            {info.icon} {info.label}
                          </option>
                        );
                      })}
                    </select>
                    {generationConfig.templateId && (
                      <p className="combat-config-hint">Disabled when template is selected</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Party-Balanced Options - shown only for party-balanced mode */}
            {generationConfig.mode === 'party-balanced' && (
              <div className="combat-config-section combat-config-section-highlight">
                <div className="combat-config-row">
                  <div className="combat-config-field">
                    <label className="combat-config-label">Difficulty</label>
                    <select
                      value={generationConfig.difficulty}
                      onChange={(e) => updateGenerationConfig('difficulty', e.target.value as EncounterDifficulty)}
                      className="combat-config-select"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="deadly">Deadly</option>
                    </select>
                    {/* XP Budget Preview */}
                    {(() => {
                      const activeChar = getActiveCharacter();
                      if (!activeChar) return null;
                      const xpBudget = getXPBudgetPerLevel(activeChar.level, generationConfig.difficulty);
                      const difficultyInfo = DIFFICULTY_INFO[generationConfig.difficulty];
                      return (
                        <div className="combat-xp-preview" style={{ borderColor: difficultyInfo.color }}>
                          <span className="combat-xp-preview-label">XP Budget:</span>
                          <span className="combat-xp-preview-value">{xpBudget.toLocaleString()} XP</span>
                          <span className="combat-xp-preview-hint">({activeChar.level && `Level ${activeChar.level}`})</span>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="combat-config-field">
                    <label className="combat-config-label">Enemy Count</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={generationConfig.count}
                      onChange={(e) => updateGenerationConfig('count', Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="combat-config-input"
                    />
                  </div>
                </div>

                {/* Optional filters */}
                <div className="combat-config-row">
                  <div className="combat-config-field">
                    <label className="combat-config-label">
                      Category Filter
                      <span className="combat-config-optional"> (optional)</span>
                    </label>
                    <select
                      value={generationConfig.category || ''}
                      onChange={(e) => updateGenerationConfig('category', (e.target.value || undefined) as EnemyCategory | undefined)}
                      className="combat-config-select"
                    >
                      <option value="">Any Category</option>
                      {(Object.keys(CATEGORY_INFO) as EnemyCategory[]).map(cat => {
                        const info = CATEGORY_INFO[cat];
                        return (
                          <option key={cat} value={cat}>
                            {info.icon} {info.label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="combat-config-field">
                    <label className="combat-config-label">
                      Archetype Filter
                      <span className="combat-config-optional"> (optional)</span>
                    </label>
                    <select
                      value={generationConfig.archetype || ''}
                      onChange={(e) => updateGenerationConfig('archetype', (e.target.value || undefined) as EnemyArchetype | undefined)}
                      className="combat-config-select"
                    >
                      <option value="">Any Archetype</option>
                      {(Object.keys(ARCHETYPE_INFO) as EnemyArchetype[]).map(arch => {
                        const info = ARCHETYPE_INFO[arch];
                        return (
                          <option key={arch} value={arch}>
                            {info.icon} {info.label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Enemy Mix Mode */}
                <div className="combat-config-field">
                  <label className="combat-config-label">Enemy Mix Mode</label>
                  <select
                    value={generationConfig.enemyMix}
                    onChange={(e) => updateGenerationConfig('enemyMix', e.target.value as EnemyMixMode)}
                    className="combat-config-select"
                  >
                    <option value="uniform">Uniform - All same type</option>
                    <option value="category">Category Mix - Mix from category</option>
                    <option value="custom">Custom - Specify templates</option>
                    <option value="random">Random - Completely random</option>
                  </select>
                  <p className="combat-config-hint">
                    {ENEMY_MIX_INFO[generationConfig.enemyMix].description}
                    {generationConfig.enemyMix === 'category' && !generationConfig.category && (
                      <span className="combat-config-warning"> (Select a category filter above)</span>
                    )}
                  </p>
                </div>

                {/* Custom templates selector - shown only for custom mix mode */}
                {generationConfig.enemyMix === 'custom' && (
                  <div className="combat-config-field">
                    <label className="combat-config-label">Custom Templates</label>
                    <div className="combat-template-chips">
                      {ENEMY_TEMPLATES.map(template => {
                        const isSelected = generationConfig.templates?.includes(template.id) ?? false;
                        const archInfo = ARCHETYPE_INFO[template.archetype];
                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => {
                              const currentTemplates = generationConfig.templates || [];
                              const newTemplates = isSelected
                                ? currentTemplates.filter(id => id !== template.id)
                                : [...currentTemplates, template.id];
                              updateGenerationConfig('templates', newTemplates.length > 0 ? newTemplates : undefined);
                            }}
                            className={`combat-template-chip ${isSelected ? 'combat-template-chip-selected' : ''}`}
                          >
                            {template.name}
                            <span className="combat-template-chip-archetype" style={{ backgroundColor: archInfo.color }}>
                              {archInfo.icon}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {generationConfig.templates && generationConfig.templates.length > 0 && (
                      <p className="combat-config-hint">
                        {generationConfig.templates.length} template{generationConfig.templates.length !== 1 ? 's' : ''} selected.
                        {generationConfig.count > generationConfig.templates.length && ` Will cycle through templates for ${generationConfig.count} enemies.`}
                      </p>
                    )}

                    {/* Visual preview of enemy composition - Phase 2.5 */}
                    {generationConfig.templates && generationConfig.templates.length > 0 && (
                      <div className="combat-composition-preview">
                        <div className="combat-composition-preview-header">
                          <span className="combat-composition-preview-title">Enemy Composition Preview</span>
                          <span className="combat-composition-preview-count">
                            {generationConfig.count} {generationConfig.count === 1 ? 'enemy' : 'enemies'}
                          </span>
                        </div>
                        <div className="combat-composition-preview-grid">
                          {Array.from({ length: Math.min(generationConfig.count, 10) }).map((_, index) => {
                            // Cycle through templates
                            const templateId = generationConfig.templates![index % generationConfig.templates!.length];
                            const template = ENEMY_TEMPLATES.find(t => t.id === templateId);
                            if (!template) return null;
                            const archInfo = ARCHETYPE_INFO[template.archetype];
                            const catInfo = CATEGORY_INFO[template.category];
                            const isCycling = index >= generationConfig.templates!.length;

                            return (
                              <div
                                key={index}
                                className={`combat-composition-enemy ${isCycling ? 'combat-composition-enemy-cycled' : ''}`}
                                title={isCycling ? `Cycled from template #${(index % generationConfig.templates!.length) + 1}` : undefined}
                              >
                                <div className="combat-composition-enemy-index">{index + 1}</div>
                                <div className="combat-composition-enemy-icon" style={{ backgroundColor: archInfo.color }}>
                                  {archInfo.icon}
                                </div>
                                <div className="combat-composition-enemy-info">
                                  <span className="combat-composition-enemy-name">{template.name}</span>
                                  <span className="combat-composition-enemy-category">{catInfo.icon} {catInfo.label}</span>
                                </div>
                                {isCycling && (
                                  <span className="combat-composition-cycle-badge" title="This template is cycled from earlier selection">
                                    ↻
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {generationConfig.count > 10 && (
                          <p className="combat-composition-preview-truncated">
                            Showing first 10 of {generationConfig.count} enemies
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* CR-Based Options - shown only for CR-based mode */}
            {generationConfig.mode === 'cr-based' && (
              <div className="combat-config-section combat-config-section-highlight">
                <div className="combat-config-row">
                  <div className="combat-config-field">
                    <label className="combat-config-label">Target CR</label>
                    <select
                      value={generationConfig.targetCR}
                      onChange={(e) => updateGenerationConfig('targetCR', parseFloat(e.target.value))}
                      className="combat-config-select"
                    >
                      <option value="0.25">CR 1/4</option>
                      <option value="0.5">CR 1/2</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(cr => (
                        <option key={cr} value={cr}>CR {cr}</option>
                      ))}
                    </select>
                  </div>
                  <div className="combat-config-field">
                    <label className="combat-config-label">Enemy Count</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={generationConfig.count}
                      onChange={(e) => updateGenerationConfig('count', Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="combat-config-input"
                    />
                  </div>
                  <div className="combat-config-field">
                    <label className="combat-config-label">Base Rarity</label>
                    <select
                      value={generationConfig.baseRarity}
                      onChange={(e) => updateGenerationConfig('baseRarity', e.target.value as EnemyRarity)}
                      className="combat-config-select"
                    >
                      <option value="common">Common</option>
                      <option value="uncommon">Uncommon</option>
                      <option value="elite">Elite</option>
                    </select>
                  </div>
                </div>

                {/* Total Encounter XP Preview */}
                {(() => {
                  // Calculate total encounter XP based on CR and enemy count
                  const xpPerEnemy = getXPForCR(generationConfig.targetCR);
                  const encounterMultiplier = getEncounterMultiplier(generationConfig.count);
                  const enemyCRs = Array(generationConfig.count).fill(generationConfig.targetCR);
                  const totalXP = calculateAdjustedXP(enemyCRs, encounterMultiplier);

                  // Determine difficulty color based on XP
                  const xpColor = totalXP >= 5000 ? 'hsl(0 84% 60%)' :  // Deadly - red
                                  totalXP >= 2000 ? 'hsl(24 95% 53%)' :  // Hard - orange
                                  totalXP >= 1000 ? 'hsl(48 96% 53%)' :  // Medium - yellow
                                  'hsl(142 70% 50%)';  // Easy - green

                  return (
                    <div className="combat-xp-preview" style={{ borderColor: xpColor, marginTop: '0.75rem' }}>
                      <div className="combat-xp-preview-row">
                        <span className="combat-xp-preview-label">Base XP/Enemy:</span>
                        <span className="combat-xp-preview-value">{xpPerEnemy.toLocaleString()} XP</span>
                        <span className="combat-xp-preview-hint">(CR {generationConfig.targetCR < 1 ? `1/${1/generationConfig.targetCR}` : generationConfig.targetCR})</span>
                      </div>
                      <div className="combat-xp-preview-row">
                        <span className="combat-xp-preview-label">Encounter Multiplier:</span>
                        <span className="combat-xp-preview-value">×{encounterMultiplier}</span>
                        <span className="combat-xp-preview-hint">({generationConfig.count} {generationConfig.count === 1 ? 'enemy' : 'enemies'})</span>
                      </div>
                      <div className="combat-xp-preview-row combat-xp-preview-total">
                        <span className="combat-xp-preview-label">Total Encounter XP:</span>
                        <span className="combat-xp-preview-value" style={{ color: xpColor }}>{totalXP.toLocaleString()} XP</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Generated Enemies Preview */}
            {generatedEnemies.length > 0 && (
              <div className="combat-config-preview">
                <h4 className="combat-config-preview-title">
                  Generated Enemies ({generatedEnemies.length})
                </h4>
                <div className="combat-config-preview-list">
                  {generatedEnemies.map((enemy, index) => (
                    <div key={index} className="combat-config-enemy-card">
                      <div className="combat-config-enemy-name">{enemy.name}</div>
                      <div className="combat-config-enemy-details">
                        {enemy.race} {enemy.class} • Level {enemy.level} • HP: {enemy.hp.max}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="combat-config-actions">
              <button
                onClick={handleGenerateEnemiesWithLoading}
                disabled={isGenerating}
                className={`combat-config-button combat-config-button-secondary ${isGenerating ? 'combat-config-button-disabled' : ''}`}
              >
                {isGenerating ? 'Generating...' : 'Generate Enemies'}
              </button>
              <button
                onClick={handleStartCombat}
                disabled={generatedEnemies.length === 0}
                className={`combat-config-button combat-config-button-primary ${generatedEnemies.length === 0 ? 'combat-config-button-disabled' : ''}`}
              >
                Start Combat
              </button>
            </div>

            {/* Help text when no enemies generated */}
            {generatedEnemies.length === 0 && (
              <p className="combat-config-help">
                Generate enemies before starting combat, or click Start Combat to use a random fallback enemy.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="combat-content">
          {/* Combat Info */}
          <div className="combat-stats">
            <div className="combat-stat-text combat-stat-padding">Round: <span className="combat-stat-bold">{roundNumber}</span></div>
            <div className="combat-stat-text combat-stat-padding">Turn: <span className="combat-stat-bold">{currentTurnIndex !== null ? currentTurnIndex + 1 : '-'}</span></div>
          </div>

          {/* Manual Attack Controls - Task 4.9.6 */}
          {isActive && combat && (
            <div className="combat-controls">
              <h3 className="combat-controls-title">Manual Attack Controls</h3>
              <div className="combat-controls-description">
                Choose a target to attack instead of auto-attacking the first available target.
              </div>

              {/* Available attacks for current combatant */}
              <div className="combat-controls-section">
                <div className="combat-controls-label">Available Attacks:</div>
                {(() => {
                  const current = getCurrentCombatant();
                  if (!current) return <div className="combat-attacks-empty">No current combatant</div>;

                  const weapons = current.character.equipment?.weapons ?? [];
                  if (weapons.length === 0) {
                    return (
                      <div className="combat-unarmed-attack">
                        <span className="combat-attack-badge">Unarmed Strike</span>
                        <span className="combat-attack-muted">1 damage, bludgeoning</span>
                      </div>
                    );
                  }

                  return (
                    <div className="combat-attacks-grid">
                      {weapons.map((weapon: any, index: number) => (
                        <div key={index} className="combat-attack-card">
                          <div className="combat-attack-name">{weapon.name}</div>
                          <div className="combat-attack-damage">
                            {weapon.damage_dice} {weapon.damage_type} {weapon.type === 'melee' ? '⚔️' : '🏹'}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Available targets */}
              <div className="combat-controls-section">
                <div className="combat-controls-label">Available Targets:</div>
                <div className="combat-targets-grid">
                  {getLivingCombatants()
                    .filter((c: Combatant) => {
                      const current = getCurrentCombatant();
                      return current && c.id !== current.id;
                    })
                    .map((target: Combatant) => (
                      <button
                        key={target.id}
                        onClick={() => handleManualAttack(target)}
                        className={`combat-target-button ${selectedTargetId === target.id ? 'combat-target-button-selected' : ''}`}
                      >
                        <div className="combat-target-name">{target.character.name}</div>
                        <div className="combat-target-hp">
                          {target.character.race} {target.character.class} • HP: {target.currentHP}/{target.character.hp.max}
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              <div className="combat-controls-hint">
                Click a target to perform an attack with your current combatant's available weapon(s).
              </div>
            </div>
          )}

          {/* Spell Casting UI - Task 4.9.8 */}
          {isActive && combat && (() => {
            const current = getCurrentCombatant();
            return current && isSpellcaster(current.character);
          })() && (
            <div className="combat-spell-section">
              <h3 className="combat-spell-header">
                <span>✨ Spell Casting</span>
                <span className="combat-spell-class-badge">
                  {getCurrentCombatant()?.character.class}
                </span>
              </h3>

              {/* Spell slots remaining */}
              <div className="combat-spell-slots">
                <div className="combat-spell-slots-label">Spell Slots Remaining:</div>
                {(() => {
                  const current = getCurrentCombatant();
                  if (!current?.spellSlots) return null;

                  const slots = Object.entries(current.spellSlots)
                    .filter(([_, count]) => count > 0 || parseInt(_) > 0)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b));

                  if (slots.length === 0) {
                    return <div className="combat-slots-empty">No spell slots remaining</div>;
                  }

                  return (
                    <div className="combat-spell-slots-grid">
                      {slots.map(([level, count]) => (
                        <div key={level} className="combat-spell-slot-badge">
                          Level {level}: <span className={`font-bold ${count === 0 ? 'combat-spell-slot-unavailable' : 'combat-spell-slot-available'}`}>{count}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Known spells */}
              <div className="combat-spells-list">
                <div className="combat-spells-label">Known Spells:</div>
                <div className="combat-spells-grid">
                  {(() => {
                    const current = getCurrentCombatant();
                    if (!current?.character.spells) return <div className="combat-stat-text">No spells available</div>;

                    const allSpells = [
                      ...(current.character.spells.cantrips || []).map(name => ({ name, level: 0 })),
                      ...(current.character.spells.known_spells || []).map(name => {
                        const spell = SPELL_DATABASE[name];
                        return { name, level: spell?.level || 1 };
                      })
                    ];

                    return allSpells.map((spell) => {
                      const spellData = SPELL_DATABASE[spell.name];
                      if (!spellData) return null;

                      const isSelected = selectedSpellName === spell.name;
                      const isCantrip = spell.level === 0;
                      const hasSlot = isCantrip || (current.spellSlots && (current.spellSlots[spell.level] || 0) > 0);

                      return (
                        <button
                          key={spell.name}
                          onClick={() => setSelectedSpellName(spell.name)}
                          disabled={!hasSlot}
                          className={`combat-spell-button ${!hasSlot ? 'combat-spell-button-disabled' : ''} ${isSelected ? 'combat-spell-button-selected' : ''}`}
                        >
                          <div className="combat-spell-name">{spell.name}</div>
                          <div className="combat-spell-details">
                            {getSpellLevelText(spell.level)} • {spellData.school}
                            {!hasSlot && !isCantrip && ' • No slots'}
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Target selection for spells */}
              {selectedSpellName && (
                <div className="combat-spell-targets">
                  <div className="combat-spell-targets-label">Select Target(s):</div>
                  <div className="combat-targets-grid">
                    {getLivingCombatants()
                      .filter((c: Combatant) => {
                        const current = getCurrentCombatant();
                        return current && c.id !== current.id;
                      })
                      .map((target: Combatant) => (
                        <button
                          key={target.id}
                          onClick={() => handleTargetToggle(target.id)}
                          className={`combat-target-button ${selectedTargetIds.includes(target.id) ? 'combat-target-button-selected' : ''}`}
                        >
                          <div className="combat-target-name">{target.character.name}</div>
                          <div className="combat-target-hp">
                            HP: {target.currentHP}/{target.character.hp.max}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Cast button */}
              {selectedSpellName && selectedTargetIds.length > 0 && (
                <div className="combat-spell-cast-row">
                  <button
                    onClick={handleCastSpell}
                    className="combat-spell-cast-button"
                  >
                    <span>✨</span> Cast {selectedSpellName}
                  </button>
                  <span className="combat-spell-target-count">
                    on {selectedTargetIds.length} target{selectedTargetIds.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {selectedSpellName && selectedTargetIds.length === 0 && (
                <div className="combat-spell-warning">
                  ⚠️ Select at least one target to cast this spell
                </div>
              )}
            </div>
          )}

          {/* Combat Area: Initiative Order + Combatant Cards */}
          <div className="combat-area">
            {/* Initiative Order Sidebar - Task 4.9.2 */}
            <div className="combat-initiative">
              <div className="combat-initiative-inner">
                <h3 className="combat-initiative-title">Initiative Order</h3>
                <div className="combat-initiative-list">
                  {combat.combatants
                    .sort((a: Combatant, b: Combatant) => b.initiative - a.initiative)
                    .map((combatant: Combatant, index: number) => {
                      const current = getCurrentCombatant();
                      const isCurrentTurn = current?.id === combatant.id;

                      return (
                        <div
                          key={combatant.id}
                          className={`combat-initiative-item ${
                            isCurrentTurn
                              ? 'combat-initiative-item-current'
                              : combatant.isDefeated
                              ? 'combat-initiative-item-defeated'
                              : ''
                          }`}
                        >
                          <div className="combat-initiative-row">
                            <span className="combat-initiative-number">{index + 1}.</span>
                            <span className="combat-initiative-name">{combatant.character.name}</span>
                            <span className="combat-initiative-value">{combatant.initiative}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Combatant Cards */}
            <div className="combat-combatants">
              <div className="combat-combatants-grid">
                {combat.combatants.map((combatant: Combatant) => {
                  const current = getCurrentCombatant();
                  const isCurrentTurn = current?.id === combatant.id;
                  const hpPercent = (combatant.currentHP / combatant.character.hp.max) * 100;
                  const hpColor = hpPercent > 50 ? 'combat-combatant-hp-fill-green' : hpPercent > 25 ? 'combat-combatant-hp-fill-yellow' : 'combat-combatant-hp-fill-red';

                  // Check if this is an enemy combatant and get template metadata
                  const enemyIsEnemy = isEnemy(combatant.character);
                  const enemyTemplate = enemyIsEnemy ? getEnemyTemplateByName(combatant.character.name) : undefined;
                  const enemyCatInfo = enemyTemplate ? CATEGORY_INFO[enemyTemplate.category] : undefined;
                  const enemyArchInfo = enemyTemplate ? ARCHETYPE_INFO[enemyTemplate.archetype] : undefined;
                  const enemyRarity = combatant.character.subrace as EnemyRarity | undefined;

                  return (
                    <div
                      key={combatant.id}
                      className={`combat-combatant-card ${isCurrentTurn ? 'combat-combatant-card-current' : ''} ${combatant.isDefeated ? 'combat-combatant-card-defeated' : ''} ${enemyIsEnemy ? 'combat-combatant-card-enemy' : ''} ${enemyRarity ? `combat-combatant-card-${enemyRarity}` : ''}`}
                    >
                      <div className="combat-combatant-header">
                        <div>
                          <h3 className="combat-combatant-name">{combatant.character.name}</h3>
                          {/* Show category/archetype badges for enemies, race/class for player characters */}
                          {enemyIsEnemy && enemyTemplate ? (
                            <div className="combat-combatant-badges">
                              {enemyCatInfo && (
                                <span className="combat-enemy-badge combat-enemy-badge-category" title={`Category: ${enemyCatInfo.label}`}>
                                  {enemyCatInfo.icon} {enemyCatInfo.label}
                                </span>
                              )}
                              {enemyArchInfo && (
                                <span
                                  className="combat-enemy-badge combat-enemy-badge-archetype"
                                  style={{ backgroundColor: enemyArchInfo.color }}
                                  title={`Archetype: ${enemyArchInfo.label}`}
                                >
                                  {enemyArchInfo.icon} {enemyArchInfo.label}
                                </span>
                              )}
                              {enemyRarity && (
                                <span className={`combat-enemy-badge combat-enemy-badge-rarity combat-enemy-badge-rarity-${enemyRarity}`}>
                                  {enemyRarity.charAt(0).toUpperCase() + enemyRarity.slice(1)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="combat-combatant-class">{combatant.character.race} {combatant.character.class}</div>
                          )}
                        </div>
                        {isCurrentTurn && <span className="combat-combatant-badge">Current</span>}
                      </div>

                      <div className="combat-combatant-hp-section">
                        <div className="combat-combatant-hp-header">
                          <span>HP</span>
                          <span>{combatant.currentHP} / {combatant.character.hp.max}</span>
                        </div>
                        <div className="combat-combatant-hp-bar">
                          <div className={`combat-combatant-hp-fill ${hpColor}`} style={{ width: `${hpPercent}%` }} />
                        </div>
                      </div>

                      <div className="combat-combatant-stats">
                        <div>Initiative: <span className="combat-stat-bold">{combatant.initiative}</span></div>
                        {combatant.isDefeated && <span className="combat-combatant-defeated">Defeated</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Combat Log - Task 4.9.3 */}
          {combatLog.length > 0 && (
            <div className="combat-log-section">
              <div className="combat-log-header">
                <h3 className="combat-log-title">Combat Log</h3>
                {isAutoPlaying && <span className="combat-log-autoscroll combat-log-autoscroll-pulse">● Auto-scrolling</span>}
              </div>
              <div ref={combatLogRef} className="combat-log-container">
                {combatLog.map((action: any, index: number) => {
                  const borderColor = getLogEntryColor(action);
                  const actionRound = getActionRound(index, combat.combatants.length);
                  const isSuccessHit = action.result?.success === true && action.type === 'attack';
                  const isMiss = action.result?.success === false;
                  const isSpell = action.type === 'spell';

                  return (
                    <div
                      key={index}
                      className={`combat-log-entry ${borderColor}`}
                    >
                      {/* Round number and action type */}
                      <div className="combat-log-meta">
                        <span className="combat-log-round">
                          Round {actionRound}
                        </span>
                        <span className="combat-log-actor">
                          {action.actor.character.name}
                        </span>
                        <span className="combat-log-action">
                          used {action.type === 'attack' ? 'an attack' : action.type}
                        </span>
                        {action.target && (
                          <span className="combat-log-action">
                            on <span className="combat-log-target-name">{action.target.character.name}</span>
                          </span>
                        )}
                      </div>

                      {/* Action details */}
                      {action.attack && (
                        <div className="combat-log-detail">
                          Weapon: <span className="combat-log-detail-value">{action.attack.name}</span>
                        </div>
                      )}

                      {/* Roll values */}
                      {action.result?.roll !== undefined && (
                        <div className="combat-log-detail">
                          <span className="combat-log-detail-label">Roll:</span>{' '}
                          <span className={`combat-log-detail-value ${isSuccessHit ? 'combat-log-roll' : isMiss ? 'combat-log-roll-miss' : ''}`}>
                            d20 {action.result.roll >= 0 ? '+' : ''}{action.result.roll}
                          </span>
                          {action.result.isCritical && (
                            <span className="combat-log-roll-crit">🎯 CRITICAL!</span>
                          )}
                        </div>
                      )}

                      {/* Hit/Miss result */}
                      {action.result?.success !== undefined && (
                        <div className="combat-log-detail">
                          <span className="combat-log-detail-label">Result:</span>{' '}
                          <span className={`combat-log-detail-value ${isSuccessHit ? 'combat-log-roll' : 'combat-log-roll-miss'}`}>
                            {isSuccessHit ? '✓ HIT' : '✗ MISS'}
                          </span>
                        </div>
                      )}

                      {/* Damage dealt */}
                      {action.result?.damage !== undefined && action.result?.success && (
                        <div className="combat-log-detail">
                          <span className="combat-log-detail-label">Damage:</span>{' '}
                          <span className="combat-log-detail-value combat-log-damage">
                            {action.result.damage} {action.result.damageType || ''}
                          </span>
                        </div>
                      )}

                      {/* HP change */}
                      {action.result?.targetHP !== undefined && (
                        <div className="combat-log-detail">
                          <span className="combat-log-detail-label">Target HP:</span>{' '}
                          <span className={`combat-log-detail-value ${action.result.targetHP < 10 ? 'combat-log-low-hp' : ''}`}>
                            {action.result.targetHP} / {action.target?.character.hp.max || '?'}
                          </span>
                        </div>
                      )}

                      {/* Spell details */}
                      {isSpell && action.spell && (
                        <div className="combat-log-detail combat-log-spell">
                          <span className="combat-log-detail-value">{action.spell.name}</span>
                          {action.result?.description && (
                            <span className="combat-log-detail-label combat-log-detail-margin">({action.result.description})</span>
                          )}
                        </div>
                      )}

                      {/* Status effects */}
                      {action.result?.statusEffects && action.result.statusEffects.length > 0 && (
                        <div className="combat-log-detail combat-log-status">
                          Status: {action.result.statusEffects.map((e: any) => e.name).join(', ')}
                        </div>
                      )}

                      {/* Description as fallback */}
                      {!action.result?.roll && !action.result?.damage && action.result?.description && (
                        <div className="combat-log-description">
                          {action.result.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Victory Overlay - Task 4.9.5 */}
          {combatResult && (
            <div className="combat-victory-overlay">
              <div className="combat-victory-card">
                <h2 className="combat-victory-title">⚔️ Victory! ⚔️</h2>

                <div className="combat-victory-stats">
                  <div className="combat-victory-stat">
                    <span className="combat-victory-stat-label">Winner</span>
                    <span className="combat-victory-stat-value">{combatResult.winner.character.name}</span>
                  </div>

                  <div className="combat-victory-stat">
                    <span className="combat-victory-stat-label">XP Awarded</span>
                    <span className="combat-victory-stat-value combat-victory-xp">
                      +{combatResult.xpAwarded} XP
                      {xpAwarded && <span className="combat-victory-xp-recipient"> to {xpAwarded.characterName}</span>}
                      {xpAwarded?.leveledUp && <span className="combat-victory-levelup"> 🎉 LEVEL UP!</span>}
                    </span>
                  </div>

                  <div className="combat-victory-stat">
                    <span className="combat-victory-stat-label">Rounds Elapsed</span>
                    <span className="combat-victory-stat-value">{combatResult.roundsElapsed}</span>
                  </div>

                  <div className="combat-victory-stat">
                    <span className="combat-victory-stat-label">Total Turns</span>
                    <span className="combat-victory-stat-value">{combatResult.totalTurns}</span>
                  </div>

                  {/* Performance metrics (Phase 5.5.2) */}
                  {combatPerformance && (
                    <>
                      <div className="combat-victory-stat">
                        <span className="combat-victory-stat-label">Combat Time</span>
                        <span className={`combat-victory-stat-value ${combatPerformance.performanceTarget === 'PASS' ? 'combat-victory-performance-pass' : 'combat-victory-performance-fail'}`}>
                          {combatPerformance.totalTimeSeconds}s
                        </span>
                      </div>
                      <div className="combat-victory-stat">
                        <span className="combat-victory-stat-label">Performance</span>
                        <span className={`combat-victory-performance-badge ${
                          combatPerformance.performanceTarget === 'PASS'
                            ? 'combat-victory-performance-pass'
                            : 'combat-victory-performance-fail'
                        }`}>
                          {combatPerformance.performanceTarget}
                        </span>
                      </div>
                    </>
                  )}

                  {combatResult.description && (
                    <div className="combat-victory-description">
                      <div className="combat-victory-description-text">
                        {combatResult.description}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={resetCombat}
                  className="combat-victory-restart"
                >
                  Restart Combat
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons - Hide when combat ended */}
          {isActive && (
            <div className="combat-actions">
              {/* Manual control buttons */}
              <button
                onClick={handleNextTurn}
                disabled={isAutoPlaying}
                className={`combat-action-button combat-button combat-button-primary ${isAutoPlaying ? 'combat-button-disabled' : ''}`}
              >
                Next Turn
              </button>

              {/* Auto-play buttons (task 4.9.7) */}
              {!isAutoPlaying ? (
                <button
                  onClick={handleStartAutoPlay}
                  className="combat-action-button combat-button combat-button-green"
                >
                  <span>▶</span> Auto-Play
                </button>
              ) : (
                <button
                  onClick={handlePauseAutoPlay}
                  className="combat-action-button combat-button combat-button-amber"
                >
                  <span>⏸</span> Pause
                </button>
              )}

              <button
                onClick={resetCombat}
                className="combat-action-button combat-button combat-button-muted"
              >
                Reset Combat
              </button>

              {/* Auto-play status indicator (task 4.9.7) */}
              {isAutoPlaying && (
                <div className="combat-autoplay-status">
                  <span className="combat-autoplay-label">Auto-playing...</span>
                  <span className="combat-autoplay-interval">({AUTO_PLAY_INTERVAL_MS / 1000}s per turn)</span>
                </div>
              )}
            </div>
          )}

          {/* Raw JSON Dump - Task 4.9.10 */}
          <div className="combat-dump-section">
            <div className="combat-dump-header">
              <h3 className="combat-dump-title">Combat Engine Data</h3>
              <StatusIndicator status={isActive ? 'healthy' : 'error'} label={isActive ? 'Active' : 'Ended'} />
            </div>
            <RawJsonDump data={combat} title="Combat Instance JSON" defaultOpen={false} />
          </div>
        </div>
      )}
    </div>
  );
}

export default CombatSimulatorTab;
