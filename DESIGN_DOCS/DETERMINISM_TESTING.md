# Determinism Testing Results

**Task:** Phase 6.2.3 - Test Determinism
**Date:** 2026-01-25
**Status:** DOCUMENTED ✅ (Manual testing required)

---

## Overview

This document outlines the determinism testing procedures and verification for the Playlist Data Engine's CharacterGenerator module. Determinism ensures that the same seed and audio profile always produces identical characters.

### What is Determinism?

Determinism in character generation means:
- **Same seed** + **Same audio profile** = **Same character** (always)
- Character generation is reproducible and verifiable
- Results can be cached and retrieved without re-generation

### Why Determinism Matters

1. **Caching**: Characters can be cached by seed without fear of inconsistency
2. **Testing**: Verified behavior means predictable test outcomes
3. **User Experience**: Same track always produces same character (users can rely on this)
4. **Data Integrity**: No unexpected variations when re-generating characters

---

## Implementation

### Location

**File:** `src/components/Tabs/CharacterGenTab.tsx`

**Lines:** 25-89, 239-367

### Features Implemented

#### 1. Determinism State Management

```typescript
const [determinismResult, setDeterminismResult] = useState<{
    isMatch: boolean | null;
    original: CharacterSheet | null;
    regenerated: CharacterSheet | null;
}>({ isMatch: null, original: null, regenerated: null });
```

**Purpose:** Tracks the results of determinism verification

#### 2. Regenerate with Same Seed Button

**UI Component:**
- Button text: "Regenerate with Same Seed"
- Located in Character Gen tab
- Only enabled when prerequisites met (selectedTrack, audioProfile, character exist)

**Function:** `handleVerifyDeterminism()`
1. Stores original character from current state
2. Re-generates character with same seed (track UUID)
3. Compares original vs regenerated using JSON comparison
4. Updates determinismResult with match status

#### 3. Match/Mismatch Display

**Match Display (✓):**
- Green checkmark indicator
- Text: "✓ Deterministic match!"
- Message: "The character was regenerated identically with the same seed ([seed])."
- Shows seed used for verification

**Mismatch Display (✗):**
- Red X indicator
- Text: "✗ Mismatch!"
- Message: "The regenerated character differs from the original (this should not happen)."
- Side-by-side comparison showing:
  - Original character name, race, class
  - Regenerated character name, race, class
  - Diff path showing where they differ

#### 4. JSON Comparison

**Method:** `JSON.stringify(original) === JSON.stringify(regenerated)`

**Purpose:** Deep equality check of entire CharacterSheet objects

**Properties Compared:**
- name
- race
- class
- level
- ability_scores (STR, DEX, CON, INT, WIS, CHA)
- hp (current, max, temporary)
- armor_class
- proficiency_bonus
- skills
- equipment
- spells
- attacks
- appearance
- id
- seed

---

## Testing Procedure

### Prerequisites

1. App running in development mode (`npm run dev`)
2. A playlist loaded with at least one track
3. Audio analysis completed for a track
4. Character generated from that track

### Test Steps

#### Step 1: Generate Original Character

1. Navigate to "Playlist Loader" tab
2. Load a playlist (use Arweave TX ID or JSON)
3. Select a track from the list
4. Navigate to "Audio Analysis" tab
5. Click "Analyze Audio" button
6. Wait for analysis to complete
7. Navigate to "Character Gen" tab
8. Click "Generate Character" button
9. Note the generated character details (name, race, class, stats)

**Expected:** Character is generated and displayed

#### Step 2: Verify Determinism

1. In Character Gen tab, locate "Regenerate with Same Seed" button
2. Click the button
3. Wait for regeneration to complete
4. Observe the determinism verification result

**Expected Results:**

✅ **PASS Criteria:**
- Button text shows "Regenerating..." during generation
- Green checkmark appears after regeneration
- Text displays "✓ Deterministic match!"
- Message shows seed used: "The character was regenerated identically with the same seed ([seed])."
- Character displayed is identical to original

❌ **FAIL Criteria:**
- Red X appears after regeneration
- Text displays "✗ Mismatch!"
- Side-by-side comparison shows differences
- Error message: "The regenerated character differs from the original (this should not happen)."

#### Step 3: Verify All Properties Match

If match succeeds, verify key properties are identical:
- Name: Same
- Race: Same
- Class: Same
- Level: Same
- Ability Scores: Same (STR, DEX, CON, INT, WIS, CHA)
- HP: Same (current, max, temporary)
- Armor Class: Same
- Proficiency Bonus: Same
- Skills: Same
- Equipment: Same
- Spells: Same (if spellcaster)
- Appearance: Same
- Seed: Same

#### Step 4: Repeat with Different Track

To verify determinism works across different tracks:
1. Select a different track
2. Analyze audio
3. Generate character
4. Click "Regenerate with Same Seed"
5. Verify match

**Expected:** Each track generates consistent characters

---

## Determinism Verification Code

### handleVerifyDeterminism Function

**Location:** `src/components/Tabs/CharacterGenTab.tsx` lines 59-97

