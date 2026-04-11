/**
 * Simulation Type Definitions
 *
 * Re-exports engine types for simulation, balance analysis, and combat AI.
 * Defines local UI-specific types that extend engine types with display names,
 * descriptions, and UI state needed by the Balance Lab frontend.
 *
 * (Task 7.3.1)
 */

import type {
    CharacterSheet,
    SimulationResults,
    AIPlayStyle,
    EncounterDifficulty,
    SweepVariable,
    StatLevelOverrides,
    EnemyCategory,
    EnemyArchetype,
    EnemyRarity,
} from 'playlist-data-engine';

// ============================================================================
// RE-EXPORTS: Engine Simulation Types
// ============================================================================

export type {
    /** Configuration for a Monte Carlo combat simulation */
    SimulationConfig,
    /** Aggregate statistics across all simulation runs */
    SimulationSummary,
    /** Complete results from a Monte Carlo combat simulation */
    SimulationResults,
    /** Per-combatant aggregate statistics across all simulation runs */
    CombatantSimulationMetrics,
    /** Histogram bucket for distribution visualization */
    HistogramBucket,
    /** Party configuration snapshot stored alongside results */
    PartyConfig,
    /** Encounter configuration snapshot stored alongside results */
    EncounterConfig,
    /** Detail record for a single simulation run */
    SimulationRunDetail,
} from 'playlist-data-engine';

// ============================================================================
// RE-EXPORTS: Combat AI Types
// ============================================================================

export type {
    /** How an AI-controlled combatant approaches combat */
    AIPlayStyle,
    /** Configuration for AI-controlled combat */
    AIConfig,
    /** The output of the AI's decision for a single turn */
    AIDecision,
    /** How the AI evaluates the current battlefield state */
    AIThreatAssessment,
    /** Per-combatant aggregate statistics from a single combat */
    CombatantMetrics,
} from 'playlist-data-engine';

export {
    /** Type guard to check if a value is a valid AIPlayStyle */
    isValidAIPlayStyle,
} from 'playlist-data-engine';

// ============================================================================
// RE-EXPORTS: Balance Analysis Types
// ============================================================================

export type {
    /** Variance classification — how actual difficulty compares to intended */
    DifficultyVariance,
    /** A single actionable recommendation for adjusting encounter balance */
    BalanceRecommendation,
    /** Complete balance analysis report */
    BalanceReport,
} from 'playlist-data-engine';

export type {
    /** Which encounter parameter to vary across a sweep */
    SweepVariable,
    /** Range configuration for the sweep variable */
    SweepRange,
    /** Configuration for a parameter sweep */
    SweepParams,
    /** A single data point in the sweep results */
    SweepDataPoint,
    /** Complete results from a parameter sweep */
    SweepResults,
    /** Base enemy configuration for the sweep */
    SweepEnemyConfig,
} from 'playlist-data-engine';

export type {
    /** Configuration for one side of a comparative analysis */
    ComparisonConfig,
    /** Options for the comparative analysis */
    ComparisonOptions,
    /** Delta metrics between two configurations */
    DeltaMetrics,
    /** Per-combatant delta between two configurations */
    CombatantDelta,
    /** Result of a statistical significance test */
    SignificanceResult,
    /** Complete comparison result between two configurations */
    ComparisonResult,
} from 'playlist-data-engine';

export type {
    /** Configuration for the difficulty calculation search */
    DifficultyCalculatorOptions,
    /** Enemy template configuration for generating enemies during the search */
    DifficultyEnemyTemplate,
    /** A single probe point from the binary search */
    DifficultyProbe,
    /** Complete difficulty suggestion result */
    DifficultySuggestion,
} from 'playlist-data-engine';

// ============================================================================
// RE-EXPORTS: Enemy Types (used by simulation configuration)
// ============================================================================

export type {
    /** Enemy categories for classification and filtering */
    EnemyCategory,
    /** Rarity tiers that determine enemy power scaling */
    EnemyRarity,
    /** Combat archetypes that define enemy role in battle */
    EnemyArchetype,
    /** Difficulty settings for party-based encounters */
    EncounterDifficulty,
    /** Stat level overrides for independent HP/attack/defense scaling */
    StatLevelOverrides,
} from 'playlist-data-engine';

