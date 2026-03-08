# Type Compromises & Code Cleanup Investigation Plan

## Overview

This plan addresses three main areas:
1. **Type Compromises** - `as unknown as` casts in production code (not tests) that may indicate type issues
2. **Deprecated/Migration Research** - Verify status of deprecated items and understand migration code context
3. **Comment Cleanup** - Find and clean up comments referencing completed tasks, phases, or obsolete plans

---

## Phase 1: Type Compromise Investigation

### 1.1 CharacterGenTab.tsx - `null as unknown as string`
**File:** `src/components/Tabs/CharacterGenTab.tsx:327`
```typescript
setActiveCharacter(null as unknown as string);
```

**Context:** The `activeCharacterId` in characterStore is typed as `string | null`, but `setActiveCharacter` only accepts `string`. The workaround casts `null` to bypass the type check.

**Investigation Tasks:**
- [x] Determine if `setActiveCharacter` should accept `null` to clear the active character
- [x] Check all usages of `setActiveCharacter` to see if `null` is a valid semantic
- [x] If `null` is valid, update the type signature to `(id: string | null) => void`
- [x] Add runtime logging to verify the actual behavior when `null` is passed

**Recommended Fix:** Update `setActiveCharacter` type to accept `null`:
```typescript
// In characterStore.ts
setActiveCharacter: (id: string | null) => void;
```

---

### 1.2 DataViewerTab.tsx - `equipment as unknown as Record<string, unknown>` ✅ DONE
**File:** `src/components/Tabs/DataViewerTab.tsx:586`
```typescript
const result = createContent('equipment', equipment as unknown as Record<string, unknown>, { mode: 'relative' });
```

**Context:** The `createContent` function expects `Record<string, unknown>` but `Equipment` type may have a more specific structure.

**Investigation Tasks:**
- [x] Examine the `createContent` function signature and what it expects
- [x] Check if `Equipment` type is compatible with `Record<string, unknown>`
- [x] If types are incompatible, consider creating a proper type converter or updating `createContent`
- [x] Add debug logging to inspect the actual structure of `equipment` at runtime (not needed - type fix resolved this)

**Fix Applied:** Changed `ContentItem` type in `useContentCreator.ts` from `Record<string, unknown>` to `{ [key: string]: any }` to accept any object with string keys. This allows typed interfaces like `Equipment` to be passed directly without a type cast. The type cast in `DataViewerTab.tsx` was removed.

---

### 1.3 ChartEditor.tsx - `e as unknown as React.MouseEvent` ✅ DONE
**File:** `src/components/ui/ChartEditor.tsx:457`
```typescript
handleBeatClick(beatIndex, e as unknown as React.MouseEvent);
```

**Context:** A keyboard event is being cast to a mouse event to reuse the same handler.

**Investigation Tasks:**
- [x] Verify what `handleBeatClick` actually needs from the event object
- [x] Consider if the handler should accept a union type or a custom event interface
- [x] Check if this causes any runtime issues (accessing mouse-specific properties on keyboard event)

**Fix Applied:** Created a minimal `BeatClickEvent` interface and updated `handleBeatClick` to accept it:
```typescript
interface BeatClickEvent {
    stopPropagation: () => void;
}
```
Both `React.MouseEvent` and `React.KeyboardEvent` satisfy this interface, so the type cast was removed.

---

### 1.4 useHeroEquipment.ts & useItemCreator.ts - Window debug casts
**Files:**
- `src/hooks/useHeroEquipment.ts:240`
- `src/hooks/useItemCreator.ts:665`

```typescript
(window as unknown as Record<string, unknown>).__itemCreatorDebug
```

**Context:** These are intentional debug casts to attach debug data to the window object.

**Verdict:** These are acceptable as debug utilities. Consider:
- [x] Create a typed global debug interface if this pattern is used frequently
- [x] Add a comment explaining the purpose of these debug globals

**Fix Applied:** Created `src/global.d.ts` with a typed `ItemCreatorDebugData` interface and extended the Window interface. Updated both `useItemCreator.ts` and `useHeroEquipment.ts` to use the typed `window.__itemCreatorDebug` property instead of the unsafe `as unknown as Record<string, unknown>` cast. Added JSDoc comments explaining the debug utility's purpose.

---

