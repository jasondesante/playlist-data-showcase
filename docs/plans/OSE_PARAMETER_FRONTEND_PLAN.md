# OSE Parameter Frontend Implementation Plan

## Overview

Expose Onset Strength Envelope (OSE) parameters in the BeatDetectionSettings component's Advanced Settings section. This allows users to configure beat detection precision and quality through a tiered mode system with presets and custom values.

**Goal**: Add UI controls for `hopSizeMs`, `melBands`, and `gaussianSmoothMs` parameters with EQ-style toggle button presets.

**Reference**: Backend implementation in `playlist-data-engine/docs/plans/OSE_PARAMETER_MODES_PLAN.md`

**Design Decisions** (from user interview):
- **Location**: In existing Advanced Settings collapsible section
- **Custom Input**: Number input field (for hopSize custom values)
- **Cache Behavior**: Same as existing settings (sensitivity/filter) - one cache per audioId, re-analyze to apply changes
- **UI Style**: EQ-style toggle buttons like Mode selector

---

## Phase 1: Type Definitions

Add frontend types to match the backend OSE parameter modes.

- [x] **1.1 Add OSE Parameter Types to `src/types/index.ts**`
  - [x] Add `HopSizeMode` type: `'efficient' | 'standard' | 'hq' | 'custom'`
  - [x] Add `HopSizeConfig` interface with `mode` and optional `customValue`
  - [x] Add `MelBandsMode` type: `'standard' | 'detailed' | 'maximum'`
  - [x] Add `MelBandsConfig` interface
  - [x] Add `GaussianSmoothMode` type: `'minimal' | 'standard' | 'smooth'`
  - [x] Add `GaussianSmoothConfig` interface
  - [ ] Re-export types from `playlist-data-engine` when available (deferred until engine exports types)

- [x] **1.2 Add OSE Preset Constants**
  - [x] Add `HOP_SIZE_PRESETS` constant object
  - [x] Add `MEL_BANDS_PRESETS` constant object
  - [x] Add `GAUSSIAN_SMOOTH_PRESETS` constant object

### Proposed Types

```typescript
// Tier 1: Primary Controls
export type HopSizeMode = 'efficient' | 'standard' | 'hq' | 'custom';

export const HOP_SIZE_PRESETS = {
  efficient: { value: 10, label: 'Efficient', description: 'Fast, reduced precision' },
  standard: { value: 4, label: 'Standard', description: 'Paper spec (default)' },
  hq: { value: 2, label: 'HQ', description: 'Maximum precision' },
} as const;

export interface HopSizeConfig {
  mode: HopSizeMode;
  customValue?: number; // Only used when mode === 'custom' (1-50ms range)
}

// Tier 2: Advanced Controls
export type MelBandsMode = 'standard' | 'detailed' | 'maximum';

export const MEL_BANDS_PRESETS = {
  standard: { value: 40, label: 'Standard', description: '40 bands' },
  detailed: { value: 64, label: 'Detailed', description: '64 bands' },
  maximum: { value: 80, label: 'Maximum', description: '80 bands' },
} as const;

export interface MelBandsConfig {
  mode: MelBandsMode;
}

export type GaussianSmoothMode = 'minimal' | 'standard' | 'smooth';

export const GAUSSIAN_SMOOTH_PRESETS = {
  minimal: { value: 10, label: 'Minimal', description: 'Fast transients' },
  standard: { value: 20, label: 'Standard', description: 'Balanced (default)' },
  smooth: { value: 40, label: 'Smooth', description: 'Cleaner peaks' },
} as const;

export interface GaussianSmoothConfig {
  mode: GaussianSmoothMode;
}
```

**File**: `src/types/index.ts`

---

## Phase 2: Store Updates

Update the beat detection store to handle OSE parameter modes. **No cache key changes needed** - works the same as existing sensitivity/filter settings.

- [x] **2.1 Update `BeatMapGeneratorOptions` Interface in Store**
  - [x] Add `hopSizeConfig?: HopSizeConfig` to generator options state
  - [x] Add `melBandsConfig?: MelBandsConfig` to generator options state
  - [x] Add `gaussianSmoothConfig?: GaussianSmoothConfig` to generator options state
  - [x] Update `DEFAULT_GENERATOR_OPTIONS` with default mode configs

- [ ] **2.2 Add Helper Functions for Mode-to-Value Conversion**
  - [ ] Add `resolveHopSizeMs(config: HopSizeConfig): number`
  - [ ] Add `resolveMelBands(config: MelBandsConfig): number`
  - [ ] Add `resolveGaussianSmoothMs(config: GaussianSmoothConfig): number`
  - [ ] These convert mode configs to actual numeric values for the engine

- [ ] **2.3 Update `generateBeatMap` to Use OSE Configs**
  - [ ] Resolve mode configs to numeric values before passing to engine
  - [ ] Merge resolved values into `BeatMapGeneratorOptions`
  - [ ] No cache key changes - same behavior as sensitivity/filter

**File**: `src/store/beatDetectionStore.ts`

---

