/**
 * Timeline Color Utilities
 *
 * Shared color constants for timeline components.
 * Ensures consistent color schemes across all timeline visualizations.
 *
 * Part of Task 9.2: Create shared timeline utilities
 */

/**
 * Band colors for frequency-based visualizations.
 * Used by TransientTimeline, QuantizedBeatTimeline, VariantTimeline, etc.
 */
export const BAND_COLORS = {
  /** Low frequency band - Blue */
  low: '#3b82f6',
  /** Mid frequency band - Green */
  mid: '#22c55e',
  /** High frequency band - Orange */
  high: '#f97316',
} as const;

export type Band = keyof typeof BAND_COLORS;

/**
 * Get the color for a frequency band.
 */
export function getBandColor(band: Band): string {
  return BAND_COLORS[band];
}

/**
 * Grid type colors for quantization visualization.
 * Used by GridDecisionTimeline.
 */
export const GRID_TYPE_COLORS = {
  /** Straight 16th notes - Blue */
  straight_16th: '#3b82f6',
  /** Triplet 8th notes - Purple */
  triplet_8th: '#a855f7',
} as const;

export type GridType = keyof typeof GRID_TYPE_COLORS;

/**
 * Get the color for a grid type.
 */
export function getGridTypeColor(gridType: GridType): string {
  return GRID_TYPE_COLORS[gridType];
}

/**
 * Edit type colors for difficulty variant visualization.
 * Used by VariantTimeline.
 */
export const EDIT_TYPE_COLORS = {
  /** Simplified from original - lighter/muted */
  simplified: '#94a3b8',
  /** Interpolated between existing beats */
  interpolated: '#60a5fa',
  /** Pattern inserted (new) */
  pattern_inserted: '#f59e0b',
  /** Original (no edit) */
  original: '#22c55e',
} as const;

export type EditType = keyof typeof EDIT_TYPE_COLORS;

/**
 * Get the color for an edit type.
 */
export function getEditTypeColor(editType: EditType): string {
  return EDIT_TYPE_COLORS[editType];
}

/**
 * Difficulty level colors.
 * Used by DifficultyVariantsPanel.
 */
export const DIFFICULTY_COLORS = {
  /** Easy difficulty - Green */
  easy: '#22c55e',
  /** Medium difficulty - Yellow/Amber */
  medium: '#eab308',
  /** Hard difficulty - Red */
  hard: '#ef4444',
} as const;

export type Difficulty = keyof typeof DIFFICULTY_COLORS;

/**
 * Get the color for a difficulty level.
 */
export function getDifficultyColor(difficulty: Difficulty): string {
  return DIFFICULTY_COLORS[difficulty];
}

/**
 * Phrase highlight colors for phrase detection visualization.
 * Used when highlighting phrase occurrences on timelines.
 */
export const PHRASE_HIGHLIGHT_COLORS = [
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f97316', // Orange
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f59e0b', // Amber
  '#6366f1', // Indigo
] as const;

/**
 * Get a phrase highlight color by index (cycles through available colors).
 */
export function getPhraseHighlightColor(index: number): string {
  return PHRASE_HIGHLIGHT_COLORS[index % PHRASE_HIGHLIGHT_COLORS.length];
}

/**
 * Detection method colors for transient visualization.
 */
export const DETECTION_METHOD_COLORS = {
  /** Energy-based detection - Blue */
  energy: '#3b82f6',
  /** Spectral flux detection - Green */
  spectral_flux: '#22c55e',
  /** High frequency content detection - Orange */
  hfc: '#f97316',
} as const;

export type DetectionMethod = keyof typeof DETECTION_METHOD_COLORS;

/**
 * Get the color for a detection method.
 */
export function getDetectionMethodColor(method: DetectionMethod): string {
  return DETECTION_METHOD_COLORS[method];
}

/**
 * Timeline background colors.
 */
export const TIMELINE_BACKGROUND_COLORS = {
  /** Default background */
  background: 'rgba(0, 0, 0, 0.2)',
  /** Past region (left of now line) */
  pastRegion: 'rgba(0, 0, 0, 0.3)',
  /** Future region (right of now line) */
  futureRegion: 'rgba(0, 0, 0, 0.1)',
  /** Now line color */
  nowLine: '#ef4444',
  /** Grid line color */
  gridLine: 'rgba(255, 255, 255, 0.1)',
  /** Measure boundary color */
  measureBoundary: 'rgba(255, 255, 255, 0.3)',
} as const;

/**
 * CSS variable names for timeline colors (for use with Tailwind or custom CSS).
 */
export const TIMELINE_CSS_VARS = {
  bandLow: 'var(--band-low, #3b82f6)',
  bandMid: 'var(--band-mid, #22c55e)',
  bandHigh: 'var(--band-high, #f97316)',
  nowLine: 'var(--now-line, #ef4444)',
  gridLine: 'var(--grid-line, rgba(255, 255, 255, 0.1))',
} as const;
