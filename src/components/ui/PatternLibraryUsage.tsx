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
import { Library, ChevronRight } from 'lucide-react';
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
}

interface PatternInfo {
    id: string;
    name: string;
    keys: (DDRButton | GuitarHeroButton)[];
    category: string;
    difficulty: number;
    tags: string[];
    usageCount: number;
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
        };
    }
}

/**
 * Get all unique used patterns with their usage counts, sorted by count descending
 */
function getUsedPatterns(
    patternIds: string[],
    controllerMode: ControllerMode
): PatternInfo[] {
    const counts = countPatternUsage(patternIds);
    const patterns: PatternInfo[] = [];

    for (const [id, count] of counts) {
        const details = getPatternDetails(id, controllerMode);
        if (details) {
            details.usageCount = count;
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
    controllerMode: ControllerMode
): PatternInfo[] {
    const usageCounts = countPatternUsage(usedPatternIds);
    const library = controllerMode === 'ddr' ? DDR_PATTERN_LIBRARY : GUITAR_HERO_PATTERN_LIBRARY;

    return library.patterns.map(pattern => ({
        id: pattern.id,
        name: pattern.name,
        keys: pattern.keys,
        category: pattern.category,
        difficulty: pattern.difficulty,
        tags: pattern.tags,
        usageCount: usageCounts.get(pattern.id) ?? 0,
    }));
}

/**
 * Get all unique categories from a pattern list
 */
function getCategories(patterns: PatternInfo[]): string[] {
    const cats = new Set<string>();
    for (const p of patterns) {
        cats.add(p.category);
    }
    return Array.from(cats).sort();
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
                    <span className="pattern-usage-badge">{pattern.usageCount}×</span>
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

interface CategorySectionProps {
    category: string;
    patterns: PatternInfo[];
    controllerMode: ControllerMode;
}

function CategorySection({ category, patterns, controllerMode }: CategorySectionProps) {
    return (
        <div className="pattern-category-section">
            <div className="pattern-category-header">
                <span className="pattern-category-name">{category}</span>
                <span className="pattern-category-count">{patterns.length} patterns</span>
            </div>
            <div className="pattern-grid">
                {patterns.map((pattern) => (
                    <PatternCard
                        key={pattern.id}
                        pattern={pattern}
                        controllerMode={controllerMode}
                    />
                ))}
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
}: PatternLibraryUsageProps) {
    // Used patterns sorted by usage count
    const usedPatterns = useMemo(
        () => getUsedPatterns(patternsUsed, controllerMode),
        [patternsUsed, controllerMode]
    );

    // All patterns from the full library
    const allPatterns = useMemo(
        () => getAllPatterns(patternsUsed, controllerMode),
        [patternsUsed, controllerMode]
    );

    // All categories for the filter
    const allCategories = useMemo(
        () => getCategories(allPatterns),
        [allPatterns]
    );

    // Total applications
    const totalApplications = patternsUsed.length;

    // Determine visible used patterns
    const visibleUsedPatterns = usedPatterns.slice(0, maxVisible);
    const hasMoreUsed = usedPatterns.length > maxVisible;

    // Show-more state for used patterns
    const [showAllUsed, setShowAllUsed] = useState(false);

    // Full library expansion state
    const [showFullLibrary, setShowFullLibrary] = useState(false);

    // Category filter state
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Filtered library patterns
    const filteredLibraryPatterns = useMemo(() => {
        const filtered = selectedCategory
            ? allPatterns.filter(p => p.category === selectedCategory)
            : allPatterns;
        return filtered.sort((a, b) => {
            // Used patterns first, then unused
            if (a.usageCount > 0 && b.usageCount === 0) return -1;
            if (a.usageCount === 0 && b.usageCount > 0) return 1;
            // Within same usage status, sort by difficulty
            if (a.usageCount > 0 && b.usageCount > 0) return b.usageCount - a.usageCount;
            return a.difficulty - b.difficulty;
        });
    }, [allPatterns, selectedCategory]);

    // Category counts for the filter
    const categoryCounts = useMemo(() => {
        const counts = new Map<string, number>();
        for (const p of allPatterns) {
            counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
        }
        return counts;
    }, [allPatterns]);

    // Reset category filter when closing full library
    const handleToggleFullLibrary = () => {
        if (showFullLibrary) {
            setShowFullLibrary(false);
            setSelectedCategory(null);
        } else {
            setShowFullLibrary(true);
        }
    };

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

                    {/* Full Library Toggle */}
                    <button
                        className={cn(
                            'pattern-library-toggle',
                            showFullLibrary && 'pattern-library-toggle--open'
                        )}
                        onClick={handleToggleFullLibrary}
                    >
                        <ChevronRight
                            size={14}
                            className={cn('pattern-library-chevron', showFullLibrary && 'pattern-library-chevron--open')}
                        />
                        <span className="pattern-library-toggle-text">
                            {showFullLibrary
                                ? 'Hide Full Library'
                                : `Browse All ${allPatterns.length} Patterns`
                            }
                        </span>
                    </button>

                    {/* Full Library (Expandable) */}
                    {showFullLibrary && (
                        <div className="pattern-full-library">
                            {/* Category Filter */}
                            <div className="pattern-category-filter">
                                <button
                                    className={cn(
                                        'pattern-filter-chip',
                                        selectedCategory === null && 'pattern-filter-chip--active'
                                    )}
                                    onClick={() => setSelectedCategory(null)}
                                >
                                    All ({allPatterns.length})
                                </button>
                                {allCategories.map((cat) => (
                                    <button
                                        key={cat}
                                        className={cn(
                                            'pattern-filter-chip',
                                            selectedCategory === cat && 'pattern-filter-chip--active'
                                        )}
                                        onClick={() => setSelectedCategory(cat)}
                                    >
                                        {cat} ({categoryCounts.get(cat) ?? 0})
                                    </button>
                                ))}
                            </div>

                            {/* Patterns grouped by category */}
                            {(selectedCategory
                                ? [{ category: selectedCategory, patterns: filteredLibraryPatterns }]
                                : getCategories(filteredLibraryPatterns).map(cat => ({
                                    category: cat,
                                    patterns: filteredLibraryPatterns.filter(p => p.category === cat),
                                }))
                            ).map(({ category: cat, patterns: catPatterns }) => (
                                <CategorySection
                                    key={cat}
                                    category={cat}
                                    patterns={catPatterns}
                                    controllerMode={controllerMode}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default PatternLibraryUsage;
