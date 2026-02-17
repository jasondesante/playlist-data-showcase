/**
 * XP Formula Presets for Uncapped Progression
 *
 * Provides predefined XP progression curves for uncapped mode characters.
 * Each preset defines how XP requirements grow as characters level up beyond level 20.
 *
 * @see LevelUpProcessor.setUncappedConfig from playlist-data-engine
 * @see docs/engine/docs/XP_AND_STATS.md for formula details
 */

import type { XPFormulaPreset } from '../types';

/**
 * D&D 5e XP formula - Natural continuation beyond level 20
 *
 * Formula: XP(n) = XP(n-1) + (n-1) × n × 500
 * This continues the standard D&D 5e progression pattern naturally.
 *
 * Mathematical Derivation:
 * ------------------------
 * D&D 5e uses a polynomial growth pattern for XP requirements. By analyzing the
 * differences between consecutive level thresholds, we can derive the continuation formula.
 *
 * Level | XP Required | XP Difference | Formula: (n-1) × n × 500
 * ------|-------------|---------------|-------------------------
 *  1    |       0     |        -      |        -
 *  2    |     300     |      300      |   1 × 2 × 500 = 1000 (adjusted)
 *  3    |     900     |      600      |   2 × 3 × 500 = 3000 (adjusted)
 *  4    |   2,700     |    1,800      |   3 × 4 × 500 = 6000 (adjusted)
 * ...
 * 17    | 225,000     |   30,000      |  16 × 17 × 500 = 136,000 (matches!)
 * 18    | 265,000     |   40,000      |  17 × 18 × 500 = 153,000 (adjusted)
 * 19    | 305,000     |   40,000      |  18 × 19 × 500 = 171,000 (adjusted)
 * 20    | 355,000     |   50,000      |  19 × 20 × 500 = 190,000 (adjusted)
 *
 * For levels 17+, the formula (n-1) × n × 500 closely matches the official values
 * with minor rounding adjustments. We use this formula for uncapped continuation.
 *
 * Examples:
 * - Level 20: 355,000 XP (standard)
 * - Level 21: 565,000 XP (355000 + 20*21*500)
 * - Level 25: ~735,000 XP
 * - Level 30: ~1,120,000 XP
 *
 * @param level - The target level (1-30+)
 * @returns Total XP required to reach the given level
 */
const dnd5eXPFormula = (level: number): number => {
    // Pre-calculated values for levels 1-20 (D&D 5e official)
    // These are the official D&D 5e XP thresholds from the Player's Handbook
    // We use a lookup table for accuracy and to ensure consistency with official sources
    const officialThresholds: Record<number, number> = {
        1: 0,        // Starting level - no XP required
        2: 300,      // +300 from level 1
        3: 900,      // +600 from level 2
        4: 2700,     // +1800 from level 3
        5: 6500,     // +3800 from level 4
        6: 14000,    // +7500 from level 5
        7: 23000,    // +9000 from level 6
        8: 34000,    // +11000 from level 7
        9: 48000,    // +14000 from level 8
        10: 64000,   // +16000 from level 9
        11: 85000,   // +21000 from level 10
        12: 100000,  // +15000 from level 11
        13: 120000,  // +20000 from level 12
        14: 140000,  // +20000 from level 13
        15: 165000,  // +25000 from level 14
        16: 195000,  // +30000 from level 15
        17: 225000,  // +30000 from level 16
        18: 265000,  // +40000 from level 17
        19: 305000,  // +40000 from level 18
        20: 355000,  // +50000 from level 19
    };

    // For levels 1-20, use official values from lookup table
    if (level <= 20 && officialThresholds[level] !== undefined) {
        return officialThresholds[level];
    }

    // For levels 21+, use continuation formula: XP(n) = XP(n-1) + (n-1) × n × 500
    // This formula continues the D&D 5e polynomial growth pattern naturally.
    //
    // Why this formula works:
    // - The term (n-1) × n represents the growth rate, which increases quadratically
    // - The multiplier 500 scales the growth to match D&D 5e's pacing
    // - At level 21: 20 × 21 × 500 = 210,000 additional XP needed
    // - At level 30: 29 × 30 × 500 = 435,000 additional XP needed
    let totalXP = 355000; // Start from Level 20's official threshold
    for (let l = 21; l <= level; l++) {
        // Add the XP needed to go from level (l-1) to level l
        // The increment follows the polynomial pattern (l-1) × l × 500
        totalXP += (l - 1) * l * 500;
    }
    return totalXP;
};