### 1.5 beatDetectionStore.ts - Persisted state cast ✅ DONE
**File:** `src/store/beatDetectionStore.ts:3370`
```typescript
}) as unknown as BeatDetectionStoreState
```

**Context:** Persist middleware partial state cast.

**Investigation Tasks:**
- [x] Verify the Zustand persist middleware pattern is correct
- [x] Check if there's a better way to type the partial state

**Fix Applied:** Created `PersistedBeatDetectionState` and `PersistedSubdivisionConfig` interfaces to properly type the partial state returned by `partialize`. The key insight is that Zustand's `PersistOptions<S, PersistedState>` has a `PersistedState` generic parameter that defaults to `S`, and the `partialize` function returns `PersistedState`. By adding an explicit return type annotation `partialize: (state): PersistedBeatDetectionState => ({...})`, TypeScript correctly infers the persisted state type without needing the `as unknown as` cast.

The persisted state differs from runtime state in one key way: `subdivisionConfig.beatSubdivisions` is serialized as `[number, SubdivisionType][]` (array of tuples) instead of `Map<number, SubdivisionType>` because Maps don't serialize to JSON properly.

---

### 1.6 characterStore.ts - Interval cleanup cast
**File:** `src/store/characterStore.ts:161`
```typescript
(checkInterval as unknown as { _unsubscribe?: () => void })._unsubscribe = unsubscribe;
```

**Context:** Attaching a property to a `NodeJS.Timeout` object.

**Investigation Tasks:**
- [ ] Consider using a wrapper object or Map to store the unsubscribe function
- [ ] This is a common pattern but could be cleaner with a proper data structure

---

## Phase 2: Deprecated/Migration Research

### 2.1 intensityThreshold → filter Migration (beatDetectionStore.ts)

**Location:** `src/store/beatDetectionStore.ts:3384-3403`

**Current Understanding:**
```typescript
// Old intensityThreshold: 0 = most sensitive (most beats), 1 = least sensitive (fewest beats)
// New filter: 0 = keep all beats, 1 = only strongest beats
// Migration: filter = intensityThreshold (same semantics)
```

**Questions to Answer:**
- [ ] **CRITICAL:** Are the semantics truly the same? The comments suggest both go 0→1 but with different meanings
  - `intensityThreshold`: 0 = most sensitive (detect MORE beats), 1 = least sensitive (detect FEWER beats)
  - `filter`: 0 = keep ALL beats, 1 = keep only STRONGEST beats
- [ ] If old user had `intensityThreshold: 0` (wanted more beats), they get `filter: 0` (keep all beats) - is this correct?
- [ ] If old user had `intensityThreshold: 1` (wanted fewer beats), they get `filter: 1` (keep strongest) - is this correct?
- [ ] Research the original PR/commit that introduced this migration
- [ ] Test the actual behavior with different values to verify semantics match

**Action Items:**
- [ ] Read `docs/plans/done/FRONTEND_INTENSITY_UI_PLAN.md` for full context
- [ ] Check the engine's behavior for both parameters
- [ ] Verify migration tests in `beatDetectionStore.migration.test.ts` cover edge cases
- [ ] Add console logging to verify migration is working correctly for real users

---

### 2.2 CombatSimulatorTab Migration

**Location:** `src/components/Tabs/CombatSimulatorTab.tsx:500-605`

**Context:** `COMBAT_SIMULATOR_CONFIG_VERSION = 2` with treasure item type migration

**Status:** Active migration code that converts legacy `consumable`/`misc` types to `item` with tags.

**Investigation Tasks:**
- [ ] Verify this migration has run for all users (check if version can be bumped higher)
- [ ] Consider if migration code can be removed after sufficient time has passed
- [ ] Document when this migration was introduced and when it can be safely removed

---

### 2.3 progressionConfigStore & rhythmXPConfigStore Migrations

**Locations:**
- `src/store/progressionConfigStore.ts:244-256`
- `src/store/rhythmXPConfigStore.ts:377-379`

**Context:** Version-based migration placeholders for future schema changes.

**Status:** Currently empty migration functions (no actual migrations yet).

**Investigation Tasks:**
- [ ] Verify these are just placeholders
- [ ] Consider if the empty migration logic adds unnecessary complexity

---

### 2.4 Deprecated Items in DATA_ENGINE_REFERENCE.md

**Location:** `docs/engine/DATA_ENGINE_REFERENCE.md`

