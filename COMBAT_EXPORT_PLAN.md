# Combat Data Export System Implementation Plan

## Overview
Add quick-export functionality to the CombatSimulatorTab to save combat data at different stages (pre-combat, during combat, post-combat) as JSON for balance analysis with AI agents. This enables rapid iteration on enemy generation and combat balance by providing structured data exports that can be fed into AI assistants for analysis.

## Phase 1: Core Export Infrastructure ✅
- [x] Create `CombatDataExporter` utility module
  - [x] Define TypeScript interfaces for all export data types
  - [x] Create `exportToJson()` function with pretty-print formatting
  - [x] Create `copyToClipboard()` function with success/failure feedback
  - [x] Create `downloadAsFile()` function with timestamped filenames
  - [x] Add type guards for validating export data structure

- [x] Create `CombatExportButton` UI component
  - [x] Design reusable button with Copy/Download toggle
  - [x] Add visual feedback (success toast, error state)
  - [x] Support different button sizes/variants (icon-only, compact, full)
  - [x] Include loading state for async operations

## Phase 2: Pre-Combat Export (Party & Enemy Generation) ✅
- [x] Define PreCombatExportData interface
  ```typescript
  interface PreCombatExportData {
    timestamp: string;
    exportType: 'pre-combat';
    engineVersion: string; // playlist-data-engine version

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
    generationConfig: EnemyGenerationConfig;

    // Generated Enemies
    generatedEnemies: CharacterSheet[];

    // Advanced Settings
    advancedConfig: AdvancedCombatConfig;
    treasureConfig: TreasureGenerationConfig;

    // Metadata
    characterStrategies: Record<string, string>;
    uncappedConfig: Record<string, string>;
  }
  ```

- [x] Add export button to Encounter Summary Panel
  - [x] Place button in EncounterSummaryPanel header
  - [x] Wire up to partyMembers, generatedEnemies, generationConfig state
  - [x] Include party analysis calculation

- [x] Add export button to Party Analyzer Card
  - [x] Add small export icon button in card header
  - [x] Export party data with thresholds

## Phase 3: Combat Log Export (During/After Combat) ✅
- [x] Define CombatLogExportData interface
  ```typescript
  interface CombatLogExportData {
    timestamp: string;
    exportType: 'combat-log';
    engineVersion: string;

    // Full Combat Instance
    combatInstance: {
      id: string;
      combatants: Combatant[];
      currentTurnIndex: number;
      roundNumber: number;
      history: CombatAction[];
      isActive: boolean;
      winner?: Combatant;
      startTime: number;
      lastUpdated: number;
    };

    // Derived Stats
    combatStats: {
      totalRounds: number;
      totalTurns: number;
      partyHP: { name: string; current: number; max: number }[];
      enemyHP: { name: string; current: number; max: number }[];
      statusEffects: { combatant: string; effects: string[] }[];
    };

    // Configuration used
    generationConfig: EnemyGenerationConfig;
    advancedConfig: AdvancedCombatConfig;
  }
  ```

- [x] Add export button to Combat Log section
  - [x] Place in combat log panel header
  - [x] Export current combat state
  - [x] Include derived statistics

- [ ] Add "Export Turn" button for single turn export *(optional enhancement)*
  - [ ] Add to turn controls area
  - [ ] Export just the current turn's action

## Phase 4: Post-Combat Summary Export ✅
- [x] Define PostCombatExportData interface
  ```typescript
  interface PostCombatExportData {
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
  ```

- [x] Add export button to Combat Results panel
  - [x] Place prominently in results section
  - [x] Include full context (settings + combat log)
  - [x] Show export success indicator

## Phase 5: Export All / Quick Export ✅
- [x] Create consolidated "Export for Balancing" function
  - [x] Combine all three export types into single payload
  - [x] Add metadata about engine version, config versions
  - [x] Structure for easy AI consumption

- [x] Add "Export All" button to main toolbar
  - [x] Place in CombatSimulatorTab header area
  - [x] One-click export of complete combat data
  - [x] Include visual indicator of what's included

- [x] Create export history with localForage
  - [x] Install/configure localForage for IndexedDB storage
  - [x] Store last N exports (configurable, default 20)
  - [x] Allow re-downloading previous exports (via API)
  - [ ] Show timestamps and export types in history panel *(optional future enhancement)*
  - [ ] (Future) Add diff comparison between exports

## Phase 6: CSS Styling & UX Polish ✅
- [x] Style export buttons
  - [x] Match existing CombatSimulatorTab design
  - [x] Add hover states and tooltips
  - [x] Responsive sizing for different viewports

- [x] Add export feedback UI
  - [x] Toast notifications for success/failure
  - [x] Loading spinners for async operations
  - [x] Error messages for failed clipboard writes

- [x] Add keyboard shortcuts (optional)
  - [x] Ctrl/Cmd+Shift+E for Export All
  - [x] Ctrl/Cmd+Shift+C for Copy Pre-Combat data

## Dependencies
- All data structures are already JSON-serializable
- `RawJsonDump` component exists as reference pattern
- `navigator.clipboard` API for copy functionality
- `URL.createObjectURL` for download functionality
- `localForage` for export history persistence (IndexedDB)

## Technical Notes

### File Organization
```
src/
├── utils/
│   └── combatDataExporter.ts       # Core export utilities
├── components/
│   ├── ui/
│   │   └── CombatExportButton.tsx  # Reusable export button
│   └── Tabs/
│       └── CombatSimulatorTab.tsx  # Add export buttons here
```

### Export Filenames
- Pre-combat: `combat-pre-{timestamp}.json`
- Combat log: `combat-log-{combatId}-{timestamp}.json`
- Post-combat: `combat-result-{winner}-{timestamp}.json`
- Export all: `combat-full-{timestamp}.json`

## Decisions Made
- **Export History**: Use `localForage` (IndexedDB) to persist export history for comparison
- **Export Filtering**: Not needed - all combat data is game-state, no personal/sensitive info
- **Toast Notifications**: Any lightweight solution, don't overthink it
- **Engine Version**: Include `playlist-data-engine` version in exports for reproducibility
- **Comparison Tools**: Nice-to-have for future - focus on core export first, add diff later if needed
- **Combat Log Optimization**: Use reference-based data structure to avoid redundant character data
  - Characters defined once in `characterRegistry` (lightweight summary)
  - Action log references actors/targets by ID instead of including full objects
  - Combat stats computed from action log (damage totals, critical hits, etc.)
  - This dramatically reduces file size for AI analysis while preserving all essential info

## Success Criteria
1. One-click export of party + enemy + settings before combat
2. One-click export of combat log during/after combat
3. One-click export of complete post-combat summary
4. All exports are valid JSON, properly formatted
5. Copy to clipboard works reliably
6. Download as file works with sensible filenames
7. Export data is comprehensive enough for AI balance analysis
