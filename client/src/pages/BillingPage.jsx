import React, { useState, useRef, useEffect } from 'react';
import { Printer, FileText, Eye, ChevronRight, ChevronLeft, Plus, Save, Ban, RefreshCcw, CheckCircle, Loader2, RotateCcw, ShieldAlert, Trash2 } from 'lucide-react';
import BillForm from '../components/billing/BillForm';
import BillPreview from '../components/billing/BillPreview';
import PreviousBillsPanel from '../components/billing/PreviousBillsPanel';
import { cancelBill, uncancelBill, updateBill, deleteBill } from '../api/bills';
import { fetchItems } from '../api/items';
import { useAuth } from '../context/AuthContext';

// ── "Need admin" popup ────────────────────────────────────────────────────────
const AdminRequiredModal = ({ isOpen, onClose, action }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl shadow-2xl border border-amber-200 bg-white dark:bg-gray-800 dark:border-amber-700 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-amber-600" />
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={28} className="text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-base font-black text-gray-800 dark:text-gray-100 mb-2">Admin Access Required</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            <strong className="text-gray-700 dark:text-gray-300">{action}</strong> requires administrator privileges.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Please contact your administrator to perform this action.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-white transition active:scale-[0.98]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

const BillingPage = ({ theme }) => {
  const isDark = theme === 'dark';
  const { isAdmin } = useAuth();

  const [viewMode, setViewMode] = useState('form');
  const [isPanelOpen, setIsPanelOpen] = useState(() => localStorage.getItem('vma_panel_open') !== 'false');
  const [currentBill, setCurrentBill] = useState(null);
  const [includeGatePass, setIncludeGatePass] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [inventoryItems, setInventoryItems] = useState([]);

  const billFormRef = useRef();
  const [toast, setToast] = useState(null);
  const [printStatus, setPrintStatus] = useState(null); // null | 'saving' | 'saved' | 'opening'
  const [adminModal, setAdminModal] = useState({ open: false, action: '' });

  useEffect(() => {
    const loadInventory = async () => {
      try {
        const data = await fetchItems('');
        setInventoryItems(data.filter(item => item.status === 'Active'));
      } catch (err) {
        console.error('Failed to load inventory for billing', err);
      }
    };
    loadInventory();
  }, []);

  const togglePanel = () => {
    const next = !isPanelOpen;
    setIsPanelOpen(next);
    localStorage.setItem('vma_panel_open', next.toString());
  };

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const triggerPrint = () => {
    setPrintStatus('opening');
    setTimeout(() => { window.print(); setPrintStatus(null); }, 600);
  };

  const handleSaveAndPrint = async () => {
    if (viewMode === 'preview') {
      if (includeGatePass && currentBill?.id && !currentBill?.has_gate_pass) {
        setPrintStatus('saving');
        try {
          await updateBill(currentBill.id, { ...currentBill, include_gate_pass: true });
          setCurrentBill(prev => ({ ...prev, has_gate_pass: true }));
          setRefreshCounter(prev => prev + 1);
          setPrintStatus('saved');
          setTimeout(() => triggerPrint(), 900);
        } catch {
          setPrintStatus(null);
          showToast('Failed to save Gate Pass before printing.', 'error');
        }
        return;
      }
      setPrintStatus('saved');
      setTimeout(() => triggerPrint(), 900);
      return;
    }

    if (!billFormRef.current) return;
    const formData = billFormRef.current.getFormData();

    if (formData.line_items.length === 0) {
      if (formData.external_bills.length === 0 && !includeGatePass) {
        showToast('Add items or a gate pass before printing.', 'error');
        return;
      }
      const draft = { ...formData, id: null, bill_no: 'N/A (DRAFT)' };
      setCurrentBill(draft);
      setViewMode('preview');
      setTimeout(() => window.print(), 300);
      return;
    }

    setPrintStatus('saving');
    try {
      const savedBill = await billFormRef.current.triggerSave();
      setCurrentBill(savedBill);
      setRefreshCounter(prev => prev + 1);
      setViewMode('preview');
      setPrintStatus('saved');
      setTimeout(() => triggerPrint(), 900);
    } catch (err) {
      setPrintStatus(null);
      if (err.message === 'NO_ITEMS') showToast('Cannot save to database without internal items.', 'error');
      else showToast('Failed to save invoice. Print cancelled.', 'error');
    }
  };

  // FIX #2: Don't overwrite bill_no to 'N/A (DRAFT)' when the form already has
  // a real bill number. Only mark as draft when there are genuinely no items AND
  // no bill id (i.e. it hasn't been saved yet and has nothing printable).
  const handleViewModeToggle = (mode) => {
    if (mode === 'preview' && viewMode === 'form' && billFormRef.current) {
      const draft = billFormRef.current.getFormData();
      // Only label as DRAFT when: unsaved bill AND no line items AND no external bills
      if (!draft.id && draft.line_items.length === 0 && draft.external_bills.length === 0) {
        draft.bill_no = draft.bill_no || 'N/A (DRAFT)';
      }
      // If bill_no is already set (fetched from server), never overwrite it
      setCurrentBill(draft);
    }
    setViewMode(mode);
  };

  const handleCancelInvoice = async () => {
    if (!currentBill?.id) return;
    if (!window.confirm('Cancel this invoice? Items will be returned to inventory.')) return;
    try {
      await cancelBill(currentBill.id);
      setCurrentBill({ ...currentBill, status: 'CANCELLED' });
      setRefreshCounter(prev => prev + 1);
      showToast('Invoice Cancelled Successfully', 'success');
      setViewMode('preview');
    } catch { showToast('Failed to cancel invoice', 'error'); }
  };

  const handleUncancelInvoice = async () => {
    if (!currentBill?.id) return;
    if (!isAdmin) {
      setAdminModal({ open: true, action: 'Reactivating a cancelled invoice' });
      return;
    }
    if (!window.confirm('Re-activate this invoice? Stock will be deducted again.')) return;
    try {
      await uncancelBill(currentBill.id);
      setCurrentBill({ ...currentBill, status: 'ACTIVE' });
      setRefreshCounter(prev => prev + 1);
      showToast('Invoice Re-activated Successfully', 'success');
      setViewMode('preview');
    } catch { showToast('Failed to reactivate invoice', 'error'); }
  };

  // FIX #1: Admin delete handler for the currently-viewed bill
  const handleDeleteInvoice = async () => {
    if (!currentBill?.id) return;
    if (!window.confirm(
      `Permanently delete invoice ${currentBill.bill_no}?\n\nThis cannot be undone. Stock will be restored if the bill is active.`
    )) return;
    try {
      await deleteBill(currentBill.id);
      setCurrentBill(null);
      setRefreshCounter(prev => prev + 1);
      setViewMode('form');
      showToast('Invoice deleted', 'success');
    } catch { showToast('Failed to delete invoice', 'error'); }
  };

  const handleCreateNew = () => {
    setCurrentBill(null);
    setIncludeGatePass(false);
    setViewMode('form');
  };

  const handleReset = () => {
    if (!billFormRef.current) return;
    billFormRef.current.resetForm();
    setIncludeGatePass(false);
    showToast('Form Reset', 'success');
  };

  const handleBillSelect = (bill) => {
    setCurrentBill(bill);
    setIncludeGatePass(Boolean(bill.has_gate_pass));
    setViewMode('preview');
  };

  const PrintStatusOverlay = () => {
    if (!printStatus) return null;
    const config = {
      saving:  { icon: <Loader2 size={36} className="animate-spin text-blue-400" />,   heading: 'Saving Invoice…',        sub: 'Please wait, do not close this tab.',          ring: 'border-blue-500/40',    bg: isDark ? 'bg-gray-900/90' : 'bg-white/90' },
      saved:   { icon: <CheckCircle size={36} className="text-emerald-400" />,           heading: 'Invoice Saved!',          sub: 'Opening print window…',                        ring: 'border-emerald-500/40', bg: isDark ? 'bg-gray-900/90' : 'bg-white/90' },
      opening: { icon: <Loader2 size={36} className="animate-spin text-blue-400" />,   heading: 'Opening Print Window…',  sub: 'Your browser print dialog will appear shortly.', ring: 'border-blue-500/40',    bg: isDark ? 'bg-gray-900/90' : 'bg-white/90' },
    };
    const { icon, heading, sub, ring, bg } = config[printStatus];
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm print:hidden">
        <div className={`${bg} border-2 ${ring} rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 min-w-[280px]`}>
          {icon}
          <div className="text-center">
            <p className={`text-base font-black tracking-wide ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{heading}</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{sub}</p>
          </div>
        </div>
      </div>
    );
  };

  const isBusy = !!printStatus;

  const PrintButton = () => {
    if (viewMode === 'form') {
      return (
        <button onClick={handleSaveAndPrint} disabled={isBusy}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100">
          {isBusy ? <><Loader2 size={16} className="animate-spin" /> Working…</> : <><Save size={16} /> Save &amp; Print</>}
        </button>
      );
    }
    return (
      <button onClick={handleSaveAndPrint} disabled={isBusy || !currentBill}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white shadow-sm shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100">
        {isBusy ? <><Loader2 size={16} className="animate-spin" /> Working…</> : <><Printer size={16} /> Print Invoice</>}
      </button>
    );
  };

  return (
    <div className={`flex h-[calc(100vh-64px)] overflow-hidden ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
      <PrintStatusOverlay />

      <AdminRequiredModal
        isOpen={adminModal.open}
        onClose={() => setAdminModal({ open: false, action: '' })}
        action={adminModal.action}
      />

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl shadow-2xl font-bold flex items-center gap-2 animate-fadeIn
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Sidebar */}
      <div className={`transition-all duration-300 ease-in-out border-r z-20 h-full flex-shrink-0
        ${isPanelOpen ? 'w-72' : 'w-0 overflow-hidden'}
        ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {isPanelOpen && (
          <div className="w-72 h-full flex flex-col">
            <div className={`px-4 pt-4 pb-3 border-b ${isDark ? 'border-gray-700/80' : 'border-gray-100'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-[0.18em] mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Archives</p>
              <button onClick={handleCreateNew}
                className={`group w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold backdrop-blur-md border transition-all duration-300 active:scale-[0.98]
                  ${isDark ? 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-400 shadow-[0_4px_12px_rgba(0,0,0,0.2)]' : 'bg-blue-50/60 hover:bg-blue-100/80 border-blue-200/60 text-blue-700 shadow-sm'}`}>
                <Plus size={16} className="transition-transform group-hover:rotate-90" strokeWidth={2.5} />
                Create New Bill
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* FIX #1: pass isAdmin + onDelete so the panel can show a delete button per bill */}
              <PreviousBillsPanel
                onSelectBill={handleBillSelect}
                theme={theme}
                refreshTrigger={refreshCounter}
                isAdmin={isAdmin}
                onDeleteBill={async (bill) => {
                  if (!window.confirm(`Permanently delete invoice ${bill.bill_no}?\n\nThis cannot be undone.`)) return;
                  try {
                    await deleteBill(bill.id);
                    // If the deleted bill is currently open, clear it
                    if (currentBill?.id === bill.id) {
                      setCurrentBill(null);
                      setViewMode('form');
                    }
                    setRefreshCounter(prev => prev + 1);
                    showToast('Invoice deleted', 'success');
                  } catch { showToast('Failed to delete invoice', 'error'); }
                }}
              />
            </div>
          </div>
        )}
      </div>

      <button onClick={togglePanel}
        className={`absolute top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-5 h-12 rounded-r-lg border border-l-0 shadow-lg transition-all backdrop-blur-md
          ${isPanelOpen ? 'left-72' : 'left-0'}
          ${isDark ? 'bg-gray-800/80 border-gray-600 text-gray-300 hover:bg-gray-700/90' : 'bg-white/80 border-gray-300 text-gray-600 hover:bg-gray-50/90'} hover:w-6`}>
        {isPanelOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`flex-shrink-0 px-5 py-3 border-b flex justify-between items-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>

          <div className={`flex rounded-lg border overflow-hidden text-xs font-semibold ${isDark ? 'border-gray-600 bg-gray-700/50' : 'border-gray-200 bg-gray-50'}`}>
            <button onClick={() => handleViewModeToggle('form')} disabled={isBusy}
              className={`flex items-center gap-1.5 px-4 py-2 transition disabled:opacity-50
                ${viewMode === 'form' ? (isDark ? 'bg-gray-600 text-white' : 'bg-white text-gray-800 shadow-sm') : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600')}`}>
              <FileText size={14} /> Form
            </button>
            <button onClick={() => handleViewModeToggle('preview')} disabled={isBusy}
              className={`flex items-center gap-1.5 px-4 py-2 border-l transition disabled:opacity-50
                ${isDark ? 'border-gray-600' : 'border-gray-200'}
                ${viewMode === 'preview' ? (isDark ? 'bg-gray-600 text-white' : 'bg-white text-gray-800 shadow-sm') : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600')}`}>
              <Eye size={14} /> Preview
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Cancel — all users */}
            {currentBill?.id && currentBill.status !== 'CANCELLED' && (
              <button onClick={handleCancelInvoice} disabled={isBusy}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition border disabled:opacity-50
                  ${isDark ? 'bg-red-900/30 border-red-700 text-red-400 hover:bg-red-900/50' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`}>
                <Ban size={15} /> Cancel Invoice
              </button>
            )}

            {/* Reactivate — non-admins get modal */}
            {currentBill?.status === 'CANCELLED' && (
              <button onClick={handleUncancelInvoice} disabled={isBusy}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition border disabled:opacity-50
                  ${isDark ? 'bg-amber-900/30 border-amber-700 text-amber-400 hover:bg-amber-900/50' : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'}`}>
                <RefreshCcw size={15} /> Reactivate Invoice
              </button>
            )}

            {/* FIX #1: Delete button in toolbar — admin only, only when a saved bill is loaded */}
            {isAdmin && currentBill?.id && (
              <button onClick={handleDeleteInvoice} disabled={isBusy}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition border disabled:opacity-50
                  ${isDark ? 'bg-red-900/20 border-red-800/50 text-red-400 hover:bg-red-900/40' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`}
                title="Permanently delete this invoice">
                <Trash2 size={15} /> Delete Invoice
              </button>
            )}

            {/* Reset */}
            {viewMode === 'form' && !currentBill?.id && (
              <button onClick={handleReset} disabled={isBusy} title="Clear all entered details, keep bill number"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition border disabled:opacity-50
                  ${isDark ? 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600 hover:text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}>
                <RotateCcw size={15} /> Reset
              </button>
            )}

            <PrintButton />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
            {viewMode === 'form' ? (
              <BillForm
                ref={billFormRef}
                theme={theme}
                currentBill={currentBill}
                includeGatePass={includeGatePass}
                setIncludeGatePass={setIncludeGatePass}
                inventoryItems={inventoryItems}
                onSaveSuccess={(savedBill) => {
                  setCurrentBill(savedBill);
                  setRefreshCounter(prev => prev + 1);
                  setViewMode('preview');
                }}
              />
            ) : (
              <div className="space-y-4">
                <div className={`flex justify-end p-3 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <label className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border cursor-pointer w-max transition-colors
                    ${includeGatePass
                      ? isDark ? 'bg-amber-900/50 border-amber-500 text-amber-300' : 'bg-amber-100 border-amber-400 text-amber-800'
                      : isDark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-700'}`}>
                    <input type="checkbox" checked={includeGatePass} onChange={(e) => setIncludeGatePass(e.target.checked)} className="rounded accent-amber-600 w-4 h-4" />
                    <span className="text-xs font-bold tracking-wide">ATTACH GATE PASS TO PRINT</span>
                  </label>
                </div>
                <div className={`rounded-xl border shadow-sm overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <BillPreview currentBill={currentBill} includeGatePass={includeGatePass} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;