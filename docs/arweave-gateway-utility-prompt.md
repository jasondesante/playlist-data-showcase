# Prompt for Arweave Gateway Utility Library

I need a utility library for handling Arweave URLs with gateway fallback support. The library should handle the complexity of Arweave's URL formats and provide both fast gateway-swapping functions and a full availability-checking function.

## URL Formats to Support

Arweave URLs come in several formats that the library must parse and handle:

1. **Native protocol**: `ar://{txId}` (43-character transaction ID)
2. **Native protocol with path**: `ar://{txId}/path/to/file.jpg`
3. **HTTP gateway**: `https://arweave.net/{txId}`
4. **HTTP gateway with path suffix**: `https://arweave.net/{txId}/folder/image.png`
5. **With query strings**: `https://arweave.net/{txId}?width=100`
6. **With hash fragments**: `https://arweave.net/{txId}#section`

### Critical: Path Suffix Preservation

URLs can have additional path segments after the 43-character transaction ID. For example:

```
https://arweave.net/QH7cJzNf___VvxPOQgxL9kPULL5HOfj2esUzR3zi8mE/cs-plate.jpeg-image_small
```

The path `/cs-plate.jpeg-image_small` must be preserved when swapping gateways. The txId is `QH7cJzNf___VvxPOQgxL9kPULL5HOfj2esUzR3zi8mE` (43 chars).

## Functions Required

### 1. `parseArweaveUrl(url: string): ArweaveUrlInfo | null`

**Fast - no network calls**

Extracts structured data from any Arweave URL format. Returns:

```typescript
interface ArweaveUrlInfo {
  txId: string;           // 43-character transaction ID
  originalUrl: string;    // The input URL
  pathSuffix: string;     // Path after txId (e.g., '/image.png') or empty string
  gatewayHost: string | null;  // 'arweave.net', 'ardrive.net', etc., or null for ar://
}
```

Returns `null` for non-Arweave URLs or invalid txIds.

### 2. `swapGateway(url: string, targetGateway: string): string`

**Fast - no network calls**

Takes any Arweave URL and returns the same resource on a different gateway. Preserves the path suffix.

Examples:

```typescript
swapGateway('https://arweave.net/ABC123/image.png', 'ardrive.net')
// → 'https://ardrive.net/ABC123/image.png'

swapGateway('ar://ABC123/file.jpg', 'turbo-gateway.com')
// → 'https://turbo-gateway.com/ABC123/file.jpg'

swapGateway('https://ardrive.net/ABC123', 'arweave.net')
// → 'https://arweave.net/ABC123'
```

If given URL is not an Arweave URL, return it unchanged.

### 3. `toFirstGateway(url: string): string`

**Fast - no network calls**

Converts `ar://` protocol URLs to the first (primary) gateway. If the URL is already an HTTP gateway URL, return it unchanged.

Examples:

```typescript
toFirstGateway('ar://ABC123/image.png')
// → 'https://arweave.net/ABC123/image.png'

toFirstGateway('https://ardrive.net/ABC123')
// → 'https://ardrive.net/ABC123' (unchanged)
```

### 4. `resolveArweaveUrl(url: string, options?): Promise<string>`

**Full - checks actual file availability**

Checks if the file is actually accessible, trying multiple gateways if the first fails. This is the "slow but reliable" function.

**Behavior:**

1. If not an Arweave URL, return unchanged
2. Check cache for known working gateway for this txId
3. If cached, construct URL with that gateway (include path suffix)
4. If not cached, try each gateway in priority order:
   - Use HEAD request with timeout (e.g., 5 seconds)
   - Handle CORS errors gracefully (treat as failure)
   - On success, cache the working gateway
5. If all gateways fail, return the original URL

**Options:**

```typescript
interface ResolveOptions {
  gateways?: string[];      // Default: ['arweave.net', 'ardrive.net', 'turbo-gateway.com']
  timeout?: number;         // Default: 5000 (ms)
  cacheTTL?: number;        // Default: 7200000 (2 hours)
  onGatewayCheck?: (gateway: string, success: boolean) => void;  // Optional callback
}
```

## Configuration

The library should allow configuration of:

- Default gateway list (ordered by priority)
- Timeout per gateway check
- Cache TTL (in-memory cache, no localStorage)
- Whether to log gateway check results

## Edge Cases to Handle

1. **Non-Arweave URLs**: Pass through unchanged
2. **Invalid txIds**: Return null from parse, pass through from other functions
3. **Multiple txId-like strings**: Extract the first valid 43-character match
4. **Query strings and hash fragments**: Strip from pathSuffix (they don't transfer between gateways reliably)
5. **CORS errors**: Treat as gateway failure, try next gateway
6. **Timeouts**: Abort and try next gateway
7. **All gateways fail**: Return original URL (let existing error handling show failure)

## Known Gateway Hosts

For URL detection, check for these hosts in the URL:

- `arweave.net`
- `ar.io`
- `ardrive.net`
- `turbo-gateway.com`

Also detect `ar://` protocol.

## Transaction ID Format

Arweave txIds are 43 characters, base64url-encoded: `[A-Za-z0-9_-]{43}`

## Example Implementation Reference

Here's a TypeScript interface summary:

```typescript
// Types
interface ArweaveUrlInfo {
  txId: string;
  originalUrl: string;
  pathSuffix: string;
  gatewayHost: string | null;
}

interface ResolveOptions {
  gateways?: string[];
  timeout?: number;
  cacheTTL?: number;
  onGatewayCheck?: (gateway: string, success: boolean) => void;
}

// Fast functions (no network)
function parseArweaveUrl(url: string): ArweaveUrlInfo | null;
function swapGateway(url: string, targetGateway: string): string;
function toFirstGateway(url: string): string;

// Full function (network checks)
function resolveArweaveUrl(url: string, options?: ResolveOptions): Promise<string>;
```

## Summary of Key Lessons Learned

1. **Path suffix preservation** - URLs like `https://arweave.net/{txId}/file.jpg` need the `/file.jpg` part preserved when swapping gateways
2. **Three function types** - fast swap, fast convert, full resolve give flexibility for different use cases
3. **Query/hash stripping** - these don't transfer reliably between gateways, strip them from pathSuffix
4. **Return original URL on failure** - lets existing error handling in the app work normally
5. **Gateway host in parsed info** - useful for knowing which gateway a URL currently uses
