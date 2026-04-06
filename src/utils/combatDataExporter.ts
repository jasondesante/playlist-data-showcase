/**
 * Combat Data Exporter Utility
 *
 * Provides functions for exporting combat data at different stages
 * (pre-combat, during combat, post-combat) as JSON for balance analysis.
 *
 * Part of Combat Data Export System - Phase 1.
 */

import { showToast } from '../components/ui/Toast';
import type { CharacterSheet, CombatInstance, Combatant, CombatAction, PartyAnalysis } from 'playlist-data-engine';

// Helper function to check if a character is an enemy
function isEnemy(character: CharacterSheet): boolean {
  return character.race === 'Enemy' && character.class === 'Monster';
}

// Engine version for reproducibility in exports
const ENGINE_VERSION = 'playlist-data-engine@1.0.0';

// =============================================================================
// Type Definitions
// =============================================================================

export type ExportType = 'pre-combat' | 'combat-log' | 'post-combat' | 'full';

// =============================================================================
// Optimized Combat Log Types (Reference-based to reduce redundancy)
// =============================================================================

/**
 * Lightweight character summary for combat logs.
 * Contains only the essential info needed to understand combat actions,
 * without the full CharacterSheet bloat.
 */
export interface CharacterSummary {
  /** Unique ID used as reference key */
  id: string;
  /** Display name */
  name: string;
  /** Character class or monster type */
  class: string;
  /** Character level / CR */
  level: number;
  /** Max HP for reference */
  maxHP: number;
  /** Armor Class */
  ac: number;
  /** Side in combat */
  side: 'party' | 'enemy';
  /** Primary attack bonus (for understanding hit chances) */
  attackBonus?: number;
  /** Average damage potential (for understanding threat level) */
  avgDamage?: number;
}

/**
 * Lightweight combatant state that references CharacterSummary by ID.
 * This is what gets tracked per-turn without repeating character data.
 */
export interface CombatantStateRef {
  /** Reference to character in registry */
  characterId: string;
  /** Current HP at this point */
  currentHP: number;
  /** Temporary HP if any */
  temporaryHP?: number;
  /** Status effect names only */
  statusEffects: string[];
  /** Whether defeated */
  isDefeated: boolean;
}

/**
 * Lightweight action log entry using references.
 * Replaces full CombatAction with minimal data pointing to actors.
 */
export interface ActionLogEntry {
  /** Round number */
  round: number;
  /** Turn order index */
  turnIndex: number;
  /** Reference to actor in registry */
  actorId: string;
  /** Reference to target in registry (if applicable) */
  targetId?: string;
  /** Type of action taken */
  actionType: 'attack' | 'spell' | 'dodge' | 'dash' | 'disengage' | 'help' | 'hide' | 'ready' | 'flee' | 'useItem' | 'legendaryAction' | 'statusEffectTick';
  /** Attack or spell name */
  actionName?: string;
  /** Action result summary */
  result?: {
    /** Whether the action succeeded */
    success: boolean;
    /** d20 roll (for attacks) */
    roll?: number;
    /** Whether critical hit */
    isCritical?: boolean;
    /** Damage dealt */
    damage?: number;
    /** Damage type */
    damageType?: string;
    /** Target HP after action */
    targetHPAfter?: number;
  };
  /** Human-readable description */
  description: string;
}

export interface PreCombatExportData {
  timestamp: string;
  exportType: 'pre-combat';
  engineVersion: string;

  // Party Data
  partyMode: 'solo' | 'party';
  partyMembers: CharacterSheet[];
  partyAnalysis: {
    partySize: number;
    averageLevel: number;
    averageAC: number;
    averageHP: number;
    totalStrength: number;
    averageDamage: number;
    easyXP: number;
    mediumXP: number;
    hardXP: number;
    deadlyXP: number;
  };

  // Enemy Generation Config
  generationConfig: EnemyGenerationConfigExport;

