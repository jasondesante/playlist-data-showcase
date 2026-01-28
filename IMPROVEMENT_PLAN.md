# Character Data UI Improvements Plan

## Overview
This plan covers enhancements to the Character Generation Tab, Party Tab, a bug fix for the track/hero synchronization on page load, and a navigation badge for pending stat increases.

## User Preferences Summary
- **Phase Order**: Bug fix → CharacterGenTab → PartyTab → Navigation Badge
- **HP Format**: `7/7` (no spaces, use letter-spacing in container for tweaking)
- **Race/Class Format**: `Race: Elf | Class: Rogue`
- **Weight Format**: `Equipped: 12 lbs | Total: 61 lbs`
- **Empty Spells**: "No spells learned yet" (left-aligned, muted color)
- **Equipment Distinction**: Checkmark + badge + visual highlight (all of the above)
- **Party Tab Modal**: Dark theme with borders, fade+scale animation
- **Date Button**: Expandable dropdown with pill/toggle style
- **Search Bar**: Identify and fix the "O" icon overlap issue
- **Active Badge**: Bottom-center inside card (not overlapping icon/name)
- **Navigation Badge**: Yellow glow + number badge above-center of Leveling tab icon, cap at "9+"
- **Color Swatches**: Small rounded squares (~20px) for appearance colors

---

## IMPORTANT EDITS AND NOTES


---

# Phase 1: Bug Fix - Track/Hero Synchronization on Page Load

## Problem
When the page reloads, the active hero is remembered but the associated song/track is not selected. The user has to click a different song and then go back to select the original song.

## Root Cause Analysis
The `restoreSelectedTrackFromActiveCharacter()` function in [src/store/characterStore.ts:274-317](src/store/characterStore.ts) has a race condition:
- It runs immediately on app mount via `App.tsx`
- At that time, `activeCharacterId` is available (persisted)
- But `currentPlaylist` might not be loaded yet
- The function exits early if playlist is null, never restoring the track

Additionally, `useSessionTracker.ts` has zombie cleanup that may clear `selectedTrack`.

## Tasks

### Task 1.1: Add retry/debounce logic to restore function
- [x] Add a flag to track if restoration was attempted but failed due to missing playlist
- [x] Add a listener for when playlist is loaded
- [x] Retry restoration after playlist loads
- [x] Add timeout to prevent infinite retry attempts

**File**: [src/store/characterStore.ts:274-317](src/store/characterStore.ts)

**Summary**: The retry/debounce logic was ALREADY implemented in the code (restorationState, setupPlaylistListener, timeout). However, there was a critical timing bug - restoration was triggered in App.tsx useEffect BEFORE the characterStore was hydrated from localStorage, so the characters array was empty and restoration failed silently. Fixed by adding onRehydrateStorage callback to characterStore that triggers restoration AFTER hydration.

### Task 1.2: Add playlist loaded listener
- [x] Create a new action in playlistStore that emits when playlist is loaded
- [x] Subscribe to this event in characterStore's restore function
- [x] Trigger restoration when playlist becomes available

**File**: [src/store/playlistStore.ts](src/store/playlistStore.ts)

**Summary**: Added event-driven playlist load notification system. Created `onPlaylistLoad()` function that allows other stores to register callbacks. Added `onRehydrateStorage` callback to zustand persist config so playlist restoration from localStorage triggers notifications. The characterStore's `setupPlaylistListener` now subscribes to these events for immediate response when playlist becomes available, with polling as a fallback safety net.

### Task 1.3: Fix session tracker interference
- [x] Review `useSessionTracker.ts` cleanup logic
- [x] Ensure it doesn't clear the restored selectedTrack
- [x] Add logging to verify timing

**File**: [src/hooks/useSessionTracker.ts](src/hooks/useSessionTracker.ts)

