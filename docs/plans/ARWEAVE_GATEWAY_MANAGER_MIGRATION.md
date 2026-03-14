# ArweaveGatewayManager Migration Plan

## Overview

Migrate the `ArweaveGatewayManager` from `playlist-data-showcase` to `playlist-data-engine` to provide centralized gateway fallback functionality for all Arweave resources (model URLs, images, audio files, etc.).

**Problem Statement:**
- The `turbo-gateway.com` gateway returns 499 errors, causing model loading failures
- `playlist-data-engine` provides `DEFAULT_ARWEAVE_MODELS` with hardcoded gateway URLs but has no fallback mechanism
- Gateway resolution logic only exists in the showcase, creating code duplication and missed resolution opportunities

**Solution:**
Move the complete gateway management system to the engine where it belongs, since the engine is the source of Arweave URLs for models, spells, items, and other RPG mechanics.

---

## Phase 1: Enhance Engine's arweaveUtils.ts

Update the engine's utility file to match the showcase's enhanced version.

- [x] **1.1 Update ArweaveUrlInfo interface**
  - [x] Add `pathSuffix: string` property to support URLs like `{txId}/model.json`
  - [x] Update JSDoc examples to show path suffix usage

- [x] **1.2 Update parseArweaveUrl function**
  - [x] Add logic to extract path suffix after txId (e.g., `/model.json`)
  - [x] Handle query strings and fragments correctly
  - [x] Return `pathSuffix` in the result object

- [x] **1.3 Update constructGatewayUrl function**
  - [x] Add optional `pathSuffix` parameter
  - [x] Append pathSuffix to constructed URL

- [x] **1.4 Add getAllGatewayUrls function**
  - [x] Create function that returns all gateway URLs for a txId in priority order
  - [x] Accept optional gateways array (default to DEFAULT_GATEWAYS)
  - [x] Accept optional pathSuffix parameter

- [x] **1.5 Add KNOWN_GATEWAY_HOSTS constant**
  - [x] Export as `const` array for external use

- [x] **1.6 Add unit tests**
  - [x] Create `src/utils/__tests__/arweaveUtils.test.ts` (59 tests, all passing)
  - [x] Test pathSuffix extraction for various URL formats
  - [x] Test constructGatewayUrl with pathSuffix
  - [x] Test getAllGatewayUrls ordering

---

## Phase 2: Create ArweaveGatewayManager in Engine

Port the showcase's gateway manager to the engine with engine-compatible logging.

- [ ] **2.1 Create src/utils/arweaveGatewayManager.ts**
  - [ ] Copy core class structure from showcase
  - [ ] Replace showcase logger import with engine's logger
  - [ ] Import utilities from `./arweaveUtils.js`

- [ ] **2.2 Port GatewayCache interface**
  - [ ] Include txId, workingGateway, timestamp, ttl

- [ ] **2.3 Port GatewayCheckResult interface**
  - [ ] Include workingUrl, gateway, cached boolean

- [ ] **2.4 Port ArweaveGatewayManagerConfig interface**
  - [ ] Include optional gateways, timeout, cacheTTL

- [ ] **2.5 Port ArweaveGatewayManager class**
  - [ ] `resolveUrl(url: string): Promise<string>` - Main resolution method
  - [ ] `checkGateway(txId, gateway, pathSuffix): Promise<boolean>` - HEAD request check
  - [ ] `getCachedGateway(txId): GatewayConfig | null` - Cache lookup
  - [ ] `setCache(txId, gateway): void` - Cache storage
  - [ ] `clearCache(): void` - Cache clearing
  - [ ] `isCacheValid(cache): boolean` - TTL validation

- [ ] **2.6 Export singleton instance**
  - [ ] `export const arweaveGatewayManager = new ArweaveGatewayManager()`