  // Generated Enemies
  generatedEnemies: CharacterSheet[];

  // Advanced Settings
  advancedConfig: AdvancedCombatConfigExport;
  treasureConfig: TreasureGenerationConfigExport;

  // Metadata
  characterStrategies: Record<string, string>;
  uncappedConfig: Record<string, string>;
}

/**
 * Optimized Combat Log Export Data
 *
 * Uses a reference-based approach to avoid data redundancy:
 * - Characters are defined ONCE in the registry
 * - Combatant states reference characters by ID
 * - Action log entries reference actors/targets by ID
 *
 * This dramatically reduces file size for AI analysis while
 * preserving all essential combat information.
 */
export interface CombatLogExportData {
  timestamp: string;
  exportType: 'combat-log';
  engineVersion: string;

  // Character Registry (defined once, referenced by ID throughout)
  characterRegistry: Record<string, CharacterSummary>;

  // Combat Instance State (minimal metadata)
  combatState: {
    id: string;
    roundNumber: number;
    currentTurnIndex: number;
    isActive: boolean;
    winnerId?: string;
    winnerName?: string;
    startTime: number;
    lastUpdated: number;
  };

  // Initial combatant states (at combat start)
  initialStates: CombatantStateRef[];

  // Final combatant states (at export time)
  finalStates: CombatantStateRef[];

  // Action log using references (lightweight)
  actionLog: ActionLogEntry[];

  // Derived Stats (for quick analysis)
  combatStats: {
    totalRounds: number;
    totalTurns: number;
    totalDamageDealt: {
      byParty: number;
      byEnemies: number;
    };
    criticalHits: number;
    avgDamagePerRound: number;
    partyMembersDefeated: number;
    enemiesDefeated: number;
  };

  // Configuration reference (minimal, not full objects)
  generationConfigRef: {
    difficulty: string;
    targetCR: number;
    enemyCount: number;
  };
  advancedConfigRef: {
    tacticalMode: boolean;
    useMusic: boolean;
  };
}

export interface PostCombatExportData {
  timestamp: string;
  exportType: 'post-combat';
  engineVersion: string;

  // Combat Result
  combatResult: {
    winner: string;
    winnerSide: 'party' | 'enemy';
    roundsElapsed: number;
    totalTurns: number;
  };

  // Performance Metrics
  performance: {
    totalTimeSeconds: number | null;
    roundsElapsed: number;
    totalTurns: number;
  };

  // XP Distribution
  xpAwarded: {
    totalXP: number;
    distribution: Array<{
      name: string;
      xpReceived: number;
      leveledUp: boolean;
      newLevel?: number;
    }>;
  };

  // Treasure (if enabled)
  treasure?: {
    gold: number;
    items: Array<{ name: string; type: string; tags?: string[] }>;
  };

  // Encounter Summary
  encounterSummary: {
    enemyCount: number;
    enemyTypes: Array<{ name: string; category: string; level: number }>;
    totalEnemyXP: number;
    adjustedXP: number;
    difficultyRating: string;
  };

  // Full context for analysis
  preCombatData: PreCombatExportData;
  combatLog: CombatLogExportData;
}

export interface FullCombatExportData {
  timestamp: string;
  exportType: 'full';
  engineVersion: string;
  preCombat: PreCombatExportData;
  combatLog?: CombatLogExportData;
  postCombat?: PostCombatExportData;
}

// Simplified config types for export (avoiding full interface dependencies)
export interface EnemyGenerationConfigExport {
  mode: string;
  difficulty: string;
  targetCR: number;
  baseRarity: string;
  enemyMix: string;
  difficultyMultiplier: number;
  count: number;
  seed: string;
  deterministic: boolean;
  [key: string]: unknown;
}

export interface AdvancedCombatConfigExport {
  useEnvironment: boolean;
  tacticalMode: boolean;
  useMusic: boolean;
  allowFleeing: boolean;
  maxTurnsBeforeDraw: number;
  [key: string]: unknown;
}