**Summary**: The session tracker cleanup logic has ALREADY been properly implemented. Lines 96-125 contain explicit logic to preserve `selectedTrack` when `currentUrl` is null (which happens when page loads and track is restored but not yet loaded into audio player). The code only clears `selectedTrack` if BOTH URLs are non-null AND different (actual stale state). Comprehensive logging is in place at lines 102-109 to verify timing. This task was already complete.

### Task 1.4: Test the fix
- [x] Load page with active character set
- [x] Verify both hero AND track are selected
- [x] Test with slow network conditions
- [x] Test with no playlist loaded
- [x] Test with deleted track from playlist

**Summary**: Fixed critical timing bug where restoration ran before characterStore hydration. Added `onRehydrateStorage` callback to characterStore that triggers restoration AFTER character data is loaded from localStorage. Added 100ms delay to allow playlistStore to also hydrate since restoration needs both data sources. Added comprehensive logging to track the restoration flow through App.tsx, AppHeader.tsx, and characterStore.ts. The fix ensures selectedTrack is properly set when page loads, making the hero's track visible in the mini player.

### Task 1.5: Investigate play button not working in party tab
- [x] Research why clicking play doesn't actually play songs when selected in party tab
- [x] Review the audio player logic and how it receives track data from party tab selections
- [x] Check if there's a disconnect between track selection and audio playback
- [x] Identify root cause of the play button being non-responsive

**Files**:
- [src/components/Tabs/PartyTab.tsx](src/components/Tabs/PartyTab.tsx)
- [src/store/playlistStore.ts](src/store/playlistStore.ts)
- [src/store/audioPlayerStore.ts](src/store/audioPlayerStore.ts)

**Summary**: Root cause identified - when selecting a character in the party tab, `handleSetActiveCharacter` called `selectTrack()` from playlistStore which updated `selectedTrack`, but did NOT update `currentUrl` in audioPlayerStore. This caused a mismatch where the mini player showed the new track name (from `selectedTrack`) but the audio element still had the old URL loaded (from `currentUrl`). When user clicked play, AppHeader's `handlePlayPause` checked `if (selectedTrack && !currentUrl)` which was FALSE (because `currentUrl` had the old URL), so it called `resume()` which only works if the current URL matches. Fixed by adding a `load()` function to audioPlayerStore that loads a URL without auto-playing, and calling it from PartyTab after `selectTrack()`.

### Task 1.6: Fix play button functionality in party tab
- [x] Implement fix for the play button not working
- [x] Ensure track selection properly connects to audio playback
- [x] Test that clicking play after selecting a song actually plays it
- [x] Verify the fix works across different heroes/songs

**Files**:
- [src/store/audioPlayerStore.ts](src/store/audioPlayerStore.ts) - Added `load()` function
- [src/components/Tabs/PartyTab.tsx](src/components/Tabs/PartyTab.tsx) - Updated to call `load()` after `selectTrack()`

**Summary**: Implemented fix by adding a new `load(url)` action to audioPlayerStore that preloads an audio URL without starting playback. Updated PartyTab's `handleSetActiveCharacter` to call `load(matchingTrack.audio_url)` after `selectTrack(matchingTrack)`. This ensures `currentUrl` in audioPlayerStore stays synchronized with `selectedTrack` in playlistStore when switching between characters in the party tab. Now when user clicks play in the mini player, the audio element has the correct track loaded and playback works correctly.

---

# Phase 2: CharacterGenTab Enhancements

## Problem
The CharacterGenTab doesn't display many fields from the character JSON, including racial traits, class features, appearance, proficiency bonus, and proper HP/formatting.

## Tasks

### Task 2.1: Update race/class display format
- [x] Change from "Level X Race Class" to "Race: Elf | Class: Rogue"
- [x] Keep level badge in its current position
- [x] Update the character class subtitle display

**Files**:
- [src/components/Tabs/CharacterGenTab.tsx:423-427](src/components/Tabs/CharacterGenTab.tsx)

