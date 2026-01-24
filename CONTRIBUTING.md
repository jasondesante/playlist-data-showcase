# Contributing to Playlist Data Showcase

Thank you for your interest in contributing to the Playlist Data Showcase! This document provides guidelines and instructions for contributing to this project.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Setup Instructions](#setup-instructions)
3. [Development Workflow](#development-workflow)
4. [Testing Guidelines](#testing-guidelines)
5. [Pull Request Guidelines](#pull-request-guidelines)
6. [Code Style](#code-style)
7. [Getting Help](#getting-help)

---

## Project Overview

The **Playlist Data Showcase** is a React-based demonstration application that showcases all features of the `playlist-data-engine` library. This project serves as:

- A **reference implementation** for using the playlist-data-engine library
- A **testing ground** for engine features and APIs
- A **documentation resource** with working examples

### Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Zustand** - State management
- **LocalForage** - Persistent storage
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Key Concepts

- **Hooks** wrap engine modules (e.g., `useCharacterGenerator`)
- **Stores** manage application state with Zustand + LocalForage
- **Components** are modular and organized by feature
- **Data Flow** is unidirectional: Stores → Components → UI

For detailed architecture information, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Setup Instructions

### Prerequisites

- **Node.js** 18+ and npm/yarn/pnpm
- **Git** for version control
- A code editor (VS Code recommended)

### Initial Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd playlist-data-showcase
```

2. **Install dependencies**

```bash
npm install
```

This will also link the local `playlist-data-engine` dependency (defined in `package.json` as `file:/playlist-data-engine`).

3. **Set up environment variables (optional)**

Create a `.env` file in the project root:

```bash
# OpenWeather API Key (for environmental sensors)
VITE_OPENWEATHER_API_KEY=your_api_key_here

# Steam API Key (for gaming platform integration)
VITE_STEAM_API_KEY=your_steam_api_key

# Discord Client ID (for Discord music status)
VITE_DISCORD_CLIENT_ID=your_discord_client_id
```

All environment variables are **optional**. The app will work without them, but some features will be limited.

4. **Start the development server**

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Verifying Your Setup

1. Open `http://localhost:5173` in your browser
2. You should see the Playlist Data Showcase app with 10 tabs in the sidebar
3. Check the browser console for any errors

---

## Development Workflow

### 1. Create a Branch

Always create a branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring

### 2. Make Your Changes

#### Adding a New Tab

1. Create `src/components/Tabs/YourNewTab.tsx`
2. Follow the tab component pattern (see [ARCHITECTURE.md](ARCHITECTURE.md))
3. Import and add to the tabs array in `src/App.tsx`

```typescript
// src/components/Tabs/YourNewTab.tsx
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { RawJsonDump } from '@/components/ui/RawJsonDump';
import { useYourHook } from '@/hooks/useYourHook';

export function YourNewTab() {
    const { someData, performOperation } = useYourHook();

    return (
        <div className="space-y-6">
            <StatusIndicator status="healthy" label="Ready" />
            {/* Your tab content */}
            <RawJsonDump data={someData} title="Results" />
        </div>
    );
}
```

#### Adding a New Hook

1. Create `src/hooks/useYourHook.ts`
2. Import the engine module
3. Wrap engine methods with error handling and logging

```typescript
// src/hooks/useYourHook.ts
import { useCallback, useState } from 'react';
import { EngineModule } from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';

export const useYourHook = () => {
    const [engine] = useState(() => new EngineModule());

    const doSomething = useCallback(async (input: InputType) => {
        logger.info('ModuleName', 'Operation description', { input });

        try {
            const result = await engine.method(input);
            logger.info('ModuleName', 'Result', { result });
            return result;
        } catch (error) {
            handleError(error, 'ModuleName');
            return null;
        }
    }, [engine]);

    return { doSomething };
};
```

#### Adding a New Store

1. Create `src/store/yourStore.ts`
2. Use Zustand with LocalForage persistence

```typescript
// src/store/yourStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';

interface YourState {
    data: DataType | null;
    setData: (data: DataType) => void;
    clearData: () => void;
}

export const useYourStore = create<YourState>()(
    persist(
        (set) => ({
            data: null,
            setData: (data) => {
                logger.info('YourStore', 'Setting data', data);
                set({ data });
            },
            clearData: () => {
                logger.info('YourStore', 'Clearing data');
                set({ data: null });
            },
        }),
        {
            name: 'your-storage',
            storage: createJSONStorage(() => storage),
        }
    )
);
```

### 3. Test Your Changes

- **Type Check**: Run `npm run build` to verify TypeScript compilation
- **Manual Test**: Test your feature in the browser
- **Console Check**: Ensure no errors or warnings

### 4. Commit Your Changes

Use clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add combat simulator tab with turn-by-turn logging"
```

Commit message prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `style:` - Code style changes (formatting, etc.)
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub (see [Pull Request Guidelines](#pull-request-guidelines)).

---

## Testing Guidelines

### Type Checking

The project uses Husky pre-commit hooks to run TypeScript type checking:

```bash
tsc --noEmit
```

This runs automatically on commit. You can also run it manually:

```bash
npm run build
```

### Manual Testing Checklist

When adding or modifying features, test the following:

#### Basic Functionality
- [ ] Feature works as expected
- [ ] No console errors
- [ ] No console warnings (unless intentional)
- [ ] UI renders correctly

#### Error Handling
- [ ] Graceful error messages
- [ ] App doesn't crash on errors
- [ ] StatusIndicator shows error state

#### Persistence
- [ ] Data survives page refresh
- [ ] Settings persist correctly
- [ ] Export/import works

#### Edge Cases
- [ ] Empty states display correctly
- [ ] Loading states show during operations
- [ ] Large datasets don't freeze UI

### Browser Testing

Test in multiple browsers:
- **Chrome/Edge** (Chromium)
- **Firefox**
- **Safari** (if on macOS)

### Mobile Testing

For sensor-related features:
- **iOS Safari** - Test permission flows
- **Android Chrome** - Test sensor availability

---

## Pull Request Guidelines

### PR Title

Use the same format as commit messages:

```
feat: add combat simulator tab with turn-by-turn logging
fix: correct XP calculation for mastered tracks
docs: update ARCHITECTURE.md with new hook pattern
```

### PR Description

Include:

1. **Summary** - What changes did you make?
2. **Motivation** - Why is this change needed?
3. **Testing** - How did you test this?
4. **Screenshots** - For UI changes (if applicable)

Example:

```markdown
## Summary
Added manual attack controls to the Combat Simulator tab, allowing users to select specific weapons and targets instead of auto-attacking.

## Motivation
The auto-attack feature was too limiting for testing combat scenarios. Users need fine-grained control to verify edge cases.

## Testing
- Tested with different weapon types (melee, ranged)
- Tested with multiple targets
- Verified spell slot deduction
- Verified turn advancement after attack

## Screenshots
[Before]
[After]
```

### PR Checklist

Before submitting, ensure:

- [ ] Code follows the project's code style
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Manual testing completed
- [ ] Console is clean (no errors/warnings)
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow conventions

### Review Process

1. **Automated Checks** - Type checking runs automatically
2. **Review** - Maintainers will review your PR
3. **Feedback** - Address any requested changes
4. **Approval** - PR will be merged once approved

---

## Code Style

### TypeScript

- Use **type inference** where possible
- Prefer **interfaces** for object shapes
- Use **type** for unions and aliases
- Avoid **`any`** - use `unknown` or proper types

```typescript
// Good
interface User {
    name: string;
    email: string;
}

// Good
type Status = 'pending' | 'active' | 'inactive';

// Avoid
const data: any = getData();
```

### React

- Use **function components** with hooks
- Prefer **`useCallback`** for functions passed to children
- Use **`useMemo`** for expensive computations
- Follow **Rules of Hooks**

```typescript
// Good
export function MyComponent() {
    const handleClick = useCallback(() => {
        doSomething();
    }, [doSomething]);

    return <button onClick={handleClick}>Click</button>;
}
```

### Naming Conventions

- **Components**: PascalCase (`MyComponent.tsx`)
- **Hooks**: camelCase with `use` prefix (`useMyHook.ts`)
- **Stores**: camelCase with `use` prefix (`useMyStore.ts`)
- **Functions**: camelCase (`handleClick`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_TURNS`)
- **Types/Interfaces**: PascalCase (`MyType`)

### Imports

Group imports in this order:

```typescript
// 1. React
import { useState, useCallback } from 'react';

// 2. Third-party libraries
import { clsx } from 'clsx';

// 3. Engine imports
import { CharacterGenerator } from 'playlist-data-engine';

// 4. Internal imports (absolute path with @ alias)
import { useMyStore } from '@/store/myStore';
import { MyComponent } from '@/components/MyComponent';
import { logger } from '@/utils/logger';

// 5. Types (if separate)
import type { MyType } from '@/types';
```

### Logging

Use the logger utility for consistent logging:

```typescript
import { logger } from '@/utils/logger';

// Info
logger.info('ModuleName', 'Operation description', { data });

// Warning
logger.warn('ModuleName', 'Warning message');

// Error
logger.error('ModuleName', 'Error message', error);

// Debug (only shown in verbose mode)
logger.debug('ModuleName', 'Debug info', data);
```

### Error Handling

Use the centralized error handler:

```typescript
import { handleError } from '@/utils/errorHandling';

try {
    // Some operation
} catch (error) {
    handleError(error, 'ModuleName');
    return null; // or safe default
}
```

---

## Getting Help

### Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Project architecture and patterns
- **[COMPLETION_PLAN.md](COMPLETION_PLAN.md)** - Project roadmap and task tracking
- **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** - Current implementation status
- **[DESIGN_DOCS/FROM_DATA_ENGINE/USAGE_IN_OTHER_PROJECTS.md](DESIGN_DOCS/FROM_DATA_ENGINE/USAGE_IN_OTHER_PROJECTS.md)** - Engine usage examples

### Engine Reference

- `playlist-data-engine/DATA_ENGINE_REFERENCE.md` - Complete engine API docs

### Asking Questions

If you have questions:

1. Check existing documentation and issues
2. Create a GitHub issue with:
   - Clear description of the question
   - Context (what are you trying to do?)
   - What you've already tried

### Reporting Bugs

When reporting bugs, include:

1. **Steps to reproduce** - How to trigger the bug
2. **Expected behavior** - What should happen
3. **Actual behavior** - What actually happens
4. **Screenshots** - If applicable
5. **Environment** - Browser, OS, etc.
6. **Console output** - Any errors/warnings

---

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing! 🚀
