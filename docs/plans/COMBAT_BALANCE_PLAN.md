# Combat Balance & Simulation Tools — Implementation Plan

## Overview

Build a comprehensive combat balancing system across **playlist-data-engine** (simulation engine, AI, analysis) and **playlist-data-showcase** (visualization, configuration UI). The goal is to enable Monte Carlo simulation of combat encounters with intelligent AI, aggregate statistical analysis, and actionable balance recommendations.

### Design Philosophy

**Core attack math is the foundation.** The most important question this system answers is: *"Given this party and these enemies, how many turns of basic attacks until one side falls?"* Everything else — status effects, legendary actions, spellcasting AI — layers on top of that foundation.

The two most important AI strategies are:
- **Normal** — balanced combat: basic attacks, standard target selection, conservative resource use. This measures the baseline difficulty of an encounter.
- **Aggressive** — maximum effort: burn all spell slots, use all items, use legendary actions, no resource conservation. This answers *"How dangerous is this encounter at its absolute hardest?"*

These strategies apply to **both** players and enemies. Comparing Normal vs Aggressive results reveals the true difficulty ceiling of an encounter.

**Enemy AI is fully simulated.** Enemies have simpler kits (features with tags, spells with tags) and the AI can understand all their options.

**Player AI is simplified.** Player characters have complex kits (class features, subclasses, feats). The AI handles basic attacks, spell slot usage, and healing items but doesn't fully model every class feature interaction.

### Current State

**What exists:**
- D&D 5e-inspired turn-based combat engine (CombatEngine, AttackResolver, SpellCaster, InitiativeRoller, DiceRoller)
- Enemy generation with CR/rarity axes, equipment, spellcasting, legendary actions
- PartyAnalyzer with static XP budgets (D&D 5e DMG tables)
- EncounterBalance constants with CR-to-XP, encounter multipliers, tuning factors
- Pre-combat encounter summary with difficulty rating
- Combat data export (JSON) with localForage history
- Auto-play in UI — basic attacks only, no AI intelligence

**What's missing:**
- No combat AI — enemies and players can't make intelligent decisions (auto-play just attacks `livingTargets[0]` every turn)
- No Monte Carlo simulation — can't run N fights and aggregate results
- No deterministic dice rolling — `DiceRoller` uses `Math.random()`, blocking reproducible simulations
- No status effect duration tracking (effects applied but never decremented/enforced)
- No legendary action execution in CombatEngine (generated but not runnable)
- Spell slot sync broken — `createCombatant()` ignores `character.spells.spell_slots`
- **Enemy spell data is lost during generation** — `SpellcastingGenerator` produces `InnateSpell` objects but they're converted to string IDs via `spellsToFeatures()` and stored in `class_features`. The `character.spells` object is hardcoded empty `{ spell_slots: {}, known_spells: [], cantrips: [] }` in `EnemyGenerator`. Combat has no access to enemy spell data.
- **Duplicate spell slot tables** — the same hardcoded D&D 5e spell slot table exists in both `CombatEngine.initializeSpellSlots()` and `SpellCaster.restoreSpellSlots()` — should be consolidated into a shared constant
- **`CombatAction` type union incomplete** — missing `'useItem'` and `'legendaryAction'` action types needed by AI
- **`Combatant` type missing legendary tracking** — no `legendaryActionsRemaining` or `legendaryResistancesRemaining` fields
- Zero test coverage for the entire combat subsystem (existing `combat.test.ts` is broken — uses non-existent `character_class` object)
- No balance validation — XP budgets are theoretical, never verified against actual outcomes
- No per-combatant metrics (DPR, effective HP, survivability)
- No visualization tools for balance data

---

## Phase 0: Deterministic Dice Rolling

> **Project:** playlist-data-engine (`../playlist-data-engine/`)
> **Goal:** Enable reproducible combat simulations by making `DiceRoller` seedable.
> **Why first:** Every subsequent phase depends on deterministic rolls. This is the single biggest blocker.

### 0.1 SeededDiceRoller

The current `DiceRoller` class uses `Math.random()` for all rolls. It has a `seededRoll(seed)` static method but it's a dead-end (single call, no state, uses `Math.sin`).

**Existing foundation:** `SeededRNG` (`src/utils/random.ts`) already exists and is production-quality — uses MurmurHash V3 via `deriveSeed()` + `hashSeedToFloat()`, has stateful counter, and provides `random()`, `randomInt()`, `randomChoice()`, `weightedChoice()`, `shuffle()`. `SeededDiceRoller` will be a thin wrapper around this.

- [ ] **0.1.1** Create `src/core/combat/SeededDiceRoller.ts`
  - Implements the same API as `DiceRoller` but uses `SeededRNG` internally
  - Constructor accepts a `SeededRNG` instance (or creates one from a seed string)
  - All roll methods produce deterministic results: `rollDie()`, `rollD20()`, `rollWithAdvantage()`, `rollWithDisadvantage()`, `calculateDamage()`, `rollSavingThrow()`, `rollAbilityCheck()`, `parseDiceFormula()`
  - Instance-based (not static) so each simulation run gets its own roller with its own state
- [ ] **0.1.2** Add `createSeededRoller(seed: string): SeededDiceRoller` factory method
  - Creates a `SeededRNG` from the seed, wraps it in `SeededDiceRoller`
  - This is what `CombatSimulator` will call per run
- [ ] **0.1.3** Update `CombatEngine` to accept an optional `DiceRoller` instance
  - If provided, use it for all combat rolls instead of the static `DiceRoller`
  - This allows the same `CombatEngine` class to work in both live (random) and simulation (seeded) modes
  - Default: use static `DiceRoller` (backward compatible)
- [ ] **0.1.4** Update `AttackResolver` and `InitiativeRoller` to accept roller injection
  - Same pattern: optional roller parameter, default to static `DiceRoller`
- [ ] **0.1.5** Add tests
  - Same seed + same calls = identical results
  - Different seeds = different results
  - Statistical distribution over many seeds matches expected D&D probabilities (d20 uniform, advantage bias, etc.)
  - Backward compatibility: `CombatEngine` without roller still uses `Math.random()`

---

## Phase 1: Engine Prerequisites — Fix Combat Gaps

> **Project:** playlist-data-engine (`../playlist-data-engine/`)
> **Goal:** Fix the incomplete systems that simulations depend on for accurate results.

### 1.1 Spell Slot Synchronization

Two separate spell slot systems exist:
- `CharacterSheet.spells.spell_slots`: `{ [level]: { total, used } }` (generation time)
- `Combatant.spellSlots`: `{ [level]: number }` (combat time, flat remaining)

Currently `createCombatant()` ignores `character.spells.spell_slots` entirely and uses a hardcoded D&D 5e table. Enemy spell slots from `SpellcastingGenerator` are **completely lost** during combat initialization.

**Additional issue:** The same hardcoded D&D 5e spell slot table is duplicated in both `CombatEngine.initializeSpellSlots()` and `SpellCaster.restoreSpellSlots()`. These must be consolidated into a shared constant.

- [ ] **1.1.1** Extract the hardcoded spell slot table into a shared constant (e.g., `src/constants/SpellSlots.ts`)
  - Currently duplicated in `CombatEngine.initializeSpellSlots()` (line ~587) and `SpellCaster.restoreSpellSlots()` (line ~160)
  - Both methods should reference the same constant
- [ ] **1.1.2** Update `initializeSpellSlots()` in `CombatEngine` to read from `character.spells.spell_slots`
  - If `character.spells.spell_slots` exists, convert: `{ [level]: { total, used } }` → `{ [level]: total - used }`
  - Fall back to hardcoded table if `character.spells.spell_slots` is missing (backward compat)