**Summary**: Updated the character class subtitle display from "Level X Race Class" format to "Race: {race} | Class: {class}" format. The level badge remains on the avatar as a separate element, keeping the original design intent while making the race/class information more explicit and readable.

### Task 2.2: Add proficiency bonus display
- [ ] Create a new stat card for proficiency bonus
- [ ] Add it to the stats grid in the header
- [ ] Display with appropriate icon (star or similar)

**Files**:
- [src/components/Tabs/CharacterGenTab.tsx:390-440](src/components/Tabs/CharacterGenTab.tsx)
- [src/components/Tabs/CharacterGenTab.css:429-483](src/components/Tabs/CharacterGenTab.css)

### Task 2.3: Update HP display to show current/max
- [ ] Change from just `hp.max` to `hp.current/hp.max` format
- [ ] Example: "7/7" instead of just "7"
- [ ] No spaces around slash (use letter-spacing in container for tweaking)
- [ ] Update both header stats card and modal

**Files**:
- [src/components/Tabs/CharacterGenTab.tsx:397-400](src/components/Tabs/CharacterGenTab.tsx)

### Task 2.4: Create racial traits section
- [ ] Create new section component for racial traits
- [ ] Map through `character.racial_traits` array
- [ ] Display each trait as a badge/tag
- [ ] Add section title "Racial Traits"
- [ ] Position after skills section

**Files**:
- [src/components/Tabs/CharacterGenTab.tsx:560-575](src/components/Tabs/CharacterGenTab.tsx) - insert after this section
- [src/components/Tabs/CharacterGenTab.css](src/components/Tabs/CharacterGenTab.css)

### Task 2.5: Create class features section
- [ ] Create new section component for class features
- [ ] Map through `character.class_features` array
- [ ] Display each feature as a badge/tag
- [ ] Add section title "Class Features"
- [ ] Position after racial traits section

**Files**:
- [src/components/Tabs/CharacterGenTab.tsx](src/components/Tabs/CharacterGenTab.tsx)
- [src/components/Tabs/CharacterGenTab.css](src/components/Tabs/CharacterGenTab.css)

### Task 2.6: Create appearance section
- [ ] Create new section component for appearance
- [ ] Display all appearance fields:
  - body_type (text label)
  - skin_tone (small rounded square color swatch, ~20px)
  - hair_style (text label)
  - hair_color (small rounded square color swatch, ~20px)
  - eye_color (small rounded square color swatch, ~20px)
  - facial_features (array, display as tags)
- [ ] Add section title "Appearance"
- [ ] Position after class features section
- [ ] Use grid layout for color swatches with labels

**Files**:
- [src/components/Tabs/CharacterGenTab.tsx](src/components/Tabs/CharacterGenTab.tsx)
- [src/components/Tabs/CharacterGenTab.css](src/components/Tabs/CharacterGenTab.css)

### Task 2.7: Update equipment display
- [ ] Add equipped status indicator (checkmark icon)
- [ ] Add "Equipped" badge for equipped items
- [ ] Add visual highlight (different background) for equipped items
- [ ] Add equipment weight display: "Equipped: 12 lbs | Total: 61 lbs"
- [ ] Show all item categories: weapons, armor, items

**Files**:
- [src/components/Tabs/CharacterGenTab.tsx:578-617](src/components/Tabs/CharacterGenTab.tsx)
- [src/components/Tabs/CharacterGenTab.css:633-692](src/components/Tabs/CharacterGenTab.css)

### Task 2.8: Show spells section even when empty
- [ ] Remove conditional rendering when spells arrays are empty
- [ ] Display "No spells learned yet" message when no spells
- [ ] Style as left-aligned, muted color (`--muted-foreground`)
- [ ] Keep the section title "Spells"
- [ ] Add empty state styling

**Files**:
- [src/components/Tabs/CharacterGenTab.tsx:620-638](src/components/Tabs/CharacterGenTab.tsx)
- [src/components/Tabs/CharacterGenTab.css](src/components/Tabs/CharacterGenTab.css)

