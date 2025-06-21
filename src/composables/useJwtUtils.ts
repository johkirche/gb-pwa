/**
 * JWT utilities for token decoding and validation
 * Replaces deprecated atob() usage with proper base64 decoding
 */

interface JwtPayload {
  exp: number;
  iat: number;
  sub?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Decode base64url string (JWT uses base64url, not standard base64)
 */
function base64urlDecode(str: string): string {
  // Convert base64url to base64
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");

  // Add padding if needed
  while (base64.length % 4) {
    base64 += "=";
  }

  try {
    return atob(base64);
  } catch {
    throw new Error("Invalid base64 string");
  }
}

/**
 * Decode JWT payload without verification (for reading expiry time, etc.)
 * Note: This does not verify the token signature - only use for reading metadata
 */
export function decodeJwtPayload(token: string): JwtPayload {
  if (!token || typeof token !== "string") {
    throw new Error("Invalid token: must be a non-empty string");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format: must have 3 parts separated by dots");
  }

  try {
    const payloadBase64 = parts[1];
    const payloadJson = base64urlDecode(payloadBase64);
    const payload = JSON.parse(payloadJson);

    return payload as JwtPayload;
  } catch (error) {
    throw new Error(
      `Failed to decode JWT payload: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

/**
 * Get token expiry time in milliseconds
 */
export function getTokenExpiry(token: string): number {
  try {
    const payload = decodeJwtPayload(token);
    return payload.exp * 1000; // Convert to milliseconds
  } catch (error) {
    console.error("Failed to get token expiry:", error);
    return 0;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(
  token: string,
  bufferTimeMs: number = 0,
): boolean {
  try {
    const expiryTime = getTokenExpiry(token);
    const currentTime = Date.now();
    return expiryTime <= currentTime + bufferTimeMs;
  } catch {
    // If we can't decode the token, consider it expired
    return true;
  }
}

/**
 * Get time until token expires (in milliseconds)
 */
export function getTimeUntilExpiry(token: string): number {
  try {
    const expiryTime = getTokenExpiry(token);
    const currentTime = Date.now();
    return Math.max(0, expiryTime - currentTime);
  } catch {
    return 0;
  }
}

/**
 * Composable for JWT utilities
 */
export const useJwtUtils = () => {
  return {
    decodeJwtPayload,
    getTokenExpiry,
    isTokenExpired,
    getTimeUntilExpiry,
  };
};
