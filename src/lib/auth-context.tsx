import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import {
  generatePKCE,
  generateState,
  buildAuthUrl,
  exchangeCodeForTokens,
} from './google-auth';
import {
  storeOAuthState,
  validateOAuthState,
  storePKCEVerifier,
  retrievePKCEVerifier,
  clearPKCEVerifier,
  clearOAuthState,
} from './oauth-storage';
import { storeTokens, clearTokens, isAuthenticated } from './token-service';
import {
  fetchGoogleUserInfo,
  storeUserInfo,
  clearUserInfo,
  getStoredUserInfo,
  type GoogleUserInfo,
} from './user-service';
import { ensureSupabaseUser } from './stripe/subscription-service';
import {
  initDeepLinkListener,
  parseOAuthCallback,
  type OAuthCallbackParams,
} from './deep-links';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  handleOAuthCallback: (params: OAuthCallbackParams) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Helper to add timeout to promises
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    let didTimeout = false;

    // Hard fallback - if nothing happens in 3 seconds, force loading to false
    const fallbackTimer = setTimeout(() => {
      console.log('[AuthProvider] Fallback timeout triggered');
      didTimeout = true;
      setAuthenticated(false);
      setIsLoading(false);
    }, 3000);

    async function checkAuth() {
      console.log('[AuthProvider] Checking auth status...');
      try {
        const authed = await withTimeout(isAuthenticated(), 2000);
        if (!didTimeout) {
          console.log('[AuthProvider] Auth result:', authed);
          setAuthenticated(authed);
        }
      } catch (err) {
        if (!didTimeout) {
          console.error('[AuthProvider] Failed to check auth status:', err);
          setAuthenticated(false);
        }
      } finally {
        if (!didTimeout) {
          clearTimeout(fallbackTimer);
          setIsLoading(false);
        }
      }
    }
    checkAuth();

    return () => clearTimeout(fallbackTimer);
  }, []);

  // Initialize deep link listener for OAuth callback (native only)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      console.log('[AuthProvider] Setting up deep link listener');
      initDeepLinkListener(async (params) => {
        console.log('[AuthProvider] Deep link received, closing browser');
        // Close the in-app browser after receiving the callback
        try {
          await Browser.close();
        } catch (e) {
          // Browser might already be closed
          console.log('[AuthProvider] Browser close error (may be expected):', e);
        }
        await handleOAuthCallback(params);
      });
    }
  }, []);

  const handleOAuthCallback = useCallback(
    async (params: OAuthCallbackParams) => {
      console.log('[AuthProvider] handleOAuthCallback called with params:', params);
      setError(null);

      // Check for OAuth error
      if (params.error) {
        console.error('[AuthProvider] OAuth error:', params.error);
        setError(`Authentication failed: ${params.error}`);
        return;
      }

      // Validate we have required params
      if (!params.code || !params.state) {
        console.error('[AuthProvider] Missing code or state');
        setError('Invalid OAuth callback - missing code or state');
        return;
      }

      try {
        setIsLoading(true);

        // Validate state to prevent CSRF attacks
        console.log('[AuthProvider] Validating state...');
        const isValidState = await validateOAuthState(params.state);
        console.log('[AuthProvider] State valid:', isValidState);
        if (!isValidState) {
          setError('Invalid OAuth state - possible CSRF attack');
          return;
        }

        // Retrieve PKCE verifier
        console.log('[AuthProvider] Retrieving PKCE verifier...');
        const verifier = await retrievePKCEVerifier();
        console.log('[AuthProvider] Verifier found:', !!verifier);
        if (!verifier) {
          setError('PKCE verifier not found or expired - please try again');
          return;
        }

        // Exchange code for tokens
        console.log('[AuthProvider] Exchanging code for tokens...');
        const tokens = await exchangeCodeForTokens(params.code, verifier);
        console.log('[AuthProvider] Tokens received, storing...');
        await storeTokens(tokens);

        // Clean up PKCE verifier
        await clearPKCEVerifier();

        // Fetch and store user info
        console.log('[AuthProvider] Fetching user info...');
        const userInfo = await fetchGoogleUserInfo();
        if (userInfo) {
          console.log('[AuthProvider] User info received, storing...');
          await storeUserInfo(userInfo);

          // Create/ensure Supabase user for subscription tracking
          console.log('[AuthProvider] Ensuring Supabase user...');
          await ensureSupabaseUser(userInfo.id, userInfo.email);
        } else {
          console.warn('[AuthProvider] Could not fetch user info');
        }

        console.log('[AuthProvider] Authentication successful!');
        setAuthenticated(true);
      } catch (err) {
        console.error('[AuthProvider] OAuth callback failed:', err);
        setError(
          err instanceof Error ? err.message : 'Authentication failed'
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const signIn = useCallback(async () => {
    setError(null);

    try {
      setIsLoading(true);

      // Generate and store PKCE
      const { verifier, challenge } = await generatePKCE();
      await storePKCEVerifier(verifier);

      // Generate and store state for CSRF protection
      const state = generateState();
      await storeOAuthState(state);

      // Build auth URL
      const authUrl = buildAuthUrl(state, challenge);

      if (Capacitor.isNativePlatform()) {
        // Open in-app browser on iOS
        await Browser.open({ url: authUrl });
      } else {
        // Redirect on web
        window.location.href = authUrl;
      }
    } catch (err) {
      console.error('Sign in failed:', err);
      setError(err instanceof Error ? err.message : 'Sign in failed');
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      await clearTokens();
      await clearOAuthState();
      await clearPKCEVerifier();
      await clearUserInfo();
      setAuthenticated(false);
    } catch (err) {
      console.error('Sign out failed:', err);
      setError(err instanceof Error ? err.message : 'Sign out failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: AuthContextValue = {
    isAuthenticated: authenticated,
    isLoading,
    error,
    signIn,
    signOut,
    handleOAuthCallback,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
