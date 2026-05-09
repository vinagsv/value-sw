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
      const token = localStorage.getItem('token');
      const username = localStorage.getItem('username');

      if (!token || !username) {
        setLoading(false);
        return;
      }

      // BUG FIX: Previously only checked localStorage existence, never validated
      // the token with the server. A stale/expired token would let the user appear
      // logged in but every API call would 401 and redirect them.
      // Now we probe the server on load so the UI state is always accurate.
      try {
        await apiClient.get('/settings');
        setUser({ username, token });
      } catch (err) {
        // Token invalid or expired — clear it silently
        localStorage.removeItem('token');
        localStorage.removeItem('username');
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
      setUser({ username: data.username, token: data.token });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUser(null);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};