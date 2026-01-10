import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// Expected deep link configuration
const NATIVE_SCHEME = 'clarity:';
const OAUTH_CALLBACK_PATH = '/oauth/callback';

export interface OAuthCallbackParams {
  code: string | null;
  state: string | null;
  error: string | null;
}

export function initDeepLinkListener(
  handler: (params: OAuthCallbackParams) => void
) {
  App.addListener('appUrlOpen', (event) => {
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
    console.error('Invalid URL format:', url);
    return null;
  }

  // Validate URL scheme on native platforms
  if (Capacitor.isNativePlatform()) {
    if (parsed.protocol !== NATIVE_SCHEME) {
      console.error(
        `Invalid URL scheme: expected ${NATIVE_SCHEME}, got ${parsed.protocol}`
      );
      return null;
    }
  }

  // Validate path - handle both /oauth/callback and oauth/callback (hostname vs path)
  // On iOS, clarity://oauth/callback parses as:
  //   protocol: 'clarity:'
  //   hostname: 'oauth'
  //   pathname: '/callback'
  const normalizedPath = `/${parsed.hostname}${parsed.pathname}`.replace(
    /\/+$/,
    ''
  );
  if (normalizedPath !== OAUTH_CALLBACK_PATH) {
    console.error(
      `Invalid URL path: expected ${OAUTH_CALLBACK_PATH}, got ${normalizedPath}`
    );
    return null;
  }

  const code = parsed.searchParams.get('code');
  const state = parsed.searchParams.get('state');
  const error = parsed.searchParams.get('error');

  return { code, state, error };
}