- [ ] **2.7 Port unit tests**
  - [ ] Create `tests/unit/arweaveGatewayManager.test.ts`
  - [ ] Port all 33 test cases from showcase
  - [ ] Test gateway priority ordering
  - [ ] Test cache hit/miss scenarios
  - [ ] Test timeout behavior
  - [ ] Test fallback to alternate gateways
  - [ ] Test pathSuffix handling

---

## Phase 3: Export from Engine's Public API

Make the gateway manager available to consumers.

- [ ] **3.1 Update src/index.ts exports**
  - [ ] Add `ArweaveGatewayManager` class export
  - [ ] Add `arweaveGatewayManager` singleton export
  - [ ] Add `ArweaveGatewayManagerConfig` type export
  - [ ] Add `GatewayCache` type export
  - [ ] Add `GatewayCheckResult` type export
  - [ ] Add `getAllGatewayUrls` function export

- [x] **3.2 Update existing arweaveUtils exports**
  - [x] Ensure `pathSuffix` is in ArweaveUrlInfo type
  - [x] Export updated `constructGatewayUrl` signature
  - [x] Export `KNOWN_GATEWAY_HOSTS`

- [x] **3.3 Verify build succeeds**
  - [x] Run `npm run build` in engine
  - [x] Check for TypeScript errors
  - [x] Verify exports are accessible

---

## Phase 4: Add Gateway Resolution to MusicClassifier

Enable the engine to resolve model URLs before loading.

- [ ] **4.1 Add resolveUrl option to MusicClassifierOptions**
  - [ ] Add optional `resolveUrl?: (url: string) => Promise<string>` callback
  - [ ] Document that this is used for Arweave URL resolution

- [ ] **4.2 Update loadModelWithRetry method**
  - [ ] Call `resolveUrl` on modelUrl before loading (if provided)
  - [ ] Log when URL is resolved to different gateway

- [ ] **4.3 Update loadModels method**
  - [ ] Resolve embedding and classifier URLs if resolveUrl is provided
  - [ ] Cache resolved URLs to avoid repeated resolution

- [ ] **4.4 Add integration tests**
  - [ ] Test MusicClassifier with mock resolveUrl callback
  - [ ] Test that resolved URLs are used for model loading

---

## Phase 5: Update Showcase to Use Engine Exports

Remove duplicated code and import from engine.

- [ ] **5.1 Update useMusicClassifier.ts**
  - [ ] Import `arweaveGatewayManager` from `playlist-data-engine`
  - [ ] Pass `resolveUrl: arweaveGatewayManager.resolveUrl.bind(arweaveGatewayManager)` to MusicClassifier options
  - [ ] This enables automatic gateway resolution for model URLs

- [ ] **5.2 Update audioPlayerStore.ts**
  - [ ] Change import from `@/utils/arweaveGatewayManager` to `playlist-data-engine`
  - [ ] Change import from `@/utils/arweaveUtils` to `playlist-data-engine`

- [ ] **5.3 Update ArweaveImage.tsx**
  - [ ] Change import from `../../utils/arweaveGatewayManager` to `playlist-data-engine`
  - [ ] Change import from `../../utils/arweaveUtils` to `playlist-data-engine`

- [ ] **5.4 Update test mocks**
  - [ ] Update `ArweaveImage.test.tsx` mock path to `playlist-data-engine`
  - [ ] Update `arweaveGatewayManager.test.ts` to import from engine (or delete if tests moved to engine)

- [ ] **5.5 Remove duplicate files from showcase**
  - [ ] Delete `src/utils/arweaveGatewayManager.ts`
  - [ ] Delete `src/utils/arweaveUtils.ts`
  - [ ] Delete `src/utils/__tests__/arweaveGatewayManager.test.ts`
  - [ ] Delete `src/utils/__tests__/arweaveUtils.test.ts`

- [ ] **5.6 Update any remaining imports**
  - [ ] Search for any other files importing from local arweaveUtils
  - [ ] Update to import from engine

---

