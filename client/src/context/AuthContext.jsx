import React, { createContext, useState, useEffect, useContext } from 'react';
import { loginUser } from '../api/auth';
import apiClient from '../api/apiClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      const token    = localStorage.getItem('token');
      const username = localStorage.getItem('username');
      const role     = localStorage.getItem('role');

      if (!token || !username) {
        setLoading(false);
        return;
      }

      try {
        await apiClient.get('/settings');
        setUser({ username, token, role: role || 'user' });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, []);

  const login = async (username, password) => {
    try {
      const data = await loginUser({ username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);
      setUser({ username: data.username, token: data.token, role: data.role, displayName: data.displayName });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    setUser(null);
  };

  // Convenience helpers
  const isAdmin = user?.role === 'admin';

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};