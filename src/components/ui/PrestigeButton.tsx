import { useState } from 'react';
import { Crown } from 'lucide-react';
import { Button } from './Button';
import { PrestigeConfirmationModal } from './PrestigeConfirmationModal';
import type { PrestigeLevel, PrestigeInfo, CharacterSheet } from '@/types';
import './PrestigeButton.css';

/**
 * PrestigeButton Component
 *
 * Displays a button that allows players to prestige their character after mastering a track.
 * Only visible when the character can prestige (mastered and not at max level).
 *
 * Features:
 * - Shows current prestige level and next level
 * - Opens confirmation modal when clicked
 * - Displays prestige requirements and rewards
 * - Disabled if not eligible for prestige
 */

export interface PrestigeButtonProps {
    /** Whether the character can prestige */
    canPrestige: boolean;
    /** Current prestige info */
    prestigeInfo: PrestigeInfo | null;
    /** Current character (for equipment display in modal) */
    character: CharacterSheet;
    /** Callback to execute prestige */
    onPrestige: () => void;
    /** Optional additional CSS class */
    className?: string;
}

/**
 * PrestigeButton component for triggering character prestige.
 *
 * @example
 * ```tsx
 * <PrestigeButton
 *   canPrestige={masteryInfo?.canPrestige ?? false}
 *   prestigeInfo={prestigeInfo}
 *   character={activeCharacter}
 *   onPrestige={handlePrestige}
 * />
 * ```
 */
export function PrestigeButton({
    canPrestige,
    prestigeInfo,
    character,
    onPrestige,
    className = ''
}: PrestigeButtonProps) {
    const [showModal, setShowModal] = useState(false);

    // Don't render if not eligible for prestige
    if (!canPrestige || !prestigeInfo) {
        return null;
    }

    const handleOpenModal = () => {
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
    };

    const handleConfirmPrestige = () => {
        setShowModal(false);
        onPrestige();
    };

    const currentPrestigeRoman = prestigeInfo.prestigeLevel > 0
        ? getPrestigeRoman(prestigeInfo.prestigeLevel)
        : '';
    const nextPrestigeRoman = getPrestigeRoman(prestigeInfo.prestigeLevel + 1);
    const isMaxPrestige = prestigeInfo.isMaxPrestige;

    return (
        <>
            <div className={`prestige-button-container ${className}`}>
                <div className="prestige-button-info">
                    <Crown className="prestige-button-icon" size={18} />
                    <div className="prestige-button-text">
                        <span className="prestige-button-title">
                            {isMaxPrestige
                                ? 'Maximum Prestige Achieved!'
                                : currentPrestigeRoman
                                    ? `Ready to Prestige ${currentPrestigeRoman} → ${nextPrestigeRoman}`
                                    : `Ready for Prestige ${nextPrestigeRoman}`
                            }
                        </span>
                        {!isMaxPrestige && (
                            <span className="prestige-button-subtitle">
                                Reset character for an upgraded badge
                            </span>
                        )}
                    </div>
                </div>
                {!isMaxPrestige && (
                    <Button
                        variant="primary"
                        size="md"
                        onClick={handleOpenModal}
                        className="prestige-button-action"
                        leftIcon={Crown}
                    >
                        Prestige
                    </Button>
                )}
            </div>

            <PrestigeConfirmationModal
                isOpen={showModal}
                prestigeInfo={prestigeInfo}
                character={character}
                nextPrestigeRoman={nextPrestigeRoman}
                onConfirm={handleConfirmPrestige}
                onCancel={handleCloseModal}
            />
        </>
    );
}

/**
 * Convert prestige level to Roman numeral
 */
function getPrestigeRoman(level: PrestigeLevel | number): string {
    const numerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    return numerals[level] || '';
}

export default PrestigeButton;
