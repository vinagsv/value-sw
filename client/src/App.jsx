import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Sun, Moon, FileText, Package, BarChart3, Settings, LogOut, Navigation, Users } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';

import LoginPage from './pages/LoginPage';
import BillingPage from './pages/BillingPage';
import ItemsPage from './pages/ItemsPage';
import StatisticsPage from './pages/StatisticsPage';
import SettingsPage from './pages/SettingsPage';
import GatePassPage from './pages/GatePassPage';

const ProtectedRoute = ({ children, adminRequired = false }) => {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminRequired && !isAdmin) return <Navigate to="/billing" replace />;
  return children;
};

const RoleBadge = ({ role }) => {
  const isAdmin = role === 'admin';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
      ${isAdmin
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
      {isAdmin ? '★ Admin' : 'User'}
    </span>
  );
};

const AppContent = ({ theme, toggleTheme }) => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const navLinks = [
    { path: '/billing',    label: 'Billing',     icon: FileText,  adminOnly: false },
    { path: '/gatepasses', label: 'Gate Passes',  icon: Navigation, adminOnly: false },
    { path: '/items',      label: 'Inventory',   icon: Package,   adminOnly: false },
    { path: '/statistics', label: 'Dashboard',   icon: BarChart3, adminOnly: false },
    { path: '/settings',   label: 'Settings',    icon: Settings,  adminOnly: true  },
  ].filter(link => !link.adminOnly || isAdmin);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 print:min-h-0 print:block print:bg-white
      ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>

      <header className="h-16 px-6 mx-2 mt-2 flex justify-between items-center z-50 glass-card print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black text-xl">V</div>
          <div>
            <h1 className="font-black text-lg tracking-wider uppercase leading-none text-blue-700 dark:text-blue-400">
              Value Motor Agency
            </h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Billing System v2.0</p>
          </div>
        </div>

        {user && (
          <nav className="hidden md:flex items-center gap-2 bg-gray-200/50 dark:bg-gray-800/50 p-1 rounded-xl backdrop-blur-md">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all
                    ${isActive
                      ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                >
                  <Icon size={16} /> {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden md:flex flex-col items-end mr-1">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 leading-none mb-1">
                {user.displayName || user.username}
              </span>
              <RoleBadge role={user.role} />
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-white/50 hover:bg-white/80 dark:bg-gray-800/50 dark:hover:bg-gray-700 transition shadow-sm border border-gray-200 dark:border-gray-700"
            title="Toggle Theme"
          >
            {theme === 'light'
              ? <Moon size={18} className="text-indigo-600" />
              : <Sun size={18} className="text-yellow-400" />}
          </button>

          {user && (
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition shadow-sm border border-red-200"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 p-2 print:p-0">
        <Routes>
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/billing" replace />} />
          <Route path="/billing"    element={<ProtectedRoute><BillingPage theme={theme} /></ProtectedRoute>} />
          <Route path="/gatepasses" element={<ProtectedRoute><GatePassPage theme={theme} /></ProtectedRoute>} />
          <Route path="/items"      element={<ProtectedRoute><ItemsPage theme={theme} /></ProtectedRoute>} />
          <Route path="/statistics" element={<ProtectedRoute><StatisticsPage theme={theme} /></ProtectedRoute>} />
          <Route path="/settings"   element={<ProtectedRoute adminRequired><SettingsPage theme={theme} /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to={user ? '/billing' : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
          <AppContent theme={theme} toggleTheme={toggleTheme} />
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;