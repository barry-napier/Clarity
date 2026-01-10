import { Preferences } from '@capacitor/preferences';
import { refreshAccessToken, type TokenResponse } from './google-auth';

const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_EXPIRY: 'token_expiry',
} as const;

export async function storeTokens(tokens: TokenResponse): Promise<void> {
  const expiry = Date.now() + tokens.expires_in * 1000;

  await Promise.all([
    Preferences.set({ key: KEYS.ACCESS_TOKEN, value: tokens.access_token }),
    Preferences.set({ key: KEYS.TOKEN_EXPIRY, value: String(expiry) }),
  ]);

  if (tokens.refresh_token) {
    await Preferences.set({
      key: KEYS.REFRESH_TOKEN,
      value: tokens.refresh_token,
    });
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  const { value: expiry } = await Preferences.get({ key: KEYS.TOKEN_EXPIRY });

  if (!expiry) {
    return null;
  }

  // Refresh if less than 5 minutes remaining
  if (parseInt(expiry) - Date.now() < 300000) {
    return await doTokenRefresh();
  }

  const { value } = await Preferences.get({ key: KEYS.ACCESS_TOKEN });
  return value;
}

async function doTokenRefresh(): Promise<string | null> {
  const { value: refreshToken } = await Preferences.get({
    key: KEYS.REFRESH_TOKEN,
  });

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
    Preferences.remove({ key: KEYS.ACCESS_TOKEN }),
    Preferences.remove({ key: KEYS.REFRESH_TOKEN }),
    Preferences.remove({ key: KEYS.TOKEN_EXPIRY }),
  ]);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getValidAccessToken();
  return token !== null;
}
