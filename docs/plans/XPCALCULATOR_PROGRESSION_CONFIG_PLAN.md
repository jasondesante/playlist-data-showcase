# XP Calculator Progression Configuration Enhancement Plan

## Overview

Add a **Progression Configuration Panel** to the XPCalculatorTab that showcases the engine's `mergeProgressionConfig()` capability. This allows users to customize the default XP multiplier values used in all calculations.

---

## Goals

1. Demonstrate the engine's `mergeProgressionConfig()` and `DEFAULT_PROGRESSION_CONFIG` exports
2. Allow users to customize default XP multiplier values
3. Persist configuration to LocalStorage
4. Provide a clean UI with a new "Config" tab in the XPCalculatorTab

---

## Key Differences from Manual Mode

| Feature | Manual Mode | Progression Config |
|---------|-------------|-------------------|
| Scope | Single calculation | All calculations |
| What it does | Override final values | Change default rules |
| Affects | One result | Every result |
| Engine API | None (UI-only) | `mergeProgressionConfig()` |

---

## Configuration Options to Expose

### Base Settings
- `xp_per_second` - Base XP rate (default: 1.0) — **Migrated from appStore**

### Environmental Activity Bonuses
- `running` - Running multiplier (default: 1.5)
- `walking` - Walking multiplier (default: 1.2)
- `altitude` - High altitude bonus at 2000m+ (default: 1.3) — **App-specific, not in engine**

### Time & Weather Bonuses
- `night_time` - Night time bonus (default: 1.25)
- `rain` - Rain bonus (default: 1.2)
- `snow` - Snow bonus (default: 1.3)
- `storm` - Storm bonus (default: 1.4)

### Gaming Bonuses
- `gaming_base` - Base gaming bonus (default: 1.25)
- `rpg_game` - RPG game bonus additive (default: 0.20)
- `action_fps` - Action/FPS game bonus additive (default: 0.15)
- `multiplayer` - Multiplayer bonus additive (default: 0.15)

### Cap
- `max_multiplier` - Maximum total multiplier cap (default: 3.0)

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Altitude bonus | **Add to config** | Allow customization, mark as app-specific |
| baseXpRate location | **Consolidate in new store** | All XP settings in one place |
| Engine API | **Call mergeProgressionConfig()** | Demonstrates real engine API |

---

## Implementation Phases

### Phase 1: Store & Types Setup

Create a new store to manage progression configuration state with LocalStorage persistence. Migrate `baseXpRate` from appStore.

#### Tasks

