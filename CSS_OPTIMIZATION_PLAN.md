# CSS Optimization & Refactoring Plan

> **Primary Goal**: Optimize and consolidate the 10,901-line `src/index.css` file by identifying duplicated/similar patterns, then split into organized, co-located CSS files.

---

## Executive Summary

**Current State**:
- Single file: `src/index.css` (10,901 lines)
- Uses Tailwind `@layer` directives (to be removed)
- All styles imported through `main.tsx`
- Significant duplication of transition, shadow, transform, and layout patterns

**Target State**:
- Shared CSS files: `base.css`, `Button.css`, `Card.css`, `Input.css`, `effects.css`, `animations.css`
- Tab-specific CSS files co-located with each component
- Stylelint with pre-commit hooks
- ~40-60% reduction in total CSS through pattern consolidation

**Strategy**:
1. Setup tooling (stylelint) FIRST to catch errors as we work
2. Analysis phase: Catalog all patterns and duplicates
3. Consolidation phase: Extract shared patterns into reusable classes
4. Split phase: Separate into individual files following the new structure
5. Integration phase: Update imports and verify nothing breaks

---

## Part 1: Tooling Setup (DO FIRST)

### Task 1.1: Install Stylelint

```bash
npm install --save-dev stylelint stylelint-config-standard stylelint-config-standard-css
```

### Task 1.2: Create `.stylelintrc.json`

```json
{
  "extends": ["stylelint-config-standard"],
  "rules": {
    "selector-class-pattern": null,
    "declaration-block-trailing-semicolon": null,
    "no-descending-specificity": null,
    "selector-id-pattern": null,
    "custom-property-pattern": null,
    "keyframes-name-pattern": null
  },
  "ignoreFiles": ["dist/**"]
}
```

### Task 1.3: Add Lint Scripts to `package.json`

```json
{
  "scripts": {
    "lint:css": "stylelint \"src/**/*.css\"",
    "lint:css:fix": "stylelint \"src/**/*.css\" --fix",
    "check:css": "node scripts/check-css-braces.js"
  }
}
```

### Task 1.4: Create Pre-commit Hook Setup

Install husky and lint-staged:
```bash
npm install --save-dev husky lint-staged
npx husky init
```

Update `.husky/pre-commit`:
```bash
#!/usr/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint:css
```

Update `package.json` lint-staged config:
```json
{
  "lint-staged": {
    "*.css": ["stylelint --fix", "git add"]
  }
}
```

### Task 1.5: Create CSS Brace Check Script

Create `scripts/check-css-braces.js`:
```javascript
const fs = require('fs');
const css = fs.readFileSync('src/index.css', 'utf8');

const open = (css.match(/\{/g) || []).length;
const close = (css.match(/\}/g) || []).length;
const openParens = (css.match(/\(/g) || []).length;
const closeParens = (css.match(/\)/g) || []).length;
const openBrackets = (css.match(/\[/g) || []).length;
const closeBrackets = (css.match(/\]/g) || []).length;

let hasError = false;

if (open !== close) {
  console.error(`❌ Brace mismatch: ${open} open vs ${close} close`);
  hasError = true;
}
if (openParens !== closeParens) {
  console.error(`❌ Paren mismatch: ${openParens} open vs ${closeParens} close`);
  hasError = true;
}
if (openBrackets !== closeBrackets) {
  console.error(`❌ Bracket mismatch: ${openBrackets} open vs ${closeBrackets} close`);
  hasError = true;
}

if (!hasError) {
  console.log(`✅ CSS brackets balanced: {}=${open}, ()=${openParens}, []=${openBrackets}`);
  process.exit(0);
} else {
  process.exit(1);
}
```

---

## Part 2: CSS Pattern Analysis (REFERENCE)

This section documents the patterns to look for when consolidating CSS.

### 2.1 Duplicated Transition Patterns

**Pattern A**: Fast transform transition
```css
transition: transform var(--duration-fast) var(--ease-out-cubic);
```
**Found in**: ~40+ selectors (hover states, animations)
**Consolidate as**: Component-specific hover states

**Pattern B**: All properties transition
```css
transition: all var(--duration-normal) var(--ease-out-cubic);
```
**Found in**: ~20+ selectors
**Consolidate as**: Component-specific transitions

**Pattern C**: Multiple properties transition
```css
transition: background-color var(--duration-fast) var(--ease-out-cubic),
            border-color var(--duration-fast) var(--ease-out-cubic),
            box-shadow var(--duration-fast) var(--ease-out-cubic);
```
**Found in**: ~15+ selectors
**Consolidate as**: Component-specific interactive states

### 2.2 Duplicated Shadow Patterns

