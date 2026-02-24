/**
 * Shared JSDoc type definitions for the achievement notification system.
 * These typedefs are used across achievement-related files for consistent documentation.
 */

/**
 * @typedef {Object} Achievement
 * @property {number|string} id - Unique identifier for the achievement
 * @property {string} name - Achievement name displayed in notifications
 * @property {string} description - Detailed description of the achievement
 * @property {number} [points] - Points awarded for unlocking the achievement
 * @property {string} [unlockedText] - Custom unlock message (default: "Achievement Unlocked!")
 * @property {'default'|'gold'|'emerald'|'ruby'} [theme='default'] - Theme variant key for color scheme
 * @property {string} [iconInitial] - URL for initial icon (shown during stages 0-3)
 * @property {string} [iconExpanded] - URL for expanded icon (shown during stage 4)
 * @property {string} [iconThird] - URL for third stage icon (shown during stages 5-7)
 * @property {string} [iconFourth] - URL for fourth stage icon (shown during stage 8)
 * @property {string} [iconFifth] - URL for fifth stage icon (shown during stage 9)
 * @property {string} [iconSixth] - URL for sixth stage icon (shown during stages 10-14)
 * @property {number} [timeUnlocked] - Unix timestamp when the achievement was unlocked
 * @property {boolean} [confetti=false] - Whether to trigger special confetti effect when unlocked
 * @description Represents an achievement object used throughout the notification system.
 * Contains display properties, animation icons for each stage, and unlock metadata.
 */

/**
 * @typedef {Object} AchievementAnimationParams
 * @property {number} boxEnterDuration - Scale In duration for the main container (ms)
 * @property {number} iconAppearDuration - Initial icon appearance duration (ms)
 * @property {number} iconAnimDuration - Icon normalization/scale adjustment duration (ms)
 * @property {number} iconPauseDuration - Pause duration before box expansion (ms)
 * @property {number} barExpandDuration - Box expansion duration when showing text (ms)
 * @property {number} textAppearDuration - Text fade-in duration (ms)
 * @property {number} displayDuration - Duration to display first text panel (unlocked message) (ms)
 * @property {number} displayDuration2 - Duration to display second text panel (description) (ms)
 * @property {number} barShrinkDuration - Box shrink duration back to icon-only size (ms)
 * @property {number} displayDuration3 - Duration to display the collapsed box before exit (ms)
 * @property {number} preIconExitDuration - Pre-icon exit animation duration (ms)
 * @property {number} iconExitDuration - Icon scale-out duration (ms)
 * @property {number} boxExitDuration - Box scale-out duration (ms)
 * @property {number} exitDuration - Final fade-out duration (ms)
 * @property {number} textExitDuration - Text slide/fade exit duration (ms)
 * @description Animation timing parameters for the achievement notification lifecycle.
 * All values are in milliseconds. These control the 15-stage animation sequence (stages 0-14).
 */

/**
 * @typedef {Object} AchievementColorSet
 * @property {string} light - Light variant color (used for borders, highlights)
 * @property {string} main - Primary gradient or solid color
 * @property {string} dark - Dark variant for depth/contrast
 * @description A set of related colors for a specific color purpose (primary, secondary, etc.)
 */

/**
 * @typedef {Object} AchievementTextColors
 * @property {string} primary - Main text color (typically white)
 * @property {string} secondary - Secondary/muted text color
 * @property {string} highlight - Highlighted text color for emphasis (e.g., achievement name)
 * @description Text color definitions for achievement notifications
 */

/**
 * @typedef {Object} AchievementConfettiColors
 * @property {string[]} primary - Standard confetti color palette
 * @property {string[]} special - Special/rare achievement confetti palette
 * @description Confetti color palettes for celebration effects
 */

/**
 * @typedef {Object} AchievementAnimationColors
 * @property {string} enterLayer1 - Background gradient for first enter animation layer
 * @property {string} enterLayer2 - Color for second enter animation layer
 * @property {string} enterLayer3 - Background gradient for third enter animation layer
 * @property {string} iconBackground - Background gradient for the icon container
 * @description Colors used specifically for layered animation effects
 */

/**
 * @typedef {Object} AchievementColorScheme
 * @property {AchievementColorSet} primary - Primary theme colors
 * @property {AchievementColorSet} secondary - Secondary/accent colors
 * @property {AchievementTextColors} text - Text color definitions
 * @property {AchievementConfettiColors} confetti - Confetti celebration colors
 * @property {AchievementAnimationColors} animation - Animation layer colors
 * @description Complete color scheme for achievement notifications
 */

/**
 * @typedef {Object.<string, AchievementColorScheme>} AchievementThemes
 * @description Map of theme names to color schemes. Available themes: 'default', 'gold', 'emerald', 'ruby'
 */

export {};