### Task 2.9: Add saving throws display (bonus)
- [ ] Create saving throws section
- [ ] Show which abilities have saving throw proficiency
- [ ] Display as simple list or grid
- [ ] Position after ability scores section

**Files**:
- [src/components/Tabs/CharacterGenTab.tsx](src/components/Tabs/CharacterGenTab.tsx)
- [src/components/Tabs/CharacterGenTab.css](src/components/Tabs/CharacterGenTab.css)

---

# Phase 3: PartyTab Visual Improvements

## Problem
The PartyTab has several issues:
1. Missing CSS variables causing visual problems
2. Search input placeholder overlaps with magnifying glass icon
3. "O" icon mystery (need to identify)
4. Equipment list has poor spacing and no borders
5. Modal needs visual redesign
6. Date added button needs visual makeover
7. Missing character data display
8. "Active" badge overlaps hero icon/name at top-left

## Tasks

### Task 3.1: Add missing CSS variables to base.css
- [ ] Add `--color-surface-dim` to `:root`
- [ ] Add `--color-surface-h`, `--color-surface-s`, `--color-surface-l` to `:root`
- [ ] Define appropriate values for dark theme

**File**: [src/styles/base.css:9-118](src/styles/base.css)

### Task 3.2: Investigate and fix search input icon overlap
- [ ] Inspect the Search icon rendering (lucide-react)
- [ ] Check if the "O" is actually the magnifying glass circle rendering poorly
- [ ] Add left padding to the placeholder text
- [ ] Fix icon container spacing

**Files**:
- [src/components/ui/Input.tsx:96-102](src/components/ui/Input.tsx)
- [src/components/ui/Input.css](src/components/ui/Input.css)
- [src/components/Tabs/PartyTab.tsx:190-199](src/components/Tabs/PartyTab.tsx)

### Task 3.3: Create date added toggle/pill buttons
- [ ] Replace select dropdown with expandable dropdown button
- [ ] Button shows current selection, click to expand options
- [ ] Dropdown shows sort options in a vertical list
- [ ] Add active state styling (highlighted) for selected option
- [ ] Click outside or selecting an option closes the dropdown
- [ ] Keep pill/toggle visual style for the button itself

**Files**:
- [src/components/Tabs/PartyTab.tsx:200-213](src/components/Tabs/PartyTab.tsx)
- [src/components/Tabs/PartyTab.css:64-89](src/components/Tabs/PartyTab.css)

### Task 3.4: Move "Active" badge to bottom of hero card
- [ ] Change positioning from `top: 0.5rem; left: 0.5rem` to bottom-center
- [ ] Position at bottom-center, inside card padding
- [ ] Ensure it doesn't overlap XP bar or other elements
- [ ] Update CSS for proper spacing at bottom
- [ ] Add small margin above card content to accommodate badge

**Files**:
- [src/components/ui/CharacterCard.tsx:67](src/components/ui/CharacterCard.tsx)
- [src/components/Tabs/PartyTab.css:308-340](src/components/Tabs/PartyTab.css)

### Task 3.5: Redesign equipment list in modal
- [ ] Add borders between equipment items
- [ ] Improve spacing (reduce gap between item name and status)
- [ ] Add equipped status indicators:
  - Checkmark icon
  - "Equipped" badge
  - Visual highlight background
- [ ] Display equipment weight: "Equipped: 12 lbs | Total: 61 lbs"

**Files**:
- [src/components/Tabs/PartyTab.tsx:345-378](src/components/Tabs/PartyTab.tsx)
- [src/components/Tabs/PartyTab.css:613-638](src/components/Tabs/PartyTab.css)

### Task 3.6: Redesign modal with dark theme and borders
- [ ] Add visible borders to all sections
- [ ] Improve section separation with proper spacing
- [ ] Add subtle border color that contrasts with dark background
- [ ] Update section title styling
- [ ] Improve overall modal padding and layout
- [ ] Change modal animation to fade + scale in (from 90% to 100%)

