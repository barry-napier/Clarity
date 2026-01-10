import { Capacitor } from '@capacitor/core';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// Client secret is required for web OAuth (not needed for native iOS)
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

if (!GOOGLE_CLIENT_ID) {
  throw new Error(
    'VITE_GOOGLE_CLIENT_ID environment variable is required. ' +
      'Add it to your .env file.'
  );
}

const SCOPES = ['https://www.googleapis.com/auth/drive.appdata'];

function getRedirectUri(): string {
  if (Capacitor.isNativePlatform()) {
    return 'clarity://oauth/callback';
  }
  // Web: use current origin for local dev or production
  return `${window.location.origin}/oauth/callback`;
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest('SHA-256', data);
}

export async function generatePKCE(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const verifier = crypto.randomUUID() + crypto.randomUUID();
  const hashed = await sha256(verifier);
  const challenge = base64UrlEncode(hashed);
  return { verifier, challenge };
}

export function generateState(): string {
  return crypto.randomUUID();
}

export function buildAuthUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPES.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export async function exchangeCodeForTokens(
  code: string,
  verifier: string
): Promise<TokenResponse> {
  // Build token request params
  const params: Record<string, string> = {
    client_id: GOOGLE_CLIENT_ID,
    code,
    code_verifier: verifier,
    grant_type: 'authorization_code',
    redirect_uri: getRedirectUri(),
  };

  // Google requires client_secret for web apps (not for native iOS)
  if (!Capacitor.isNativePlatform() && GOOGLE_CLIENT_SECRET) {
    params.client_secret = GOOGLE_CLIENT_SECRET;
  } else if (!Capacitor.isNativePlatform() && !GOOGLE_CLIENT_SECRET) {
    throw new Error(
      'client_secret is missing. Add VITE_GOOGLE_CLIENT_SECRET to your .env file. ' +
        'Get it from Google Cloud Console > APIs & Services > Credentials.'
    );
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Token exchange failed');
  }

  return response.json();
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Token refresh failed');
  }

  return response.json();
}
