// src/lib/csp.ts
export function getApiSecurityHeaders(): Record<string, string> {
    return {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        // Full CSP with nonce is applied by middleware — don't duplicate here
    };
}