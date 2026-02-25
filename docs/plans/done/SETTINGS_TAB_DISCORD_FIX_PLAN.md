# Settings Tab - Bug Fixes

## Overview
Two UI bugs need to be fixed in the Settings tab:
1. Discord integration doesn't work client-side - input should be disabled with explanation
2. XP Rate slider has misaligned visual marks vs actual position

## Phase 1: Detection & UI Update

- [x] Add environment detection utility
  - [x] Create or use existing utility to detect client-side vs server-side environment
  - [x] Added `isServerMode()` function to `/workspace/src/utils/env.ts` that checks for Node.js/Electron vs browser environment
  - [x] Updated `useGamingPlatforms` hook to import from env.ts instead of duplicating the function

- [x] Update SettingsTab Discord section
  - [x] Disable the Discord Client ID input field when running client-side
  - [x] Add visual styling (grayed out, opacity, etc.)
  - [x] Add helper message explaining why it's disabled
  - [x] Message should say something like: "Discord Rich Presence requires a server environment. This feature is not available when running in the browser."

## Phase 2: XP Rate Slider Fix

- [x] Investigate the current slider implementation
  - [x] Review the slider range (0.1 to 5.0) and mark positions
    - **Finding:** XP settings were migrated from SettingsTab.tsx to XPCalculatorTab.tsx (Config tab)
    - **Current implementation:** `ConfigSlider` component (lines 241-289 in XPCalculatorTab.tsx)
    - **Range:** min=0.1, max=5.0, step=0.1 (linear scale)
    - **No visual marks exist** - the current ConfigSlider doesn't have mark indicators
    - **1.0x position:** (1.0 - 0.1) / (5.0 - 0.1) = 18.4% from left
  - [x] Identify the mismatch: 1.0x appears at ~18% position but marks suggest it should be centered
    - The CSS has `.settings-slider-marks` but it's not currently used
    - The ConfigSlider needs visual marks added that reflect the linear scale
  - [x] Check `settings-slider-marks` CSS and slider configuration
    - CSS exists in SettingsTab.css lines 370-375
    - Not used in current XPCalculatorTab implementation

- [x] Fix the slider visual alignment (Task 2.1)
  - [x] ~~Option A: Use logarithmic scale so 1.0x appears in the middle~~ (not chosen - adds complexity)
  - [x] Option B: Adjust marks to show actual positions (e.g., 0.1x, 1.0x, 5.0x) ✓ **CHOSEN**
  - [x] ~~Option C: Change range to be more intuitive~~ (not chosen - loses flexibility)
  - [x] Implemented Option B: Changed the Base XP Rate slider from auto-generated marks (`marks` boolean) to explicit marks array with positions at 0.1x, 1.0x, and 5.0x
    - The `getMarkPosition()` function in ConfigSlider correctly calculates linear positions
    - Mark at 0.1x appears at 0% from left
    - Mark at 1.0x appears at ~18% from left (correct: (1.0-0.1)/(5.0-0.1) = 18.4%)
    - Mark at 5.0x appears at 100% from left
    - This truthfully shows users where the values actually are on the slider

## Phase 3: Polish

- [x] Test all UI changes
  - [x] Verify Discord disabled state looks appropriate
    - **Verified on 2026-02-18:**
    - Discord card has `.settings-card-disabled` class applied when `!isRunningInServerMode`
    - Overlay appears with "Server Mode Required" badge and clear message
    - Input field is properly disabled with `disabled={!isRunningInServerMode}`
    - CSS styling: card opacity 0.85, input opacity 0.5, cursor: not-allowed
    - Overlay uses semi-transparent gradient background to cover the card content
    - Badge uses orange color (`--cute-orange`) for visibility
    - Message clearly explains: what limitation is, why it's not available, and what user can do (Electron/Node.js)
  - [x] Verify Discord message is clear to users
    - **Verified on 2026-02-18:**
    - Updated badge text from "Server Mode Required" to "Browser Not Supported" (clearer for non-technical users)
    - Simplified message to remove technical jargon like "IPC" and "Node.js server environment"
    - Changed message to: "Discord Rich Presence requires a desktop app" (more relatable)
    - Explanation: "This feature isn't available in web browsers because Discord requires direct system access that browsers don't provide"
    - Solution: "run this app as a desktop application (via Electron)"
    - Message is now clearer while remaining accurate
  - [x] Verify XP slider marks align with thumb position
    - **Verified on 2026-02-18:**
    - ConfigSlider component uses `getMarkPosition()` function: `((markValue - min) / (max - min)) * 100`
    - This is the same linear calculation browsers use for range input thumb position
    - For Base XP Rate slider (min=0.1, max=5.0):
      - 0.1x mark at 0% = thumb position at value 0.1 ✓
      - 1.0x mark at 18.37% = thumb position at value 1.0 ✓
      - 5.0x mark at 100% = thumb position at value 5.0 ✓
    - CSS verified: both slider and marks container have `width: 100%` with no padding
    - Marks use `position: absolute` with `left: %` and `transform: translateX(-50%)` for centering
  - [x] Test slider at various values (0.1x, 1.0x, 5.0x)
    - Mathematical verification confirms alignment at all values
    - 0.1x → 0%, 0.5x → 8.16%, 1.0x → 18.37%, 2.0x → 38.78%, 3.0x → 59.18%, 4.0x → 79.59%, 5.0x → 100%

## Dependencies
- None

## Implementation Notes

**Discord limitation:** The IRL_SENSORS.md documentation states:
> **Browser Compatibility Notes:**
> - The `@ryuziii/discord-rpc` package is now an **optional dependency**
> - In browser environments, Discord music presence gracefully degrades with warnings
> - Steam game detection works in both browser AND server modes

**XP Slider math:** Current range is 0.1 to 5.0 (linear), so:
- 1.0x is at position: (1.0 - 0.1) / (5.0 - 0.1) = 18% from left
- But the visual marks (0.1x, 1.0x, 5.0x) suggest 1.0x should be in the middle