export interface TreasureGenerationConfigExport {
  enabled: boolean;
  goldMode: string;
  goldFixed: number;
  goldMin: number;
  goldMax: number;
  [key: string]: unknown;
}

// =============================================================================
// Core Export Functions
// =============================================================================

/**
 * Convert data to formatted JSON string with 2-space indentation
 */
export function exportToJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Get current ISO timestamp
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Generate a timestamped filename for downloads
 */
export function generateFilename(type: ExportType, extra?: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  switch (type) {
    case 'pre-combat':
      return `combat-pre-${timestamp}.json`;
    case 'combat-log':
      return `combat-log-${extra || 'unknown'}-${timestamp}.json`;
    case 'post-combat':
      return `combat-result-${extra || 'complete'}-${timestamp}.json`;
    case 'full':
      return `combat-full-${timestamp}.json`;
    default:
      return `combat-export-${timestamp}.json`;
  }
}

/**
 * Copy text to clipboard with feedback
 * @returns Promise<boolean> indicating success
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success', 1500);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    showToast('Failed to copy to clipboard', 'error', 2000);
    return false;
  }
}

/**
 * Download data as a JSON file
 */
export function downloadAsFile(data: unknown, filename: string): boolean {
  try {
    const json = exportToJson(data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`, 'success', 1500);
    return true;
  } catch (error) {
    console.error('Failed to download file:', error);
    showToast('Failed to download file', 'error', 2000);
    return false;
  }
}

// =============================================================================
// Export Data Builders
// =============================================================================

/**
 * Build pre-combat export data from component state
 */
export function buildPreCombatExportData(
  partyMode: 'solo' | 'party',
  partyMembers: CharacterSheet[],
  partyAnalysis: PartyAnalysis | null,
  generationConfig: EnemyGenerationConfigExport,
  generatedEnemies: CharacterSheet[],
  advancedConfig: AdvancedCombatConfigExport,
  treasureConfig: TreasureGenerationConfigExport,
  characterStrategies: Record<string, string>,
  uncappedConfig: Record<string, string>
): PreCombatExportData {
  return {
    timestamp: getTimestamp(),
    exportType: 'pre-combat',
    engineVersion: ENGINE_VERSION,
    partyMode,
    partyMembers,
    partyAnalysis: partyAnalysis ? {
      partySize: partyAnalysis.partySize,
      averageLevel: partyAnalysis.averageLevel,
      averageAC: partyAnalysis.averageAC,
      averageHP: partyAnalysis.averageHP,
      totalStrength: partyAnalysis.totalStrength,
      averageDamage: partyAnalysis.averageDamage,
      easyXP: partyAnalysis.easyXP,
      mediumXP: partyAnalysis.mediumXP,
      hardXP: partyAnalysis.hardXP,
      deadlyXP: partyAnalysis.deadlyXP,
    } : {
      partySize: partyMembers.length,
      averageLevel: 0,
      averageAC: 0,
      averageHP: 0,
      totalStrength: 0,
      averageDamage: 0,
      easyXP: 0,
      mediumXP: 0,
      hardXP: 0,
      deadlyXP: 0,
    },
    generationConfig,
    generatedEnemies,
    advancedConfig,
    treasureConfig,
    characterStrategies,
    uncappedConfig,
  };
}

/**
 * Build character summary from full CharacterSheet (lightweight for registry)
 */
function buildCharacterSummary(
  combatant: Combatant,
  side: 'party' | 'enemy'
): CharacterSummary {
  const char = combatant.character;

  // Get attack bonus from proficiency + strength modifier (typical melee)
  const strengthMod = char.ability_modifiers?.STR ?? Math.floor((char.ability_scores?.STR ?? 10 - 10) / 2);
  const attackBonus = char.proficiency_bonus + strengthMod;

  // Estimate average damage based on level (simplified heuristic)
  // In real combat, damage comes from weapons/spells which vary widely
  const avgDamage = Math.round(char.level * 2.5 + attackBonus);

  return {
    id: combatant.id,
    name: char.name,
    class: char.class,
    level: char.level,
    maxHP: char.hp.max,
    ac: char.armor_class,
    side,
    attackBonus,
    avgDamage,
  };
}

/**
 * Build combatant state reference (lightweight, points to registry)
 */
function buildCombatantStateRef(combatant: Combatant): CombatantStateRef {
  return {
    characterId: combatant.id,
    currentHP: combatant.currentHP,
    temporaryHP: combatant.temporaryHP,
    statusEffects: combatant.statusEffects?.map(e => e.name) || [],
    isDefeated: combatant.isDefeated,
  };
}

/**
 * Build action log entry from CombatAction (lightweight, uses references)
 */
function buildActionLogEntry(
  action: CombatAction,
  round: number,
  turnIndex: number
): ActionLogEntry {
  return {
    round,
    turnIndex,
    actorId: action.actor.id,
    targetId: action.target?.id,
    actionType: action.type,
    actionName: action.attack?.name || action.spell?.name,
    result: action.result ? {
      success: action.result.success,
      roll: action.result.roll,
      isCritical: action.result.isCritical,
      damage: action.result.damage,
      damageType: action.result.damageType,
      targetHPAfter: action.result.targetHP,
    } : undefined,
    description: action.result?.description || `${action.actor.character.name} uses ${action.type}`,
  };
}

/**
 * Build optimized combat log export data from combat instance.
 * Uses reference-based approach to avoid redundant character data.
 */
export function buildCombatLogExportData(
  combat: CombatInstance,
  generationConfig: EnemyGenerationConfigExport,
  advancedConfig: AdvancedCombatConfigExport
): CombatLogExportData {
  // Build character registry (each character defined ONCE)
  const characterRegistry: Record<string, CharacterSummary> = {};
  combat.combatants.forEach(c => {
    characterRegistry[c.id] = buildCharacterSummary(c, isEnemy(c.character) ? 'enemy' : 'party');
  });

  // Build final states
  const finalStates = combat.combatants.map(buildCombatantStateRef);

  // Build action log (lightweight references)
  const actionLog: ActionLogEntry[] = combat.history.map((action, index) => {
    // Determine round based on turn order - each combatant acts once per round
    const turnIndex = index % combat.combatants.length;
    const round = Math.floor(index / combat.combatants.length) + 1;
    return buildActionLogEntry(action, round, turnIndex);
  });

  // Calculate combat stats
  let totalDamageByParty = 0;
  let totalDamageByEnemies = 0;
  let criticalHits = 0;

  actionLog.forEach(entry => {
    if (entry.result?.damage) {
      const actor = characterRegistry[entry.actorId];
      if (actor?.side === 'party') {
        totalDamageByParty += entry.result.damage;
      } else {
        totalDamageByEnemies += entry.result.damage;
      }
    }
    if (entry.result?.isCritical) {
      criticalHits++;
    }
  });

  const partyMembersDefeated = finalStates.filter(s => {
    const char = characterRegistry[s.characterId];
    return char?.side === 'party' && s.isDefeated;
  }).length;

  const enemiesDefeated = finalStates.filter(s => {
    const char = characterRegistry[s.characterId];
    return char?.side === 'enemy' && s.isDefeated;
  }).length;

  return {
    timestamp: getTimestamp(),
    exportType: 'combat-log',
    engineVersion: ENGINE_VERSION,

    characterRegistry,

    combatState: {
      id: combat.id,
      roundNumber: combat.roundNumber,
      currentTurnIndex: combat.currentTurnIndex,
      isActive: combat.isActive,
      winnerId: combat.winner?.id,
      winnerName: combat.winner?.character?.name,
      startTime: combat.startTime,
      lastUpdated: combat.lastUpdated,
    },

    initialStates: [], // Would need to track initial state separately
    finalStates,

    actionLog,

    combatStats: {
      totalRounds: combat.roundNumber,
      totalTurns: combat.history.length,
      totalDamageDealt: {
        byParty: totalDamageByParty,
        byEnemies: totalDamageByEnemies,
      },
      criticalHits,
      avgDamagePerRound: combat.roundNumber > 0
        ? Math.round((totalDamageByParty + totalDamageByEnemies) / combat.roundNumber)
        : 0,
      partyMembersDefeated,
      enemiesDefeated,
    },

    generationConfigRef: {
      difficulty: generationConfig.difficulty,
      targetCR: generationConfig.targetCR,
      enemyCount: generationConfig.count,
    },
    advancedConfigRef: {
      tacticalMode: advancedConfig.tacticalMode,
      useMusic: advancedConfig.useMusic,
    },
  };
}

/**
 * Build post-combat export data
 */
export function buildPostCombatExportData(
  combat: CombatInstance,
  xpAwarded: { totalXP: number; distribution: Array<{ name: string; xpReceived: number; leveledUp: boolean; newLevel?: number }> },
  treasure: { gold: number; items: Array<{ name: string; type: string; tags?: string[] }> } | null | undefined,
  preCombatData: PreCombatExportData,
  combatLogData: CombatLogExportData
): PostCombatExportData {
  const enemyCombatants = combat.combatants.filter(c => isEnemy(c.character));
  const winner = combat.winner;

  return {
    timestamp: getTimestamp(),
    exportType: 'post-combat',
    engineVersion: ENGINE_VERSION,
    combatResult: {
      winner: winner?.character?.name || 'unknown',
      winnerSide: winner ? (isEnemy(winner.character) ? 'enemy' : 'party') : 'party',
      roundsElapsed: combat.roundNumber,
      totalTurns: combat.history.length,
    },
    performance: {
      totalTimeSeconds: combat.startTime ? (Date.now() - combat.startTime) / 1000 : null,
      roundsElapsed: combat.roundNumber,
      totalTurns: combat.history.length,
    },
    xpAwarded,
    treasure: treasure ?? undefined,
    encounterSummary: {
      enemyCount: enemyCombatants.length,
      enemyTypes: enemyCombatants.map(e => ({
        name: e.character.name,
        category: e.character.race,
        level: e.character.level,
      })),
      totalEnemyXP: enemyCombatants.reduce((sum, e) => sum + (e.character.xp?.current || 0), 0),
      adjustedXP: xpAwarded.totalXP,
      difficultyRating: preCombatData.generationConfig.difficulty,
    },
    preCombatData,
    combatLog: combatLogData,
  };
}

// =============================================================================
// Type Guards
// =============================================================================

function hasRequiredExportFields(data: unknown, requiredFields: string[]): data is Record<string, unknown> {
  if (typeof data !== 'object' || data === null) return false;
  return requiredFields.every(field => field in data);
}

export function isPreCombatExportData(data: unknown): data is PreCombatExportData {
  return hasRequiredExportFields(data, ['timestamp', 'exportType', 'partyMembers', 'generatedEnemies'])
    && (data as Record<string, unknown>).exportType === 'pre-combat';
}

export function isCombatLogExportData(data: unknown): data is CombatLogExportData {
  return hasRequiredExportFields(data, ['timestamp', 'exportType', 'combatInstance'])
    && (data as Record<string, unknown>).exportType === 'combat-log';
}

export function isPostCombatExportData(data: unknown): data is PostCombatExportData {
  return hasRequiredExportFields(data, ['timestamp', 'exportType', 'combatResult', 'performance'])
    && (data as Record<string, unknown>).exportType === 'post-combat';
}

export function isFullCombatExportData(data: unknown): data is FullCombatExportData {
  return hasRequiredExportFields(data, ['timestamp', 'exportType', 'preCombat'])
    && (data as Record<string, unknown>).exportType === 'full';
}

// =============================================================================
// Convenience Export Functions
// =============================================================================

export type ExportAction = 'copy' | 'download';

/**
 * Export pre-combat data with specified action
 */
export async function exportPreCombat(
  action: ExportAction,
  partyMode: 'solo' | 'party',
  partyMembers: CharacterSheet[],
  partyAnalysis: PartyAnalysis | null,
  generationConfig: EnemyGenerationConfigExport,
  generatedEnemies: CharacterSheet[],
  advancedConfig: AdvancedCombatConfigExport,
  treasureConfig: TreasureGenerationConfigExport,
  characterStrategies: Record<string, string>,
  uncappedConfig: Record<string, string>
): Promise<boolean> {
  const data = buildPreCombatExportData(
    partyMode,
    partyMembers,
    partyAnalysis,
    generationConfig,
    generatedEnemies,
    advancedConfig,
    treasureConfig,
    characterStrategies,
    uncappedConfig
  );

  if (action === 'copy') {
    return copyToClipboard(exportToJson(data));
  } else {
    return downloadAsFile(data, generateFilename('pre-combat'));
  }
}

/**
 * Export combat log with specified action
 */
export async function exportCombatLog(
  action: ExportAction,
  combat: CombatInstance,
  generationConfig: EnemyGenerationConfigExport,
  advancedConfig: AdvancedCombatConfigExport
): Promise<boolean> {
  const data = buildCombatLogExportData(combat, generationConfig, advancedConfig);

  if (action === 'copy') {
    return copyToClipboard(exportToJson(data));
  } else {
    return downloadAsFile(data, generateFilename('combat-log', combat.id.slice(0, 8)));
  }
}

/**
 * Export post-combat data with specified action
 */
export async function exportPostCombat(
  action: ExportAction,
  combat: CombatInstance,
  xpAwarded: PostCombatExportData['xpAwarded'],
  treasure: PostCombatExportData['treasure'] | null,
  partyMode: 'solo' | 'party',
  partyMembers: CharacterSheet[],
  partyAnalysis: PartyAnalysis | null,
  generationConfig: EnemyGenerationConfigExport,
  generatedEnemies: CharacterSheet[],
  advancedConfig: AdvancedCombatConfigExport,
  treasureConfig: TreasureGenerationConfigExport,
  characterStrategies: Record<string, string>,
  uncappedConfig: Record<string, string>
): Promise<boolean> {
  const preCombatData = buildPreCombatExportData(
    partyMode,
    partyMembers,
    partyAnalysis,
    generationConfig,
    generatedEnemies,
    advancedConfig,
    treasureConfig,
    characterStrategies,
    uncappedConfig
  );

  const combatLogData = buildCombatLogExportData(combat, generationConfig, advancedConfig);

  const data = buildPostCombatExportData(
    combat,
    xpAwarded,
    treasure,
    preCombatData,
    combatLogData
  );

  if (action === 'copy') {
    return copyToClipboard(exportToJson(data));
  } else {
    return downloadAsFile(data, generateFilename('post-combat', data.combatResult.winnerSide));
  }
}

// =============================================================================
// Phase 5: Full Export & Export History
// =============================================================================

import localforage from 'localforage';

// Configure localForage for export history
const exportHistoryStore = localforage.createInstance({
  name: 'combat-export-history',
  storeName: 'exports',
  description: 'Combat data export history for balance analysis',
});

/** Maximum number of exports to keep in history */
const MAX_HISTORY_SIZE = 20;

/** Export history item stored in localForage */
export interface ExportHistoryItem {
  id: string;
  timestamp: string;
  exportType: ExportType;
  summary: string;
  data: unknown;
}

/**
 * Generate a unique ID for export history items
 */
function generateExportId(): string {
  return `export-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Save an export to history
 */
export async function saveExportToHistory(
  exportType: ExportType,
  data: unknown,
  summary: string
): Promise<string> {
  const id = generateExportId();
  const item: ExportHistoryItem = {
    id,
    timestamp: getTimestamp(),
    exportType,
    summary,
    data,
  };

  // Get existing history
  const history = await getExportHistory();

  // Add new item at the beginning
  history.unshift(item);

  // Trim to max size
  if (history.length > MAX_HISTORY_SIZE) {
    history.splice(MAX_HISTORY_SIZE);
  }

  // Save back to localForage
  await exportHistoryStore.setItem('history', history);

  return id;
}

/**
 * Get export history from localForage
 */
export async function getExportHistory(): Promise<ExportHistoryItem[]> {
  try {
    const history = await exportHistoryStore.getItem<ExportHistoryItem[]>('history');
    return history || [];
  } catch (error) {
    console.error('[CombatDataExporter] Failed to load export history:', error);
    return [];
  }
}

/**
 * Get a specific export from history by ID
 */
export async function getExportFromHistory(id: string): Promise<ExportHistoryItem | null> {
  const history = await getExportHistory();
  return history.find(item => item.id === id) || null;
}

/**
 * Delete an export from history
 */
export async function deleteExportFromHistory(id: string): Promise<boolean> {
  const history = await getExportHistory();
  const index = history.findIndex(item => item.id === id);

  if (index === -1) return false;

  history.splice(index, 1);
  await exportHistoryStore.setItem('history', history);
  return true;
}

/**
 * Clear all export history
 */
export async function clearExportHistory(): Promise<void> {
  await exportHistoryStore.setItem('history', []);
}

/**
 * Export full combat data (all phases combined)
 * This is the comprehensive export for AI balance analysis
 */
export async function exportFullCombatData(
  action: ExportAction,
  partyMode: 'solo' | 'party',
  partyMembers: CharacterSheet[],
  partyAnalysis: PartyAnalysis | null,
  generationConfig: EnemyGenerationConfigExport,
  generatedEnemies: CharacterSheet[],
  advancedConfig: AdvancedCombatConfigExport,
  treasureConfig: TreasureGenerationConfigExport,
  characterStrategies: Record<string, string>,
  uncappedConfig: Record<string, string>,
  combat: CombatInstance | null,
  xpAwarded: { totalXP: number; distribution: Array<{ name: string; xpReceived: number; leveledUp: boolean; newLevel?: number }> } | null,
  treasure: { gold: number; items: Array<{ name: string; type: string; tags?: string[] }> } | null
): Promise<boolean> {
  // Build pre-combat data (always included)
  const preCombat = buildPreCombatExportData(
    partyMode,
    partyMembers,
    partyAnalysis,
    generationConfig,
    generatedEnemies,
    advancedConfig,
    treasureConfig,
    characterStrategies,
    uncappedConfig
  );

  // Build combat log data (if combat exists)
  let combatLog: CombatLogExportData | undefined;
  if (combat) {
    combatLog = buildCombatLogExportData(combat, generationConfig, advancedConfig);
  }

  // Build post-combat data (if combat ended)
  let postCombat: PostCombatExportData | undefined;
  if (combat && !combat.isActive && xpAwarded) {
    postCombat = buildPostCombatExportData(
      combat,
      xpAwarded,
      treasure,
      preCombat,
      combatLog!
    );
  }

  // Build full export data
  const fullData: FullCombatExportData = {
    timestamp: getTimestamp(),
    exportType: 'full',
    engineVersion: ENGINE_VERSION,
    preCombat,
    combatLog,
    postCombat,
  };

  // Save to history
  const summary = `Full export - ${partyMembers.length} heroes, ${generatedEnemies.length} enemies${combat ? `, ${combat.roundNumber} rounds` : ''}`;
  await saveExportToHistory('full', fullData, summary);

  if (action === 'copy') {
    return copyToClipboard(exportToJson(fullData));
  } else {
    return downloadAsFile(fullData, generateFilename('full'));
  }
}
