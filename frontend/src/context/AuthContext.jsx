import React, { createContext, useContext, useState, useCallback } from 'react';
import { API_BASE_URL } from '../config.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { id, name, email, role, first_login }
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const login = useCallback(async (email, password) => {
    sessionStorage.removeItem('seen_bookings');
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid username or password');
    localStorage.setItem('token', data.token);
    setToken(data.token);
    const u = data.user;
    const profile = {
      id: u.id || u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      first_login: u.firstLogin || u.first_login,
    };
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('seen_bookings');
    setToken(null);
    setUser(null);
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update password');
    setUser(prev => ({ ...prev, first_login: false }));
  }, [token]);

  const fetchMe = useCallback(async () => {
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.user) return null;
      const u = data.user;
      const profile = {
        id: u.id || u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        first_login: u.firstLogin || u.first_login,
      };
      setUser(profile);
      return profile;
    } catch {
      return null;
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, changePassword, fetchMe, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
