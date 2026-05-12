/**
 * When set to "1", auth cookie writes use a shorter maxAge (this browser chose "Don't remember me").
 * Cleared on explicit logout. Name is intentionally prefixed to avoid collisions with Supabase keys.
 */
export const CHATRELY_AUTH_SHORT_LIVED_COOKIE = "chatrely_auth_short_lived";

/** Short session cap when the user leaves "Remember me" unchecked (seconds). */
export const CHATRELY_SHORT_SESSION_MAX_AGE_SEC = 60 * 60 * 24;

/** When "Remember me" is checked, auth cookies are capped at this lifetime (30 days). */
export const CHATRELY_REMEMBER_ME_MAX_AGE_SEC = 60 * 60 * 24 * 30;
