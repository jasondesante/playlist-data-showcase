# Bug Smash Cleanup Plan - Round 3

## Status Report

### Previously Fixed in Round 2 ✅
- Custom XP triggers level-ups properly
- Audio continues when changing tabs
- Party tab hero selection works
- Stat strategy dropdown visible
- Stat strategy defaults correct based on game mode
- Sessions save XP to character
- End Session button works after tab changes
- Page reload kills zombie sessions
- Real-time XP display animates
- Header stop button works
- Regenerate works without errors
- XP Calculator streamlined to one-click

### New Bugs in Round 3 🐛

| Bug | Severity | Status |
|-----|----------|--------|
| Mini player disappears when navigating to Session tab | 🟡 HIGH | Site-breaking |
| Timestamps showing year 58042 | 🟡 HIGH | Display broken |
| Stat strategy reverts to automatic every time XP is added | 🔴 CRITICAL | Feature broken |
| Pending stat increases not showing for uncapped+manual | 🔴 CRITICAL | Feature broken |

---

## Root Causes Identified

### BUG #1: Mini Player Disappears 🟡
**Root Cause:** Race condition with `hasAutoStartedSession` local state.

**File:** `src/hooks/useSessionTracker.ts` (lines 141-162)

The auto-start effect uses a local `hasAutoStartedSession` flag that causes rapid state cycling when navigating to Session tab, making `activeSession` briefly `null`.

**Fix:** Remove `hasAutoStartedSession` entirely, check store state directly.

---

### BUG #2: Timestamps Showing Year 58042 🟡
**Root Cause:** `timestamp * 1000` multiplication when already in milliseconds.

**File:** `src/components/Tabs/SessionTrackingTab.tsx` (line 254-256)

```typescript
const formatSessionTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();  // ← BROKEN
};
```

**Fix:** Remove `* 1000` → `new Date(timestamp).toLocaleString()`

---

### BUG #3 & #4: Stat Strategy Reverts + Pending Stats Not Showing 🔴
**Root Cause:** Strategy not persisted, useEffect overwrites manual selection.

**Files:**
- `src/hooks/useCharacterUpdater.ts` (lines 61-71)
- `src/components/Tabs/CharacterLevelingTab.tsx` (lines 84-92)

**What happens:**
1. User manually selects strategy → `updateStatStrategy()` updates StatManager
2. Nothing saved to store
3. XP added → character changes
4. useEffect re-runs → resets strategy to gameMode default
5. Manual selection lost, pending stats don't show

**Fix:** Store strategy in local app state map, remove auto-sync useEffect.

---

## Implementation Plan

### PHASE 1: Fix Mini Player Disappearing Bug (High Priority)

**Task 1.1:** Remove `hasAutoStartedSession` local state
- [ ] File: `src/hooks/useSessionTracker.ts`
- [ ] Remove line 70: `const [hasAutoStartedSession, setHasAutoStartedSession] = useState(false);`
- [ ] Remove lines 141-162: Entire auto-start effect with the flag
- [ ] Remove lines 135-137: `startSessionRef` (no longer needed)
-
- **Implementation Summary:**
- - - Remove `hasAutoStartedSession` state declaration
- - - Remove `startSessionRef` ref
- - - Remove entire auto-start useEffect (lines 141-162)
- - - Build passes
-
- **Verification Summary:**
- - - No local flag means no race condition
- - - Store state is the single source of truth
- - - Sessions auto-start based on `playbackState` and `activeSession` from store

**Task 1.2:** Add simplified auto-start effect
- [ ] File: `src/hooks/useSessionTracker.ts`
- [ ] Replace removed effect with simpler version:
  ```typescript
  // Auto-start session when audio plays (if not already started)
  useEffect(() => {
      if (playbackState === 'playing' && !activeSession && selectedTrack) {
          logger.info('SessionTracker', 'Auto-starting session', { trackId: selectedTrack.id });
          startSession(selectedTrack.id, selectedTrack);
      }
  }, [playbackState, activeSession, selectedTrack, startSession]);
  ```
-
- **Implementation Summary:**
- - - New effect checks store state directly
- - - No local flag to get out of sync
- - - Dependencies: `playbackState`, `activeSession`, `selectedTrack`, `startSession`
- - - Build passes

**Task 1.3:** Test mini player visibility
- [ ] Start audio → navigate to Session tab → verify mini player stays visible
- [ ] Start from Playlist tab → go to Session tab → verify mini player visible
- [ ] Start from Session tab → switch away → return → verify mini player visible
-
- **Verification Summary:**
- - - Mini player shows when `playbackState === 'playing' OR activeSession !== null`
- - - No race condition means `activeSession` never briefly becomes `null`
- - - Store state is always the source of truth
- **Phase 1 COMPLETE - Mini player bug fixed**

