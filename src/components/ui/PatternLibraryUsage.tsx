/**
 * PatternLibraryUsage Component
 *
 * Displays patterns used from the button pattern library during level generation.
 * Shows pattern IDs, usage counts, and visual representations of button sequences.
 *
 * Task 6.7: Create PatternLibraryUsage Component
 */

import { useMemo, useState } from 'react';
import { Library, Music } from 'lucide-react';
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
    /** Maximum number of patterns to display before showing "show more" */
    maxVisible?: number;
    /** Whether the section starts collapsed */
    defaultCollapsed?: boolean;
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
 * Get all unique patterns with their usage counts
 */
function getUniquePatterns(
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
            // Pattern ID not found in library - show as unknown
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

    // Sort by usage count (descending)
    return patterns.sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * Get the library stats
 */
function getLibraryStats(controllerMode: ControllerMode): { total: number; used: number } {
    const library = controllerMode === 'ddr' ? DDR_PATTERN_LIBRARY : GUITAR_HERO_PATTERN_LIBRARY;
    return {
        total: library.patterns.length,
        used: 0, // Will be calculated by component
    };
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
        <div className="pattern-card">
            <div className="pattern-card-header">
                <span className="pattern-name">{pattern.name}</span>
                <span className="pattern-usage-badge">{pattern.usageCount}×</span>
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
    totalPatterns: number;
    usedPatterns: number;
    libraryTotal: number;
}

function SummaryBar({ totalPatterns, usedPatterns, libraryTotal }: SummaryBarProps) {
    const usagePercent = libraryTotal > 0 ? Math.round((usedPatterns / libraryTotal) * 100) : 0;

    return (
        <div className="pattern-summary">
            <div className="pattern-summary-item">
                <span className="pattern-summary-value">{usedPatterns}</span>
                <span className="pattern-summary-label">of {libraryTotal} library patterns used</span>
            </div>
            <div className="pattern-summary-item">
                <span className="pattern-summary-value">{totalPatterns}</span>
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
    defaultCollapsed = false,
}: PatternLibraryUsageProps) {
    // Get unique patterns with usage counts
    const uniquePatterns = useMemo(
        () => getUniquePatterns(patternsUsed, controllerMode),
        [patternsUsed, controllerMode]
    );

    // Get library stats
    const libraryStats = useMemo(() => getLibraryStats(controllerMode), [controllerMode]);

    // Calculate total pattern applications
    const totalApplications = useMemo(
        () => patternsUsed.length,
        [patternsUsed]
    );

    // Determine visible patterns
    const visiblePatterns = uniquePatterns.slice(0, maxVisible);
    const hasMore = uniquePatterns.length > maxVisible;

    // Collapsed state
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    if (patternsUsed.length === 0) {
        return null;
    }

    return (
        <div className={cn('pattern-library-usage', className)}>
            {showHeader && (
                <div
                    className="pattern-header"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            setIsCollapsed(!isCollapsed);
                        }
                    }}
                >
                    <Library size={18} className="pattern-header-icon" />
                    <h4 className="pattern-header-title">Pattern Library Usage</h4>
                    <span className="pattern-header-toggle">
                        {isCollapsed ? '▶' : '▼'}
                    </span>
                </div>
            )}

            {!isCollapsed && (
                <>
                    <SummaryBar
                        totalPatterns={totalApplications}
                        usedPatterns={uniquePatterns.length}
                        libraryTotal={libraryStats.total}
                    />

                    <div className="pattern-grid">
                        {visiblePatterns.map((pattern) => (
                            <PatternCard
                                key={pattern.id}
                                pattern={pattern}
                                controllerMode={controllerMode}
                            />
                        ))}
                    </div>

                    {hasMore && (
                        <div className="pattern-more">
                            <Music size={14} />
                            <span>+{uniquePatterns.length - maxVisible} more patterns</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default PatternLibraryUsage;