// ============================================================================
// RE-EXPORTS: Engine Classes
// ============================================================================

export {
    /** Monte Carlo combat simulation engine */
    CombatSimulator,
} from 'playlist-data-engine';

export {
    /** Validates encounter balance using simulation results */
    BalanceValidator,
    /** Expected win rate ranges per difficulty tier */
    EXPECTED_WIN_RATES,
} from 'playlist-data-engine';

export {
    /** Systematically varies a single encounter parameter */
    ParameterSweep,
} from 'playlist-data-engine';

export {
    /** Compares two encounter configurations using identical-seed simulation */
    ComparativeAnalyzer,
} from 'playlist-data-engine';

export {
    /** Suggests enemy CR for a target difficulty using binary search */
    DifficultyCalculator,
} from 'playlist-data-engine';

// ============================================================================
// UI-SPECIFIC TYPES
// ============================================================================

/**
 * AI play style with display metadata for the UI.
 */
export interface AIPlayStyleOption {
    /** The engine play style value */
    value: AIPlayStyle;
    /** Short display label */
    label: string;
    /** Longer description for tooltip/help text */
    description: string;
}

/**
 * Predefined AI style options with display names.
 */
export const AI_STYLE_OPTIONS: AIPlayStyleOption[] = [
    {
        value: 'normal',
        label: 'Normal',
        description: 'Balanced combat — basic attacks, standard tactics, conserves resources',
    },
    {
        value: 'aggressive',
        label: 'Aggressive',
        description: 'Maximum threat — burns all spell slots, items, and abilities every fight',
    },
];

/**
 * Run count presets available in the UI.
 * Each has a display label and the actual count.
 */
export const RUN_COUNT_PRESETS = [
    { label: '100', value: 100 },
    { label: '250', value: 250 },
    { label: '500', value: 500 },
    { label: '1,000', value: 1000 },
    { label: '2,500', value: 2500 },
    { label: '5,000', value: 5000 },
    { label: '10,000', value: 10000 },
] as const;

/**
 * Encounter difficulty tier with display metadata.
 */
export interface DifficultyTierOption {
    /** The engine difficulty value */
    value: EncounterDifficulty;
    /** Short display label */
    label: string;
    /** Description of what this difficulty means */
    description: string;
    /** Expected player win rate range */
    winRateRange: { min: number; max: number };
}

/**
 * Predefined difficulty tier options with display names.
 */
export const DIFFICULTY_TIER_OPTIONS: DifficultyTierOption[] = [
    {
        value: 'easy',
        label: 'Easy',
        description: 'Party should win almost every time',
        winRateRange: { min: 0.9, max: 1.0 },
    },
    {
        value: 'medium',
        label: 'Medium',
        description: 'Moderate challenge — some resource expenditure expected',
        winRateRange: { min: 0.7, max: 0.8 },
    },
    {
        value: 'hard',
        label: 'Hard',
        description: 'Tough fight — likely casualties, tactical play required',
        winRateRange: { min: 0.5, max: 0.6 },
    },
    {
        value: 'deadly',
        label: 'Deadly',
        description: 'Extreme danger — player deaths are likely',
        winRateRange: { min: 0.3, max: 0.4 },
    },
];

/**
 * Stat level override presets for quick enemy configuration.
 */
export interface StatLevelPreset {
    /** Display label for the preset */
    label: string;
    /** Description of what this preset represents */
    description: string;
    /** The stat level overrides to apply */
    overrides: StatLevelOverrides;
}

/**
 * Quick presets for stat level overrides.
 */
export const STAT_LEVEL_PRESETS: StatLevelPreset[] = [
    {
        label: 'Tank',
        description: 'High HP, high defense — absorbs hits, low threat',
        overrides: { hpLevel: 4, defenseLevel: 2 },
    },
    {
        label: 'Glass Cannon',
        description: 'High attack, low HP — dangerous but fragile',
        overrides: { attackLevel: 4, hpLevel: -2 },
    },
    {
        label: 'Brute',
        description: 'High HP, high attack — scary but hittable',
        overrides: { hpLevel: 2, attackLevel: 2 },
    },
];

