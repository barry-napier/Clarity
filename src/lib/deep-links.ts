import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// Expected deep link configurations
const CLARITY_SCHEME = 'clarity:';
const GOOGLE_OAUTH_SCHEME = 'com.googleusercontent.apps.';

export interface OAuthCallbackParams {
  code: string | null;
  state: string | null;
  error: string | null;
}

export function initDeepLinkListener(
  handler: (params: OAuthCallbackParams) => void
) {
  App.addListener('appUrlOpen', (event) => {
    console.log('[DeepLinks] Received URL:', event.url);
    const params = parseOAuthCallback(event.url);
    if (params) {
      handler(params);
    }
  });
}

export function parseOAuthCallback(url: string): OAuthCallbackParams | null {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    console.error('[DeepLinks] Invalid URL format:', url);
    return null;
  }

  console.log('[DeepLinks] Parsed URL:', {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    pathname: parsed.pathname,
    search: parsed.search,
  });

  // Check if this is an OAuth callback
  const isGoogleOAuth = parsed.protocol.startsWith(GOOGLE_OAUTH_SCHEME);
  const isClarityOAuth = parsed.protocol === CLARITY_SCHEME;

  if (Capacitor.isNativePlatform() && !isGoogleOAuth && !isClarityOAuth) {
    console.error('[DeepLinks] Not an OAuth callback URL');
    return null;
  }

  // For Google OAuth, the path is /oauth2redirect
  // For clarity://, the path is /oauth/callback
  const isOAuthPath =
    parsed.pathname === '/oauth2redirect' ||
    parsed.pathname === '/callback' ||
    `/${parsed.hostname}${parsed.pathname}`.replace(/\/+$/, '') === '/oauth/callback';

  if (!isOAuthPath) {
    console.error('[DeepLinks] Not an OAuth callback path:', parsed.pathname);
    return null;
  }

  const code = parsed.searchParams.get('code');
  const state = parsed.searchParams.get('state');
  const error = parsed.searchParams.get('error');

  console.log('[DeepLinks] OAuth params:', { code: !!code, state: !!state, error });

  return { code, state, error };
}
