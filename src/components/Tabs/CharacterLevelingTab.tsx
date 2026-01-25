import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/characterStore';
import { RawJsonDump } from '../ui/RawJsonDump';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TrendingUp, Heart, Shield, Star, Zap } from 'lucide-react';

/**
 * CharacterLevelingTab Component
 *
 * Demonstrates the CharacterUpdater engine module by:
 * 1. Displaying the active character's XP progress
 * 2. Providing quick-add XP buttons for testing
 * 3. Showing manual XP input for custom amounts
 * 4. Automatically handling level-ups based on XP thresholds
 * 5. Displaying current stats (HP, AC, proficiency bonus)
 * 6. Raw JSON dump for debugging
 *
 * The XP thresholds follow D&D 5e rules:
 * - Level 1→2: 300 XP
 * - Level 2→3: 900 XP
 * - Level 3→4: 2,700 XP
 * - And so on...
 *
 * @example
 * ```tsx
 * // In the app, this tab is accessed after generating a character
 * <CharacterLevelingTab />
 * ```
 */
export function CharacterLevelingTab() {
  const { characters, updateCharacter } = useCharacterStore();
  const [xpAmount, setXpAmount] = useState(100);
  const [currentXP, setCurrentXP] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [levelUpPulse, setLevelUpPulse] = useState(false);

  const activeChar = characters.length > 0 ? characters[characters.length - 1] : null;

  // Sync currentXP with character when it changes
  useEffect(() => {
    if (activeChar) {
      setCurrentXP(activeChar.xp.current);
    }
  }, [activeChar]);

  // Get character avatar emoji based on class
  const getCharacterAvatar = (charClass: string): string => {
    const classEmojis: Record<string, string> = {
      'Fighter': '⚔️',
      'Wizard': '🧙',
      'Rogue': '🗡️',
      'Cleric': '✨',
      'Ranger': '🏹',
      'Barbarian': '🪓',
      'Bard': '🎸',
      'Druid': '🌿',
      'Monk': '👊',
      'Paladin': '🛡️',
      'Sorcerer': '🔮',
      'Warlock': '👁️',
    };
    return classEmojis[charClass] || '👤';
  };

  // D&D 5e XP thresholds for levels 1-20
  const xpThresholds = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

  const addXP = (amount: number) => {
    if (!activeChar) return;

    const newXP = currentXP + amount;
    setCurrentXP(newXP);

    // Check if we should level up
    let newLevel = activeChar.level;
    let newNextLevel = activeChar.xp.next_level;

    for (let i = activeChar.level; i < xpThresholds.length; i++) {
      if (newXP >= xpThresholds[i]) {
        newLevel = i + 1;
        newNextLevel = xpThresholds[i + 1] || 999999;
      } else {
        break;
      }
    }

    // Update the character
    const updatedChar = {
      ...activeChar,
      level: newLevel,
      xp: {
        current: newXP,
        next_level: newNextLevel
      }
    };

    updateCharacter(updatedChar);

    if (newLevel > activeChar.level) {
      console.log(`🎉 LEVEL UP! Now level ${newLevel}!`);
      triggerLevelUpCelebration();
    }
    console.log(`Added ${amount} XP. Total: ${newXP} (Level ${newLevel})`);
  };

  const triggerLevelUpCelebration = () => {
    setShowConfetti(true);
    setLevelUpPulse(true);
    setTimeout(() => setShowConfetti(false), 3000);
    setTimeout(() => setLevelUpPulse(false), 600);
  };

  if (!activeChar) {
    return (
      <div className="leveling-tab">
        <header className="leveling-header">
          <div className="leveling-header-icon">
            <TrendingUp size={24} />
          </div>
          <div className="leveling-header-text">
            <h1 className="leveling-header-title">Character Leveling</h1>
            <h2 className="leveling-header-subtitle">Track your character&#39;s growth and adventure</h2>
          </div>
        </header>

        <Card variant="elevated" className="leveling-empty-state">
          <div className="leveling-empty-icon">👤</div>
          <h3 className="leveling-empty-title">No Character Generated</h3>
          <p className="leveling-empty-description">
            Go to the Character Generation tab to create a character first.
          </p>
        </Card>
      </div>
    );
  }

  const nextLevel = activeChar.xp.next_level;
  const prevLevelThreshold = xpThresholds[activeChar.level - 1] || 0;
  const currentLevelProgress = currentXP - prevLevelThreshold;
  const levelXPNeeded = nextLevel - prevLevelThreshold;
  const levelProgressPercent = (currentLevelProgress / levelXPNeeded) * 100;

  return (
    <div className="leveling-tab">
      {/* Confetti celebration */}
      {showConfetti && (
        <div className="leveling-confetti-container">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="leveling-confetti" style={{ animationDelay: `${i * 0.05}s` }} />
          ))}
        </div>
      )}

      <header className="leveling-header">
        <div className="leveling-header-icon">
          <TrendingUp size={24} />
        </div>
        <div className="leveling-header-text">
          <h1 className="leveling-header-title">Character Leveling</h1>
          <h2 className="leveling-header-subtitle">Track your character&#39;s growth and adventure</h2>
        </div>
      </header>

      {/* Character Card with Avatar and XP Progress */}
      <Card variant="elevated" padding="lg" className={`leveling-character-card ${levelUpPulse ? 'leveling-pulse' : ''}`}>
        <div className="leveling-character-header">
          <div className="leveling-character-avatar">
            <span className="leveling-avatar-emoji">{getCharacterAvatar(activeChar.class)}</span>
            <div className="leveling-avatar-badge">Lv {activeChar.level}</div>
          </div>
          <div className="leveling-character-info">
            <h3 className="leveling-character-name">{activeChar.name}</h3>
            <p className="leveling-character-class">{activeChar.race} {activeChar.class}</p>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="leveling-xp-section">
          <div className="leveling-xp-header">
            <span className="leveling-xp-label">Experience Progress</span>
            <span className="leveling-xp-values">{currentXP.toLocaleString()} / {nextLevel.toLocaleString()}</span>
          </div>
          <div className="leveling-progress-bar">
            <div
              className="leveling-progress-fill"
              style={{ width: `${levelProgressPercent}%` }}
            >
              <div className="leveling-progress-glow" />
            </div>
          </div>
          <p className="leveling-xp-hint">
            {(levelXPNeeded - currentLevelProgress).toLocaleString()} XP needed for next level
          </p>
        </div>
      </Card>

      {/* Level Milestones */}
      <Card variant="default" padding="md" className="leveling-milestones-card">
        <h4 className="leveling-milestones-title">Level Milestones</h4>
        <div className="leveling-milestones-grid">
          {xpThresholds.slice(1, 11).map((threshold, idx) => {
            const levelNum = idx + 2;
            const isReached = currentXP >= threshold;
            const isCurrent = activeChar.level === levelNum;
            return (
              <div
                key={levelNum}
                className={`leveling-milestone ${isReached ? 'leveling-milestone-reached' : ''} ${isCurrent ? 'leveling-milestone-current' : ''}`}
              >
                <div className="leveling-milestone-dot">
                  {isReached && <span className="leveling-milestone-check">✓</span>}
                  {isCurrent && <span className="leveling-milestone-star">★</span>}
                </div>
                <div className="leveling-milestone-info">
                  <span className="leveling-milestone-level">Lv {levelNum}</span>
                  <span className="leveling-milestone-xp">{threshold.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* XP Addition Section */}
      <Card variant="default" padding="md" className="leveling-xp-actions">
        <h4 className="leveling-actions-title">Add Experience</h4>

        {/* Quick Add Buttons */}
        <div className="leveling-quick-add">
          <span className="leveling-quick-label">Quick Add</span>
          <div className="leveling-quick-grid">
            <Button variant="outline" size="md" onClick={() => addXP(50)} leftIcon={Zap}>+50 XP</Button>
            <Button variant="outline" size="md" onClick={() => addXP(100)} leftIcon={Zap}>+100 XP</Button>
            <Button variant="outline" size="md" onClick={() => addXP(300)} leftIcon={Zap}>+300 XP</Button>
            <Button variant="outline" size="md" onClick={() => addXP(1000)} leftIcon={Zap}>+1,000 XP</Button>
          </div>
        </div>

        {/* Custom XP Input */}
        <div className="leveling-custom-xp">
          <Input
            type="number"
            label="Custom XP Amount"
            value={xpAmount.toString()}
            onChange={(e) => setXpAmount(Number(e.target.value))}
            min="1"
            helperText="Enter a custom amount of XP to add"
            size="md"
          />
          <Button
            variant="primary"
            size="lg"
            onClick={() => addXP(xpAmount)}
            leftIcon={Star}
            className="leveling-add-button"
          >
            Add {xpAmount.toLocaleString()} XP
          </Button>
        </div>
      </Card>

      {/* Character Stats */}
      <Card variant="default" padding="md" className="leveling-stats-card">
        <h4 className="leveling-stats-title">Current Stats</h4>
        <div className="leveling-stats-grid">
          <div className="leveling-stat-item leveling-stat-hp">
            <div className="leveling-stat-icon">
              <Heart size={20} />
            </div>
            <div className="leveling-stat-info">
              <span className="leveling-stat-label">Hit Points</span>
              <span className="leveling-stat-value">{activeChar.hp.max}</span>
            </div>
          </div>
          <div className="leveling-stat-item leveling-stat-ac">
            <div className="leveling-stat-icon">
              <Shield size={20} />
            </div>
            <div className="leveling-stat-info">
              <span className="leveling-stat-label">Armor Class</span>
              <span className="leveling-stat-value">{activeChar.armor_class}</span>
            </div>
          </div>
          <div className="leveling-stat-item leveling-stat-prof">
            <div className="leveling-stat-icon">
              <Star size={20} />
            </div>
            <div className="leveling-stat-info">
              <span className="leveling-stat-label">Proficiency</span>
              <span className="leveling-stat-value">+{activeChar.proficiency_bonus}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Raw JSON Dump Section */}
      <RawJsonDump
        data={{
          seed: activeChar.seed,
          name: activeChar.name,
          race: activeChar.race,
          class: activeChar.class,
          level: activeChar.level,
          xp: activeChar.xp,
          hp: activeChar.hp,
          armor_class: activeChar.armor_class,
          proficiency_bonus: activeChar.proficiency_bonus,
          ability_scores: activeChar.ability_scores,
        }}
        title="Raw Character Leveling Data"
        timestamp={new Date()}
        status="healthy"
      />
    </div>
  );
}

export default CharacterLevelingTab;