## Phase 3: BeatDetectionSettings Component Updates

Add OSE parameter controls to the Advanced Settings section.

- [ ] **3.1 Add Hop Size Control Section**
  - [ ] Add section header with label "Hop Size" and description "Analysis precision"
  - [ ] Create EQ-style toggle button group with 4 options: Efficient, Standard, HQ, Custom
  - [ ] Show active state styling on selected mode
  - [ ] Display current value badge (e.g., "4ms")

- [ ] **3.2 Add Custom Hop Size Input**
  - [ ] Show number input field when "Custom" mode is selected
  - [ ] Add validation: min 1, max 50, step 1
  - [ ] Display value in ms with live update
  - [ ] Add clamping logic to prevent invalid values

- [ ] **3.3 Add Mel Bands Control Section**
  - [ ] Add section header with label "Mel Bands" and description "Frequency resolution"
  - [ ] Create EQ-style toggle button group with 3 options: Standard, Detailed, Maximum
  - [ ] Display current value badge (e.g., "40 bands")

- [ ] **3.4 Add Gaussian Smooth Control Section**
  - [ ] Add section header with label "Smoothing" and description "Peak clarity"
  - [ ] Create EQ-style toggle button group with 3 options: Minimal, Standard, Smooth
  - [ ] Display current value badge (e.g., "20ms")

- [ ] **3.5 Add "Re-Analyze Needed" Indicator**
  - [ ] Track OSE config used to generate current beat map (store alongside beat map or in separate state)
  - [ ] Compare current OSE settings to the stored "generated with" settings
  - [ ] Show visual indicator (e.g., amber badge) when settings differ
  - [ ] Display message: "Settings changed - re-analyze to apply"
  - [ ] Clear indicator after successful re-analysis

### Component Structure

```tsx
{/* In Advanced Settings content */}
<div className="beat-detection-ose-section">
  {/* Hop Size - Tier 1 Primary */}
  <div className="beat-detection-settings-section">
    <div className="beat-detection-settings-header">
      <span className="beat-detection-settings-label">Hop Size</span>
      <span className="beat-detection-settings-value">
        {hopSizeConfig.mode === 'custom'
          ? `${hopSizeConfig.customValue}ms`
          : `${HOP_SIZE_PRESETS[hopSizeConfig.mode].value}ms`}
      </span>
    </div>
    <div className="beat-detection-ose-toggles" role="radiogroup">
      {/* Toggle buttons for efficient/standard/hq/custom */}
    </div>
    {hopSizeConfig.mode === 'custom' && (
      <input
        type="number"
        min="1"
        max="50"
        value={hopSizeConfig.customValue}
        onChange={handleCustomHopSizeChange}
        className="beat-detection-ose-custom-input"
      />
    )}
  </div>

  {/* Mel Bands - Tier 2 Advanced */}
  <div className="beat-detection-settings-section">
    {/* Similar structure */}
  </div>

  {/* Gaussian Smooth - Tier 2 Advanced */}
  <div className="beat-detection-settings-section">
    {/* Similar structure */}
  </div>
</div>
```

**File**: `src/components/ui/BeatDetectionSettings.tsx`

---

## Phase 4: CSS Styling

Add EQ-style CSS for OSE parameter toggle buttons and custom input.

- [ ] **4.1 Add OSE Toggle Button Styles**
  - [ ] Style toggle button container (horizontal layout)
  - [ ] Style individual toggle buttons matching existing EQ aesthetic
  - [ ] Add active state styling (primary color, glow effect)
  - [ ] Add hover and focus states

- [ ] **4.2 Add Custom Input Styles**
  - [ ] Style number input field with EQ aesthetic
  - [ ] Add consistent sizing and spacing
  - [ ] Style validation states (error if out of range)

- [ ] **4.3 Add Section Divider**
  - [ ] Add visual separator between existing Advanced settings and OSE settings
  - [ ] Use subtle border or spacing

- [ ] **4.4 Add Responsive Styles**
  - [ ] Adjust toggle button sizes for tablet/mobile
  - [ ] Stack toggles vertically on very small screens
  - [ ] Adjust input field sizing

### CSS Classes

```css
/* OSE Section Container */
.beat-detection-ose-section {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed hsl(var(--border) / 0.3);
}

/* Toggle Button Container */
.beat-detection-ose-toggles {
  display: flex;
  gap: 0.375rem;
  margin-top: 0.375rem;
}

/* Toggle Button */
.beat-detection-ose-toggle {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 0.375rem;
  background: linear-gradient(180deg, hsl(var(--surface-3) / 0.5), hsl(var(--surface-2) / 0.7));
  border: 1px solid hsl(var(--border) / 0.5);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.beat-detection-ose-toggle--active {
  background: linear-gradient(135deg, hsl(var(--primary) / 0.18), hsl(var(--cute-purple) / 0.12));
  border-color: hsl(var(--primary));
  box-shadow: 0 0 12px hsl(var(--primary) / 0.2);
}

/* Custom Input */
.beat-detection-ose-custom-input {
  width: 100%;
  margin-top: 0.375rem;
  padding: 0.375rem 0.5rem;
  background: hsl(var(--surface-2));
  border: 1px solid hsl(var(--border) / 0.5);
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-family: ui-monospace, monospace;
  color: hsl(var(--foreground));
}
```

