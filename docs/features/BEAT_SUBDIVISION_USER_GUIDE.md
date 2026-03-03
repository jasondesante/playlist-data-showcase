# Beat Subdivision User Guide

This guide explains how to use the beat subdivision features in the Playlist Data Showcase application.

## Overview

Beat subdivision allows you to transform a standard quarter-note beat grid into various rhythmic patterns. The application provides two distinct modes:

| Mode | Location | Purpose |
|------|----------|---------|
| **Per-Beat Subdivision** | Audio Analysis Tab | Create beat maps with custom subdivision patterns for each individual beat - perfect for level creation and export |
| **Real-Time Playground** | Practice View | Switch subdivision types on-the-fly during practice mode |

---

## Per-Beat Subdivision (Audio Analysis Tab)

Use per-beat subdivision when creating rhythm game levels or beat maps for export. Each beat can have its own subdivision type, enabling complex rhythmic phrases.

### Accessing Subdivision Settings

1. Navigate to the **Audio Analysis** tab
2. Load an audio file and generate a beat map
3. Once the beat map is generated, the **Subdivision Settings** section appears below the beat detection settings

### The Piano-Roll Grid

The subdivision system uses a **piano-roll style grid** where each beat is represented as a cell. This approach lets you assign different subdivision types to individual beats, creating varied rhythmic patterns throughout your track.

#### Grid Features

- **Beat Cells**: Each cell represents one beat from the original beat map
- **Measure Grouping**: Beats are grouped by measure, with measure numbers (M1, M2, etc.) displayed above each group
- **Color Coding**: Each subdivision type has a unique color for easy visual identification
- **Zoom Controls**: Zoom from 0.5x to 8x for detailed editing or overview
- **Virtualized Rendering**: Handles 500+ beats smoothly

#### Selecting Beats

You can select beats in several ways:

| Action | Result |
|--------|--------|
| **Click** | Select a single beat (replaces current selection) |
| **Shift+Click** | Select a range from the last selected beat to the clicked beat |
| **Ctrl/Cmd+Click** | Toggle the clicked beat in/out of the selection |
| **Drag** | Click and drag across beats to select a range |
| **Double-Click** | Cycle through subdivision types on that beat |

#### Grid Controls

At the top of the grid, you'll find:

- **Beat Count**: Total number of beats in the track
- **Measure Count**: Number of measures
- **Selection Count**: How many beats are currently selected
- **Zoom Buttons**: 0.5x, 1x, 2x, 4x, 8x zoom levels
- **Select All**: Select all beats in the track
- **Clear**: Clear the current selection

### The Subdivision Toolbar

The toolbar appears above the grid and provides quick access to subdivision types and actions.

#### Subdivision Types (Brush Selection)

The toolbar displays all available subdivision types as buttons. Click a type to select it as your "brush" - this is the subdivision that will be applied when you click Apply.

| Button | Shortcut | Subdivision | Description |
|--------|----------|-------------|-------------|
| Quarter | 1 | Standard quarter notes | Default subdivision |
| Half | 2 | Half notes | Beats on 1 and 3 only |
| Eighth | 3 | Eighth notes | Double density |
| 16th | 4 | Sixteenth notes | Maximum density |
| Triplet 8 | 5 | Eighth triplets | 3 per quarter |
| Triplet 4 | 6 | Quarter triplets | 3 per half |
| Dotted 4 | 7 | Dotted quarter | Every 1.5 quarters |
| Swing | 8 | Dotted eighth | Long-short pattern |
| Rest | 9 | Rest | No beats |

Each button shows:
- A visual density indicator (dots representing beat frequency)
- The subdivision label
- The keyboard shortcut number

#### Selection Actions

| Button | Shortcut | Action |
|--------|----------|--------|
| **Apply** | Enter | Apply the selected subdivision to all selected beats |
| **Clear** | Escape | Clear the current selection |
| **All** | Ctrl+A | Select all beats |
| **Reset** | - | Reset all beats to the default subdivision |

### Workflow Example: Creating a Rhythmic Pattern

1. **Generate a beat map** from your audio file
2. **Select a range of beats** by clicking and dragging across the grid
3. **Choose a subdivision type** from the toolbar (e.g., Eighth for double density)
4. **Click Apply** (or press Enter) to apply the subdivision to selected beats
5. **Repeat** for different sections of your track
6. **Double-click** individual beats to quickly cycle through types
7. **Click "Generate Subdivided Beat Map"** when done to create the final beat map

### Summary Statistics

The Subdivision Settings panel shows helpful statistics:

- **Total Beats**: Number of beats in the original beat map
- **Default**: The default subdivision type for beats without custom settings
- **Custom**: Number of beats with custom subdivision assignments
- **Unique**: Number of different subdivision types used
- **Distribution**: A breakdown showing how many beats use each subdivision type

### Generating the Subdivided Beat Map

1. Configure your beat subdivisions as desired
2. Click **Generate Subdivided Beat Map**
3. The application calculates all subdivided beats
4. A summary shows the original beat count, subdivided beat count, and average density

### Exporting with Subdivision

When you export a beat map, the subdivision configuration and subdivided beat map are included in the export JSON:

