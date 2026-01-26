# 🎯 Bug Smash Cleanup Plan - Round 2

## 📊 Status Report

### ✅ Previously Fixed
- Custom XP triggers level-ups properly
- Audio continues when changing tabs (mostly)
- Party tab hero selection works
- Stat strategy dropdown visible
- Stat strategy defaults correct based on game mode

### 🐛 Critical Bugs Remaining

| Bug | Severity | Status |
|-----|----------|--------|
| Sessions don't save XP to character | 🔴 CRITICAL | Completely broken |
| End Session button broken (tab change + reload) | 🔴 CRITICAL | Site-breaking |
| Real-time XP display stuck | 🟡 HIGH | Not working |
| Header stop button doesn't end session | 🟡 HIGH | Half-broken |
| Character "Regenerate" always fails | 🟡 MEDIUM | Feature broken |
| XP Calculator UX (extra button) | 🟢 LOW | Improvement |

---

## 🔍 Root Causes Identified

### **BUG #1: Sessions Don't Save XP to Character** 🔴
**Root Cause:** There is **NO connection** between session ending and character XP processing.

- The `processSession()` function exists in `useCharacterUpdater` but is **never called**
- When `endSession()` is called, the session is saved to history but never processed for XP
- Both `SessionTrackingTab.handleEnd()` and `AppHeader.handleStop()` don't call character update logic

**Fix:** After session ends, call `processSession(character, session)` to apply XP.

---

### **BUG #2: End Session Button Broken (Tab Change + Reload)** 🔴
**Root Cause:** State synchronization issue in `useSessionTracker`.

**File:** [`src/hooks/useSessionTracker.ts`](src/hooks/useSessionTracker.ts)

The hook maintains **local state** (`isActive`, `elapsedTime`) that gets out of sync with the session store:

```typescript
// Line 122 - BUG: isActive is local state, not derived from store
const endSession = useCallback((): ListeningSession | null => {
  if (!isActive) return null;  // ← Returns early when switching tabs!
  // ...
}, [tracker, isActive, storeEndSession, activeSession]);
```

**What happens:**
1. Start session in Session tab → `isActive = true` in that hook instance
2. Switch to Party tab → New hook instance created with `isActive = false`
3. Return to Session tab → Still has old `isActive = false`
4. Click End Session → `!isActive` check returns early, nothing happens
5. **Session persists in zustand store** → survives page reload → creates "zombie session"

**Fix:**
- Derive `isActive` and `elapsedTime` directly from the session store
- Kill any active session on page load to prevent zombies

---

### **BUG #3: Real-time XP Display Stuck** 🟡
**Root Cause:** Same state sync issue as above.

**File:** [`src/components/Tabs/SessionTrackingTab.tsx`](src/components/Tabs/SessionTrackingTab.tsx)

```typescript
// Lines 94-102 - Depends on elapsedTime which doesn't update
const xpBreakdown = useMemo(() => {
  if (!isActive || elapsedTime === 0) {
    return null;
  }
  return calculateXP(elapsedTime, undefined, undefined, false);
}, [isActive, elapsedTime, calculateXP]);
```

The `elapsedTime` prop from `useSessionTracker` is stuck because:
- Timer manager updates the store correctly
- But hook's local `elapsedTime` state isn't synced
- Multiple `useEffect` hooks have race conditions

**Fix:** Same as Bug #2 - fix state sync in `useSessionTracker`.

---

### **BUG #4: Header Stop Button Doesn't End Session** 🟡
**Root Cause:** Uses same broken `useSessionTracker.endSession()`.

**File:** [`src/components/Layout/AppHeader.tsx`](src/components/Layout/AppHeader.tsx)

```typescript
// Lines 42-49 - Same issue, no visual feedback
const handleStop = () => {
  const session = hookEndSession();  // ← Returns null due to !isActive check
  stop();  // Audio stops, but session continues
};
```

**Fix:** Same root cause - will be fixed with Bug #2.

---

### **BUG #5: Character "Regenerate" Always Fails** 🟡
**Root Cause:** Character generation uses `Date.now()` for name and timestamp, making it non-deterministic.

**File:** [`src/hooks/useCharacterGenerator.ts`](src/hooks/useCharacterGenerator.ts)

```typescript
// Lines 72-74 - Name changes every time!
const character = CharacterGenerator.generate(
  seed || `seed-${Date.now()}`,
  audioProfile,
  `Hero-${Date.now().toString().slice(-4)}`,  // ← Always different!
  options
);
```

**Comparison logic in CharacterGenTab.tsx:**
```typescript
// Line 94 - This will NEVER match!
const isMatch = JSON.stringify(original) === JSON.stringify(regenerated);
```

