# Arweave Gateway Fallback System Implementation Plan

## Overview

Implement an on-demand gateway fallback system for Arweave URLs. When a file fails to load on one gateway, automatically try alternate gateways. This applies to both audio and image loading across the application.

**Problem**: The `arweave.net` gateway has reliability issues, causing media files to fail loading.

**Solution**: Implement lazy, on-demand gateway checking with fallback to `ardrive.net` and `turbo-gateway.com`.

**Key Decision**: Check gateways per-track on-demand (frontend) rather than batch during playlist parsing to avoid slow playlist loads.

---

## Design Decisions

The following decisions were clarified during planning:

| Aspect | Decision |
|--------|----------|
| **All-fail for images** | Use existing Music icon/gradient fallback (same as TrackCard uses for missing artwork) |
| **All-fail for audio** | Fall back to original URL, let existing error handling show "Failed to load audio" |
| **Cache persistence** | In-memory only (no localStorage) |
| **Gateway check strategy** | Sequential (primary → fallbacks one-by-one) |
| **Gateway URL pattern** | All use same pattern: `https://{host}/{txId}` |
| **Timeout** | 5 seconds per gateway check |
| **Cache TTL** | 2 hours (7200000ms) |
| **URL detection scope** | Any URL containing: `arweave.net`, `ar.io`, `ardrive.net`, `turbo-gateway.com`, or `ar://` protocol |
| **Logger** | Use existing `@/utils/logger` |

---

## Phase 1: Core Utilities

> **Note**: Project doesn't have a separate `playlist-data-engine` package. Utilities are created in `src/utils/` instead.

### Task 1.1: Create Arweave URL utilities ✅
- [x] Create `src/utils/arweaveUtils.ts`
  - [x] Define `GatewayConfig` interface (host, protocol, priority)
  - [x] Define `ArweaveUrlInfo` interface (txId, originalUrl)
  - [x] Define `DEFAULT_GATEWAYS` constant array
  - [x] Implement `isArweaveUrl(url: string): boolean`
    - Detect `ar://` protocol
    - Detect URLs containing any known Arweave gateway:
      - `arweave.net`
      - `ar.io`
      - `ardrive.net`
      - `turbo-gateway.com`
  - [x] Implement `parseArweaveUrl(url: string): ArweaveUrlInfo | null`
    - Extract 43-character transaction ID
    - Handle both `ar://{txId}` and `https://arweave.net/{txId}` formats
  - [x] Implement `constructGatewayUrl(txId: string, gateway: GatewayConfig): string`
    - Build URL: `https://{host}/{txId}`

### Task 1.2: Export utilities (N/A)
- [x] ~~Modify `playlist-data-engine/src/index.ts`~~ - Not applicable (no separate package)
  - Utilities are directly importable from `@/utils/arweaveUtils`

---

## Phase 2: Gateway Manager in Frontend

### Task 2.1: Create ArweaveGatewayManager class ✅
- [x] Create `src/utils/arweaveGatewayManager.ts`
  - [x] Define `GatewayCache` interface (txId, workingGateway, timestamp, ttl)
  - [x] Define `GatewayCheckResult` interface (workingUrl, gateway, cached)
  - [x] Implement `ArweaveGatewayManager` class
    - [x] Constructor with config options (gateways, timeout, cacheTTL)
    - [x] Private cache: `Map<string, GatewayCache>`
    - [x] Implement `resolveUrl(url: string): Promise<string>`
      - Check if URL is Arweave
      - Check cache for known working gateway
      - Try each gateway in priority order with timeout
      - Cache successful result
      - Return original URL if all fail
    - [x] Implement `checkGateway(txId: string, gateway: GatewayConfig): Promise<boolean>`
      - Use HEAD request with AbortController for timeout
      - Handle CORS errors gracefully
    - [x] Implement `getCachedGateway(txId: string): GatewayConfig | null`
    - [x] Implement `setCache(txId: string, gateway: GatewayConfig): void`
    - [x] Implement `clearCache(): void`
    - [x] Implement private `isCacheValid(cache: GatewayCache): boolean`

### Task 2.2: Create singleton instance ✅
- [x] Export singleton instance from `arweaveGatewayManager.ts`
- [x] Initialize with config from env.ts (uses defaults for now, will integrate in Phase 3)

---

## Phase 3: Environment Configuration

