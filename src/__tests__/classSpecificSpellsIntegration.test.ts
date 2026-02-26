/**
 * Class-Specific Spells Integration Tests
 *
 * Phase 8.2 Integration Testing
 * Task: Class-specific spells appear only for that class
 *
 * These tests verify that spells with class restrictions:
 * - Are properly registered with ExtensionManager
 * - Are only returned by SpellQuery.getSpellsForClass() for the correct classes
 * - Do not appear for classes they are not available to
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import {
    ExtensionManager,
    SpellQuery,
    ensureAllDefaultsInitialized
} from 'playlist-data-engine';

/**
 * Test spell data structures
 */

// Spell available to all classes (no classes restriction)
const GENERAL_SPELL = {
    name: 'Arcane Resonance',
    level: 2,
    school: 'Evocation',
    casting_time: '1 action',
    range: '60 feet',
    components: ['V', 'S'],
    duration: '1 minute',
    description: 'Creates a resonant field of arcane energy.',
    source: 'custom'
    // No 'classes' property - should be available to all spellcasters
};

// Spell restricted to Wizard only
const WIZARD_ONLY_SPELL = {
    name: 'Chronomantic Shift',
    level: 5,
    school: 'Transmutation',
    casting_time: '1 action',
    range: 'Self',
    components: ['V', 'S', 'M'],
    duration: 'Instantaneous',
    description: 'Manipulate time around yourself.',
    classes: ['Wizard'],
    source: 'custom'
};

// Spell restricted to Cleric and Paladin
const CLERIC_PALADIN_SPELL = {
    name: 'Divine Judgement',
    level: 4,
    school: 'Evocation',
    casting_time: '1 action',
    range: '120 feet',
    components: ['V', 'S'],
    duration: 'Instantaneous',
    description: 'Call down divine judgment on your enemies.',
    classes: ['Cleric', 'Paladin'],
    source: 'custom'
};

// Spell restricted to multiple spellcasting classes
const MULTI_CLASS_SPELL = {
    name: 'Elemental Fury',
    level: 3,
    school: 'Evocation',
    casting_time: '1 action',
    range: '90 feet',
    components: ['V', 'S', 'M'],
    duration: 'Instantaneous',
    description: 'Unleash elemental fury upon your foes.',
    classes: ['Sorcerer', 'Wizard', 'Druid'],
    source: 'custom'
};

// Unique spell name generator to avoid conflicts
const uniqueName = (base: string) => `${base} ${Date.now()}`;

// Initialize defaults before all tests
beforeAll(() => {
    ensureAllDefaultsInitialized();
});

// Clean up after each test
afterEach(() => {
    const manager = ExtensionManager.getInstance();
    manager.reset('spells');
});

describe('Class-Specific Spells: ExtensionManager Registration', () => {
    it('should register spell with classes property in spells category', () => {
        const manager = ExtensionManager.getInstance();

        manager.register('spells', [WIZARD_ONLY_SPELL], { mode: 'relative', validate: false });

        const allSpells = manager.get('spells');
        const found = allSpells.find((s: any) => s.name === 'Chronomantic Shift');

        expect(found).toBeDefined();
        expect((found as any)?.classes).toContain('Wizard');
    });

    it('should register spell without classes property in spells category', () => {
        const manager = ExtensionManager.getInstance();

        manager.register('spells', [GENERAL_SPELL], { mode: 'relative', validate: false });

        const allSpells = manager.get('spells');
        const found = allSpells.find((s: any) => s.name === 'Arcane Resonance');

        expect(found).toBeDefined();
        expect((found as any)?.classes).toBeUndefined();
    });

    it('should register multiple spells with different class restrictions', () => {
        const manager = ExtensionManager.getInstance();

        manager.register('spells', [
            WIZARD_ONLY_SPELL,
            CLERIC_PALADIN_SPELL,
            MULTI_CLASS_SPELL
        ], { mode: 'relative', validate: false });

        const allSpells = manager.get('spells');

        const wizardSpell = allSpells.find((s: any) => s.name === 'Chronomantic Shift');
        const clericPaladinSpell = allSpells.find((s: any) => s.name === 'Divine Judgement');
        const multiClassSpell = allSpells.find((s: any) => s.name === 'Elemental Fury');

        expect((wizardSpell as any)?.classes).toEqual(['Wizard']);
        expect((clericPaladinSpell as any)?.classes).toEqual(['Cleric', 'Paladin']);
        expect((multiClassSpell as any)?.classes).toEqual(['Sorcerer', 'Wizard', 'Druid']);
    });

    it('should identify custom spells via source field', () => {
        const manager = ExtensionManager.getInstance();

        manager.register('spells', [WIZARD_ONLY_SPELL], { mode: 'relative', validate: false });

        const customSpells = manager.getCustom('spells');
        const found = customSpells.find((s: any) => s.name === 'Chronomantic Shift');

        expect(found).toBeDefined();
        expect((found as any)?.source).toBe('custom');
    });
});