/**
 * Sweep variable with display metadata for the UI.
 */
export interface SweepVariableOption {
    /** The engine sweep variable value */
    value: SweepVariable;
    /** Short display label */
    label: string;
    /** Description of what this variable controls */
    description: string;
    /** Default range for the sweep */
    defaultRange: { min: number; max: number; step: number };
}

/**
 * Available sweep variables with display names and default ranges.
 */
export const SWEEP_VARIABLE_OPTIONS: SweepVariableOption[] = [
    {
        value: 'cr',
        label: 'Challenge Rating',
        description: 'How does difficulty change as enemy CR varies?',
        defaultRange: { min: 1, max: 10, step: 1 },
    },
    {
        value: 'enemyCount',
        label: 'Enemy Count',
        description: 'How does adding more enemies affect the fight?',
        defaultRange: { min: 1, max: 6, step: 1 },
    },
    {
        value: 'partyLevel',
        label: 'Party Level',
        description: 'How does party level affect encounter balance?',
        defaultRange: { min: 1, max: 20, step: 1 },
    },
    {
        value: 'difficultyMultiplier',
        label: 'Difficulty Multiplier',
        description: 'Scale all enemy stats by a multiplier',
        defaultRange: { min: 0.5, max: 2.0, step: 0.1 },
    },
    {
        value: 'rarity',
        label: 'Rarity',
        description: 'Compare across common, uncommon, elite, and boss tiers',
        defaultRange: { min: 0, max: 3, step: 1 },
    },
    {
        value: 'hpLevel',
        label: 'HP Level',
        description: 'Vary enemy effective HP level independently',
        defaultRange: { min: 1, max: 20, step: 1 },
    },
    {
        value: 'attackLevel',
        label: 'Attack Level',
        description: 'Vary enemy effective attack level independently',
        defaultRange: { min: 1, max: 20, step: 1 },
    },
    {
        value: 'defenseLevel',
        label: 'Defense Level',
        description: 'Vary enemy effective defense level independently',
        defaultRange: { min: 1, max: 20, step: 1 },
    },
];

/**
 * Simulation configuration UI state.
 *
 * Extends the engine's SimulationConfig with UI-specific fields like
 * display labels, selected party/enemy references, and form state.
 */
export interface SimulationConfigUI {
    /** Selected party member character sheets (up to 4) */
    party: CharacterSheet[];

    /** Generated enemy character sheets */
    enemies: CharacterSheet[];

    /** Simulation settings */
    settings: SimulationSettingsUI;
}

/**
 * Simulation settings that map to engine SimulationConfig fields.
 */
export interface SimulationSettingsUI {
    /** Number of simulation runs */
    runCount: number;

    /** Seed string for deterministic simulation */
    baseSeed: string;

    /** AI play style for player characters */
    playerStyle: AIPlayStyle;

    /** AI play style for enemies */
    enemyStyle: AIPlayStyle;

    /** Whether to collect detailed per-run logs */
    collectDetailedLogs: boolean;

    /** Maximum turns before draw (optional) */
    maxTurnsBeforeDraw?: number;

    /** Whether fleeing is allowed (optional) */
    allowFleeing?: boolean;

    /** Whether to regenerate enemies per simulation run (captures generation variance) */
    regenerateEnemiesPerRun: boolean;
}

/**
 * Encounter generation configuration for the UI.
 * Used to configure enemy generation before running simulations.
 */
export interface EncounterConfigUI {
    /** Challenge Rating (0.25–30) */
    cr: number;

    /** Number of enemies (1–10) */
    enemyCount: number;

    /** Enemy category */
    category: EnemyCategory;

    /** Combat archetype */
    archetype: EnemyArchetype;

    /** Rarity tier */
    rarity: EnemyRarity;

    /** Seed for deterministic enemy generation */
    seed: string;

    /** Difficulty multiplier (scales all enemy stats) */
    difficultyMultiplier: number;

    /** Stat level overrides (independent HP/attack/defense scaling) */
    statLevels?: StatLevelOverrides;
}

/**
 * Result of a simulation wrapped with UI metadata.
 * Used for displaying results in the Balance Lab.
 */
