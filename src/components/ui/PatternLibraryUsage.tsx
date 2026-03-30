/**
 * PatternLibraryUsage Component
 *
 * Displays all patterns from the button pattern library, highlighting which
 * ones were actually used during level generation. Used patterns appear
 * first sorted by usage count, then the full library is expandable.
 *
 * Task 6.7: Create PatternLibraryUsage Component
 */

import { useMemo, useState } from 'react';
import { Library } from 'lucide-react';
import './PatternLibraryUsage.css';
import { cn } from '../../utils/cn';
import type { ControllerMode, DDRButton, GuitarHeroButton } from 'playlist-data-engine';
import {
    DDR_PATTERN_LIBRARY,
    GUITAR_HERO_PATTERN_LIBRARY,
    getPatternById,
} from 'playlist-data-engine';

// ============================================================
// Types
// ============================================================

export interface PatternLibraryUsageProps {
    /** Additional CSS class names */
    className?: string;
    /** Array of pattern IDs used during button mapping */
    patternsUsed: string[];
    /** Controller mode - determines which pattern library to use */
    controllerMode: ControllerMode;
    /** Whether to show the section header */
    showHeader?: boolean;
    /** Maximum number of used patterns to show before "show more" */
    maxVisible?: number;
    /** Per-beat pattern ID counts derived from chart beats (overrides patternsUsed counting) */
    patternApplicationCounts?: Map<string, number>;
    /** Total beat count per pattern (all beats with that patternId, not just group starts) */
    patternBeatCounts?: Map<string, number>;
}

