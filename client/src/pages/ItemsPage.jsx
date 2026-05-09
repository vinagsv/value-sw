import React, { useState, useEffect, memo, useRef } from 'react';
import { Search, Plus, Package, Download, Check, Pencil, Trash2, Loader2, X, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { fetchItems, createItem, updateItem, deleteItem } from '../api/items';

// --- SAVE CONFIRM POPUP ---
const SaveConfirmPopup = ({ pending, onConfirm, onCancel, isDark }) => {
  if (!pending) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center pb-8 pointer-events-none">
      <div className={`pointer-events-auto flex items-center gap-4 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm
        ${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`}
        style={{ minWidth: 320 }}>
        <div className="flex-1">
          <p className="font-semibold text-xs uppercase tracking-wide text-amber-500 mb-0.5">Save change?</p>
          <p className="text-xs opacity-60 truncate max-w-[220px]">
            <span className="line-through mr-1">{String(pending.oldValue)}</span>
            → <span className="font-semibold">{String(pending.newPayload[pending.field] ?? '')}</span>
          </p>
        </div>
        <button onClick={onCancel}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition
            ${isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
          Cancel
        </button>
        <button onClick={onConfirm}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition">
          Save
        </button>
      </div>
    </div>
  );
};

// --- EDITABLE CELL ---
const EditableCell = memo(({ item, field, type = 'text', options = [], onSave, onRequestSave, isEditMode, isDark }) => {
  const [value, setValue] = useState(item[field] ?? '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { setValue(item[field] ?? ''); }, [item[field]]);

  const handleCommit = (newValue) => {
    const trimmed = typeof newValue === 'string' ? newValue.trim() : newValue;
    if (String(trimmed) === String(item[field])) return;
    onRequestSave(
      item.id,
      { ...item, [field]: trimmed },
      field,
      item[field],
      async () => {
        setIsSaving(true);
        try {
          await onSave(item.id, { ...item, [field]: trimmed });
        } catch {
          setValue(item[field] ?? '');
        } finally {
          setIsSaving(false);
        }
      },
      () => { setValue(item[field] ?? ''); }
    );
  };

  const editBg = isDark
    ? 'hover:bg-amber-900/30 focus:bg-amber-900/40 focus:border-amber-500/70'
    : 'hover:bg-amber-50 focus:bg-amber-50 focus:border-amber-400';

  const base = `w-full px-2 py-1.5 text-sm outline-none border border-transparent rounded transition-colors
    ${isSaving ? (isDark ? 'text-gray-500 bg-gray-700/40' : 'text-gray-400 bg-gray-100') : 'bg-transparent'}
    ${!isEditMode ? 'cursor-default' : editBg}`;

  if (!isEditMode) {
    let displayValue = value;
    if (typeof value === 'boolean') displayValue = value ? 'Yes' : 'No';
    else if (value === 'true') displayValue = 'Yes';
    else if (value === 'false') displayValue = 'No';
    return (
      <div className={`px-2 py-1.5 text-sm truncate ${isSaving ? 'opacity-40' : ''}`} title={String(displayValue)}>
        {displayValue}
      </div>
    );
  }

  if (type === 'datalist') {
    const listId = `list-${field}-${item.id}`;
    return (
      <div className="relative min-w-[80px]" data-no-expand="true">
        <input list={listId} disabled={isSaving} value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={e => handleCommit(e.target.value)}
          className={base} />
        <datalist id={listId}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </datalist>
        {isSaving && <Loader2 className="w-3 h-3 text-amber-500 animate-spin absolute right-2 top-1/2 -translate-y-1/2" />}
      </div>
    );
  }

  return (
    <div className="relative min-w-[80px]" data-no-expand="true">
      {type === 'select' ? (
        <select disabled={isSaving} value={value}
          onChange={e => { setValue(e.target.value); handleCommit(e.target.value); }}
          className={base}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} disabled={isSaving} value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={e => handleCommit(e.target.value)}
          className={base} />
      )}
      {isSaving && <Loader2 className="w-3 h-3 text-amber-500 animate-spin absolute right-2 top-1/2 -translate-y-1/2" />}
    </div>
  );
});
EditableCell.displayName = 'EditableCell';

// --- FIELD ROW for modal ---
const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

// --- MAIN PAGE ---
const ItemsPage = ({ theme }) => {
  const isDark = theme === 'dark';
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [pendingConfirm, setPendingConfirm] = useState(null); // { id, newPayload, field, oldValue, doSave, doCancel }

  const blankForm = {
    item_id: '', item_name: '', hsn_sac: '', description: '',
    quantity_applicable: 'No', available_quantity: 0, rate: '0',
    taxable: true, product_type: 'goods',
    intra_state_tax_name: 'GST18', intra_state_tax_rate: 18,
    inter_state_tax_name: 'IGST18', inter_state_tax_rate: 18,
    status: 'Active',
  };
  const [form, setForm] = useState(blankForm);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => { loadItems(); }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadItems = async (search = '') => {
    setIsLoading(true);
    try { setItems(await fetchItems(search)); }
    catch { showToast('Failed to load inventory', 'error'); }
    setIsLoading(false);
  };

  const handleSearch = e => {
    setSearchTerm(e.target.value);
    if (e.target.value.length > 2 || e.target.value === '') loadItems(e.target.value);
  };

  // Called by EditableCell — shows confirm popup, executes doSave or doCancel
  const handleRequestSave = (id, newPayload, field, oldValue, doSave, doCancel) => {
    setPendingConfirm({ id, newPayload, field, oldValue, doSave, doCancel });
  };

  const handleConfirmSave = async () => {
    const { doSave } = pendingConfirm;
    setPendingConfirm(null);
    await doSave();
  };

  const handleCancelSave = () => {
    pendingConfirm?.doCancel?.();
    setPendingConfirm(null);
  };

  const handleCellSave = async (id, payload) => {
    try {
      const updated = await updateItem(id, payload);
      setItems(prev => prev.map(i => i.id === id ? updated : i));
    } catch {
      showToast('Failed to update field', 'error');
      throw new Error('save failed');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Permanently delete "${name}"?`)) return;
    try {
      await deleteItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
      showToast('Item deleted');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete item', 'error');
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await createItem(form);
      setIsModalOpen(false);
      setForm(blankForm);
      loadItems(searchTerm);
      showToast('Item created successfully');
    } catch {
      showToast('Failed to create item. Check if Item ID is unique.', 'error');
    }
  };

  const exportToExcel = () => {
    if (!items.length) return alert('No items to export.');
    const rows = items.map(i => ({
      'Item ID': i.item_id, 'Item Name': i.item_name, 'Description': i.description || '',
      'Stock': +i.available_quantity, 'Rate': `INR ${i.rate}`,
      'Intra State Tax Rate': +i.intra_state_tax_rate, 'Inter State Tax Rate': +i.inter_state_tax_rate,
      'HSN/SAC': i.hsn_sac || '', 'Quantity Applicable': i.quantity_applicable,
      'Taxable': i.taxable, 'Product Type': i.product_type,
      'Intra State Tax Name': i.intra_state_tax_name,
      'Inter State Tax Name': i.inter_state_tax_name, 'Status': i.status,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Inventory');
    XLSX.writeFile(wb, `VMA_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Row click handler — expand/collapse unless clicking inside an interactive edit element
  const handleRowClick = (e, itemId) => {
    if (e.target.closest('[data-no-expand]')) return;
    setExpandedRow(expandedRow === itemId ? null : itemId);
  };

  // Styles
  const card = `${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl`;
  const inp = (extra = '') =>
    `w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
    ${isDark
      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500'
      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} ${extra}`;

  const th = `px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap sticky top-0 z-10
    ${isDark ? 'bg-gray-800 text-gray-400 border-b border-gray-700' : 'bg-gray-50 text-gray-500 border-b border-gray-200'}`;

  // Edit mode: amber left border on rows to signal editable state
  const tdBase = (isExpanded) => `p-0 ${isDark ? 'border-b border-gray-700/60' : 'border-b border-gray-100'}`;

  const taxRateOptions = ['0', '5', '12', '18', '28'];
  const productTypes = ['goods', 'services'];
  const statusOptions = ['Active', 'Inactive'];
  const qtyOptions = ['No', 'Yes'];

  // Shared EditableCell props helper
  const cellProps = (item, field, extra = {}) => ({
    item, field, onSave: handleCellSave, onRequestSave: handleRequestSave,
    isEditMode, isDark, ...extra
  });

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>

      {/* Save Confirm Popup */}
      <SaveConfirmPopup
        pending={pendingConfirm}
        onConfirm={handleConfirmSave}
        onCancel={handleCancelSave}
        isDark={isDark}
      />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl font-semibold text-sm flex items-center gap-2
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-[1700px] w-full mx-auto p-4 md:p-6 flex flex-col gap-4" style={{ height: 'calc(100vh - 64px)' }}>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
              <Package size={20} />
            </div>
            <div>
              <h2 className={`text-lg font-bold uppercase tracking-wide ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                Inventory
              </h2>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {items.length} items · click a row to expand details
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input type="text" placeholder="Search items..." value={searchTerm} onChange={handleSearch}
                className={`${inp('pl-8 w-52')}`} />
            </div>

            {/* Edit mode buttons */}
            {isEditMode ? (
              <>
                <button onClick={() => setIsEditMode(false)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition
                    ${isDark ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                  <X size={14} />Cancel
                </button>
                <button onClick={() => setIsEditMode(false)}
                  className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition bg-amber-500 border-amber-500 text-white hover:bg-amber-600">
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
                  </span>
                  <Check size={14} />Done
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditMode(true)}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition
                  ${isDark ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                <Pencil size={14} />Edit
              </button>
            )}

            <button onClick={exportToExcel}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition
                ${isDark ? 'bg-gray-800 border-gray-600 text-green-400 hover:bg-gray-700' : 'bg-white border-gray-200 text-green-600 hover:bg-gray-50'}`}>
              <Download size={14} />Export
            </button>

            <button onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition">
              <Plus size={14} />Add Item
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={`flex-1 overflow-auto rounded-xl border shadow-sm ${card}`}>
          {/* Edit mode: subtle amber top bar */}
          {isEditMode && (
            <div className={`h-0.5 w-full rounded-t-xl ${isDark ? 'bg-amber-500/60' : 'bg-amber-400/70'}`} />
          )}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={`${th} w-8`} />
                <th className={`${th} sticky left-0 z-20 min-w-[140px] ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>Item ID</th>
                <th className={`${th} min-w-[200px]`}>Item Name</th>
                <th className={th}>Stock</th>
                <th className={th}>Rate (₹)</th>
                <th className={th}>Intra-State Tax (%)</th>
                <th className={th}>Inter-State Tax (%)</th>
                <th className={th}>Status</th>
                {isEditMode && <th className={th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={isEditMode ? 9 : 8} className="text-center py-16 text-sm opacity-40">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading...
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={isEditMode ? 9 : 8} className="text-center py-16 text-sm opacity-40">No items found.</td></tr>
              ) : items.map(item => (
                <React.Fragment key={item.id}>
                  <tr
                    className={`group transition-colors cursor-pointer
                      ${expandedRow === item.id
                        ? isDark ? 'bg-blue-900/20' : 'bg-blue-50/60'
                        : isDark ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50/80'}
                      ${isEditMode ? (isDark ? 'border-l-2 border-l-amber-500/40' : 'border-l-2 border-l-amber-400/50') : ''}`}
                    onClick={e => handleRowClick(e, item.id)}>

                    <td className={`${tdBase()} pl-3 w-8`}>
                      <ChevronDown size={13} className={`transition-transform text-gray-400
                        ${expandedRow === item.id ? 'rotate-180' : ''}`} />
                    </td>

                    {/* Sticky Item ID */}
                    <td className={`${tdBase()} sticky left-0 z-10
                      ${isDark ? 'bg-gray-800 group-hover:bg-gray-700/40' : 'bg-white group-hover:bg-gray-50/80'}
                      ${expandedRow === item.id ? isDark ? '!bg-blue-900/20' : '!bg-blue-50/60' : ''}`}>
                      <EditableCell {...cellProps(item, 'item_id')} />
                    </td>

                    <td className={tdBase()}>
                      <EditableCell {...cellProps(item, 'item_name')} />
                    </td>

                    <td className={tdBase()}>
                      <div className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        <EditableCell {...cellProps(item, 'available_quantity', {
                          type: 'number',
                          isEditMode: isEditMode && item.quantity_applicable?.toLowerCase() === 'yes'
                        })} />
                      </div>
                    </td>

                    <td className={tdBase()}>
                      <EditableCell {...cellProps(item, 'rate', { type: 'number' })} />
                    </td>

                    <td className={tdBase()}>
                      <EditableCell {...cellProps(item, 'intra_state_tax_rate', { type: 'datalist', options: taxRateOptions })} />
                    </td>

                    <td className={tdBase()}>
                      <EditableCell {...cellProps(item, 'inter_state_tax_rate', { type: 'datalist', options: taxRateOptions })} />
                    </td>

                    <td className={`${tdBase()} pr-2`}>
                      <div className={item.status !== 'Active' ? (isDark ? 'text-red-400' : 'text-red-500') : ''}>
                        <EditableCell {...cellProps(item, 'status', { type: 'select', options: statusOptions })} />
                      </div>
                    </td>

                    {isEditMode && (
                      <td className={`${tdBase()} px-3`} data-no-expand="true">
                        <button onClick={e => { e.stopPropagation(); handleDelete(item.id, item.item_name); }}
                          className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>

                  {/* Expanded Detail Row */}
                  {expandedRow === item.id && (
                    <tr className={isDark ? 'bg-blue-900/10' : 'bg-blue-50/40'}>
                      <td colSpan={isEditMode ? 9 : 8} className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                          <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                            <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Item Details</p>
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">HSN/SAC</span>
                                <div className="text-xs font-medium">
                                  <EditableCell {...cellProps(item, 'hsn_sac')} />
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">Product Type</span>
                                <div className="text-xs font-medium">
                                  <EditableCell {...cellProps(item, 'product_type', { type: 'select', options: productTypes })} />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                            <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Configuration</p>
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">Qty Applicable</span>
                                <div className="text-xs font-medium">
                                  <EditableCell {...cellProps(item, 'quantity_applicable', { type: 'select', options: qtyOptions })} />
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">Taxable</span>
                                <div className="text-xs font-medium">
                                  <EditableCell {...cellProps(item, 'taxable', { type: 'select', options: ['true', 'false'] })} />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className={`md:col-span-2 rounded-lg p-3 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                            <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Tax Identifiers</p>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">Intra-State Name</span>
                                  <div className="text-xs font-medium">
                                    <EditableCell {...cellProps(item, 'intra_state_tax_name')} />
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">Inter-State Name</span>
                                  <div className="text-xs font-medium">
                                    <EditableCell {...cellProps(item, 'inter_state_tax_name')} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className={`col-span-2 md:col-span-4 rounded-lg p-3 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                            <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Description</p>
                            {isEditMode ? (
                              <textarea
                                defaultValue={item.description || ''}
                                onBlur={e => {
                                  const newVal = e.target.value;
                                  if (newVal === (item.description || '')) return;
                                  handleRequestSave(
                                    item.id,
                                    { ...item, description: newVal },
                                    'description',
                                    item.description || '',
                                    async () => handleCellSave(item.id, { ...item, description: newVal }),
                                    () => { e.target.value = item.description || ''; }
                                  );
                                }}
                                rows={2}
                                data-no-expand="true"
                                className={`w-full text-sm rounded px-3 py-2 outline-none border resize-none transition-colors
                                  ${isDark
                                    ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-amber-500'
                                    : 'bg-amber-50/50 border-amber-200/60 text-gray-900 focus:border-amber-400'}`}
                              />
                            ) : (
                              <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                {item.description || <span className="italic opacity-50">No description provided</span>}
                              </p>
                            )}
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>

            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 rounded-full bg-blue-500" />
                <h3 className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Add New Item</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)}
                className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 custom-scrollbar">
              <div className="p-6 space-y-5">

                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Identity</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Item ID" required>
                      <input required type="text" value={form.item_id}
                        onChange={e => f('item_id', e.target.value)} className={inp('uppercase')} />
                    </Field>
                    <Field label="Item Name" required>
                      <input required type="text" value={form.item_name}
                        onChange={e => f('item_name', e.target.value)} className={inp()} />
                    </Field>
                    <Field label="HSN / SAC Code">
                      <input type="text" value={form.hsn_sac}
                        onChange={e => f('hsn_sac', e.target.value)} className={inp()} />
                    </Field>
                    <Field label="Status">
                      <select value={form.status} onChange={e => f('status', e.target.value)} className={inp()}>
                        <option>Active</option><option>Inactive</option>
                      </select>
                    </Field>
                  </div>
                </div>

                <div className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`} />

                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Pricing & Stock</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Rate (₹)" required>
                      <input required type="number" step="0.01" value={form.rate}
                        onChange={e => f('rate', e.target.value)} className={inp()} />
                    </Field>
                    <Field label="Quantity Applicable">
                      <select value={form.quantity_applicable} onChange={e => {
                        const val = e.target.value;
                        setForm(prev => ({ ...prev, quantity_applicable: val, available_quantity: val.toLowerCase() === 'yes' ? prev.available_quantity : 0 }));
                      }} className={inp()}>
                        <option value="No">No</option><option value="Yes">Yes</option>
                      </select>
                    </Field>
                    <Field label="Available Quantity">
                      <input type="number" step="0.01" value={form.available_quantity}
                        disabled={form.quantity_applicable?.toLowerCase() !== 'yes'}
                        onChange={e => f('available_quantity', e.target.value)}
                        className={inp(form.quantity_applicable?.toLowerCase() !== 'yes' ? 'opacity-50 cursor-not-allowed' : '')} />
                    </Field>
                    <Field label="Product Type">
                      <select value={form.product_type} onChange={e => f('product_type', e.target.value)} className={inp()}>
                        <option value="goods">Goods</option><option value="services">Services</option>
                      </select>
                    </Field>
                  </div>
                </div>

                <div className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`} />

                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>GST Configuration</p>

                  <div className="flex items-center gap-3 mb-4">
                    <label className="text-sm font-medium">Taxable</label>
                    <button type="button"
                      onClick={() => f('taxable', !form.taxable)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition
                        ${form.taxable ? 'bg-blue-600' : isDark ? 'bg-gray-600' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform
                        ${form.taxable ? 'translate-x-[18px]' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-xs text-gray-500">{form.taxable ? 'Yes' : 'No'}</span>
                  </div>

                  {form.taxable && (
                    <div className="grid grid-cols-2 gap-5">
                      <div className={`rounded-lg p-4 border ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-blue-50/50 border-blue-100'}`}>
                        <p className={`text-xs font-semibold mb-3 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Intra-State (CGST + SGST)</p>
                        <div className="space-y-3">
                          <Field label="Tax Name">
                            <input type="text" value={form.intra_state_tax_name}
                              onChange={e => f('intra_state_tax_name', e.target.value)} className={inp()} />
                          </Field>
                          <Field label="Tax Rate (%)">
                            <input list="intra-tax-rates" type="number" step="0.01" value={form.intra_state_tax_rate}
                              onChange={e => f('intra_state_tax_rate', e.target.value ? Number(e.target.value) : '')} className={inp()} />
                            <datalist id="intra-tax-rates">
                              {taxRateOptions.map(r => <option key={r} value={r} />)}
                            </datalist>
                          </Field>
                        </div>
                      </div>

                      <div className={`rounded-lg p-4 border ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-purple-50/50 border-purple-100'}`}>
                        <p className={`text-xs font-semibold mb-3 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>Inter-State (IGST)</p>
                        <div className="space-y-3">
                          <Field label="Tax Name">
                            <input type="text" value={form.inter_state_tax_name}
                              onChange={e => f('inter_state_tax_name', e.target.value)} className={inp()} />
                          </Field>
                          <Field label="Tax Rate (%)">
                            <input list="inter-tax-rates" type="number" step="0.01" value={form.inter_state_tax_rate}
                              onChange={e => f('inter_state_tax_rate', e.target.value ? Number(e.target.value) : '')} className={inp()} />
                            <datalist id="inter-tax-rates">
                              {taxRateOptions.map(r => <option key={r} value={r} />)}
                            </datalist>
                          </Field>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`} />

                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Description</p>
                  <textarea rows={3} value={form.description}
                    onChange={e => f('description', e.target.value)}
                    placeholder="Optional notes about this item..."
                    className={`${inp()} resize-none`} />
                </div>
              </div>

              <div className={`flex justify-end gap-3 px-6 py-4 border-t shrink-0 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition
                    ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  Cancel
                </button>
                <button type="submit"
                  className="px-6 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition">
                  Add to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemsPage;