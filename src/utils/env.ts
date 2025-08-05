/**
 * Utility functions for safely accessing environment variables across different contexts
 */

/**
 * Gets environment variable from multiple sources with fallback
 * @param key The environment variable key
 * @param defaultValue Optional default value
 * @returns The environment variable value or default
 */
export function getEnvVar(key: string, defaultValue?: string): string | undefined {
  // Check process.env first (works in Node.js and test environments)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  
  // For browser environments, we'll need to check at runtime
  // This avoids the import.meta syntax error in Jest
  if (typeof window !== 'undefined') {
    try {
      // This will be replaced by Vite at build time but won't cause syntax errors in Jest
      const envValue = (globalThis as any).__VITE_ENV__?.[key];
      if (envValue) {
        return envValue;
      }
    } catch (error) {
      // Ignore errors in accessing global environment
    }
  }
  
  return defaultValue;
}