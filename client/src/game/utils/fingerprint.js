import FingerprintJS from '@fingerprintjs/fingerprintjs';

/**
 * Browser fingerprinting utility for stable player identification
 * Uses FingerprintJS to generate a unique, stable fingerprint for the browser
 */

let fpPromise = null;
let cachedFingerprint = null;

/**
 * Initialize the fingerprint library
 * This should be called once on app load
 */
export async function initFingerprint() {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load();
  }
  return fpPromise;
}

/**
 * Get the browser fingerprint
 * Returns a cached value if available, otherwise generates a new one
 * @returns {Promise<string>} The fingerprint ID
 */
export async function getFingerprint() {
  // Return cached fingerprint if available
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  // Check localStorage first
  const stored = localStorage.getItem('player_fingerprint');
  if (stored) {
    cachedFingerprint = stored;
    return cachedFingerprint;
  }

  // Generate new fingerprint
  const fp = await initFingerprint();
  const result = await fp.get();
  cachedFingerprint = result.visitorId;

  // Store in localStorage for consistency
  localStorage.setItem('player_fingerprint', cachedFingerprint);

  return cachedFingerprint;
}

/**
 * Clear the cached fingerprint
 * Useful for testing or logout scenarios
 */
export function clearFingerprint() {
  cachedFingerprint = null;
  localStorage.removeItem('player_fingerprint');
}
