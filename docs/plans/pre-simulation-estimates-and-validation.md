# Pre-Simulation Estimates & Estimate Validation

## Overview

Add instant pre-simulation estimates to the Balance Lab config panel (party stats, enemy preview, predicted difficulty) and a post-simulation validation panel that compares estimates vs actual results. When discrepancies are found, the validation panel suggests **concrete code changes** to the estimation formulas in the engine — no self-adjusting algorithm, just deterministic comparison with actionable developer feedback.

## Architecture

```
SimulationConfigPanel
├── PartySelector
├── PartyEstimateCard        ← NEW (Phase 1)
├── EncounterConfigForm
├── EnemyEstimateCard        ← NEW (Phase 1)
├── PredictedDifficultyBar   ← NEW (Phase 1)
├── Simulation Settings
└── Run/Cancel buttons

BalanceLabTab (results area)
├── BalanceDashboard
└── EstimateValidationPanel  ← NEW (Phase 2)
    ├── Comparison Table
    └── Code Suggestions
```

**Data flow:**

1. User selects party + configures encounter → `useEstimateSnapshot()` computes instant estimates
2. User hits "Run" → estimates are **snapshotted** and passed alongside the simulation call
3. Simulation completes → `EstimateValidationPanel` compares snapshot vs actual results
4. Discrepancies are analyzed → specific code suggestions are rendered

---

## Phase 1: Pre-Simulation Estimate Types & Utilities

- [x] **1.1 Create `SimulationEstimateSnapshot` type** in `src/types/simulation.ts`

  ```ts
  interface SimulationEstimateSnapshot {
    // Party estimates (from PartyAnalyzer.analyzeParty)
    party: {
      averageLevel: number;
      partySize: number;
      averageAC: number;
      averageHP: number;
      estimatedDPR: number;
      totalStrength: number;
      xpBudgets: { easy: number; medium: number; hard: number; deadly: number };
    };
    // Enemy estimates (from preview generation + formula parsing)
    enemy: {
      count: number;
      perEnemyHP: number;
      perEnemyAC: number;
      perEnemyEstDPR: number;
      totalAdjustedXP: number;
      enemyCR: number;
      archetype: string;
      rarity: string;
    };
    // Derived prediction
    prediction: {
      predictedDifficulty: EncounterDifficulty;
      xpRatio: number;           // encounter XP / party medium XP budget
      predictedWinRate: number;  // midpoint of predicted difficulty tier
    };
    // Timestamp for debugging
    timestamp: string;
  }
  ```

- [x] **1.2 Create `useEstimateSnapshot()` hook** in `src/hooks/useEstimateSnapshot.ts`

  Pure computation hook (no side effects). Takes `selectedParty: CharacterSheet[]` and `encounterConfig: EncounterConfigUI`, returns `SimulationEstimateSnapshot | null`.

  Internally:
  - Calls `PartyAnalyzer.analyzeParty(selectedParty)` for party stats + XP budgets
  - Generates a **single preview enemy** from `encounterConfig` using `useEnemyGenerator().generate()` with a deterministic preview seed (e.g., `preview-${encounterConfig.seed || 'default'}`)
  - Computes enemy est. DPR: iterates the preview enemy's `equipment.weapons` (equipped), parses each weapon's damage dice via `new CombatAI({ playerStyle: 'normal', enemyStyle: 'normal' }).averageDamageFromFormula(dice)`, takes the max as best-weapon DPR. Also checks `combat_spells` for cantrip damage. Accounts for multiattack if `attacks` array length > 1 on the enemy.
  - Computes `totalAdjustedXP` via `calculateAdjustedXP(enemyCRs)` where enemyCRs = `[cr] * enemyCount`
  - Derives predicted difficulty: compares `totalAdjustedXP` against party XP budgets (easy/medium/hard/deadly), picks the highest budget the encounter XP exceeds
  - Derives predicted win rate: midpoint of `EXPECTED_WIN_RATES[predictedDifficulty]`
  - All memoized with `useMemo`, recalculates only when inputs change