**What happens:**
1. Generate character with seed "abc" → name = "Hero-1234", timestamp = "2024-01-26T10:00:00"
2. Regenerate with same seed "abc" → name = "Hero-5678", timestamp = "2024-01-26T10:00:01"
3. JSON.stringify() fails → "Mismatch!" error

**Fix:** Generate name deterministically from seed, or exclude timestamps from comparison.

---

### **BUG #6: XP Calculator UX Improvement** 🟢
**User Request:** "Calculate XP" button should directly apply XP, no need for separate "Apply XP" button.

**Current UX:** Two-step process (Calculate → Apply)
**Desired UX:** One-step process (Calculate & Apply)

**Fix:** Add option to auto-apply, or rename "Apply XP" to "Calculate & Apply XP".

---

## 📋 Detailed Fix Plan

### **PHASE 1: Fix useSessionTracker State Sync** (Critical - Root Cause)

**This fixes Bugs #2, #3, and #4.**
**Priority: Root cause first - fix this BEFORE adding XP processing.**

- [ ] **Task 1.1: Refactor useSessionTracker to derive state from store**
  - File: [`src/hooks/useSessionTracker.ts`](src/hooks/useSessionTracker.ts)
  - **CRITICAL**: Remove local `isActive` state - derive from `activeSession` in store
  - **CRITICAL**: Remove local `elapsedTime` state - use `activeSession.elapsedSeconds` from store
  - Update `startSession()` to only set store state (no local state)
  - Update `endSession()` to check `activeSession` from store, not local `isActive`
  - Simplify useEffect hooks - remove sync logic completely
  - Return values derived from store: `isActive = !!activeSession`, `elapsedTime = activeSession?.elapsedSeconds || 0`

- [ ] **Task 1.2: Add session cleanup on page load**
  - File: [`src/hooks/useSessionTracker.ts`](src/hooks/useSessionTracker.ts)
  - **NEW REQUIREMENT**: Kill any active session on page load
  - Add initialization check in hook: if `activeSession` exists on mount, end it immediately
  - This prevents "zombie sessions" after page reload
  - Call `storeEndSession()` to clear persisted state
  - Ensures clean slate every time the page loads

- [ ] **Task 1.3: Update SessionTrackingTab for new hook interface**
  - File: [`src/components/Tabs/SessionTrackingTab.tsx`](src/components/Tabs/SessionTrackingTab.tsx)
  - Update destructuring - values now come directly from store via hook
  - Remove any local state sync assumptions
  - The hook now guarantees `isActive` reflects the true store state

- [ ] **Task 1.4: Update AppHeader for new hook interface**
  - File: [`src/components/Layout/AppHeader.tsx`](src/components/Layout/AppHeader.tsx)
  - Ensure same behavior as Session tab
  - Add visual feedback when session ends (toast or indicator)

- [ ] **Task 1.5: Test state sync works BEFORE proceeding**
  - **DO NOT PROCEED TO PHASE 2 UNTIL THIS WORKS:**
  - Start session → switch tabs → return → verify End button works ✓
  - Start session → refresh page → verify session is killed ✓
  - Start session → switch characters → verify behavior handled ✓
  - Verify `isActive` is always derived from store, never local state

---

### **PHASE 2: Add XP Processing on Session End** (Critical)

**This fixes Bug #1 - sessions not saving XP to character.**
**⚠️ DO NOT START THIS PHASE until Phase 1 tasks are ALL verified working.**

- [ ] **Task 2.1: Integrate processSession in SessionTrackingTab**
  - File: [`src/components/Tabs/SessionTrackingTab.tsx`](src/components/Tabs/SessionTrackingTab.tsx)
  - Import `useCharacterUpdater` hook
  - Get `processSession` function
  - In `handleEnd()`, after getting session data:
    ```typescript
    const handleEnd = () => {
      const session = hookEndSession();
      if (session) {
        setLastSession(session);
        // NEW: Process session for character XP
        const activeChar = getActiveCharacter();
        if (activeChar) {
          const result = processSession(activeChar, session);
          if (result?.leveledUp) {
            // Show level-up notification
            // Trigger confetti, etc.
          }
        }
      }
      stop();
    };
    ```
  - Handle level-up modals if triggered
  - Show success toast when XP applied

- [ ] **Task 2.2: Integrate processSession in AppHeader**
  - File: [`src/components/Layout/AppHeader.tsx`](src/components/Layout/AppHeader.tsx)
  - Same logic as Session tab
  - Get active character and process session
  - Show notification when XP applied

