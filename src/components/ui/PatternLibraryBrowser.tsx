/**
 * PatternLibraryBrowser Component
 *
 * A standalone reference panel that displays the full pattern library
 * for the selected controller mode (DDR or Guitar Hero). Not dependent
 * on level generation results — always shows all available patterns.
 */

import { useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import './PatternLibraryBrowser.css';
import { cn } from '../../utils/cn';
import type { ControllerMode, DDRButton, GuitarHeroButton } from 'playlist-data-engine';
import {
    DDR_PATTERN_LIBRARY,
    GUITAR_HERO_PATTERN_LIBRARY,
    getPatternLibraryStats,
} from 'playlist-data-engine';

// ============================================================
// Types
// ============================================================

export interface PatternLibraryBrowserProps {
    /** Controller mode - determines which library to show */
    controllerMode: ControllerMode;
    className?: string;
}

interface PatternInfo {
    id: string;
    name: string;
    keys: (DDRButton | GuitarHeroButton)[];
    category: string;
    difficulty: number;
    tags: string[];
    measures: number;
}

// ============================================================
// Helpers
// ============================================================

function getAllPatterns(controllerMode: ControllerMode): PatternInfo[] {
    if (controllerMode === 'tap') return [];
    const library = controllerMode === 'ddr' ? DDR_PATTERN_LIBRARY : GUITAR_HERO_PATTERN_LIBRARY;
    return library.patterns.map(pattern => ({
        id: pattern.id,
        name: pattern.name,
        keys: pattern.keys,
        category: pattern.category,
        difficulty: pattern.difficulty,
        tags: pattern.tags,
        measures: pattern.measures,
    }));
}

function getCategories(patterns: PatternInfo[]): string[] {
    return Array.from(new Set(patterns.map(p => p.category))).sort();
}

// ============================================================
// Sub-components
// ============================================================

function DDRButtonIcon({ button }: { button: DDRButton }) {
    const icons: Record<DDRButton, string> = { up: '↑', down: '↓', left: '←', right: '→' };
    const colorClass = `plb-btn-ddr plb-btn-${button}`;
    return <span className={cn('plb-btn', colorClass, 'plb-btn-sm')}>{icons[button]}</span>;
}

function GuitarHeroButtonIcon({ button }: { button: GuitarHeroButton }) {
    return <span className={cn('plb-btn', 'plb-btn-gh', `plb-gh-${button}`, 'plb-btn-sm')}>{button}</span>;
}

function PatternKeySequence({ keys, controllerMode }: { keys: (DDRButton | GuitarHeroButton)[]; controllerMode: ControllerMode }) {
    if (keys.length === 0) return <span className="plb-keys-empty">No keys</span>;
    return (
        <div className="plb-keys-sequence">
            {keys.map((key, i) => (
                <span key={i} className="plb-key-wrapper">
                    {controllerMode === 'ddr'
                        ? <DDRButtonIcon button={key as DDRButton} />
                        : <GuitarHeroButtonIcon button={key as GuitarHeroButton} />}
                </span>
            ))}
        </div>
    );
}

function PatternCard({ pattern, controllerMode }: { pattern: PatternInfo; controllerMode: ControllerMode }) {
    return (
        <div className="plb-card">
            <div className="plb-card-header">
                <span className="plb-card-name">{pattern.name}</span>
                <span className="plb-card-difficulty">d{pattern.difficulty}</span>
            </div>
            <PatternKeySequence keys={pattern.keys} controllerMode={controllerMode} />
            <div className="plb-card-footer">
                <span className="plb-card-category">{pattern.category}</span>
                <span className="plb-card-measures">{pattern.measures} meas</span>
            </div>
            {pattern.tags.length > 0 && (
                <div className="plb-card-tags">
                    {pattern.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="plb-tag">{tag}</span>
                    ))}
                    {pattern.tags.length > 3 && (
                        <span className="plb-tag-more">+{pattern.tags.length - 3}</span>
                    )}
                </div>
            )}
        </div>
    );
}

