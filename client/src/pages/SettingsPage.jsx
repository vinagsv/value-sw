import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { fetchSettings, updateSettings } from '../api/settings';
import { useSettings } from '../context/SettingsContext';

const SettingsPage = ({ theme }) => {
  const isDark = theme === 'dark';
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { reloadSettings } = useSettings();

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings', error);
    }
    setIsLoading(false);
  };

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings(settings);
      await reloadSettings();
      alert('Settings updated successfully.');
    } catch (error) {
      console.error('Failed to update settings', error);
      alert('Failed to update settings.');
    }
    setIsSaving(false);
  };

  const input = isDark
    ? 'w-full bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'
    : 'w-full bg-gray-50 border border-gray-300 text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';

  const fieldLabel = isDark
    ? 'block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide'
    : 'block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide';

  const card = isDark
    ? 'bg-gray-800 border border-gray-700 rounded-xl overflow-hidden'
    : 'bg-white border border-gray-200 rounded-xl overflow-hidden';

  const cardHeader = (accentColor) => `px-5 py-3.5 border-b flex items-center gap-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`;

  const sectionLabel = isDark
    ? 'text-xs font-semibold uppercase tracking-widest text-gray-400'
    : 'text-xs font-semibold uppercase tracking-widest text-gray-400';

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <p className={`text-sm font-medium animate-pulse ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Loading settings...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">

        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
            <SettingsIcon size={20} />
          </div>
          <h2 className={`text-xl font-bold uppercase tracking-wide ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
            System Configuration
          </h2>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <div className={card}>
              <div className={cardHeader('blue')}>
                <div className="w-1 h-4 rounded-full bg-blue-500" />
                <span className={sectionLabel}>Invoice Numbering</span>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className={fieldLabel}>Bill Prefix</label>
                  <input
                    type="text" name="bill_prefix" value={settings.bill_prefix || ''} onChange={handleChange}
                    className={`${input} font-mono font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                  />
                </div>
                <div>
                  <label className={fieldLabel}>Current Counter (next bill sequence)</label>
                  <input
                    type="number" name="bill_counter" value={settings.bill_counter || ''} onChange={handleChange}
                    className={`${input} font-mono`}
                  />
                </div>
              </div>
            </div>

            <div className={card}>
              <div className={cardHeader('amber')}>
                <div className="w-1 h-4 rounded-full bg-amber-500" />
                <span className={sectionLabel}>Gate Pass Numbering</span>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className={fieldLabel}>Gate Pass Prefix</label>
                  <input
                    type="text" name="gate_pass_prefix" value={settings.gate_pass_prefix || ''} onChange={handleChange}
                    className={`${input} font-mono font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
                  />
                </div>
                <div>
                  <label className={fieldLabel}>Current Counter (next sequence)</label>
                  <input
                    type="number" name="gate_pass_counter" value={settings.gate_pass_counter || ''} onChange={handleChange}
                    className={`${input} font-mono`}
                  />
                </div>
              </div>
            </div>

            <div className={card}>
              <div className={cardHeader('violet')}>
                <div className="w-1 h-4 rounded-full bg-violet-500" />
                <span className={sectionLabel}>Company Print Details</span>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className={fieldLabel}>Company Name</label>
                  <input type="text" name="company_name" value={settings.company_name || ''} onChange={handleChange}
                    className={`${input} uppercase`} />
                </div>
                <div>
                  <label className={fieldLabel}>Registered Address</label>
                  <textarea name="company_address" value={settings.company_address || ''} onChange={handleChange}
                    rows={2} className={`${input} resize-none`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={fieldLabel}>GSTIN</label>
                    <input type="text" name="company_gstin" value={settings.company_gstin || ''} onChange={handleChange}
                      className={`${input} uppercase`} />
                  </div>
                  <div>
                    <label className={fieldLabel}>Contact Phone</label>
                    <input type="text" name="company_phone" value={settings.company_phone || ''} onChange={handleChange}
                      className={input} />
                  </div>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className={cardHeader('emerald')}>
                <div className="w-1 h-4 rounded-full bg-emerald-500" />
                <span className={sectionLabel}>Security</span>
              </div>
              <div className="p-5 grid grid-cols-1 gap-4">
                <div>
                  <label className={fieldLabel}>Admin Username</label>
                  <input type="text" name="auth_username" value={settings.auth_username || ''} onChange={handleChange}
                    className={input} />
                </div>
                <div>
                  <label className={fieldLabel}>New Password</label>
                  <input type="password" name="auth_password" onChange={handleChange}
                    placeholder="Leave blank to keep current" className={input} />
                </div>
              </div>
            </div>

          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition
                bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white shadow-sm shadow-blue-500/20
                disabled:opacity-60 disabled:cursor-not-allowed">
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Apply Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;