- [ ] **Task 2.3: Test XP application from sessions**
  - Start session → let it run → end session → verify XP added to character
  - Check character's XP increased in Character Store
  - Check character leveled up if enough XP
  - Check stats increased correctly
  - Check level-up modal appears for manual mode

---

### **PHASE 3: Fix Real-time XP Display** (High Priority)

**This is Bug #3 - should be AUTOMATICALLY FIXED by Phase 1.**
**After fixing state sync, `elapsedTime` will update properly, which will trigger XP recalculation.**

- [ ] **Task 3.1: Verify XP display works after Phase 1**
  - File: [`src/components/Tabs/SessionTrackingTab.tsx`](src/components/Tabs/SessionTrackingTab.tsx)
  - After Phase 1 is complete, start a session
  - Verify `elapsedTime` increments every second
  - Verify `xpBreakdown` useMemo recalculates (depends on `elapsedTime`)
  - Verify `displayedXP` animated counter increments

- [ ] **Task 3.2: Debug only if still broken**
  - If XP still not updating after Phase 1:
  - Check useMemo dependencies are correct
  - Check `calculateXP` is called with correct `elapsedTime`
  - Check animation loop is running

- [ ] **Task 3.3: Test real-time XP display**
  - Start session → watch XP counter go up every second ✓
  - Switch tabs → return → verify XP still updating ✓

---

### **PHASE 4: Fix Character Regenerate Feature** (Medium Priority)

**This fixes Bug #5.**

- [ ] **Task 4.1: Make character generation deterministic**
  - File: [`src/hooks/useCharacterGenerator.ts`](src/hooks/useCharacterGenerator.ts)
  - Change character name generation to use seed instead of Date.now():
    ```typescript
    // Before: `Hero-${Date.now().toString().slice(-4)}`
    // After: Generate deterministic name from seed
    const nameSuffix = seed.slice(-4);  // Use last 4 chars of seed
    const character = CharacterGenerator.generate(
      seed || `seed-${Date.now()}`,
      audioProfile,
      `Hero-${nameSuffix}`,  // Deterministic!
      options
    );
    ```

- [ ] **Task 4.2: Alternative: Update comparison to ignore timestamps**
  - File: [`src/components/Tabs/CharacterGenTab.tsx`](src/components/Tabs/CharacterGenTab.tsx)
  - If name should stay random, update comparison to exclude timestamps:
    ```typescript
    // Create comparison copies without timestamps
    const compareObj = (obj: any) => {
      const { generated_at, ...rest } = obj;
      return rest;
    };
    const isMatch = JSON.stringify(compareObj(original)) === JSON.stringify(compareObj(regenerated));
    ```

- [ ] **Task 4.3: Test regenerate feature**
  - Generate character → click Regenerate → verify no error
  - Test with standard mode
  - Test with uncapped mode
  - Verify regenerated character matches original

---

### **PHASE 5: Streamline XP Calculator** (Low Priority)

**User request: "Calculate XP should just apply it" - remove the extra Apply XP button.**

