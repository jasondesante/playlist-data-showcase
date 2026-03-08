/**
 * Arweave URL Utilities
 *
 * Provides utilities for parsing, detecting, and constructing Arweave URLs
 * with support for multiple gateways (arweave.net, ardrive.net, turbo-gateway.com, ar.io).
 *
 * Used by the gateway fallback system to resolve media files when the primary gateway fails.
 */

/**
 * Configuration for an Arweave gateway
 */
export interface GatewayConfig {
    /** Gateway hostname (e.g., 'arweave.net') */
    host: string;
    /** Protocol to use (default: 'https') */
    protocol: 'http' | 'https';
    /** Priority order for gateway checking (lower = higher priority) */
    priority: number;
}

/**
 * Parsed information from an Arweave URL
 */
export interface ArweaveUrlInfo {
    /** The 43-character Arweave transaction ID */
    txId: string;
    /** The original URL that was parsed */
    originalUrl: string;
}

/**
 * Default Arweave gateways in priority order
 */
export const DEFAULT_GATEWAYS: GatewayConfig[] = [
    { host: 'arweave.net', protocol: 'https', priority: 0 },
    { host: 'ardrive.net', protocol: 'https', priority: 1 },
    { host: 'turbo-gateway.com', protocol: 'https', priority: 2 },
];

/**
 * Known Arweave gateway hosts for URL detection
 */
export const KNOWN_GATEWAY_HOSTS = [
    'arweave.net',
    'ar.io',
    'ardrive.net',
    'turbo-gateway.com',
] as const;

/**
 * Regex pattern for extracting 43-character Arweave transaction IDs
 * Arweave IDs are base64url-encoded strings (A-Z, a-z, 0-9, -, _)
 */
const ARWEAVE_TXID_REGEX = /[A-Za-z0-9_-]{43}/g;

/**
 * Check if a URL is an Arweave URL
 *
 * Detects:
 * - `ar://` protocol URLs
 * - URLs containing known Arweave gateway hosts
 *
 * @param url - The URL to check
 * @returns true if the URL is an Arweave URL
 */
export function isArweaveUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
        return false;
    }

    // Check for ar:// protocol
    if (url.startsWith('ar://')) {
        return true;
    }

    // Check for known gateway hosts in the URL
    try {
        const urlLower = url.toLowerCase();
        return KNOWN_GATEWAY_HOSTS.some(host => urlLower.includes(host));
    } catch {
        return false;
    }
}

/**
 * Parse an Arweave URL to extract the transaction ID
 *
 * Handles both formats:
 * - `ar://{txId}` - Native Arweave protocol
 * - `https://arweave.net/{txId}` - HTTP gateway URLs
 * - `https://arweave.net/path/{txId}` - URLs with path prefix
 *
 * @param url - The Arweave URL to parse
 * @returns ArweaveUrlInfo if valid, null if not an Arweave URL or no txId found
 */
export function parseArweaveUrl(url: string): ArweaveUrlInfo | null {
    if (!url || typeof url !== 'string') {
        return null;
    }

    // Check if it's an Arweave URL
    if (!isArweaveUrl(url)) {
        return null;
    }

    let txId: string | null = null;

    // Handle ar:// protocol
    if (url.startsWith('ar://')) {
        txId = url.slice(5); // Remove 'ar://' prefix
        // Validate it's a proper txId (43 chars)
        if (txId.length === 43 && /^[A-Za-z0-9_-]+$/.test(txId)) {
            return { txId, originalUrl: url };
        }
    }

    // For HTTP URLs, try to extract txId using regex
    // This handles various URL patterns like:
    // - https://arweave.net/{txId}
    // - https://arweave.net/path/{txId}
    // - https://ardrive.net/{txId}?query=...
    const matches = url.match(ARWEAVE_TXID_REGEX);
    if (matches && matches.length > 0) {
        // Return the first 43-character match that looks like a txId
        txId = matches[0];
        return { txId, originalUrl: url };
    }

    return null;
}

/**
 * Construct a gateway URL from a transaction ID and gateway config
 *
 * @param txId - The 43-character Arweave transaction ID
 * @param gateway - The gateway configuration to use
 * @returns The full gateway URL
 */
export function constructGatewayUrl(txId: string, gateway: GatewayConfig): string {
    const protocol = gateway.protocol || 'https';
    return `${protocol}://${gateway.host}/${txId}`;
}

/**
 * Get all gateway URLs for a transaction ID in priority order
 *
 * @param txId - The 43-character Arweave transaction ID
 * @param gateways - Array of gateway configs (defaults to DEFAULT_GATEWAYS)
 * @returns Array of gateway URLs in priority order
 */
export function getAllGatewayUrls(
    txId: string,
    gateways: GatewayConfig[] = DEFAULT_GATEWAYS
): string[] {
    return gateways
        .sort((a, b) => a.priority - b.priority)
        .map(gateway => constructGatewayUrl(txId, gateway));
}
