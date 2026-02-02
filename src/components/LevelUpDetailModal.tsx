/**
 * LevelUpDetailModal Component
 *
 * Modal component for displaying detailed level-up information when a character
 * gains one or more levels. Shows HP increases, stat changes, proficiency bonus,
 * and new features gained.
 *
 * Created as part of Task 3.2 of UPDATE_PLAN.md.
 *
 * Features:
 * - Displays all level-ups from multi-level gains (e.g., boss defeat)
 * - Shows HP increases with Heart icon
 * - Shows proficiency bonus changes with Shield icon
 * - Shows stat increases with TrendingUp icon
 * - Shows new features with Star icon
 * - Purple/gold celebration theme
 * - Confetti animation on open
 * - Pure CSS (no Tailwind utility classes)
 */

import '../styles/components/LevelUpDetailModal.css';
import { Heart, Shield, TrendingUp, Star, Wand2 } from 'lucide-react';
import type { LevelUpDetail } from 'playlist-data-engine';

export interface LevelUpDetailModalProps {
  /** Array of level-up details to display */
  levelUpDetails: LevelUpDetail[];
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
}

const ABILITY_SHORT_NAMES: Record<string, string> = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
};

/**
 * LevelUpDetailModal Component
 *
 * Displays a celebration modal when a character levels up, showing detailed
 * information about each level gained including HP, stats, proficiency, and features.
 */
export function LevelUpDetailModal({ levelUpDetails, isOpen, onClose }: LevelUpDetailModalProps) {
  if (!isOpen) return null;

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Calculate total levels gained
  const totalLevelsGained = levelUpDetails.length > 0
    ? levelUpDetails[levelUpDetails.length - 1].toLevel - levelUpDetails[0].fromLevel
    : 0;

  const finalLevel = levelUpDetails.length > 0
    ? levelUpDetails[levelUpDetails.length - 1].toLevel
    : 0;

  return (
    <div
      className="levelup-modal-overlay"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="levelup-modal-title"
    >
      {/* Confetti celebration */}
      <div className="levelup-modal-confetti">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="levelup-confetti-piece"
            style={{
              animationDelay: `${i * 0.05}s`,
              left: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <div className="levelup-modal-container">
        {/* Modal Header */}
        <div className="levelup-modal-header">
          <div className="levelup-modal-title-section">
            <h1 id="levelup-modal-title" className="levelup-modal-title">
              LEVEL UP!
            </h1>
            <div className="levelup-modal-subtitle">
              <span className="levelup-emoji">🎉</span>
              {totalLevelsGained === 1 ? (
                <span>Your character has reached Level {finalLevel}!</span>
              ) : (
                <span>Your character gained {totalLevelsGained} levels!</span>
              )}
              <span className="levelup-emoji">🎉</span>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="levelup-modal-content">
          {levelUpDetails.map((detail, index) => (
            <div key={index} className="levelup-detail-card">
              {/* Level range header */}
              <div className="levelup-detail-header">
                <span className="levelup-detail-range">
                  Level {detail.fromLevel} → Level {detail.toLevel}
                </span>
              </div>

              {/* Level changes */}
              <div className="levelup-detail-changes">
                {/* HP increase */}
                <div className="levelup-detail-item levelup-detail-hp">
                  <div className="levelup-detail-icon levelup-icon-hp">
                    <Heart size={20} strokeWidth={2.5} />
                  </div>
                  <div className="levelup-detail-info">
                    <span className="levelup-detail-label">Hit Points</span>
                    <span className="levelup-detail-value">
                      +{detail.hpIncrease} <span className="levelup-detail-new">(new max: {detail.newMaxHP})</span>
                    </span>
                  </div>
                </div>

                {/* Proficiency bonus increase (if any) */}
                {detail.proficiencyIncrease > 0 && (
                  <div className="levelup-detail-item levelup-detail-proficiency">
                    <div className="levelup-detail-icon levelup-icon-proficiency">
                      <Shield size={20} strokeWidth={2.5} />
                    </div>
                    <div className="levelup-detail-info">
                      <span className="levelup-detail-label">Proficiency Bonus</span>
                      <span className="levelup-detail-value">
                        +{detail.proficiencyIncrease} <span className="levelup-detail-new">(+{detail.newProficiency})</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Stat increases (if any) */}
                {detail.statIncreases && detail.statIncreases.length > 0 && (
                  <div className="levelup-detail-item levelup-detail-stats">
                    <div className="levelup-detail-icon levelup-icon-stats">
                      <TrendingUp size={20} strokeWidth={2.5} />
                    </div>
                    <div className="levelup-detail-info">
                      <span className="levelup-detail-label">Ability Increases</span>
                      <div className="levelup-stat-increases">
                        {detail.statIncreases.map((stat, statIndex) => (
                          <span key={statIndex} className="levelup-stat-badge">
                            {ABILITY_SHORT_NAMES[stat.ability] || stat.ability} +{stat.delta}
                            <span className="levelup-stat-old"> ({stat.oldValue} → {stat.newValue})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* New features (if any) */}
                {detail.featuresGained && detail.featuresGained.length > 0 && (
                  <div className="levelup-detail-item levelup-detail-features">
                    <div className="levelup-detail-icon levelup-icon-features">
                      <Star size={20} strokeWidth={2.5} />
                    </div>
                    <div className="levelup-detail-info">
                      <span className="levelup-detail-label">New Features</span>
                      <ul className="levelup-features-list">
                        {detail.featuresGained.map((feature, featureIndex) => (
                          <li key={featureIndex} className="levelup-feature-item">
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* New spell slots (if any) */}
                {detail.newSpellSlots && Object.keys(detail.newSpellSlots).length > 0 && (
                  <div className="levelup-detail-item levelup-detail-spells">
                    <div className="levelup-detail-icon levelup-icon-spells">
                      <Wand2 size={20} strokeWidth={2.5} />
                    </div>
                    <div className="levelup-detail-info">
                      <span className="levelup-detail-label">Spell Slots</span>
                      <div className="levelup-spell-slots">
                        {Object.entries(detail.newSpellSlots)
                          .filter(([_, slots]) => slots.total > 0)
                          .sort(([a], [b]) => parseInt(a) - parseInt(b))
                          .map(([level, slots]) => (
                            <span key={level} className="levelup-spell-slot-badge">
                              Level {level}: {slots.total} slot{slots.total !== 1 ? 's' : ''}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="levelup-modal-footer">
          <button
            type="button"
            className="levelup-modal-continue-btn"
            onClick={onClose}
            autoFocus
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default LevelUpDetailModal;
