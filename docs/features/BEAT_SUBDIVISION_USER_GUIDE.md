# Beat Subdivision User Guide

This guide explains how to use the beat subdivision features in the Playlist Data Showcase application.

## Overview

Beat subdivision allows you to transform a standard quarter-note beat grid into various rhythmic patterns. The application provides two distinct modes:

| Mode | Location | Purpose |
|------|----------|---------|
| **Pre-calculated Subdivision** | Audio Analysis Tab | Create beat maps with custom subdivision patterns for level creation and export |
| **Real-Time Playground** | Practice View | Switch subdivision types on-the-fly during practice mode |

---

## Pre-Calculated Subdivision (Audio Analysis Tab)

Use pre-calculated subdivision when creating rhythm game levels or beat maps for export. The subdivision pattern is calculated once and saved with the beat map.

### Accessing Subdivision Settings

1. Navigate to the **Audio Analysis** tab
2. Load an audio file and generate a beat map
3. Once the beat map is generated, the **Beat Subdivision** section appears below the beat detection settings

### Configuring Segments

Subdivision uses **segments** to define different rhythmic patterns throughout the track. Each segment specifies:
- **Start Beat**: The beat index where this subdivision begins
- **Subdivision Type**: The rhythmic pattern to use

By default, there's a single segment covering the entire track with quarter notes.

#### Adding Segments

1. Click the **Add Segment** button
2. A new segment appears with a suggested start beat
3. Adjust the **Start Beat** value to position the segment
4. Select the desired **Subdivision** type

#### Removing Segments

- Click the trash icon next to any segment (except the first one)
- The first segment cannot be removed

#### Maximum Segments

- Up to 8 segments can be defined
- Segments are automatically sorted by start beat

### Using the Timeline Editor

The Timeline Editor provides a visual interface for segment configuration:

1. Click **Timeline Editor** to expand the visual timeline
2. The timeline shows:
   - Beat markers and measure divisions
   - Colored regions for each subdivision segment
   - Current position indicator
3. Use zoom controls to navigate long tracks
4. Click on the timeline to add segments at specific positions

### Subdivision Types

| Type | Label | Description | Best For |
|------|-------|-------------|----------|
| Quarter | 1x | Standard quarter notes (default) | Basic rhythm, beginners |
| Half | 0.5x | Beats on 1 and 3 only | Slow passages, emphasis beats |
| Eighth | 2x | Eighth notes (double density) | Faster passages, more challenge |
| Sixteenth | 4x | Maximum density | Expert levels, intense sections |
| Triplet 8th | 3/Q | Eighth triplets (3 per quarter) | Swing feel, jazz rhythms |
| Triplet 4th | 3/H | Quarter triplets (3 per half) | Moderate swing |
| Dotted Q | 1.5x | Every 1.5 quarters | Syncopated patterns |
| Dotted 8th | Swing | Swing long-short pattern | Jazz, blues feel |

### Generating the Subdivided Beat Map

1. Configure your segments as desired
2. Click **Generate Subdivided Beat Map**
3. The application calculates all subdivided beats
4. A summary shows the total beats and subdivisions used

### Exporting with Subdivision

When you export a beat map, the subdivision configuration and subdivided beat map are included in the export JSON:

1. Click the export button in the Audio Analysis tab
2. The exported JSON includes:
   - Original beat map
   - Subdivision configuration
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
- Use segments to vary density throughout the track

### Subdivision doesn't match the music
- Check if the track has swing feel (try Swing or Triplet)
- Multi-tempo tracks are handled automatically
- Consider manual downbeat configuration for complex tracks

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

### Data Persistence
- Subdivision configuration is saved to localStorage
- Real-time subdivision preference is remembered
- Cached beat maps include subdivision data

### Performance
- Pre-calculated subdivision generates beats upfront
- Real-time subdivision generates beats on-the-fly
- Both modes are optimized for smooth playback
