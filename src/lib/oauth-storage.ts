import { secureSet, secureGet, secureRemove } from './secure-storage';

const KEYS = {
  OAUTH_STATE: 'oauth_state',
  OAUTH_STATE_CREATED: 'oauth_state_created',
  PKCE_VERIFIER: 'pkce_verifier',
  PKCE_CREATED: 'pkce_created',
} as const;

// OAuth state and PKCE expire after 10 minutes
const OAUTH_TIMEOUT_MS = 10 * 60 * 1000;

// ============================================
// OAuth State (CSRF Protection)
// ============================================

export async function storeOAuthState(state: string): Promise<void> {
  await secureSet(KEYS.OAUTH_STATE, state);
  await secureSet(KEYS.OAUTH_STATE_CREATED, Date.now().toString());
}

export async function validateOAuthState(
  returnedState: string | null
): Promise<boolean> {
  if (!returnedState) {
    return false;
  }

  const storedState = await secureGet(KEYS.OAUTH_STATE);
  const createdAt = await secureGet(KEYS.OAUTH_STATE_CREATED);

  if (!storedState || !createdAt) {
    return false;
  }

  // Check expiration
  const age = Date.now() - parseInt(createdAt, 10);
  if (age > OAUTH_TIMEOUT_MS) {
    await clearOAuthState();
    return false;
  }

  // Validate state matches
  if (storedState !== returnedState) {
    return false;
  }

  // Clear state after successful validation (prevent replay attacks)
  await clearOAuthState();
  return true;
}

export async function clearOAuthState(): Promise<void> {
  await secureRemove(KEYS.OAUTH_STATE);
  await secureRemove(KEYS.OAUTH_STATE_CREATED);
}

// ============================================
// PKCE Verifier Storage
// ============================================

export async function storePKCEVerifier(verifier: string): Promise<void> {
  await secureSet(KEYS.PKCE_VERIFIER, verifier);
  await secureSet(KEYS.PKCE_CREATED, Date.now().toString());
}

export async function retrievePKCEVerifier(): Promise<string | null> {
  const verifier = await secureGet(KEYS.PKCE_VERIFIER);
  const createdAt = await secureGet(KEYS.PKCE_CREATED);

  if (!verifier || !createdAt) {
    return null;
  }

  // Check expiration
  const age = Date.now() - parseInt(createdAt, 10);
  if (age > OAUTH_TIMEOUT_MS) {
    await clearPKCEVerifier();
    return null;
  }

  return verifier;
}

export async function clearPKCEVerifier(): Promise<void> {
  await secureRemove(KEYS.PKCE_VERIFIER);
  await secureRemove(KEYS.PKCE_CREATED);
}