describe('Class-Specific Spells: SpellQuery.getSpellsForClass Filtering', () => {
    let spellQuery: SpellQuery;

    beforeEach(() => {
        spellQuery = SpellQuery.getInstance();
    });

    it('should return wizard-only spell for Wizard class', () => {
        const manager = ExtensionManager.getInstance();

        manager.register('spells', [WIZARD_ONLY_SPELL], { mode: 'relative', validate: false });

        const wizardSpells = spellQuery.getSpellsForClass('Wizard');
        const found = wizardSpells.find((s: any) => s.name === 'Chronomantic Shift');

        expect(found).toBeDefined();
        expect((found as any)?.classes).toContain('Wizard');
    });

    it('should NOT return wizard-only spell for other classes', () => {
        const manager = ExtensionManager.getInstance();

        manager.register('spells', [WIZARD_ONLY_SPELL], { mode: 'relative', validate: false });

        // Test various non-Wizard classes
        const sorcererSpells = spellQuery.getSpellsForClass('Sorcerer');
        const clericSpells = spellQuery.getSpellsForClass('Cleric');
        const bardSpells = spellQuery.getSpellsForClass('Bard');

        expect(sorcererSpells.find((s: any) => s.name === 'Chronomantic Shift')).toBeUndefined();
        expect(clericSpells.find((s: any) => s.name === 'Chronomantic Shift')).toBeUndefined();
        expect(bardSpells.find((s: any) => s.name === 'Chronomantic Shift')).toBeUndefined();
    });

    it('should return spell for all classes in its classes array', () => {
        const manager = ExtensionManager.getInstance();

        manager.register('spells', [CLERIC_PALADIN_SPELL], { mode: 'relative', validate: false });

        const clericSpells = spellQuery.getSpellsForClass('Cleric');
        const paladinSpells = spellQuery.getSpellsForClass('Paladin');

        expect(clericSpells.find((s: any) => s.name === 'Divine Judgement')).toBeDefined();
        expect(paladinSpells.find((s: any) => s.name === 'Divine Judgement')).toBeDefined();
    });

    it('should NOT return spell for classes not in its classes array', () => {
        const manager = ExtensionManager.getInstance();

        manager.register('spells', [CLERIC_PALADIN_SPELL], { mode: 'relative', validate: false });

        const wizardSpells = spellQuery.getSpellsForClass('Wizard');
        const sorcererSpells = spellQuery.getSpellsForClass('Sorcerer');

        expect(wizardSpells.find((s: any) => s.name === 'Divine Judgement')).toBeUndefined();
        expect(sorcererSpells.find((s: any) => s.name === 'Divine Judgement')).toBeUndefined();
    });

    it('should return multi-class spell for all specified classes', () => {
        const manager = ExtensionManager.getInstance();

        manager.register('spells', [MULTI_CLASS_SPELL], { mode: 'relative', validate: false });

        const sorcererSpells = spellQuery.getSpellsForClass('Sorcerer');
        const wizardSpells = spellQuery.getSpellsForClass('Wizard');
        const druidSpells = spellQuery.getSpellsForClass('Druid');

        expect(sorcererSpells.find((s: any) => s.name === 'Elemental Fury')).toBeDefined();
        expect(wizardSpells.find((s: any) => s.name === 'Elemental Fury')).toBeDefined();
        expect(druidSpells.find((s: any) => s.name === 'Elemental Fury')).toBeDefined();
    });

    it('should NOT return multi-class spell for non-specified classes', () => {
        const manager = ExtensionManager.getInstance();

        manager.register('spells', [MULTI_CLASS_SPELL], { mode: 'relative', validate: false });

        const clericSpells = spellQuery.getSpellsForClass('Cleric');
        const bardSpells = spellQuery.getSpellsForClass('Bard');
        const warlockSpells = spellQuery.getSpellsForClass('Warlock');

        expect(clericSpells.find((s: any) => s.name === 'Elemental Fury')).toBeUndefined();
        expect(bardSpells.find((s: any) => s.name === 'Elemental Fury')).toBeUndefined();
        expect(warlockSpells.find((s: any) => s.name === 'Elemental Fury')).toBeUndefined();
    });
});