interface PatternInfo {
    id: string;
    name: string;
    keys: (DDRButton | GuitarHeroButton)[];
    category: string;
    difficulty: number;
    tags: string[];
    usageCount: number;
    beatCount: number;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Count occurrences of each pattern ID
 */
function countPatternUsage(patternIds: string[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const id of patternIds) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
}

/**
 * Get pattern details from the library
 */
function getPatternDetails(
    patternId: string,
    controllerMode: ControllerMode
): PatternInfo | null {
    if (controllerMode === 'ddr') {
        const pattern = getPatternById(DDR_PATTERN_LIBRARY, patternId);
        if (!pattern) return null;
        return {
            id: pattern.id,
            name: pattern.name,
            keys: pattern.keys,
            category: pattern.category,
            difficulty: pattern.difficulty,
            tags: pattern.tags,
            usageCount: 0,
            beatCount: 0,
        };
    } else {
        const pattern = getPatternById(GUITAR_HERO_PATTERN_LIBRARY, patternId);
        if (!pattern) return null;
        return {
            id: pattern.id,
            name: pattern.name,
            keys: pattern.keys,
            category: pattern.category,
            difficulty: pattern.difficulty,
            tags: pattern.tags,
            usageCount: 0,
            beatCount: 0,
        };
    }
}

/**
 * Get all unique used patterns with their usage counts, sorted by count descending
 */
function getUsedPatterns(
    patternIds: string[],
    controllerMode: ControllerMode,
    applicationCounts?: Map<string, number>,
    beatCounts?: Map<string, number>
): PatternInfo[] {
    const counts = applicationCounts ?? countPatternUsage(patternIds);
    const patterns: PatternInfo[] = [];

    for (const [id, count] of counts) {
        const details = getPatternDetails(id, controllerMode);
        if (details) {
            details.usageCount = count;
            details.beatCount = beatCounts?.get(id) ?? count;
            patterns.push(details);
        } else {
            patterns.push({
                id,
                name: `Unknown Pattern`,
                keys: [],
                category: 'unknown',
                difficulty: 0,
                tags: [],
                usageCount: count,
                beatCount: beatCounts?.get(id) ?? count,
            });
        }
    }

    return patterns.sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * Get all patterns from the library, including usage counts for used ones
 */
function getAllPatterns(
    usedPatternIds: string[],
    controllerMode: ControllerMode,
    applicationCounts?: Map<string, number>,
    beatCounts?: Map<string, number>
): PatternInfo[] {
    const usageCounts = applicationCounts ?? countPatternUsage(usedPatternIds);
    const library = controllerMode === 'ddr' ? DDR_PATTERN_LIBRARY : GUITAR_HERO_PATTERN_LIBRARY;

    return library.patterns.map(pattern => ({
        id: pattern.id,
        name: pattern.name,
        keys: pattern.keys,
        category: pattern.category,
        difficulty: pattern.difficulty,
        tags: pattern.tags,
        usageCount: usageCounts.get(pattern.id) ?? 0,
        beatCount: beatCounts?.get(pattern.id) ?? 0,
    }));
}

// ============================================================
// Sub-components
// ============================================================

interface DDRButtonIconProps {
    button: DDRButton;
    size?: 'sm' | 'md';
}

function DDRButtonIcon({ button, size = 'sm' }: DDRButtonIconProps) {
    const icons: Record<DDRButton, string> = {
        up: '↑',
        down: '↓',
        left: '←',
        right: '→',
    };

    const colorClass = `ddr-btn-${button}`;

    return (
        <span className={cn('pattern-btn', 'pattern-btn-ddr', colorClass, `pattern-btn-${size}`)}>
            {icons[button]}
        </span>
    );
}

interface GuitarHeroButtonIconProps {
    button: GuitarHeroButton;
    size?: 'sm' | 'md';
}

function GuitarHeroButtonIcon({ button, size = 'sm' }: GuitarHeroButtonIconProps) {
    const colorClass = `gh-btn-${button}`;

    return (
        <span className={cn('pattern-btn', 'pattern-btn-gh', colorClass, `pattern-btn-${size}`)}>
            {button}
        </span>
    );
}

interface PatternKeySequenceProps {
    keys: (DDRButton | GuitarHeroButton)[];
    controllerMode: ControllerMode;
}

function PatternKeySequence({ keys, controllerMode }: PatternKeySequenceProps) {
    if (keys.length === 0) {
        return <span className="pattern-keys-empty">No keys</span>;
    }

    return (
        <div className="pattern-keys-sequence">
            {keys.map((key, index) => (
                <span key={index} className="pattern-key-wrapper">
                    {controllerMode === 'ddr' ? (
                        <DDRButtonIcon button={key as DDRButton} size="sm" />
                    ) : (
                        <GuitarHeroButtonIcon button={key as GuitarHeroButton} size="sm" />
                    )}
                </span>
            ))}
        </div>
    );
}

interface PatternCardProps {
    pattern: PatternInfo;
    controllerMode: ControllerMode;
}

function PatternCard({ pattern, controllerMode }: PatternCardProps) {
    return (
        <div className={cn('pattern-card', pattern.usageCount === 0 && 'pattern-card--unused')}>
            <div className="pattern-card-header">
                <span className="pattern-name">{pattern.name}</span>
                {pattern.usageCount > 0 && (
                    <span className="pattern-usage-badge">
                        {pattern.usageCount}{pattern.beatCount !== pattern.usageCount && `× (${pattern.beatCount} beats)`}
                    </span>
                )}
            </div>
            <PatternKeySequence keys={pattern.keys} controllerMode={controllerMode} />
            <div className="pattern-card-footer">
                <span className="pattern-category">{pattern.category}</span>
                <span className="pattern-difficulty">Diff: {pattern.difficulty}/10</span>
            </div>
            {pattern.tags.length > 0 && (
                <div className="pattern-tags">
                    {pattern.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="pattern-tag">{tag}</span>
                    ))}
                    {pattern.tags.length > 3 && (
                        <span className="pattern-tag-more">+{pattern.tags.length - 3}</span>
                    )}
                </div>
            )}
        </div>
    );
}

interface SummaryBarProps {
    totalUsedPatterns: number;
    totalApplications: number;
    libraryTotal: number;
}