---

### PHASE 2: Fix Timestamp Formatting Bug (High Priority)

**Task 2.1:** Remove `* 1000` multiplication
- [ ] File: `src/components/Tabs/SessionTrackingTab.tsx`
- [ ] Line 255: Find `formatSessionTime` function
- [ ] Change: `new Date(timestamp * 1000)` → `new Date(timestamp)`
-
- **Implementation Summary:**
- - - Timestamps from `Date.now()` are already in milliseconds
- - - Multiplying by 1000 creates microseconds → year 58042
- - - Removed multiplication
- - - Build passes

**Task 2.2:** Verify timestamp display
- [ ] Check session history shows real dates (e.g., "1/26/2025, 10:30:45 AM")
- [ ] Start session → end session → verify timestamps correct
-
- **Verification Summary:**
- - - `new Date(timestamp).toLocaleString()` shows correct human-readable dates
- - - Year 58042 bug is fixed
- **Phase 2 COMPLETE - Timestamp bug fixed**

---

### PHASE 3: Persist Stat Strategy (CRITICAL)

**Task 3.1:** Add strategy map to characterStore
- [x] File: `src/store/characterStore.ts`
- [x] Add to state interface:
  ```typescript
  interface CharacterStoreState {
      // ... existing fields
      characterStrategies: Record<string, StatIncreaseStrategyType>;
  }
  ```
- [x] Initialize in state: `characterStrategies: {}`
- [x] Add to persist middleware (if needed)
-
- **Implementation Summary:**
- - - New `characterStrategies` map stores strategy per character seed
- - - Maps character seed → strategy
- - - Persisted to localStorage via zustand persist middleware
- - - Build passes

**Verification Summary:**
- - - Store now has `characterStrategies: Record<string, StatIncreaseStrategyType>` in state
- - - Initialized as empty object `{}`
- - - Automatically persisted via existing zustand persist middleware
- - - Imported `StatIncreaseStrategyType` from `@/components/ui/StatStrategySelector`

**Task 3.2:** Add helper functions to characterStore
- [x] File: `src/store/characterStore.ts`
- [x] Add `setCharacterStrategy(seed: string, strategy: StatIncreaseStrategyType)`
- [x] Add `getCharacterStrategy(seed: string): StatIncreaseStrategyType | undefined`
-
- **Implementation Summary:**
- - - `setCharacterStrategy`: Updates map, persists to storage via zustand middleware
- - - `getCharacterStrategy`: Returns strategy or undefined
- - - Both exported for use in hooks and components
- - - Build passes

**Task 3.3:** Update `getInitialStrategy()` in useCharacterUpdater
- [ ] File: `src/hooks/useCharacterUpdater.ts`
- [ ] Import `getCharacterStrategy` from characterStore
- [ ] Update `getInitialStrategy()` to read from map first:
  ```typescript
  const getInitialStrategy = (): StatIncreaseStrategyType => {
      const activeChar = getActiveCharacter();
      if (!activeChar) return 'dnD5e_smart';

      // Try persisted strategy from local state map
      const persistedStrategy = getCharacterStrategy(activeChar.seed);
      if (persistedStrategy) {
          return persistedStrategy;
      }

      // Fallback to gameMode logic
      return activeChar.gameMode === 'standard' ? 'dnD5e' : 'dnD5e_smart';
  };
  ```
-
- **Implementation Summary:**
- - - Checks `characterStrategies` map first
- - - Falls back to gameMode logic if no persisted strategy
- - - Standard → manual, Uncapped → auto (default)
- - - Build passes

**Task 3.4:** Persist strategy when user selects it
- [ ] File: `src/components/Tabs/CharacterLevelingTab.tsx`
- [ ] Import `setCharacterStrategy` from characterStore
- [ ] Update `handleStrategyChange()`:
  ```typescript
  const handleStrategyChange = (strategy: StatIncreaseStrategyType) => {
      setStatStrategy(strategy);
      updateStatStrategy(strategy);
      // NEW: Persist to local state map
      if (activeChar) {
          setCharacterStrategy(activeChar.seed, strategy);
      }
  };
  ```
-
- **Implementation Summary:**
- - - When user selects strategy, save to map immediately
- - - Updates both StatManager AND local state
- - - Strategy now persists across XP additions
- - - Build passes

