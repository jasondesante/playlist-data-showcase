/**
 * Recharts Theme Configuration
 *
 * Provides a consistent chart theme matching the project's dark HSL palette.
 * Import and spread into recharts component props (e.g., `<BarChart {...chartTheme}>`).
 *
 * All colors are derived from the project's CSS custom properties defined in
 * src/styles/base.css. If you update the base theme, update this file too.
 */

// ── Color palette (derived from CSS custom properties) ──────────────────────

/** HSL tuple: [hue, saturation%, lightness%] */
type HSL = [number, number, number];

const hsl = (h: HSL, alpha = 1): string => {
  const [h_, s, l] = h;
  return alpha < 1
    ? `hsla(${h_}, ${s}%, ${l}%, ${alpha})`
    : `hsl(${h_}, ${s}%, ${l}%)`;
};

// Core theme tokens (mirrors :root CSS variables)
const tokens = {
  background: [222.2, 84, 4.9] as HSL,
  foreground: [210, 40, 98] as HSL,
  primary: [217.2, 91.2, 59.8] as HSL,
  primaryForeground: [222.2, 47.4, 11.2] as HSL,
  muted: [217.2, 32.6, 17.5] as HSL,
  mutedForeground: [215, 20.2, 75] as HSL,
  border: [217.2, 32.6, 17.5] as HSL,
  surface1: [222.2, 84, 6.5] as HSL,
  surface2: [222.2, 84, 8.5] as HSL,
  surface3: [222.2, 84, 11] as HSL,
  destructive: [0, 62.8, 30.6] as HSL,

  // Cute accent colors
  pink: [330, 81, 65] as HSL,
  purple: [268, 75, 60] as HSL,
  teal: [174, 65, 55] as HSL,
  yellow: [45, 93, 58] as HSL,
  orange: [24, 95, 60] as HSL,
  green: [142, 71, 45] as HSL,
  blue: [210, 80, 50] as HSL,
  gold: [45, 100, 40] as HSL,
};

// ── Semantic chart colors ───────────────────────────────────────────────────

/** Colors for data series — visually distinct on the dark background */
export const CHART_COLORS = {
  /** Player / positive side */
  player: hsl(tokens.primary),
  /** Enemy / opposing side */
  enemy: hsl(tokens.destructive),
  /** Accent line / highlight */
  accent: hsl(tokens.teal),
  /** Muted / background reference */
  muted: hsl(tokens.mutedForeground, 0.4),
  /** Series palette — use for multiple data series */
  series: [
    hsl(tokens.primary),
    hsl(tokens.teal),
    hsl(tokens.purple),
    hsl(tokens.yellow),
    hsl(tokens.green),
    hsl(tokens.orange),
    hsl(tokens.pink),
    hsl(tokens.blue),
  ],
  /** Survival / health positive */
  positive: hsl(tokens.green),
  /** Damage / death negative */
  negative: hsl(tokens.destructive),
  /** Critical highlight */
  critical: hsl(tokens.yellow),
  /** Neutral reference line */
  neutral: hsl(tokens.mutedForeground, 0.6),
} as const;

// ── Recharts theme defaults ─────────────────────────────────────────────────

/** Shared axis & grid tick styles */
const tickStyle = {
  fill: hsl(tokens.mutedForeground),
  fontSize: 11,
  fontFamily: 'ui-monospace, monospace',
};

/** Shared label styles */
const labelStyle = {
  fill: hsl(tokens.mutedForeground),
  fontSize: 12,
  fontFamily: 'inherit',
};

/**
 * Base chart theme — spread onto any recharts chart component.
 *
 * @example
 * ```tsx
 * <BarChart data={data} {...chartTheme}>
 *   <XAxis {...chartTheme.axisProps.x} />
 *   <YAxis {...chartTheme.axisProps.y} />
 *   <CartesianGrid {...chartTheme.gridProps} />
 *   <Tooltip {...chartTheme.tooltipProps} />
 * </BarChart>
 * ```
 */
export const chartTheme = {
  width: '100%',
  height: 300,
  margin: { top: 20, right: 20, bottom: 40, left: 50 },
  background: hsl(tokens.background),
} as const;

/** Pre-configured axis props — spread onto `<XAxis>` / `<YAxis>` */
export const axisProps = {
  x: {
    ...tickStyle,
    tickLine: false,
    axisLine: { stroke: hsl(tokens.border) },
    tick: tickStyle,
    label: labelStyle,
  },
  y: {
    ...tickStyle,
    tickLine: false,
    axisLine: { stroke: hsl(tokens.border) },
    tick: tickStyle,
    label: labelStyle,
  },
} as const;

/** Pre-configured CartesianGrid props */
export const gridProps = {
  strokeDasharray: '2 4',
  stroke: hsl(tokens.border),
  opacity: 0.5,
} as const;

/** Pre-configured Tooltip props — spread onto `<Tooltip>` */
export const tooltipProps = {
  contentStyle: {
    backgroundColor: hsl(tokens.surface3),
    border: `1px solid ${hsl(tokens.border)}`,
    borderRadius: 6,
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.4)',
    color: hsl(tokens.foreground),
    fontSize: 13,
  },
  itemStyle: {
    color: hsl(tokens.foreground),
  },
  labelStyle: {
    color: hsl(tokens.mutedForeground),
    fontWeight: 600,
    marginBottom: 4,
  },
  cursor: {
    stroke: hsl(tokens.primary),
    strokeDasharray: '4 4',
    opacity: 0.6,
  },
} as const;

/** Pre-configured Legend props — spread onto `<Legend>` */
export const legendProps = {
  wrapperStyle: {
    paddingTop: 12,
    borderTop: `1px solid ${hsl(tokens.border)}`,
  },
  formatter: (value: string) =>
    `<span style="color:${hsl(tokens.foreground)};font-size:12px">${value}</span>`,
} as const;

/** Pre-configured ReferenceLine props for difficulty thresholds */
export const difficultyReferenceLines = {
  easy: {
    stroke: hsl(tokens.green),
    strokeDasharray: '6 3',
    strokeWidth: 1,
    opacity: 0.7,
  },
  medium: {
    stroke: hsl(tokens.teal),
    strokeDasharray: '6 3',
    strokeWidth: 1,
    opacity: 0.7,
  },
  hard: {
    stroke: hsl(tokens.orange),
    strokeDasharray: '6 3',
    strokeWidth: 1,
    opacity: 0.7,
  },
  deadly: {
    stroke: hsl(tokens.destructive),
    strokeDasharray: '6 3',
    strokeWidth: 1,
    opacity: 0.7,
  },
} as const;

/**
 * Color accessor — returns the next color from the series palette for a given index.
 * Wraps around if index exceeds palette length.
 */
export const getSeriesColor = (index: number): string =>
  CHART_COLORS.series[index % CHART_COLORS.series.length];

/**
 * Get a color for a combatant side.
 */
export const getSideColor = (side: 'player' | 'enemy'): string =>
  side === 'player' ? CHART_COLORS.player : CHART_COLORS.enemy;

/**
 * Get a color based on win-rate tier for visual encoding.
 */
export const getWinRateChartColor = (winRate: number): string => {
  if (winRate >= 0.8) return hsl(tokens.green);
  if (winRate >= 0.5) return hsl(tokens.teal);
  if (winRate >= 0.3) return hsl(tokens.orange);
  return hsl(tokens.destructive);
};
