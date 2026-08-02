/**
 * Test helpers for building JWTs.
 *
 * The app only ever *decodes* tokens (it never verifies signatures), so a
 * structurally valid token with a garbage signature is indistinguishable from a
 * real one as far as src/composables/useJwtUtils.ts is concerned.
 */

/** base64url-encode a value the way a real JWT issuer does. */
export function base64url(value: unknown): string {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Build a structurally valid JWT with the given payload. */
export function makeJwt(payload: Record<string, unknown>): string {
  const header = base64url({ alg: "HS256", typ: "JWT" });
  return `${header}.${base64url(payload)}.not-a-real-signature`;
}

/**
 * A token that expires `secondsFromNow` from the current clock.
 * Pass a negative number for an already-expired token.
 */
export function makeTokenExpiringIn(
  secondsFromNow: number,
  extra: Record<string, unknown> = {},
): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return makeJwt({
    exp: nowSeconds + secondsFromNow,
    iat: nowSeconds,
    sub: "test-user",
    ...extra,
  });
}
