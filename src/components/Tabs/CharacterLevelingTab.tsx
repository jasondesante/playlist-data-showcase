import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/characterStore';
import { RawJsonDump } from '../ui/RawJsonDump';

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

  const activeChar = characters.length > 0 ? characters[characters.length - 1] : null;

  // Sync currentXP with character when it changes
  useEffect(() => {
    if (activeChar) {
      setCurrentXP(activeChar.xp.current);
    }
  }, [activeChar]);

  const addXP = (amount: number) => {
    if (!activeChar) return;

    const newXP = currentXP + amount;
    setCurrentXP(newXP);

    // Check if we should level up
    let newLevel = activeChar.level;
    let newNextLevel = activeChar.xp.next_level;

    // Simple level-up check (level 1->2 at 300 XP, 2->3 at 900 XP, etc.)
    const xpThresholds = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

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
    }
    console.log(`Added ${amount} XP. Total: ${newXP} (Level ${newLevel})`);
  };

  if (!activeChar) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold">Character Leveling</h2>
        <p className="text-muted-foreground">Generate a character first</p>
      </div>
    );
  }

  const nextLevel = activeChar.xp.next_level;
  const progress = (currentXP / nextLevel) * 100;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Character Leveling</h2>

      <div className="p-6 bg-gradient-to-r from-primary/20 to-accent rounded-lg border border-border">
        <h3 className="text-xl font-bold">{activeChar.name}</h3>
        <p className="text-lg text-muted-foreground">Level {activeChar.level} {activeChar.race} {activeChar.class}</p>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">XP Progress</p>
            <p className="font-mono text-sm">{currentXP} / {nextLevel}</p>
          </div>
          <div className="h-3 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-3">Quick Add XP</label>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => addXP(50)}
              className="px-4 py-2 bg-card border border-border rounded-md hover:bg-accent"
            >
              +50 XP
            </button>
            <button
              onClick={() => addXP(100)}
              className="px-4 py-2 bg-card border border-border rounded-md hover:bg-accent"
            >
              +100 XP
            </button>
            <button
              onClick={() => addXP(300)}
              className="px-4 py-2 bg-card border border-border rounded-md hover:bg-accent"
            >
              +300 XP
            </button>
            <button
              onClick={() => addXP(1000)}
              className="px-4 py-2 bg-card border border-border rounded-md hover:bg-accent"
            >
              +1000 XP
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Custom XP Amount</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={xpAmount}
              onChange={(e) => setXpAmount(Number(e.target.value))}
              className="flex-1 px-3 py-2 bg-background border border-input rounded-md"
              min="1"
            />
            <button
              onClick={() => addXP(xpAmount)}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
            >
              Add XP
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 bg-card border border-border rounded-md">
        <h4 className="font-medium mb-3">Current Stats</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">HP</p>
            <p className="font-bold">{activeChar.hp.max}</p>
          </div>
          <div>
            <p className="text-muted-foreground">AC</p>
            <p className="font-bold">{activeChar.armor_class}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Prof Bonus</p>
            <p className="font-bold">+{activeChar.proficiency_bonus}</p>
          </div>
        </div>
      </div>

      {/* Raw JSON Dump Section - Phase 4.6.1 */}
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
      <p className="text-xs text-muted-foreground">
        This data comes from the CharacterStore and is managed by the CharacterLevelingTab.
        XP changes and level-ups are tracked here via the CharacterUpdater engine module.
      </p>
    </div>
  );
}

export default CharacterLevelingTab;
