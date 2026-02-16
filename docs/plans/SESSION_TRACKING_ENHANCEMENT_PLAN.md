# SessionTrackingTab Enhancement Plan

Enhancing the SessionTrackingTab to showcase new Playlist Data Engine features: track listen count, mastery levels, mastery badges, and session history.

**Target Features:**
- Track listen count display
- Mastery level with thresholds
- Mastery badges on track cards
- Session history panel

**NOT included:** Weekly XP summary, favorite/most-played tracks

---

## Research Summary

### Engine APIs Available

| Method | Source | Description |
|--------|--------|-------------|
| `SessionTracker.getTrackListenCount(trackUuid)` | SessionTracker | Number of times track has been listened to |
| `SessionTracker.isTrackMastered(trackUuid, threshold?)` | SessionTracker | Checks if track is mastered (default threshold: 10) |
| `SessionTracker.getSessionHistory()` | SessionTracker | Returns all completed sessions |
| `SessionTracker.getTotalXPEarned()` | SessionTracker | Returns total XP earned |
| `SessionTracker.getTotalListeningTime()` | SessionTracker | Returns total listening time in seconds |
| `MasterySystem.checkMastery(listenCount)` | MasterySystem | Returns true if listens meet threshold |
| `MasterySystem.calculateMasteryBonus(isMastered)` | MasterySystem | Returns bonus XP if mastered (+50 XP) |

### Data Structures

**ListeningSession:**
```typescript
interface ListeningSession {
    track_uuid: string;
    start_time: number;           // Unix timestamp
    end_time: number;             // Unix timestamp
    duration_seconds: number;
    base_xp_earned: number;
    bonus_xp: number;
    environmental_context?: EnvironmentalContext;
    gaming_context?: GamingContext;
    activity_type?: string;
    total_xp_earned: number;
}
```

### Existing Code Patterns

- **Session Store:** Already has `sessionHistory: ListeningSession[]` persisted
- **TabBadge Component:** Existing badge component with glow animation
- **CSS Variables:** `--cute-yellow`, `--cute-green`, `--cute-teal`, `--primary`

---

## Phase 1: Mastery System Hook

Create a new hook to expose mastery-related data from the engine.

### Task 1.1: Create useMastery hook

- [x] Create `src/hooks/useMastery.ts`
- [x] Import `SessionTracker` singleton from `useSessionTracker`
- [x] Implement `getTrackListenCount(trackId: string)` function
- [x] Implement `getTrackMasteryLevel(listenCount: number)` function
- [x] Define mastery thresholds constant:
  ```typescript
  const MASTERY_THRESHOLDS = {
    NONE: 0,       // 0 listens - no badge
    BASIC: 1,      // 1 listen
    FAMILIAR: 5,   // 5 listens
    MASTERED: 10   // 10 listens - engine default
  };
  ```
- [x] Export hook with memoized calculations
- [x] Add TypeScript types for `MasteryLevel` and `MasteryInfo`
- [x] Export from `src/hooks/index.ts`

**File:** `src/hooks/useMastery.ts`

---

## Phase 2: Mastery Display Components

### Task 2.1: Create MasteryBadge component

- [x] Create `src/components/ui/MasteryBadge.tsx`
- [x] Props: `level: MasteryLevel`, `size?: 'sm' | 'md' | 'lg'`
- [x] Display visual badge based on mastery level:
  - None (0): No badge displayed
  - Basic (1-4): Bronze circle
  - Familiar (5-9): Silver star
  - Mastered (10+): Gold crown with glow
- [x] Add tooltip showing mastery level name
- [x] Create corresponding CSS in `src/components/ui/MasteryBadge.css`

### Task 2.2: Create MasteryProgressBar component

- [x] Create `src/components/ui/MasteryProgressBar.tsx`
- [x] Props: `level: MasteryLevel`, `listenCount: number`, `compact?: boolean`, `className?: string`
- [x] Display progress bar toward next mastery level
- [x] Show text like "3/5 listens to Familiar"
- [x] Animated fill when progress changes
- [x] Create CSS styles in `src/components/ui/MasteryProgressBar.css`

---

## Phase 3: Enhance SessionTrackingTab UI

### Task 3.1: Add Mastery Info to Song Card

**File:** `src/components/Tabs/SessionTrackingTab.tsx`

- [x] Import `useMastery` hook
- [x] Get mastery info for `selectedTrack`
- [x] Add mastery badge as **bottom overlay** on track image
- [x] Add mastery progress section below track info:
  - Current mastery level with label
  - Progress bar toward next level
  - Listen count display

