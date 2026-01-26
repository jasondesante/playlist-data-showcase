# 🎯 Bug Smash Cleanup Plan

## 🔍 Root Cause Analysis Summary

After thorough code investigation, I've identified the root causes of all the bugs:

### **BUG #1: Custom XP Doesn't Trigger Level Ups** 🚨
**Root Cause:** [CharacterLevelingTab.tsx:101-144](src/components/Tabs/CharacterLevelingTab.tsx#L101-L144)

The `addXP()` function **bypasses the entire CharacterUpdater engine**. It:
- Manually mutates XP numbers with basic arithmetic
- Calculates levels manually using a hardcoded XP thresholds array
- **Does NOT** call `addXPFromSource()` which properly uses the engine
- **Misses all the complex leveling logic**: HP increases, proficiency bonus, stat increases, pending stat tracking, level-up modals

Meanwhile, `handleDefeatBoss()` and `handleCompleteQuest()` correctly use `addXPFromSource()` which calls `CharacterUpdater.addXP()` from the data engine, properly handling all level-up mechanics.

**Fix:** Replace the manual `addXP()` implementation to use `addXPFromSource()` with source `'custom_xp'`.

---

### **BUG #2: Audio & Sessions Stop When Changing Tabs** 🔇
**Root Cause:** [App.tsx:38-53](src/App.tsx#L38-L53) + [useSessionTracker.ts:53-55](src/hooks/useSessionTracker.ts#L53-L55)

The app uses **conditional rendering** - each tab is a separate component that mounts/unmounts when you switch tabs. When the SessionTrackingTab unmounts:
1. The `useSessionTracker` hook's cleanup runs
2. The timer interval is cleared (line 86)
3. Session tracking is lost
4. Audio may continue but has no way to be controlled from other tabs

**Architecture Issue:** Sessions are tied to component lifecycle, not app state.

**Fix Options:**
1. **Option A:** Move session tracker state to a global store (persists across tabs)
2. **Option B:** Use React Portal/floating player UI (always visible)
3. **Option C:** Prevent audio stop on tab change by moving audio controls to a persistent header

---

### **BUG #3: Party Tab Can't Select Current Hero** 👥
**Root Cause:** [PartyTab.tsx](src/components/Tabs/PartyTab.tsx) (view-only) + [characterStore.ts](src/store/characterStore.ts) (has `activeCharacterId` but not used by party)

The party tab:
- Only displays characters in a grid
- Clicking opens a detail modal (read-only)
- **No mechanism to select an active character**
- The `activeCharacterId` exists in the store but is never used by the party tab

**Fix:** Add a "Set as Active" button to character cards in the party tab, and store the active character selection properly.

---

### **BUG #4: XP Calculator Doesn't Apply XP** 🧮
**Root Cause:** [XPCalculatorTab.tsx](src/components/Tabs/XPCalculatorTab.tsx)

The XP calculator:
- Only **calculates and displays** theoretical XP
- **Does NOT have a character selector**
- **Does NOT apply XP to any character**
- Shows character info but doesn't let you choose which character gets the XP

**Fix:**
1. Add character selector to XP calculator
2. Add "Apply XP to Character" button
3. Use `addXPFromSource()` to properly apply calculated XP

---

### **BUG #5: Stat Strategy Dropdown Invisible** 🎨
**Root Cause:** [StatStrategySelector.css](src/styles/components/StatStrategySelector.css)

The dropdown exists and is functional, but:
- Text color uses CSS variables (`var(--color-text-primary)`)
- Dark background uses CSS variables (`var(--color-surface)`)
- **CSS variables may not be properly defined or inherited**
- Result: Black text on dark background = invisible

**Fix:** Ensure CSS variables are properly set with dark mode values, or add explicit dark mode styles.

---

### **BUG #6: Stat Strategy Defaults Wrong** ⚙️
**Root Cause:** [useCharacterUpdater.ts:60](src/hooks/useCharacterUpdater.ts#L60)

```typescript
const [statManager] = useState(() => new StatManager({ strategy: 'dnD5e_smart' }));
```

The stat manager is **hardcoded** to `'dnD5e_smart'` (Smart Auto) on initialization, regardless of:
- Character's `gameMode` setting (standard vs uncapped)
- Character's existing stat strategy preference
- User's intended default behavior

**Fix:** Initialize stat manager strategy based on the active character's settings, or default to `'dnD5e'` (manual) for standard mode characters.

---

### **BUG #7: Session Tab Doesn't Show Real-time Song XP** 📊
**Root Cause:** [SessionTrackingTab.tsx:163-189](src/components/Tabs/SessionTrackingTab.tsx#L163-L189)

The session tab shows:
- Elapsed time ✓
- Timer ring animation ✓
- **BUT does NOT show XP earned so far** ✗

The XP is only shown **after the session ends** in the "Last Session" card.

**Fix:** Add real-time XP display that updates as the timer counts up, showing:
- Current XP earned
- XP progress toward next level
- Animated incrementing counter

---

## 📋 Detailed Task List

### **PHASE 1: Fix XP System Core** (Most Critical - Blocks All Leveling)

- [x] **Task 1.1: Replace Custom XP Implementation**
  - File: [src/components/Tabs/CharacterLevelingTab.tsx](src/components/Tabs/CharacterLevelingTab.tsx)
  - Remove manual `addXP()` function (lines 101-144)
  - Replace all calls to use `addXPFromSource()` with source `'custom_xp'`
  - Update quick-add buttons (+50, +100, +300, +1000) to use engine
  - Update custom XP input button to use engine
  - Verify level-ups trigger correctly
  - Verify stats increase properly
  - Verify stat selection modal appears for manual mode

- [x] **Task 1.2: Fix Stat Manager Default Strategy**
  - File: [src/hooks/useCharacterUpdater.ts](src/hooks/useCharacterUpdater.ts)
  - Change stat manager initialization from hardcoded `'dnD5e_smart'`
  - Detect character's `gameMode` and set strategy accordingly:
    - Standard mode → `'dnD5e'` (manual)
    - Uncapped mode → `'dnD5e_smart'` (auto)
  - Or: Load strategy from character's stored preference
  - Test with D&D 5e capped character (level 20) - should default to manual

- [x] **Task 1.3: Fix Stat Strategy Dropdown Visibility** ✅
  - File: [src/styles/components/StatStrategySelector.css](src/styles/components/StatStrategySelector.css)
  - Verified CSS variables are defined in global CSS
  - Added missing CSS variables to [src/styles/base.css](src/styles/base.css):
    - Font sizes: `--font-size-xs`, `--font-size-sm`, `--font-size-base`, `--font-size-lg`, `--font-size-xl`
    - Radius variants: `--radius-sm`, `--radius-md`, `--radius-lg`
    - Transition durations: `--transition-fast`, `--transition-normal`
    - Semantic color aliases: `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`
    - Surface colors: `--color-surface`, `--color-surface-elevated`
    - Border colors: `--color-border`, `--color-border-elevated`
    - Primary colors: `--color-primary`, `--color-primary-light`, `--color-primary-foreground`
    - Space aliases: `--space-1` through `--space-8` (mapped to `--spacing-*`)
  - Variables are now properly defined with hsl() values matching the app's dark theme
  - Build passes without errors
  - TypeScript type check passes without errors

---

### **PHASE 2: Fix Party & Hero Selection**

- [x] **Task 2.1: Add Active Character Selection to Party Tab** ✅
  - File: [src/components/Tabs/PartyTab.tsx](src/components/Tabs/PartyTab.tsx)
  - Added "Set as Active" button to each CharacterCard (via `onSetActive` prop)
  - Highlight the currently active character visually (`.party-card-active` CSS class with border highlight and subtle background tint)
  - Call `characterStore.setActiveCharacter(id)` when clicked
  - Show badge/icon indicating which character is active (top-left "Active" badge with checkmark icon and pulsing glow animation)
  - Files modified:
    - `src/components/ui/CharacterCard.tsx` - Added `isActive` and `onSetActive` props, active badge JSX, set active button
    - `src/components/Tabs/PartyTab.tsx` - Wire up `activeCharacterId` and `setActiveCharacter` from store, pass props to CharacterCard
    - `src/components/Tabs/PartyTab.css` - Added `.party-card-active`, `.party-card-active-badge`, `.party-card-set-active-btn` styles

- [x] **Task 2.2: Update Character Store Integration** ✅
  - File: [src/store/characterStore.ts](src/store/characterStore.ts)
  - Verified `activeCharacterId` is properly persisted via zustand persist middleware
  - Verified `getActiveCharacter()` getter exists and returns the active character object
  - Updated all tabs to use `getActiveCharacter()` instead of `characters[characters.length - 1]`:
    - `src/components/Tabs/CharacterLevelingTab.tsx` - Uses getActiveCharacter()
    - `src/components/Tabs/CharacterGenTab.tsx` - Uses getActiveCharacter()
    - `src/components/Tabs/CombatSimulatorTab.tsx` - Uses getActiveCharacter()

- [ ] **Task 2.3: Use Active Character in Leveling Tab**
  - File: [src/components/Tabs/CharacterLevelingTab.tsx](src/components/Tabs/CharacterLevelingTab.tsx)
  - Change from `characters[characters.length - 1]` to `getActiveCharacter()`
  - Add character selector dropdown if no active character is set
  - Display which character is currently receiving XP

---

### **PHASE 3: Fix XP Calculator**

- [ ] **Task 3.1: Add Character Selector to XP Calculator**
  - File: [src/components/Tabs/XPCalculatorTab.tsx](src/components/Tabs/XPCalculatorTab.tsx)
  - Add dropdown to select which character will receive XP
  - Display selected character's current XP and level
  - Show "XP to next level" for selected character

- [ ] **Task 3.2: Add "Apply XP" Button to Calculator**
  - File: [src/components/Tabs/XPCalculatorTab.tsx](src/components/Tabs/XPCalculatorTab.tsx)
  - Add button: "Apply [amount] XP to [character name]"
  - Use `addXPFromSource(calculatedAmount, 'xp_calculator')`
  - Handle level-up modal if triggered
  - Show success toast when XP is applied

---

### **PHASE 4: Fix Session & Audio Persistence**

- [ ] **Task 4.1: Create Persistent Session Store**
  - File: [src/store/sessionStore.ts](src/store/sessionStore.ts) (extend existing)
  - Add session state that persists across tab changes
  - Store: `isSessionActive`, `currentSessionData`, `elapsedTime`
  - Add actions: `pauseSession()`, `resumeSession()`

- [ ] **Task 4.2: Move Audio Controls to Persistent Header**
  - File: [src/components/Layout/AppHeader.tsx](src/components/Layout/AppHeader.tsx)
  - Add mini player controls to header
  - Show/hide based on session state
  - Always visible regardless of active tab
  - Play/Pause/Stop buttons work from any tab

- [ ] **Task 4.3: Update Session Tracker for Background Operation**
  - File: [src/hooks/useSessionTracker.ts](src/hooks/useSessionTracker.ts)
  - Don't clear timer on unmount - use store-based state
  - Add pause/resume functionality
  - Session continues even when tab is not active

---

### **PHASE 5: Add Real-time XP Display to Session Tab**

- [ ] **Task 5.1: Calculate Real-time XP During Session**
  - File: [src/components/Tabs/SessionTrackingTab.tsx](src/components/Tabs/SessionTrackingTab.tsx)
  - Use `useXPCalculator` hook to calculate XP based on elapsed time
  - Update XP display every second (sync with timer)
  - Show animated counter going up

- [ ] **Task 5.2: Display XP Progress in Session Tab**
  - File: [src/components/Tabs/SessionTrackingTab.tsx](src/components/Tabs/SessionTrackingTab.tsx)
  - Add "XP Earned This Session" display
  - Show progress bar toward next level
  - Display: "X / Y XP to next level"
  - Show bonus XP breakdown (environmental, gaming, mastery)

- [ ] **Task 5.3: Display Character Info in Session Tab**
  - File: [src/components/Tabs/SessionTrackingTab.tsx](src/components/Tabs/SessionTrackingTab.tsx)
  - Show which character is receiving the XP
  - Show character level and current XP
  - Show stats that will increase on level-up (if manual mode)

---

### **PHASE 6: Testing & Verification**

- [ ] **Task 6.1: Test Custom XP Level-ups**
  - Use custom XP buttons to add various amounts
  - Verify character levels up correctly
  - Verify HP increases
  - Verify proficiency bonus increases at correct levels
  - Verify stat increases work correctly
  - Verify stat selection modal appears for manual mode

- [ ] **Task 6.2: Test Session XP Persistence**
  - Start session in Session tab
  - Switch to Party tab
  - Verify audio continues playing
  - Verify session timer keeps running
  - Return to Session tab - verify session still active
  - End session - verify XP is applied correctly

- [ ] **Task 6.3: Test Hero Selection**
  - Create multiple characters
  - Select different hero from Party tab
  - Verify selection persists across tabs
  - Add XP to selected character
  - Verify correct character received XP

- [ ] **Task 6.4: Test XP Calculator**
  - Calculate XP for a duration
  - Select target character
  - Apply calculated XP
  - Verify character levels up correctly

- [ ] **Task 6.5: Test Stat Strategy UI**
  - Verify dropdown is visible in dark mode
  - Change strategy setting
  - Verify it applies to future level-ups
  - Verify default strategy matches character's game mode

---

## 🔧 Critical Files to Modify

| File | Purpose | Tasks |
|------|---------|-------|
| [src/components/Tabs/CharacterLevelingTab.tsx](src/components/Tabs/CharacterLevelingTab.tsx) | Fix custom XP to use engine | 1.1, 2.3 |
| [src/hooks/useCharacterUpdater.ts](src/hooks/useCharacterUpdater.ts) | Fix default stat strategy | 1.2 |
| [src/styles/components/StatStrategySelector.css](src/styles/components/StatStrategySelector.css) | Fix dropdown visibility | 1.3 |
| [src/components/Tabs/PartyTab.tsx](src/components/Tabs/PartyTab.tsx) | Add hero selection | 2.1 |
| [src/store/characterStore.ts](src/store/characterStore.ts) | Active character management | 2.2 |
| [src/components/Tabs/XPCalculatorTab.tsx](src/components/Tabs/XPCalculatorTab.tsx) | Add character selector + apply button | 3.1, 3.2 |
| [src/store/sessionStore.ts](src/store/sessionStore.ts) | Persistent session state | 4.1 |
| [src/components/Layout/AppHeader.tsx](src/components/Layout/AppHeader.tsx) | Global audio controls | 4.2 |
| [src/hooks/useSessionTracker.ts](src/hooks/useSessionTracker.ts) | Background sessions | 4.3 |
| [src/components/Tabs/SessionTrackingTab.tsx](src/components/Tabs/SessionTrackingTab.tsx) | Real-time XP display | 5.1, 5.2, 5.3 |

---

## 🎯 Success Criteria

After completing all tasks, the following should work:

✅ **Custom XP buttons** trigger proper level-ups with stat increases
✅ **Session XP** properly levels up characters with stat increases
✅ **Audio continues playing** when switching tabs
✅ **Sessions keep tracking** when switching tabs
✅ **Party tab allows selecting** the active hero
✅ **XP calculator shows character** and can apply XP
✅ **Stat strategy dropdown is visible** in dark mode
✅ **Stat strategy defaults correctly** based on game mode
✅ **Session tab shows real-time XP** going up during listening
✅ **Level-up modals appear** for all XP sources
✅ **Stat selection modal appears** for manual mode characters

---

## 📝 Implementation Order Recommendation

**Do phases in this order:**
1. **Phase 1** (Fix XP System Core) - Unblock all leveling functionality
2. **Phase 2** (Fix Party & Hero Selection) - Improve character management
3. **Phase 3** (Fix XP Calculator) - Connect calculator to characters
4. **Phase 4** (Fix Session & Audio Persistence) - Major UX improvement
5. **Phase 5** (Add Real-time XP Display) - Nice-to-have visual feedback
6. **Phase 6** (Testing & Verification) - Ensure everything works

---

## 🐛 Quick Reference: Bug Summary

| Bug | Severity | Phase | Root Cause |
|-----|----------|-------|------------|
| Custom XP no level-up | 🔴 CRITICAL | 1 | Bypasses engine, manual arithmetic only |
| Audio stops on tab change | 🔴 HIGH | 4 | Component lifecycle kills session |
| Can't select hero in party | 🟡 MEDIUM | 2 | No UI for selection |
| XP calculator doesn't apply | 🟡 MEDIUM | 3 | Read-only, no character selector |
| Stat dropdown invisible | 🟡 MEDIUM | 1 | CSS variables undefined/wrong |
| Wrong stat strategy default | 🟡 MEDIUM | 1 | Hardcoded to smart auto |
| No real-time session XP | 🟢 LOW | 5 | Only shown after session ends |

---

*Generated: 2026-01-26*
*Status: Ready for implementation*
