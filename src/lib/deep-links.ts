import { App } from '@capacitor/app';

export function initDeepLinkListener(handler: (url: string) => void) {
  App.addListener('appUrlOpen', (event) => {
    handler(event.url);
  });
}

export function parseOAuthCallback(url: string): { code: string; state: string } | null {
  try {
    const parsed = new URL(url);
    const code = parsed.searchParams.get('code');
    const state = parsed.searchParams.get('state');

    if (code && state) {
      return { code, state };
    }
    return null;
  } catch {
    return null;
  }
}