function CategorySection({ category, patterns, controllerMode }: {
    category: string; patterns: PatternInfo[]; controllerMode: ControllerMode;
}) {
    return (
        <div className="plb-category-section">
            <div className="plb-category-header">
                <span className="plb-category-name">{category}</span>
                <span className="plb-category-count">{patterns.length}</span>
            </div>
            <div className="plb-grid">
                {patterns.map(pattern => (
                    <PatternCard key={pattern.id} pattern={pattern} controllerMode={controllerMode} />
                ))}
            </div>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

export function PatternLibraryBrowser({ controllerMode, className }: PatternLibraryBrowserProps) {
    const allPatterns = useMemo(() => getAllPatterns(controllerMode), [controllerMode]);
    const allCategories = useMemo(() => getCategories(allPatterns), [allPatterns]);
    const stats = useMemo(() => {
        if (controllerMode === 'tap') {
            return {
                totalPatterns: 0,
                byCategory: { basic: 0, roll: 0, stream: 0, jump: 0, chord: 0, transition: 0 },
                byDifficulty: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, 0])),
                averageKeyCount: 0,
                minKeys: 0,
                maxKeys: 0,
            };
        }
        if (controllerMode === 'ddr') {
            return getPatternLibraryStats(DDR_PATTERN_LIBRARY);
        }
        return getPatternLibraryStats(GUITAR_HERO_PATTERN_LIBRARY);
    }, [controllerMode]);

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const filteredPatterns = useMemo(() => {
        if (!selectedCategory) return allPatterns;
        return allPatterns.filter(p => p.category === selectedCategory);
    }, [allPatterns, selectedCategory]);

    const displayCategories = useMemo(() => {
        if (selectedCategory) return [{ category: selectedCategory, patterns: filteredPatterns }];
        return getCategories(filteredPatterns).map(cat => ({
            category: cat,
            patterns: filteredPatterns.filter(p => p.category === cat),
        }));
    }, [filteredPatterns, selectedCategory]);

    const categoryCounts = useMemo(() => {
        const counts = new Map<string, number>();
        for (const p of allPatterns) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
        return counts;
    }, [allPatterns]);

    return (
        <div className={cn('plb', className)}>
            {/* Header */}
            <div className="plb-header">
                <div className="plb-header-left">
                    <BookOpen size={16} className="plb-header-icon" />
                    <span className="plb-header-title">
                        Pattern Library
                        <span className="plb-header-mode">
                            {controllerMode === 'ddr' ? 'DDR (4-Panel)' : controllerMode === 'guitar_hero' ? 'Guitar Hero (5-Fret)' : 'Tap'}
                        </span>
                    </span>
                </div>
                <span className="plb-header-total">{stats.totalPatterns} patterns</span>
            </div>

            {/* Stats row */}
            <div className="plb-stats">
                <div className="plb-stat">
                    <span className="plb-stat-value">{stats.totalPatterns}</span>
                    <span className="plb-stat-label">Total</span>
                </div>
                <div className="plb-stat">
                    <span className="plb-stat-value">{stats.minKeys}-{stats.maxKeys}</span>
                    <span className="plb-stat-label">Key range</span>
                </div>
                <div className="plb-stat">
                    <span className="plb-stat-value">{stats.averageKeyCount.toFixed(1)}</span>
                    <span className="plb-stat-label">Avg keys</span>
                </div>
                <div className="plb-stat">
                    <span className="plb-stat-value">{Object.values(stats.byCategory).filter(c => c > 0).length}</span>
                    <span className="plb-stat-label">Categories</span>
                </div>
            </div>

            {/* Category filter */}
            <div className="plb-filter">
                <button
                    className={cn('plb-filter-chip', selectedCategory === null && 'plb-filter-chip--active')}
                    onClick={() => setSelectedCategory(null)}
                >
                    All ({allPatterns.length})
                </button>
                {allCategories.map(cat => (
                    <button
                        key={cat}
                        className={cn('plb-filter-chip', selectedCategory === cat && 'plb-filter-chip--active')}
                        onClick={() => setSelectedCategory(cat)}
                    >
                        {cat} ({categoryCounts.get(cat) ?? 0})
                    </button>
                ))}
            </div>

            {/* Pattern sections */}
            {displayCategories.map(({ category: cat, patterns: catPatterns }) => (
                <CategorySection
                    key={cat}
                    category={cat}
                    patterns={catPatterns}
                    controllerMode={controllerMode}
                />
            ))}
        </div>
    );
}

export default PatternLibraryBrowser;
