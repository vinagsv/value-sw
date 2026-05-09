import React, { createContext, useState, useEffect, useContext } from 'react';
import { fetchSettings } from '../api/settings';
import { useAuth } from './AuthContext';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const { user } = useAuth(); // Only fetch if user is logged in

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const data = await fetchSettings();
      setSettings(data);
    } catch (error) {
      console.error("Failed to load global settings", error);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, reloadSettings: loadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};