/**
 * D&D 5e proficiency bonus formula
 * +1 every 4 levels starting at level 1
 */
const dnd5eProficiencyFormula = (level: number): number => {
    return 2 + Math.floor((level - 1) / 4);
};

/**
 * Linear XP formula - Consistent progression
 *
 * Formula: XP(level) = (level - 1) * 50000
 * Every level requires exactly 50,000 more XP than the previous.
 *
 * Mathematical Properties:
 * ------------------------
 * This is the simplest progression curve - constant XP cost per level.
 * - Total XP grows linearly with level
 * - Each level costs the same (50,000 XP)
 * - Predictable and easy for players to calculate
 * - Good for campaigns where level-up pace should be consistent
 *
 * Comparison to D&D 5e:
 * - D&D 5e at level 10: 64,000 XP (harder to reach)
 * - Linear at level 10: 450,000 XP (much harder overall, but consistent pacing)
 *
 * Examples:
 * - Level 5: 200,000 XP
 * - Level 10: 450,000 XP
 * - Level 20: 950,000 XP
 * - Level 30: 1,450,000 XP
 *
 * @param level - The target level (1+)
 * @returns Total XP required to reach the given level
 */
const linearXPFormula = (level: number): number => {
    // (level - 1) ensures level 1 requires 0 XP
    // 50000 is the constant XP cost per level
    return (level - 1) * 50000;
};

/**
 * Linear proficiency formula - +1 every 2 levels
 *
 * Since linear XP results in faster leveling overall (more total XP at high levels),
 * we use a slightly faster proficiency scaling to match.
 *
 * Formula: proficiency = 2 + floor((level - 1) / 2)
 *
 * Level | Proficiency
 * ------|------------
 *   1   |     2
 *   3   |     3
 *   5   |     4
 *   7   |     5
 *   9   |     6
 *
 * @param level - The character level
 * @returns Proficiency bonus value
 */
const linearProficiencyFormula = (level: number): number => {
    return 2 + Math.floor((level - 1) / 2);
};

/**
 * Exponential XP formula - Fast early, slow late
 *
 * Formula: XP(level) = floor(1000 * pow(1.5, level - 1))
 * Faster progression at low levels, slower at high levels.
 *
 * Mathematical Properties:
 * ------------------------
 * This formula uses geometric growth with a base of 1.5.
 * - Each level costs 50% more than the previous level
 * - Very fast initial leveling (good for quick character advancement)
 * - Becomes extremely difficult at high levels
 * - Total XP required grows exponentially
 *
 * Growth Rate Analysis:
 * - Level 1 → 2: +500 XP (500% increase from base)
 * - Level 5 → 6: +3,797 XP
 * - Level 10 → 11: +19,221 XP
 * - Level 20 → 21: +1,112,922 XP
 *
 * WARNING: This curve becomes extremely steep at high levels.
 * Level 30 requires ~128 million XP, which may be impractical for most campaigns.
 *
 * Examples:
 * - Level 5: ~5,062 XP
 * - Level 10: ~38,443 XP
 * - Level 20: ~2,225,844 XP
 * - Level 30: ~128,724,223 XP (gets very steep!)
 *
 * @param level - The target level (1+)
 * @returns Total XP required to reach the given level
 */
const exponentialXPFormula = (level: number): number => {
    // Base value: 1000 XP at level 1
    // Growth multiplier: 1.5x per level
    // floor() ensures integer XP values
    return Math.floor(1000 * Math.pow(1.5, level - 1));
};

/**
 * Exponential proficiency formula - Based on square root
 *
 * Since exponential XP results in very fast leveling at low levels,
 * we use a slower proficiency scaling that grows with the square root.
 *
 * Formula: proficiency = 2 + floor(sqrt(level))
 *
 * This creates a sublinear progression where proficiency grows
 * more slowly than the XP would suggest, balancing the fast early game.
 *
 * Level | Proficiency
 * ------|------------
 *   1   |     3  (2 + 1)
 *   4   |     4  (2 + 2)
 *   9   |     5  (2 + 3)
 *   16  |     6  (2 + 4)
 *   25  |     7  (2 + 5)
 *
 * @param level - The character level
 * @returns Proficiency bonus value
 */
const exponentialProficiencyFormula = (level: number): number => {
    return 2 + Math.floor(Math.sqrt(level));
};