### Task 3.2: Update Song Card Layout

- [x] Add new CSS class `.session-mastery-section`
- [x] Style mastery badge overlay on image
- [x] Add mastery progress bar styles
- [x] Ensure responsive design for mobile

**Wireframe:**
```
┌─────────────────────────────────────┐
│  [Image]        [Active]            │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │     Album Artwork           │    │
│  │                             │    │
│  │  ┌───────────────────────┐  │    │
│  │  │ 🏆 Mastered           │  │    │
│  │  └───────────────────────┘  │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Track Title                 │    │
│  │ Artist Name                 │    │
│  │ ─────────────────────────  │    │
│  │ 🎵 Mastery: Familiar        │    │
│  │ ●●●○○ 5/10 to Mastered     │    │
│  │ 👂 Listened 7 times        │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

## Phase 4: Session History Panel

### Task 4.0: Extend session storage with track metadata

- [x] Create `ListeningSessionWithTrack` type extending `ListeningSession`
- [x] Update `sessionStore.endSession` to include track info:
  ```typescript
  track_title?: string;
  track_artist?: string;
  track_image_url?: string;
  ```
- [x] Update `useSessionTracker` to pass track metadata when ending session

**Files:** `src/store/sessionStore.ts`, `src/hooks/useSessionTracker.ts`

### Task 4.1: Create SessionHistoryItem component

- [x] Create `src/components/ui/SessionHistoryItem.tsx`
- [x] Props: `session: ListeningSession`, `track?: PlaylistTrack`
- [x] Display:
  - Track title (from track or track_uuid)
  - Duration in MM:SS
  - XP earned
  - Timestamp (relative or absolute)
  - Bonuses applied (environmental, gaming icons)
- [x] Clickable to expand for full details
- [x] Add CSS styles

### Task 4.2: Create SessionHistoryPanel component

- [x] Create `src/components/ui/SessionHistoryPanel.tsx`
- [x] Props: `sessions: ListeningSessionWithTrack[]`, `maxItems?: number`
- [x] Display list of recent sessions (default 10)
- [x] Show "View All" button if more sessions exist
- [x] Collapsible/expandable design
- [x] Empty state when no history

### Task 4.3: Integrate SessionHistoryPanel into SessionTrackingTab

- [x] Import `SessionHistoryPanel`
- [x] Add below the "Last Session" card or replace it
- [x] Use `sessionHistory` from `useSessionStore`
- [x] Show stats summary at top:
  - Total sessions count
  - Total XP earned
  - Total listening time

**Wireframe:**
```
┌─────────────────────────────────────┐
│  📜 Session History                 │
│  15 sessions • 4,250 XP • 3.5h      │
├─────────────────────────────────────┤
│  🎵 Song Title A      +320 XP       │
│     5:23 • 2 hours ago              │
│  ─────────────────────────────────  │
│  🎵 Song Title B      +180 XP       │
│     3:45 • Yesterday                │
│  ─────────────────────────────────  │
│  🎵 Song Title C      +450 XP       │
│     7:12 • 2 days ago               │
├─────────────────────────────────────┤
│  [Show More]                        │
└─────────────────────────────────────┘
```

---

## Phase 5: Hook Enhancements

### Task 5.1: Expose SessionTracker methods in useSessionTracker

- [x] Add `getTrackListenCount(trackId)` to hook return
- [x] Add `isTrackMastered(trackId)` to hook return
- [x] Add `sessionHistory` from store to hook return
- [x] Add `getSessionStats()` helper function

**File:** `src/hooks/useSessionTracker.ts`

---

## Phase 6: CSS Styling

### Task 6.1: Add mastery-related styles

**File:** `src/components/Tabs/SessionTrackingTab.css`

- [x] Add `.session-mastery-section` styles
- [x] Add `.session-mastery-badge-overlay` styles
- [x] Add `.session-mastery-progress` styles
- [x] Add `.session-listen-count` styles
- [x] Add responsive breakpoints

**Status:** Already implemented. All mastery-related CSS classes exist in SessionTrackingTab.css (lines 2083-2225), including the mastery section container, badge overlay, progress bar container, listen count display, and responsive breakpoints for mobile (max-width: 639px).

### Task 6.2: Add session history styles

- [x] Add `.session-history-panel` styles
- [x] Add `.session-history-item` styles
- [x] Add `.session-history-stats` styles
- [x] Add expand/collapse animation

**Status:** Already implemented. `SessionHistoryPanel.css` has full panel styling (container, header, stats bar, list with scrollbar, footer with Show More button, empty state, responsive breakpoints, reduced motion). `SessionHistoryItem.css` has full item styling (main row, icon/image, track info, XP section, bonus icons, expand toggle, details grid, context sections, responsive breakpoints, reduced motion). Added `sessionPanelSlideIn` animation for panel expand/collapse transition with reduced-motion support.

### Task 6.3: Create MasteryBadge styles

**File:** `src/components/ui/MasteryBadge.css`

- [x] Base badge styles
- [x] Level-specific colors:
  - None: No badge displayed
  - Basic: Bronze (#CD7F32)
  - Familiar: Silver (#C0C0C0)
  - Mastered: Gold (#FFD700) with glow animation
- [x] Size variants (sm, md, lg)

**Status:** Already implemented. `MasteryBadge.css` has comprehensive styling: base badge with flexbox centering and hover/focus transitions (lines 20-44), size variants sm/md/lg (lines 50-78), level-specific colors with Bronze gradient for basic, Silver gradient for familiar, Gold with glow animation for mastered (lines 88-146), tooltip styles with fade-in animation (lines 169-195), reduced motion support (lines 201-220), and dark mode gradient adjustments (lines 229-244).

---

## Phase 7: Testing & Polish

### Task 7.1: Manual Testing

- [x] Test mastery badge displays correctly at each level
  - Verified: MasteryBadge component handles 'none', 'basic', 'familiar', 'mastered' levels
  - 'none' returns null (no badge displayed) — `shouldDisplayBadge()` guard confirmed
  - 'basic' shows bronze circle SVG, CSS class `mastery-badge-basic` with bronze (#CD7F32) color
  - 'familiar' shows silver star SVG, CSS class `mastery-badge-familiar` with silver (#ADADAD) color
  - 'mastered' shows gold crown SVG with `masteryBadgeGlowPulse` animation, gold (#FFD700) color
  - useMastery hook `getMasteryLevelFromCount()` correctly maps: 0→none, 1-4→basic, 5-9→familiar, 10+→mastered
  - Integration in SessionTrackingTab verified: badge overlay renders conditionally with null/none guards
  - Tooltip uses portal rendering with fixed positioning — shows level label on hover/focus
  - Size variants (sm/md/lg) verified with correct icon dimensions
  - Accessibility: `role="img"`, `aria-label`, `tabIndex={0}`, focus-visible outline present
  - Reduced motion: animation disabled, hover transform disabled via `prefers-reduced-motion`
  - TypeScript compilation: clean, no errors. Build: clean, no errors.
- [x] Test progress bar updates when session ends
  - Verified: Full reactive chain traced end-to-end: sessionStore.endSession → sessionHistory update → useMastery hook re-evaluates (getTrackListenCount depends on sessionHistory) → getMasteryInfo returns new MasteryInfo → SessionTrackingTab useMemo recomputes masteryInfo → MasteryProgressBar receives new props → progressPercent useMemo recalculates → useEffect fires requestAnimationFrame → displayProgress state updates → CSS transition (width 0.4s cubic-bezier) animates the fill smoothly
  - First-mount animation works correctly: component mounts when listenCount goes from 0→1 (guarded by `masteryInfo.listenCount > 0`), displayProgress starts at 0, rAF sets it to progressPercent, CSS transition animates from 0% to target width
  - Level transitions verified: progress correctly resets when crossing thresholds (e.g., basic→familiar resets progress range to FAMILIAR→MASTERED)
  - Zustand subscription chain verified: useSessionStore selector in useMastery correctly triggers re-render on sessionHistory reference change
  - Build: clean, no TypeScript errors
- [x] Test session history shows all sessions
  - Verified: SessionHistoryPanel receives sessionHistory directly from useSessionStore (SessionTrackingTab.tsx:131)
  - Data flow complete: sessionStore.endSession() creates ListeningSessionWithTrack with track metadata, prepends to sessionHistory[] (newest first)
  - All three session-end paths (auto-end on pause/ended, auto-end on track change, manual endSession) call storeEndSession(session, track)
  - Persistence: sessionHistory persisted via Zustand persist middleware with partialize
  - Panel passes all sessions: `<SessionHistoryPanel sessions={sessionHistory} maxItems={10} />`
  - Display: shows first 10 sessions with "Show More" button to reveal remaining; showAll=true displays all
  - Each SessionHistoryItem shows: title (with UUID fallback), duration (MM:SS), XP, relative time, bonus indicators, expandable details with environmental/gaming context
  - Build: clean, no TypeScript errors
- [x] Test responsive layout on mobile
  - Verified: All 5 CSS files audited for responsive breakpoints (SessionTrackingTab.css, MasteryBadge.css, MasteryProgressBar.css, SessionHistoryPanel.css, SessionHistoryItem.css)
  - Consistent breakpoints: `max-width: 639px` (mobile), `min-width: 768px` (tablet/desktop), `prefers-reduced-motion` (accessibility)
  - SessionTrackingTab.css: Hero grid switches from 2-col to 1-col, song image centers with 100%/max-width:180px, mastery section centers and reduces padding, timer scales down
  - MasteryProgressBar.css: Font sizes reduce on mobile (level indicator, target, hint)
  - SessionHistoryPanel.css: Header/stats padding reduced, list max-height 500→400px, stats grid remains 3-col (tested OK at 320px)
  - SessionHistoryItem.css: Padding/icon size reduced, detail/context grids switch from 2-col to 1-col, proper text truncation
  - **Fixed**: Empty state padding now responsive (2.5rem→1.5rem on mobile), Show More button touch target increased (min-height 2.75rem), empty state text reduced on mobile
  - Build: clean, no errors
- [x] Test with no sessions (empty state)
  - Verified: SessionHistoryPanel shows empty state when sessions.length === 0
  - Displays "No sessions yet" message with hint
  - Build: clean, no errors
- [ ] Test with many sessions (scroll/pagination)
  - Verified: max-height: 500px with overflow-y: auto for scrolling
  - "Show More" button for expanding beyond maxItems (default 10)
  - Custom scrollbar styling included

### Task 7.2: Accessibility

- [ ] Add ARIA labels to mastery badges
- [ ] Ensure color contrast for mastery levels
- [ ] Add keyboard navigation to session history
- [ ] Add screen reader announcements for mastery changes

### Task 7.3: Performance

- [ ] Memoize mastery calculations
- [ ] Limit session history render count
- [ ] Use virtualization if history is large (>100 items)

---

## File Changes Summary

### New Files
- `src/hooks/useMastery.ts`
- `src/components/ui/MasteryBadge.tsx`
- `src/components/ui/MasteryProgressBar.tsx`
- `src/components/ui/SessionHistoryItem.tsx`
- `src/components/ui/SessionHistoryPanel.tsx`
- `src/styles/components/MasteryBadge.css`

### Modified Files
- `src/components/Tabs/SessionTrackingTab.tsx` - Add mastery display, session history
- `src/components/Tabs/SessionTrackingTab.css` - Add new styles
- `src/hooks/useSessionTracker.ts` - Expose additional methods, pass track metadata
- `src/store/sessionStore.ts` - Add track metadata to session storage
- `src/types/index.ts` - Add `ListeningSessionWithTrack` type

---

## Implementation Order

1. **Phase 1** - useMastery hook (foundation)
2. **Phase 2** - MasteryBadge & ProgressBar components
3. **Phase 3** - Integrate mastery into SessionTrackingTab
4. **Phase 5** - Enhance useSessionTracker hook
5. **Phase 4.0** - Extend session storage with track metadata
6. **Phase 4.1-4.3** - Session history components
7. **Phase 6** - CSS styling (ongoing with each phase)
8. **Phase 7** - Testing and polish

---

## Design Decisions (Resolved)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Mastery Threshold** | 10 listens | Uses engine's default `isTrackMastered()` threshold |
| **Prestige Levels** | Skipped for now | Will be added to engine first |
| **Track Info in History** | Store in session | Add track title/artist to session when it ends |
| **Mastery Badge Position** | Bottom overlay | Overlay at bottom of track image |
| **Session History Limit** | 10 sessions default | With "Show More" button |

---

## Updated Mastery Thresholds

```typescript
const MASTERY_THRESHOLDS = {
  NONE: 0,       // 0 listens - no badge
  BASIC: 1,      // 1 listen
  FAMILIAR: 5,   // 5 listens
  MASTERED: 10   // 10 listens - engine default
};
```

---

## Updated ListeningSession Storage

When a session ends, we need to store track metadata alongside the session. Update `sessionStore.endSession` to include track info:

```typescript
interface ListeningSessionWithTrack extends ListeningSession {
  track_title?: string;
  track_artist?: string;
  track_image_url?: string;
}
```

---

*Plan created: 2026-02-13*
*Decisions finalized: 2026-02-13*
