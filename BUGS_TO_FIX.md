# Playlist Data Engine - TypeScript Build Errors Bug Report

## Overview

This document contains all TypeScript build errors from the `playlist-data-engine` dependency that need to be fixed. These errors were discovered when running `npm run build` on the `playlist-data-showcase` project.

---

## Summary Statistics

| Category | Count |
|----------|-------|
| `undefined` not assignable errors | 11 |
| Possibly `undefined` access errors | 11 |
| Unused variable/declaration errors | 10 |
| Missing property errors | 3 |
| Missing namespace errors | 1 |
| **Total Errors** | **36** |

---

## Critical Errors (Type Safety Issues)

These errors cause runtime failures and must be fixed with proper null/undefined handling.

### 1. AttackResolver.ts (9 errors)

**File:** `src/core/combat/AttackResolver.ts`

| Line | Error | Description |
|------|-------|-------------|
| 84 | `'attacker' is declared but its value is never read` | Unused variable declaration |
| 87 | `'attackBonus' is possibly 'undefined'` | Accessing property without null check |
| 96 | `Type 'number \| undefined' is not assignable to type 'number'` | Assigning undefined to number type |
| 113 | `Argument of type 'string \| undefined' is not assignable to parameter of type 'string'` | Passing undefined to string parameter |
| 116 | `Type 'string \| undefined' is not assignable to type 'string'` | Assigning undefined to string type |
| 153 | `'attackName' is declared but its value is never read` | Unused variable declaration |
| 173 | `'attackBonus' is possibly 'undefined'` | Accessing property without null check |
| 200 | `Type 'number \| undefined' is not assignable to type 'number'` | Assigning undefined to number type |
| 219 | `Type 'number \| undefined' is not assignable to type 'number'` | Assigning undefined to number type |
| 241 | `'attackBonus' is possibly 'undefined'` | Accessing property without null check |
| 268 | `Type 'number \| undefined' is not assignable to type 'number'` | Assigning undefined to number type |
| 287 | `Type 'number \| undefined' is not assignable to type 'number'` | Assigning undefined to number type |

**Pattern:** The `attackBonus` property is potentially undefined and is being used without proper null checks throughout the file.

---

### 2. InitiativeRoller.ts (9 errors)

**File:** `src/core/combat/InitiativeRoller.ts`

| Line | Error | Description |
|------|-------|-------------|
| 7 | `'rollInitiative' is declared but its value is never read` | Unused function |
| 30 | `'dexModifier' is possibly 'undefined'` | Accessing property without null check |
| 38 | `Type 'number \| undefined' is not assignable to type 'number'` | Assigning undefined to number type |
| 67 | `'bDexMod' is possibly 'undefined'` | Variable possibly undefined |
| 67 | `'aDexMod' is possibly 'undefined'` | Variable possibly undefined |
| 111 | `'dexModifier' is possibly 'undefined'` | Accessing property without null check |
| 145 | `'bDexMod' is possibly 'undefined'` | Variable possibly undefined |
| 145 | `'aDexMod' is possibly 'undefined'` | Variable possibly undefined |

**Pattern:** Dexterity modifiers are not being validated before use in initiative calculations.

---

### 3. SpellCaster.ts (10 errors)

**File:** `src/core/combat/SpellCaster.ts`

| Line | Error | Description |
|------|-------|-------------|
| 28 | `Argument of type 'number \| undefined' is not assignable to parameter of type 'number'` | Passing undefined to number parameter |
| 35 | `Type 'number \| undefined' is not assignable to type 'number'` | Assigning undefined to number type |
| 41 | `Argument of type 'number \| undefined' is not assignable to parameter of type 'number'` | Passing undefined to number parameter |
| 74 | `'spell.description' is possibly 'undefined'` | Accessing property without null check |
| 88 | `'spell.description' is possibly 'undefined'` | Accessing property without null check |
| 112 | `Type 'number \| undefined' is not assignable to type 'number'` | Assigning undefined to number type |
| 156 | `'characterClass' is declared but its value is never read` | Unused variable |
| 247 | `'spell.level' is possibly 'undefined'` | Accessing property without null check |
| 263 | `'spell.level' is possibly 'undefined'` | Accessing property without null check |

**Pattern:** Spell properties (`level`, `description`) are being accessed without proper validation.

---

## Moderate Errors (Missing Properties/Types)

### 4. GamingPlatformSensors.ts (3 errors)

**File:** `src/core/sensors/GamingPlatformSensors.ts`

