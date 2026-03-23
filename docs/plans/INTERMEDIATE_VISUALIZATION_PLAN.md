# Intermediate Visualization Components Plan

## Overview

Add two new visualization components between `QuantizationPanel` and `DifficultyVariantsPanel` to show the intermediate processing steps in the rhythm generation pipeline:

1. **CompositeStreamPanel** - Visualizes how 3 quantized band streams are combined into a composite stream
2. **DifficultyConversionPanel** - Shows how the composite stream is converted to 3 difficulty variants

## Problem Statement

Currently, the visualization flow jumps directly from quantization results to difficulty variants, skipping important intermediate steps:

```
Current Flow:
QuantizationPanel → [GAP] → DifficultyVariantsPanel
     ↓                              ↓
  bandStreams              difficultyVariants
  (3 band streams)         (final outputs)

Missing visualization for:
1. How band streams → composite stream (scoring, section selection)
2. How composite → difficulty variants (simplification, enhancement)
```

## Target Flow

```
New Flow:
QuantizationPanel → CompositeStreamPanel → DifficultyConversionPanel → DifficultyVariantsPanel
     ↓                    ↓                        ↓                          ↓
  bandStreams        composite stream        conversion process          final variants
```

---

## Phase 1: CompositeStreamPanel

### Purpose
Visualize how 3 quantized band streams are scored, sectioned, and combined into a composite stream.

### Data Sources
- `rhythm.bandStreams.low/mid/high.beats` - Quantized beats per band
- `rhythm.composite.beats` - Composite beats with `sourceBand` property
- `rhythm.composite.sections` - Section boundaries with winning band and margin
- `rhythm.composite.metadata.beatsPerBand` - Count of beats per band in composite
- `rhythm.composite.metadata.sectionsPerBand` - Percentage of sections per band

