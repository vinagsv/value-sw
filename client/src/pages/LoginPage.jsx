import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User } from 'lucide-react';

const LoginPage = ({ theme }) => {
  const isDark = theme === 'dark';
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const result = await login(credentials.username, credentials.password);
    if (result.success) {
      navigate('/billing');
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  };

  const input = isDark
    ? 'w-full bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2.5 text-sm pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'
    : 'w-full bg-gray-50 border border-gray-300 text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2.5 text-sm pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';

  const fieldLabel = isDark
    ? 'block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide'
    : 'block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide';

  return (
    <div className={`flex items-center justify-center min-h-[calc(100vh-64px)] ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className={`w-full max-w-sm rounded-2xl border shadow-xl overflow-hidden
        ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>

        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-blue-600" />

        <div className="p-8">
          {/* Logo / Brand */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl mx-auto mb-4 shadow-md shadow-blue-500/30">
              V
            </div>
            <h2 className={`text-lg font-bold uppercase tracking-widest ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
              System Login
            </h2>
            <p className={`text-xs mt-1 uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Value Motor Agency
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className={`mb-5 p-3 rounded-lg border text-sm font-medium text-center
              ${isDark
                ? 'bg-red-900/30 border-red-700 text-red-400'
                : 'bg-red-50 border-red-200 text-red-600'}`}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={fieldLabel}>Username</label>
              <div className="relative">
                <User size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  name="username"
                  value={credentials.username}
                  onChange={handleChange}
                  required
                  placeholder="Enter username"
                  className={input}
                />
              </div>
            </div>

            <div>
              <label className={fieldLabel}>Password</label>
              <div className="relative">
                <Lock size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter password"
                  className={input}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 rounded-lg font-bold text-sm transition flex justify-center items-center gap-2
                bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-sm shadow-blue-500/20
                disabled:opacity-60 disabled:cursor-not-allowed">
              {isLoading ? (
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              ) : (
                'Authenticate'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;