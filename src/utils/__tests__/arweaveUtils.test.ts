/**
 * Unit Tests for Arweave URL Utilities
 *
 * Task 7.1: Test URL parsing, detection, and construction utilities
 * - Test isArweaveUrl() with various URL formats
 * - Test parseArweaveUrl() extracts correct txId
 * - Test constructGatewayUrl() builds correct URLs
 * - Test getAllGatewayUrls() returns URLs in priority order
 */

import { describe, it, expect } from 'vitest';
import {
    isArweaveUrl,
    parseArweaveUrl,
    constructGatewayUrl,
    getAllGatewayUrls,
    DEFAULT_GATEWAYS,
    KNOWN_GATEWAY_HOSTS,
    type GatewayConfig,
} from '../arweaveUtils';

// ============================================================
// Test Data: Valid Arweave Transaction IDs (43 chars)
// ============================================================

/** A valid 43-character Arweave transaction ID for testing */
const VALID_TX_ID = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk012345';

/** Another valid txId with different characters */
const VALID_TX_ID_2 = 'aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789-_abc';

// ============================================================
// Task 7.1.1: Test isArweaveUrl() with various URL formats
// ============================================================

describe('isArweaveUrl', () => {
    describe('ar:// protocol detection', () => {
        it('should return true for ar:// protocol URLs', () => {
            expect(isArweaveUrl('ar://' + VALID_TX_ID)).toBe(true);
        });

        it('should return true for ar:// protocol with valid txId', () => {
            expect(isArweaveUrl('ar://' + VALID_TX_ID)).toBe(true);
        });
    });

    describe('arweave.net gateway detection', () => {
        it('should return true for https://arweave.net URLs', () => {
            expect(isArweaveUrl('https://arweave.net/' + VALID_TX_ID)).toBe(true);
        });

        it('should return true for http://arweave.net URLs', () => {
            expect(isArweaveUrl('http://arweave.net/' + VALID_TX_ID)).toBe(true);
        });

        it('should return true for URLs with subdomains on arweave.net', () => {
            expect(isArweaveUrl('https://gateway.arweave.net/' + VALID_TX_ID)).toBe(true);
        });
    });

    describe('ar.io gateway detection', () => {
        it('should return true for https://ar.io URLs', () => {
            expect(isArweaveUrl('https://ar.io/' + VALID_TX_ID)).toBe(true);
        });

        it('should return true for URLs with ar.io in path (partial substring match)', () => {
            expect(isArweaveUrl('https://some-ar.io-domain.com/file')).toBe(true);
        });
    });

    describe('ardrive.net gateway detection', () => {
        it('should return true for https://ardrive.net URLs', () => {
            expect(isArweaveUrl('https://ardrive.net/' + VALID_TX_ID)).toBe(true);
        });

        it('should return true for ardrive.net with paths', () => {
            expect(isArweaveUrl('https://ardrive.net/path/to/' + VALID_TX_ID)).toBe(true);
        });
    });

    describe('turbo-gateway.com detection', () => {
        it('should return true for https://turbo-gateway.com URLs', () => {
            expect(isArweaveUrl('https://turbo-gateway.com/' + VALID_TX_ID)).toBe(true);
        });
    });

    describe('non-Arweave URLs', () => {
        it('should return false for regular HTTP URLs', () => {
            expect(isArweaveUrl('https://example.com/file.mp3')).toBe(false);
        });

        it('should return false for IPFS URLs', () => {
            expect(isArweaveUrl('ipfs://QmSomeHash')).toBe(false);
        });

        it('should return false for data URLs', () => {
            expect(isArweaveUrl('data:image/png;base64,abc123')).toBe(false);
        });

        it('should return false for local file paths', () => {
            expect(isArweaveUrl('/local/path/to/file.mp3')).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(isArweaveUrl('')).toBe(false);
        });

        it('should return false for URLs with different domains (not containing known gateway strings)', () => {
            expect(isArweaveUrl('https://myarweave.com/file')).toBe(false);
            expect(isArweaveUrl('https://example.com/arweave/file')).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('should return false for null input', () => {
            expect(isArweaveUrl(null as unknown as string)).toBe(false);
        });

        it('should return false for undefined input', () => {
            expect(isArweaveUrl(undefined as unknown as string)).toBe(false);
        });

        it('should return false for number input', () => {
            expect(isArweaveUrl(123 as unknown as string)).toBe(false);
        });

        it('should handle case-insensitive matching', () => {
            expect(isArweaveUrl('HTTPS://ARWEAVE.NET/abc')).toBe(true);
            expect(isArweaveUrl('https://arweave.net/abc')).toBe(true);
            expect(isArweaveUrl('https://arDrive.net/abc')).toBe(true);
        });
    });
});

// ============================================================
// Task 7.1.2: Test parseArweaveUrl() extracts correct txId
// ============================================================

describe('parseArweaveUrl', () => {
    describe('ar:// protocol parsing', () => {
        it('should extract txId from ar:// protocol URL', () => {
            const result = parseArweaveUrl('ar://' + VALID_TX_ID);
            expect(result).toEqual({
                txId: VALID_TX_ID,
                originalUrl: 'ar://' + VALID_TX_ID,
            });
        });

        it('should return null for ar:// with invalid txId (wrong length)', () => {
            const result = parseArweaveUrl('ar://tooshort');
            expect(result).toBeNull();
        });

        it('should return null for ar:// with invalid characters', () => {
            const result = parseArweaveUrl('ar://invalid!@#$%^&*()characters123456789012345');
            expect(result).toBeNull();
        });
    });

    describe('arweave.net URL parsing', () => {
        it('should extract txId from https://arweave.net/{txId}', () => {
            const url = 'https://arweave.net/' + VALID_TX_ID;
            const result = parseArweaveUrl(url);
            expect(result).toEqual({
                txId: VALID_TX_ID,
                originalUrl: url,
            });
        });

        it('should extract txId from URL with path prefix', () => {
            const url = 'https://arweave.net/path/to/' + VALID_TX_ID;
            const result = parseArweaveUrl(url);
            expect(result).toEqual({
                txId: VALID_TX_ID,
                originalUrl: url,
            });
        });

        it('should extract txId from URL with query string', () => {
            const url = 'https://arweave.net/' + VALID_TX_ID + '?query=value';
            const result = parseArweaveUrl(url);
            expect(result).toEqual({
                txId: VALID_TX_ID,
                originalUrl: url,
            });
        });

        it('should extract txId from URL with hash fragment', () => {
            const url = 'https://arweave.net/' + VALID_TX_ID + '#section';
            const result = parseArweaveUrl(url);
            expect(result).toEqual({
                txId: VALID_TX_ID,
                originalUrl: url,
            });
        });
    });

    describe('ardrive.net URL parsing', () => {
        it('should extract txId from https://ardrive.net/{txId}', () => {
            const url = 'https://ardrive.net/' + VALID_TX_ID;
            const result = parseArweaveUrl(url);
            expect(result).toEqual({
                txId: VALID_TX_ID,
                originalUrl: url,
            });
        });
    });

    describe('turbo-gateway.com URL parsing', () => {
        it('should extract txId from https://turbo-gateway.com/{txId}', () => {
            const url = 'https://turbo-gateway.com/' + VALID_TX_ID;
            const result = parseArweaveUrl(url);
            expect(result).toEqual({
                txId: VALID_TX_ID,
                originalUrl: url,
            });
        });
    });

    describe('ar.io URL parsing', () => {
        it('should extract txId from https://ar.io/{txId}', () => {
            const url = 'https://ar.io/' + VALID_TX_ID;
            const result = parseArweaveUrl(url);
            expect(result).toEqual({
                txId: VALID_TX_ID,
                originalUrl: url,
            });
        });
    });

    describe('non-Arweave URLs', () => {
        it('should return null for non-Arweave URLs', () => {
            expect(parseArweaveUrl('https://example.com/file.mp3')).toBeNull();
        });

        it('should return null for empty string', () => {
            expect(parseArweaveUrl('')).toBeNull();
        });
    });

    describe('edge cases', () => {
        it('should return null for null input', () => {
            expect(parseArweaveUrl(null as unknown as string)).toBeNull();
        });

        it('should return null for undefined input', () => {
            expect(parseArweaveUrl(undefined as unknown as string)).toBeNull();
        });

        it('should extract first 43-char txId when multiple potential matches exist', () => {
            const url = 'https://arweave.net/' + VALID_TX_ID + '/related/' + VALID_TX_ID_2;
            const result = parseArweaveUrl(url);
            expect(result?.txId).toBe(VALID_TX_ID);
        });
    });
});

// ============================================================
// Task 7.1.3: Test constructGatewayUrl() builds correct URLs
// ============================================================

describe('constructGatewayUrl', () => {
    it('should construct HTTPS URL with default protocol', () => {
        const gateway: GatewayConfig = { host: 'arweave.net', protocol: 'https', priority: 0 };
        const result = constructGatewayUrl(VALID_TX_ID, gateway);
        expect(result).toBe('https://arweave.net/' + VALID_TX_ID);
    });

    it('should construct HTTP URL when specified', () => {
        const gateway: GatewayConfig = { host: 'arweave.net', protocol: 'http', priority: 0 };
        const result = constructGatewayUrl(VALID_TX_ID, gateway);
        expect(result).toBe('http://arweave.net/' + VALID_TX_ID);
    });

    it('should construct URL for ardrive.net gateway', () => {
        const gateway: GatewayConfig = { host: 'ardrive.net', protocol: 'https', priority: 1 };
        const result = constructGatewayUrl(VALID_TX_ID, gateway);
        expect(result).toBe('https://ardrive.net/' + VALID_TX_ID);
    });

    it('should construct URL for turbo-gateway.com', () => {
        const gateway: GatewayConfig = { host: 'turbo-gateway.com', protocol: 'https', priority: 2 };
        const result = constructGatewayUrl(VALID_TX_ID, gateway);
        expect(result).toBe('https://turbo-gateway.com/' + VALID_TX_ID);
    });

    it('should handle gateway host with port', () => {
        const gateway: GatewayConfig = { host: 'localhost:8080', protocol: 'http', priority: 0 };
        const result = constructGatewayUrl(VALID_TX_ID, gateway);
        expect(result).toBe('http://localhost:8080/' + VALID_TX_ID);
    });
});

// ============================================================
// Additional Tests: getAllGatewayUrls()
// ============================================================

describe('getAllGatewayUrls', () => {
    it('should return URLs in priority order using default gateways', () => {
        const urls = getAllGatewayUrls(VALID_TX_ID);
        expect(urls).toHaveLength(3);
        expect(urls[0]).toBe('https://arweave.net/' + VALID_TX_ID);
        expect(urls[1]).toBe('https://ardrive.net/' + VALID_TX_ID);
        expect(urls[2]).toBe('https://turbo-gateway.com/' + VALID_TX_ID);
    });

    it('should return URLs in priority order with custom gateways', () => {
        const customGateways: GatewayConfig[] = [
            { host: 'custom1.com', protocol: 'https', priority: 2 },
            { host: 'custom2.com', protocol: 'https', priority: 0 },
            { host: 'custom3.com', protocol: 'https', priority: 1 },
        ];
        const urls = getAllGatewayUrls(VALID_TX_ID, customGateways);
        expect(urls).toHaveLength(3);
        expect(urls[0]).toBe('https://custom2.com/' + VALID_TX_ID);
        expect(urls[1]).toBe('https://custom3.com/' + VALID_TX_ID);
        expect(urls[2]).toBe('https://custom1.com/' + VALID_TX_ID);
    });

    it('should return empty array for empty gateways list', () => {
        const urls = getAllGatewayUrls(VALID_TX_ID, []);
        expect(urls).toEqual([]);
    });
});

// ============================================================
// Additional Tests: Constants
// ============================================================

describe('Constants', () => {
    describe('DEFAULT_GATEWAYS', () => {
        it('should have arweave.net as first gateway (priority 0)', () => {
            expect(DEFAULT_GATEWAYS[0].host).toBe('arweave.net');
            expect(DEFAULT_GATEWAYS[0].priority).toBe(0);
        });

        it('should have ardrive.net as second gateway (priority 1)', () => {
            expect(DEFAULT_GATEWAYS[1].host).toBe('ardrive.net');
            expect(DEFAULT_GATEWAYS[1].priority).toBe(1);
        });

        it('should have turbo-gateway.com as third gateway (priority 2)', () => {
            expect(DEFAULT_GATEWAYS[2].host).toBe('turbo-gateway.com');
            expect(DEFAULT_GATEWAYS[2].priority).toBe(2);
        });

        it('should all use HTTPS protocol', () => {
            DEFAULT_GATEWAYS.forEach(gateway => {
                expect(gateway.protocol).toBe('https');
            });
        });
    });

    describe('KNOWN_GATEWAY_HOSTS', () => {
        it('should include arweave.net', () => {
            expect(KNOWN_GATEWAY_HOSTS).toContain('arweave.net');
        });

        it('should include ar.io', () => {
            expect(KNOWN_GATEWAY_HOSTS).toContain('ar.io');
        });

        it('should include ardrive.net', () => {
            expect(KNOWN_GATEWAY_HOSTS).toContain('ardrive.net');
        });

        it('should include turbo-gateway.com', () => {
            expect(KNOWN_GATEWAY_HOSTS).toContain('turbo-gateway.com');
        });
    });
});