### UI Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Header: "Composite Stream Generation" + beat/section count      │
├─────────────────────────────────────────────────────────────────┤
│ Summary Stats:                                                   │
│  - Total beats in composite                                      │
│  - Total sections                                                │
│  - Beats per band (Low/Mid/High pie/bar)                         │
│  - Sections per band                                             │
├─────────────────────────────────────────────────────────────────┤
│ 3 Stacked Band Stream Timelines (quantized beats):              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Low Band  │ ●●●●●│    │●●●●│    │●●●●●●│    │●●●│          ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ Mid Band  │    │●●●●│    │    │●●●●│    │●●●●●●│          ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ High Band │  │●●●│    │●●●●●●│    │●●●●│    │●●●●│        ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ Composite Timeline (color-coded by sourceBand):                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Composite │●●●●│▓▓▓▓│░░░░│●●●●│▓▓▓▓│░░░░│●●●●●●│          ││
│  │           └────┘    └────┘    └────┘                        ││
│  │           Section boundaries (vertical lines)               ││
│  └─────────────────────────────────────────────────────────────┘│
│  Legend: ● Low  ▓ Mid  ░ High                                  │
├─────────────────────────────────────────────────────────────────┤
│ Quick Scroll Bar (shared navigation)                             │
├─────────────────────────────────────────────────────────────────┤
│ Legend: Band colors + section indicator                          │
└─────────────────────────────────────────────────────────────────┘
```

### Sub-Components

#### 1.1 BandStreamTimeline (inline)
- Similar to `BandTimeline` in MultiBandVisualization
- Shows quantized beats (not transients) for a single band
- Color-coded by band
- Drag-to-scrub functionality
- Quick scroll for fast navigation

#### 1.2 CompositeTimeline (inline)
- Shows composite beats with color coding by `sourceBand`
- Section boundary indicators (vertical lines or shaded regions)
- Hover shows section info (winning band, score, margin)
- Synced with audio playback

#### 1.3 StatsRow (inline)
- Beats per band in composite
- Sections per band percentages
- Total beats and sections

### Files to Create

| File | Description |
|------|-------------|
| `src/components/ui/BeatDetectionTab/RhythmGenerationTab/CompositeStreamPanel.tsx` | Main component |
| `src/components/ui/BeatDetectionTab/RhythmGenerationTab/CompositeStreamPanel.css` | Styles |

---

## Phase 2: DifficultyConversionPanel

### Purpose
Visualize how the composite stream is converted to 3 difficulty variants through simplification or enhancement.

### Data Sources
- `rhythm.composite.beats` - Source composite stream (baseline)
- `rhythm.difficultyVariants.easy/medium/hard.beats` - Final variant beats
- `rhythm.difficultyVariants[difficulty].editType` - 'none' | 'simplified' | 'interpolated' | 'pattern_inserted'
- `rhythm.difficultyVariants[difficulty].conversionMetadata` - For simplified:
  - `sixteenthToEighth` - Count of 16th → 8th conversions
  - `tripletToQuarterTriplet` - Count of triplet → quarter triplet conversions
  - `beatsRemoved` - Count of beats removed
  - `totalBeatsBefore` / `totalBeatsAfter`
- `rhythm.difficultyVariants[difficulty].enhancementMetadata` - For enhanced:
  - `patternsInserted` - Count of patterns added
  - `interpolatedBeats` - Count of interpolated beats
  - `insertedPatternIds` - IDs of patterns used
  - `densityMultiplier`
- `rhythm.metadata.naturalDifficulty` - Which difficulty is the "natural" one

### UI Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Header: "Difficulty Conversion" + natural difficulty badge      │
├─────────────────────────────────────────────────────────────────┤
│ Info Banner: "Natural Difficulty: Medium (unedited)"            │
├─────────────────────────────────────────────────────────────────┤
│ Composite Baseline Timeline:                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Baseline  │●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ 3 Difficulty Columns (side-by-side with diff visualization):    │
│  ┌──────────────┬──────────────┬──────────────┐                │
│  │ Easy         │ Medium       │ Hard         │                │
│  │ [Simplified] │ [Natural]    │ [Enhanced]   │                │
│  ├──────────────┼──────────────┼──────────────┤                │
│  │ ○ ◉ ○ ◉ ○    │ ● ● ● ● ●    │ ● ★ ● ★ ●    │                │
│  │ (ghost beats)│ (unchanged)  │ (added beats)│                │
│  │ ─ ─ ─ ─ ─    │ ─ ─ ─ ─ ─    │ ─ ─ ─ ─ ─    │                │
│  │ ◉ ○ ◉ ○ ◉    │ ● ● ● ● ●    │ ● ★ ● ★ ●    │                │
│  ├──────────────┼──────────────┼──────────────┤                │
│  │ Removed: 12  │ Unedited     │ Added: 8     │                │
│  │ 16th→8th: 6  │              │ Patterns: 3  │                │
│  │ Reduction:25%│              │ Increase:15% │                │
│  └──────────────┴──────────────┴──────────────┘                │
├─────────────────────────────────────────────────────────────────┤
│ Legend:                                                          │
│  ● Active beat  ○ Ghost (removed)  ★ Added (pattern/interp)    │
└─────────────────────────────────────────────────────────────────┘
```

### Sub-Components

#### 2.1 CompositeBaselineTimeline (inline)
- Shows the source composite stream as reference
- Markers for all beats
- Playhead synced with audio

#### 2.2 DifficultyConversionColumn (inline)
- Similar to `DifficultyColumn` in DifficultyVariantsPanel
- Shows diff visualization:
  - **Active beats** (solid) - Beats present in final variant
  - **Ghost beats** (faded/dashed) - Beats in composite but removed in this variant
  - **Added beats** (highlighted) - Beats not in composite but added (pattern_inserted/interpolated)
- Conversion metadata for simplified variants
- Enhancement metadata for enhanced variants

#### 2.3 DiffTimeline (inline)
- Compares composite vs variant beats
- Shows ghost/added beat markers
- Color coding by edit type

### Files to Create

| File | Description |
|------|-------------|
| `src/components/ui/BeatDetectionTab/RhythmGenerationTab/DifficultyConversionPanel.tsx` | Main component |
| `src/components/ui/BeatDetectionTab/RhythmGenerationTab/DifficultyConversionPanel.css` | Styles |

---