- [x] **1.3 Create `estimateEnemyDPR()` utility function** in `src/utils/estimateEnemyDPR.ts`

  Standalone pure function (not a hook) that takes a `CharacterSheet` (enemy) and returns estimated DPR.

  Logic:
  1. Get all equipped weapons → parse each weapon's damage dice via `CombatAI.averageDamageFromFormula()`
  2. Take the best weapon damage as base single-attack DPR
  3. Check if enemy has multiple attacks (look at `character.attacks` array length if it exists, or check for legendary actions with damage)
  4. Multiply base DPR by attack count (1 if single-attack, 2-3 for multiattack enemies)
  5. Also check `combat_spells` for damage cantrips/spells, take max of weapon vs spell DPR
  6. Return the final estimated DPR

  This function is extracted so it can be reused in Phase 2 for gap analysis.

---

## Phase 2: Pre-Simulation Estimate UI in Config Panel

- [x] **2.1 Create `PartyEstimateCard` component** in `src/components/balance/PartyEstimateCard.tsx` + `.css`

  Compact inline card displayed below `PartySelector` inside `SimulationConfigPanel`.

  Props: `analysis: PartyAnalysis | null`, `isLoading: boolean`

  Layout: horizontal stat pills in a single row (or 2-row grid on mobile)
  ```
  ┌─────────────────────────────────────────────────────┐
  │ Party Estimate                                       │
  │ Lv 5  │  AC 16  │  HP 42  │  DPR ~14  │  Str 1820  │
  ├─────────────────────────────────────────────────────┤
  │ XP Budgets: Easy 1000 │ Medium 2000 │ Hard 3000 │ Deadly 4000 │
  └─────────────────────────────────────────────────────┘
  ```

  - Only renders when `analysis` is non-null (party selected)
  - Shows loading skeleton while `isLoading` is true
  - XP budget values color-coded: green if encounter XP is below, yellow if near, red if above

- [ ] **2.2 Create `EnemyEstimateCard` component** in `src/components/balance/EnemyEstimateCard.tsx` + `.css`

  Compact inline card displayed below `EncounterConfigForm` inside `SimulationConfigPanel`.

  Props: `snapshot: SimulationEstimateSnapshot['enemy'] | null`, `isLoading: boolean`

  Layout:
  ```
  ┌─────────────────────────────────────────────────────┐
  │ Enemy Estimate (×3)                                 │
  │ HP 67  │  AC 14  │  DPR ~18  │  CR 3  │  XP 2400  │
  │ Adjusted XP: 3600 (×2.0 multiplier for 3 enemies)  │
  └─────────────────────────────────────────────────────┘
  ```

  - Shows per-enemy stats and total adjusted XP
  - If enemy generation fails (preview returns null), show "Unable to preview enemy"
  - Shows the encounter multiplier being applied

- [ ] **2.3 Create `PredictedDifficultyBar` component** in `src/components/balance/PredictedDifficultyBar.tsx` + `.css`

  A visual difficulty prediction bar displayed below both estimate cards, above the simulation settings.

  Props: `snapshot: SimulationEstimateSnapshot | null`

  Layout:
  ```
  ┌─────────────────────────────────────────────────────┐
  │ Predicted Difficulty: ██████████░░░░ Hard            │
  │ Encounter XP 3600 vs Party Medium Budget 2000       │
  │ (1.8× over medium → estimated ~45% win rate)        │
  └─────────────────────────────────────────────────────┘
  ```

  - Shows a segmented bar with Easy/Medium/Hard/Deadly zones
  - A marker shows where the encounter falls
  - Displays the XP ratio and estimated win rate
  - Only renders when both party and enemy estimates are available

- [ ] **2.4 Wire estimates into `SimulationConfigPanel`**

  In `src/components/balance/SimulationConfigPanel.tsx`:

  1. Import and call `useEstimateSnapshot(selectedParty, encounterConfig)`
  2. Import `usePartyAnalysis` from existing hook, pass `characters` + `selectedSeeds` (as a `Set`)
  3. Render `PartyEstimateCard` below `PartySelector`
  4. Render `EnemyEstimateCard` below `EncounterConfigForm`
  5. Render `PredictedDifficultyBar` below both

  Note: `useEstimateSnapshot` can internally use `usePartyAnalysis` or call `PartyAnalyzer.analyzeParty()` directly — whichever is cleaner. The existing `usePartyAnalysis` hook has a loading delay UX that may not be desired here (we want instant estimates), so prefer calling `PartyAnalyzer.analyzeParty()` directly with `useMemo`.

