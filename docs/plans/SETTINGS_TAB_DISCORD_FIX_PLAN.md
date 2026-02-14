# Settings Tab - Bug Fixes

## Overview
Two UI bugs need to be fixed in the Settings tab:
1. Discord integration doesn't work client-side - input should be disabled with explanation
2. XP Rate slider has misaligned visual marks vs actual position

## Phase 1: Detection & UI Update

- [ ] Add environment detection utility
  - [ ] Create or use existing utility to detect client-side vs server-side environment
  - [ ] Could check `typeof window !== 'undefined'` or use a more robust method

- [ ] Update SettingsTab Discord section
  - [ ] Disable the Discord Client ID input field when running client-side
  - [ ] Add visual styling (grayed out, opacity, etc.)
  - [ ] Add helper message explaining why it's disabled
  - [ ] Message should say something like: "Discord Rich Presence requires a server environment. This feature is not available when running in the browser."

## Phase 2: XP Rate Slider Fix

- [ ] Investigate the current slider implementation
  - [ ] Review the slider range (0.1 to 5.0) and mark positions
  - [ ] Identify the mismatch: 1.0x appears at ~18% position but marks suggest it should be centered
  - [ ] Check `settings-slider-marks` CSS and slider configuration

- [ ] Fix the slider visual alignment
  - [ ] Option A: Use logarithmic scale so 1.0x appears in the middle
  - [ ] Option B: Adjust marks to show actual positions (e.g., 0.1x, 2.5x, 5.0x)
  - [ ] Option C: Change range to be more intuitive (e.g., 0.5x to 2.0x with 1.0x in middle)
  - [ ] Implement chosen solution and verify visual alignment

## Phase 3: Polish

- [ ] Test all UI changes
  - [ ] Verify Discord disabled state looks appropriate
  - [ ] Verify Discord message is clear to users
  - [ ] Verify XP slider marks align with thumb position
  - [ ] Test slider at various values (0.1x, 1.0x, 5.0x)

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
