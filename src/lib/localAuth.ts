// Custom self-contained PostgreSQL-backed auth store to completely replace Firebase dependencies
export class MockAuth {
  private listeners: ((user: any) => void)[] = [];
  private user: any = null;

  constructor() {
    try {
      const saved = localStorage.getItem('festiv_user');
      if (saved) {
        this.user = JSON.parse(saved);
      }
      const token = localStorage.getItem('festiv_token');
      if (token) {
        try {
          document.cookie = `festiv_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        } catch (cookieErr) {
          console.warn('Could not set auth cookie on load:', cookieErr);
        }
      }
    } catch (e) {
      console.error('Failed to parse saved user:', e);
    }
  }

  get currentUser() {
    return this.user;
  }

  onAuthStateChanged(callback: (user: any) => void) {
    this.listeners.push(callback);
    // Call immediately with current state
    callback(this.user);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  async signInWithEmail(email: string, password?: string, isRegistering = false, displayName?: string, photoURL?: string) {
    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName, photoURL })
      });
      if (!response.ok) {
        const errText = await response.text();
        let parsedErr;
        try { parsedErr = JSON.parse(errText); } catch {}
        throw new Error(parsedErr?.error || 'Échec de l\'authentification');
      }
      const data = await response.json();
      this.user = {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        role: data.role
      };
      localStorage.setItem('festiv_user', JSON.stringify(this.user));
      if (data.token) {
        localStorage.setItem('festiv_token', data.token);
        try {
          document.cookie = `festiv_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        } catch (cookieErr) {
          console.warn('Could not set auth cookie:', cookieErr);
        }
      }
      this.notify();
      return this.user;
    } catch (e) {
      console.error('Login error:', e);
      throw e;
    }
  }

  async signOut() {
    this.user = null;
    localStorage.removeItem('festiv_user');
    localStorage.removeItem('festiv_token');
    try {
      document.cookie = "festiv_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    } catch (cookieErr) {
      console.warn('Could not clear auth cookie:', cookieErr);
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach(l => l(this.user));
  }
}

// Transparent global fetch interceptor to append JWT Bearer token on all /api/* requests
if (typeof window !== 'undefined') {
  try {
    const originalFetch = window.fetch;
    if (originalFetch) {
      const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const token = localStorage.getItem('festiv_token');
        const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
        
        // Check if it's an API route and not an external third-party URL
        const isApiRoute = url && (
          url.startsWith('/api/') || 
          url.startsWith('api/') || 
          url.startsWith(window.location.origin + '/api/') ||
          url.includes('/api/')
        );

        if (token && isApiRoute) {
          // Clone the init options to avoid mutating read-only/frozen parameters
          const clonedInit = { ...init };
          let headers: HeadersInit;

          if (clonedInit.headers instanceof Headers) {
            const newHeaders = new Headers(clonedInit.headers);
            if (!newHeaders.has('Authorization')) {
              newHeaders.set('Authorization', `Bearer ${token}`);
            }
            headers = newHeaders;
          } else if (Array.isArray(clonedInit.headers)) {
            const newHeaders = [...clonedInit.headers];
            const hasAuth = newHeaders.some(([key]) => key.toLowerCase() === 'authorization');
            if (!hasAuth) {
              newHeaders.push(['Authorization', `Bearer ${token}`]);
            }
            headers = newHeaders;
          } else {
            const newHeaders = { ...clonedInit.headers } as Record<string, string>;
            if (!newHeaders['Authorization'] && !newHeaders['authorization']) {
              newHeaders['Authorization'] = `Bearer ${token}`;
            }
            headers = newHeaders;
          }
          clonedInit.headers = headers;
          return originalFetch(input, clonedInit);
        }
        return originalFetch(input, init);
      };

      // Attempt to safely overwrite window.fetch or globalThis.fetch with multi-layer fallback
      let redefined = false;
      try {
        Object.defineProperty(window, 'fetch', {
          value: customFetch,
          writable: true,
          configurable: true
        });
        redefined = true;
      } catch (e) {}

      if (!redefined) {
        try {
          Object.defineProperty(globalThis, 'fetch', {
            value: customFetch,
            writable: true,
            configurable: true
          });
          redefined = true;
        } catch (e) {}
      }

      if (!redefined) {
        try {
          Object.defineProperty(Window.prototype, 'fetch', {
            value: customFetch,
            writable: true,
            configurable: true
          });
          redefined = true;
        } catch (e) {}
      }

      if (!redefined) {
        try {
          (window as any).fetch = customFetch;
        } catch (e) {
          console.warn('Could not redefine window.fetch or globalThis.fetch:', e);
        }
      }
    }
  } catch (globalFetchErr) {
    console.warn('Error setting up global fetch interceptor:', globalFetchErr);
  }
}

export const auth = new MockAuth();
export const db = {};
export class GoogleAuthProvider {}
export const signInWithPopup = async () => {
  throw new Error('Google Sign-In is disabled. Please use standard email sign-in.');
};