function SummaryBar({ totalUsedPatterns, totalApplications, libraryTotal }: SummaryBarProps) {
    const usagePercent = libraryTotal > 0 ? Math.round((totalUsedPatterns / libraryTotal) * 100) : 0;

    return (
        <div className="pattern-summary">
            <div className="pattern-summary-item">
                <span className="pattern-summary-value">{totalUsedPatterns}</span>
                <span className="pattern-summary-label">of {libraryTotal} library patterns used</span>
            </div>
            <div className="pattern-summary-item">
                <span className="pattern-summary-value">{totalApplications}</span>
                <span className="pattern-summary-label">total pattern applications</span>
            </div>
            <div className="pattern-summary-item">
                <span className="pattern-summary-value">{usagePercent}%</span>
                <span className="pattern-summary-label">library coverage</span>
            </div>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

export function PatternLibraryUsage({
    className,
    patternsUsed,
    controllerMode,
    showHeader = true,
    maxVisible = 6,
    patternApplicationCounts,
    patternBeatCounts,
}: PatternLibraryUsageProps) {
    // Used patterns sorted by usage count
    const usedPatterns = useMemo(
        () => getUsedPatterns(patternsUsed, controllerMode, patternApplicationCounts, patternBeatCounts),
        [patternsUsed, controllerMode, patternApplicationCounts, patternBeatCounts]
    );

    // All patterns from the full library (for total count)
    const allPatterns = useMemo(
        () => getAllPatterns(patternsUsed, controllerMode, patternApplicationCounts, patternBeatCounts),
        [patternsUsed, controllerMode, patternApplicationCounts, patternBeatCounts]
    );

    // Total applications
    const totalApplications = patternApplicationCounts
        ? Array.from(patternApplicationCounts.values()).reduce((sum, n) => sum + n, 0)
        : patternsUsed.length;

    // Determine visible used patterns
    const visibleUsedPatterns = usedPatterns.slice(0, maxVisible);
    const hasMoreUsed = usedPatterns.length > maxVisible;

    // Show-more state for used patterns
    const [showAllUsed, setShowAllUsed] = useState(false);

    // Empty state - no patterns at all
    if (patternsUsed.length === 0 && allPatterns.length === 0) {
        return null;
    }

    return (
        <div className={cn('pattern-library-usage', className)}>
            {showHeader && (
                <div
                    className="pattern-header"
                    onClick={() => setShowAllUsed(!showAllUsed)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setShowAllUsed(!showAllUsed);
                        }
                    }}
                >
                    <Library size={18} className="pattern-header-icon" />
                    <h4 className="pattern-header-title">Pattern Library Usage</h4>
                    <span className="pattern-header-toggle">
                        {showAllUsed ? '▼' : '▶'}
                    </span>
                </div>
            )}

            {!showAllUsed && (
                <>
                    <SummaryBar
                        totalUsedPatterns={usedPatterns.length}
                        totalApplications={totalApplications}
                        libraryTotal={allPatterns.length}
                    />

                    <div className="pattern-grid">
                        {visibleUsedPatterns.map((pattern) => (
                            <PatternCard
                                key={pattern.id}
                                pattern={pattern}
                                controllerMode={controllerMode}
                            />
                        ))}
                    </div>

                    {hasMoreUsed && (
                        <button
                            className="pattern-show-more-btn"
                            onClick={() => setShowAllUsed(true)}
                        >
                            +{usedPatterns.length - maxVisible} more used patterns
                        </button>
                    )}
                </>
            )}

            {showAllUsed && (
                <>
                    <SummaryBar
                        totalUsedPatterns={usedPatterns.length}
                        totalApplications={totalApplications}
                        libraryTotal={allPatterns.length}
                    />

                    {/* Used Patterns Section */}
                    {usedPatterns.length > 0 && (
                        <div className="pattern-section">
                            <div className="pattern-section-header">
                                <span className="pattern-section-label">Used Patterns</span>
                                <span className="pattern-section-count">{usedPatterns.length}</span>
                            </div>
                            <div className="pattern-grid">
                                {usedPatterns.map((pattern) => (
                                    <PatternCard
                                        key={pattern.id}
                                        pattern={pattern}
                                        controllerMode={controllerMode}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default PatternLibraryUsage;