- [ ] **Task 5.1: Remove separate Apply XP button, always auto-apply**
  - File: [`src/components/Tabs/XPCalculatorTab.tsx`](src/components/Tabs/XPCalculatorTab.tsx)
  - **CHANGE**: When "Calculate XP" is clicked AND a character is selected:
    - Calculate the XP as usual
    - **Immediately** call `addXPFromSource(activeCharacter, calculatedXP, 'xp_calculator')`
    - Show success toast with amount applied
    - Handle level-up modal if triggered
  - **REMOVE**: The separate "Apply XP" button section entirely
  - When NO character is selected: Show read-only breakdown only (can't apply)

- [ ] **Task 5.2: Update UI text to reflect new behavior**
  - Change button text from "Calculate XP" to "Calculate & Apply XP"
  - Add helper text: "XP will be immediately applied to [character name]"
  - Show warning: "No character selected - XP will be calculated but not applied"

- [ ] **Task 5.3: Test new calculator flow**
  - Select character → click Calculate → verify XP applied immediately ✓
  - Verify level-up triggers if enough XP ✓
  - No character selected → click Calculate → verify read-only only ✓

---

### **PHASE 6: Final Testing & Verification**

- [ ] **Task 6.1: End-to-end session test**
  - Select character → select track → start session
  - Watch XP counter go up in real-time
  - Switch to Party tab → verify music continues
  - Return to Session tab → verify session still active, XP still updating
  - End session → verify XP added to character
  - Verify level-up if enough XP earned

- [ ] **Task 6.2: Session persistence test**
  - Start session → refresh page → verify session still active
  - Start session → close tab → reopen → verify session recovered
  - Start session → switch characters → verify behavior

- [ ] **Task 6.3: Multiple scenarios test**
  - Quick session (5 seconds) → verify XP applied
  - Long session (60+ seconds) → verify correct XP
  - Session with environmental bonuses → verify bonus XP applied
  - Session with mastery bonus → verify +50 XP added

- [ ] **Task 6.4: Character management test**
  - Generate multiple characters
  - Regenerate each → verify no errors
  - Switch active characters
  - Verify each character's XP is tracked separately

---

## 🔧 Critical Files to Modify

| File | Purpose | Tasks |
|------|---------|-------|
| [`src/hooks/useSessionTracker.ts`](src/hooks/useSessionTracker.ts) | Fix state sync - ROOT CAUSE | 1.1 |
| [`src/components/Tabs/SessionTrackingTab.tsx`](src/components/Tabs/SessionTrackingTab.tsx) | Update for new hook, add XP processing | 1.2, 2.1, 3.1 |
| [`src/components/Layout/AppHeader.tsx`](src/components/Layout/AppHeader.tsx) | Update for new hook, add XP processing | 1.3, 2.2 |
| [`src/hooks/useCharacterGenerator.ts`](src/hooks/useCharacterGenerator.ts) | Make generation deterministic | 4.1 |
| [`src/components/Tabs/CharacterGenTab.tsx`](src/components/Tabs/CharacterGenTab.tsx) | Update comparison logic | 4.2 |
| [`src/components/Tabs/XPCalculatorTab.tsx`](src/components/Tabs/XPCalculatorTab.tsx) | Improve UX | 5.1, 5.2 |

---

## 🎯 Success Criteria

After completing all phases, the following should work:

✅ **Sessions save XP to character** - Ending a session applies XP to active character
✅ **End Session button works** - Even after switching tabs, clicking End works
✅ **Page reload kills sessions** - Active sessions are terminated on page load (no zombies)
✅ **Real-time XP display** - XP counter animates up every second during session
✅ **Header stop button works** - Stop from header properly ends session and applies XP
✅ **Regenerate works** - No more "Mismatch!" errors
✅ **XP calculator streamlined** - "Calculate & Apply XP" button does both in one click
✅ **Session survives tab changes** - Session continues when switching tabs
✅ **Level-ups work** - Session XP triggers proper level-ups with stat increases
✅ **No stuck sessions** - Can always end a session, no zombies ever

---

## 🚨 Implementation Order

**Do phases in this EXACT order:**

1. **Phase 1** (Fix State Sync + Add Cleanup) - Root cause, MUST BE VERIFIED before continuing
2. **Phase 2** (Add XP Processing) - Only after Phase 1 is fully tested
3. **Phase 3** (Verify Real-time XP) - Should work automatically after Phase 1
4. **Phase 4** (Fix Regenerate) - Independent, can be done anytime
5. **Phase 5** (Streamline Calculator) - Nice-to-have UX improvement
6. **Phase 6** (Final Testing) - End-to-end verification

**⚠️ CRITICAL: Do not start Phase 2 until Phase 1 Task 1.5 passes all tests.**

---

## 📝 Technical Notes

### State Sync Architecture

**Current (Broken):**
```
Component → useSessionTracker → local state (isActive, elapsedTime)
                                   ↓
                            sessionStore (activeSession)
```

**Fixed:**
```
Component → useSessionTracker → sessionStore (activeSession)
                                              ↓
                              derive: isActive = !!activeSession
                                      elapsedTime = activeSession?.elapsedSeconds || 0
```

### Page Reload Behavior

**Decision:** Kill sessions on page load (simpler than recovery)

```typescript
// In useSessionTracker hook initialization
useEffect(() => {
  // Kill any zombie session from previous page load
  if (activeSession) {
    storeEndSession(); // Clear persisted state
    timerManager.stop();
  }
}, []); // Run once on mount
```

### Session End Flow (with XP processing)

**Current (Broken):**
```
End Session → tracker.endSession() → store to history → (done, no XP applied)
```

**Fixed:**
```
End Session → tracker.endSession() → get session data
                                    ↓
                              get active character
                                    ↓
                              processSession(character, session)
                                    ↓
                              update character with XP
                                    ↓
                              handle level-ups (modals, toasts)
                                    ↓
                              store to history
```

### XP Calculator Flow

**Current (Two-step):**
```
Calculate XP → Show breakdown → User clicks "Apply XP" → Apply to character
```

**Fixed (One-step):**
```
Calculate & Apply XP → Calculate breakdown → Immediately apply to character → Show toast
```

If no character selected: Show read-only breakdown only (can't apply).

---

*Generated: 2026-01-26*
*Status: Ready for implementation*
*Priority: CRITICAL - Session functionality completely broken*