describe('Class-Specific Spells: Mixed Custom and Default Spells', () => {
    let spellQuery: SpellQuery;

    beforeEach(() => {
        spellQuery = SpellQuery.getInstance();
    });

    it('should include custom wizard spell in wizard spell list', () => {
        const manager = ExtensionManager.getInstance();

        // Register custom wizard spell
        manager.register('spells', [WIZARD_ONLY_SPELL], { mode: 'relative', validate: false });

        const wizardSpells = spellQuery.getSpellsForClass('Wizard');

        // Should include our custom spell
        expect(wizardSpells.find((s: any) => s.name === 'Chronomantic Shift')).toBeDefined();
    });

    it('should filter custom spells correctly alongside default spells', () => {
        const manager = ExtensionManager.getInstance();

        // Register multiple custom spells with different restrictions
        manager.register('spells', [
            WIZARD_ONLY_SPELL,
            CLERIC_PALADIN_SPELL,
            GENERAL_SPELL
        ], { mode: 'relative', validate: false });

        const wizardSpells = spellQuery.getSpellsForClass('Wizard');

        // Wizard should have wizard-only spell
        expect(wizardSpells.find((s: any) => s.name === 'Chronomantic Shift')).toBeDefined();

        // Wizard should NOT have cleric/paladin-only spell
        expect(wizardSpells.find((s: any) => s.name === 'Divine Judgement')).toBeUndefined();

        const clericSpells = spellQuery.getSpellsForClass('Cleric');

        // Cleric should have cleric/paladin spell
        expect(clericSpells.find((s: any) => s.name === 'Divine Judgement')).toBeDefined();

        // Cleric should NOT have wizard-only spell
        expect(clericSpells.find((s: any) => s.name === 'Chronomantic Shift')).toBeUndefined();
    });

    it('should count custom spells in query stats', () => {
        const manager = ExtensionManager.getInstance();

        manager.register('spells', [WIZARD_ONLY_SPELL, CLERIC_PALADIN_SPELL], { mode: 'relative', validate: false });

        const stats = spellQuery.getQueryStats();

        // Should have at least 2 custom spells
        expect(stats.customSpells).toBeGreaterThanOrEqual(2);
        expect(stats.totalSpells).toBeGreaterThan(stats.customSpells);
    });
});

