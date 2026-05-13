import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Users, Plus, Pencil, Trash2, X, Eye, EyeOff, ShieldCheck, User, ToggleLeft, ToggleRight, KeyRound } from 'lucide-react';
import { fetchSettings, updateSettings } from '../api/settings';
import { useSettings } from '../context/SettingsContext';
import { fetchUsers, createUser, updateUser, deleteUser } from '../api/users';

// ─────────────────────────────────────────────────────────────────────────────
// User Management Panel
// ─────────────────────────────────────────────────────────────────────────────
const UserManagement = ({ isDark, inp, fieldLabel }) => {
  const [users, setUsers]             = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [toast, setToast]             = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = new user
  const [showPw, setShowPw]           = useState(false);

  const blankForm = { username: '', display_name: '', password: '', role: 'user', is_active: true };
  const [form, setForm] = useState(blankForm);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    setIsLoading(true);
    try { setUsers(await fetchUsers()); }
    catch { showToast('Failed to load users', 'error'); }
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm(blankForm);
    setShowPw(false);
    setIsModalOpen(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({ username: u.username, display_name: u.display_name || '', password: '', role: u.role, is_active: u.is_active });
    setShowPw(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const payload = { ...form };
        if (!payload.password) delete payload.password; // don't send empty password
        await updateUser(editingUser.id, payload);
        showToast('User updated successfully');
      } else {
        if (!form.password) { showToast('Password is required for new users', 'error'); return; }
        await createUser(form);
        showToast('User created successfully');
      }
      setIsModalOpen(false);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const handleToggleActive = async (u) => {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      showToast(`User ${u.is_active ? 'disabled' : 'enabled'}`);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update user', 'error');
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Permanently delete "${u.username}"? This cannot be undone.`)) return;
    try {
      await deleteUser(u.id);
      showToast('User deleted');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete user', 'error');
    }
  };

  const divider = isDark ? 'border-gray-700' : 'border-gray-100';

  return (
    <div>
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl font-semibold text-sm flex items-center gap-2
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className={`text-sm font-bold uppercase tracking-wide ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>System Users</h3>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Only one admin can exist. Any number of regular users are allowed.
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm">
          <Plus size={15} /> Add User
        </button>
      </div>

      {/* Users table */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className={`text-xs uppercase font-semibold tracking-wider ${isDark ? 'bg-gray-700/60 text-gray-400 border-b border-gray-700' : 'bg-gray-50 text-gray-500 border-b border-gray-200'}`}>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Username</th>
              <th className="px-4 py-3 text-center">Role</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-10 text-sm opacity-40">Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-sm opacity-40">No users found.</td></tr>
            ) : users.map((u, idx) => (
              <tr key={u.id}
                className={`border-b last:border-0 transition-colors ${isDark ? 'border-gray-700 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-gray-50/80'}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0
                      ${u.role === 'admin'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                      {(u.display_name || u.username).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className={`font-semibold text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        {u.display_name || u.username}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Since {new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </td>
                <td className={`px-4 py-3 font-mono text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{u.username}</td>
                <td className="px-4 py-3 text-center">
                  {u.role === 'admin' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                      <ShieldCheck size={11} /> Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                      <User size={11} /> User
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => handleToggleActive(u)} title={u.is_active ? 'Disable user' : 'Enable user'}
                    className="inline-flex items-center gap-1.5 transition">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                        <ToggleRight size={13} /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                        <ToggleLeft size={13} /> Disabled
                      </span>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(u)} title="Edit user"
                      className={`p-1.5 rounded-lg border transition ${isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-blue-400' : 'border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600'}`}>
                      <Pencil size={14} />
                    </button>
                    {/* Can't delete the admin (they'll get an error from server anyway, but hide the button to be clean) */}
                    {u.role !== 'admin' && (
                      <button onClick={() => handleDelete(u)} title="Delete user"
                        className={`p-1.5 rounded-lg border transition ${isDark ? 'border-gray-600 text-gray-400 hover:bg-red-900/30 hover:text-red-400 hover:border-red-700' : 'border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200'}`}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 rounded-full bg-blue-500" />
                <h3 className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  {editingUser ? 'Edit User' : 'Create User'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              <div>
                <label className={fieldLabel}>Display Name</label>
                <input type="text" value={form.display_name} onChange={e => f('display_name', e.target.value)} placeholder="Full name (shown in UI)" className={inp()} />
              </div>

              <div>
                <label className={fieldLabel}>Username <span className="text-red-500">*</span></label>
                <input required type="text" value={form.username} onChange={e => f('username', e.target.value)} placeholder="Login username" className={`${inp()} font-mono`} />
              </div>

              <div>
                <label className={fieldLabel}>
                  {editingUser ? 'New Password' : 'Password'} {!editingUser && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => f('password', e.target.value)}
                    placeholder={editingUser ? 'Leave blank to keep current' : 'Set a password'}
                    className={`${inp()} pr-10`}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {editingUser && (
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Leave blank to keep the existing password unchanged.</p>
                )}
              </div>

              <div>
                <label className={fieldLabel}>Role <span className="text-red-500">*</span></label>
                <select value={form.role} onChange={e => f('role', e.target.value)} className={inp()}>
                  <option value="user">User — can create/edit bills & gate passes</option>
                  <option value="admin">Admin — full access including settings & inventory</option>
                </select>
                {form.role === 'admin' && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    <ShieldCheck size={12} /> Only one admin account is allowed system-wide.
                  </p>
                )}
              </div>

              {editingUser && (
                <div className="flex items-center gap-3">
                  <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Account Active</label>
                  <button type="button" onClick={() => f('is_active', !form.is_active)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${form.is_active ? 'bg-emerald-500' : (isDark ? 'bg-gray-600' : 'bg-gray-300')}`}>
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-[18px]' : 'translate-x-1'}`} />
                  </button>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{form.is_active ? 'Active' : 'Disabled'}</span>
                </div>
              )}

              <div className={`flex justify-end gap-3 pt-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  Cancel
                </button>
                <button type="submit"
                  className="px-6 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition">
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Settings Page
// ─────────────────────────────────────────────────────────────────────────────
const SettingsPage = ({ theme }) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState('system');
  const [settings, setSettings]   = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving]   = useState(false);
  const { reloadSettings } = useSettings();

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try { setSettings(await fetchSettings()); }
    catch (error) { console.error('Failed to load settings', error); }
    setIsLoading(false);
  };

  const handleChange = (e) => setSettings({ ...settings, [e.target.name]: e.target.value });

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

  // Shared style helpers (also passed to UserManagement)
  const inp = (extra = '') =>
    `w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
    ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-400'} ${extra}`;

  const fieldLabel = isDark
    ? 'block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide'
    : 'block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide';

  const card = isDark ? 'bg-gray-800 border border-gray-700 rounded-xl overflow-hidden' : 'bg-white border border-gray-200 rounded-xl overflow-hidden';
  const divider = isDark ? 'border-gray-700' : 'border-gray-100';
  const sectionLabel = 'text-xs font-semibold uppercase tracking-widest text-gray-400';

  const tabs = [
    { id: 'system', label: 'System Config', icon: SettingsIcon },
    { id: 'users',  label: 'User Management', icon: Users },
  ];

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <p className={`text-sm font-medium animate-pulse ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
            <SettingsIcon size={20} />
          </div>
          <h2 className={`text-xl font-bold uppercase tracking-wide ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>System Configuration</h2>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 p-1 rounded-xl border w-fit ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all
                  ${isActive
                    ? isDark ? 'bg-gray-700 text-white shadow-sm' : 'bg-gray-100 text-gray-800 shadow-sm'
                    : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                <Icon size={15} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab: System Config ── */}
        {activeTab === 'system' && (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div className={card}>
                <div className={`px-5 py-3.5 border-b flex items-center gap-3 ${divider}`}>
                  <div className="w-1 h-4 rounded-full bg-blue-500" />
                  <span className={sectionLabel}>Invoice Numbering</span>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className={fieldLabel}>Bill Prefix</label>
                    <input type="text" name="bill_prefix" value={settings.bill_prefix || ''} onChange={handleChange}
                      className={`${inp()} font-mono font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <label className={fieldLabel}>Current Counter (next bill sequence)</label>
                    <input type="number" name="bill_counter" value={settings.bill_counter || ''} onChange={handleChange} className={`${inp()} font-mono`} />
                  </div>
                </div>
              </div>

              <div className={card}>
                <div className={`px-5 py-3.5 border-b flex items-center gap-3 ${divider}`}>
                  <div className="w-1 h-4 rounded-full bg-amber-500" />
                  <span className={sectionLabel}>Gate Pass Numbering</span>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className={fieldLabel}>Gate Pass Prefix</label>
                    <input type="text" name="gate_pass_prefix" value={settings.gate_pass_prefix || ''} onChange={handleChange}
                      className={`${inp()} font-mono font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <label className={fieldLabel}>Current Counter (next sequence)</label>
                    <input type="number" name="gate_pass_counter" value={settings.gate_pass_counter || ''} onChange={handleChange} className={`${inp()} font-mono`} />
                  </div>
                </div>
              </div>

              <div className={card}>
                <div className={`px-5 py-3.5 border-b flex items-center gap-3 ${divider}`}>
                  <div className="w-1 h-4 rounded-full bg-violet-500" />
                  <span className={sectionLabel}>Company Print Details</span>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className={fieldLabel}>Company Name</label>
                    <input type="text" name="company_name" value={settings.company_name || ''} onChange={handleChange} className={`${inp()} uppercase`} />
                  </div>
                  <div>
                    <label className={fieldLabel}>Registered Address</label>
                    <textarea name="company_address" value={settings.company_address || ''} onChange={handleChange} rows={2} className={`${inp()} resize-none`} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={fieldLabel}>GSTIN</label>
                      <input type="text" name="company_gstin" value={settings.company_gstin || ''} onChange={handleChange} className={`${inp()} uppercase`} />
                    </div>
                    <div>
                      <label className={fieldLabel}>Contact Phone</label>
                      <input type="text" name="company_phone" value={settings.company_phone || ''} onChange={handleChange} className={inp()} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin credentials card — kept for admin's own password change */}
              <div className={card}>
                <div className={`px-5 py-3.5 border-b flex items-center gap-3 ${divider}`}>
                  <div className="w-1 h-4 rounded-full bg-emerald-500" />
                  <span className={sectionLabel}>Admin Account</span>
                </div>
                <div className="p-5 space-y-4">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${isDark ? 'bg-amber-900/20 border border-amber-800/40 text-amber-400' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                    <KeyRound size={13} />
                    Use the <strong>User Management</strong> tab to change the admin password or username.
                  </div>
                </div>
              </div>

            </div>

            <div className="flex justify-end pt-1">
              <button type="submit" disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white shadow-sm shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed">
                <Save size={16} />{isSaving ? 'Saving...' : 'Apply Configuration'}
              </button>
            </div>
          </form>
        )}

        {/* ── Tab: User Management ── */}
        {activeTab === 'users' && (
          <div className={`${card} p-6`}>
            <UserManagement isDark={isDark} inp={inp} fieldLabel={fieldLabel} />
          </div>
        )}

      </div>
    </div>
  );
};

export default SettingsPage;