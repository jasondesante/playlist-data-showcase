# Character Generation Answers

Complete guide to understanding the Playlist Data Engine's character generation system, D&D 5e mechanics, and customization capabilities.

---

## Table of Contents

1. [General D&D 5e Mechanics](#part-1-general-dd-5e-mechanics)
2. [Character Generation Process](#part-2-character-generation-process)
3. [Ability Scores & Modifiers](#part-3-ability-scores--modifiers)
4. [Skills System](#part-4-skills-system)
5. [Appearance System](#part-5-appearance-system)
6. [Equipment System](#part-6-equipment-system)
7. [Spells System](#part-7-spells-system)
8. [Class Features & Racial Traits](#part-8-class-features--racial-traits)
9. [Customization & Extensibility](#part-9-customization--extensibility)
10. [Rogue Bias Analysis](#part-10-rogue-bias-analysis)
11. [UI Tooltip Content](#part-11-ui-tooltip-content)

---

## Part 1: General D&D 5e Mechanics

### Proficiency Bonus

**What is it?** Proficiency Bonus is a number (ranging from +2 to +6) that represents your character's overall competence and training. It adds to many actions your character is proficient in.

**How it works in D&D 5e:**
- You add your Proficiency Bonus to:
  - Attack rolls with weapons you're proficient with
  - Ability checks with skills you're proficient in
  - Saving throws with abilities you're proficient in
  - Spell attack rolls

**Progression by level:**
| Level | Proficiency Bonus |
|-------|-------------------|
| 1-4   | +2                |
| 5-8   | +3                |
| 9-12  | +4                |
| 13-16 | +5                |
| 17-20 | +6                |

**File:** `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts` (lines 212-219)

---

### Speed

**What is it?** Speed is how many feet your character can move in one turn (6 seconds) in combat.

**How it's used in D&D 5e:**
- On your turn, you can move up to your speed in feet
- You can split this movement up before and after your actions
- Some conditions can reduce your speed (prone, restrained, etc.)
- Some races have different speeds (most have 30 ft, Dwarves/Halflings have 25 ft)

**Example:** A character with 30 ft speed can move 30 feet, attack, then move 0 more (they've used all their speed). Or they could move 15 feet, attack, then move 15 more.

---

### Initiative

**What is it?** Initiative determines turn order in combat. Higher initiative means you act earlier.

**How it works in D&D 5e:**
- At the start of combat, everyone rolls a d20 and adds their Dexterity modifier
- Ties are decided by who has higher Dexterity, then by rolling off
- Once set, initiative stays the same for the entire combat
- Round robin: highest → lowest, then back to highest

**Formula:** `Initiative = d20 roll + DEX modifier`

**In the engine:** Initiative is calculated as just the DEX modifier (the roll happens during combat initialization).

---

### Armor Class (AC)

**What is it?** Armor Class is how hard you are to hit. Attackers must roll equal to or higher than your AC to hit you.

**How it works in D&D 5e:**
- Base AC = 10 + DEX modifier (when wearing no armor)
- Armor adds to this base (e.g., Leather Armor = 11 + DEX)
- Shields add +2 to AC
- Some features (like Defensive Duelist) can increase AC temporarily

**Armor Types & AC:**
| Armor Type | AC Calculation | Stealth Disadvantage? |
|------------|---------------|----------------------|
| No Armor   | 10 + DEX      | No                   |
| Leather    | 11 + DEX      | No                   |
| Scale Mail | 14 + DEX (max 2) | Yes            |
| Chain Mail | 16           | Yes                  |
| Plate      | 18           | Yes                  |
| Shield     | +2           | -                    |

---

### Ability Modifiers

**What are they?** Modifiers represent how good your character is at something. They're derived from your ability scores.

**Formula:** `Modifier = floor((Ability Score - 10) / 2)`

**Examples:**
| Score | Modifier | Meaning                 |
|-------|----------|------------------------|
| 20    | +5       | Heroic ability         |
| 18    | +4       | Exceptional            |
| 16    | +3       | Very good              |
| 14    | +2       | Above average          |
| 12    | +1       | Slightly above average |
| 10    | +0       | Average                |
| 8     | -1       | Below average          |
| 6     | -2       | Poor                   |
| 1     | -5       | Minimal ability        |

**What they do:**
- Add to attack rolls with STR/DEX attacks
- Add to damage rolls with STR/DEX attacks
- Add to ability checks (skills)
- Add to saving throws
- Determine spell DC for casters: `8 + proficiency + ability modifier`

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/AbilityScoreCalculator.ts` (lines 98-107)

---

### Skills

**How do skills work in D&D 5e?**

Skills represent specific trained abilities. There are 18 skills in D&D 5e:

**Skill List (18 total):**
- **STR-based:** Athletics
- **DEX-based:** Acrobatics, Sleight of Hand, Stealth
- **INT-based:** Arcana, History, Investigation, Nature, Religion
- **WIS-based:** Animal Handling, Insight, Medicine, Perception, Survival
- **CHA-based:** Deception, Intimidation, Performance, Persuasion

**Proficiency Levels:**
- **None:** Just roll the d20 + ability modifier
- **Proficient (★):** Roll d20 + ability modifier + proficiency bonus
- **Expertise (★★):** Roll d20 + ability modifier + 2× proficiency bonus (Bard/Rogue only)

**Example:**
- A character with +3 DEX modifier and +2 proficiency bonus
- Stealth not proficient: `d20 + 3`
- Stealth proficient: `d20 + 3 + 2 = d20 + 5`
- Stealth expertise: `d20 + 3 + 4 = d20 + 7`

**Why skills stay at -1 when leveling up:**
Skills that aren't proficient don't automatically improve. Only ability score increases (from leveling) improve those modifiers. Proficient skills improve because proficiency bonus increases.

**File:** `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts` (lines 270-299)

---

### Saving Throws

**What are saving throws?** Saving throws (or "saves") represent your ability to resist something bad happening to you.

**How they work:**
- Roll a d20 + ability modifier + proficiency bonus (if proficient)
- Must meet or beat a DC (Difficulty Class) set by the effect
- Different abilities are used for different threats

**Common saving throws:**
- **DEX saves:** Dodging fireballs, traps, falling
- **CON saves:** Resisting poison, disease, holding breath
- **WIS saves:** Resisting illusions, charms, mind control
- **STR saves:** Escaping grapples, forced movement
- **INT saves:** Figuring out illusions, mental puzzles
- **CHA saves:** Resisting banishment, possession

**In D&D 5e:** Each class is proficient in 2 specific saving throws.
- Barbarian: STR, CON
- Bard: DEX, CHA
- Cleric: WIS, CHA
- Druid: INT, WIS
- Fighter: STR, CON
- Monk: STR, DEX
- Paladin: WIS, CHA
- Ranger: STR, DEX
- Rogue: DEX, INT
- Sorcerer: CON, CHA
- Warlock: WIS, CHA
- Wizard: INT, WIS

**File:** `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts` (CLASS_DATA, lines 61-186)

---

### Racial Traits

**How do racial traits work?** Racial traits are special abilities that your character has based on their race. These are innate abilities that all members of that race share.

**Common racial traits:**
- **Darkvision:** See in darkness (60-120 ft) as if it were dim light
- **Fey Ancestry:** Advantage on saves against charms, magic can't put you to sleep
- **Dwarven Resilience:** Advantage on saves against poison, resistance to poison damage
- **Lucky:** Reroll 1s on attack/ability/saving throw checks
- **Brave:** Advantage on saves against being frightened
- **Breath Weapon:** Breathe elemental energy (damage based on level)
- **Damage Resistance:** Resist damage of a certain type
- **Skill Versatility:** Proficient in any two skills (Half-Elf)
- **Relentless Endurance:** Drop to 1 HP instead of 0 once per long rest
- **Savage Attacks:** Roll weapon damage dice twice on crit

**Are they randomly assigned?** No, racial traits are fixed based on race. All Elves have the same traits (Darkvision, Keen Senses, Fey Ancestry, Trance).

**Can they be changed?** Not in the current engine - they're hardcoded per race.

**Can I add custom racial traits?** Currently no - all racial data is in `constants.ts` and would require engine modifications to extend.

**File:** `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts` (lines 8-58)

---

### Class Features

**How do class features work?** Class features are abilities your character gains as they level up in their class. These represent the special training and talents of your class.

**When do they unlock?** Different features unlock at different levels, specified by D&D 5e rules.

**Example class features:**
- **Fighter Level 2:** Action Surge (extra action), Fighting Style
- **Fighter Level 3:** Martial Archetype (choose Champion, Battle Master, etc.)
- **Rogue Level 2:** Cunning Action (hide/disengage as bonus action)
- **Wizard Level 2:** Arcane Tradition (choose school of magic)
- **Barbarian Level 2:** Reckless Attack, Danger Sense

**Where is the full list?** The current engine does NOT have a comprehensive class features database by level. It only stores:
- Hit dice size
- Saving throw proficiencies
- Available skills
- Whether it's a spellcaster
- Primary ability score

**Can I add custom class features?** Not currently - the engine doesn't track class features beyond basic data.

**File:** `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts` (CLASS_DATA, lines 61-186)

---

## Part 2: Character Generation Process

### Race Selection

**How is race determined?**

Race is selected deterministically using a seeded random number generator. This means:
- Same seed → same race every time
- Seed is typically the track ID

**Algorithm:**
1. Create RNG with seed
2. Randomly select from 9 available races: Human, Elf, Dwarf, Halfling, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling
3. Each race has equal probability (1/9 chance)

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/RaceSelector.ts`

---

### Class Selection

**How is class determined?**

Class is suggested based on the **audio frequency profile** of the music:

**Audio-to-Class Mapping:**
| Audio Trait   | Threshold | Classes (with weights)         |
|---------------|-----------|---------------------------------|
| Bass          | > 0.6     | Barbarian (3), Fighter (2), Paladin (2) |
| Treble        | > 0.6     | Rogue (3), Ranger (2), Monk (2) |
| Mid           | > 0.6     | Wizard (2), Cleric (2), Druid (2) |
| Amplitude     | > 0.5     | Bard (2), Sorcerer (2), Warlock (2) |

**Weighted random selection:** Higher weight = higher chance
- When treble > 0.6: Rogue has 43% chance (3/7), Ranger has 29% (2/7)

**If no strong preferences:** Random from all 12 classes

**Override option:** You can force a specific class with `forceClass` parameter:
```typescript
const character = CharacterGenerator.generate(
    seed,
    audioProfile,
    'Hero',
    { forceClass: 'Wizard' }  // Always Wizard
);
```

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/ClassSuggester.ts`

**See also:** [Part 10: Rogue Bias Analysis](#part-10-rogue-bias-analysis)

---

### Deterministic Generation

**The Golden Rule:** Same seed + same audio = identical character

This is achieved by:
1. Using `SeededRNG` class (pseudo-random number generator)
2. All randomness goes through this seeded generator
3. No system `Math.random()` calls

**Example:**
```typescript
const seed = 'ethereum-0x123abc-1';
const audio1 = await analyzer.extractSonicFingerprint(track1.audio_url);
const audio2 = await analyzer.extractSonicFingerprint(track1.audio_url);  // Same track

const char1 = CharacterGenerator.generate(seed, audio1, 'Hero');
const char2 = CharacterGenerator.generate(seed, audio2, 'Hero');

// char1 === char2 (exact match!)
```

**Use case:** You can cache characters by track ID and never regenerate them.

**File:** `/Users/jasondesante/playlist-data-engine/src/utils/random.ts`

---

## Part 3: Ability Scores & Modifiers

### How Ability Scores Are Generated

**Step 1: Calculate Base Scores (8-15) from Audio**

The engine maps audio frequencies to ability scores:

```typescript
// From AbilityScoreCalculator.calculateBaseScores()
STR  = 8 + (bass_dominance × 7)      // Range: 8-15
DEX  = 8 + (treble_dominance × 7)   // Range: 8-15
CON  = 8 + (average_amplitude × 7)   // Range: 8-15
INT  = 8 + (mid_dominance × 7)      // Range: 8-15
WIS  = 8 + (1 - |bass - treble| × 7) // Balanced frequencies → high WIS
CHA  = 8 + ((mid + amplitude) / 2 × 7) // Combined → CHA
```

**Audio traits** (0.0 to 1.0):
- `bass_dominance`: How strong bass frequencies are
- `mid_dominance`: How strong mid frequencies are
- `treble_dominance`: How strong treble frequencies are
- `average_amplitude`: Overall volume/power

**Step 2: Apply Racial Bonuses**

Each race adds bonuses (usually +2):

| Race       | Bonuses                           |
|------------|-----------------------------------|
| Human      | +1 to ALL abilities               |
| Elf        | DEX +2                            |
| Dwarf      | CON +2                            |
| Halfling   | DEX +2                            |
| Dragonborn | STR +2, CHA +1                   |
| Gnome      | INT +2                            |
| Half-Elf   | CHA +2, +1 to two abilities of choice |
| Half-Orc   | STR +2, CON +1                    |
| Tiefling   | CHA +2, INT +1                    |

**Step 3: Calculate Modifiers**

```typescript
Modifier = floor((Ability Score - 10) / 2)
```

| Score | Modifier |
|-------|----------|
| 8     | -1       |
| 9     | -1       |
| 10    | 0        |
| 11    | 0        |
| 12    | +1       |
| 13    | +1       |
| 14    | +2       |
| 15    | +2       |

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/AbilityScoreCalculator.ts`

---

### How Stats Increase on Level Up

**Standard Mode (stats capped at 20):**
- Stat increases at levels: **4, 8, 12, 16, 19**
- Each increase: **+2 to one ability** OR **+1 to two abilities**
- Stats are capped at 20

**Uncapped Mode (no limits):**
- Stat increases at **EVERY level** (2-∞)
- Each increase: **+2 to one ability** OR **+1 to two abilities**
- No stat cap - grow infinitely!

**Stat Increase Strategies:**
1. **Manual (`dnD5e`)**: User must choose which stats to increase
2. **Smart Auto (`dnD5e_smart`)**: Engine intelligently selects based on class
3. **Balanced**: Always +1 to two lowest stats
4. **Primary Only**: Always +2 to class's primary stat
5. **Random**: Random stat selection
6. **Custom**: Provide your own function!

**File:** `/Users/jasondesante/playlist-data-engine/src/core/progression/stat/StatManager.ts`

---

## Part 4: Skills System

### How Skills Are Assigned

**Step 1: Determine Proficiency Count**
Each class gets a certain number of skill proficiencies:

| Class       | Skills | Expertise? |
|-------------|--------|------------|
| Barbarian   | 2      | No         |
| Bard        | 3      | Yes (2)    |
| Cleric      | 2      | No         |
| Druid       | 2      | No         |
| Fighter     | 2      | No         |
| Monk        | 2      | No         |
| Paladin     | 2      | No         |
| Ranger      | 3      | No         |
| Rogue       | 4      | Yes (2)    |
| Sorcerer    | 2      | No         |
| Warlock     | 2      | No         |
| Wizard      | 2      | No         |

**Step 2: Select Skills from Class List**
Each class has a pool of available skills:

```typescript
// Example: Rogue skills (available_skills)
['acrobatics', 'athletics', 'deception', 'insight',
 'intimidation', 'investigation', 'perception', 'performance',
 'persuasion', 'sleight_of_hand', 'stealth']

// Rogues get 4 skills, randomly selected from this pool
// Bards/Rogues get 2 expertise skills (double proficiency bonus)
```

**Step 3: Random Selection**
The seeded RNG selects the specified number of skills from the class's pool.

**Can I add custom skills?** Not currently - the 18 skills are hardcoded. Would require engine modifications to add new skills.

**File:** `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts` (lines 270-299)

---

## Part 5: Appearance System

### All Appearance Options

**Body Types (4 options):**
- `slender` - Lean, wiry build
- `athletic` - Fit, toned build
- `muscular` - Bulk, powerful build
- `stocky` - Solid, broad build

**Skin Tones (6 shades):**
- `#F5E6D3` - Fair
- `#E8C4A0` - Light
- `#D4A574` - Medium
- `#C68642` - Tan
- `#8D5524` - Brown
- `#5C3317` - Dark

**Hair Colors (10 options):**
- `#1C1C1C` - Black
- `#3B2414` - Dark Brown
- `#6A4E23` - Brown
- `#A67B5B` - Light Brown
- `#D4AF37` - Blonde
- `#E9C2A6` - Light Blonde
- `#B55239` - Auburn
- `#DC143C` - Red
- `#C0C0C0` - Gray
- `#FFFFFF` - White

**Hair Styles (10 options):**
- `short`, `long`, `bald`, `braided`, `curly`, `wavy`, `straight`, `ponytail`, `mohawk`, `dreadlocks`

**Eye Colors (6 options):**
- `#3B2414` - Brown
- `#6F4E37` - Hazel
- `#228B22` - Green
- `#4169E1` - Blue
- `#708090` - Gray
- `#000000` - Black

**Facial Features (10 options):**
1-3 features randomly selected from:
- `scar on cheek`
- `tattoo on forehead`
- `piercing`
- `freckles`
- `beard`
- `mustache`
- `clean-shaven`
- `birthmark`
- `sharp jawline`
- `soft features`

**Dynamic Colors (from audio):**
- `primary_color`: Main color from album art (via ColorPalette)
- `secondary_color`: Secondary color from album art
- `aura_color`: For magical classes only (Wizard, Sorcerer, Warlock, Bard, Cleric, Druid, Paladin)
  - If primary color exists: brightened version of it
  - Otherwise: class-specific default (Wizard=blue, Sorcerer=red, etc.)

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/AppearanceGenerator.ts`

---

### Can I Customize Appearance?

**Current state:** All appearance options are hardcoded arrays in `AppearanceGenerator.ts`.

**To customize:**
1. Modify the source arrays (BODY_TYPES, SKIN_TONES, etc.)
2. Rebuild the data engine
3. No runtime extensibility currently exists

**Future improvements would need:**
- API methods to add custom options
- Example: `AppearanceGenerator.addCustomSkinTones(['#...', '#...'])`

---

## Part 6: Equipment System

### How Equipment Works

**Starting Equipment by Class:**

Each class starts with specific gear:

| Class      | Weapons              | Armor                | Items                              |
|------------|---------------------|----------------------|------------------------------------|
| Barbarian  | Greataxe, Handaxe   | No Armor             | Explorer's Pack, Javelin           |
| Bard       | Rapier, Dagger      | Leather Armor        | Lute, Entertainer's Pack, Dagger   |
| Cleric     | Mace, Light Crossbow| Scale Mail, Shield   | Holy Symbol, Priest's Pack, Healer's Kit |
| Druid      | Quarterstaff, Dagger| Leather Armor, Shield| Druidic Focus, Explorer's Pack     |
| Fighter    | Longsword, Shield   | Chain Mail           | Martial Melee Weapon, Bedroll, Rope |
| Monk       | Shortsword          | No Armor             | Insignia, Traveler's Pack, Dart    |
| Paladin    | Longsword, Shield   | Chain Mail           | Holy Symbol, Priest's Pack         |
| Ranger     | Longsword, Shortsword, Longbow | Leather Armor, Dagger | **Arrows (20)**, Explorer's Pack |
| Rogue      | Rapier, Hand Crossbow| Leather Armor        | Burglar's Pack, Thieves' Tools, Dagger |
| Sorcerer   | Light Crossbow, Dagger| Leather Armor      | Arcane Focus, Dungeoneer's Pack    |
| Warlock    | Light Crossbow, Dagger| Leather Armor      | Arcane Focus, Scholar's Pack       |
| Wizard     | Quarterstaff, Dagger| No Armor             | Spellbook, Component Pouch, Scholar's Pack, Ink & Quill |

**Equipment Database Structure:**
```typescript
interface Equipment {
    name: string;
    type: 'weapon' | 'armor' | 'item';
    rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
    weight: number;  // pounds
}
```

**Examples:**
```typescript
'Greataxe':   { name: 'Greataxe',   type: 'weapon', rarity: 'common', weight: 7 }
'Chain Mail': { name: 'Chain Mail', type: 'armor',  rarity: 'common', weight: 55 }
'Arrows (20)':{ name: 'Arrows (20)',type: 'item',   rarity: 'common', weight: 1 }
```

**Files:**
- `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts` (lines 669-799)
- `/Users/jasondesante/playlist-data-engine/src/core/generation/EquipmentGenerator.ts`

---

### How Equipping Works

**Functions Available:**

```typescript
// Equip an item
EquipmentGenerator.equipItem(equipment, 'Longsword')

// Unequip an item
EquipmentGenerator.unequipItem(equipment, 'Longsword')

// Add item to inventory
EquipmentGenerator.addItem(equipment, 'Potion', 3)  // Add 3 potions

// Remove item from inventory
EquipmentGenerator.removeItem(equipment, 'Potion', 1)  // Use 1 potion
```

**What happens when you equip something?**
1. The item's `equipped` property is set to `true`
2. `equippedWeight` is recalculated (only counts equipped items)
3. `totalWeight` stays the same (all items)

**Does equipping affect stats or combat?**
**Currently:** No. The engine tracks what's equipped but doesn't apply any stat bonuses or combat effects from equipment.

**What SHOULD happen (not implemented):**
- Armor should increase AC
- Weapons should add attack options
- Magic items should grant bonuses
- Shields should add +2 AC

---

### Weight Calculation

**How it's calculated:**

```typescript
totalWeight = Σ(item.weight × item.quantity) for all items
equippedWeight = Σ(item.weight) for equipped items only
```

**Example:**
```typescript
weapons: [
  { name: 'Longsword', quantity: 1, equipped: true },  // 3 lbs
  { name: 'Dagger', quantity: 2, equipped: false }    // 1 lb × 2 = 2 lbs
]
armor: [
  { name: 'Chain Mail', quantity: 1, equipped: true } // 55 lbs
]
items: [
  { name: 'Rope', quantity: 1, equipped: false }      // 1 lb
]

totalWeight = 3 + 2 + 55 + 1 = 61 lbs
equippedWeight = 3 + 55 = 58 lbs
```

**Function:** `EquipmentGenerator.calculateTotalWeight()` (private method)

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/EquipmentGenerator.ts` (lines 312-341)

---

### BUG: "Arrows (20)" Issue

**The Problem:**
- Current: `Arrows (20)` is a single item with quantity 1, weighing 1 lb
- Should be: `Arrow` with quantity 20, weighing 0.05 lb each (1 lb total)

**Impact:**
- Can't track individual arrows properly
- Can't easily add/remove arrows (e.g., "I shoot 3 arrows")
- Inconsistent with D&D 5e rules
- Prevents using gold as an item (would need "Gold Pieces (100)")

**Ammunition Items Affected:**
- `Arrows (20)` → should be `Arrow` × 20
- `Bolts (20)` → should be `Bolt` × 20
- `Dart` (already single, could add quantity)

**Proposed Fix:**

```typescript
// BEFORE (current)
'Arrows (20)': { name: 'Arrows (20)', type: 'item', rarity: 'common', weight: 1 }

// AFTER (fixed)
'Arrow': { name: 'Arrow', type: 'item', rarity: 'common', weight: 0.05 }

// Starting equipment changes from:
items: ['Arrows (20)']
// To:
items: []  // Then add 20 arrows programmatically
```

**Code Changes Needed:**
1. Update `EQUIPMENT_DATABASE` in constants.ts
2. Update `CLASS_STARTING_EQUIPMENT` for Ranger
3. Add logic to `initializeEquipment()` to set quantity for ammunition

**Would also enable:**
- Gold as an item: `Gold Piece` with weight 0.02 lb, quantity 100+
- Tracking ammunition usage in combat
- Proper encumbrance rules

---

## Part 7: Spells System

### How Spells Work

**Spellcasting Classes:**
- Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, Wizard
- Barbarian, Fighter, Monk, Rogue do NOT cast spells

**Three Types of Magical Abilities:**

1. **Cantrips (Level 0 spells):**
   - Always known, unlimited uses
   - Scale with character level (more damage at higher levels)
   - Examples: Fire Bolt, Mage Hand, Light, Sacred Flame

2. **Known Spells:**
   - Learned as you level up
   - Require spell slots to cast
   - More powerful than cantrips

3. **Spell Slots:**
   - Limited resource that replenishes on long rest
   - Each slot level (1-9) has a certain number of uses
   - Higher level spells use higher level slots

**Example Spell Slots by Level (Wizard):**

| Level | 1st | 2nd | 3rd | 4th | 5th | 6th | 7th | 8th | 9th |
|-------|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| 1     | 2   | -   | -   | -   | -   | -   | -   | -   | -   |
| 2     | 3   | -   | -   | -   | -   | -   | -   | -   | -   |
| 3     | 4   | 2   | -   | -   | -   | -   | -   | -   | -   |
| 10    | 4   | 3   | 3   | 3   | 2   | -   | -   | -   | -   |
| 20    | 4   | 3   | 3   | 3   | 3   | 2   | 2   | 1   | 1   |

**Files:**
- `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts` (lines 317-654)
- `/Users/jasondesante/playlist-data-engine/src/core/generation/SpellManager.ts`

---

### Spell Database

**Complete Spell List (38 spells):**

**Cantrips (10):**
- Acid Splash, Fire Bolt, Light, Mage Hand, Mending, Message, Prestidigitation, Sacred Flame, Shocking Grasp, Vicious Mockery

**1st Level (15):**
- Burning Hands, Charm Person, Cure Wounds, Detect Magic, Disguise Self, Expeditious Retreat, False Life, Feather Fall, Grease, Healing Word, Identify, Mage Armor, Magic Missile, Shield, Sleep, Thunderwave

**2nd Level (11):**
- Acid Arrow, Blur, Detect Thoughts, Hold Person, Invisibility, Knock, Misty Step, Mirror Image, Scorching Ray, Shatter, Suggestion

**3rd Level (8):**
- Animate Dead, Blink, Counterspell, Dispel Magic, Fireball, Lightning Bolt, Major Image, Sleet Storm, Telekinesis

**4th Level (4):**
- Dimension Door, Greater Invisibility, Polymorph, Stoneskin

**5th Level (2):**
- Cone of Cold, Teleportation Circle

**Each Spell Has:**
```typescript
interface Spell {
    name: string;
    level: number;        // 0-5 in current DB
    school: string;       // Evocation, Illusion, etc.
    casting_time: string;
    range: string;
    components: string[]; // V, S, M (Verbal, Somatic, Material)
    duration: string;
}
```

**File:** `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts` (lines 317-382)

---

### Class Spell Lists

**Each class has different spells available:**

| Class    | Cantrips | 1st Level Spells (examples)            |
|----------|----------|----------------------------------------|
| Wizard   | 8        | 15 spells (Burning Hands, Fireball...) |
| Sorcerer | 7        | 15 spells (similar to Wizard)         |
| Bard     | 6        | 11 spells (Charm Person, Sleep...)     |
| Cleric   | 4        | 9 spells (Cure Wounds, Healing Word...) |
| Druid    | 3        | 8 spells (Burning Hands, Cure Wounds...) |
| Paladin  | 0        | 7 spells (Burning Hands, Cure Wounds...) |
| Ranger   | 0        | 5 spells (Detect Magic, Invisibility...) |
| Warlock  | 6        | 8 spells (Burning Hands, Hex, Magic Missile...) |

**How spells are learned:**
- At level 1: Get class's cantrips and 1st level spells
- At higher levels: Automatically learn all spells up to your level
- No choice involved - all spells in the class list are "known"

**Function:** `SpellManager.getKnownSpells(characterClass, characterLevel)`

---

### How to Use Spells in Combat

**The combat engine DOES support spells!**

```typescript
// Check if caster has spell slot available
if (SpellCaster.hasSpellSlot(caster, 3)) {
    // Cast the spell
    const result = SpellCaster.castSpell(caster, spell, targets);

    // Result includes:
    // - Whether it succeeded
    // - Damage dealt
    // - Status effects applied
    // - Spell slot consumed
}
```

**What happens during spell casting:**
1. Check if spell slot is available
2. Consume the spell slot
3. Roll attack (if spell requires it) or force saving throw
4. Apply damage/effects
5. Record action in combat history

**Files:**
- `/Users/jasondesante/playlist-data-engine/src/core/combat/SpellCaster.ts`

---

### Can I Add Custom Spells?

**Current state:** No - all spells are hardcoded in `SPELL_DATABASE`.

**To add custom spells, you would need to:**
1. Modify `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts`
2. Add your spell to `SPELL_DATABASE`:
```typescript
'My Custom Spell': {
    name: 'My Custom Spell',
    level: 3,
    school: 'Evocation',
    casting_time: '1 action',
    range: '60 feet',
    components: ['V', 'S'],
    duration: 'Instantaneous'
}
```
3. Add it to a class's spell list in `CLASS_SPELL_LISTS`
4. Rebuild the data engine

**No runtime extensibility currently exists.**

**Future improvement would be:**
```typescript
// Desired API (doesn't exist yet)
CharacterGenerator.generate(seed, audio, name, {
    customSpells: {
        'My Spell': { name: 'My Spell', level: 2, ... },
        addToList: 'Wizard'  // Add to Wizard's spells
    }
});
```

---

## Part 8: Class Features & Racial Traits

### Where Are Class Features Stored?

**Current state:** The engine only stores BASIC class data:

```typescript
interface ClassData {
    primary_ability: Ability;
    hit_die: number;              // d8, d10, d12
    saving_throws: Ability[];
    is_spellcaster: boolean;
    skill_count: number;
    available_skills: Skill[];
    has_expertise: boolean;
    expertise_count?: number;
}
```

**What's MISSING:**
- No list of features by level
- No feature descriptions
- No feature effects

**This means:**
- Class features are not tracked
- They can't be displayed in UI
- They don't affect mechanics

**File:** `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts` (lines 61-186)

---

### Where Are Racial Traits Stored?

**Racial traits ARE stored:**

```typescript
interface RaceData {
    ability_bonuses: Partial<Record<Ability, number>>;
    speed: number;
    traits: string[];  // ← List of trait names
}
```

**Example (Elf):**
```typescript
'Elf': {
    ability_bonuses: { DEX: 2 },
    speed: 30,
    traits: ['Darkvision', 'Keen Senses', 'Fey Ancestry', 'Trance']
}
```

**But:**
- Only trait NAMES are stored
- No descriptions of what traits do
- No mechanical effects implemented

**File:** `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts` (lines 8-58)

---

### Can I Add Custom Class Features?

**No, because:**
1. There's no feature database to extend
2. The generation system doesn't assign features
3. The UI wouldn't know how to display them

**To add custom features would require:**
1. Create `CLASS_FEATURES` database
2. Map features to levels
3. Update `CharacterGenerator` to assign features
4. Update UI to display features
5. Implement mechanical effects

**This is a significant addition to the engine.**

---

### Can I Add Custom Racial Traits?

**Sort of:**
- You can add trait **names** to the traits array
- But they won't have descriptions or effects
- It's cosmetic only

**Example:**
```typescript
'CustomRace': {
    ability_bonuses: { STR: 2 },
    speed: 30,
    traits: ['My Custom Trait', 'Another Trait']
}
```

**To implement effects:**
- Need to add trait descriptions database
- Need to implement trait logic in combat/progression
- Currently not supported

---

## Part 9: Customization & Extensibility

### What CAN Be Customized?

**Currently (requires engine rebuild):**
- ✅ Add new races (modify `RACE_DATA`)
- ✅ Add new classes (modify `CLASS_DATA`)
- ✅ Add new spells (modify `SPELL_DATABASE`, `CLASS_SPELL_LISTS`)
- ✅ Add new equipment (modify `EQUIPMENT_DATABASE`, `CLASS_STARTING_EQUIPMENT`)
- ✅ Add new skills (modify skill type and `SKILL_ABILITY_MAP`)
- ✅ Add new appearance options (modify arrays in `AppearanceGenerator`)

**All require:**
1. Editing `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts`
2. Potentially editing other source files
3. Rebuilding the data engine (`npm run build`)
4. No runtime configuration

---

### What CANNOT Be Customized (currently)?

**Without engine modifications:**
- ❌ Add custom data at runtime
- ❌ Merge custom lists with engine lists
- ❌ Add class features with effects
- ❌ Implement racial trait mechanics
- ❌ Apply equipment bonuses to stats/combat
- ❌ Custom spell effects

---

### Extensibility: Current vs Desired

**Current State:**
```typescript
// All data hardcoded - no extensibility
const SPELL_DATABASE = { 'Fire Bolt': {...}, 'Cure Wounds': {...} };

// Can only use built-in data
const character = CharacterGenerator.generate(seed, audio, name);
```

**Desired State (user's vision):**
```typescript
// Engine comes with standard data
const character = CharacterGenerator.generate(seed, audio, name, {
    // User can provide expansions
    customSpells: [
        { name: 'My Spell', level: 3, school: 'Evocation', ... }
    ],
    customEquipment: [
        { name: 'Flaming Sword', type: 'weapon', rarity: 'rare', weight: 5 }
    ],
    customRaces: [
        { name: 'Dragonfolk', ability_bonuses: { STR: 2, CHA: 1 }, ... }
    ]
});

// Standard + custom data merged automatically
// New characters can generate with expanded options
```

---

### How to Achieve Extensibility

**Option 1: Modify Engine Source (recommended)**

Add extension parameters to `CharacterGenerator.generate()`:

```typescript
// In CharacterGenerator.ts
interface CharacterGeneratorOptions {
    level?: number;
    forceClass?: Class;
    gameMode?: GameMode;

    // NEW: Extension options
    customRaces?: Record<string, RaceData>;
    customClasses?: Record<string, ClassData>;
    customSpells?: Record<string, Spell>;
    customEquipment?: Record<string, Equipment>;
    customAppearance?: {
        bodyTypes?: string[];
        skinTones?: string[];
        hairColors?: string[];
        // ...
    };
}
```

**Implementation:**
1. Merge custom data with standard data
2. Pass merged data to selectors/generators
3. Rebuild engine

**Option 2: App-Level Wrapper (workaround)**

Don't modify engine - build wrapper in this app:

```typescript
// In this app
import { CharacterGenerator } from 'playlist-data-engine';
import { CUSTOM_SPELLS, CUSTOM_EQUIPMENT } from './custom-data';

function generateExtendedCharacter(seed, audio, name) {
    // Generate base character
    const character = CharacterGenerator.generate(seed, audio, name);

    // Add custom spells manually
    character.spells = {
        ...character.spells,
        custom_spells: CUSTOM_SPELLS[character.class]
    };

    // Add custom equipment manually
    character.equipment = mergeCustomEquipment(
        character.equipment,
        CUSTOM_EQUIPMENT
    );

    return character;
}
```

**Limitation:** Custom content won't be used during generation, only added after.

---

### Recommendation

**For maximum flexibility:**
1. Modify engine to support extension parameters
2. This allows custom content to influence generation
3. Cleaner API for users
4. Reusable across projects

**Example API:**
```typescript
// User creates custom data file
const myCustomContent = {
    spells: {
        'Phoenix Fire': {
            name: 'Phoenix Fire',
            level: 5,
            school: 'Evocation',
            casting_time: '1 action',
            range: 'Self (30-foot radius)',
            components: ['V', 'S'],
            duration: 'Instantaneous'
        }
    },
    equipment: {
        'Phoenix Blade': {
            name: 'Phoenix Blade',
            type: 'weapon',
            rarity: 'very_rare',
            weight: 3
        }
    }
};

// Use it in generation
const character = CharacterGenerator.generate(
    seed,
    audio,
    'Phoenix Knight',
    {
        forceClass: 'Wizard',
        customSpells: myCustomContent.spells,
        customEquipment: myCustomContent.equipment
    }
);
```

---

## Part 10: Rogue Bias Analysis

### The Problem

**User observed:** Generated 5 characters from an album: Elf/Rogue, Elf/Rogue, Half-Elf/Rogue, Human/Rogue, Dwarf/Ranger.

**Question:** Is this just chance, or is there a bias?

**Answer:** **There is a structural bias in the code.**

---

### Root Cause Analysis

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/ClassSuggester.ts`

**The Algorithm:**
```typescript
// Line 52-54
if (treble_dominance > 0.6) {
    weights.push(['Rogue', 3], ['Ranger', 2], ['Monk', 2]);
}
```

**Weighted Random Selection:**
- Total weight = 3 + 2 + 2 = **7**
- Rogue probability = **3/7 = 42.9%**
- Ranger probability = **2/7 = 28.6%**
- Monk probability = **2/7 = 28.6%**

**Why treble is common:**
- Electronic music → high treble
- Hip-hop → high treble
- Pop → high treble
- Many modern genres → treble-heavy

**The threshold (0.6) is easily hit:**
- 60% treble dominance triggers Rogue bias
- This is common in modern music production

---

### Similar Biases Exist

| Audio Trait | Threshold | Biased Class | Weight |
|-------------|-----------|--------------|--------|
| Bass        | > 0.6     | Barbarian    | 3      |
| Treble      | > 0.6     | Rogue        | 3      |
| Mid         | > 0.6     | Equal (all 2) | -     |
| Amplitude   | > 0.5     | Equal (all 2) | -     |

**So Barbarians are also over-represented in bass-heavy music (metal, EDM, etc.)**

---

### Proposed Fixes

**Fix 1: Equalize All Weights**
```typescript
// BEFORE
if (treble_dominance > 0.6) {
    weights.push(['Rogue', 3], ['Ranger', 2], ['Monk', 2]);
}

// AFTER
if (treble_dominance > 0.6) {
    weights.push(['Rogue', 2], ['Ranger', 2], ['Monk', 2]);
}
```
**Result:** 33% each (even distribution)

**Fix 2: Add More Class Variety**
```typescript
if (treble_dominance > 0.6) {
    weights.push(
        ['Rogue', 2],
        ['Ranger', 2],
        ['Monk', 2],
        ['Bard', 1],      // NEW
        ['Sorcerer', 1]   // NEW (CHA also high in treble music)
    );
}
```
**Result:** More variety, less predictability

**Fix 3: Adjust Thresholds**
```typescript
// Make it harder to trigger treble bias
if (treble_dominance > 0.75) {  // Was 0.6
    weights.push(['Rogue', 2], ['Ranger', 2], ['Monk', 2]);
}
```
**Result:** Bias triggers less often

**Fix 4: Multi-Factor Analysis**
```typescript
// Consider multiple audio traits together
if (treble_dominance > 0.6 && mid_dominance < 0.3) {
    // High treble, low mid → Bard/Sorcerer
    weights.push(['Bard', 3], ['Sorcerer', 3]);
} else if (treble_dominance > 0.6) {
    // High treble, other frequencies present → Rogue/Ranger/Monk
    weights.push(['Rogue', 2], ['Ranger', 2], ['Monk', 2]);
}
```
**Result:** More nuanced mapping

---

### Recommended Solution

**Combine Fix 1 + Fix 2:**
1. Equalize weights to 2 for all classes
2. Add more variety to each frequency category
3. Ensure better class distribution

**Proposed Code:**
```typescript
// High bass = strength classes
if (bass_dominance > 0.6) {
    weights.push(
        ['Barbarian', 2],
        ['Fighter', 2],
        ['Paladin', 2],
        ['Monk', 1]  // NEW - physical discipline
    );
}

// High treble = dexterity classes
if (treble_dominance > 0.6) {
    weights.push(
        ['Rogue', 2],
        ['Ranger', 2],
        ['Monk', 2],
        ['Fighter', 1]  // NEW - also uses DEX
    );
}

// High mid = intelligence/wisdom classes
if (mid_dominance > 0.6) {
    weights.push(
        ['Wizard', 2],
        ['Cleric', 2],
        ['Druid', 2],
        ['Ranger', 1]  // NEW - WIS-based
    );
}

// High amplitude = charisma classes
if (average_amplitude > 0.5) {
    weights.push(
        ['Bard', 2],
        ['Sorcerer', 2],
        ['Warlock', 2],
        ['Paladin', 1]  // NEW - also CHA-based
    );
}
```

**This provides:**
- ✅ No single class has 43% chance
- ✅ Better variety within each audio type
- ✅ More interesting and balanced generation
- ✅ Maintains audio-to-class logic

---

## Part 11: UI Tooltip Content

**2-4 sentence explanations for each character sheet section:**

### General Stats

**Proficiency Bonus:**
A measure of your overall training that adds to attacks, skills, and saving throws you're proficient with. Starts at +2 and increases to +6 by level 17. You add this bonus whenever you use something your character has specifically trained in.

**Speed:**
How many feet your character can move in one 6-second turn during combat. Most races have 30 feet speed (Dwarves and Halflings have 25). You can split this movement before and after your actions.

**Initiative:**
Your reflexes and reaction time in combat. Higher initiative means you act earlier in the turn order. Calculated as your Dexterity modifier plus the roll of a d20 when combat begins.

**Armor Class (AC):**
How hard you are to hit in combat. Attackers must roll equal to or higher than this number to successfully strike you. Ranges from 10 (unarmored) up to 20+ (heavy armor with magic), with your Dexterity modifier often adding to this value.

---

### Ability Scores & Modifiers

Ability Scores (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma) represent your character's raw natural talent. Each score has a modifier (ranging from -5 to +5) that you add to related actions—attacks, damage, skill checks, and saving throws. These modifiers are calculated as `floor((score - 10) / 2)`, so a score of 14 gives a +2 modifier while a score of 8 gives a -1.

---

### Saving Throws

Saving throws are your ability to resist sudden threats—dodging fireballs, enduring poison, or shaking off mind control. You roll a d20 plus the relevant ability modifier, plus your proficiency bonus if your class is trained in that saving throw. Each class specializes in two saving throws (like Constitution for Barbarians or Dexterity for Rogues).

---

### Skills

Skills represent specific trained abilities like Stealth, Athletics, or Persuasion. When making a skill check, you roll a d20 plus the ability modifier (like DEX for Stealth) and add your proficiency bonus if you're trained in that skill. Some characters (Bards and Rogues) can have "expertise" in skills, adding double their proficiency bonus for even better results.

---

### Racial Traits

Racial Traits are innate special abilities that all members of your character's race possess. Examples include Darkvision (seeing in darkness), Dwarven Resilience (resisting poison), or Fey Ancestry (resisting magic charms). These traits are passive bonuses that are always active and don't require any action to use.

---

### Class Features

Class Features are special abilities and techniques your character learns as they level up, representing their specialized training. Examples include Action Surge (Fighters can act twice), Rage (Barbarians gain combat bonuses), or Spellcasting (magic users learn to cast spells). Features unlock at specific levels and make each class play differently.

---

### Appearance & Facial Features

Your character's physical appearance is generated deterministically from the music's characteristics—body type, skin tone, hair color and style, eye color, and 1-3 facial features like scars or tattoos are all derived from the audio profile. Magical classes also gain an "aura color" that glows with mystical energy based on the album artwork's color palette.

---

### Equipment

Equipment includes weapons, armor, and adventure gear. Each item has a weight (in pounds) and can be equipped or unequipped. Equipped items contribute to your carried weight, and while the system tracks equipment, stat bonuses from gear are not currently applied to your character. Items can have quantities greater than 1, useful for things like ammunition or consumables.

---

### Spells

Spells are magical abilities that spellcasters can use. Cantrips are weak spells you can cast endlessly, while leveled spells consume "spell slots" (a limited resource that refreshes after a long rest). Each spell has a casting time, range, duration, and effects—spells can deal damage, heal allies, create magical effects, or manipulate the battlefield.

---

**End of Character Generation Answers**

This document covers all aspects of the Playlist Data Engine's character generation system. For questions about implementation or customization, refer to the source files mentioned throughout.
