import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Save, FilePlus2 } from 'lucide-react';
import { calculateTaxes } from '../../utils/taxCalc';
import { calculateFromTotal } from '../../utils/twoWayTotal';
import { createBill, updateBill } from '../../api/bills';
import { fetchNextBillNumber } from '../../api/settings';

const r2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

// ── Inline item search cell ───────────────────────────────────────────────────
const InlineItemSearch = ({ value, onChange, options, isDark, autoFocus }) => {
  const selectedOption = options.find(o => String(o.id) === String(value));

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [rect, setRect] = useState(null);

  const inputRef = useRef(null);
  const listRef  = useRef(null);

  const reposition = useCallback(() => {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
  }, []);

  useEffect(() => {
    if (autoFocus && !value) {
      inputRef.current?.focus();
      reposition();
      setIsOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('scroll', reposition, { capture: true, passive: true });
    window.addEventListener('resize', reposition, { passive: true });
    return () => {
      window.removeEventListener('scroll', reposition, { capture: true });
      window.removeEventListener('resize', reposition);
    };
  }, [isOpen, reposition]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (inputRef.current && inputRef.current.contains(e.target)) return;
      if (listRef.current  && listRef.current.contains(e.target))  return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const filtered = query.trim()
    ? options.filter(o => o.item_name.toLowerCase().includes(query.toLowerCase()))
    : options;

  const openDropdown = () => {
    reposition();
    setIsOpen(true);
    setHighlighted(0);
  };

  const handleSelect = (item) => {
    onChange(item.id);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setQuery('');
    setTimeout(() => { inputRef.current?.focus(); openDropdown(); }, 0);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); openDropdown(); }
      return;
    }
    if (e.key === 'ArrowDown')  { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter')     { e.preventDefault(); if (filtered[highlighted]) handleSelect(filtered[highlighted]); }
    else if (e.key === 'Escape')    { setIsOpen(false); }
  };

  useEffect(() => {
    if (listRef.current && isOpen) {
      listRef.current.children[highlighted]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted, isOpen]);

  const dropdownStyle = rect
    ? { position: 'fixed', top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 260), zIndex: 99999 }
    : { display: 'none' };

  if (selectedOption) {
    return (
      <div className="flex items-center gap-1 w-full">
        <button type="button" onClick={handleClear} title="Click to change item"
          className={`flex-1 text-left px-2 py-1.5 rounded-md text-xs font-medium border truncate transition-colors
            ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100 hover:border-blue-500' : 'bg-white border-gray-200 text-gray-800 hover:border-blue-400'}`}>
          {selectedOption.item_name}
        </button>
        <button type="button" onClick={handleClear} title="Change item"
          className={`shrink-0 w-6 h-6 flex items-center justify-center rounded text-sm font-bold leading-none transition
            ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}>
          ×
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setHighlighted(0); if (!isOpen) openDropdown(); }}
        onFocus={openDropdown}
        onKeyDown={handleKeyDown}
        placeholder="Type to search…"
        className={`w-full min-w-[200px] rounded-md px-2 py-1.5 text-xs border transition focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500
          ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'}`}
      />
      {isOpen && createPortal(
        <>
          {filtered.length > 0 && (
            <ul ref={listRef} style={dropdownStyle}
              className={`max-h-60 overflow-y-auto rounded-xl shadow-2xl border custom-scrollbar
                ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
              {filtered.map((item, idx) => (
                <li key={item.id}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                  onMouseEnter={() => setHighlighted(idx)}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer text-xs border-b last:border-0 transition-colors
                    ${idx === highlighted
                      ? isDark ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                      : isDark ? 'border-gray-700 text-gray-200 hover:bg-gray-700' : 'border-gray-100 text-gray-800 hover:bg-gray-50'}`}>
                  <span className="font-medium truncate pr-3">{item.item_name}</span>
                  <span className={`tabular-nums shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    ₹{Number(item.rate).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {filtered.length === 0 && query.trim() && (
            <div style={dropdownStyle}
              className={`px-3 py-3 text-xs text-center rounded-xl shadow-2xl border
                ${isDark ? 'bg-gray-800 border-gray-600 text-gray-500' : 'bg-white border-gray-200 text-gray-400'}`}>
              No items match "{query}"
            </div>
          )}
        </>,
        document.body
      )}
    </>
  );
};

const makeInitialForm = () => ({
  id: null, bill_no: '', date: new Date().toISOString().split('T')[0],
  customer_id: '', customer_name: '', customer_mobile: '', is_gst_customer: false, customer_gstin: '', is_interstate: false,
  job_card_no: '', vehicle_reg_no: '', narration: '', discount_percent: 0, line_items: [], external_bills: [],
});

const BillForm = forwardRef(({ currentBill, onSaveSuccess, includeGatePass, setIncludeGatePass, theme, inventoryItems = [] }, ref) => {
  const isDark = theme === 'dark';

  const [formData, setFormData] = useState(makeInitialForm);
  const [totals, setTotals] = useState({ subtotal: 0, total_tax: 0, discount_amount: 0, grand_total: 0 });
  const [latestRowIndex, setLatestRowIndex] = useState(null);

  // Keep the current bill number so reset can preserve it
  const currentBillNoRef = useRef('');

  useEffect(() => {
    if (currentBill) {
      const fd = {
        id: currentBill.id,
        bill_no: currentBill.bill_no || '',
        date: currentBill.date ? new Date(currentBill.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        customer_name: currentBill.customer_name || '',
        customer_mobile: currentBill.customer_mobile || '',
        is_gst_customer: !!currentBill.customer_gstin,
        customer_gstin: currentBill.customer_gstin || '',
        is_interstate: currentBill.is_interstate || false,
        job_card_no: currentBill.job_card_no || '',
        vehicle_reg_no: currentBill.vehicle_reg_no || '',
        narration: currentBill.narration || '',
        discount_percent: currentBill.discount_percent || 0,
        line_items: currentBill.line_items || [],
        external_bills: currentBill.external_bills || [],
      };
      currentBillNoRef.current = fd.bill_no;
      setFormData(fd);
      setLatestRowIndex(null);
    } else {
      const loadNextBillNo = async () => {
        try {
          const res = await fetchNextBillNumber();
          currentBillNoRef.current = res.next_bill_no;
          setFormData({ ...makeInitialForm(), bill_no: res.next_bill_no });
        } catch (err) { console.error('Failed to fetch next bill no', err); }
      };
      loadNextBillNo();
    }
  }, [currentBill]);

  useEffect(() => {
    let sub = 0, tax = 0, extTotal = 0;
    formData.line_items.forEach(item => {
      sub += Number(item.taxable_value) || 0;
      tax += (Number(item.cgst_amt) || 0) + (Number(item.sgst_amt) || 0) + (Number(item.igst_amt) || 0);
    });
    formData.external_bills.forEach(ext => { extTotal += Number(ext.amount) || 0; });

    sub = r2(sub); tax = r2(tax); extTotal = r2(extTotal);
    const internalPreDiscount = r2(sub + tax);
    const discountAmt = r2(internalPreDiscount * (Number(formData.discount_percent) || 0) / 100);
    const internalTotal = r2(internalPreDiscount - discountAmt);
    const grandRounded = Math.round(r2(internalTotal + extTotal));

    setTotals({
      subtotal:        sub.toFixed(2),
      total_tax:       tax.toFixed(2),
      discount_amount: discountAmt.toFixed(2),
      grand_total:     grandRounded.toFixed(2),
    });
  }, [formData.line_items, formData.external_bills, formData.discount_percent]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let val;
    if (type === 'checkbox') val = checked;
    else if (name === 'discount_percent') val = value === '' ? 0 : Number(value);
    else val = value;

    setFormData(prev => {
      const next = { ...prev, [name]: val };
      if (name === 'is_gst_customer' && !val) { next.customer_gstin = ''; next.is_interstate = false; }
      return next;
    });
  };

  const addLineItem = () => {
    setFormData(prev => {
      const newItems = [
        ...prev.line_items,
        { item_id: '', name: '', hsn_code: '', qty: 1, custom_rate: 0, tax_rate: 18, taxable_value: 0, cgst_amt: 0, sgst_amt: 0, igst_amt: 0, line_total: 0 },
      ];
      setLatestRowIndex(newItems.length - 1);
      return { ...prev, line_items: newItems };
    });
  };

  const handleItemSelection = (index, dbItemId) => {
    const selectedDbItem = inventoryItems.find(i => String(i.id) === String(dbItemId));
    const newItems = [...formData.line_items];
    const item = newItems[index];

    if (!selectedDbItem) {
      item.item_id = ''; item.name = '';
      setFormData(prev => ({ ...prev, line_items: newItems }));
      return;
    }

    item.item_id = selectedDbItem.id;
    item.name = selectedDbItem.item_name;
    item.hsn_code = selectedDbItem.hsn_sac;
    item.tax_rate = selectedDbItem.inter_state_tax_rate;
    item.custom_rate = selectedDbItem.rate;
    item.qty = 1;

    const taxable = r2(1 * (Number(selectedDbItem.rate) || 0));
    item.taxable_value = taxable;
    const taxes = calculateTaxes(taxable, item.tax_rate, formData.is_interstate);
    item.cgst_amt = taxes.cgst_amt; item.sgst_amt = taxes.sgst_amt; item.igst_amt = taxes.igst_amt;
    item.line_total = r2(taxable + taxes.total_tax).toFixed(2);

    setLatestRowIndex(null);
    setFormData(prev => ({ ...prev, line_items: newItems }));
  };

  const updateLineItem = (index, field, value) => {
    const newItems = [...formData.line_items];
    const item = { ...newItems[index], [field]: value };

    if (field === 'qty' || field === 'custom_rate') {
      const taxable = r2((Number(item.qty) || 0) * (Number(item.custom_rate) || 0));
      item.taxable_value = taxable;
      const taxes = calculateTaxes(taxable, item.tax_rate, formData.is_interstate);
      item.cgst_amt = taxes.cgst_amt; item.sgst_amt = taxes.sgst_amt; item.igst_amt = taxes.igst_amt;
      item.line_total = r2(taxable + taxes.total_tax).toFixed(2);
    } else if (field === 'line_total') {
      const taxable = calculateFromTotal(Number(value) || 0, item.tax_rate);
      item.taxable_value = taxable;
      const taxes = calculateTaxes(taxable, item.tax_rate, formData.is_interstate);
      item.cgst_amt = taxes.cgst_amt; item.sgst_amt = taxes.sgst_amt; item.igst_amt = taxes.igst_amt;
      if (item.qty > 0) item.custom_rate = r2(taxable / item.qty).toFixed(2);
    }

    newItems[index] = item;
    setFormData(prev => ({ ...prev, line_items: newItems }));
  };

  const removeLineItem = (index) => {
    setLatestRowIndex(null);
    setFormData(prev => ({ ...prev, line_items: prev.line_items.filter((_, i) => i !== index) }));
  };

  const addExternalBill = () => {
    setFormData(prev => ({ ...prev, external_bills: [...prev.external_bills, { type_id: 2, name: 'BC Bill', ref_number: '', amount: 0 }] }));
  };

  const updateExternalBill = (index, field, value) => {
    const newExts = [...formData.external_bills];
    newExts[index][field] = value;
    if (field === 'name') newExts[index].type_id = value === 'CSI Bill' ? 1 : 2;
    setFormData(prev => ({ ...prev, external_bills: newExts }));
  };

  const removeExternalBill = (index) => {
    setFormData(prev => ({ ...prev, external_bills: prev.external_bills.filter((_, i) => i !== index) }));
  };

  const buildPayload = (fd, tot) => ({
    ...fd,
    subtotal: tot.subtotal, total_tax: tot.total_tax,
    discount_amount: tot.discount_amount, grand_total: tot.grand_total,
    include_gate_pass: includeGatePass,
  });

  const executeSave = async () => {
    if (formData.line_items.length === 0) throw new Error('NO_ITEMS');
    const payload = buildPayload(formData, totals);
    let savedData;
    if (formData.id) savedData = await updateBill(formData.id, payload);
    else savedData = await createBill(payload);
    const finalBillState = {
      ...payload,
      id: savedData.billId || formData.id,
      bill_no: savedData.billNo || formData.bill_no,
      has_gate_pass: includeGatePass,
    };
    if (onSaveSuccess) onSaveSuccess(finalBillState);
    return finalBillState;
  };

  // Exposed to parent via ref
  useImperativeHandle(ref, () => ({
    triggerSave: executeSave,
    getFormData: () => buildPayload(formData, totals),
    // Reset all fields but keep the current bill number
    resetForm: () => {
      setLatestRowIndex(null);
      setFormData({
        ...makeInitialForm(),
        bill_no: currentBillNoRef.current,
        date: new Date().toISOString().split('T')[0],
      });
    },
  }));

  const handleSave = async () => {
    if (formData.line_items.length === 0) {
      alert('Cannot save to database without internal items. Switch to "Preview" to print a Draft or Gate Pass only.');
      return;
    }
    try { await executeSave(); }
    catch (error) { console.error('Failed to save bill', error); alert('Failed to save invoice.'); }
  };

  /* Style tokens */
  const card        = isDark ? 'bg-gray-800 border border-gray-700 rounded-xl' : 'bg-white border border-gray-200 rounded-xl';
  const sectionLabel = 'text-xs font-semibold uppercase tracking-widest text-gray-400';
  const divider     = isDark ? 'border-gray-700' : 'border-gray-100';
  const fieldLabel  = isDark ? 'block text-xs font-medium text-gray-400 mb-1' : 'block text-xs font-medium text-gray-500 mb-1';
  const input       = isDark
    ? 'w-full bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'
    : 'w-full bg-gray-50 border border-gray-300 text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';
  const tableInput  = isDark
    ? 'w-full min-w-[80px] bg-gray-700 border border-gray-600 text-gray-100 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent'
    : 'w-full min-w-[80px] bg-white border border-gray-200 text-gray-800 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent';
  const accentInput = isDark
    ? 'w-full min-w-[80px] bg-blue-900/30 border border-blue-700 text-blue-300 rounded-md px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-transparent'
    : 'w-full min-w-[80px] bg-blue-50 border border-blue-200 text-blue-700 rounded-md px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-transparent';
  const accentGreenInput = isDark
    ? 'w-full min-w-[80px] bg-emerald-900/30 border border-emerald-700 text-emerald-300 rounded-md px-2 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-transparent'
    : 'w-full min-w-[80px] bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md px-2 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-transparent';
  const thClass     = isDark
    ? 'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 bg-gray-750 border-b border-gray-700'
    : 'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 border-b border-gray-200';
  const trClass     = (idx) => isDark
    ? `border-b border-gray-700 ${idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/60'} hover:bg-gray-700/50 transition-colors`
    : `border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/30 transition-colors`;

  const internalTotal = r2(Number(totals.subtotal) + Number(totals.total_tax) - Number(totals.discount_amount)).toFixed(2);

  return (
    <div className="space-y-5">

      {/* Bill Details */}
      <div className={`${card} overflow-hidden`}>
        <div className={`px-5 py-3 border-b ${divider} flex flex-wrap justify-between items-center gap-3`}>
          <div className="flex items-center gap-3">
            <div className="w-1 h-4 rounded-full bg-blue-500" />
            <span className={sectionLabel}>{formData.id ? 'Edit Bill Details' : 'New Bill'}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border cursor-pointer w-max transition-colors
              ${includeGatePass
                ? (isDark ? 'bg-amber-900/50 border-amber-500 text-amber-300' : 'bg-amber-100 border-amber-400 text-amber-800')
                : (isDark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-700')}`}>
              <input type="checkbox" checked={includeGatePass} onChange={(e) => setIncludeGatePass(e.target.checked)} className="rounded accent-amber-600 w-4 h-4" />
              <span className="text-[11px] font-bold tracking-wide">AUTO-GENERATE GATE PASS</span>
            </label>
            <label className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border cursor-pointer w-max transition-colors
              ${formData.is_gst_customer
                ? (isDark ? 'bg-blue-900/50 border-blue-500 text-blue-300' : 'bg-blue-100 border-blue-400 text-blue-800')
                : (isDark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-700')}`}>
              <input type="checkbox" name="is_gst_customer" checked={formData.is_gst_customer} onChange={handleChange} className="rounded accent-blue-600 w-4 h-4" />
              <span className="text-[11px] font-bold tracking-wide">GST CUSTOMER</span>
            </label>
          </div>
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={fieldLabel}>Bill No</label>
            <input type="text" name="bill_no" value={formData.bill_no} onChange={handleChange}
              className={input} placeholder="VMA/26/..." disabled={!!formData.id} />
          </div>
          <div>
            <label className={fieldLabel}>Date</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} className={input} />
          </div>
          <div>
            <label className={fieldLabel}>Job Card No</label>
            <input type="text" name="job_card_no" value={formData.job_card_no} onChange={handleChange} className={input} />
          </div>
          <div>
            <label className={fieldLabel}>Vehicle Reg No</label>
            <input type="text" name="vehicle_reg_no" value={formData.vehicle_reg_no} onChange={handleChange} className={input} />
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className={`${card} overflow-hidden`}>
        <div className={`px-5 py-3 border-b ${divider} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-1 h-4 rounded-full bg-violet-500" />
            <span className={sectionLabel}>Customer Info</span>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={fieldLabel}>Customer Name</label>
              <input type="text" name="customer_name" value={formData.customer_name} onChange={handleChange} className={input} />
            </div>
            <div>
              <label className={fieldLabel}>Mobile Number</label>
              <input type="text" name="customer_mobile" value={formData.customer_mobile} onChange={handleChange} className={input} placeholder="Optional" />
            </div>
          </div>
          {formData.is_gst_customer && (
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border ${isDark ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <div>
                <label className={fieldLabel}>GSTIN</label>
                <input type="text" name="customer_gstin" value={formData.customer_gstin} onChange={handleChange} className={`${input} uppercase`} placeholder="Enter GST Number" />
              </div>
              <div className="flex items-end pb-2">
                <label className={`flex items-center gap-2 text-sm font-bold cursor-pointer transition ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                  <input type="checkbox" name="is_interstate" checked={formData.is_interstate} onChange={handleChange} className="rounded accent-blue-500 w-4 h-4" />
                  IGST (Interstate)
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Native Line Items */}
      <div className={`${card} overflow-hidden`}>
        <div className={`px-5 py-3 border-b ${divider} flex items-center gap-3`}>
          <div className="w-1 h-4 rounded-full bg-emerald-500" />
          <span className={sectionLabel}>Native Line Items</span>
        </div>
        <div className="overflow-visible">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={thClass} style={{ minWidth: 200 }}>Item</th>
                <th className={thClass} style={{ width: 80 }}>HSN</th>
                <th className={thClass} style={{ width: 80 }}>Qty</th>
                <th className={thClass} style={{ width: 110 }}>Rate (₹)</th>
                <th className={thClass} style={{ width: 80 }}>Tax %</th>
                <th className={thClass} style={{ width: 120 }}>Total (₹)</th>
                <th className={`${thClass} text-center`} style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {formData.line_items.length === 0 && (
                <tr>
                  <td colSpan={7} className={`text-center py-8 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    No items added yet — click below to add one
                  </td>
                </tr>
              )}
              {formData.line_items.map((item, index) => (
                <tr key={index} className={trClass(index)}>
                  <td className="px-3 py-2">
                    <InlineItemSearch
                      value={item.item_id || ''}
                      onChange={(val) => handleItemSelection(index, val)}
                      options={inventoryItems}
                      isDark={isDark}
                      autoFocus={index === latestRowIndex}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" value={item.hsn_code} onChange={(e) => updateLineItem(index, 'hsn_code', e.target.value)} className={tableInput} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={item.qty === 0 ? '' : item.qty}
                      onChange={(e) => updateLineItem(index, 'qty', e.target.value)}
                      onFocus={(e) => e.target.select()} className={tableInput} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={item.custom_rate === 0 ? '' : item.custom_rate}
                      onChange={(e) => updateLineItem(index, 'custom_rate', e.target.value)}
                      onFocus={(e) => e.target.select()} className={accentInput} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={item.tax_rate === 0 ? '' : item.tax_rate}
                      onChange={(e) => updateLineItem(index, 'tax_rate', e.target.value)}
                      onFocus={(e) => e.target.select()} className={tableInput} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={item.line_total === 0 ? '' : item.line_total}
                      onChange={(e) => updateLineItem(index, 'line_total', e.target.value)}
                      onFocus={(e) => e.target.select()} className={accentGreenInput} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => removeLineItem(index)}
                      className={`p-1.5 rounded transition shadow-sm bg-red-100 text-red-700 hover:bg-red-200 ${isDark ? 'dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900/80' : ''}`}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={`px-5 py-3 border-t ${divider}`}>
          <button onClick={addLineItem}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition
              ${isDark
                ? 'text-emerald-400 border-emerald-700 bg-emerald-900/20 hover:bg-emerald-900/40'
                : 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'}`}>
            <Plus size={14} /> Add Item
          </button>
        </div>
      </div>

      {/* External Bills */}
      <div className={`${card} overflow-hidden`}>
        <div className={`px-5 py-3 border-b ${divider} flex items-center gap-3`}>
          <div className="w-1 h-4 rounded-full bg-violet-500" />
          <span className={sectionLabel}>External Bills <span className={`ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>(Pre-taxed)</span></span>
        </div>
        <div className="p-5 space-y-3">
          {formData.external_bills.length === 0 && (
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No external bills attached.</p>
          )}
          {formData.external_bills.map((ext, index) => (
            <div key={index} className={`flex gap-3 items-center p-3 rounded-lg border ${isDark ? 'bg-gray-700/40 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <select value={ext.name} onChange={(e) => updateExternalBill(index, 'name', e.target.value)} className={`${input} max-w-[140px]`}>
                <option value="BC Bill">BC Bill</option>
                <option value="CSI Bill">CSI Bill</option>
              </select>
              <input type="text" placeholder="Reference number" value={ext.ref_number}
                onChange={(e) => updateExternalBill(index, 'ref_number', e.target.value)} className={`${input} flex-1`} />
              <input type="number" placeholder="Amount" value={ext.amount === 0 ? '' : ext.amount}
                onChange={(e) => updateExternalBill(index, 'amount', e.target.value)}
                onFocus={(e) => e.target.select()}
                className={`${isDark
                  ? 'bg-violet-900/30 border border-violet-700 text-violet-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500'
                  : 'bg-violet-50 border border-violet-200 text-violet-700 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-400'} w-32`} />
              <button onClick={() => removeExternalBill(index)}
                className={`p-1.5 rounded transition shadow-sm bg-red-100 text-red-700 hover:bg-red-200 ${isDark ? 'dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900/80' : ''}`}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button onClick={addExternalBill}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition mt-1
              ${isDark
                ? 'text-violet-400 border-violet-700 bg-violet-900/20 hover:bg-violet-900/40'
                : 'text-violet-600 border-violet-200 bg-violet-50 hover:bg-violet-100'}`}>
            <FilePlus2 size={14} /> Add External Bill
          </button>
        </div>
      </div>

      {/* Footer: Narration + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className={`${card} overflow-hidden`}>
          <div className={`px-5 py-3 border-b ${divider} flex items-center gap-3`}>
            <div className="w-1 h-4 rounded-full bg-amber-500" />
            <span className={sectionLabel}>Narration &amp; Discount</span>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className={fieldLabel}>Remarks / Narration</label>
              <textarea name="narration" value={formData.narration} onChange={handleChange} rows={4}
                className={`${input} resize-none`} placeholder="Add specific bill details here..." />
            </div>
            <div>
              <label className={fieldLabel}>Discount on Total (%)</label>
              <input type="number" name="discount_percent"
                value={formData.discount_percent === 0 ? '' : formData.discount_percent}
                onChange={handleChange} onFocus={(e) => e.target.select()}
                className={`${input} max-w-[120px]`} />
            </div>
          </div>
        </div>

        <div className={`${card} overflow-hidden flex flex-col`}>
          <div className={`px-5 py-3 border-b ${divider} flex items-center gap-3`}>
            <div className="w-1 h-4 rounded-full bg-blue-500" />
            <span className={sectionLabel}>Bill Summary</span>
          </div>
          <div className="p-5 flex-1">
            <div className="space-y-2.5 text-sm">
              <div className={`flex justify-between ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <span>Taxable Total</span><span className="font-medium tabular-nums">₹{totals.subtotal}</span>
              </div>
              <div className={`flex justify-between ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <span>Total GST</span><span className="font-medium tabular-nums">₹{totals.total_tax}</span>
              </div>
              {Number(totals.discount_amount) > 0 && (
                <div className={`flex justify-between font-semibold ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                  <span>Discount ({formData.discount_percent}%)</span>
                  <span className="tabular-nums">− ₹{totals.discount_amount}</span>
                </div>
              )}
              <div className={`mt-2 pt-2 border-t ${divider} flex justify-between font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                <span>TOTAL</span><span className="tabular-nums">₹{internalTotal}</span>
              </div>
              {formData.external_bills.map((ext, idx) => (
                <div key={idx} className={`flex justify-between mt-2 ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                  <span>{ext.name || 'External Bill'}</span>
                  <span className="font-medium tabular-nums">+ ₹{Number(ext.amount || 0).toFixed(2)}</span>
                </div>
              ))}
              <div className={`mt-3 pt-3 border-t ${divider} flex justify-between items-center`}>
                <span className={`text-base font-bold uppercase tracking-wide ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Grand Total</span>
                <span className={`text-2xl font-black tabular-nums ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>₹{totals.grand_total}</span>
              </div>
            </div>
          </div>
          <div className={`px-5 py-4 border-t ${divider}`}>
            <button onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition
                bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-sm shadow-blue-500/20">
              <Save size={16} />
              {formData.id ? 'Update Invoice' : 'Save Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

BillForm.displayName = 'BillForm';
export default BillForm;