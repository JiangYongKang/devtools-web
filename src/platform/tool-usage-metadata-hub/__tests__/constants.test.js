import {
    KEY_NAMESPACE,
    STORAGE_VERSIONS,
    ERROR_CODES,
    SENSITIVE_PATTERNS,
    MAX_RECENT_TOOLS,
} from '../logic/constants.js';

describe('Constants', () => {
    describe('KEY_NAMESPACE', () => {
        it('should have correct namespace prefix', () => {
            expect(KEY_NAMESPACE).toBe('devtools:tool-usage:');
        });

        it('should not conflict with preference persistence namespace', () => {
            const PREFERENCE_NAMESPACE = 'devtools:';
            expect(KEY_NAMESPACE).not.toBe(PREFERENCE_NAMESPACE);
            expect(KEY_NAMESPACE.startsWith(PREFERENCE_NAMESPACE)).toBe(true);
            expect(KEY_NAMESPACE.length).toBeGreaterThan(PREFERENCE_NAMESPACE.length);
        });
    });

    describe('STORAGE_VERSIONS', () => {
        it('should have V1 and V2 versions', () => {
            expect(STORAGE_VERSIONS.V1).toBeDefined();
            expect(STORAGE_VERSIONS.V2).toBeDefined();
            expect(STORAGE_VERSIONS.LATEST).toBe(STORAGE_VERSIONS.V2);
        });

        it('should have semantic version format', () => {
            const versionRegex = /^\d+\.\d+\.\d+$/;
            expect(STORAGE_VERSIONS.V1).toMatch(versionRegex);
            expect(STORAGE_VERSIONS.V2).toMatch(versionRegex);
        });
    });

    describe('ERROR_CODES', () => {
        it('should include all required error types', () => {
            const requiredCodes = [
                'STORAGE_UNAVAILABLE',
                'QUOTA_EXCEEDED',
                'SERIALIZATION_ERROR',
                'DESERIALIZATION_ERROR',
                'MIGRATION_ERROR',
                'MIGRATION_VERSION_TOO_HIGH',
                'IMPORT_CORRUPTED',
                'IMPORT_INVALID_CHECKSUM',
                'IMPORT_VERSION_MISMATCH',
                'IMPORT_XSS_DETECTED',
                'PRIVACY_MODE',
                'SENSITIVE_SLUG',
            ];

            requiredCodes.forEach(code => {
                expect(ERROR_CODES[code]).toBeDefined();
            });
        });
    });

    describe('SENSITIVE_PATTERNS', () => {
        it('should detect API key patterns', () => {
            const testCases = [
                { slug: 'api-key-config', shouldMatch: true },
                { slug: 'API_KEY_MANAGER', shouldMatch: true },
                { slug: 'secret-storage', shouldMatch: true },
                { slug: 'password-generator', shouldMatch: true },
                { slug: 'auth-token-viewer', shouldMatch: true },
                { slug: 'credential-manager', shouldMatch: true },
                { slug: 'private-key-import', shouldMatch: true },
                { slug: 'access-token-debug', shouldMatch: true },
                { slug: 'bearer-token', shouldMatch: true },
            ];

            testCases.forEach(({ slug, shouldMatch }) => {
                const matches = SENSITIVE_PATTERNS.some(pattern => pattern.test(slug));
                expect(matches).toBe(shouldMatch);
            });
        });

        it('should not match normal tool slugs', () => {
            const testCases = [
                'json-formatter',
                'base64-encoder',
                'uuid-generator',
                'http-client',
                'color-picker',
            ];

            testCases.forEach(slug => {
                const matches = SENSITIVE_PATTERNS.some(pattern => pattern.test(slug));
                expect(matches).toBe(false);
            });
        });
    });

    describe('MAX_RECENT_TOOLS', () => {
        it('should be a positive number', () => {
            expect(MAX_RECENT_TOOLS).toBeGreaterThan(0);
            expect(typeof MAX_RECENT_TOOLS).toBe('number');
        });
    });
});
