# Bug Smash Cleanup Plan - Round 3

## Status Report

### Previously Fixed in Round 2
- Sessions save XP to character
- End Session button works after tab changes
- Page reload kills zombie sessions
- Real-time XP display animates
- Header stop button works
- Regenerate works without errors
- XP Calculator streamlined

### New Bugs in Round 3

| Bug | Severity | Status |
|-----|----------|--------|
| Mini player disappears when navigating to Session tab | HIGH | Site-breaking |
| Timestamps showing year 58042 | HIGH | Display broken |
| Stat strategy reverts to automatic every time XP is added | CRITICAL | Feature broken |
| Pending stat increases not showing for uncapped+manual | CRITICAL | Feature broken |

---

## Root Causes

**BUG #1: Mini Player Disappears**
File: `src/hooks/useSessionTracker.ts` (lines 141-162)
Race condition with `hasAutoStartedSession` local state causes rapid state cycling, making `activeSession` briefly `null`.

**BUG #2: Timestamps Showing Year 58042**
File: `src/components/Tabs/SessionTrackingTab.tsx` (line 254-256)
`timestamp * 1000` multiplication when already in milliseconds.

**BUG #3 & #4: Stat Strategy Reverts + Pending Stats Not Showing**
Files: `src/hooks/useCharacterUpdater.ts` (lines 61-71), `src/components/Tabs/CharacterLevelingTab.tsx` (lines 84-92)
Strategy not persisted, useEffect overwrites manual selection when XP added.

---

## Implementation Plan

### PHASE 1: Fix Mini Player Bug

- [ ] **Task 1.1:** Remove `hasAutoStartedSession` local state
  - File: `src/hooks/useSessionTracker.ts`
  - Remove line 70: `const [hasAutoStartedSession, setHasAutoStartedSession] = useState(false);`
  - Remove lines 135-137: `startSessionRef`
  - Remove lines 141-162: Entire auto-start effect

- [ ] **Task 1.2:** Add simplified auto-start effect
  - Replace with:
  ```typescript
  useEffect(() => {
      if (playbackState === 'playing' && !activeSession && selectedTrack) {
          logger.info('SessionTracker', 'Auto-starting session', { trackId: selectedTrack.id });
          startSession(selectedTrack.id, selectedTrack);
      }
  }, [playbackState, activeSession, selectedTrack, startSession]);
  ```

- [ ] **Task 1.3:** Test mini player visibility
  - Start audio → navigate to Session tab → verify mini player stays visible
  - Start from Playlist → go to Session → verify visible
  - Start from Session → switch away → return → verify visible

### PHASE 2: Fix Timestamp Bug

- [ ] **Task 2.1:** Remove `* 1000` multiplication
  - File: `src/components/Tabs/SessionTrackingTab.tsx`
  - Line 255: Change `new Date(timestamp * 1000)` to `new Date(timestamp)`

- [ ] **Task 2.2:** Verify timestamp display
  - Start session → end session → verify timestamps show correct date/time

### PHASE 3: Persist Stat Strategy (CRITICAL)

- [ ] **Task 3.1:** Add strategy map to characterStore
  - File: `src/store/characterStore.ts`
  - Add `characterStrategies: Record<string, StatIncreaseStrategyType>` to state
  - Initialize: `characterStrategies: {}`

- [ ] **Task 3.2:** Add helper functions
  - File: `src/store/characterStore.ts`
  - Add `setCharacterStrategy(seed: string, strategy: StatIncreaseStrategyType)`
  - Add `getCharacterStrategy(seed: string): StatIncreaseStrategyType | undefined`

- [ ] **Task 3.3:** Update `getInitialStrategy()` in useCharacterUpdater
  - File: `src/hooks/useCharacterUpdater.ts`
  - Import `getCharacterStrategy` from characterStore
  - Read from map first, fallback to gameMode logic

- [ ] **Task 3.4:** Persist strategy on selection
  - File: `src/components/Tabs/CharacterLevelingTab.tsx`
  - Import `setCharacterStrategy`
  - In `handleStrategyChange()`, call `setCharacterStrategy(activeChar.seed, strategy)`

- [ ] **Task 3.5:** Remove auto-sync useEffect
  - File: `src/components/Tabs/CharacterLevelingTab.tsx` (lines 84-92)
  - Remove existing useEffect that syncs on every character change
  - Replace with mount-only initialization:
  ```typescript
  useEffect(() => {
      if (activeChar && !statStrategy) {
          const initialStrategy = getCharacterStrategy(activeChar.seed) ||
              (activeChar.gameMode === 'standard' ? 'dnD5e' : 'dnD5e_smart');
          setStatStrategy(initialStrategy);
          updateStatStrategy(initialStrategy);
      }
  }, []);
  ```

- [ ] **Task 3.6:** Test manual strategy persistence
  - Create uncapped character → change to manual → add XP → verify stays manual
  - Level up → verify pending stats show → apply stats
  - Refresh page → verify strategy persists

### PHASE 4: Final Testing

- [ ] **Task 4.1:** Mini player test
  - Play audio → switch tabs → verify mini player always shows

- [ ] **Task 4.2:** Timestamp test
  - Start session → end session → verify timestamps correct

- [ ] **Task 4.3:** Stat strategy test
  - Create standard → verify default is manual
  - Create uncapped → verify default is auto
  - Change uncapped to manual → add XP → verify stays manual
  - Level up uncapped+manual → verify pending stats show

- [ ] **Task 4.4:** Cross-feature test
  - Start session → level up → apply stats → verify everything works
  - Switch characters → verify each keeps their own strategy

---

## Critical Files

| File | Tasks |
|------|-------|
| `src/hooks/useSessionTracker.ts` | 1.1, 1.2 |
| `src/components/Tabs/SessionTrackingTab.tsx` | 2.1 |
| `src/store/characterStore.ts` | 3.1, 3.2 |
| `src/hooks/useCharacterUpdater.ts` | 3.3 |
| `src/components/Tabs/CharacterLevelingTab.tsx` | 3.4, 3.5 |

---

## Success Criteria

- Mini player persists when navigating to Session tab
- Timestamps show real dates (not year 58042)
- Manual strategy persists when XP is added
- Pending stats show for all manual characters (standard AND uncapped)
- Strategy persists across page refreshes
- Each character has independent strategy

---

## Implementation Order

1. Phase 1 (Fix Mini Player)
2. Phase 2 (Fix Timestamps)
3. Phase 3 (Persist Strategy) - tasks 3.1-3.5 must be done in order
4. Phase 4 (Final Testing)

---

*Round 3 - 2026-01-26*
*Status: Ready for implementation*
