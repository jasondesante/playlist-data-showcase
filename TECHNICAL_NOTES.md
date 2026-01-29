# Technical Notes & Implementation Insights

This document captures key architectural decisions, implementation patterns, and technical insights from the IMPROVEMENT_PLAN.md work.

---

## State Management Architecture

### Zustand Store Persistence

| Store | Storage Key | Persistence | Notes |
|-------|-------------|-------------|-------|
| `useCharacterStore` | `character-storage` | ✅ Full | Uses `onRehydrateStorage` callback to restore selectedTrack from activeCharacterId (characterStore.ts:513-555) |
| `usePlaylistStore` | `playlist-storage` | ⚠️ Partial | Excludes `selectedTrack` via `partialize` - intentional design to avoid race conditions with session tracking |
| `useSessionStore` | `session-storage` | ⚠️ Partial | Only persists sessionHistory; active sessions intentionally NOT persisted (SessionTracker cannot restore) |
| `useAppStore` | `app-settings` | ✅ Full | All settings persisted: API keys, audio settings, XP rate |
| `useSensorStore` | `sensor-storage` | ✅ Full | Permissions and context data persisted |
| `useAudioPlayerStore` | None | ❌ None | Playback state NOT persisted - intentional design |

### Cross-Tab State Synchronization

- **Mechanism**: Zustand stores provide global state that persists across component unmount/remount (tab switches)
- **Update Flow**: `updateCharacter()` → `set((state) => ({ characters: [...] }))` → All subscribed components re-render
- **Callback System**: `onPlaylistLoad` callbacks enable cross-store communication
- **No Race Conditions**: All updates are synchronous through Zustand's `set()` function

---

## Component Patterns

### Tab Navigation Pattern

Used in XPCalculatorTab - inline tabs with state string:

```tsx
type XPCalculatorTab = 'calculator' | 'results';
const [activeTab, setActiveTab] = useState<XPCalculatorTab>('calculator');
```

- Active tab styling with background color, font weight, gradient underline indicator
- Pulsing indicator on Results tab button when result exists
- Auto-switch pattern: `setActiveTab('results')` in action handler

### Header Pattern

Compact header design used across all tabs:

- Icon badge: `width: 2.25rem; height: 2.25rem`
- Title: `font-size: 1.25rem; font-weight: 600`
- Subtitle: `font-size: 0.75rem`
- Gap between title/subtitle: `0.125rem`

### Grid Layout Pattern

Mobile-first responsive design:

```css
.grid {
  display: grid;
  grid-template-columns: 1fr; /* Mobile: single column */
  gap: 1.25rem;
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr); /* Desktop: 2 columns */
    gap: 1.5rem;
  }
}
```

**Full-width span pattern** (used for duration input card):

```css
@media (min-width: 768px) {
  .full-width-card {
    grid-column: 1 / -1; /* Spans all columns */
  }
}
```

---

## Performance Optimizations

### React Patterns Used

- **useMemo**: 16 files use for expensive calculations (PartyTab filtered/sorted characters, XPCalculatorTab estimatedXP, SessionTrackingTab XP calculations)
- **useCallback**: Present in key hooks (useSessionTracker, useCharacterUpdater)
- **Zustand selectors**: All components use selector functions to subscribe only to needed state

### Timer/Interval Management

- **SessionTimerManager**: Singleton pattern with proper cleanup (clearInterval on stop)
- **useSessionTracker**: Single global timer persists across tab changes (intentional design)
- **XP animation**: 100ms interval during active sessions, cleaned up with useEffect return
- **useEnvironmentalSensors**: 30-second polling for geolocation/weather
- **useGamingPlatforms**: 1-second polling for Discord activity

### Bundle Characteristics

- Main JavaScript bundle: 717.83 kB (187.67 kB gzipped)
- CSS bundle: 253.64 kB (35.06 kB gzipped)
- All tabs statically imported in App.tsx
- Vite chunk size warning (> 500 kB) is expected for this application type

---

## Key Implementation Details

### Color Palette Extraction

```typescript
// In useAudioAnalyzer.ts
const analyzeTrackWithPalette = async (track: PlaylistTrack) => {
  const [audioResult, colorResult] = await Promise.allSettled([
    AudioAnalyzer.extractSonicFingerprint(track.audio_url),
    ColorExtractor.extractPalette(track.image_url)
  ]);

  const audioProfile = audioResult.status === 'fulfilled' ? audioResult.value : null;
  const colorPalette = colorResult.status === 'fulfilled' ? colorResult.value : null;

  return { ...audioProfile, color_palette: colorPalette };
};
```

