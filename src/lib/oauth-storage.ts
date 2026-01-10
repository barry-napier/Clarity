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

  // Always clear state after any validation attempt (single-use tokens)
  await clearOAuthState();

  if (!storedState || !createdAt) {
    return false;
  }

  // Check for corrupted timestamp
  const createdAtMs = parseInt(createdAt, 10);
  if (Number.isNaN(createdAtMs)) {
    console.error('Corrupted OAuth state timestamp');
    return false;
  }

  // Check expiration
  const age = Date.now() - createdAtMs;
  if (age > OAUTH_TIMEOUT_MS) {
    return false;
  }

  // Validate state matches
  return storedState === returnedState;
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

  // Clear after retrieval (single-use)
  await clearPKCEVerifier();

  if (!verifier || !createdAt) {
    return null;
  }

  // Check for corrupted timestamp
  const createdAtMs = parseInt(createdAt, 10);
  if (Number.isNaN(createdAtMs)) {
    console.error('Corrupted PKCE verifier timestamp');
    return null;
  }

  // Check expiration
  const age = Date.now() - createdAtMs;
  if (age > OAUTH_TIMEOUT_MS) {
    return null;
  }

  return verifier;
}

export async function clearPKCEVerifier(): Promise<void> {
  await secureRemove(KEYS.PKCE_VERIFIER);
  await secureRemove(KEYS.PKCE_CREATED);
}