1. Click the export button in the Audio Analysis tab
2. The exported JSON includes:
   - Original beat map
   - Subdivision configuration (per-beat assignments)
   - Subdivided beat map (if generated)
   - Subdivision metadata

---

## Real-Time Subdivision Playground (Practice View)

The Real-Time Playground lets you switch subdivision types instantly during practice mode. This is perfect for experimenting with different rhythms while playing along.

### Accessing Subdivision Controls

1. Navigate to the **Audio Analysis** tab
2. Load audio and generate a beat map
3. Switch to **Practice** view (appears after beat map generation)
4. Start playback to activate subdivision controls

### Using Subdivision Buttons

The subdivision buttons appear below the practice controls when a beat map is loaded:

| Button | Shortcut | Subdivision |
|--------|----------|-------------|
| Quarter | 1 | Standard quarter notes |
| Half | 2 | Half notes (beats on 1 and 3) |
| Eighth | 3 | Eighth notes (double density) |
| 16th | 4 | Sixteenth notes (maximum density) |
| Triplet | 5 | Eighth triplets |
| Swing | 6 | Dotted eighth (swing pattern) |

### How Real-Time Switching Works

1. **Immediate Transitions**: Subdivision changes take effect instantly
2. **Beat Continuity**: The beat grid maintains continuity across switches
3. **Visual Feedback**: The current subdivision is highlighted
4. **Stats Display**: Current subdivision appears in the practice stats area

### Tips for Real-Time Practice

- Start with **Quarter** to get familiar with the basic beat
- Switch to **Eighth** during choruses for more challenge
- Use **Half** during breakdowns or slow sections
- Try **Triplet** or **Swing** for songs with swing feel
- Press number keys 1-6 for quick switching

---

## Subdivision Type Details

### Quarter (1x)
Standard beat grid. Each detected beat corresponds to one quarter note. This is the default and matches the original beat detection.

### Half (0.5x)
Only beats on 1 and 3 of each measure. Creates a sparse, spacious feel. Good for:
- Emphasizing strong beats
- Slow, deliberate practice
- Identifying the fundamental pulse

### Eighth (2x)
Twice the beat density. Creates an eighth note pattern between each quarter. Good for:
- More challenging gameplay
- Faster passages
- Building rhythmic precision

### Sixteenth (4x)
Maximum supported density. Four beats per quarter note. Good for:
- Expert-level practice
- Very fast, technical passages
- Maximum challenge

### Triplet 8th (3/Q)
Three evenly-spaced beats per quarter note. Creates a triplet feel. Good for:
- Jazz and swing music
- Compound time feel
- Rhythmic variety

### Triplet 4th (3/H)
Three beats per half note. A moderate triplet feel. Good for:
- Slower triplet passages
- Waltz-like feel in 4/4 time

### Dotted Quarter (1.5x)
Beats every 1.5 quarter notes. Creates a syncopated pattern that shifts against the bar line. Good for:
- Syncopated rhythms
- Polyrhythmic practice
- Creating tension

### Dotted 8th / Swing
Long-short pattern (2/3 + 1/3 of a quarter). The classic swing feel. Good for:
- Jazz and blues
- Hip-hop grooves
- Any swing-based music

### Rest
No beats generated for this beat position. Good for:
- Creating silence/gaps
- Musical phrasing
- Intro/outro sections

---

## Troubleshooting

### "Generate a beat map first" message
- You need to generate a beat map before using subdivision
- Load audio and click "Generate Beat Map" in the Audio Analysis tab

### Subdivision buttons are disabled
- Start audio playback to activate real-time subdivision
- The practice view requires an active beat map

### Generated beat map has too many beats
- Sixteenth notes create 4x the original beats
- Consider using eighth notes (2x) for moderate density
- Use per-beat subdivision to vary density throughout the track

### Subdivision doesn't match the music
- Check if the track has swing feel (try Swing or Triplet)
- Multi-tempo tracks are handled automatically
- Consider manual downbeat configuration for complex tracks

### Grid is slow or laggy
- Try zooming out to reduce the number of visible beats
- The grid is virtualized but very long tracks may still be demanding
- Close other browser tabs to free up memory

---

## Technical Notes

### Color Coding
Each subdivision type has a unique color for visual identification:

| Type | Color |
|------|-------|
| Quarter | Blue |
| Half | Green |
| Eighth | Orange |
| Sixteenth | Red |
| Triplet 8th | Purple |
| Triplet 4th | Pink |
| Dotted Q | Teal |
| Dotted 8th | Gold |
| Rest | Gray |

### Data Persistence
- Subdivision configuration is saved to localStorage
- Real-time subdivision preference is remembered
- Cached beat maps include subdivision data

### Performance
- Pre-calculated subdivision generates beats upfront
- Real-time subdivision generates beats on-the-fly
- The piano-roll grid uses virtualization for smooth scrolling with 500+ beats
- Both modes are optimized for smooth playback

### Keyboard Shortcuts Summary

| Shortcut | Action |
|----------|--------|
| 1-9 | Select subdivision type (brush) |
| Enter | Apply brush to selection |
| Escape | Clear selection |
| Ctrl+A | Select all beats |