## Phase 3: Integration

### Files to Modify

#### RhythmGenerationTab.tsx

**1. Add imports:**
```typescript
import { Combine, GitBranch } from 'lucide-react';
import { CompositeStreamPanel } from '../../ui/BeatDetectionTab/RhythmGenerationTab/CompositeStreamPanel';
import { DifficultyConversionPanel } from '../../ui/BeatDetectionTab/RhythmGenerationTab/DifficultyConversionPanel';
```

**2. Update SectionId type:**
```typescript
type SectionId = 'transients' | 'multiband' | 'quantization' | 'composite' | 'conversion' | 'variants' | 'comparison' | 'phrases' | null;
```

**3. Update sectionRefs:**
```typescript
const sectionRefs = useRef<Record<Exclude<SectionId, null>, HTMLDivElement | null>>({
    transients: null,
    multiband: null,
    quantization: null,
    composite: null,      // NEW
    conversion: null,     // NEW
    variants: null,
    comparison: null,
    phrases: null,
});
```

**4. Add CollapsibleSection entries (between quantization and variants):**
```tsx
<div ref={(el) => { sectionRefs.current.composite = el; }}>
    <CollapsibleSection
        title="Composite Stream"
        subtitle="Combined band streams with section analysis"
        icon={<Combine size={18} />}
        badge={rhythm.composite.beats.length}
        collapsed={openSection !== 'composite'}
        onCollapsedChange={() => handleSectionToggle('composite')}
    >
        <CompositeStreamPanel
            rhythm={rhythm}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            onSeek={onSeek}
        />
    </CollapsibleSection>
</div>

<div ref={(el) => { sectionRefs.current.conversion = el; }}>
    <CollapsibleSection
        title="Difficulty Conversion"
        subtitle="How composite becomes Easy/Medium/Hard"
        icon={<GitBranch size={18} />}
        collapsed={openSection !== 'conversion'}
        onCollapsedChange={() => handleSectionToggle('conversion')}
    >
        <DifficultyConversionPanel
            rhythm={rhythm}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            onSeek={onSeek}
        />
    </CollapsibleSection>
</div>
```

---

## Technical Implementation Details

### Patterns to Follow

#### From MultiBandVisualization.tsx:
- BandTimeline inline component structure
- Drag-to-scrub with `DRAG_THRESHOLD = 5`
- Quick scroll with RAF throttling
- Audio sync with `useAudioPlayerStore`
- Smooth animation with `requestAnimationFrame`
- ZoomControls integration

#### From DifficultyVariantsPanel.tsx:
- Side-by-side column layout
- `ConversionInfo` and `EnhancementInfo` subcomponents
- Natural difficulty badge
- `DIFFICULTY_COLORS` constant
- Stats display pattern

#### From QuantizationPanel.tsx:
- Stats card layout
- Per-band breakdown display
- Timeline section with zoom controls

### Shared Constants

```typescript
// Band colors (consistent across all components)
const BAND_COLORS: Record<Band, string> = {
    low: '#3b82f6',    // Blue
    mid: '#22c55e',    // Green
    high: '#f97316',   // Orange
};

// Difficulty colors (from DifficultyVariantsPanel)
const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
    easy: '#22c55e',    // Green
    medium: '#f59e0b',  // Amber
    hard: '#ef4444',    // Red
};

// Edit type styles
const EDIT_TYPE_STYLES = {
    none: { opacity: 1, borderStyle: 'solid' },
    simplified: { opacity: 0.3, borderStyle: 'dashed' },  // Ghost beats
    interpolated: { opacity: 1, borderStyle: 'solid', highlight: true },
    pattern_inserted: { opacity: 1, borderStyle: 'solid', highlight: true },
};
```

### Ghost Beat Detection Algorithm