**File**: `src/components/ui/BeatDetectionSettings.css`

---

## Phase 5: Integration & Engine Communication

Wire up the UI to pass OSE parameters to the engine during beat map generation. **No cache key changes** - same behavior as existing sensitivity/filter settings.

- [ ] **5.1 Update `generateBeatMap` to Use OSE Configs**
  - [ ] Resolve mode configs to numeric values before passing to engine
  - [ ] Merge resolved values into `BeatMapGeneratorOptions`
  - [ ] Settings changes require manual re-analyze (same as sensitivity/filter)

- [ ] **5.2 Handle Engine Type Updates**
  - [ ] Wait for backend to export OSE types from `playlist-data-engine`
  - [ ] Update frontend imports to use engine types when available
  - [ ] Remove local type definitions if engine provides them

**Files**: `src/store/beatDetectionStore.ts`, `src/hooks/useBeatDetection.ts`

---

## Phase 6: Testing & Polish

Ensure everything works correctly and polish the UX.

- [ ] **6.1 Test Toggle Button Interactions**
  - [ ] Verify mode selection updates store
  - [ ] Verify custom input appears/disappears correctly
  - [ ] Test keyboard navigation (arrow keys between options)

- [ ] **6.2 Test Custom Value Validation**
  - [ ] Test min/max clamping (1-50ms for hop size)
  - [ ] Test invalid input handling
  - [ ] Test decimal handling (should round to integer)

- [ ] **6.3 Test Re-Analysis Flow**
  - [ ] Change OSE settings
  - [ ] Verify "Re-Analyze Needed" indicator appears
  - [ ] Click Re-Analyze button
  - [ ] Verify new analysis uses new settings
  - [ ] Verify indicator clears after re-analysis
  - [ ] Verify cached beat map is replaced

- [ ] **6.4 Accessibility Testing**
  - [ ] Verify ARIA roles and labels
  - [ ] Test screen reader announcement of selected mode
  - [ ] Verify keyboard operability

---

## Dependencies

- **Backend**: `playlist-data-engine` must implement OSE parameter modes (Phase 1-7 of OSE_PARAMETER_MODES_PLAN.md)
- **Type Exports**: Engine must export `HopSizeConfig`, `MelBandsConfig`, `GaussianSmoothConfig` types

---

## Implementation Order

1. **Phase 1** (Types) - Foundation for everything else
2. **Phase 2** (Store) - State management and cache key logic
3. **Phase 3** (Component) - UI controls
4. **Phase 4** (CSS) - Styling
5. **Phase 5** (Integration) - Wire up to engine
6. **Phase 6** (Testing) - Verify correctness

---

## Questions/Unknowns

- **Default hopSizeMs change**: The backend plan changes default from 10ms to 4ms. Should we show a migration notice to users who have cached beat maps with 10ms?
- **Custom value step**: Should custom hop size input allow decimals or only integers? (Current plan: integers only)
- **Engine type availability**: When will `playlist-data-engine` export the OSE types? If not ready, we'll use local type definitions temporarily.

---

## Visual Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ Advanced Settings ▶                                         │
├─────────────────────────────────────────────────────────────┤
│ BPM Range                    60 - 180 BPM                   │
│ [═══════════════════════════════════════════════════════]   │
│                                                             │
│ Tempo Center                 ~120 BPM                       │
│ [═══════════════════════════════════════════════════════]   │
│                                                             │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                             │
│ Hop Size                     4ms                            │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ Efficient│ │ Standard │ │    HQ    │ │  Custom  │        │
│ │   10ms   │ │ ●  4ms   │ │   2ms    │ │   ...    │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                             │
│ Mel Bands                    40 bands                       │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│ │   Standard   │ │   Detailed   │ │   Maximum    │         │
│ │  ●  40 bands │ │    64 bands  │ │    80 bands  │         │
│ └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                             │
│ Smoothing                    20ms                           │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│ │    Minimal   │ │   Standard   │ │    Smooth    │         │
│ │    10ms      │ │  ●  20ms     │ │    40ms      │         │
│ └──────────────┘ └──────────────┘ └──────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## Success Criteria

- [ ] Users can select Hop Size presets (Efficient/Standard/HQ/Custom)
- [ ] Custom Hop Size shows a number input field (1-50ms range)
- [ ] Users can select Mel Bands presets (Standard/Detailed/Maximum)
- [ ] Users can select Gaussian Smooth presets (Minimal/Standard/Smooth)
- [ ] "Re-Analyze Needed" indicator shows when settings differ from current beat map
- [ ] Re-analyze applies new settings (same behavior as sensitivity/filter)
- [ ] UI matches existing EQ-style design language
- [ ] All controls are keyboard accessible
- [ ] Settings persist across page reloads