- [ ] **2.5 Snapshot estimates when simulation starts**

  In `SimulationConfigPanel.handleRun()`:
  1. Capture the current `estimateSnapshot` from the hook
  2. Pass it to the parent via a new callback: `onRunSimulation(party, enemies, config, estimateSnapshot)`
  3. Thread this through `BalanceLabTab.handleRunSimulation` → store in a ref

  In `BalanceLabTab`:
  1. Add `estimateSnapshotRef = useRef<SimulationEstimateSnapshot | null>(null)`
  2. Set it in `handleRunSimulation` callback
  3. Pass it down to the results area (or store it alongside results)

---

## Phase 3: Post-Simulation Validation Panel

- [ ] **3.1 Create `useEstimateValidation()` hook** in `src/hooks/useEstimateValidation.ts`

  Takes `estimateSnapshot: SimulationEstimateSnapshot | null` and `simulationResults: SimulationResults | null`. Returns validation data.

  Computes:
  ```ts
  interface EstimateValidation {
    // Individual metric comparisons
    comparisons: Array<{
      label: string;          // "Party DPR"
      estimated: number;
      actual: number;
      delta: number;          // actual - estimated
      deltaPercent: number;   // (actual - estimated) / estimated * 100
      isSignificant: boolean; // |deltaPercent| > 10%
    }>;
    // Difficulty comparison
    difficultyComparison: {
      predicted: EncounterDifficulty;
      actual: EncounterDifficulty;
      predictedWinRate: number;
      actualWinRate: number;
      tierDelta: number;      // how many tiers off (0 = exact, 1 = adjacent, etc.)
    };
    // Code suggestions (only for significant discrepancies)
    suggestions: Array<{
      severity: 'info' | 'warning' | 'error';
      metric: string;
      message: string;        // human-readable description
      codeReference: {
        file: string;         // relative path to engine file
        function: string;     // function name
        line?: number;
      };
      suggestedFix: string;   // what to change and why
    }>;
  }
  ```

  Logic for computing `comparisons`:
  - **Party DPR**: estimated from `PartyAnalyzer.getAverageDamage()` vs actual from `perCombatantMetrics` (average of `averageDamagePerRound` for all player-side combatants)
  - **Enemy DPR**: estimated from `estimateEnemyDPR()` vs actual from `perCombatantMetrics` (average of `averageDamagePerRound` for all enemy-side combatants)
  - **Party AC**: estimated from `PartyAnalyzer.getAverageAC()` vs derived from actual hit rates (not directly available — can compute from `criticalHitRate` and total attacks, or skip this comparison)
  - **Difficulty tier**: predicted vs `getWinRateDifficulty(results.summary.playerWinRate)`
  - **Win rate**: predicted midpoint vs actual

  Logic for computing `suggestions`:

  **Party DPR overestimate (>10% high):**
  - Check if `estimateCharacterDamage()` (line 279 of PartyAnalyzer.ts) assumes 100% hit rate
  - Suggest: "Multiply by estimated hit probability. Formula: `avgDamage * (1 - missRate)`. With avg AC {partyAC} vs est. enemy attack bonus +{attackBonus}, miss rate ≈ {X}%."
  - Code ref: `../playlist-data-engine/src/core/combat/PartyAnalyzer.ts`, function `estimateCharacterDamage()`, line ~279

  **Party DPR underestimate (>10% low):**
  - Check if the formula only accounts for basic weapon damage (1d8) and misses spell damage, class features, or bonus actions
  - Suggest: "estimateCharacterDamage() uses a flat 1d8 base. Consider checking the character's actual equipment weapons and combat_spells for a more accurate estimate."
  - Code ref: same as above

  **Enemy DPR overestimate (>10% high):**
  - Check if multiattack count is wrong, or if the enemy's actual attack bonus causes more misses than expected
  - Suggest: "Enemy hit rate may be lower than assumed. Consider factoring in hit probability: estDPR × ((enemyAttackBonus + 10.5) / (targetAC + 0.5))."
  - Code ref: `../playlist-data-engine/src/utils/estimateEnemyDPR.ts` (our new utility)

  **Enemy DPR underestimate (>10% low):**
  - Check if legendary action damage, spell damage, or AoE multi-target damage isn't being counted
  - Suggest: "Enemy has legendary actions with damage ({legendaryActionCount} actions). These are not included in the DPR estimate. Add legendary action damage to the estimate."
  - Or: "Enemy has combat spells dealing ~{spellDPR} estimated damage. If spells are used frequently, add this to the DPR estimate."
  - Code ref: same as above

  **Difficulty tier off by ≥1:**
  - If predicted easier than actual: "XP budget underestimates encounter difficulty. The ENEMY_COUNT_MULTIPLIER or XP_BUDGET_PER_LEVEL values may need adjustment for this archetype."
  - If predicted harder than actual: "XP budget overestimates encounter difficulty. The party composition (e.g., high spellcaster count) may make this encounter easier than XP alone suggests."
  - Code ref: `../playlist-data-engine/src/constants/EncounterBalance.ts`