```typescript
// For DifficultyConversionPanel - detect beats removed from composite
function detectGhostBeats(compositeBeats: CompositeBeat[], variantBeats: VariantBeat[]): CompositeBeat[] {
    const variantTimestamps = new Set(
        variantBeats.map(b => b.timestamp.toFixed(4)) // Use precision for comparison
    );
    return compositeBeats.filter(b => !variantTimestamps.has(b.timestamp.toFixed(4)));
}

// Detect beats added to variant (not in composite)
function detectAddedBeats(compositeBeats: CompositeBeat[], variantBeats: VariantBeat[]): VariantBeat[] {
    const compositeTimestamps = new Set(
        compositeBeats.map(b => b.timestamp.toFixed(4))
    );
    return variantBeats.filter(b => !compositeTimestamps.has(b.timestamp.toFixed(4)));
}
```

---

## Tasks

### Phase 1: CompositeStreamPanel
- [x] **Task 1.1**: Create `CompositeStreamPanel.tsx` with basic structure and props interface
- [x] **Task 1.2**: Implement `BandStreamTimeline` inline subcomponent (reuse MultiBandVisualization patterns) ✅ **COMPLETED**
- [x] **Task 1.3**: Implement `CompositeTimeline` inline subcomponent with section boundaries
- [x] **Task 1.4**: Add stats display (beats per band, sections per band) ✅ **COMPLETED**
- [x] **Task 1.5**: Create `CompositeStreamPanel.css` with styles ✅ **COMPLETED** (839 lines of comprehensive CSS covering all component classes)
- [ ] **Task 1.6**: Add zoom controls and quick scroll navigation
- [ ] **Task 1.7**: Test audio sync and drag-to-scrub

### Phase 2: DifficultyConversionPanel
- [ ] **Task 2.1**: Create `DifficultyConversionPanel.tsx` with basic structure
- [ ] **Task 2.2**: Implement `CompositeBaselineTimeline` inline subcomponent
- [ ] **Task 2.3**: Implement `DifficultyConversionColumn` with diff visualization
- [ ] **Task 2.4**: Implement ghost beat detection and rendering
- [ ] **Task 2.5**: Implement added beat detection and rendering
- [ ] **Task 2.6**: Add conversion/enhancement metadata display
- [ ] **Task 2.7**: Create `DifficultyConversionPanel.css` with styles
- [ ] **Task 2.8**: Test diff visualization across all edit types

### Phase 3: Integration
- [ ] **Task 3.1**: Add imports to `RhythmGenerationTab.tsx`
- [ ] **Task 3.2**: Update `SectionId` type and `sectionRefs`
- [ ] **Task 3.3**: Add CollapsibleSection entries for both new components
- [ ] **Task 3.4**: Test accordion behavior (only one section open at a time)
- [ ] **Task 3.5**: Verify audio sync across all timelines
- [ ] **Task 3.6**: Test responsive layouts

---

## Verification

1. **Visual Check**: Expand each new section, verify timelines render correctly
2. **Audio Sync**: Play audio, verify playhead moves across all timelines
3. **Drag-to-Scrub**: Drag on timelines, verify seeking works
4. **Quick Scroll**: Click/drag on quick scroll bar, verify navigation
5. **Zoom**: Test zoom in/out, verify timeline detail changes
6. **Accordion**: Verify only one section open at a time
7. **Ghost Beats**: In DifficultyConversionPanel, verify removed beats show as faded/dashed
8. **Added Beats**: Verify pattern-inserted beats are highlighted
9. **Section Boundaries**: In CompositeStreamPanel, verify section lines appear
10. **Stats Accuracy**: Verify all counts and percentages are correct

---

## Key Code Locations

| File | Purpose |
|------|---------|
| `src/components/ui/BeatDetectionTab/RhythmGenerationTab/MultiBandVisualization.tsx` | Pattern for band timelines, drag-to-scrub, quick scroll |
| `src/components/ui/BeatDetectionTab/RhythmGenerationTab/DifficultyVariantsPanel.tsx` | Pattern for difficulty columns, stats display, metadata |
| `src/components/ui/BeatDetectionTab/RhythmGenerationTab/QuantizationPanel.tsx` | Pattern for stats cards, per-band breakdown |
| `src/components/Tabs/BeatDetectionTab/RhythmGenerationTab.tsx` | Integration point for new CollapsibleSection entries |
| `src/types/rhythmGeneration.ts` | Type definitions |