describe('Class-Specific Spells: Spell Data Structure', () => {
    it('should preserve all spell properties after registration', () => {
        const manager = ExtensionManager.getInstance();

        manager.register('spells', [WIZARD_ONLY_SPELL], { mode: 'relative', validate: false });

        const allSpells = manager.get('spells');
        const spell = allSpells.find((s: any) => s.name === 'Chronomantic Shift');

        expect(spell).toBeDefined();
        expect((spell as any)?.level).toBe(5);
        expect((spell as any)?.school).toBe('Transmutation');
        expect((spell as any)?.casting_time).toBe('1 action');
        expect((spell as any)?.range).toBe('Self');
        expect((spell as any)?.components).toEqual(['V', 'S', 'M']);
        expect((spell as any)?.duration).toBe('Instantaneous');
        expect((spell as any)?.description).toBe('Manipulate time around yourself.');
        expect((spell as any)?.classes).toEqual(['Wizard']);
        expect((spell as any)?.source).toBe('custom');
    });

    it('should support spells with single class restriction', () => {
        const manager = ExtensionManager.getInstance();

        manager.register('spells', [WIZARD_ONLY_SPELL], { mode: 'relative', validate: false });

        const allSpells = manager.get('spells');
        const spell = allSpells.find((s: any) => s.name === 'Chronomantic Shift');

        expect((spell as any)?.classes).toHaveLength(1);
        expect((spell as any)?.classes).toContain('Wizard');
    });

    it('should support spells with multiple class restrictions', () => {
        const manager = ExtensionManager.getInstance();

        manager.register('spells', [MULTI_CLASS_SPELL], { mode: 'relative', validate: false });

        const allSpells = manager.get('spells');
        const spell = allSpells.find((s: any) => s.name === 'Elemental Fury');

        expect((spell as any)?.classes).toHaveLength(3);
        expect((spell as any)?.classes).toContain('Sorcerer');
        expect((spell as any)?.classes).toContain('Wizard');
        expect((spell as any)?.classes).toContain('Druid');
    });

    it('should support spells with no class restriction', () => {
        const manager = ExtensionManager.getInstance();

        manager.register('spells', [GENERAL_SPELL], { mode: 'relative', validate: false });

        const allSpells = manager.get('spells');
        const spell = allSpells.find((s: any) => s.name === 'Arcane Resonance');

        expect((spell as any)?.classes).toBeUndefined();
    });
});

describe('Class-Specific Spells: Edge Cases', () => {
    let spellQuery: SpellQuery;

    beforeEach(() => {
        spellQuery = SpellQuery.getInstance();
    });

    it('should handle empty classes array', () => {
        const manager = ExtensionManager.getInstance();

        const spellWithEmptyClasses = {
            ...GENERAL_SPELL,
            name: 'Empty Classes Spell',
            classes: []
        };

        manager.register('spells', [spellWithEmptyClasses], { mode: 'relative', validate: false });

        const allSpells = manager.get('spells');
        const registered = allSpells.find((s: any) => s.name === 'Empty Classes Spell');
        expect(registered).toBeDefined();
    });

    it('should handle non-spellcasting classes gracefully', () => {
        const manager = ExtensionManager.getInstance();

        manager.register('spells', [WIZARD_ONLY_SPELL], { mode: 'relative', validate: false });

        // Query for a non-spellcasting class
        const barbarianSpells = spellQuery.getSpellsForClass('Barbarian');
        const fighterSpells = spellQuery.getSpellsForClass('Fighter');

        // Non-spellcasters should not have wizard-only spell
        expect(barbarianSpells.find((s: any) => s.name === 'Chronomantic Shift')).toBeUndefined();
        expect(fighterSpells.find((s: any) => s.name === 'Chronomantic Shift')).toBeUndefined();
    });

    it('should correctly distinguish custom from default spells', () => {
        const manager = ExtensionManager.getInstance();

        manager.register('spells', [WIZARD_ONLY_SPELL], { mode: 'relative', validate: false });

        const customSpells = manager.getCustom('spells');
        const defaultSpells = manager.getDefaults('spells');

        // Custom spell should be in custom list
        expect(customSpells.find((s: any) => s.name === 'Chronomantic Shift')).toBeDefined();
        // Custom spell should NOT be in default list
        expect(defaultSpells.find((s: any) => s.name === 'Chronomantic Shift')).toBeUndefined();
    });
});