**Files**:
- [src/components/Tabs/PartyTab.tsx:241-452](src/components/Tabs/PartyTab.tsx)
- [src/components/Tabs/PartyTab.css:381-540](src/components/Tabs/PartyTab.css)

### Task 3.7: Add missing character data to modal
- [ ] Update race/class format to "Race: Elf | Class: Rogue"
- [ ] Add proficiency bonus display
- [ ] Add racial traits section
- [ ] Add class features section
- [ ] Add appearance section
- [ ] Add saving throws display
- [ ] Update HP to show current/max
- [ ] Update equipment with weight display

**Files**:
- [src/components/Tabs/PartyTab.tsx:245-450](src/components/Tabs/PartyTab.tsx)

### Task 3.8: Show "No spells learned yet" in modal
- [ ] Add empty state message when no spells
- [ ] Style as left-aligned, muted color (`--muted-foreground`)
- [ ] Keep the section visible even when empty
- [ ] Style empty state appropriately

**Files**:
- [src/components/Tabs/PartyTab.tsx:380-426](src/components/Tabs/PartyTab.tsx)
- [src/components/Tabs/PartyTab.css:639-673](src/components/Tabs/PartyTab.css)

---

# Phase 4: Navigation Badge for Pending Stat Increases

## Problem
When a character levels up with manual stat strategy, they have pending stat increases that need to be claimed. Currently, users must navigate to the Leveling tab to see if they have pending stat increases. This is not discoverable from other tabs.

## Solution
Add a visual indicator to the "Leveling" tab button in the navigation bar:
1. Yellow glow effect around the tab button when there are pending stat increases
2. Number badge above the button showing the count of pending stat increases
3. This makes it visible from any tab that action is needed

## Tasks

### Task 4.1: Create TabBadge component for navigation indicators
- [ ] Create a new reusable `TabBadge` component
- [ ] Support badge count display (cap at "9+" for anything over 9)
- [ ] Support optional glow effect (yellow pulsing animation)
- [ ] Style with yellow accent color (`--cute-yellow`)
- [ ] Position badge above-center of tab icon
- [ ] Small rounded square shape (not circular)

**Files**:
- [src/components/ui/TabBadge.tsx](src/components/ui/TabBadge.tsx) - new file
- [src/components/ui/TabBadge.css](src/components/ui/TabBadge.css) - new file

### Task 4.2: Update TabItem interface to support badge props
- [ ] Add optional `badgeCount?: number` prop to `TabItem` interface
- [ ] Add optional `showBadge?: boolean` prop to `TabItem` interface
- [ ] Update TypeScript types in `Sidebar.tsx`

**File**: [src/components/Layout/Sidebar.tsx:10-17](src/components/Layout/Sidebar.tsx)

### Task 4.3: Update AppHeader to render tab badges
- [ ] Import the new `TabBadge` component
- [ ] Render badge when `tab.badgeCount > 0`
- [ ] Add glow class when `tab.showBadge` is true
- [ ] Position badge above-center of the tab icon
- [ ] Use relative positioning on tab button, absolute on badge

**File**: [src/components/Layout/AppHeader.tsx:157-171](src/components/Layout/AppHeader.tsx)

### Task 4.4: Get pending stat increases count in App.tsx
- [ ] Import `useCharacterStore` hook
- [ ] Get active character from store
- [ ] Get pending stat increases count using `getPendingStatIncreaseCount(activeCharacterId)`
- [ ] Pass badge props to Leveling tab in tabs array

**File**: [src/App.tsx:46-58](src/App.tsx)

### Task 4.5: Create CSS for badge glow effect
- [ ] Add `tab-badge-glow` class with yellow box-shadow animation
- [ ] Create pulsing animation (2s ease-in-out infinite) for visibility
- [ ] Add badge positioning styles (above-center of icon)
- [ ] Badge shape: small rounded square (not circular)
- [ ] Ensure z-index places badge above other elements
- [ ] Cap display at "9+" for counts over 9