- [ ] **3.2 Create `EstimateValidationPanel` component** in `src/components/balance/EstimateValidationPanel.tsx` + `.css`

  Collapsible section rendered in the Balance Lab results area (below `BalanceDashboard`).

  Props: `validation: EstimateValidation | null`

  Layout:
  ```
  ┌─ Estimate Validation ─────────────────────────────────── [▼] ─┐
  │                                                                 │
  │  Metric          Est.    Actual    Delta        Status         │
  │  ─────────────────────────────────────────────────────────     │
  │  Party DPR       14.2    11.8      −2.4 (−17%)   ⚠ Over       │
  │  Enemy DPR       18.0    22.4      +4.4 (+24%)   ⚠ Under      │
  │  Difficulty      Medium  Hard      +1 tier       ⚠ Over       │
  │  Win Rate        75%     48%       −27pp         ⚠ Over       │
  │                                                                 │
  │  ── Suggestions ────────────────────────────────────────       │
  │                                                                 │
  │  ⚠ PartyAnalyzer.estimateCharacterDamage() overestimates by 17% │
  │    File: playlist-data-engine/src/core/combat/PartyAnalyzer.ts │
  │    Function: estimateCharacterDamage() (line 279)              │
  │    Fix: Formula assumes every attack hits (no miss chance).    │
  │         With avg AC 16 vs avg enemy +5 attack bonus:           │
  │         miss rate ≈ 40%. Consider: result *= (1 - missRate)    │
  │                                                                 │
  │  ⚠ Enemy DPR underestimated by 24%                            │
  │    File: src/utils/estimateEnemyDPR.ts                        │
  │    Fix: Enemy template "brute" likely has multiattack (2-3     │
  │         attacks/round). Current estimate only counts best      │
  │         weapon. Multiply by attack count from character data.  │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
  ```

  - Only renders when `validation` is non-null (simulation completed + estimate snapshot exists)
  - Delta cells color-coded: green if <5%, yellow if 5-15%, red if >15%
  - Suggestions only shown for significant discrepancies (|deltaPercent| > 10% or tierDelta ≥ 1)
  - Code references are plain text (not clickable links) — this is a developer tool
  - Collapsible to avoid cluttering the results view

- [ ] **3.3 Wire validation into `BalanceLabTab`**

  In `src/components/Tabs/BalanceLabTab.tsx`:

  1. After results come in, compute validation: `const validation = useEstimateValidation(estimateSnapshotRef.current, results)`
  2. Render `EstimateValidationPanel` below `BalanceDashboard` when results are available
  3. The validation panel sits inside the results panel, after the existing dashboard

  Note: since `estimateSnapshotRef` is a ref, we need to trigger validation computation when results change. Options:
  - Store the snapshot in state instead of a ref (set it when simulation starts, clear on reset)
  - Or pass it as a prop from a stateful wrapper

  Recommended: add `estimateSnapshot` to `BalanceLabTab` state, set it in `handleRunSimulation`, clear it in `handleReset`.