| Line | Error | Description |
|------|-------|-------------|
| 16 | `Cannot find namespace 'NodeJS'` | Missing `@types/node` dependency |
| 83 | `Property 'discordUserId' does not exist on type 'GamingPlatformSensors'` | Missing property declaration |
| 140 | `Property 'partySize' does not exist on type` | Steam session type missing `partySize` property |

**Pattern:** Type definitions are incomplete or missing for gaming platform session data.

---

## Low Priority Errors (Unused Declarations)

These don't cause runtime issues but should be cleaned up.

### 5. CombatEngine.ts (2 errors)

**File:** `src/core/combat/CombatEngine.ts`

| Line | Error | Description |
|------|-------|-------------|
| 13 | `'CombatActionResult' is declared but never used` | Unused type |
| 321 | `'players' is declared but its value is never read` | Unused variable |

---

### 6. DiscordRPCClient.ts (3 errors)

**File:** `src/core/sensors/DiscordRPCClient.ts`

| Line | Error | Description |
|------|-------|-------------|
| 15 | `'maxConnectionAttempts' is declared but its value is never read` | Unused constant |
| 18 | `'rpcEndpoint' is declared but its value is never read` | Unused constant |
| 173 | `'callback' is declared but its value is never read` | Unused parameter |

---

### 7. GeolocationProvider.ts (1 error)

**File:** `src/core/sensors/GeolocationProvider.ts`

| Line | Error | Description |
|------|-------|-------------|
| 44 | `'longitude' is declared but its value is never read` | Unused parameter |

---

### 8. LightSensor.ts (1 error)

**File:** `src/core/sensors/LightSensor.ts`

| Line | Error | Description |
|------|-------|-------------|
| 4 | `'isListening' is declared but its value is never read` | Unused constant |

---

## Recommended Fix Strategy

### Priority 1: Fix Type Safety Issues (High Impact)

1. **Add null coalescing operators (`??`) for all potentially undefined values**
   ```typescript
   // Instead of:
   const bonus = attackBonus;

   // Use:
   const bonus = attackBonus ?? 0;
   ```

2. **Add optional chaining (`?.`) with fallbacks**
   ```typescript
   // Instead of:
   const desc = spell.description;

   // Use:
   const desc = spell.description ?? "No description";
   ```

3. **Add type guards before assignments**
   ```typescript
   if (dexModifier !== undefined) {
       result = dexModifier;
   }
   ```

### Priority 2: Fix Missing Properties

1. **Install Node.js types** (if not already present):
   ```bash
   npm install --save-dev @types/node
   ```

2. **Add missing properties to interfaces** in `GamingPlatformSensors.ts`:
   - `discordUserId: string;`
   - Update Steam session type to include optional `partySize?: number;`

### Priority 3: Clean Up Unused Code

1. Remove unused imports and variables
2. Use underscore prefix for intentionally unused parameters: `_unusedParam`

---

## Files Requiring Changes

| File | Error Count | Priority |
|------|-------------|----------|
| `AttackResolver.ts` | 12 | High |
| `SpellCaster.ts` | 10 | High |
| `InitiativeRoller.ts` | 9 | High |
| `GamingPlatformSensors.ts` | 3 | Medium |
| `CombatEngine.ts` | 2 | Low |
| `DiscordRPCClient.ts` | 3 | Low |
| `GeolocationProvider.ts` | 1 | Low |
| `LightSensor.ts` | 1 | Low |

---

## Template for Fixing Each Error Pattern

### Pattern: `Type 'number | undefined' is not assignable to type 'number'`

```typescript
// Before (ERROR):
const result: number = someValue;

// After (FIXED):
const result: number = someValue ?? 0; // or other default
```

### Pattern: `'property' is possibly 'undefined'`

```typescript
// Before (ERROR):
const value = obj.property;

// After (FIXED):
const value = obj.property ?? defaultValue;
// OR
if (obj.property) {
    const value = obj.property;
}
```

### Pattern: Unused variable

```typescript
// Before (ERROR):
function foo(unusedVar: string) { ... }

// After (FIXED):
function foo(_unusedVar: string) { ... }
// OR remove the variable entirely
```

---

## Testing Checklist After Fixes

- [ ] Run `npm run build` - all TypeScript errors resolved
- [ ] Run unit tests for affected modules
- [ ] Test undefined/null input scenarios
- [ ] Verify default values are appropriate
- [ ] Check for any runtime errors from missing properties