## Phase 6: Fix MODEL_PRESETS Gateway URLs

Ensure default models use reliable gateways.

- [ ] **6.1 Review MODEL_PRESETS in useMusicClassifier.ts**
  - [ ] Replace `turbo-gateway.com` URLs with `arweave.net` equivalents
  - [ ] The same txId can be accessed via any gateway

- [ ] **6.2 Review DEFAULT_ARWEAVE_MODELS in MusicClassifier.ts**
  - [ ] Update danceability model URL from turbo-gateway to arweave.net
  - [ ] All other models already use arweave.net

- [ ] **6.3 Document gateway independence**
  - [ ] Add comment explaining that any gateway can serve any txId
  - [ ] The resolveUrl mechanism will handle fallback automatically

---

## Phase 7: Optional Enhancements

Future improvements that could be added.

- [ ] **7.1 Add gateway resolution for images in engine**
  - [ ] ColorExtractor could resolve image URLs before loading
  - [ ] PlaylistParser could resolve track images

- [ ] **7.2 Add prefetch/warmup capability**
  - [ ] Method to pre-check and cache gateways for known txIds
  - [ ] Useful for preloading model URLs on app startup

- [ ] **7.3 Add gateway health monitoring**
  - [ ] Track gateway response times
  - [ ] Dynamically adjust priorities based on performance

---

## Dependencies

- **Engine must be updated first** - Showcase depends on engine exports
- **Tests must pass in both packages** after each phase
- **TypeScript compilation** must succeed after each phase

---

## Questions/Unknowns

1. **Should the engine have a default resolveUrl in MusicClassifier?**
   - Option A: Require explicit `resolveUrl` callback (current plan)
   - Option B: Auto-import singleton and use by default
   - **Recommendation:** Option A for explicit dependency injection, easier testing

2. **Should gateway priority order be configurable?**
   - Currently hardcoded as: arweave.net, ar.io, ardrive.net, turbo-gateway.com
   - Could expose as configuration option
   - **Recommendation:** Keep hardcoded for now, add config if needed

3. **How to handle engine's Logger vs showcase's logger?**
   - Engine has `Logger` class with static methods
   - Showcase has `logger` singleton instance
   - **Recommendation:** Use engine's Logger in the migrated code

---

## File Changes Summary

### playlist-data-engine

| File | Action |
|------|--------|
| `src/utils/arweaveUtils.ts` | Modify - add pathSuffix support, getAllGatewayUrls |
| `src/utils/arweaveGatewayManager.ts` | Create - port from showcase |
| `src/core/analysis/MusicClassifier.ts` | Modify - add resolveUrl option |
| `src/index.ts` | Modify - add exports |
| `tests/unit/arweaveUtils.test.ts` | Create |
| `tests/unit/arweaveGatewayManager.test.ts` | Create - port from showcase |

### playlist-data-showcase

| File | Action |
|------|--------|
| `src/utils/arweaveUtils.ts` | Delete |
| `src/utils/arweaveGatewayManager.ts` | Delete |
| `src/utils/__tests__/arweaveUtils.test.ts` | Delete |
| `src/utils/__tests__/arweaveGatewayManager.test.ts` | Delete |
| `src/hooks/useMusicClassifier.ts` | Modify - use engine exports, pass resolveUrl |
| `src/store/audioPlayerStore.ts` | Modify - import from engine |
| `src/components/shared/ArweaveImage.tsx` | Modify - import from engine |
| `src/components/shared/__tests__/ArweaveImage.test.tsx` | Modify - update mock path |

---

## Success Criteria

- [ ] `turbo-gateway.com` failures automatically fall back to working gateways
- [ ] Model loading in MusicClassifier uses resolved URLs
- [ ] No duplicate code between engine and showcase
- [ ] All existing tests pass
- [ ] New tests in engine cover gateway manager functionality
- [ ] TypeScript compilation succeeds in both packages
