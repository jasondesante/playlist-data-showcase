/**
 * Party Selector Component (Task 8.2.3)
 *
 * Reuses character selection pattern from CombatSimulatorTab.
 * Shows character cards with key stats (level, AC, HP, class).
 * Max 4 characters.
 */

import { useMemo } from 'react';
import { useCharacterStore } from '@/store/characterStore';
import { Shield, Heart, Swords } from 'lucide-react';
import './PartySelector.css';

interface PartySelectorProps {
    /** Currently selected character seeds */
    selectedSeeds: string[];
    /** Callback when selection changes */
    onChange: (seeds: string[]) => void;
    /** Whether the selector is disabled (e.g., simulation running) */
    disabled?: boolean;
    /** Maximum number of party members */
    maxPartySize?: number;
}

export function PartySelector({
    selectedSeeds,
    onChange,
    disabled = false,
    maxPartySize = 4,
}: PartySelectorProps) {
    const characters = useCharacterStore((s) => s.characters);

    const availableCharacters = useMemo(
        () => characters.filter((c) => c.level > 0),
        [characters],
    );

    const toggleCharacter = (seed: string) => {
        if (disabled) return;
        if (selectedSeeds.includes(seed)) {
            onChange(selectedSeeds.filter((s) => s !== seed));
        } else if (selectedSeeds.length < maxPartySize) {
            onChange([...selectedSeeds, seed]);
        }
    };

    const isFull = selectedSeeds.length >= maxPartySize;

    return (
        <div className="party-selector">
            <div className="party-selector-header">
                <label className="party-selector-label">
                    Party Members ({selectedSeeds.length}/{maxPartySize})
                </label>
                {availableCharacters.length === 0 && (
                    <span className="party-selector-empty-hint">
                        No characters generated yet
                    </span>
                )}
            </div>

            {availableCharacters.length > 0 ? (
                <div className="party-selector-grid">
                    {availableCharacters.map((char) => {
                        const isSelected = selectedSeeds.includes(char.seed);
                        const isExcluded = !isSelected && isFull;

                        return (
                            <button
                                key={char.seed}
                                type="button"
                                className={`party-card ${isSelected ? 'party-card-selected' : ''} ${isExcluded ? 'party-card-excluded' : ''}`}
                                onClick={() => toggleCharacter(char.seed)}
                                disabled={disabled || isExcluded}
                                title={isExcluded ? 'Party is full' : undefined}
                            >
                                <span className="party-card-name">{char.name}</span>
                                <div className="party-card-stats">
                                    <span className="party-card-stat" title="Level">
                                        <Swords size={11} />
                                        {char.level}
                                    </span>
                                    <span className="party-card-stat" title="AC">
                                        <Shield size={11} />
                                        {char.armor_class ?? '?'}
                                    </span>
                                    <span className="party-card-stat" title="Max HP">
                                        <Heart size={11} />
                                        {char.hp.max}
                                    </span>
                                </div>
                                <div className="party-card-footer">
                                    <span className="party-card-class">{char.class}</span>
                                    {isSelected && <span className="party-card-check">Selected</span>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="party-selector-empty">
                    <p>No characters available. Go to the <strong>Hero</strong> tab to generate characters, then come back to select your party.</p>
                </div>
            )}
        </div>
    );
}
