import { useEffect } from 'react';
import { X, AlertTriangle, Crown, Sword, Shield, FlaskConical, ArrowRight } from 'lucide-react';
import type { PrestigeInfo, CharacterSheet } from '@/types';
import { PrestigeSystem } from '@/types';
import './PrestigeButton.css';

/**
 * PrestigeConfirmationModal Component
 *
 * Modal dialog that confirms the player wants to prestige their character.
 * Explains what will be reset and what will be preserved.
 *
 * Features:
 * - Clear explanation of prestige effects
 * - Shows new mastery requirements
 * - Lists preserved equipment
 * - Warning about permanent reset
 */

export interface PrestigeConfirmationModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Current prestige info */
    prestigeInfo: PrestigeInfo;
    /** Current character (for equipment display) */
    character: CharacterSheet;
    /** Roman numeral for next prestige level */
    nextPrestigeRoman: string;
    /** Callback when user confirms prestige */
    onConfirm: () => void;
    /** Callback when user cancels */
    onCancel: () => void;
}

/**
 * PrestigeConfirmationModal component for confirming prestige action.
 */
export function PrestigeConfirmationModal({
    isOpen,
    prestigeInfo,
    character,
    nextPrestigeRoman,
    onConfirm,
    onCancel
}: PrestigeConfirmationModalProps) {
    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onCancel();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    // Get new thresholds after prestiging
    const nextPrestigeLevel = prestigeInfo.prestigeLevel + 1;
    const newPlaysThreshold = PrestigeSystem.getPlaysThreshold(nextPrestigeLevel as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10);
    const newXpThreshold = PrestigeSystem.getXPThreshold(nextPrestigeLevel as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10);

    // Get equipment summary
    const equipment = character.equipment;
    const weaponCount = equipment?.weapons?.filter(w => w.equipped).length ?? 0;
    const armorCount = equipment?.armor?.filter(a => a.equipped).length ?? 0;
    const itemCount = equipment?.items?.filter(i => i.equipped).length ?? 0;

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onCancel();
        }
    };

    return (
        <div
            className="prestige-modal-overlay"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="prestige-modal-title"
        >
            <div className="prestige-modal-container">
                {/* Header */}
                <div className="prestige-modal-header">
                    <div className="prestige-modal-header-content">
                        <Crown className="prestige-modal-header-icon" size={24} />
                        <h2 id="prestige-modal-title" className="prestige-modal-title">
                            Confirm Prestige
                        </h2>
                    </div>
                    <button
                        type="button"
                        className="prestige-modal-close"
                        onClick={onCancel}
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="prestige-modal-content">
                    {/* Warning Banner */}
                    <div className="prestige-modal-warning">
                        <AlertTriangle className="prestige-modal-warning-icon" size={20} />
                        <div className="prestige-modal-warning-text">
                            <strong>Permanent Action</strong>
                            <p>This will reset your character to level 1. This cannot be undone.</p>
                        </div>
                    </div>

                    {/* What Happens Section */}
                    <div className="prestige-modal-section">
                        <h3 className="prestige-modal-section-title">What Happens When You Prestige</h3>
                        <div className="prestige-modal-changes-grid">
                            {/* Reset */}
                            <div className="prestige-modal-change-group prestige-change-reset">
                                <h4 className="prestige-modal-change-title">Will Reset</h4>
                                <ul className="prestige-modal-change-list">
                                    <li>Level → 1</li>
                                    <li>XP → 0</li>
                                    <li>Stats → Base values</li>
                                    <li>Listen count → 0</li>
                                </ul>
                            </div>

                            {/* Preserved */}
                            <div className="prestige-modal-change-group prestige-change-keep">
                                <h4 className="prestige-modal-change-title">Will Keep</h4>
                                <ul className="prestige-modal-change-list">
                                    <li className="prestige-modal-keep-item">
                                        <Sword size={14} />
                                        {weaponCount} weapon{weaponCount !== 1 ? 's' : ''}
                                    </li>
                                    <li className="prestige-modal-keep-item">
                                        <Shield size={14} />
                                        {armorCount} armor piece{armorCount !== 1 ? 's' : ''}
                                    </li>
                                    <li className="prestige-modal-keep-item">
                                        <FlaskConical size={14} />
                                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                                    </li>
                                    <li>Character name & seed</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* New Requirements Section */}
                    <div className="prestige-modal-section">
                        <h3 className="prestige-modal-section-title">
                            New Mastery Requirements
                            <ArrowRight size={16} className="prestige-modal-arrow" />
                            Prestige {nextPrestigeRoman}
                        </h3>
                        <div className="prestige-modal-requirements">
                            <div className="prestige-modal-requirement">
                                <span className="prestige-modal-requirement-label">Plays Required</span>
                                <span className="prestige-modal-requirement-value">{newPlaysThreshold}</span>
                            </div>
                            <div className="prestige-modal-requirement">
                                <span className="prestige-modal-requirement-label">XP Required</span>
                                <span className="prestige-modal-requirement-value">{newXpThreshold.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Rewards Section */}
                    <div className="prestige-modal-section prestige-modal-rewards">
                        <h3 className="prestige-modal-section-title">Rewards</h3>
                        <p className="prestige-modal-reward-text">
                            Your mastery badge will be upgraded to{' '}
                            <strong className="prestige-modal-badge-upgrade">
                                Prestige {nextPrestigeRoman}
                            </strong>
                            , showing your dedication to this track!
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="prestige-modal-footer">
                    <button
                        type="button"
                        className="prestige-modal-btn prestige-modal-cancel"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="prestige-modal-btn prestige-modal-confirm"
                        onClick={onConfirm}
                    >
                        <Crown size={16} />
                        Prestige to {nextPrestigeRoman}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PrestigeConfirmationModal;
