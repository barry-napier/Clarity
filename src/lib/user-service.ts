import { secureSet, secureGet, secureRemove } from './secure-storage';
import { getValidAccessToken } from './token-service';

const KEYS = {
  USER_ID: 'google_user_id',
  USER_EMAIL: 'google_user_email',
} as const;

export interface GoogleUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

/**
 * Fetch user info from Google using the current access token
 */
export async function fetchGoogleUserInfo(): Promise<GoogleUserInfo | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;

  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch user info:', response.status);
      return null;
    }

    const data = await response.json();
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  } catch (error) {
    console.error('Error fetching user info:', error);
    return null;
  }
}

/**
 * Store user info in secure storage
 */
export async function storeUserInfo(userInfo: GoogleUserInfo): Promise<void> {
  await Promise.all([
    secureSet(KEYS.USER_ID, userInfo.id),
    secureSet(KEYS.USER_EMAIL, userInfo.email),
  ]);
}

/**
 * Get stored user info
 */
export async function getStoredUserInfo(): Promise<GoogleUserInfo | null> {
  const [id, email] = await Promise.all([
    secureGet(KEYS.USER_ID),
    secureGet(KEYS.USER_EMAIL),
  ]);

  if (!id || !email) return null;

  return { id, email };
}

/**
 * Clear stored user info
 */
export async function clearUserInfo(): Promise<void> {
  await Promise.all([
    secureRemove(KEYS.USER_ID),
    secureRemove(KEYS.USER_EMAIL),
  ]);
}

/**
 * Get Google user ID (for subscription checks)
 */
export async function getGoogleUserId(): Promise<string | null> {
  return await secureGet(KEYS.USER_ID);
}

/**
 * Get Google user email
 */
export async function getGoogleUserEmail(): Promise<string | null> {
  return await secureGet(KEYS.USER_EMAIL);
}