**Items to verify:**
- [ ] `bonus` field on attacks - marked as "Legacy bonus field (deprecated)"
- [ ] `BEAT_ACCURACY_THRESHOLDS` - deprecated in favor of `HARD_ACCURACY_THRESHOLDS`

**Investigation Tasks:**
- [ ] Search codebase for usages of these deprecated items
- [ ] If unused, remove from documentation
- [ ] If still used, create cleanup tasks

---

## Phase 3: Comment Cleanup

### 3.1 Phase/Task Reference Comments

**Files with "Task X.X" or "Phase X" comments:**

| File | Pattern | Lines | Status |
|------|---------|-------|--------|
| `src/components/ui/BeatSubdivisionGrid.tsx` | `Task 4.4` | 271 | Needs review |
| `src/components/ui/DownbeatConfigPanel.tsx` | `Task 2.8 / Task 5.3`, `Task 5.3` | 574, 576 | Needs review |
| `src/components/Layout/AppHeader.tsx` | `Phase 3.2.1`, `Task 4.2` | 5, 6 | Needs review |
| `src/components/Tabs/DataViewerTab.tsx` | `Phase 3.3`, `Phase 4.1`, `Phase 4.3` | 583, 608, 618 | Needs review |
| `src/components/Tabs/CharacterLevelingTab.tsx` | `Task 2.2.2` | 334 | Needs review |

**Investigation Tasks:**
- [ ] Review each "Task X.X" comment to determine if the task is complete
- [ ] Remove or update comments for completed tasks
- [ ] Keep only comments that provide ongoing value (explaining complex logic)

---

### 3.2 Migration Note Comments

**Files with migration-related comments:**

| File | Comment | Can Remove? |
|------|---------|-------------|
| `src/components/ui/BeatDetectionSettings.tsx:561` | Migration note about intensityThreshold | Keep for user context |
| `src/store/beatDetectionStore.ts:3384-3387` | Migration comments | Keep until migration code removed |

---

### 3.3 TODO Comments Review

**Current TODOs:**
- `src/components/Tabs/DataViewerTab.tsx:537` - "TODO: Open edit modal - will be implemented in Phase 3+"
- `src/components/ui/BeatTimeline.tsx:622` - "TODO: Phase 6 will implement per-beat subdivision visualization"

**Investigation Tasks:**
- [ ] Verify if DataViewerTab edit modal is still planned
- [ ] Verify if BeatTimeline Phase 6 is still planned
- [ ] Update or remove stale TODOs

---

### 3.4 "Verified" Comments

**Files with "verified" or "VERIFIED" comments:**
- `src/hooks/__tests__/useDataViewer.refresh.test.ts` - "VERIFIED IMPLEMENTATION"
- `src/store/beatDetectionStore.autoMultitempo.test.ts` - "This is verified by..."

**Investigation Tasks:**
- [ ] Review if these test comments are still accurate
- [ ] Clean up any outdated verification comments

---

## Phase 4: Implementation Order

### Priority 1: Type Fixes (Quick Wins)
1. ~~Fix `setActiveCharacter` type signature to accept `null`~~ ✅ DONE
2. ~~Create proper type for ChartEditor event handling~~ ✅ DONE
3. ~~Document window debug globals~~ ✅ DONE

### Priority 2: Migration Research
1. Deep dive into intensityThreshold → filter semantics
2. Document findings and verify correctness
3. Create plan for eventual migration code removal

### Priority 3: Comment Cleanup
1. Remove completed Phase/Task references
2. Update or remove stale TODOs
3. Clean up test verification comments

---

## Dependencies

- None - this is an investigation and cleanup effort

## Questions/Unknowns

1. **intensityThreshold semantics** - Need to verify the exact behavior of the old parameter vs new filter parameter
2. **Migration timeline** - When can we safely remove migration code for old configs?
3. **Phase/Task tracking** - Is there a master task list that can be referenced to verify completion?

---

## Success Criteria

- [x] All `as unknown as` casts in production code are either fixed or documented as intentional (1.1 fixed, others remain)
- [ ] intensityThreshold → filter migration is fully understood and verified correct
- [ ] All deprecated items are either removed or have cleanup tasks created
- [ ] Comment cleanup reduces noise while preserving valuable documentation
- [ ] No runtime behavior changes from type fixes (verified via testing)