- [ ] **1.1.3** Add validation that spell slots are consistent between source character and combatant
- [ ] **1.1.4** Add test verifying spell slot initialization from various character configurations
  - Character with `spells.spell_slots` (generated enemy)
  - Character without `spells.spell_slots` (fallback to table)
  - Character with partially used slots

### 1.2 Combat Engine Test Foundation

The combat subsystem has zero test coverage. The existing `tests/unit/combat.test.ts` is broken (uses non-existent `character_class` object — the actual type is `class: string`). **Rewrite tests from scratch** rather than trying to fix the broken ones — the mock data has multiple issues beyond just the type mismatch.

- [ ] **1.2.1** Create `tests/unit/combat/` directory structure
- [ ] **1.2.2** Add test helpers for creating mock combatants (leverage existing `tests/helpers/enemyTestHelpers.ts` patterns)
  - `createTestCombatant(overrides?)` — returns a `Combatant` with configurable stats
  - `createTestParty(level, count?)` — returns array of `Combatant`s
  - `createTestEnemy(cr, rarity?)` — returns a `Combatant` from generated enemy
- [ ] **1.2.3** Add core CombatEngine tests
  - Test `startCombat()` — initiative rolling, turn order, combatant creation
  - Test `executeWeaponAttack()` — hit/miss, damage, critical hit/miss
  - Test `nextTurn()` — turn advancement, round counting, action reset
  - Test `checkCombatStatus()` — win/loss/draw conditions
  - Test `executeDodge()`, `executeDash()`, `executeDisengage()`
  - Test `getCombatResult()` — XP and treasure calculation
- [ ] **1.2.4** Add AttackResolver tests (statistical sampling where appropriate)
  - Test hit probability at various attack bonus vs AC differentials
  - Test damage modifier selection (STR melee, DEX ranged, finesse = max)
  - Test advantage/disadvantage mechanics
- [ ] **1.2.5** Add SpellCaster tests
  - Test spell slot consumption and restoration
  - Test save DC calculation
  - Test saving throw resolution
  - Test multi-target spell damage
  - Test status effect application

### 1.3 Status Effect Duration Tracking

Status effects exist as data (`StatusEffect` has a `duration` field) but are never decremented, enforced, or removed. Two effects are hardcoded in `SpellCaster` (charmed, frightened) but they have no mechanical impact.

- [ ] **1.3.1** Expand `CombatAction` type union in `src/core/types/Combat.ts`
  - Add `'useItem'` and `'legendaryAction'` to the action type union
  - Currently: `'attack' | 'spell' | 'dodge' | 'dash' | 'disengage' | 'help' | 'hide' | 'ready' | 'flee'`
  - After: `'attack' | 'spell' | 'dodge' | 'dash' | 'disengage' | 'help' | 'hide' | 'ready' | 'flee' | 'useItem' | 'legendaryAction'`
  - Add corresponding optional fields to `CombatAction` interface: `item?: Item`, `legendaryAction?: LegendaryAction`
- [ ] **1.3.2** Extend `StatusEffect` interface with optional fields: `damage?: number`, `damageType?: DamageType`, `mechanicalEffects?: StatusEffectMechanics` (advantage/disadvantage/immunity flags)
- [ ] **1.3.3** Add `applyStatusEffect()` and `removeExpiredStatusEffects()` methods to `CombatEngine`
  - `applyStatusEffect(combatant, effect)` — pushes effect, checks for stacking rules (same name = refresh duration, take higher)
  - `removeExpiredStatusEffects(combatant)` — filters out effects where `duration <= 0`
- [ ] **1.3.4** Integrate status effect tick-down into `nextTurn()` lifecycle
  - At the START of each combatant's turn: decrement duration by 1 for all their effects
  - Remove expired effects (duration <= 0)
  - Track which effects were removed in combat history for logging
- [ ] **1.3.5** Implement mechanical enforcement for existing effects
  - **Charmed**: combatant has disadvantage on attack rolls against non-charming targets (needs source tracking)
  - **Frightened**: combatant has disadvantage on attack rolls and ability checks while source is visible
  - **Burning**: deal damage equal to effect's damage value at start of turn
  - **Stunned**: skip turn entirely (auto-advance), disadvantage on DEX saves, speed 0
  - **Prone**: disadvantage on melee attack rolls, advantage on ranged attack rolls against prone target, melee attacks have advantage against prone
- [ ] **1.3.6** Add concentration tracking
  - Track which combatant is concentrating on which effect
  - When a new concentration spell is cast, drop the previous concentration effect
  - When a concentrating combatant takes damage, make a CON save (DC 10 or half damage) to maintain concentration
  - Many enemy spells are already marked `concentration: true` in `SpellcastingGenerator`
- [ ] **1.3.7** Refactor `SpellCaster` to use the new `applyStatusEffect()` method instead of directly pushing to arrays
- [ ] **1.3.8** Add status effect tests in `tests/unit/combat/`
  - Test duration decrement per round
  - Test expiration and removal
  - Test mechanical enforcement (charmed → disadvantage, frightened → disadvantage, burning → damage, stunned → skip turn)
  - Test stacking (refresh vs new effect)
  - Test concentration (new concentration drops old, damage breaks concentration)

### 1.4 Legendary Action Execution

Legendary actions are generated and stored on `CharacterSheet.legendary_config` but `CombatEngine` has no method to execute them. Important for boss simulation accuracy but **does not block** basic attack simulations.