**Pattern A**: Small elevation shadow
```css
box-shadow: var(--shadow-sm);
box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.3);
```
**Found in**: ~30+ selectors
**Already defined as**: `--shadow-sm` (use this!)

**Pattern B**: Medium elevation shadow
```css
box-shadow: var(--shadow-md);
box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.4);
```
**Found in**: ~25+ selectors
**Already defined as**: `--shadow-md` (use this!)

**Pattern C**: Large elevation shadow
```css
box-shadow: var(--shadow-lg);
box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.5);
```
**Found in**: ~15+ selectors
**Already defined as**: `--shadow-lg` (use this!)

**Pattern D**: Glow shadow
```css
box-shadow: var(--shadow-glow);
box-shadow: 0 0 20px hsl(var(--primary) / 0.3);
```
**Found in**: ~10+ selectors
**Already defined as**: `--shadow-glow` (use this!)

**Action**: Replace ALL hardcoded shadow values with the CSS custom properties!

### 2.3 Duplicated Transform Patterns

**Pattern A**: Scale on hover
```css
transform: scale(1.02);
transform: scale(1.05);
transform: scale(1.1);
```
**Found in**: ~35+ selectors
**Consolidate as**: Component-specific hover states

**Pattern B**: Translate Y
```css
transform: translateY(-2px);
transform: translateY(-4px);
transform: translateY(2px);
```
**Found in**: ~15+ selectors
**Consolidate as**: Component-specific hover states

**Pattern C**: Scale + translate combination
```css
transform: scale(1.02) translateY(-2px);
```
**Found in**: ~10+ selectors
**Consolidate as**: Component-specific hover states

### 2.4 Duplicated Layout Patterns

**Pattern A**: Flex center
```css
display: flex;
align-items: center;
justify-content: center;
```
**Found in**: ~50+ selectors
**Consolidate as**: Semantic shared class (e.g., `.centered-layout`)

**Pattern B**: Flex column center
```css
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
```
**Found in**: ~30+ selectors
**Consolidate as**: Semantic shared class (e.g., `.centered-column`)

**Pattern C**: Flex space between
```css
display: flex;
align-items: center;
justify-content: space-between;
```
**Found in**: ~25+ selectors
**Consolidate as**: Semantic shared class (e.g., `.header-layout`)

**Pattern D**: Grid with auto columns
```css
display: grid;
grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
gap: 1rem;
```
**Found in**: ~15+ selectors
**Consolidate as**: Semantic shared class (e.g., `.auto-grid`)

### 2.5 Duplicated Border Patterns

**Pattern A**: Round border
```css
border-radius: var(--radius);
```
**Found in**: ~100+ selectors
**Already defined as**: `--radius` (use this!)

**Pattern B**: Full round
```css
border-radius: 9999px;
border-radius: 50%;
border-radius: var(--radius-full);
```
**Found in**: ~20+ selectors
**Already defined as**: `--radius-full` (use this!)

**Pattern C**: Border with custom property color
```css
border: 1px solid hsl(var(--border));
border: 1px solid hsl(var(--primary) / 0.5);
border: 2px solid hsl(var(--primary));
```
**Action**: Ensure all borders use `--border` or semantic color variables

### 2.6 Duplicated Spacing Patterns

**Pattern A**: Padding variants
```css
padding: 0.25rem;   /* 4px */
padding: 0.5rem;    /* 8px */
padding: 0.75rem;   /* 12px */
padding: 1rem;      /* 16px */
padding: 1.25rem;   /* 20px */
padding: 1.5rem;    /* 24px */
padding: 2rem;      /* 32px */
```
**Action**: Use spacing variables if needed, or keep as-is in component CSS

**Pattern B**: Gap variants
```css
gap: 0.5rem;
gap: 0.75rem;
gap: 1rem;
gap: 1.25rem;
gap: 1.5rem;
```
**Action**: Use spacing variables for consistency if needed

### 2.7 Component Variant Patterns

**Card Variants**: Multiple card classes with similar structure
```css
.card { ... }
.card-elevated { ... }  /* Adds: shadow-lg, border, bg-surface-3 */
.card-flat { ... }       /* Removes: shadow */
.card-outlined { ... }   /* Adds: 2px border, no shadow */
```
**Found in**: ~10 variants
**Consolidate as**: Single `.card` class with modifier classes

**Button Variants**: Multiple button classes with similar structure
```css
.btn { ... }
.btn-primary { ... }
.btn-secondary { ... }
.btn-ghost { ... }
.btn-outline { ... }
.btn-destructive { ... }
```
**Found in**: ~5 variants + 4 size variants
**Consolidate as**: Single `.btn` with `.btn-{variant}` and `.btn-{size}` modifiers

---

## Part 3: Consolidation Strategy (HOW TO OPTIMIZE)