- [x] **1.1 Create Progression Config Types** ✓ 2026-02-16
  - [x] Define `ProgressionConfigSettings` interface matching engine's `ProgressionConfig.xp.activity_bonuses`
  - [x] Add app-specific `altitude` field (not in engine's config)
  - [x] Include `xp_per_second` (migrated from appStore)
  - [x] Create type for the full config state including metadata (version, last modified)
  - [x] File: Added to `src/types/index.ts`

- [x] **1.2 Create Progression Config Store** ✓ 2026-02-16
  - [x] Create `src/store/progressionConfigStore.ts`
  - [x] Define default values (import from engine or define constants)
  - [x] Include `altitude: 1.3` as app-specific extension
  - [x] Implement `updateProgressionConfig()` action
  - [x] Implement `resetProgressionConfig()` action
  - [x] Add Zustand persist middleware for LocalStorage
  - [x] Add versioning for future migrations

- [x] **1.3 Migrate baseXpRate from appStore** ✓ 2026-02-16
  - [x] Add `xp_per_second` to new progressionConfigStore (replaces `baseXpRate`)
  - [x] Update `appStore.ts` to remove `baseXpRate` field
  - [x] Update `SettingsTab.tsx` to remove XP Settings section (now in Config tab)
  - [x] Update any other files that reference `settings.baseXpRate`

- [x] **1.4 Test Store Integration** ✓ 2026-02-16
  - [x] Verify persistence works across page reloads
  - [x] Test reset functionality
  - [x] Ensure TypeScript types are correct
  - [x] Verify appStore no longer has baseXpRate

---

### Phase 2: Hook Integration

Update the `useXPCalculator` hook to use progression config values instead of hardcoded values. Integrate with engine's `mergeProgressionConfig()` API.

#### Tasks

- [x] **2.1 Add Engine Integration** ✓ 2026-02-16
  - [x] Import `mergeProgressionConfig` and `type ProgressionConfig` from engine
  - [x] Create a `useEffect` that calls `mergeProgressionConfig()` when config changes
  - [x] Map our config structure to engine's expected format:
    - [x] Map `xp_per_second` to `xp.xp_per_second`
    - [x] Map `running`, `walking`, `night_time` to `xp.activity_bonuses.*`
    - [x] Map `rain`, `snow`, `storm` to `xp.activity_bonuses.extreme_weather` (uses max of three)
    - [x] Map `altitude` to `xp.activity_bonuses.high_altitude` (engine has this field)
    - [x] ~~Map gaming fields to `xp.activity_bonuses.*`~~ **N/A** - Gaming fields NOT in engine's ProgressionConfig
  - [x] Log when engine config is updated (for debugging)
  - **Note:** Gaming bonuses (`gaming_base`, `rpg_game`, `action_fps`, `multiplayer`, `max_multiplier`) are NOT in the engine's `ProgressionConfig`. They are in `SensorConfig.xpModifier` instead. For now, these remain app-only. Future task could add `mergeConfig()` for sensor config integration.

- [x] **2.2 Refactor useXPCalculator Hook** ✓ 2026-02-16
  - [x] Import progression config store (already imported in Task 2.1)
  - [x] Replace `settings.baseXpRate` with `config.xp_per_second` (already done in Task 2.1)
  - [x] Replace hardcoded multiplier values with config values:
    - [x] Replace `1.5` running multiplier with `config.activity_bonuses.running`
    - [x] Replace `1.2` walking multiplier with `config.activity_bonuses.walking`
    - [x] Replace `1.25` night time multiplier with `config.activity_bonuses.night_time`
    - [x] Replace `1.4` weather multiplier with `config.activity_bonuses.storm`
    - [x] Replace `1.3` altitude multiplier with `config.activity_bonuses.altitude`
    - [x] Replace gaming base `1.25` with `config.activity_bonuses.gaming_base`
    - [x] Replace RPG `0.20` with `config.activity_bonuses.rpg_game`
    - [x] Replace Action/FPS `0.15` with `config.activity_bonuses.action_fps`
    - [x] Replace multiplayer `0.15` with `config.activity_bonuses.multiplayer`
    - [x] Replace max multiplier `3.0` with `config.activity_bonuses.max_multiplier`
  - [x] Ensure hook re-renders when config changes (updated useCallback dependency to full config)

- [ ] **2.3 Update Hook Dependencies**
  - [ ] Add progression config to useMemo/useCallback dependencies
  - [ ] Remove `settings.baseXpRate` dependency (now using progressionConfigStore)
  - [ ] Test that estimated XP updates when config changes

---

### Phase 3: UI Components

Create the Config tab UI with all the configuration controls.

#### Tasks

- [ ] **3.1 Add Config Tab to XPCalculatorTab**
  - [ ] Update `XPCalculatorTab` type to include `'config'`
  - [ ] Add third tab button "Config" after "Results"
  - [ ] Add tab indicator styling

- [ ] **3.2 Create Config Tab Content Structure**
  - [ ] Create main container with proper layout
  - [ ] Add sections for each config category:
    - [ ] Base Settings section
    - [ ] Environmental Activity section
    - [ ] Time & Weather section
    - [ ] Gaming Bonuses section
    - [ ] Global Cap section

- [ ] **3.3 Create Slider Components**
  - [ ] Create reusable config slider component or use inline sliders
  - [ ] Slider features:
    - [ ] Min/max bounds for each value
    - [ ] Step size (0.05 or 0.1 depending on value)
    - [ ] Display current value
    - [ ] Show default value indicator
  - [ ] Consider component: `ConfigSlider` in `src/components/ui/` or inline

- [ ] **3.4 Create Config Card Components**
  - [ ] Card for Base XP Rate (range: 0.1 - 5.0)
  - [ ] Card for Running multiplier (range: 1.0 - 3.0)
  - [ ] Card for Walking multiplier (range: 1.0 - 2.0)
  - [ ] Card for Altitude bonus (range: 1.0 - 2.0) — **Mark as app-specific**
  - [ ] Card for Night Time bonus (range: 1.0 - 2.0)
  - [ ] Card for Rain bonus (range: 1.0 - 2.0)
  - [ ] Card for Snow bonus (range: 1.0 - 2.0)
  - [ ] Card for Storm bonus (range: 1.0 - 2.0)
  - [ ] Card for Gaming Base (range: 1.0 - 2.0)
  - [ ] Card for RPG Bonus (range: 0.0 - 0.5)
  - [ ] Card for Action/FPS Bonus (range: 0.0 - 0.5)
  - [ ] Card for Multiplayer Bonus (range: 0.0 - 0.5)
  - [ ] Card for Max Multiplier Cap (range: 1.5 - 5.0)

- [ ] **3.5 Add Reset Button**
  - [ ] Add "Reset to Defaults" button at bottom of config
  - [ ] Show confirmation or immediate reset (no confirmation needed - can always reset again)
  - [ ] Use danger/warning styling for visibility

- [ ] **3.6 Add Default Value Indicators**
  - [ ] Show "(default: X.X)" next to each slider
  - [ ] Highlight when value differs from default
  - [ ] Consider visual indicator (e.g., colored dot) when modified

---

### Phase 4: CSS Styling

Add styles for the new Config tab and components.

#### Tasks

- [ ] **4.1 Add Config Tab Styles**
  - [ ] Add to `XPCalculatorTab.css` or create separate file
  - [ ] Style the config container layout
  - [ ] Style section headers and cards

- [ ] **4.2 Style Slider Components**
  - [ ] Custom slider track styling
  - [ ] Slider thumb styling
  - [ ] Value display styling
  - [ ] Default indicator styling
  - [ ] Modified state styling

- [ ] **4.3 Style Config Cards**
  - [ ] Card layout with label, slider, and value
  - [ ] Responsive design for mobile
  - [ ] Consistent with existing XP Calculator styling

- [ ] **4.4 Style Reset Button**
  - [ ] Danger/warning color scheme
  - [ ] Hover and active states
  - [ ] Consistent with app button styles

- [ ] **4.5 Add Visual Feedback**
  - [ ] Animation when config value changes
  - [ ] Toast notification when saved (optional - may auto-save)
  - [ ] Visual indicator that config affects calculations

---

### Phase 5: Integration & Testing

Ensure everything works together correctly.

#### Tasks

- [ ] **5.1 Integration Testing**
  - [ ] Change config value, verify estimated XP updates immediately
  - [ ] Change config, calculate XP, verify results use new values
  - [ ] Reset config, verify all values return to defaults
  - [ ] Refresh page, verify config persists

- [ ] **5.2 Edge Case Testing**
  - [ ] Test min/max bounds are enforced
  - [ ] Test that manual mode still works (takes precedence over config)
  - [ ] Test config doesn't break when sensors are inactive
  - [ ] Test with both environmental and gaming contexts active

- [ ] **5.3 Cross-Browser Testing**
  - [ ] Test in Chrome
  - [ ] Test in Firefox
  - [ ] Test in Safari (if available)

- [ ] **5.4 Accessibility Testing**
  - [ ] Ensure sliders are keyboard accessible
  - [ ] Ensure tab navigation works
  - [ ] Ensure screen reader announces values

---

### Phase 6: Documentation

Document the new feature.

#### Tasks

- [ ] **6.1 Code Documentation**
  - [ ] Add JSDoc comments to store
  - [ ] Add JSDoc comments to hook changes
  - [ ] Add comments explaining difference from Manual Mode

- [ ] **6.2 Update Component Comments**
  - [ ] Update XPCalculatorTab component header comment
  - [ ] Document the Config tab purpose

- [ ] **6.3 User-Facing Hints**
  - [ ] Add helper text explaining each config option
  - [ ] Add note about persistence
  - [ ] Add note about difference from Manual Mode

---

## File Changes Summary

### New Files
- `src/store/progressionConfigStore.ts` - Zustand store for progression config

### Modified Files
- `src/components/Tabs/XPCalculatorTab.tsx` - Add Config tab UI
- `src/components/Tabs/XPCalculatorTab.css` - Add Config tab styles
- `src/hooks/useXPCalculator.ts` - Use config values, call engine API
- `src/store/appStore.ts` - Remove `baseXpRate` field
- `src/components/Tabs/SettingsTab.tsx` - Remove XP Settings section

---

## UI Mockup (Text)

```
┌─ XP Calculator ─────────────────────────────────────┐
│  [Calculator]  [Results]  [Config]                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─ Base Settings ───────────────────────────────┐ │
│  │ Base XP Rate: [=====|===] 1.0 (default: 1.0)  │ │
│  │ XP earned per second of listening             │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ Environmental Activity ──────────────────────┐ │
│  │ Running:    [=====|===] 1.5 (default: 1.5)    │ │
│  │ Walking:    [====|====] 1.2 (default: 1.2)    │ │
│  │ Altitude:   [=====|===] 1.3 (default: 1.3) 🏔️ │ │
│  │             (≥2000m) • App-specific           │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ Time & Weather ──────────────────────────────┐ │
│  │ Night Time: [=====|===] 1.25 (default: 1.25)  │ │
│  │ Rain:       [====|====] 1.2  (default: 1.2)   │ │
│  │ Snow:       [=====|===] 1.3  (default: 1.3)   │ │
│  │ Storm:      [======|==] 1.4  (default: 1.4)   │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ Gaming Bonuses ──────────────────────────────┐ │
│  │ Base Gaming: [=====|===] 1.25 (default: 1.25) │ │
│  │ RPG Bonus:   [===|======] +0.20 (default)     │ │
│  │ Action/FPS:  [==|=======] +0.15 (default)     │ │
│  │ Multiplayer: [==|=======] +0.15 (default)     │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ Global Cap ──────────────────────────────────┐ │
│  │ Max Multiplier: [======|==] 3.0 (default: 3.0)│ │
│  │ Total XP multiplier cannot exceed this value  │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  [ Reset to Defaults ]                              │
│                                                     │
│  💡 Changes are saved automatically and affect all │
│     XP calculations. Config is synced with engine. │
│     Use Manual Mode for one-time overrides.       │
└─────────────────────────────────────────────────────┘
```

---

## Default Values Reference

| Setting | Default | Range | Step | Notes |
|---------|---------|-------|------|-------|
| `xp_per_second` | 1.0 | 0.1 - 5.0 | 0.1 | Migrated from appStore |
| `running` | 1.5 | 1.0 - 3.0 | 0.05 | |
| `walking` | 1.2 | 1.0 - 2.0 | 0.05 | |
| `altitude` | 1.3 | 1.0 - 2.0 | 0.05 | **App-specific** (not in engine) |
| `night_time` | 1.25 | 1.0 - 2.0 | 0.05 | |
| `rain` | 1.2 | 1.0 - 2.0 | 0.05 | |
| `snow` | 1.3 | 1.0 - 2.0 | 0.05 | |
| `storm` | 1.4 | 1.0 - 2.0 | 0.05 | |
| `gaming_base` | 1.25 | 1.0 - 2.0 | 0.05 | |
| `rpg_game` | 0.20 | 0.0 - 0.5 | 0.01 | Additive bonus |
| `action_fps` | 0.15 | 0.0 - 0.5 | 0.01 | Additive bonus |
| `multiplayer` | 0.15 | 0.0 - 0.5 | 0.01 | Additive bonus |
| `max_multiplier` | 3.0 | 1.5 - 5.0 | 0.1 | |

---

## Success Criteria

- [ ] Config tab is accessible from XPCalculatorTab
- [ ] All 13 config options are editable with sliders (including altitude)
- [ ] Changes persist across page reloads
- [ ] Estimated XP updates in real-time when config changes
- [ ] Reset button restores all defaults
- [ ] UI is consistent with existing XP Calculator design
- [ ] Clear visual distinction between default and modified values
- [ ] Works on mobile (responsive design)
- [ ] `mergeProgressionConfig()` is called when config changes (engine integration)
- [ ] Altitude bonus is marked as "app-specific" in UI
- [ ] `baseXpRate` removed from appStore and Settings tab
- [ ] No references to old `settings.baseXpRate` remain

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Store & Types | Small |
| Phase 2: Hook Integration | Small |
| Phase 3: UI Components | Medium |
| Phase 4: CSS Styling | Small |
| Phase 5: Integration & Testing | Small |
| Phase 6: Documentation | Tiny |
| **Total** | **Medium** |

---

## Notes

- **Altitude bonus** is added to the config but marked as "app-specific" since it's NOT part of the engine's `ProgressionConfig`. This value is used locally in the app and NOT passed to `mergeProgressionConfig()`.

- **baseXpRate** is being migrated from `appStore` to `progressionConfigStore` so all XP settings are in one place. The Settings tab will no longer have an XP Settings section.

- **Engine integration**: We call `mergeProgressionConfig()` when config changes to demonstrate the actual engine API. This affects global engine state, which is desirable for a showcase app.

- When mapping to engine config, we exclude `altitude` since it's app-specific. The engine doesn't know about altitude bonuses.

---

*Plan created: 2026-02-13*
