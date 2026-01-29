# Character Generation Research Plan

## Instructions for Researchers

This plan contains a checklist of research questions about the Playlist Data Engine's character generation system. Each question should be researched by:

1. **Reading the relevant code** in either:
   - This project: `/Users/jasondesante/playlist-data-showcase`
   - Data Engine: `/Users/jasondesante/playlist-data-engine`

2. **Finding answers** by examining:
   - Source code implementation
   - Data structures and types
   - Database/constant files (spells, equipment, etc.)
   - Function signatures and capabilities

3. **Writing answers** in `CHARACTER_GEN_ANSWERS.md` with:
   - Clear, concise explanation
   - Code examples where relevant
   - File paths to relevant source code
   - Customization capabilities (what can be added/modified)
   - Bug findings or limitations

4. **Checking off** each item when complete

---

## Research Questions

### Part 1: General D&D 5e Mechanics (Educational)

- [ ] **Proficiency** - What is it and how does it work in D&D 5e?
- [ ] **Speed** - What is it and how is it used in traditional D&D?
- [ ] **Initiative** - How does it work and how is it used in traditional D&D?
- [ ] **Armor Class (AC)** - How does it work and how is it used in traditional D&D?
- [ ] **Ability Modifiers** - What do they do and how are they calculated from ability scores?
- [ ] **Skills** - How do skills work in D&D 5e? (proficiency, expertise, modifiers)
- [ ] **Saving Throws** - What are saving throws and how do they work?
- [ ] **Racial Traits** - How do racial traits work in D&D 5e?
- [ ] **Class Features** - How do class features work and unlock?
- [ ] **Spells** - How do spell slots, known spells, and cantrips work?

### Part 2: Character Generation Process

- [ ] **Race Selection** - How is race determined in `CharacterGenerator`?
  - File: `CharacterGenerator.ts` or `RaceSelector.ts` in data engine
  - What algorithm/selectors are used?
  - Why are so many Rogues being generated? (possible bug?)

- [ ] **Class Selection** - How is class determined?
  - File: `ClassSuggester.ts` in data engine
  - What is the relationship between audio profile and class?
  - Is there a bias toward certain classes?

### Part 3: Ability Scores & Modifiers

- [ ] **Ability Score Calculation** - How are ability scores generated?
  - File: `AbilityScoreCalculator.ts` in data engine
  - What is the formula for converting scores to modifiers?
  - Modifier formula: `floor((score - 10) / 2)`

- [ ] **Ability Score Increases** - How do stats increase on level up?
  - At what levels do stats increase? (4, 8, 12, 16, 19 for standard)
  - How does the `StatManager` work?
  - Can stat increases be customized?

### Part 4: Skills System

- [ ] **Skill Assignment** - How are skills assigned to characters?
  - File: `SkillAssigner.ts` in data engine
  - What skills are available for each class?
  - How does proficiency/expertise work?

- [ ] **Custom Skills** - Can I add custom skills to the engine?
  - Where is the skill list defined?
  - How to extend/modify the skill list?

### Part 5: Appearance System

- [ ] **Appearance Generation** - How is appearance generated?
  - File: `AppearanceGenerator.ts` in data engine
  - What are all the options for:
    - Body types?
    - Hair styles?
    - Hair colors?
    - Eye colors?
    - Skin tones?
    - Facial features?

- [ ] **Facial Features** - How do facial features work?
  - Are they influenced by class/race?
  - Can I add custom facial features?
  - How many are assigned per character?

- [ ] **Dynamic Appearance** - How do audio/visual colors affect appearance?
  - How is `primary_color` determined?
  - How is `aura_color` determined?

### Part 6: Equipment System

- [ ] **Equipment Generation** - How is starting equipment determined?
  - File: `EquipmentGenerator.ts` in data engine
  - Where is the equipment database?
  - What equipment does each class start with?

- [ ] **Equipment Database** - Where is the equipment data stored?
  - File: Find `EQUIPMENT_DATABASE` or similar
  - What fields does each item have? (name, weight, type, etc.)
  - How is weight calculated?

- [ ] **Custom Equipment** - Can I add custom items?
  - How do I add items to the equipment database?
  - Can I replace the entire equipment table?
  - Is there a function to add items at runtime?

- [ ] **Equipping Items** - How does equipping work?
  - Is there a function to equip/unequip items?
  - Does equipping affect stats or combat?
  - What does `equipped: true` do?

- [ ] **Weight Calculation** - How is total/equipped weight calculated?
  - Is there a function for this?
  - Does each item have weight data?

- [ ] **BUG: "Arrows (20)"** - Investigate the arrow item issue
  - Find where "Arrows (20)" is defined
  - Should be "Arrow" with quantity 20
  - Propose fix

### Part 7: Spells System

- [ ] **Spell Database** - Where is the spell data stored?
  - File: Find `SPELL_DATABASE` or similar
  - What fields does each spell have?
  - How many spells are in the database?

- [ ] **Spell Learning** - How do characters learn spells?
  - File: `SpellManager.ts` in data engine
  - What's the difference between cantrips and known spells?
  - How are spell slots calculated?

- [ ] **Custom Spells** - Can I add custom spells?
  - How do I add spells to the database?
  - Can I replace the entire spell table?
  - Is there a function to add spells at runtime?

- [ ] **Spell Casting** - How does spell casting work in combat?
  - File: `SpellCaster.ts` in data engine
  - Does combat engine use spells?
  - How are spell slots consumed?

### Part 8: Class Features & Racial Traits

- [ ] **Class Features** - Where is the class features list?
  - How are features unlocked?
  - Can I add custom class features?

- [ ] **Racial Traits** - Where is the racial traits list?
  - File: `RACE_DATA` or similar
  - Can I add custom racial traits?

### Part 9: Customization Capabilities

- [ ] **Extensibility Review** - What can be customized?
  - Races - can I add new races?
  - Classes - can I add new classes?
  - Spells - can I add new spells?
  - Equipment - can I add new equipment?
  - Skills - can I add new skills?
  - Features - can I add new features?

- [ ] **Runtime vs Build-time** - When must custom content be added?
  - Can things be added at runtime?
  - Or must they be in the data engine build?

### Part 10: UI/UX Documentation

- [ ] **Tooltip Content** - Write 2-4 sentence explanations for:
  - [ ] General Stats (proficiency, speed, initiative, armor class)
  - [ ] Ability Scores & Modifiers
  - [ ] Saving Throws
  - [ ] Skills
  - [ ] Racial Traits
  - [ ] Class Features
  - [ ] Appearance & Facial Features
  - [ ] Equipment
  - [ ] Spells

---

## Status Summary

- Total Questions: TBD
- Completed: 0
- In Progress: 0
- Not Started: TBD

## Notes

- Add any findings, bugs, or limitations discovered during research below:

---