**Files**:
- [src/components/ui/TabBadge.css](src/components/ui/TabBadge.css)
- [src/components/Layout/AppHeader.css](src/components/Layout/AppHeader.css)

### Task 4.6: Test the badge functionality
- [ ] Level up a character with manual strategy to create pending stat increases
- [ ] Navigate to different tabs and verify badge appears
- [ ] Verify badge shows correct count (1, 2, 3, etc.)
- [ ] Verify glow animation is visible but not distracting
- [ ] Apply pending stat increases and verify badge disappears
- [ ] Test with multiple level-ups (accumulated pending increases)

---

# Verification Plan

## Testing Checklist

### Phase 1: Bug Fix Verification
- [ ] Reload page with active character - verify track is selected
- [ ] Test with slow network (DevTools throttling)
- [ ] Test with playlist that doesn't contain the character's track
- [ ] Test with no playlist loaded
- [ ] Check browser console for any errors
- [ ] Test play button works after selecting songs in party tab
- [ ] Verify audio actually plays when clicking play on party tab selections

**Status**: Tasks 1.1-1.6 completed. Tasks 1.5-1.6 fixed the play button bug in party tab. Root cause was that `selectTrack()` only updated `selectedTrack` in playlistStore but did not update `currentUrl` in audioPlayerStore. Fixed by adding `load(url)` function to audioPlayerStore and calling it from PartyTab after `selectTrack()`.

### Phase 2: CharacterGenTab Verification
- [ ] Verify race/class format: "Race: Elf | Class: Rogue"
- [ ] Verify proficiency bonus is displayed in stats grid
- [ ] Verify HP shows "7/7" format
- [ ] Verify racial traits section appears with all traits listed
- [ ] Verify class features section appears with all features listed
- [ ] Verify appearance section shows all fields including facial features
- [ ] Verify equipment shows checkmark, badge, and highlight for equipped items
- [ ] Verify equipment weight shows "Equipped: 12 lbs | Total: 61 lbs"
- [ ] Verify spells section shows "No spells learned yet" when empty

### Phase 3: PartyTab Verification
- [ ] Verify search input has proper spacing (no overlap)
- [ ] Identify and document what the "O" icon was
- [ ] Verify date added buttons are pill-style with active state
- [ ] Verify "Active" badge is at bottom of card, not overlapping icon/name
- [ ] Verify equipment list has borders and proper spacing
- [ ] Verify equipment shows equipped indicators
- [ ] Verify modal has visible borders between sections
- [ ] Verify modal shows all new data sections
- [ ] Verify spells empty state message appears

### Phase 4: Navigation Badge Verification
- [ ] Level up character with manual strategy to create pending stat increases
- [ ] Navigate to different tabs - verify badge is visible on Leveling tab
- [ ] Verify badge shows correct count number (1-9)
- [ ] Verify badge shows "9+" when pending increases exceed 9
- [ ] Verify yellow glow animation is present and pulsing
- [ ] Verify badge is positioned above-center of icon
- [ ] Verify badge is small rounded square shape
- [ ] Apply stat increases - verify badge disappears
- [ ] Test multiple level-ups - verify count accumulates correctly
- [ ] Test with uncapped mode (no pending increases) - verify no badge shown

---

# Implementation Details & Specifications

## Badge Component Specifications (Phase 4)
- **Shape**: Small rounded square (not circular), approximately 18-20px
- **Colors**: Yellow accent using `--cute-yellow` variable
- **Animation**: 2s ease-in-out infinite pulsing box-shadow
- **Position**: Above-center of tab icon, using absolute positioning
- **Cap**: Display "9+" for any count over 9
- **Z-index**: Higher than tab button to appear above

