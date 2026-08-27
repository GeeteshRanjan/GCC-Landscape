/**
 * Values shared by the server modules and by scripts/admin-hash.ts.
 *
 * Deliberately free of the `server-only` marker. That package throws when it is
 * resolved outside a bundler's server graph, which includes `tsx` — so a
 * constant living in a `server-only` module cannot be read by the very script
 * that generates the environment those modules need.
 */

/** Floor on the admin password. Enforced when the hash is minted, not at login. */
export const PASSWORD_MIN_LENGTH = 12;

/** Floor on ADMIN_SESSION_SECRET. Below this the HMAC is not worth signing with. */
export const SECRET_MIN_LENGTH = 32;
