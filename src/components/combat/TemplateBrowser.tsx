/**
 * TemplateBrowser Component
 *
 * Phase 8.3: Enemy Template Browser
 *
 * An expandable panel that displays all available enemy templates
 * with stats, allows filtering by category/archetype, and provides
 * click-to-select functionality for generation.
 *
 * Features:
 * - Collapsible panel with expand/collapse toggle
 * - Filter by category (Humanoid, Beast, Undead, etc.)
 * - Filter by archetype (Brute, Archer, Support)
 * - Visual template cards with key stats
 * - Click to select template for generation
 * - Shows resistances/immunities per template
 */

import { useState, useMemo } from 'react';
import type { EnemyCategory, EnemyArchetype } from '../../hooks/useEnemyGenerator';
import './TemplateBrowser.css';

/**
 * Damage types for resistances/immunities display
 */
type DamageTypeDisplay = 'slashing' | 'piercing' | 'bludgeoning' | 'fire' | 'cold' | 'lightning' | 'thunder' | 'poison' | 'acid' | 'necrotic' | 'radiant' | 'psychic' | 'force';

/**
 * Template metadata for display in the UI
 * Must match the TemplateInfo interface from CombatSimulatorTab
 */
export interface TemplateInfo {
    id: string;
    name: string;
    category: EnemyCategory;
    archetype: EnemyArchetype;
    signatureAbility: string;
    signatureAbilityDescription: string;
    /** Damage resistances (half damage) for Elite+ enemies */
    resistances?: DamageTypeDisplay[];
    /** Damage immunities (zero damage) for Elite+ enemies */
    immunities?: DamageTypeDisplay[];
}

/**
 * Category display names and icons
 */
const CATEGORY_INFO: Record<EnemyCategory, { label: string; icon: string }> = {
    humanoid: { label: 'Humanoid', icon: '👤' },
    beast: { label: 'Beast', icon: '🐾' },
    undead: { label: 'Undead', icon: '💀' },
    fiend: { label: 'Fiend', icon: '😈' },
    elemental: { label: 'Elemental', icon: '🔥' },
    construct: { label: 'Construct', icon: '🤖' },
    dragon: { label: 'Dragon', icon: '🐉' },
    monstrosity: { label: 'Monstrosity', icon: '👹' },
};

/**
 * Archetype display names and icons
 */
const ARCHETYPE_INFO: Record<EnemyArchetype, { label: string; icon: string; color: string }> = {
    brute: { label: 'Brute', icon: '⚔️', color: 'hsl(0 70% 50%)' },
    archer: { label: 'Archer', icon: '🏹', color: 'hsl(142 70% 45%)' },
    support: { label: 'Support', icon: '✨', color: 'hsl(217 70% 55%)' },
};

/**
 * Damage type display info with icons and colors
 */
const DAMAGE_TYPE_INFO: Record<DamageTypeDisplay, { label: string; icon: string; color: string }> = {
    slashing: { label: 'Slashing', icon: '🗡️', color: 'hsl(0 0% 50%)' },
    piercing: { label: 'Piercing', icon: '⚔️', color: 'hsl(0 0% 50%)' },
    bludgeoning: { label: 'Bludgeoning', icon: '🔨', color: 'hsl(0 0% 50%)' },
    fire: { label: 'Fire', icon: '🔥', color: 'hsl(20 90% 50%)' },
    cold: { label: 'Cold', icon: '❄️', color: 'hsl(200 90% 60%)' },
    lightning: { label: 'Lightning', icon: '⚡', color: 'hsl(50 90% 50%)' },
    thunder: { label: 'Thunder', icon: '💥', color: 'hsl(280 60% 50%)' },
    poison: { label: 'Poison', icon: '☠️', color: 'hsl(120 50% 35%)' },
    acid: { label: 'Acid', icon: '🧪', color: 'hsl(80 70% 40%)' },
    necrotic: { label: 'Necrotic', icon: '💀', color: 'hsl(270 50% 40%)' },
    radiant: { label: 'Radiant', icon: '✨', color: 'hsl(45 100% 60%)' },
    psychic: { label: 'Psychic', icon: '🧠', color: 'hsl(300 60% 50%)' },
    force: { label: 'Force', icon: '💫', color: 'hsl(240 60% 60%)' },
};

/**
 * Props for the TemplateBrowser component
 */