---

## Phase 4: Polish & Edge Cases

- [ ] **4.1 Handle edge cases in estimate display**
  - No party selected → don't render estimate cards
  - Enemy generation fails → show "Unable to preview enemy" in EnemyEstimateCard
  - No simulation run yet → don't render validation panel
  - Simulation loaded from history (no estimate snapshot) → show validation panel with "No pre-simulation estimate available for comparison" message
  - Party/encounter changes while simulation is running → estimates still update (they're live), but the snapshot used for validation is the one from when Run was clicked

- [ ] **4.2 Enemy preview regeneration strategy**

  The enemy preview should regenerate whenever `encounterConfig` changes (CR, count, archetype, rarity, category, difficultyMultiplier, statLevels). Use `useMemo` with all config fields as dependencies. The preview seed should be stable (derived from config, not random) so it doesn't flicker on unrelated re-renders. Use `preview-${encounterConfig.cr}-${encounterConfig.archetype}-${encounterConfig.rarity}-${encounterConfig.category}` as the seed.

- [ ] **4.3 Estimate snapshot persistence (optional)**

  Store `estimateSnapshot` in `SavedSimulation` (simulationStore) so that:
  - Loading a saved simulation from history can still show validation
  - The snapshot survives page refresh

  Add `estimateSnapshot?: SimulationEstimateSnapshot` to `SavedSimulation` interface in `src/store/simulationStore.ts`. Serialize it when saving, deserialize when loading.

---

## Dependencies

- All engine functions needed (`PartyAnalyzer`, `calculateAdjustedXP`, `getXPForCR`, `getEncounterMultiplier`, `CombatAI`, `EXPECTED_WIN_RATES`) are already exported from `playlist-data-engine`
- `useEnemyGenerator` hook already exists and works
- `usePartyAnalysis` hook exists but has a loading delay UX — prefer direct `PartyAnalyzer.analyzeParty()` call for instant estimates
- `SimulationConfigPanel` already has `selectedParty` and `encounterConfig` state — perfect hook points
- `BalanceLabTab` already has the results panel structure — validation panel slots in naturally

## File Summary

### New files
| File | Purpose |
|------|---------|
| `src/types/simulation.ts` (modify) | Add `SimulationEstimateSnapshot` and `EstimateValidation` types |
| `src/hooks/useEstimateSnapshot.ts` | Computes pre-simulation estimates from party + encounter config |
| `src/hooks/useEstimateValidation.ts` | Compares estimates vs actual results, generates suggestions |
| `src/utils/estimateEnemyDPR.ts` | Pure function to estimate enemy DPR from CharacterSheet |
| `src/components/balance/PartyEstimateCard.tsx` + `.css` | Party stats + XP budget display |
| `src/components/balance/EnemyEstimateCard.tsx` + `.css` | Enemy preview stats + adjusted XP display |
| `src/components/balance/PredictedDifficultyBar.tsx` + `.css` | Visual difficulty prediction bar |
| `src/components/balance/EstimateValidationPanel.tsx` + `.css` | Post-simulation comparison + code suggestions |

### Modified files
| File | Change |
|------|--------|
| `src/components/balance/SimulationConfigPanel.tsx` | Import estimate hook, render estimate cards, snapshot on Run |
| `src/components/Tabs/BalanceLabTab.tsx` | Store estimate snapshot in state, render validation panel |
| `src/store/simulationStore.ts` (optional, Phase 4) | Add `estimateSnapshot` to `SavedSimulation` |

## Questions / Unknowns

1. Should the estimate cards be visible while a simulation is running, or hidden to reduce clutter? (Leaning: keep visible — they're useful context while waiting)
2. Should the validation panel be collapsed by default or expanded? (Leaning: expanded on first appearance, then remember user's collapse preference)
3. For the enemy preview, should we generate one enemy and multiply, or generate all N enemies and average? (Leaning: generate one, multiply by count — faster and enemies from same seed are identical)
