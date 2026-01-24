import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './tokens';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isStaff?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user && !!getAccessToken();

  /**
   * Fetch current user info from /api/auth/me/
   */
  const refreshMe = async () => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      setUser(null);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        // Token expired, try refresh
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            if (refreshData.access) {
              setTokens({ access: refreshData.access, refresh: refreshToken });
              // Retry /auth/me/ with new token
              const retryResponse = await fetch(`${API_BASE_URL}/auth/me/`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${refreshData.access}`,
                  'Content-Type': 'application/json',
                },
              });

              if (retryResponse.ok) {
                const userData = await retryResponse.json();
                setUser(userData);
                return;
              }
            }
          }
        }
        // Refresh failed, logout
        clearTokens();
        setUser(null);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      clearTokens();
      setUser(null);
    }
  };

  /**
   * Login with username and password
   */
  const login = async (username: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(error.error || error.message || 'Login failed');
      }

      const data = await response.json();

      // Store tokens
      if (data.access && data.refresh) {
        setTokens({ access: data.access, refresh: data.refresh });

        // Set user from response (login returns user in response)
        if (data.user) {
          setUser(data.user);
        } else {
          // Fallback: fetch user info
          await refreshMe();
        }
      } else {
        throw new Error('Invalid response: missing tokens');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  /**
   * Logout: client-only token clearing
   * 
   * Decision: Client-only logout (Option 1) for simplicity and consistency.
   * Backend logout endpoint exists but requires IsAuthenticated + refresh_token.
   * Since logout is a client-side operation (clearing tokens), we don't need
   * to call the backend. The backend endpoint remains available for future use
   * if server-side token blacklisting becomes necessary.
   */
  const logout = async () => {
    clearTokens();
    setUser(null);
  };

  // On mount, check if we have a token and fetch user info
  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = getAccessToken();
      if (accessToken) {
        await refreshMe();
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refreshMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}