### Phase 1: Identify and Consolidate Duplicate Patterns

**The Optimization Approach**:
Instead of creating utility classes (which is the Tailwind way), we will:
1. Find duplicate CSS patterns across components
2. Extract them into semantic component classes
3. Use CSS custom properties for values that vary
4. Keep class names descriptive of WHAT something is, not WHAT it looks like

**Example - Finding Duplicates**:

Before (duplicated across multiple selectors):
```css
.playlist-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  gap: 1rem;
}

.audio-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  gap: 1rem;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  gap: 1rem;
}
```

After (consolidated into semantic class):
```css
/* Shared semantic class for headers that need this layout */
.tab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  gap: 1rem;
}
```

Then in HTML/JSX:
```tsx
<div className="playlist-header tab-header">
<div className="audio-header tab-header">
<div className="settings-header tab-header">
```

### Phase 2: Extract Shared Component Styles

**File: `src/styles/components/Button.css`**
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.25rem;
  border-radius: var(--radius);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out-cubic);
}

.btn:hover {
  transform: scale(1.02);
}

.btn:active {
  transform: scale(0.98);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Variants */
.btn-primary {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.btn-primary:hover:not(:disabled) {
  background-color: hsl(var(--primary) / 0.9);
  box-shadow: var(--shadow-glow);
}

.btn-secondary {
  background-color: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
}

.btn-secondary:hover:not(:disabled) {
  background-color: hsl(var(--secondary) / 0.8);
}

.btn-ghost {
  background-color: transparent;
  color: hsl(var(--foreground));
  border-color: hsl(var(--border));
}

.btn-ghost:hover:not(:disabled) {
  background-color: hsl(var(--accent));
}

.btn-outline {
  background-color: transparent;
  color: hsl(var(--foreground));
  border-color: hsl(var(--primary));
}

.btn-outline:hover:not(:disabled) {
  background-color: hsl(var(--primary) / 0.1);
}

.btn-destructive {
  background-color: hsl(var(--destructive));
  color: hsl(var(--destructive-foreground));
}

.btn-destructive:hover:not(:disabled) {
  background-color: hsl(var(--destructive) / 0.9);
}

/* Sizes */
.btn-sm {
  padding: var(--spacing-2) var(--spacing-3);
  font-size: 0.75rem;
}

.btn-lg {
  padding: var(--spacing-4) var(--spacing-6);
  font-size: 1rem;
}

.btn-icon {
  padding: var(--spacing-3);
  aspect-ratio: 1;
}

.btn-icon-sm {
  padding: var(--spacing-2);
  aspect-ratio: 1;
}

/* Loading state */
.btn-loading {
  position: relative;
  color: transparent !important;
  pointer-events: none;
}

.btn-loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1rem;
  height: 1rem;
  margin: -0.5rem 0 0 -0.5rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Ripple effect */
.btn-ripple {
  position: relative;
  overflow: hidden;
}

.btn-ripple::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: radial-gradient(circle, hsl(var(--foreground) / 0.3), transparent);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width var(--duration-slow) var(--ease-out-quart),
              height var(--duration-slow) var(--ease-out-quart);
}

.btn-ripple:active::after {
  width: 300px;
  height: 300px;
}
```

**File: `src/styles/components/Card.css`**
```css
.card {
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  padding: var(--spacing-4);
  box-shadow: var(--shadow-sm);
}

.card-elevated {
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  padding: var(--spacing-4);
  box-shadow: var(--shadow-lg);
}

.card-flat {
  background-color: hsl(var(--card));
  border: none;
  border-radius: var(--radius);
  padding: var(--spacing-4);
  box-shadow: none;
}

.card-outlined {
  background-color: hsl(var(--card));
  border: 2px solid hsl(var(--primary));
  border-radius: var(--radius);
  padding: var(--spacing-4);
  box-shadow: none;
}

.card-interactive {
  transition: all var(--duration-fast) var(--ease-out-cubic);
  cursor: pointer;
}

.card-interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* Header */
.card-header {
  margin-bottom: var(--spacing-4);
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.75rem;
  color: hsl(var(--foreground));
}

.card-description {
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: hsl(var(--muted-foreground));
  margin-top: var(--spacing-1);
}

/* Content */
.card-content {
  color: hsl(var(--foreground));
}

/* Footer */
.card-footer {
  margin-top: var(--spacing-4);
  padding-top: var(--spacing-4);
  border-top: 1px solid hsl(var(--border));
}
```

**File: `src/styles/components/Input.css`**
```css
.input {
  display: flex;
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4);
  font-size: 0.875rem;
  line-height: 1.25rem;
  background-color: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  color: hsl(var(--foreground));
  transition: all var(--duration-fast) var(--ease-out-cubic);
}