export interface SimulationResultUI {
    /** The engine simulation results */
    results: SimulationResults;

    /** How long the simulation took in milliseconds */
    durationMs: number;

    /** User-provided label (optional) */
    label?: string;

    /** When the simulation was completed */
    timestamp: string;

    /** Party configuration used */
    party: CharacterSheet[];

    /** Enemy configuration used */
    enemies: CharacterSheet[];

    /** Simulation settings used */
    settings: SimulationSettingsUI;
}

/**
 * Win rate color thresholds for UI display.
 * Maps win rate ranges to semantic color names.
 */
export type WinRateColorTier =
    | 'very-high'    // >= 90% — green
    | 'high'         // >= 70% — light green
    | 'moderate'     // >= 50% — yellow
    | 'low'          // >= 30% — orange
    | 'very-low';    // < 30% — red

/**
 * Get the color tier for a player win rate.
 * Used to color-code win rate badges and indicators.
 */
export function getWinRateColorTier(winRate: number): WinRateColorTier {
    if (winRate >= 0.9) return 'very-high';
    if (winRate >= 0.7) return 'high';
    if (winRate >= 0.5) return 'moderate';
    if (winRate >= 0.3) return 'low';
    return 'very-low';
}

/**
 * Get a human-readable difficulty assessment from a win rate.
 * Maps win rate to the closest D&D 5e difficulty tier.
 */
export function getWinRateDifficulty(winRate: number): {
    difficulty: EncounterDifficulty;
    label: string;
} {
    if (winRate >= 0.9) return { difficulty: 'easy', label: 'Easy' };
    if (winRate >= 0.7) return { difficulty: 'medium', label: 'Medium' };
    if (winRate >= 0.5) return { difficulty: 'hard', label: 'Hard' };
    return { difficulty: 'deadly', label: 'Deadly' };
}

/**
 * Convert SimulationConfigUI to an engine SimulationConfig.
 * Extracts the engine-compatible fields from the UI config.
 */
export function toSimulationConfig(ui: SimulationConfigUI): {
    party: CharacterSheet[];
    enemies: CharacterSheet[];
    config: import('playlist-data-engine').SimulationConfig;
} {
    const { settings } = ui;
    return {
        party: ui.party,
        enemies: ui.enemies,
        config: {
            runCount: settings.runCount,
            baseSeed: settings.baseSeed,
            aiConfig: {
                playerStyle: settings.playerStyle,
                enemyStyle: settings.enemyStyle,
            },
            combatConfig: {
                maxTurnsBeforeDraw: settings.maxTurnsBeforeDraw,
                allowFleeing: settings.allowFleeing,
            },
            collectDetailedLogs: settings.collectDetailedLogs,
        },
    };
}

/**
 * Default simulation settings for the UI.
 */
export const DEFAULT_SIMULATION_SETTINGS: SimulationSettingsUI = {
    runCount: 500,
    baseSeed: '',
    playerStyle: 'normal',
    enemyStyle: 'aggressive',
    collectDetailedLogs: false,
    maxTurnsBeforeDraw: undefined,
    allowFleeing: undefined,
    regenerateEnemiesPerRun: false,
};

/**
 * Default encounter generation configuration for the UI.
 */
export const DEFAULT_ENCOUNTER_CONFIG: EncounterConfigUI = {
    cr: 3,
    enemyCount: 1,
    category: 'humanoid',
    archetype: 'brute',
    rarity: 'uncommon',
    seed: '',
    difficultyMultiplier: 1.0,
};

// ============================================================================
// PRE-SIMULATION ESTIMATE TYPES
// ============================================================================

/**
 * Snapshot of pre-simulation estimates captured when "Run" is clicked.
 *
 * Stores party stats, enemy preview stats, and derived difficulty predictions
 * so they can be compared against actual simulation results in the
 * EstimateValidationPanel.
 *
 * (Task 1.1)
 */