## Modal Animation Specifications (Task 3.6)
- **Type**: Fade + Scale in
- **Scale**: From 90% to 100%
- **Duration**: ~300ms
- **Easing**: ease-out (smooth deceleration)
- **Replace existing**: Current slide-up animation

## HP Display Format Specification (Tasks 2.3, 3.7)
- **Format**: `7/7` (no spaces around slash)
- **Tweaking**: Use letter-spacing in the container for fine adjustment
- **Container**: HP numbers in their own styled container

## Color Swatch Specifications (Tasks 2.6, 3.7)
- **Shape**: Small rounded squares
- **Size**: Approximately 20px × 20px
- **Border radius**: ~4px (slightly rounded)
- **Fields**: skin_tone, hair_color, eye_color
- **Display**: Inline with label, grid layout for all three

## Empty Spells State Specification (Tasks 2.8, 3.8)
- **Text**: "No spells learned yet"
- **Alignment**: Left-aligned (not centered)
- **Color**: `--muted-foreground` (dimmed)
- **Position**: Where spells would normally appear

## Active Badge Position Specification (Task 3.4)
- **Position**: Bottom-center of hero card
- **Inside**: Yes, within card padding
- **Spacing**: Add margin above card content to accommodate

---

# References

## Key Files

### State Management
- [src/store/characterStore.ts](src/store/characterStore.ts) - Character state and sync logic
- [src/store/playlistStore.ts](src/store/playlistStore.ts) - Playlist state

### Components
- [src/components/Tabs/CharacterGenTab.tsx](src/components/Tabs/CharacterGenTab.tsx) - Character gen tab
- [src/components/Tabs/CharacterGenTab.css](src/components/Tabs/CharacterGenTab.css) - Character gen styles
- [src/components/Tabs/PartyTab.tsx](src/components/Tabs/PartyTab.tsx) - Party tab
- [src/components/Tabs/PartyTab.css](src/components/Tabs/PartyTab.css) - Party tab styles
- [src/components/Tabs/CharacterLevelingTab.tsx](src/components/Tabs/CharacterLevelingTab.tsx) - Leveling tab
- [src/components/ui/Input.tsx](src/components/ui/Input.tsx) - Input component
- [src/components/ui/CharacterCard.tsx](src/components/ui/CharacterCard.tsx) - Character card component
- [src/components/Layout/AppHeader.tsx](src/components/Layout/AppHeader.tsx) - App header with tab navigation
- [src/components/Layout/Sidebar.tsx](src/components/Layout/Sidebar.tsx) - Sidebar navigation component

### Hooks
- [src/hooks/useSessionTracker.ts](src/hooks/useSessionTracker.ts) - Session tracking
- [src/hooks/useCharacterGenerator.ts](src/hooks/useCharacterGenerator.ts) - Character generation

### Styles
- [src/styles/base.css](src/styles/base.css) - Base CSS variables

## Character JSON Schema Reference
```json
{
  "name": "string",
  "race": "string",
  "class": "string",
  "level": number,
  "ability_scores": { "STR": number, ... },
  "ability_modifiers": { "STR": number, ... },
  "proficiency_bonus": number,
  "hp": { "current": number, "max": number, "temp": number },
  "armor_class": number,
  "initiative": number,
  "speed": number,
  "skills": { "athletics": "none|proficient|expertise", ... },
  "saving_throws": { "STR": boolean, ... },
  "racial_traits": ["string", ...],
  "class_features": ["string", ...],
  "appearance": {
    "body_type": "string",
    "skin_tone": "#hex",
    "hair_style": "string",
    "hair_color": "#hex",
    "eye_color": "#hex",
    "facial_features": ["string", ...]
  },
  "spells": {
    "spell_slots": {},
    "known_spells": ["string", ...],
    "cantrips": ["string", ...]
  },
  "equipment": {
    "weapons": [{ "name": "string", "quantity": number, "equipped": boolean }],
    "armor": [{ "name": "string", "quantity": number, "equipped": boolean }],
    "items": [{ "name": "string", "quantity": 