describe('Class-Specific Spells: Full Integration Flow', () => {
    let spellQuery: SpellQuery;

    beforeEach(() => {
        spellQuery = SpellQuery.getInstance();
    });

    it('should demonstrate full flow: register -> query -> verify class restriction', () => {
        const manager = ExtensionManager.getInstance();

        // Step 1: Create a wizard-specific spell
        const wizardSpell = {
            name: uniqueName('Time Stop Variant'),
            level: 9,
            school: 'Transmutation',
            casting_time: '1 action',
            range: 'Self',
            components: ['V'],
            duration: 'Instantaneous',
            description: 'You briefly stop the flow of time.',
            classes: ['Wizard'],
            source: 'custom'
        };

        // Step 2: Register the spell
        manager.register('spells', [wizardSpell], { mode: 'relative', validate: false });

        // Step 3: Query spells for Wizard
        const wizardSpells = spellQuery.getSpellsForClass('Wizard');

        // Step 4: Verify spell is available to Wizard
        const found = wizardSpells.find((s: any) => s.name === wizardSpell.name);
        expect(found).toBeDefined();
        expect((found as any)?.classes).toContain('Wizard');

        // Step 5: Verify spell is NOT available to other classes
        const sorcererSpells = spellQuery.getSpellsForClass('Sorcerer');
        expect(sorcererSpells.find((s: any) => s.name === wizardSpell.name)).toBeUndefined();

        const clericSpells = spellQuery.getSpellsForClass('Cleric');
        expect(clericSpells.find((s: any) => s.name === wizardSpell.name)).toBeUndefined();
    });

    it('should correctly handle multiple spells with overlapping class restrictions', () => {
        const manager = ExtensionManager.getInstance();

        // Create spells with overlapping class restrictions
        const spell1 = {
            ...WIZARD_ONLY_SPELL,
            name: uniqueName('Wizard Exclusive')
        };
        const spell2 = {
            ...MULTI_CLASS_SPELL,
            name: uniqueName('Shared Spell')
        };

        manager.register('spells', [spell1, spell2], { mode: 'relative', validate: false });

        const wizardSpells = spellQuery.getSpellsForClass('Wizard');
        const sorcererSpells = spellQuery.getSpellsForClass('Sorcerer');
        const druidSpells = spellQuery.getSpellsForClass('Druid');

        // Wizard should have both spells
        expect(wizardSpells.find((s: any) => s.name === spell1.name)).toBeDefined();
        expect(wizardSpells.find((s: any) => s.name === spell2.name)).toBeDefined();

        // Sorcerer should only have shared spell
        expect(sorcererSpells.find((s: any) => s.name === spell1.name)).toBeUndefined();
        expect(sorcererSpells.find((s: any) => s.name === spell2.name)).toBeDefined();

        // Druid should only have shared spell
        expect(druidSpells.find((s: any) => s.name === spell1.name)).toBeUndefined();
        expect(druidSpells.find((s: any) => s.name === spell2.name)).toBeDefined();
    });

    it('should allow adding more class-specific spells after initial registration', () => {
        const manager = ExtensionManager.getInstance();

        // First registration
        manager.register('spells', [WIZARD_ONLY_SPELL], { mode: 'relative', validate: false });

        // Second registration
        const secondWizardSpell = {
            ...WIZARD_ONLY_SPELL,
            name: 'Wizard Spell Two'
        };
        manager.register('spells', [secondWizardSpell], { mode: 'relative', validate: false });

        const wizardSpells = spellQuery.getSpellsForClass('Wizard');

        expect(wizardSpells.find((s: any) => s.name === 'Chronomantic Shift')).toBeDefined();
        expect(wizardSpells.find((s: any) => s.name === 'Wizard Spell Two')).toBeDefined();
    });
});