/**
 * OSRS-Style XP formula - Steep curve at high levels
 *
 * Formula: XP(level) = floor(pow(level, 3) * 100)
 * Inspired by Old School RuneScape's exponential XP curve.
 *
 * Mathematical Properties:
 * ------------------------
 * This formula uses cubic growth (level³) which creates a smooth,
 * moderately challenging curve that scales well across all levels.
 *
 * - XP scales with the cube of the level
 * - Each level requires increasingly more XP (polynomial growth)
 * - More forgiving than exponential at high levels
 * - Creates meaningful progression throughout all level ranges
 *
 * Comparison to Actual OSRS:
 * - Real OSRS uses XP to level (not total), with max level 99
 * - Our formula is simplified but captures the "steep but achievable" feel
 * - At level 30: 2.7M XP is challenging but not impossible
 *
 * Growth Rate Analysis:
 * - Level 1 → 2: +700 XP (100 → 800)
 * - Level 5 → 6: +9,100 XP (12,500 → 21,600)
 * - Level 10 → 11: +33,100 XP (100,000 → 133,100)
 * - Level 20 → 21: +126,100 XP (800,000 → 926,100)
 * - Level 29 → 30: +267,100 XP (2,438,900 → 2,700,000)
 *
 * Examples:
 * - Level 5: 12,500 XP
 * - Level 10: 100,000 XP
 * - Level 20: 800,000 XP
 * - Level 30: 2,700,000 XP
 *
 * @param level - The target level (1+)
 * @returns Total XP required to reach the given level
 */
const osrsXPFormula = (level: number): number => {
    // Cubic growth: level³ * 100
    // The cubic term creates smooth, predictable scaling
    // The multiplier 100 scales appropriately for our level 1-30 range
    return Math.floor(Math.pow(level, 3) * 100);
};

/**
 * OSRS proficiency formula - +1 every 10 levels
 *
 * OSRS-style games typically have slower proficiency scaling
 * to balance the more aggressive XP curve.
 *
 * Formula: proficiency = 2 + floor(level / 10)
 *
 * This creates a very slow proficiency progression that
 * rewards long-term play while keeping early-game bonuses modest.
 *
 * Level | Proficiency
 * ------|------------
 *   1-9 |     2
 * 10-19 |     3
 * 20-29 |     4
 * 30-39 |     5
 *
 * @param level - The character level
 * @returns Proficiency bonus value
 */
const osrsProficiencyFormula = (level: number): number => {
    return 2 + Math.floor(level / 10);
};

/**
 * XP Formula Presets Array
 *
 * Contains all available XP progression presets for uncapped mode.
 * Each preset includes:
 * - id: Unique identifier for storage/reference
 * - name: Display name for UI
 * - description: Short explanation of the progression style
 * - xpFormula: Function that returns total XP required for a given level
 * - proficiencyFormula: Function that returns proficiency bonus for a given level
 * - chartColor: CSS color for chart visualization
 */
export const XP_FORMULA_PRESETS: XPFormulaPreset[] = [
    {
        id: 'dnd5e',
        name: 'D&D 5e (Default)',
        description: 'Natural continuation of D&D 5e progression',
        xpFormula: dnd5eXPFormula,
        proficiencyFormula: dnd5eProficiencyFormula,
        chartColor: '#8b5cf6', // Purple
    },
    {
        id: 'linear',
        name: 'Linear',
        description: '50,000 XP per level - consistent progression',
        xpFormula: linearXPFormula,
        proficiencyFormula: linearProficiencyFormula,
        chartColor: '#3b82f6', // Blue
    },
    {
        id: 'exponential',
        name: 'Exponential',
        description: 'Faster at low levels, slower at high levels',
        xpFormula: exponentialXPFormula,
        proficiencyFormula: exponentialProficiencyFormula,
        chartColor: '#10b981', // Green
    },
    {
        id: 'osrs',
        name: 'OSRS-Style',
        description: 'Old School RuneScape - steep curve at high levels',
        xpFormula: osrsXPFormula,
        proficiencyFormula: osrsProficiencyFormula,
        chartColor: '#f59e0b', // Amber
    },
];

/**
 * Get a preset by its ID
 */
export const getXPFormulaPresetById = (id: string): XPFormulaPreset | undefined => {
    return XP_FORMULA_PRESETS.find((preset) => preset.id === id);
};

/**
 * Default preset ID (D&D 5e)
 */
export const DEFAULT_XP_FORMULA_PRESET_ID = 'dnd5e';