- [ ] **1.4.1** Add `executeLegendaryAction(combat, bossCombatant, action, target)` to `CombatEngine`
  - Validate the action exists in the boss's `legendary_config.actions`
  - Track legendary action points spent per round (3 points per round, reset at start of boss's turn)
  - Resolve damage if the action has `damage`/`damageType`
  - Record action in combat history
- [ ] **1.4.2** Add legendary action point tracking to `Combatant` type
  - `legendaryActionsRemaining: number` — reset to 3 at start of boss's turn
  - `legendaryResistancesRemaining: number` — per-day resource
- [ ] **1.4.3** Integrate legendary action reset into `nextTurn()`
  - When it's a boss combatant's turn and `roundNumber` advanced, reset `legendaryActionsRemaining` to 3
- [ ] **1.4.4** Add `useLegendaryResistance(combat, bossCombatant)` method
  - Decrement `legendaryResistancesRemaining`, auto-succeed a saving throw
  - Return whether the resistance was available
- [ ] **1.4.5** Add legendary action tests
  - Test action point tracking (spend 1+2 = 3, 4th fails)
  - Test point reset per round
  - Test legendary resistance usage
  - Test damage resolution from legendary actions

### 1.5 CombatResult Winner Refactor

Current `CombatResult.winner` returns the first surviving combatant (misleading for party vs group combat). This needs to be fixed before the AI runner uses it.

- [ ] **1.5.1** Add `winnerSide: 'player' | 'enemy' | 'draw'` to `CombatResult`
  - Keep `winner` for backward compatibility but add the side-level field
  - `checkCombatStatus()` sets `winnerSide` based on which side has survivors
- [ ] **1.5.2** Fix XP calculation in `getCombatResult()`
  - Currently hardcoded: `enemies.filter(e => e.isDefeated).length * 50`
  - Use `getXPForCR()` from `EncounterBalance.ts` to calculate proper XP from defeated enemy CRs
- [ ] **1.5.3** Add tests for winner side logic and XP calculation

### 1.6 Enemy Spell Data Pipeline

> **Critical gap:** Enemy spells are generated by `SpellcastingGenerator` but the data is lost before reaching combat. Without this, the AI can never have enemies cast spells in simulation.

**Current broken data flow:**
1. `SpellcastingGenerator.generateSpellListWithRNG()` → produces `SpellcastingConfig` with `InnateSpell[]` (rich: `id`, `tags`, `damage`, `save`, `concentration`, `damageType`, `range`) + `slots` map
2. `EnemyGenerator` calls `SpellcastingGenerator.spellsToFeatures(spellConfig)` → converts to `Record<string, unknown>[]` with `isSpell: true`
3. Features are stored in `class_features` as **string IDs only**: `abilities.map(a => a.id || a.name)` (EnemyGenerator line ~1165)
4. `character.spells` is hardcoded to `{ spell_slots: {}, known_spells: [], cantrips: [] }` (EnemyGenerator line ~1179) — **all spell data and slots are lost**

**Type mismatch:** `InnateSpell` uses `damage`/`damageType`/`save`/`range` (number) while `Spell` uses `damage_dice`/`damage_type`/`saving_throw`/`range` (string). `SpellCaster.castSpell()` reads `Spell` fields.

- [ ] **1.6.1** Unify or bridge `InnateSpell` and `Spell` types
  - Option A (preferred): Extend `Spell` interface to include all fields from `InnateSpell` (`tags`, `concentration`, `id`, `effect`) and update `InnateSpell` to extend `Spell`, adding only the missing fields (`damage_dice` as alias for `damage`, `damage_type` as alias for `damageType`, `saving_throw` as alias for `save`)
  - Option B: Create a converter `innateSpellToSpell(spell: InnateSpell): Spell` that maps fields correctly
  - Option A is cleaner long-term since `SpellCaster` can then use spell tags for AI decisions
- [ ] **1.6.2** Update `EnemyGenerator` to populate `character.spells` from `SpellcastingConfig`
  - Set `character.spells.spell_slots` from `SpellcastingConfig.slots` (converted to `{ [level]: { total, used } }` format)
  - Set `character.spells.known_spells` from selected leveled spell names
  - Set `character.spells.cantrips` from selected cantrip names
  - Keep spell features in `class_features` for display/UI purposes, but the authoritative spell data lives in `character.spells`
- [ ] **1.6.3** Add a `spells` array to `CharacterSheet` for combat-ready `Spell` objects
  - Currently `CharacterSheet` has `spells_known: string[]` (just names) and `spells.spell_slots` — no actual `Spell[]` array
  - Add `character.combat_spells?: Spell[]` populated from `SpellcastingConfig` output (after type unification)
  - This is what `CombatEngine` and `SpellCaster` will read during combat
- [ ] **1.6.4** Update `SpellCaster` to use spell tags for AI decision-making
  - `SpellCaster` currently relies on string matching on `spell.description` for status effects
  - After type unification, check for `spell.tags` instead (more reliable than string matching)
  - `Spell.tags` from `InnateSpell` include: `'damage'`, `'healing'`, `'buff'`, `'control'`, `'aoe'`, `'multi-target'`, `'debuff'`, `'ally'`, `'self'`, `'bonus-action'`, `'ranged'`, `'melee'`, etc.
- [ ] **1.6.5** Add tests for enemy spell data pipeline
  - Test that generated enemy `CharacterSheet` has populated `spells.spell_slots`
  - Test that `combat_spells` array is populated and each spell has correct fields
  - Test that `CombatEngine.createCombatant()` reads enemy spell slots correctly
  - Test that `SpellCaster` can cast an enemy spell using the unified type

---

## Phase 2: Combat AI System

> **Project:** playlist-data-engine (`../playlist-data-engine/`)
> **Goal:** Build combat AI that can play both player characters and enemies with configurable strategies. The AI must produce two critical data points: **Normal** combat (baseline difficulty) and **Aggressive** combat (maximum threat ceiling).

### 2.1 AI Architecture & Types

- [ ] **2.1.1** Define `AIPlayStyle` enum type
  - `normal` — balanced play, basic attacks primarily, uses abilities when clearly beneficial, conserves limited resources
  - `aggressive` — maximizes damage output, uses ALL spells/abilities/healing items immediately, no resource conservation, no strategy except maximum damage and maximum healing
- [ ] **2.1.2** Define `AIConfig` interface
  ```typescript
  interface AIConfig {
    playerStyle: AIPlayStyle;      // How player characters play
    enemyStyle: AIPlayStyle;       // How enemies play
    // Optional per-combatant overrides
    overrides?: Map<string, AIPlayStyle>;  // combatant ID → style
    // Optional: enable class-specific features for player AI
    // Default: false (basic attacks + spells + items only)
    // When true: AI attempts to use class features like Sneak Attack, Divine Smite, Action Surge
    enableClassFeatures?: boolean;
  }
  ```
- [ ] **2.1.3** Define `AIDecision` interface — the output of the AI's decision for a single turn
  ```typescript
  interface AIDecision {
    action: 'attack' | 'castSpell' | 'dodge' | 'dash' | 'disengage' | 'flee' | 'useItem' | 'legendaryAction';
    target?: string;           // target combatant ID
    targetIds?: string[];      // for multi-target spells
    weaponName?: string;       // which weapon to attack with
    spellName?: string;        // which spell to cast
    itemName?: string;         // which consumable item to use
    legendaryActionId?: string; // which legendary action
    reasoning?: string;        // human-readable explanation of the decision
  }
  ```
- [ ] **2.1.4** Define `AIThreatAssessment` — how the AI evaluates the battlefield
  ```typescript
  interface AIThreatAssessment {
    myHPPercent: number;        // current HP / max HP
    myAC: number;
    lowestAllyHPPercent: number;
    lowestEnemyHP: number;      // absolute HP of weakest enemy
    highestEnemyDamage: number; // estimated DPR of scariest enemy
    partySize: number;
    enemyCount: number;
    roundNumber: number;
    isLowHP: boolean;           // below 25% HP
    isCriticalHP: boolean;      // below 10% HP
    hasHealingItems: boolean;
    hasSpellSlots: boolean;
    hasRemainingLimitedAbilities: boolean;
  }
  ```

### 2.2 AI Decision Engine

- [ ] **2.2.1** Create `src/core/combat/AI/CombatAI.ts` — main AI class
  - `constructor(config: AIConfig)`
  - `decide(combatant, combatInstance): AIDecision` — main entry point
  - `assessThreat(combatant, combatInstance): AIThreatAssessment` — evaluate battlefield state
- [ ] **2.2.2** Implement target selection logic (`selectTarget()`)
  - **Normal**: target nearest / lowest AC enemy (balanced approach)
  - **Aggressive**: target lowest HP enemy (finish them off for action economy, maximize kills)
  - Exclude defeated combatants, prefer living targets
- [ ] **2.2.3** Implement weapon selection logic (`selectWeapon()`)
  - Evaluate all equipped weapons + unarmed strike
  - Consider: damage potential, attack bonus, range, properties (finesse, versatile)
  - **Normal**: balanced (highest expected damage with reasonable hit chance)
  - **Aggressive**: highest expected damage weapon regardless of hit chance
- [ ] **2.2.4** Implement spell selection logic (`selectSpell()`)
  - Evaluate all known spells + cantrips against available spell slots
  - Use spell tags (`damage`, `healing`, `buff`, `control`, `aoe`, `multi-target`) for decision-making
  - **Normal**: cantrips and basic attacks primarily, use leveled spells only when clearly beneficial (e.g., Fireball vs 3+ enemies)
  - **Aggressive**: highest damage spell available at all times, prioritize AoE when multiple enemies alive, burn all spell slots immediately, use healing spells proactively to maintain max HP for max damage output
- [ ] **2.2.5** Implement item usage logic (`shouldUseItem()`)
  - Check inventory for healing items (potions, etc.)
  - **Normal**: use healing when below 50% HP
  - **Aggressive**: use healing items proactively to stay at high HP for max damage output
- [ ] **2.2.6** Implement action economy logic (`shouldDodge()`, `shouldFlee()`)
  - **Normal**: dodge when isolated and low HP, flee when clearly outmatched
  - **Aggressive**: never dodge, never flee — every action is damage or healing
- [ ] **2.2.7** Implement legendary action AI (`selectLegendaryAction()`)
  - Boss-only: decide which legendary action to use and when
  - Track action points remaining (3 per round)
  - Use legendary action tags (`damage`, `heal`, `control`, `movement`) for filtering
  - **Normal**: spread actions across the round, prefer damage actions
  - **Aggressive**: use highest-cost damage actions immediately, use healing actions when below 50% HP
- [ ] **2.2.8** Implement resource management per play style
  - **Normal**: moderate resource usage, keep some reserves
  - **Aggressive**: no conservation — burn everything for maximum effectiveness this fight
- [ ] **2.2.9** Implement support archetype AI behaviors
  - Support enemies with healing spells should prioritize healing lowest-HP ally
  - Buff spells (Bless, etc.) should target allies, not self
  - Control spells should target highest-threat enemy
  - **Aggressive support**: still prioritize healing but also uses damage spells more freely

### 2.3 AI Integration with CombatEngine

- [ ] **2.3.1** Create `src/core/combat/AI/AICombatRunner.ts` — runs a full combat with AI decisions
  - `runFullCombat(players, enemies, aiConfig, combatConfig?, diceRoller?): CombatResult`
  - Loops through turns, calls `CombatAI.decide()` for each combatant, executes the decision
  - Handles the complete lifecycle: startCombat → turn loop → getCombatResult
  - Accepts optional `SeededDiceRoller` for deterministic simulation
  - Returns the full `CombatInstance` (including history) plus the `CombatResult`
- [ ] **2.3.2** Handle edge cases in AI combat runner
  - Stunned combatants skip their turn
  - No valid targets → skip turn
  - All spell slots used → fall back to weapon attacks
  - Defeated combatants are skipped
- [ ] **2.3.3** Add combat event tracking for metrics
  - Track per-combatant: total damage dealt, total damage taken, healing done, spells cast, items used, critical hits, rounds survived
  - Store in a `CombatMetrics` object attached to the `CombatInstance`

### 2.4 AI Tests

- [ ] **2.4.1** Add AI decision tests
  - Test that aggressive AI picks highest-damage options and burns resources
  - Test that normal AI conserves resources and uses basic attacks primarily
  - Test target selection logic for each play style
  - Test support AI prioritizes healing allies
- [ ] **2.4.2** Add AI combat runner integration tests
  - Test full combat runs to completion (victory/defeat)
  - Test that AI doesn't get stuck in infinite loops
  - Test with various party sizes and enemy compositions
  - Test deterministic behavior with same seed

---

## Phase 3: Monte Carlo Combat Simulator

> **Project:** playlist-data-engine (`../playlist-data-engine/`)
> **Goal:** Run N combat simulations with seeded RNG, aggregate statistical results, and return structured data for balance analysis. This is the core tool — it answers *"how many turns until one side falls?"*

### 3.1 Simulator Core

- [ ] **3.1.1** Create `src/core/combat/Simulation/CombatSimulator.ts`
  - `class CombatSimulator` with configurable simulation parameters
  ```typescript
  interface SimulationConfig {
    runCount: number;            // Number of simulations (100-10000)
    baseSeed: string;            // Base seed for determinism (each run gets baseSeed + index)
    aiConfig: AIConfig;          // AI play styles per side
    combatConfig?: CombatConfig; // Engine configuration (max turns, etc.)
    collectDetailedLogs?: boolean; // If true, save full combat log per run (memory-intensive)
    onProgress?: (completed: number, total: number) => void; // Progress callback
  }
  ```
- [ ] **3.1.2** Implement `run(party, enemies, config): SimulationResults`
  - Loop `runCount` times, each with a unique seed (`baseSeed + i`)
  - Create fresh `SeededDiceRoller` and `AICombatRunner` per run
  - Aggregate results into `SimulationResults`
  - Support progress callback for UI integration
  - Handle early termination if requested
- [ ] **3.1.3** Implement cancellation support
  - `AbortController` pattern for cancelling long-running simulations
  - Clean up resources on cancellation, return partial results

### 3.2 Result Aggregation

- [ ] **3.2.1** Define `SimulationResults` interface
  ```typescript
  interface SimulationResults {
    config: SimulationConfig;
    summary: SimulationSummary;
    party: PartyConfig;
    encounter: EncounterConfig;
    perCombatantMetrics: Map<string, CombatantSimulationMetrics>;
    runDetails?: SimulationRunDetail[];  // Only if collectDetailedLogs
  }

  interface SimulationSummary {
    totalRuns: number;
    playerWins: number;
    enemyWins: number;
    draws: number;
    playerWinRate: number;          // 0-1
    averageRounds: number;
    medianRounds: number;
    averageRoundsOnWin: number;
    averageRoundsOnLoss: number;
    averagePlayerHPRemaining: number;  // Across winning runs
    averagePlayerHPPercentRemaining: number;
    totalPlayerDeaths: number;          // Across all runs
    averageRoundsPerPlayerDeath: number;
    totalEnemyDeaths: number;
    averageRoundsPerEnemyDeath: number;
  }
  ```
- [ ] **3.2.2** Define `CombatantSimulationMetrics` — per-combatant aggregate stats
  ```typescript
  interface CombatantSimulationMetrics {
    combatantId: string;
    name: string;
    side: 'player' | 'enemy';
    averageDamagePerRound: number;     // DPR
    medianDamagePerRound: number;
    averageTotalDamageDealt: number;
    averageTotalDamageTaken: number;
    averageHealingDone: number;
    averageRoundsSurvived: number;
    survivalRate: number;              // 0-1, how often this combatant survived
    killRate: number;                  // 0-1, how often this combatant got the final blow on any enemy
    criticalHitRate: number;           // 0-1
    averageSpellSlotsUsed: number;
    mostUsedAction: string;            // 'attack' | 'castSpell' | etc.
    damageDistribution: HistogramBucket[];  // Damage dealt per round histogram
    hpRemainingDistribution: HistogramBucket[];  // HP remaining at end histogram
  }
  ```
- [ ] **3.2.3** Define `HistogramBucket` for distributions
  ```typescript
  interface HistogramBucket {
    rangeStart: number;
    rangeEnd: number;
    count: number;
    percent: number;  // 0-100
  }
  ```
- [ ] **3.2.4** Implement `SimulationAggregator` class
  - `aggregateRun(runResult): void` — accumulate stats from a single run
  - `getResults(): SimulationResults` — compute final aggregated stats
  - Handle statistical calculations: mean, median, standard deviation, percentiles
  - Build histograms with configurable bucket count (default 20)

### 3.3 Simulation Tests

- [ ] **3.3.1** Add simulator unit tests
  - Test deterministic results: same seed + same config = identical results
  - Test different seeds produce different results
  - Test aggregation math (mean, median, histograms)
- [ ] **3.3.2** Add simulator integration tests
  - Test small simulations (10 runs) complete correctly
  - Test various party/enemy compositions
  - Test both AI play styles produce reasonable results
  - Test cancellation returns partial results
- [ ] **3.3.3** Add performance benchmarks
  - Measure simulation throughput (runs/second)
  - Target: 100+ runs/second for standard party vs encounter
  - Identify bottlenecks if below target

---

## Phase 4: Balance Analysis Engine

> **Project:** playlist-data-engine (`../playlist-data-engine/`)
> **Goal:** Use simulation results to validate encounter balance, compare configurations, and provide recommendations.

### 4.1 Balance Validator

- [ ] **4.1.1** Create `src/core/combat/Analysis/BalanceValidator.ts`
  - `validate(party, enemies, intendedDifficulty, config): BalanceReport`
- [ ] **4.1.2** Define `BalanceReport` interface
  ```typescript
  interface BalanceReport {
    intendedDifficulty: EncounterDifficulty;
    actualDifficulty: EncounterDifficulty;
    balanceScore: number;              // 0-100, how well actual matches intended
    playerWinRate: number;
    expectedWinRate: number;           // Based on D&D 5e guidelines
    difficultyVariance: 'underpowered' | 'balanced' | 'overpowered';
    confidence: number;                // Based on run count (more runs = higher confidence)
    recommendations: BalanceRecommendation[];
  }
  ```
- [ ] **4.1.3** Define expected win rates per difficulty tier
  - Easy: ~90%+ player win rate
  - Medium: ~70-80% player win rate
  - Hard: ~50-60% player win rate
  - Deadly: ~30-40% player win rate
  - These are tunable based on what feels right for the game
- [ ] **4.1.4** Implement balance score calculation
  - Compare actual win rate to expected win rate range
  - Score 100 = perfect match, decreasing for larger variance
  - Factor in average HP remaining (a 100% win rate with 1 HP left is different from 100% with full HP)
- [ ] **4.1.5** Implement `BalanceRecommendation` generation
  - If overpowered: "Reduce enemy CR by 1", "Reduce enemy count by 1", "Remove one extra ability"
  - If underpowered: "Increase enemy CR by 1", "Add one more enemy", "Promote one enemy to higher rarity"
  - Include confidence-adjusted recommendations

### 4.2 Parameter Sweep

- [ ] **4.2.1** Create `src/core/combat/Analysis/ParameterSweep.ts`
  - `sweep(baseParty, baseEncounter, params): SweepResults`
- [ ] **4.2.2** Define sweep parameter types
  ```typescript
  interface SweepParams {
    variable: 'cr' | 'enemyCount' | 'partyLevel' | 'difficultyMultiplier' | 'rarity';
    range: { min: number; max: number; step: number };
    simulationsPerPoint: number;  // e.g., 200 simulations per data point
    aiConfig: AIConfig;
  }
  ```
- [ ] **4.2.3** Implement sweep execution
  - For each value in the range, modify the encounter/party, run simulations, collect summary
  - Return `SweepResults` with data points mapping parameter value → simulation summary
- [ ] **4.2.4** Define `SweepResults` for visualization
  ```typescript
  interface SweepResults {
    variable: string;
    dataPoints: SweepDataPoint[];
  }
  interface SweepDataPoint {
    parameterValue: number;
    playerWinRate: number;
    averageRounds: number;
    averageHPRemaining: number;
  }
  ```

### 4.3 Comparative Analysis

- [ ] **4.3.1** Create `src/core/combat/Analysis/ComparativeAnalyzer.ts`
  - `compare(configA, configB): ComparisonResult`
- [ ] **4.3.2** Run simulations for both configurations with identical seeds
  - Use same seed sequence for both to isolate the variable being tested
  - Pair-wise comparison where possible
- [ ] **4.3.3** Calculate delta metrics
  - Win rate delta, average rounds delta, average HP remaining delta, DPR delta per combatant
  - Statistical significance (is the difference meaningful given the sample size?)

### 4.4 Encounter Difficulty Calculator

- [ ] **4.4.1** Create `src/core/combat/Analysis/DifficultyCalculator.ts`
  - Given a party and a desired difficulty, suggest enemy configurations
  - Uses simulation data to calibrate suggestions
- [ ] **4.4.2** Implement binary search approach
  - `getCRFromXP()` in `EncounterBalance.ts` already implements binary search over CR values — reuse this as the starting point
  - Start with XP-budget-based CR estimate from `getCRFromXP()`
  - Run simulations, check if win rate matches target
  - Adjust CR up or down based on results
  - Iterate until win rate converges on target range
- [ ] **4.4.3** Return confidence intervals
  - "For a Medium encounter, use CR 3 enemies (win rate: 72% ± 5%)"
  - Based on the statistical spread of simulation results

### 4.5 Analysis Tests

- [ ] **4.5.1** Test balance validator with known configurations
  - Trivially easy fight → should report overpowered
  - Trivially hard fight → should report underpowered
  - Balanced fight → should report balanced
- [ ] **4.5.2** Test parameter sweep produces reasonable curves
  - Win rate should generally decrease as CR increases
  - Win rate should generally decrease as enemy count increases
- [ ] **4.5.3** Test comparative analysis detects meaningful differences
  - +2 AC should improve win rate measurably
  - Adding a party member should improve win rate measurably

---

## Phase 5: Engine Exports & API Surface

> **Project:** playlist-data-engine (`../playlist-data-engine/`)
> **Goal:** Ensure all new modules are properly exported from the engine package for frontend consumption.

- [ ] **5.1** Update `src/index.ts` (or equivalent barrel export) to export:
  - `SeededDiceRoller`
  - `CombatSimulator`, `SimulationConfig`, `SimulationResults`
  - `CombatAI`, `AIConfig`, `AIPlayStyle`, `AIDecision`
  - `AICombatRunner`
  - `BalanceValidator`, `BalanceReport`, `BalanceRecommendation`
  - `ParameterSweep`, `SweepParams`, `SweepResults`
  - `ComparativeAnalyzer`, `ComparisonResult`
  - `DifficultyCalculator`
  - `SimulationAggregator`
  - All new type interfaces
- [ ] **5.2** Ensure engine build compiles with all new modules
- [ ] **5.3** Verify TypeScript types are clean (no `any`, proper generics)

---

## Phase 6: Engine Documentation

> **Project:** playlist-data-engine (`../playlist-data-engine/`)
> **Goal:** Update all engine documentation to cover the new combat mechanics, AI system, simulation tools, and balance analysis. This serves as the reference for frontend development in Phases 7-10.

### 6.1 Update COMBAT_SYSTEM.md — Combat Mechanics & AI

> This doc covers "how combat executes." Add sections for all new combat mechanics and the AI system.

- [ ] **6.1.1** Add **Seeded Dice Rolling** section
  - Document `SeededDiceRoller` class and its relationship to `DiceRoller`
  - Explain when to use seeded vs random rolling
  - Document `CombatEngine` roller injection
  - Include code examples for deterministic combat
- [ ] **6.1.2** Add **Status Effects** section
  - Document the updated `StatusEffect` interface (new optional fields: `damage`, `damageType`, `mechanicalEffects`)
  - Document `applyStatusEffect()` and `removeExpiredStatusEffects()` methods
  - Document the duration tracking lifecycle (applied → tick down each turn → expire → remove)
  - Document concentration tracking
  - Document each mechanically enforced condition: Charmed, Frightened, Burning, Stunned, Prone
  - Include code examples for applying and checking status effects
- [ ] **6.1.3** Add **Legendary Actions** section
  - Document `executeLegendaryAction()` method
  - Document action point tracking (3 per round, reset at start of boss's turn)
  - Document `useLegendaryResistance()` method
  - Document the `Combatant` type additions (`legendaryActionsRemaining`, `legendaryResistancesRemaining`)
  - Include code examples for executing legendary actions during combat
- [ ] **6.1.4** Add **Combat AI** section
  - Document the `AIPlayStyle` enum and what each style means (normal, aggressive)
  - Document the `AIConfig` interface (per-side styles, per-combatant overrides)
  - Document the `AIDecision` output format (action, target, weapon, spell, reasoning)
  - Document the `AICombatRunner` — how to run a full AI-controlled combat
  - Include code examples for each play style
  - Explain the AI decision-making process: threat assessment → target selection → action selection
- [ ] **6.1.5** Add **Monte Carlo Simulation** section
  - Document `CombatSimulator` class and `SimulationConfig`
  - Document `SimulationResults` and `SimulationSummary` interfaces
  - Document `CombatantSimulationMetrics` (DPR, survival rate, kill rate, etc.)
  - Document `HistogramBucket` for distribution data
  - Include code examples: basic simulation, progress callback, cancellation
  - Explain determinism (same seed + config = identical results)
- [ ] **6.1.6** Update Table of Contents to include new sections

### 6.2 Update ENEMY_GENERATION.md — Balance Analysis Tools

> This doc covers "how to build balanced encounters." Extend the existing Encounter Balance section with simulation-based tools.

- [ ] **6.2.1** Add **Simulation-Based Balance Validation** section (after existing Encounter Balance)
  - Explain the concept: XP budgets are theoretical, simulation validates actual difficulty
  - Document `BalanceValidator` — how to validate an encounter against intended difficulty
  - Document `BalanceReport` output (balance score, actual vs intended, recommendations)
  - Include code example: validate a party-balanced encounter
  - Explain expected win rates per difficulty tier (Easy ~90%+, Medium ~70-80%, Hard ~50-60%, Deadly ~30-40%)
- [ ] **6.2.2** Add **Parameter Sweep** subsection
  - Document `ParameterSweep` and `SweepParams` (variable, range, simulations per point)
  - Document `SweepResults` and `SweepDataPoint`
  - Include code example: sweep CR from 1-10 to find the sweet spot for Medium difficulty
  - Explain how to interpret sweep results (win rate curves, difficulty thresholds)
- [ ] **6.2.3** Add **Comparative Analysis** subsection
  - Document `ComparativeAnalyzer` — compare two encounter configurations
  - Explain identical-seed methodology for fair comparison
  - Include code example: compare "+2 AC" vs "no AC bonus"
- [ ] **6.2.4** Add **Difficulty Calculator** subsection
  - Document `DifficultyCalculator` — given a party and desired difficulty, suggest enemy config
  - Explain binary search approach and confidence intervals
  - Include code example: "What CR should I use for a Hard encounter with this level 5 party?"
- [ ] **6.2.5** Add **Recommended Simulation Counts** reference table
  - Quick exploration (100 runs): rough estimate, fast
  - Standard analysis (500 runs): reasonable confidence for most decisions
  - Thorough validation (2000 runs): high confidence, good for final balance decisions
  - Publication-quality (5000+ runs): very high confidence, for documentation/balance patches
- [ ] **6.2.6** Update Table of Contents to include new sections

### 6.3 Update DATA_ENGINE_REFERENCE.md

- [ ] **6.3.1** Add entries for all new exported classes and types
  - `SeededDiceRoller`
  - `CombatAI`, `AIConfig`, `AIPlayStyle`, `AIDecision`, `AIThreatAssessment`
  - `AICombatRunner`
  - `CombatSimulator`, `SimulationConfig`, `SimulationResults`, `SimulationSummary`
  - `CombatantSimulationMetrics`, `HistogramBucket`, `SimulationAggregator`
  - `BalanceValidator`, `BalanceReport`, `BalanceRecommendation`
  - `ParameterSweep`, `SweepParams`, `SweepResults`, `SweepDataPoint`
  - `ComparativeAnalyzer`, `ComparisonResult`
  - `DifficultyCalculator`
- [ ] **6.3.2** Add entries for new CombatEngine methods
  - `applyStatusEffect()`, `removeExpiredStatusEffects()`
  - `executeLegendaryAction()`, `useLegendaryResistance()`
- [ ] **6.3.3** Add entries for updated types
  - `StatusEffect` (new optional fields)
  - `Combatant` (new legendary tracking fields)
  - `CombatResult` (new `winnerSide` field)
  - `Spell` / `InnateSpell` (unified type with tags support)
  - `CombatAction` (expanded type union with `'useItem'`, `'legendaryAction'`)

### 6.4 Update ROLLS_AND_SEEDS.md

- [ ] **6.4.1** Document how seeded RNG is used in simulations
  - Explain that each simulation run gets a unique seed derived from `baseSeed + runIndex`
  - Explain determinism guarantees (same base seed + same config = identical results)
  - Document the relationship between `SeededRNG` (enemy generation) and `SeededDiceRoller` (combat rolls)
- [ ] **6.4.2** Document `SeededDiceRoller`
  - How to create a seeded roller instance
  - How to inject it into `CombatEngine`
  - How the `CombatSimulator` manages dice roller seeding per run

---

## Phase 7: Frontend — Simulation Infrastructure

> **Project:** playlist-data-showcase (this project)
> **Goal:** Build the React infrastructure for running simulations, managing state, and connecting to the engine.

### 7.1 Simulation Hook

- [ ] **7.1.1** Create `src/hooks/useCombatSimulation.ts`
  - Wraps `CombatSimulator` from the engine
  - Manages simulation state: idle, running, completed, cancelled
  - Provides progress updates via React state
  - Handles cancellation via `AbortController`
  - Returns: `results`, `isRunning`, `progress`, `error`, `startSimulation()`, `cancelSimulation()`
- [ ] **7.1.2** Implement Web Worker offloading for long simulations
  - Create `src/workers/simulationWorker.ts`
  - Run simulations in a Web Worker to avoid blocking the UI
  - Post progress messages back to main thread
  - Handle cancellation via worker termination
  - **Note:** Verify linked `playlist-data-engine` package works in worker context. Fallback: serialize config to worker.
- [ ] **7.1.3** Add fallback for environments without Web Worker support
  - Run synchronously with periodic `setTimeout` yields to keep UI responsive
  - Show warning that large simulations may be slow

### 7.2 Simulation State Persistence

- [ ] **7.2.1** Create `src/store/simulationStore.ts` (Zustand with persist)
  - Store simulation configs, results, and history
  - Max 50 saved simulations
  - Key fields: party config, encounter config, AI config, results, timestamp
- [ ] **7.2.2** Implement save/load/delete simulation results
- [ ] **7.2.3** Implement comparison mode — save two simulation results for side-by-side comparison

### 7.3 Simulation Configuration Types

- [ ] **7.3.1** Create `src/types/simulation.ts`
  - Mirror engine types with UI-specific additions (display names, descriptions)
  - Define `SimulationConfigUI` that extends engine's `SimulationConfig` with UI state
  - Define `SimulationResultUI` that wraps engine results with metadata

---

## Phase 8: Frontend — Simulation UI

> **Project:** playlist-data-showcase (this project)
> **Goal:** Build the user interface for configuring, running, and reviewing combat simulations.

### 8.1 Balance Lab Tab

- [ ] **8.1.1** Add `'balance'` tab to the tab system in `App.tsx`
  - Position after `'combat'` and before `'settings'`
  - Icon: `Scale` from lucide-react (balance/scales icon)
  - Label: "Balance Lab"
- [ ] **8.1.2** Create `src/components/Tabs/BalanceLabTab.tsx` — main container
  - Two-panel layout: configuration (left) and results (right)
  - Collapsible panels for space management
  - Responsive layout for mobile
- [ ] **8.1.3** Create `src/components/Tabs/BalanceLabTab.css`

### 8.2 Simulation Configuration Panel

- [ ] **8.2.1** Create `src/components/balance/SimulationConfigPanel.tsx`
  - **Party Selection**: Pull characters from `characterStore`, select up to 4
  - **Encounter Configuration**: CR, count, category, archetype, seed, rarity
  - **Simulation Settings**:
    - Run count slider (100 / 250 / 500 / 1000 / 2500 / 5000 / 10000)
    - AI Strategy per side (two dropdowns: player strategy, enemy strategy)
    - Collect detailed logs toggle (warning about memory for high run counts)
  - **Run / Cancel buttons** with progress bar
- [ ] **8.2.2** Create `src/components/balance/AIStrategySelector.tsx`
  - Visual selector for AI strategy with descriptions
  - **Normal**: "Balanced combat — basic attacks, standard tactics, conserves resources"
  - **Aggressive**: "Maximum threat — burns all spell slots, items, and abilities every fight"
  - Per-side configuration (Players / Enemies)
- [ ] **8.2.3** Create `src/components/balance/PartySelector.tsx`
  - Reuse character selection pattern from CombatSimulatorTab
  - Show character cards with key stats (level, AC, HP, class)
  - Max 4 characters
- [ ] **8.2.4** Create `src/components/balance/EncounterConfigForm.tsx`
  - CR input (number or slider, 0.25-30)
  - Enemy count (1-10)
  - Category dropdown
  - Archetype dropdown
  - Seed input (text)
  - Rarity selector
  - Difficulty multiplier slider
- [ ] **8.2.5** Create `src/components/balance/SimulationProgressBar.tsx`
  - Shows progress (runs completed / total)
  - Shows estimated time remaining
  - Cancel button
  - Current win rate preview (updates live as runs complete)

### 8.3 Results Summary Panel

- [ ] **8.3.1** Create `src/components/balance/ResultsSummary.tsx`
  - **Win Rate Display**: Large percentage with color coding (green = high, red = low)
  - **Difficulty Assessment**: Shows actual vs intended difficulty with match indicator
  - **Key Metrics Grid**:
    - Average rounds to resolution
    - Average player HP remaining (%)
    - Total player deaths across all runs
    - Total enemy deaths across all runs
- [ ] **8.3.2** Create `src/components/balance/BalanceScoreIndicator.tsx`
  - Visual gauge/meter showing balance score (0-100)
  - Color gradient: red (poor balance) → yellow (acceptable) → green (well balanced)
  - Tooltip with detailed explanation
- [ ] **8.3.3** Create `src/components/balance/PerCombatantMetrics.tsx`
  - Table showing per-combatant aggregate stats
  - Columns: Name, Side, DPR, Avg Damage Taken, Survival Rate, Kill Rate, Crit Rate
  - Sortable by any column
  - Highlight top performers
- [ ] **8.3.4** Create `src/components/balance/BalanceRecommendations.tsx`
  - List of actionable recommendations from `BalanceValidator`
  - Each recommendation shows: what to change, expected impact, confidence level
  - Click to apply suggestion (updates encounter config)

### 8.4 Detailed Log Viewer

- [ ] **8.4.1** Create `src/components/balance/SimulationLogViewer.tsx`
  - Select a specific simulation run to view its full combat log
  - Dropdown or list to pick run number
  - Show combat log in same format as CombatSimulatorTab's log
  - Show per-round breakdown with metrics
- [ ] **8.4.2** Add export functionality
  - Export simulation results as JSON (full structured data)
  - Export as CSV (summary table for spreadsheets)
  - Copy to clipboard

---

## Phase 9: Frontend — Visualization & Charts

> **Project:** playlist-data-showcase (this project)
> **Goal:** Build visualization components using **recharts** for balance data display.

### 9.1 Install & Configure recharts

- [ ] **9.1.1** Install `recharts` as a dependency
- [ ] **9.1.2** Configure recharts theming to match existing project styles
  - Dark theme colors consistent with existing HSL palette
  - Responsive container wrapper component

### 9.2 Balance Visualization Components

- [ ] **9.2.1** Create `src/components/balance/charts/WinRateChart.tsx`
  - Bar chart showing player win rate with confidence interval
  - Color-coded by difficulty assessment
  - Optional: overlay multiple simulation results for comparison
- [ ] **9.2.2** Create `src/components/balance/charts/DPRComparisonChart.tsx`
  - Horizontal bar chart comparing DPR across combatants
  - Separate sections for players vs enemies
  - Color-coded by side
- [ ] **9.2.3** Create `src/components/balance/charts/HPRemainingDistribution.tsx`
  - Histogram showing HP remaining at end of combat (winning runs only)
  - Helps understand how close fights were
  - Shows mean and median lines
- [ ] **9.2.4** Create `src/components/balance/charts/TurnDistributionChart.tsx`
  - Histogram showing number of rounds to combat resolution
  - Separate distributions for wins vs losses
  - Shows mean and median
- [ ] **9.2.5** Create `src/components/balance/charts/SurvivalRateChart.tsx`
  - Bar chart showing per-combatant survival rate
  - Highlight which combatants die most/least often
- [ ] **9.2.6** Create `src/components/balance/charts/DamageDistributionChart.tsx`
  - Histogram showing per-round damage dealt distribution for selected combatant
  - Dropdown to select which combatant to view
- [ ] **9.2.7** Create `src/components/balance/charts/SweepResultsChart.tsx`
  - Line chart showing how win rate changes as a parameter varies (from parameter sweep)
  - X-axis: parameter value (CR, count, etc.)
  - Y-axis: player win rate
  - Reference lines for difficulty thresholds (90%, 75%, 55%, 35%)
  - Highlight the "sweet spot" range for each difficulty

### 9.3 Comparison Mode

- [ ] **9.3.1** Create `src/components/balance/ComparisonPanel.tsx`
  - Side-by-side view of two simulation results
  - Uses `ComparativeAnalyzer` from engine
  - Shows delta metrics with up/down arrows and color coding
- [ ] **9.3.2** Create `src/components/balance/charts/ComparisonOverlayChart.tsx`
  - Line chart overlaying win rate curves from two configurations
  - Clear legend distinguishing Config A vs Config B
  - Highlight crossover points

### 9.4 Balance Dashboard

- [ ] **9.4.1** Create `src/components/balance/BalanceDashboard.tsx`
  - Main results view that assembles all charts and metrics
  - Grid layout:
    - Top: Win rate + balance score (large, prominent)
    - Middle-left: DPR comparison, survival rates
    - Middle-right: HP remaining distribution, turn distribution
    - Bottom: Recommendations, detailed metrics table
  - Responsive: stacks vertically on mobile
- [ ] **9.4.2** Add chart interactivity
  - Click on combatant in metrics table → highlight in DPR chart
  - Click on histogram bucket → show runs in that range
  - Hover effects with tooltips

---

## Phase 10: Integration & Polish

> **Projects:** Both playlist-data-engine and playlist-data-showcase
> **Goal:** Connect all pieces and polish the experience.

### 10.1 CombatSimulatorTab Integration

- [ ] **10.1.1** Add "Run Balance Simulation" button to CombatSimulatorTab
  - Appears in the pre-combat configuration view
  - Transfers current party + enemy config to Balance Lab tab
  - Opens Balance Lab tab with pre-filled configuration
- [ ] **10.1.2** Add balance indicator to CombatSimulatorTab's encounter summary
  - After running a simulation, show a small badge/indicator on the encounter summary
  - "This encounter is balanced for Medium difficulty (72% win rate)"

### 10.2 AI-Auto-Play Upgrade

- [ ] **10.2.1** Replace the basic auto-play in CombatSimulatorTab with the new AI system
  - Add AI strategy selector to auto-play controls (Normal / Aggressive)
  - Use `AICombatRunner` for intelligent auto-play instead of "attack first target"
  - Show AI reasoning in combat log (e.g., "[AI: Aggressive] Grognak attacks weakest target — Goblin Archer (5 HP)")
- [ ] **10.2.2** Add per-combatant AI strategy override
  - Allow setting different AI strategies for individual combatants
  - Useful for testing specific scenarios

### 10.3 Performance & UX

- [ ] **10.3.1** Add simulation caching
  - Cache simulation results by config hash
  - Avoid re-running identical simulations
  - Invalidate cache when engine version changes
- [ ] **10.3.2** Add loading skeletons for Balance Lab tab
  - Match existing skeleton patterns from PartyAnalyzerCard
- [ ] **10.3.3** Add keyboard shortcuts
  - `Ctrl+Shift+B` — open Balance Lab tab
  - `Ctrl+Enter` — run simulation from config panel
- [ ] **10.3.4** Add empty states and guidance
  - First-time user guidance in Balance Lab
  - Explain what each metric means
  - Suggest starting configurations for new users

---

## Dependencies

### Critical Path (must complete before next phase can start)

```
Phase 0 (SeededDiceRoller)
  └──→ blocks Phase 2 (AI needs deterministic rolls) and Phase 3 (Simulator needs deterministic rolls)

Phase 1 (Engine Prerequisites)
  ├── 1.1 Spell Slot Sync ──→ needed by Phase 2 (AI manages spell slots)
  ├── 1.2 Test Foundation ──→ needed by all subsequent phases
  ├── 1.3 Status Effects ──→ needed by Phase 2 (AI reads status effects) [can be parallel with 2.1-2.2]
  ├── 1.4 Legendary Actions ──→ needed by Phase 2 (AI uses legendary actions) [can be parallel with 2.1-2.2]
  ├── 1.5 Winner Refactor ──→ needed by Phase 3 (Simulator checks win conditions)
  └── 1.6 Enemy Spell Data ──→ needed by Phase 2 (AI needs enemy spell data for spell selection)

Phase 2 (Combat AI)
  └── depends on Phase 0 + 1.1 + 1.2 + 1.6 complete ──→ needed by Phase 3

Phase 3 (Monte Carlo Simulator)
  └── depends on Phase 0 + 1.5 + Phase 2 complete ──→ needed by Phase 4

Phase 4 (Balance Analysis)
  └── depends on Phase 3 complete ──→ needed by Phase 7+

Phase 5 (Engine Exports)
  └── depends on Phases 0-4 complete ──→ needed by Phase 7

Phase 6 (Engine Documentation)
  └── depends on Phases 0-5 complete ──→ needed by Phase 7 (frontend references docs)

Phase 7 (Frontend Infrastructure)
  └── depends on Phases 5-6 complete ──→ needed by Phase 8

Phase 8 (Simulation UI)
  └── depends on Phase 7 complete ──→ needed by Phase 9

Phase 9 (Visualization)
  └── depends on Phase 8 complete (needs results to display)

Phase 10 (Integration & Polish)
  └── depends on Phases 8-9 complete
```

### Parallelizable Work

- **Phase 0 + 1.1 + 1.2 + 1.6** can be done in parallel — independent prerequisites
- **Phase 1.3 + 1.4** can be done in parallel with **Phase 2.1-2.2** — status effects and legendary actions don't block basic AI decision-making
- **Phase 9.1 (Install recharts)** can start in parallel with Phase 8 — charting setup doesn't depend on simulation UI
- **Phase 4.1 + 4.2 + 4.3** can be done in parallel — independent analysis modules
- **Phase 6.1 + 6.2 + 6.3 + 6.4** can be done in parallel — independent doc files

### Fast Path to First Balance Data

The minimum path to get actionable balance numbers:

1. **Phase 0** (SeededDiceRoller) — thin wrapper around existing SeededRNG
2. **Phase 1.1** (Spell slot sync) + **1.2** (Tests) + **1.6** (Enemy spell data) — parallel
3. **Phase 2** (AI with Normal + Aggressive only) — core attack loop
4. **Phase 3** (Simulator) — run 1000 fights, get DPR/win rate/survival data

This gets you *"a level 5 fighter vs a CR 3 brute wins in ~4 rounds 73% of the time"* before status effects, legendary actions, or the full frontend are complete.

---

## Resolved Decisions

1. **DiceRoller seeding**: Create `SeededDiceRoller` class wrapping `SeededRNG`, inject into `CombatEngine`. The existing `seededRoll()` static method is a dead-end. `SeededRNG` already exists and is solid (MurmurHash V3, stateful counter) — `SeededDiceRoller` is a thin wrapper.
2. **Chart library**: Use **recharts** — React-native, tree-shakeable, well-maintained.
3. **AI scope**: Full simulation for enemies (simpler kits with tags), simplified simulation for players (complex class features).
4. **AI strategies**: Two primary modes — **Normal** (baseline difficulty, balanced combat) and **Aggressive** (maximum threat ceiling, burn all resources). Both apply to players and enemies.
5. **AI class features**: Player class-specific features (Sneak Attack, Divine Smite, Action Surge) are controlled by `AIConfig.enableClassFeatures` flag. Default `false` for simple AI, `true` for advanced simulation.
6. **Concentration**: Implement in Phase 1.3 alongside status effects — infrastructure already exists (`hasConcentration` field on spells).
7. **Opportunity attacks**: Implement alongside status effects/legendary actions as part of complete combat mechanics.
8. **Web Worker bundling**: Verify linked `playlist-data-engine` works in worker context. Fallback: serialize config to worker.
9. **CombatResult.winner**: Refactor to add `winnerSide: 'player' | 'enemy' | 'draw'` — current field is misleading for party vs group combat.
10. **Enemy spell data**: Unify `InnateSpell` and `Spell` types so enemy spell data survives from generation into combat. Currently enemy spells are converted to string IDs and slots are hardcoded empty — this must be fixed before AI can use enemy spells.
11. **Duplicate spell slot tables**: Consolidate the identical hardcoded D&D 5e table from `CombatEngine.initializeSpellSlots()` and `SpellCaster.restoreSpellSlots()` into a shared constant.
12. **Test strategy**: Rewrite combat tests from scratch (existing `combat.test.ts` is broken with multiple mock data issues). Don't attempt to fix the broken tests.
13. **Win rate targets**: Placeholder values (Easy ~90%+, Medium ~70-80%, Hard ~50-60%, Deadly ~30-40%) — to be tuned after simulation testing.
14. **Styling approach**: Custom CSS with CSS variables (HSL color system in `:root`), no framework. Use `lucide-react` for icons. Balance Lab components follow existing patterns.
15. **`getCRFromXP()` binary search**: Already implemented in `EncounterBalance.ts` — Phase 4.4.2 reuses this existing implementation.