export interface SimulationEstimateSnapshot {
    /** Party statistics from PartyAnalyzer.analyzeParty() */
    party: {
        /** Average character level (rounded down) */
        averageLevel: number;
        /** Number of party members */
        partySize: number;
        /** Average armor class across all party members */
        averageAC: number;
        /** Average hit points across all party members */
        averageHP: number;
        /** Estimated average damage per round for the party */
        estimatedDPR: number;
        /** Total party strength score (abstract value) */
        totalStrength: number;
        /** Primary weapon name(s) used by the party */
        weaponName?: string;
        /** XP budgets per difficulty tier */
        xpBudgets: {
            easy: number;
            medium: number;
            hard: number;
            deadly: number;
        };
    };

    /** Enemy statistics from multi-sample preview generation + formula parsing */
    enemy: {
        /** Number of enemies in the encounter */
        count: number;
        /** HP per enemy — min/avg/max across generated samples */
        perEnemyHP: { min: number; avg: number; max: number };
        /** Armor class per enemy — min/avg/max across generated samples */
        perEnemyAC: { min: number; avg: number; max: number };
        /** Estimated damage per round per enemy — min/avg/max across generated samples */
        perEnemyEstDPR: { min: number; avg: number; max: number };
        /** Total adjusted XP for the encounter (accounts for enemy count multiplier) */
        totalAdjustedXP: number;
        /** Challenge rating of the enemy template */
        enemyCR: number;
        /** Combat archetype (e.g. 'brute', 'skirmisher') */
        archetype: string;
        /** Rarity tier (e.g. 'common', 'uncommon') */
        rarity: string;
        /** Number of enemy samples rolled to compute the ranges */
        sampleCount: number;
        /** Equipped weapon names from a sample enemy */
        weaponNames?: string[];
    };

    /** Derived difficulty prediction */
    prediction: {
        /** Predicted encounter difficulty tier */
        predictedDifficulty: EncounterDifficulty;
        /** Encounter XP / party medium XP budget ratio */
        xpRatio: number;
        /** Midpoint of the predicted difficulty tier's expected win rate range */
        predictedWinRate: number;
    };

    /** ISO timestamp when the snapshot was captured */
    timestamp: string;
}

// ============================================================================
// ESTIMATE VALIDATION TYPES
// ============================================================================

/**
 * Comparison of a single estimated metric vs its actual simulation value.
 */
export interface EstimateComparison {
    /** Human-readable metric label (e.g. "Party DPR") */
    label: string;
    /** Pre-simulation estimate */
    estimated: number;
    /** Actual simulation result */
    actual: number;
    /** Difference: actual - estimated */
    delta: number;
    /** Percentage difference: (actual - estimated) / estimated * 100 */
    deltaPercent: number;
    /** Whether the discrepancy is significant (|deltaPercent| > 10%) */
    isSignificant: boolean;
}

/**
 * Comparison of predicted vs actual encounter difficulty.
 */
export interface DifficultyComparison {
    /** Predicted difficulty tier from XP budget analysis */
    predicted: EncounterDifficulty;
    /** Actual difficulty tier derived from win rate */
    actual: EncounterDifficulty;
    /** Predicted win rate (midpoint of predicted tier) */
    predictedWinRate: number;
    /** Actual win rate from simulation */
    actualWinRate: number;
    /** How many tiers off the prediction was (0 = exact, 1 = adjacent, etc.) */
    tierDelta: number;
}

/**
 * A code suggestion for fixing a significant estimation discrepancy.
 */
export interface EstimateSuggestion {
    /** Severity level */
    severity: 'info' | 'warning' | 'error';
    /** Which metric this suggestion relates to */
    metric: string;
    /** Human-readable description of the discrepancy */
    message: string;
    /** Reference to the engine code that needs adjustment */
    codeReference: {
        /** Relative path to the engine file */
        file: string;
        /** Function name */
        function: string;
        /** Optional line number */
        line?: number;
    };
    /** What to change and why */
    suggestedFix: string;
}

/**
 * Complete validation result comparing pre-simulation estimates vs actual results.
 *
 * Computed by `useEstimateValidation()` hook and displayed in
 * `EstimateValidationPanel` component.
 *
 * (Task 3.1)
 */
export interface EstimateValidation {
    /** Individual metric comparisons */
    comparisons: EstimateComparison[];
    /** Difficulty tier comparison */
    difficultyComparison: DifficultyComparison;
    /** Code suggestions for significant discrepancies */
    suggestions: EstimateSuggestion[];
}