.input:hover {
  border-color: hsl(var(--muted-foreground));
}

.input:focus {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
}

.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-error {
  border-color: hsl(var(--destructive));
}

.input-error:focus {
  box-shadow: 0 0 0 2px hsl(var(--destructive) / 0.2);
}

/* Input wrapper */
.input-wrapper {
  position: relative;
  display: flex;
  width: 100%;
}

.input-icon-left {
  position: absolute;
  left: var(--spacing-3);
  top: 50%;
  transform: translateY(-50%);
  color: hsl(var(--muted-foreground));
  pointer-events: none;
}

.input-icon-right {
  position: absolute;
  right: var(--spacing-3);
  top: 50%;
  transform: translateY(-50%);
  color: hsl(var(--muted-foreground));
  pointer-events: none;
}

.input-with-icon {
  padding-left: calc(var(--spacing-3) + 1.5rem);
}

.input-with-icon-right {
  padding-right: calc(var(--spacing-3) + 1.5rem);
}

/* Label */
.input-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.25rem;
  color: hsl(var(--foreground));
  margin-bottom: var(--spacing-2);
}

.input-label-required::after {
  content: ' *';
  color: hsl(var(--destructive));
}

/* Helper text */
.input-helper {
  font-size: 0.75rem;
  line-height: 1rem;
  color: hsl(var(--muted-foreground));
  margin-top: var(--spacing-2);
}

.input-error-text {
  font-size: 0.75rem;
  line-height: 1rem;
  color: hsl(var(--destructive));
  margin-top: var(--spacing-2);
}
```

---

### Phase 3: Extract Effects and Animations

**File: `src/styles/effects.css`**
```css
/* Shimmer effect */
.shimmer {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 0%,
    hsl(var(--surface-3)) 50%,
    hsl(var(--muted)) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Ripple effect */
.ripple {
  position: relative;
  overflow: hidden;
}

.ripple::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: radial-gradient(circle, hsl(var(--primary-foreground) / 0.3), transparent);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width var(--duration-slow) var(--ease-out-quart),
              height var(--duration-slow) var(--ease-out-quart);
}

.ripple:active::after {
  width: 300px;
  height: 300px;
}

/* Glow effect */
.glow-primary {
  box-shadow: 0 0 20px hsl(var(--primary) / 0.3);
}

.glow-hover {
  transition: box-shadow var(--duration-normal) var(--ease-out-cubic);
}

.glow-hover:hover {
  box-shadow: 0 0 20px hsl(var(--primary) / 0.3);
}

/* Border glow */
.border-glow {
  border: 1px solid hsl(var(--primary) / 0.3);
  box-shadow: 0 0 10px hsl(var(--primary) / 0.2);
}

.border-glow-hover {
  transition: all var(--duration-normal) var(--ease-out-cubic);
}

.border-glow-hover:hover {
  border-color: hsl(var(--primary) / 0.5);
  box-shadow: 0 0 15px hsl(var(--primary) / 0.3);
}

/* Selection ring */
.selection-ring {
  animation: selectionRing var(--duration-slow) var(--ease-out-quart);
}

@keyframes selectionRing {
  0% {
    box-shadow: 0 0 0 0px hsl(var(--primary) / 0.5);
  }
  100% {
    box-shadow: 0 0 0 4px hsl(var(--primary) / 0);
  }
}

