"use strict";
/**
 * Dynamic CORS Configuration
 *
 * Builds a CORS allowlist that includes:
 * - Localhost origins for development
 * - Production domain(s) when PRODUCTION_DOMAIN env var is set
 *
 * Usage:
 *   import { getCorsOrigins } from './corsConfig';
 *
 *   export const myFunction = onCall({
 *     cors: getCorsOrigins(),
 *     ...
 *   });
 *
 * Environment Variables:
 *   - PRODUCTION_DOMAIN: The production domain (e.g., 'https://collabcanvas-dev.web.app')
 *                        Can be comma-separated for multiple domains
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsOrigins = exports.getCorsOrigins = void 0;
// Development origins (localhost)
const DEV_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
];
/**
 * Gets the CORS origins array with dynamic production domain support.
 *
 * @returns Array of allowed origins for CORS
 */
function getCorsOrigins() {
    const origins = [...DEV_ORIGINS];
    // Add production domain(s) if configured
    const productionDomain = process.env.PRODUCTION_DOMAIN;
    if (productionDomain) {
        // Support comma-separated domains
        const domains = productionDomain.split(',').map(d => d.trim()).filter(Boolean);
        for (const domain of domains) {
            if (!origins.includes(domain)) {
                origins.push(domain);
            }
        }
        if (process.env.NODE_ENV !== 'production') {
            console.log('[CORS] Added production domain(s):', domains);
        }
    }
    else if (process.env.NODE_ENV === 'production') {
        console.warn('[CORS] Warning: PRODUCTION_DOMAIN not set in production environment');
    }
    return origins;
}
exports.getCorsOrigins = getCorsOrigins;
/**
 * Gets the CORS origins array, exported for testing.
 */
exports.corsOrigins = getCorsOrigins();
//# sourceMappingURL=corsConfig.js.map