### Task 3.1: Add Arweave config to env.ts ✅
- [x] Modify `src/utils/env.ts`
  - [x] Add to `envSchema`:
    - `VITE_ARWEAVE_GATEWAY: z.string().optional()`
    - `VITE_ARWEAVE_FALLBACK_GATEWAYS: z.string().optional()`
    - `VITE_ARWEAVE_GATEWAY_TIMEOUT: z.string().optional()`
    - `VITE_ARWEAVE_CACHE_TTL: z.string().optional()`
  - [x] Add to `processEnv` object
  - [x] Add to `config` export:
    - `arweaveGateway: string`
    - `arweaveFallbackGateways: string[]`
    - `arweaveGatewayTimeout: number`
    - `arweaveCacheTTL: number`

### Task 3.2: Update .env.example ✅
- [x] Modify `.env.example`
  - [x] Add `VITE_ARWEAVE_GATEWAY=https://arweave.net`
  - [x] Add `VITE_ARWEAVE_FALLBACK_GATEWAYS=ardrive.net,turbo-gateway.com`
  - [x] Add `VITE_ARWEAVE_GATEWAY_TIMEOUT=5000`
  - [x] Add `VITE_ARWEAVE_CACHE_TTL=7200000` (2 hours)
  - [x] Add comments explaining each variable

---

## Phase 4: Audio Player Integration

### Task 4.1: Integrate gateway manager with audio player ✅
- [x] Modify `src/store/audioPlayerStore.ts`
  - [x] Import `isArweaveUrl` from `playlist-data-engine`
  - [x] Import `arweaveGatewayManager` from `@/utils/arweaveGatewayManager`
  - [x] Import `config` from `@/utils/env`
  - [x] Modify `play(url: string)` method:
    - Check if URL is Arweave
    - If Arweave, await `gatewayManager.resolveUrl(url)`
    - Use resolved URL for `audio.src`
  - [x] Modify `togglePlay(url: string)` method:
    - Same pattern as `play()`
  - [x] Modify `load(url: string)` method:
    - Same pattern as `play()`
  - [x] Add error handling for gateway resolution failures
  - [x] Add logging for gateway fallback events

---

## Phase 5: Image Loading Component

### Task 5.1: Create ArweaveImage component ✅
- [x] Create `src/components/shared/ArweaveImage.tsx`
  - [x] Define props interface extending `React.ImgHTMLAttributes<HTMLImageElement>`
  - [x] Add `fallback?: React.ReactNode` prop for loading/error state (defaults to existing Music icon/gradient)
  - [x] Implement component:
    - [x] State: `resolvedUrl`, `isLoading`, `error`
    - [x] Effect to resolve Arweave URL on mount/URL change
    - [x] Render fallback while loading (use existing TrackCard-style Music icon with gradient)
    - [x] Render `<img>` with resolved URL when ready
    - [x] Handle `onError` for image load failures - render fallback component
    - [x] If all gateways fail, render the fallback (Music icon with gradient, same as TrackCard missing artwork)
  - [x] Export component

### Task 5.2: Update TrackCard component ✅
- [x] Modify `src/components/ui/TrackCard.tsx`
  - [x] Import `ArweaveImage` component
  - [x] Replace `<img src={track.image_url}>` with `<ArweaveImage src={track.image_url}>`
  - [x] Use existing shimmer fallback component
  - [x] When all gateways fail, ArweaveImage renders Music icon/gradient (same visual as current missing artwork)

### Task 5.3: Update ImageFieldInput component
- [ ] Modify `src/components/shared/ImageFieldInput.tsx`
  - [ ] Import `ArweaveImage` component
  - [ ] Replace preview `<img>` with `<ArweaveImage>`
  - [ ] Add icon fallback for loading state

### Task 5.4: Update AppHeader component
- [ ] Modify `src/components/Layout/AppHeader.tsx`
  - [ ] Import `ArweaveImage` component
  - [ ] Replace mini-player artwork `<img>` with `<ArweaveImage>`

---

## Phase 6: Remove Hardcoded Gateways

### Task 6.1: Update usePlaylistParser
- [ ] Modify `src/hooks/usePlaylistParser.ts`
  - [ ] Import `config` from `@/utils/env`
  - [ ] Replace hardcoded `https://arweave.net/${trimmedInput}` with `https://${config.arweaveGateway}/${trimmedInput}`
  - [ ] Add comment explaining gateway configuration

