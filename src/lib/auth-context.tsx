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
      initDeepLinkListener(async (params) => {
        await handleOAuthCallback(params);
      });
    }
  }, []);

  const handleOAuthCallback = useCallback(
    async (params: OAuthCallbackParams) => {
      setError(null);

      // Check for OAuth error
      if (params.error) {
        setError(`Authentication failed: ${params.error}`);
        return;
      }

      // Validate we have required params
      if (!params.code || !params.state) {
        setError('Invalid OAuth callback - missing code or state');
        return;
      }

      try {
        setIsLoading(true);

        // Validate state to prevent CSRF attacks
        const isValidState = await validateOAuthState(params.state);
        if (!isValidState) {
          setError('Invalid OAuth state - possible CSRF attack');
          return;
        }

        // Retrieve PKCE verifier
        const verifier = await retrievePKCEVerifier();
        if (!verifier) {
          setError('PKCE verifier not found or expired - please try again');
          return;
        }

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(params.code, verifier);
        await storeTokens(tokens);

        // Clean up PKCE verifier
        await clearPKCEVerifier();

        setAuthenticated(true);
      } catch (err) {
        console.error('OAuth callback failed:', err);
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