- Uses `Promise.allSettled` for parallel execution
- Continues even if color extraction fails (logs warning)
- Color palette merged into AudioProfile object

### Real-Time XP Display Pattern

```tsx
// Combined XP: (base XP + session XP)
<span className="xp-total">
  {(activeCharacter.xp.current + displayedXP).toLocaleString()}
</span>
{displayedXP > 0 && (
  <span className="xp-session-gain">+{displayedXP} this session</span>
)}
```

- `displayedXP` state animates with smooth step animation every 100ms
- Updates in real-time via dependency array in useMemo

### Clickable Alert with Keyboard Support

```tsx
<div
  role="button"
  tabIndex={0}
  aria-label={`${pendingCount} pending stat increases`}
  onClick={handleOpenStatModal}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpenStatModal();
    }
  }}
>
  {pendingCount} stat increases pending
</div>
```

---

## Responsive Design Patterns

### Breakpoint Strategy

- **Mobile base**: All styles start with single-column, stacked layout
- **640px**: Small tablets, larger phones
- **768px**: Standard tablets (main layout breakpoint)
- **1024px+**: Desktop

### Responsive Font Sizing Pattern

```css
.element {
  font-size: 0.875rem; /* Mobile */
}

@media (min-width: 640px) {
  .element {
    font-size: 1rem; /* Tablet+ */
  }
}
```

---

## Audio Analysis Implementation

### Bass/Mid/Treble Understanding

**Critical**: These are "dominance" percentages (0-100%), representing prominence of each frequency range independently.

- They do NOT add up to 100%
- A track can have 80% bass dominance AND 80% treble dominance simultaneously
- Each percentage is calculated independently based on energy in that frequency range

### Playback State Types

```typescript
type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
```

Use `playbackState === 'playing'` to verify audio is actively playing before analysis.

---

## CSS Patterns

### Gradient Border Effect

```css
.card {
  position: relative;
  border: 2px solid hsl(var(--primary) / 0.3);
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(to right, hsl(var(--primary)), hsl(var(--cute-yellow)));
}
```

### Glow Hover Effect

```css
.element:hover {
  box-shadow: 0 0 12px hsl(var(--cute-green) / 0.5);
  transform: translateY(-1px);
}

.element:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px hsl(var(--cute-green) / 0.3);
}
```

### Pulsing Indicator Animation

```css
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}

.indicator {
  animation: pulse 2s ease-in-out infinite;
}
```

---

## Project-Specific Conventions

### Console Logging (Constitution v1.1.0 Principle 3)

**"Console Logging Over Test Suites (comprehensive logging; NO test files)"**

- All console.log statements are intentional for debugging observability
- Logger utility (`src/utils/logger.ts`) explicitly states: "Console logging enabled per Constitution v1.1.0 Principle 3"
- console.warn and console.error are used for legitimate error handling
- No test files in project - console output is the debugging strategy

### Toast Notification Pattern

```typescript
import { showToast } from '@/utils/toast';

// Success
showToast('success', 'XP applied successfully!');

// Error
showToast('error', 'Failed to apply XP');
```

---

## Files Referenced in Implementation

### Core Store Files
- `/workspace/src/store/characterStore.ts` - Character state, XP management
- `/workspace/src/store/playlistStore.ts` - Playlist, track selection
- `/workspace/src/store/sessionStore.ts` - Session tracking
- `/workspace/src/store/appStore.ts` - App settings
- `/workspace/src/store/audioPlayerStore.ts` - Audio playback state

### Key Hooks
- `/workspace/src/hooks/useCharacterUpdater.ts` - Character update operations
- `/workspace/src/hooks/useAudioAnalyzer.ts` - Audio analysis functions
- `/workspace/src/hooks/useSessionTracker.ts` - Session management

### Modified Tabs (from IMPROVEMENT_PLAN)
- `/workspace/src/components/Tabs/AudioAnalysisTab.tsx` - Playback state check, color extraction
- `/workspace/src/components/Tabs/SessionTrackingTab.tsx` - Clickable stats, combined XP, layout reorg
- `/workspace/src/components/Tabs/XPCalculatorTab.tsx` - Two-tab system, compact header, estimated XP
- `/workspace/src/components/Tabs/CharacterLevelingTab.tsx` - Compact header with inline selector

---

## Build Verification Commands

```bash
# Type checking
npx tsc --noEmit

# CSS linting
npm run lint:css

# CSS braces check
npm run check:css

# Full build
npm run build
```

All four checks pass with zero errors as of final implementation.

---

*Last updated: 2026-01-29*
*Generated from IMPROVEMENT_PLAN.md completion*