### Task 6.2: Update CombatSimulatorTab
- [ ] Modify `src/components/Tabs/CombatSimulatorTab.tsx`
  - [ ] Import `config` from `@/utils/env`
  - [ ] Replace hardcoded `https://arweave.net/${trimmedInput}` with `https://${config.arweaveGateway}/${trimmedInput}`

---

## Phase 7: Testing & Documentation

### Task 7.1: Write unit tests for arweaveUtils
- [ ] Create `playlist-data-engine/src/utils/__tests__/arweaveUtils.test.ts`
  - [ ] Test `isArweaveUrl()` with various URL formats
  - [ ] Test `parseArweaveUrl()` extracts correct txId
  - [ ] Test `constructGatewayUrl()` builds correct URLs

### Task 7.2: Write unit tests for ArweaveGatewayManager
- [ ] Create `src/utils/__tests__/arweaveGatewayManager.test.ts`
  - [ ] Test gateway priority ordering
  - [ ] Test cache hit/miss scenarios
  - [ ] Test timeout behavior
  - [ ] Test fallback to alternate gateways

### Task 7.3: Write tests for ArweaveImage component
- [ ] Create `src/components/shared/__tests__/ArweaveImage.test.tsx`
  - [ ] Test rendering with non-Arweave URL
  - [ ] Test rendering with Arweave URL
  - [ ] Test fallback rendering during load
  - [ ] Test error handling

### Task 7.4: Manual verification (Optional)
Unit tests in Tasks 7.1-7.3 cover the fallback behavior. Manual verification is optional:
- [ ] Load playlist with Arweave URLs
- [ ] (Optional) Block arweave.net in browser DevTools Network tab to simulate gateway failure
- [ ] Verify fallback to ardrive.net works
- [ ] Verify cache prevents redundant checks on replay

**Note**: To block a domain in Chrome DevTools:
1. Open DevTools (F12) → Network tab
2. Right-click any request to arweave.net
3. Select "Block request URL" or add pattern in Network request blocking
4. Reload and verify fallback behavior

---

## Dependencies

- **playlist-data-engine**: Must be modified first to provide URL parsing utilities
- **env.ts**: Must be updated before GatewayManager can use config
- **GatewayManager**: Must be created before audio/image integration

---

## Questions/Unknowns

<details>
<summary>Resolved During Planning (click to expand)</summary>

| Question | Decision |
|----------|----------|
| Should we persist the gateway cache to localStorage? | **No** - In-memory only for simplicity |
| Should we add health monitoring for gateway uptime? | **Deferred** - Could be future enhancement |
| Should we implement parallel gateway checking? | **No** - Sequential is simpler and uses less bandwidth |

</details>

### Future Enhancements (Out of Scope)
- [ ] Health monitoring to track gateway uptime and adjust priorities dynamically
- [ ] Parallel gateway checking for faster resolution (race to first response)
- [ ] localStorage persistence for cross-session cache survival

---

## Files Summary

### New Files (3)
| File | Purpose |
|------|---------|
| `playlist-data-engine/src/utils/arweaveUtils.ts` | URL parsing utilities |
| `src/utils/arweaveGatewayManager.ts` | Gateway fallback manager |
| `src/components/shared/ArweaveImage.tsx` | Async image component |

### Modified Files (9)
| File | Changes |
|------|---------|
| `playlist-data-engine/src/index.ts` | Export new utilities |
| `src/utils/env.ts` | Add Arweave config |
| `.env.example` | Document new vars |
| `src/store/audioPlayerStore.ts` | Integrate gateway resolution |
| `src/components/ui/TrackCard.tsx` | Use ArweaveImage |
| `src/components/shared/ImageFieldInput.tsx` | Use ArweaveImage |
| `src/components/Layout/AppHeader.tsx` | Use ArweaveImage |
| `src/hooks/usePlaylistParser.ts` | Use configured gateway |
| `src/components/Tabs/CombatSimulatorTab.tsx` | Use configured gateway |

---

## Estimated Effort

| Phase | Tasks | Complexity |
|-------|-------|------------|
| Phase 1: Core Utilities | 2 | Low |
| Phase 2: Gateway Manager | 2 | Medium |
| Phase 3: Environment | 2 | Low |
| Phase 4: Audio Integration | 1 | Medium |
| Phase 5: Image Component | 4 | Medium |
| Phase 6: Hardcoded Removal | 2 | Low |
| Phase 7: Testing | 4 | Medium |