```typescript
const handleVerifyDeterminism = async () => {
    if (!selectedTrack || !audioProfile || !character) {
        console.warn('[CharacterGenTab] Cannot verify determinism - missing prerequisites');
        return;
    }

    console.log('[CharacterGenTab] Verifying determinism with seed:', selectedTrack.id);

    // Store original character
    const original = character;

    // Regenerate with the same seed
    await handleGenerateCharacter();

    // Get the regenerated character
    const regenerated = characters.length > 0 ? characters[characters.length - 1] : null;

    if (!regenerated) {
        console.error('[CharacterGenTab] Regeneration failed');
        return;
    }

    // Compare
    const isMatch = JSON.stringify(original) === JSON.stringify(regenerated);

    console.log('[CharacterGenTab] Determinism check result:', isMatch ? 'MATCH' : 'MISMATCH');

    // Update state
    setDeterminismResult({
        isMatch,
        original,
        regenerated
    });
};
```

### JSON Deep Comparison

**Method:** Stringify both objects and compare

**Why This Works:**
- `JSON.stringify()` serializes entire object tree
- Property order is guaranteed by JavaScript engines
- Deep comparison of all nested properties
- Covers all CharacterSheet properties

**Alternative (not used):** Recursive property-by-property comparison

---

## Test Data Points to Record

| Test # | Track ID | Seed | Match? | Notes |
|--------|----------|------|--------|-------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## Expected Behavior

### CharacterGenerator Determinism

**Engine Module:** `playlist-data-engine`

**Method:** `CharacterGenerator.generate(seed: string, audioProfile: AudioProfile, name: string): CharacterSheet`

**Determinism Guarantee:**
- Same seed always produces same character
- Audio profile influences stats but doesn't break determinism
- Name parameter affects character name only
- Other properties (race, class, stats) come from seed + audio

**Seeded RNG:**
- Engine uses `SeededRNG` class internally
- Seed creates predictable random sequence
- Same seed = same sequence of "random" numbers

---

## Known Limitations

### 1. Audio Profile Changes

If audio profile changes (re-analyzing audio), character will differ because:
- Audio traits (bass, mid, treble) influence ability scores
- New audio profile = different inputs to character generation

**Solution:** Use same audio profile for verification

### 2. Name Parameter

The `name` parameter is passed to `CharacterGenerator.generate()`:
- If name changes, character.name will differ
- Other properties remain same

**Current Implementation:** Always uses track title as name

### 3. Engine Version Changes

If `playlist-data-engine` is updated:
- Character generation logic might change
- Same seed might produce different character
- This is expected behavior

**Solution:** Document engine version in testing

---

## Verification Checklist

### Code Implementation
- [x] Determinism state management added (lines 25-30)
- [x] handleVerifyDeterminism function implemented (lines 59-97)
- [x] "Regenerate with Same Seed" button added (lines 239-247)
- [x] Match/mismatch display implemented (lines 315-367)
- [x] JSON comparison logic added (line 82)

### UI Components
- [x] Button shows "Regenerating..." during generation
- [x] Green checkmark for match (✓ Deterministic match!)
- [x] Red X for mismatch (✗ Mismatch!)
- [x] Seed display in match message
- [x] Side-by-side comparison for mismatch
- [x] Diff path showing property differences

### Testing
- [ ] Generate character twice with same seed - MANUAL TEST REQUIRED
- [ ] Verify results are identical - MANUAL TEST REQUIRED
- [ ] Test with multiple tracks - MANUAL TEST REQUIRED
- [ ] Document any mismatches found - N/A (should not happen)

---

## Debugging Mismatches

If a mismatch occurs (should not happen):

### 1. Check Seed Consistency

Verify same seed used for both generations:
```typescript
console.log('Original seed:', original.seed);
console.log('Regenerated seed:', regenerated.seed);
```

### 2. Check Audio Profile

Verify same audio profile used:
```typescript
console.log('Audio profile bass:', audioProfile.bass_dominance);
console.log('Audio profile mid:', audioProfile.mid_dominance);
console.log('Audio profile treble:', audioProfile.treble_dominance);
```

### 3. Check Engine Version

Verify using same engine version:
```bash
cd /path/to/playlist-data-engine
git log -1 --oneline
```

### 4. Property-by-Property Comparison

If JSON comparison fails, compare individual properties:
```typescript
const diff = {
    name: original.name === regenerated.name,
    race: original.race === regenerated.race,
    class: original.class === regenerated.class,
    level: original.level === regenerated.level,
    ability_scores: JSON.stringify(original.ability_scores) === JSON.stringify(regenerated.ability_scores),
    // ... etc
};
console.log('Property comparison:', diff);
```

---

## Conclusion

Determinism verification is **fully implemented** in the Character Gen tab. The feature allows users to:
1. Generate a character from a track
2. Regenerate with same seed
3. Verify identical results
4. View detailed match/mismatch information

The implementation uses:
- State management for tracking verification results
- JSON deep comparison for accuracy
- User-friendly UI with visual indicators
- Detailed error reporting for mismatches

**Status:** Ready for manual testing

**Next Steps:**
1. Run app with `npm run dev`
2. Follow testing procedure above
3. Document test results in table
4. Report any mismatches (should not occur)

---

**Last Updated:** 2026-01-25
**Build Status:** TypeScript compilation passes (605.58 kB output)
