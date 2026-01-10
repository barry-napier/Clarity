import { secureSet, secureGet, secureRemove } from './secure-storage';
import { refreshAccessToken, type TokenResponse } from './google-auth';

const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_EXPIRY: 'token_expiry',
} as const;

// Refresh tokens 5 minutes before expiry
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export async function storeTokens(tokens: TokenResponse): Promise<void> {
  const expiry = Date.now() + tokens.expires_in * 1000;

  await Promise.all([
    secureSet(KEYS.ACCESS_TOKEN, tokens.access_token),
    secureSet(KEYS.TOKEN_EXPIRY, String(expiry)),
  ]);

  if (tokens.refresh_token) {
    await secureSet(KEYS.REFRESH_TOKEN, tokens.refresh_token);
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  const expiry = await secureGet(KEYS.TOKEN_EXPIRY);

  if (!expiry) {
    return null;
  }

  // Refresh if less than 5 minutes remaining
  if (parseInt(expiry, 10) - Date.now() < REFRESH_BUFFER_MS) {
    return await doTokenRefresh();
  }

  const token = await secureGet(KEYS.ACCESS_TOKEN);
  return token;
}

async function doTokenRefresh(): Promise<string | null> {
  const refreshToken = await secureGet(KEYS.REFRESH_TOKEN);

  if (!refreshToken) {
    return null;
  }

  try {
    const tokens = await refreshAccessToken(refreshToken);
    await storeTokens(tokens);
    return tokens.access_token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    secureRemove(KEYS.ACCESS_TOKEN),
    secureRemove(KEYS.REFRESH_TOKEN),
    secureRemove(KEYS.TOKEN_EXPIRY),
  ]);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getValidAccessToken();
  return token !== null;
}