export interface TemplateBrowserProps {
    /** Array of all available enemy templates */
    templates: TemplateInfo[];
    /** Currently selected template ID (if any) */
    selectedTemplateId?: string;
    /** Callback when a template is selected */
    onTemplateSelect: (templateId: string) => void;
    /** Optional className for styling */
    className?: string;
}

/**
 * TemplateBrowser Component
 *
 * Displays enemy templates in a filterable, browsable panel.
 * Users can filter by category and archetype, view template details,
 * and click to select a template for generation.
 */
export function TemplateBrowser({
    templates,
    selectedTemplateId,
    onTemplateSelect,
    className = ''
}: TemplateBrowserProps) {
    // State: Panel expansion
    const [isExpanded, setIsExpanded] = useState(false);

    // State: Category filter
    const [categoryFilter, setCategoryFilter] = useState<EnemyCategory | ''>('');

    // State: Archetype filter
    const [archetypeFilter, setArchetypeFilter] = useState<EnemyArchetype | ''>('');

    // State: Search text filter
    const [searchFilter, setSearchFilter] = useState('');

    // Filter templates based on current filters
    const filteredTemplates = useMemo(() => {
        return templates.filter(template => {
            // Category filter
            if (categoryFilter && template.category !== categoryFilter) {
                return false;
            }
            // Archetype filter
            if (archetypeFilter && template.archetype !== archetypeFilter) {
                return false;
            }
            // Search filter (by name or signature ability)
            if (searchFilter) {
                const searchLower = searchFilter.toLowerCase();
                return (
                    template.name.toLowerCase().includes(searchLower) ||
                    template.signatureAbility.toLowerCase().includes(searchLower) ||
                    template.id.toLowerCase().includes(searchLower)
                );
            }
            return true;
        });
    }, [templates, categoryFilter, archetypeFilter, searchFilter]);

    // Count templates per category for display
    const categoryCounts = useMemo(() => {
        const counts: Partial<Record<EnemyCategory, number>> = {};
        for (const cat of Object.keys(CATEGORY_INFO) as EnemyCategory[]) {
            counts[cat] = templates.filter(t => t.category === cat).length;
        }
        return counts;
    }, [templates]);

    // Count templates per archetype for display
    const archetypeCounts = useMemo(() => {
        const counts: Partial<Record<EnemyArchetype, number>> = {};
        for (const arch of Object.keys(ARCHETYPE_INFO) as EnemyArchetype[]) {
            counts[arch] = templates.filter(t => t.archetype === arch).length;
        }
        return counts;
    }, [templates]);

    // Handle clearing all filters
    const handleClearFilters = () => {
        setCategoryFilter('');
        setArchetypeFilter('');
        setSearchFilter('');
    };

    // Check if any filter is active
    const hasActiveFilters = categoryFilter || archetypeFilter || searchFilter;

    return (
        <div className={`template-browser ${className}`}>
            {/* Collapsible Header */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="template-browser-header"
            >
                <span className="template-browser-title">
                    📖 Enemy Template Browser
                    <span className="template-browser-count">
                        {templates.length} templates
                    </span>
                </span>
                <span className={`template-browser-expand-icon ${isExpanded ? 'template-browser-expanded' : ''}`}>
                    ▼
                </span>
            </button>

            {/* Collapsible Content */}
            {isExpanded && (
                <div className="template-browser-content">
                    {/* Filter Controls */}
                    <div className="template-browser-filters">
                        {/* Search Input */}
                        <div className="template-browser-filter-group template-browser-search">
                            <label className="template-browser-filter-label">Search</label>
                            <input
                                type="text"
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                placeholder="Search by name or ability..."
                                className="template-browser-search-input"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="template-browser-filter-group">
                            <label className="template-browser-filter-label">Category</label>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value as EnemyCategory | '')}
                                className="template-browser-filter-select"
                            >
                                <option value="">All Categories</option>
                                {(Object.keys(CATEGORY_INFO) as EnemyCategory[]).map(cat => {
                                    const info = CATEGORY_INFO[cat];
                                    const count = categoryCounts[cat] || 0;
                                    return (
                                        <option key={cat} value={cat}>
                                            {info.icon} {info.label} ({count})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Archetype Filter */}
                        <div className="template-browser-filter-group">
                            <label className="template-browser-filter-label">Archetype</label>
                            <select
                                value={archetypeFilter}
                                onChange={(e) => setArchetypeFilter(e.target.value as EnemyArchetype | '')}
                                className="template-browser-filter-select"
                            >
                                <option value="">All Archetypes</option>
                                {(Object.keys(ARCHETYPE_INFO) as EnemyArchetype[]).map(arch => {
                                    const info = ARCHETYPE_INFO[arch];
                                    const count = archetypeCounts[arch] || 0;
                                    return (
                                        <option key={arch} value={arch}>
                                            {info.icon} {info.label} ({count})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Clear Filters Button */}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="template-browser-clear-btn"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>

                    {/* Results Count */}
                    <div className="template-browser-results-info">
                        Showing {filteredTemplates.length} of {templates.length} templates
                        {hasActiveFilters && ' (filtered)'}
                    </div>

                    {/* Template Grid */}
                    <div className="template-browser-grid">
                        {filteredTemplates.length === 0 ? (
                            <div className="template-browser-empty">
                                No templates match your filters.
                            </div>
                        ) : (
                            filteredTemplates.map(template => {
                                const catInfo = CATEGORY_INFO[template.category];
                                const archInfo = ARCHETYPE_INFO[template.archetype];
                                const isSelected = template.id === selectedTemplateId;

                                return (
                                    <div
                                        key={template.id}
                                        onClick={() => onTemplateSelect(template.id)}
                                        className={`template-browser-card ${isSelected ? 'template-browser-card-selected' : ''}`}
                                        title={`Click to select ${template.name}`}
                                    >
                                        {/* Card Header */}
                                        <div className="template-browser-card-header">
                                            <span className="template-browser-card-name">
                                                {template.name}
                                            </span>
                                            {isSelected && (
                                                <span className="template-browser-card-selected-badge">
                                                    Selected
                                                </span>
                                            )}
                                        </div>

                                        {/* Category & Archetype Badges */}
                                        <div className="template-browser-card-badges">
                                            <span
                                                className="template-browser-card-badge template-browser-card-badge-category"
                                                title={`Category: ${catInfo.label}`}
                                            >
                                                {catInfo.icon} {catInfo.label}
                                            </span>
                                            <span
                                                className="template-browser-card-badge template-browser-card-badge-archetype"
                                                style={{ backgroundColor: archInfo.color }}
                                                title={`Archetype: ${archInfo.label}`}
                                            >
                                                {archInfo.icon} {archInfo.label}
                                            </span>
                                        </div>

                                        {/* Signature Ability */}
                                        <div className="template-browser-card-ability">
                                            <span className="template-browser-card-ability-label">Signature:</span>
                                            <span className="template-browser-card-ability-name">
                                                {template.signatureAbility}
                                            </span>
                                        </div>
                                        <div className="template-browser-card-ability-desc">
                                            {template.signatureAbilityDescription}
                                        </div>

                                        {/* Resistances/Immunities */}
                                        {(template.resistances?.length || template.immunities?.length) ? (
                                            <div className="template-browser-card-defenses">
                                                {template.resistances && template.resistances.length > 0 && (
                                                    <div className="template-browser-card-resistances">
                                                        <span className="template-browser-card-defense-label">Resist:</span>
                                                        <span className="template-browser-card-defense-icons">
                                                            {template.resistances.map(res => {
                                                                const info = DAMAGE_TYPE_INFO[res];
                                                                return (
                                                                    <span
                                                                        key={res}
                                                                        className="template-browser-card-defense-icon"
                                                                        title={`${info.label} Resistance`}
                                                                    >
                                                                        {info.icon}
                                                                    </span>
                                                                );
                                                            })}
                                                        </span>
                                                    </div>
                                                )}
                                                {template.immunities && template.immunities.length > 0 && (
                                                    <div className="template-browser-card-immunities">
                                                        <span className="template-browser-card-defense-label">Immune:</span>
                                                        <span className="template-browser-card-defense-icons">
                                                            {template.immunities.map(imm => {
                                                                const info = DAMAGE_TYPE_INFO[imm];
                                                                return (
                                                                    <span
                                                                        key={imm}
                                                                        className="template-browser-card-defense-icon template-browser-card-defense-icon-immunity"
                                                                        title={`${info.label} Immunity`}
                                                                    >
                                                                        {info.icon}
                                                                    </span>
                                                                );
                                                            })}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}

                                        {/* Template ID */}
                                        <div className="template-browser-card-id">
                                            ID: {template.id}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Help Text */}
                    <div className="template-browser-help">
                        Click a template to select it for enemy generation. Elite and Boss rarities gain the shown resistances/immunities.
                    </div>
                </div>
            )}
        </div>
    );
}

export default TemplateBrowser;
