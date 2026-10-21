import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearStoredUser,
  loadStoredUser,
  normalizeUser,
  storeUser,
} from '../auth/authData';
import { getAccessToken, setAuthExpiredHandler } from '../api/client';
import {
  changePasswordRequest,
  loginRequest,
  logoutRequest,
  refreshTokenRequest,
  verifyTokenRequest,
  welcomeLoginRequest,
} from '../api/auth';
import { updateOwnProfileRequest } from '../api/accounts';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadStoredUser());

  // On load, validate a restored session: verify the stored access token and,
  // if it's expired/invalid, try to silently refresh it. Only drop the session
  // if both checks fail (avoids logging users out on transient server errors).
  useEffect(() => {
    let active = true;
    if (!loadStoredUser()) return undefined;

    (async () => {
      if (await verifyTokenRequest(getAccessToken())) return;
      const refreshed = await refreshTokenRequest().catch(() => null);
      if (!active) return;
      if (!refreshed) {
        clearStoredUser();
        setUser(null);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // When a request hits 401 and the silent refresh fails, drop the session so
  // the route guards redirect to login.
  useEffect(() => {
    setAuthExpiredHandler(() => {
      clearStoredUser();
      setUser(null);
    });
    return () => setAuthExpiredHandler(null);
  }, []);

  const applyAuthResponse = useCallback((data) => {
    const nextUser = {
      ...normalizeUser(data),
      requiresPasswordChange: Boolean(data?.requires_password_change),
    };
    storeUser(nextUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  const login = useCallback(
    async (username, password) => {
      const data = await loginRequest(username, password);
      return applyAuthResponse(data);
    },
    [applyAuthResponse]
  );

  const welcomeLogin = useCallback(
    async (token) => {
      const data = await welcomeLoginRequest(token);
      return applyAuthResponse(data);
    },
    [applyAuthResponse]
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // Ignore logout API failures; clear the local session regardless.
    } finally {
      clearStoredUser();
      setUser(null);
    }
  }, []);

  const changePassword = useCallback(
    async (oldPassword, newPassword, confirmPassword) => {
      const data = await changePasswordRequest(
        oldPassword,
        newPassword,
        confirmPassword
      );
      setUser((current) => {
        if (!current) return current;
        const updated = { ...current, requiresPasswordChange: false };
        storeUser(updated);
        return updated;
      });
      return data;
    },
    []
  );

  const updateProfile = useCallback(
    async (fields) => {
      // Prefer the original backend role (rawRole) so employees hit their own
      // endpoint — they share the ADMIN app role for routing, which would
      // otherwise send them to the admin update path.
      const profileRole = user?.rawRole || user?.role;
      const data = await updateOwnProfileRequest(profileRole, fields);
      setUser((current) => {
        if (!current) return current;
        const u = (data && data.user) || {};
        const firstName = u.first_name ?? fields.firstName ?? current.firstName;
        const lastName = u.last_name ?? fields.lastName ?? current.lastName;
        const updated = {
          ...current,
          username: u.username ?? current.username,
          email: u.email ?? fields.email ?? current.email,
          firstName,
          lastName,
          name: `${firstName} ${lastName}`.trim() || u.username || current.name,
          // Client-only fields are not always returned by the update response,
          // so keep whatever the form just submitted when the user payload omits them.
          phone: fields.phone ?? current.phone ?? '',
          whatsapp: fields.whatsapp ?? current.whatsapp ?? '',
          address: fields.address ?? current.address ?? '',
          preferredContact:
            fields.preferredContact ?? current.preferredContact ?? 'phone',
        };
        storeUser(updated);
        return updated;
      });
      return data;
    },
    [user?.rawRole, user?.role]
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      welcomeLogin,
      logout,
      changePassword,
      updateProfile,
    }),
    [user, login, welcomeLogin, logout, changePassword, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