/* Glass effect */
.glass {
  background-color: hsl(var(--card) / 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid hsl(var(--border) / 0.5);
}

/* Gradient text */
.text-gradient {
  background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

**File: `src/styles/animations.css`**
```css
/* Fade in */
.fade-in {
  animation: fadeIn var(--duration-normal) var(--ease-out-cubic);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Fade in up */
.fade-in-up {
  animation: fadeInUp var(--duration-slow) var(--ease-out-quart);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Spring in */
.spring-in {
  animation: springIn var(--duration-slow) var(--ease-spring);
}

@keyframes springIn {
  0% {
    transform: scale(0.95);
    opacity: 0;
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Pulse */
.pulse {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Spin */
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Bounce */
.bounce {
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-25%);
  }
}

/* Shake */
.shake {
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* Scale in */
.scale-in {
  animation: scaleIn var(--duration-normal) var(--ease-out-cubic);
}

@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* Slide in from left */
.slide-in-left {
  animation: slideInLeft var(--duration-slow) var(--ease-out-quart);
}

@keyframes slideInLeft {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Slide in from right */
.slide-in-right {
  animation: slideInRight var(--duration-slow) var(--ease-out-quart);
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Count up animation */
.count-up {
  animation: countUp var(--duration-slow) var(--ease-out-quart);
}

@keyframes countUp {
  from {
    opacity: 0;
    transform: scale(1.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Timer pulse */
.timer-pulse {
  animation: timerPulse 2s ease-in-out infinite;
}

@keyframes timerPulse {
  0%, 100% {
    box-shadow: 0 0 0 0px hsl(var(--primary) / 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px hsl(var(--primary) / 0);
  }
}

/* Status dot pulse */
.status-pulse {
  animation: statusPulse 2s ease-in-out infinite;
}

@keyframes statusPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
```

---

## Part 4: Target File Structure

```
src/
├── styles/
│   ├── base.css              # CSS variables, reset, base element styles
│   ├── components/           # Shared UI components
│   │   ├── Button.css
│   │   ├── Card.css
│   │   ├── Input.css
│   │   ├── Skeleton.css
│   │   ├── StatusBadge.css
│   │   └── Toggle.css
│   ├── effects.css           # Visual effects (shimmer, glow, ripple)
│   ├── animations.css        # All @keyframes animations
│   └── index.css             # Main import file (import all above)
└── components/
    └── Tabs/
        ├── PlaylistLoaderTab/
        │   ├── PlaylistLoaderTab.tsx
        │   └── PlaylistLoaderTab.css    # Tab-specific styles
        ├── AudioAnalysisTab/
        │   ├── AudioAnalysisTab.tsx
        │   └── AudioAnalysisTab.css
        ├── CharacterGenTab/
        │   ├── CharacterGenTab.tsx
        │   └── CharacterGenTab.css
        ├── SessionTrackingTab/
        │   ├── SessionTrackingTab.tsx
        │   └── SessionTrackingTab.css
        ├── XPCalculatorTab/
        │   ├── XPCalculatorTab.tsx
        │   └── XPCalculatorTab.css
        ├── CharacterLevelingTab/
        │   ├── CharacterLevelingTab.tsx
        │   └── CharacterLevelingTab.css
        ├── EnvironmentalSensorsTab/
        │   ├── EnvironmentalSensorsTab.tsx
        │   └── EnvironmentalSensorsTab.css
        ├── GamingPlatformsTab/
        │   ├── GamingPlatformsTab.tsx
        │   └── GamingPlatformsTab.css
        ├── CombatSimulatorTab/
        │   ├── CombatSimulatorTab.tsx
        │   └── CombatSimulatorTab.css
        └── SettingsTab/
            ├── SettingsTab.tsx
            └── SettingsTab.css
```

**File: `src/styles/index.css`**
```css
/* ============================================
   MAIN CSS ENTRY POINT
   ============================================ */

/* Base: CSS variables and reset */
@import './base.css';

/* Effects: Visual effects */
@import './effects.css';

/* Animations: Keyframe animations */
@import './animations.css';

/* Components: Shared UI components */
@import './components/Button.css';
@import './components/Card.css';
@import './components/Input.css';
@import './components/Skeleton.css';
@import './components/StatusBadge.css';
@import './components/Toggle.css';
```

**File: `src/main.tsx`**
```typescript
import './styles/index.css';  // Import the new entry point
// ... rest of imports
```

**Each tab component imports its own CSS:**
```typescript
// src/components/Tabs/PlaylistLoaderTab/PlaylistLoaderTab.tsx
import './PlaylistLoaderTab.css';

// ... component code
```

---

## Part 5: Implementation Tasks (CHECKLIST)

> **Complete these tasks in order. Check off each box as you finish.**

### Phase 1: Tooling & Foundation

**Task 1: Setup Stylelint**
- [x] Install: `npm install --save-dev stylelint stylelint-config-standard stylelint-config-standard-css`
- [x] Create `.stylelintrc.json` with config (see Part 1 for full config)
- [x] Add scripts to `package.json`:
  - [x] `"lint:css": "stylelint \"src/**/*.css\""`
  - [x] `"lint:css:fix": "stylelint \"src/**/*.css\" --fix"`
  - [x] `"check:css": "node scripts/check-css-braces.js"`
- [x] Test: Run `npm run lint:css` - should work

**Task 2: Setup Pre-commit Hooks**
- [x] Install: `npm install --save-dev husky lint-staged`
- [x] Run: `npx husky init`
- [x] Update `.husky/pre-commit` to run `npm run lint:css`
- [x] Add lint-staged config to `package.json`
- [x] Test: Try to commit a CSS file - hook should run

**Task 3: Create Brace Check Script**
- [x] Create `scripts/check-css-braces.js` (see Part 1 for full script)
- [x] Test: Run `npm run check:css` - should show balanced braces

**Task 4: Extract Base CSS**
- [x] Create `src/styles/base.css`
- [x] Copy `:root` CSS variables from index.css
- [x] Copy base HTML element styles (html, body, headings, links)
- [x] Copy form element base styles
- [x] Remove all `@layer` directives from the copied CSS
- [x] Test: No visual changes, stylelint passes

### Phase 2: Shared CSS Files

**Task 5: Create Effects CSS**
- [x] Create `src/styles/effects.css`
- [x] Copy all shimmer effects from index.css
- [x] Copy all ripple effects from index.css
- [x] Copy all glow effects from index.css
- [x] Copy all glass effects from index.css
- [x] Copy all gradient text effects from index.css
- [x] Test: No visual changes, stylelint passes

**Task 6: Create Animations CSS**
- [x] Create `src/styles/animations.css`
- [x] Copy all @keyframes animations from index.css
- [x] Copy all animation utility classes from index.css
- [x] Remove duplicate @keyframes if any
- [x] Test: No visual changes, stylelint passes

**Task 7: Extract Button Component**
- [x] Create `src/styles/components/` directory if needed
- [x] Create `src/styles/components/Button.css`
- [x] Copy all button-related styles from index.css
- [x] Consolidate button variants (primary, secondary, ghost, outline, destructive)
- [x] Consolidate button sizes (sm, md, lg, icon)
- [x] Remove duplicate button styles
- [x] Test: All buttons still work, no visual changes

**Task 8: Extract Card Component**
- [x] Create `src/styles/components/Card.css`
- [x] Copy all card-related styles from index.css
- [x] Consolidate card variants (default, elevated, flat, outlined)
- [x] Consolidate card sub-components (header, title, description, content, footer)
- [x] Remove duplicate card styles
- [x] Test: All cards still work, no visual changes

**Task 9: Extract Input Component**
- [x] Create `src/styles/components/Input.css`
- [x] Copy all input-related styles from index.css
- [x] Consolidate input states (default, hover, focus, error, disabled)
- [x] Consolidate input wrapper, labels, helper text
- [x] Remove duplicate input styles
- [x] Test: All inputs still work, no visual changes

**Task 10: Extract Remaining Shared Components**
- [x] Create `src/styles/components/Skeleton.css` - copy skeleton styles
- [x] Create `src/styles/components/StatusBadge.css` - copy status badge styles
- [x] Create `src/styles/components/Toggle.css` - copy toggle switch styles
- [x] Remove copied styles from index.css
- [x] Test: No visual changes, stylelint passes

### Phase 3: Main Entry Point

**Task 11: Create Main CSS Entry Point**
- [x] Create `src/styles/index.css`
- [x] Add @import for './base.css'
- [x] Add @import for './effects.css'
- [x] Add @import for './animations.css'
- [x] Add @import for all component CSS files
- [x] Update `src/main.tsx`: Change `import './index.css'` to `import './styles/index.css'`
- [x] Test: App loads correctly, no visual changes

**Task 12: Extract Layout Component CSS**
- [x] Create `src/styles/layout.css`
- [x] Copy sidebar styles from index.css
- [x] Copy header styles from index.css
- [x] Copy main layout styles from index.css
- [x] Copy tab navigation styles from index.css
- [x] Add `import '../../styles/layout.css'` to Sidebar.tsx
- [x] Add `import '../../styles/layout.css'` to AppHeader.tsx
- [x] Add `import '../../styles/layout.css'` to MainLayout.tsx
- [x] Test: Layout looks identical

### Phase 4: Tab-Specific CSS (Do All Tabs)

**Task 13: Playlist Tab**
- [x] Create `PlaylistLoaderTab.css` in same directory as component
- [x] Copy all playlist-related styles from index.css
- [x] Find and consolidate duplicate patterns (see Part 6 for reference)
- [x] Replace hardcoded values with CSS variables where possible
- [x] Add `import './PlaylistLoaderTab.css'` to PlaylistLoaderTab.tsx
- [x] Test: Playlist tab looks identical

**Task 14: Audio Analysis Tab**
- [x] Create `AudioAnalysisTab.css`
- [x] Copy all audio analysis styles from index.css
- [x] Consolidate duplicates, replace hardcoded values
- [x] Add import to component
- [x] Test: Audio analysis tab looks identical

**Task 15: Character Gen Tab**
- [x] Create `CharacterGenTab.css`
- [x] Copy all character gen styles from index.css
- [x] Consolidate duplicates, replace hardcoded values
- [x] Add import to component
- [x] Test: Character gen tab looks identical

**Task 16: Session Tab**
- [x] Create `SessionTrackingTab.css`
- [x] Copy all session tracking styles from index.css
- [x] Consolidate duplicates, replace hardcoded values
- [x] Add import to component
- [x] Test: Session tab looks identical

**Task 17: XP Calculator Tab**
- [x] Create `XPCalculatorTab.css`
- [x] Copy all XP calculator styles from index.css
- [x] Consolidate duplicates, replace hardcoded values
- [x] Add import to component
- [x] Test: XP calculator tab looks identical

**Task 18: Leveling Tab**
- [x] Create `CharacterLevelingTab.css`
- [x] Copy all leveling styles from index.css
- [x] Consolidate duplicates, replace hardcoded values
- [x] Add import to component
- [x] Test: Leveling tab looks identical

**Task 19: Sensors Tab**
- [x] Create `EnvironmentalSensorsTab.css`
- [x] Copy all sensors styles from index.css
- [x] Consolidate duplicates, replace hardcoded values
- [x] Add import to component
- [x] Test: Sensors tab looks identical

**Task 20: Gaming Tab**
- [ ] Create `GamingPlatformsTab.css`
- [ ] Copy all gaming styles from index.css
- [ ] Consolidate duplicates, replace hardcoded values
- [ ] Add import to component
- [ ] Test: Gaming tab looks identical

**Task 21: Combat Tab**
- [ ] Create `CombatSimulatorTab.css`
- [ ] Copy all combat styles from index.css
- [ ] Consolidate duplicates, replace hardcoded values
- [ ] Add import to component
- [ ] Test: Combat tab looks identical

**Task 22: Settings Tab**
- [ ] Create `SettingsTab.css`
- [ ] Copy all settings styles from index.css
- [ ] Consolidate duplicates, replace hardcoded values
- [ ] Add import to component
- [ ] Test: Settings tab looks identical

### Phase 5: Finalization

**Task 23: Cleanup & Verification**
- [ ] Verify all styles have been moved from src/index.css
- [ ] ~~* New task * Look at every call of every class in the code to seriously verify that every class is moved from the old index.css file. (Split this into multiple tasks one per page or whatever.)~~
- [ ] [Task 23a] Verify PlaylistLoaderTab classes are moved from index.css
- [ ] [Task 23b] Verify AudioAnalysisTab classes are moved from index.css
- [ ] [Task 23c] Verify CharacterGenTab classes are moved from index.css
- [ ] [Task 23d] Verify SessionTrackingTab classes are moved from index.css
- [ ] [Task 23e] Verify XPCalculatorTab classes are moved from index.css
- [ ] [Task 23f] Verify CharacterLevelingTab classes are moved from index.css
- [ ] [Task 23g] Verify EnvironmentalSensorsTab classes are moved from index.css
- [ ] [Task 23h] Verify GamingPlatformsTab classes are moved from index.css
- [ ] [Task 23i] Verify CombatSimulatorTab classes are moved from index.css
- [ ] [Task 23j] Verify SettingsTab classes are moved from index.css
- [ ] [Task 23k] Verify shared layout classes are moved from index.css
- [ ] Delete old `src/index.css` file
- [ ] Run `npm run build` - should succeed
- [ ] Run `npm run lint:css` - should pass with 0 errors
- [ ] Run `npm run check:css` - braces should be balanced
- [ ] Open app and verify all pages load correctly
- [ ] Full visual regression check: open every tab, test all interactions

**Task 24: Final Optimization Pass**
- [ ] Run stylelint and fix all warnings
- [ ] Search for any remaining duplicate patterns
- [ ] Verify all hardcoded shadows use `var(--shadow-*)` variables
- [ ] Verify all hardcoded border-radius uses `var(--radius)` or `var(--radius-full)`
- [ ] Verify all hardcoded colors use semantic CSS variables
- [ ] Check for unused CSS (manual review)
- [ ] Commit changes with git

**Task 25: Update Documentation**
- [ ] Update UI_IMPROVEMENT_PLAN.md with new CSS structure
- [ ] Document CSS architecture in README if needed
- [ ] Add CSS contribution guidelines
- [ ] Celebrate! 🎉

---

## Part 6: Optimization Checklist (REFERENCE)

Use this checklist when reviewing each CSS section to identify optimization opportunities:

### Find Duplicate Patterns
- [ ] Search for identical CSS blocks across different selectors
- [ ] Look for the same 3-5 properties repeated multiple times
- [ ] Identify components that share the same layout/styling needs

### Consolidation Strategy
- [ ] Create semantic shared classes (e.g., `.tab-header`, `.info-card`, `.action-row`)
- [ ] Use CSS custom properties for values that vary
- [ ] Keep class names descriptive of WHAT something is, not WHAT it looks like

### Hardcoded Value Replacement
- [ ] Replace hardcoded `box-shadow` with `var(--shadow-sm)` / `var(--shadow-md)` / `var(--shadow-lg)`
- [ ] Replace hardcoded `border-radius` with `var(--radius)` or `var(--radius-full)`
- [ ] Replace hardcoded colors with semantic variables like `hsl(var(--background))`
- [ ] Replace hardcoded transition durations with `var(--duration-fast)` / `var(--duration-normal)`
- [ ] Replace hardcoded easing with `var(--ease-out-cubic)` / `var(--ease-spring)`

### Pattern Extraction Examples

**Example 1 - Header Layout Pattern:**
```css
/* Before: Duplicated across 6 different headers */
.playlist-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; gap: 1rem; }
.audio-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; gap: 1rem; }
.character-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; gap: 1rem; }
/* ... */

/* After: One semantic class */
.tab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  gap: 1rem;
}
```

**Example 2 - Card Pattern:**
```css
/* Before: Duplicated across many cards */
.some-card { background-color: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: 0.5rem; padding: 1rem; box-shadow: 0 1px 2px rgb(0 0 0 / 0.3); }
.another-card { background-color: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: 0.5rem; padding: 1rem; box-shadow: 0 1px 2px rgb(0 0 0 / 0.3); }

/* After: Use semantic class with CSS variables */
.card {
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  padding: 1rem;
  box-shadow: var(--shadow-sm);
}
```

**Example 3 - Hover Effects:**
```css
/* Before: Duplicated transition properties */
.btn:hover { transition: all 250ms cubic-bezier(0.33, 1, 0.68, 1); }
.card:hover { transition: all 250ms cubic-bezier(0.33, 1, 0.68, 1); }
.link:hover { transition: all 250ms cubic-bezier(0.33, 1, 0.68, 1); }

/* After: Use CSS variables */
.btn:hover,
.card:hover,
.link:hover {
  transition: all var(--duration-normal) var(--ease-out-cubic);
}
```

---

## Part 7: Verification Strategy

### After Each Task:
1. **Run stylelint**: `npm run lint:css`
2. **Check brace balance**: `npm run check:css`
3. **Visual check**: Open the app and verify the relevant section looks identical
4. **TypeScript check**: `npm run build` to ensure no import errors

### After All Tasks:
1. **Full visual regression**:
   - Open every tab (Playlist, Audio Analysis, Character Gen, etc.)
   - Test all interactive elements (buttons, inputs, cards)
   - Check hover states
   - Check animations

2. **Performance check**:
   - Open DevTools → Network
   - Reload page
   - Check total CSS file size (should be smaller!)
   - Check number of CSS files loaded (should be many smaller files)

3. **Linting check**:
   - `npm run lint:css` should pass with 0 errors
   - Pre-commit hook should work

4. **Build check**:
   - `npm run build` should succeed
   - `npm run preview` should work

---

## Part 8: Expected Outcomes

### File Size Reduction
- **Before**: 10,901 lines in single `src/index.css`
- **After Target**: ~6,000-7,000 lines total across all files
- **Reduction**: ~35-45% through pattern consolidation

### Organization Improvements
- ✅ Co-located CSS with components
- ✅ Clear separation of concerns (base, components, effects, animations, tabs)
- ✅ Semantic shared classes for common patterns
- ✅ No more hunting through 10k lines for a style

### Maintainability Improvements
- ✅ Stylelint catches syntax errors immediately
- ✅ Pre-commit hooks prevent bad CSS from being committed
- ✅ Smaller files are easier to understand and modify
- ✅ Clear patterns for future development

### Performance Improvements
- ✅ Less CSS = smaller bundle size
- ✅ Better caching (shared CSS cached separately from tab-specific)
- ✅ Potential for code splitting in the future

---

## Part 9: Rolling Back If Needed

If something breaks during the refactor:

1. **Git is your friend**: Each task should be a separate commit
2. **Rollback specific task**: `git revert <commit-hash>`
3. **Start fresh from last known good state**: `git reset --hard <commit-hash>`

### Git Commit Strategy
```bash
# After Task 1 (Tooling)
git add .
git commit -m "feat: add stylelint and pre-commit hooks for CSS"

# After Task 2 (Base CSS)
git add .
git commit -m "refactor: extract base CSS to separate file"

# After Task 3 (Effects)
git add .
git commit -m "refactor: extract effects CSS to separate file"

# ... and so on
```

This way, if any task breaks something, you can revert just that task without losing all progress.

---

**END OF PLAN**

Remember: The key to success is **identifying duplicate patterns and consolidating them into semantic classes**. Don't just move CSS around - actively look for duplicates and similar patterns that can be shared.

**Naming Convention Rules:**
- Use semantic names that describe WHAT something is (e.g., `.tab-header`, `.info-card`, `.action-row`)
- NEVER use utility class names that describe what something LOOKS LIKE (no `.p-4`, `.flex-center`, etc.)
- Use CSS custom properties for values that vary
- Keep classes focused and reusable