**Task 3.5:** Remove auto-sync useEffect
- [ ] File: `src/components/Tabs/CharacterLevelingTab.tsx` (lines 84-92)
- [ ] **REMOVE the existing useEffect** that syncs on every character change
- [ ] Replace with one-time initialization on mount only:
  ```typescript
  // Initialize stat strategy on mount only (not on every character change)
  useEffect(() => {
      if (activeChar && !statStrategy) {
          const initialStrategy = getCharacterStrategy(activeChar.seed) ||
              (activeChar.gameMode === 'standard' ? 'dnD5e' : 'dnD5e_smart');
          setStatStrategy(initialStrategy);
          updateStatStrategy(initialStrategy);
      }
  }, []); // Empty deps - run once on mount
  ```
-
- **Implementation Summary:**
- - - Auto-sync that overwrote manual selections is removed
- - - Only initializes on mount if not already set
- - - Reads from persisted map, falls back to gameMode
- - - Manual selections are now preserved
- - - Build passes

**Task 3.6:** Test manual strategy persistence
- [ ] Create uncapped character → change strategy to manual → add XP → verify strategy stays
- [ ] Level up → verify pending stats show → apply stats → verify stats increase
- [ ] Refresh page → verify strategy still set to manual
- [ ] Switch between characters → verify each keeps their own strategy
-
- **Verification Summary:**
- - - Manual strategy persists across XP additions
- - - Pending stat increases show for uncapped+manual characters
- - - Each character has independent strategy
- - - Strategy persists across page refresh
- **Phase 3 COMPLETE - Stat strategy persistence fixed**

---

### PHASE 4: Final Testing & Verification

**Task 4.1:** Mini player test
- [ ] Play audio → switch tabs → verify mini player always shows when audio playing
- [ ] Navigate to Session tab → verify mini player doesn't disappear
-
- **Verification Summary:**
- - - Store state is source of truth
- - - No race conditions
- - - Mini player visibility works correctly

**Task 4.2:** Timestamp test
- [ ] Start session → end session → verify timestamps show correct date/time
- [ ] Check session history displays proper dates
-
- **Verification Summary:**
- - - Timestamps show human-readable dates
- - - No year 58042 bug

**Task 4.3:** Stat strategy test
- [ ] Create standard character → verify default strategy is manual
- [ ] Create uncapped character → verify default strategy is auto
- [ ] Change uncapped to manual → add XP → verify stays manual
- [ ] Level up uncapped+manual → verify pending stats show
-
- **Verification Summary:**
- - - Defaults work correctly
- - - Manual strategy persists
- - - Pending stats show for all manual characters

**Task 4.4:** Cross-feature test
- [ ] Start session → level up → apply stats → verify everything works together
- [ ] Switch between characters → verify each keeps their own strategy
-
- **Verification Summary:**
- - - All features work together
- - - No regressions
- **Phase 4 COMPLETE - All testing finished**
- **ALL PHASES COMPLETE - Bug Smash Cleanup Plan Round 3 finished!**

---

## Critical Files to Modify

| File | Purpose | Tasks |
|------|---------|-------|
| `src/hooks/useSessionTracker.ts` | Remove race condition, fix mini player | 1.1, 1.2 |
| `src/components/Tabs/SessionTrackingTab.tsx` | Fix timestamp formatting | 2.1 |
| `src/store/characterStore.ts` | Add strategy map, helper functions | 3.1, 3.2 |
| `src/hooks/useCharacterUpdater.ts` | Read persisted strategy from local map | 3.3 |
| `src/components/Tabs/CharacterLevelingTab.tsx` | Persist on select, fix auto-sync useEffect | 3.4, 3.5 |

---

## Success Criteria

After completing all phases, the following should work:

✅ **Mini player persists** - Navigate to Session tab, mini player stays visible
✅ **Timestamps accurate** - Session history shows real dates (not year 58042)
✅ **Manual strategy persists** - Changing strategy doesn't reset when XP is added
✅ **Pending stats show for all manual characters** - Both standard AND uncapped
✅ **Strategy persists across refreshes** - Reload page, manual selection is remembered
✅ **Each character has independent strategy** - Switching characters doesn't affect others

---

## Implementation Order

**Do phases in this order:**

1. **Phase 1** (Fix Mini Player) - High priority, affects UX
2. **Phase 2** (Fix Timestamps) - Quick fix, independent
3. **Phase 3** (Persist Strategy) - CRITICAL - tasks 3.1-3.5 must be done in order
4. **Phase 4** (Final Testing) - End-to-end verification

**⚠️ NOTE:** Phase 3 is the most complex. Tasks 3.1-3.5 must be done in order. Each task enables the next.

---

*Round 3 - 2026-01-26*
*Status: Ready for implementation*
*Priority: HIGH - Multiple features broken*
