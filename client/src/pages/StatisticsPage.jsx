import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, IndianRupee, Layers, Download,
  Trash2, ClipboardList, Search, ChevronLeft, ChevronRight,
  RefreshCcw, Lock, FileText, X, Calendar,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { fetchDashboardStats, fetchAuditLogs, fetchSalesByItem } from '../api/statistics';
import { fetchBills } from '../api/bills';
import BulkDeleteModal from '../components/history/BulkDeleteModal';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmt    = n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtQty = n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─────────────────────────────────────────────────────────────────────────────
// PDF export — matches sample PDF layout exactly
// ─────────────────────────────────────────────────────────────────────────────

const printSalesByItemPdf = (reportData, dateLabel, companyName = 'VALUE MOTOR AGENCY PVT LTD') => {
  const { rows, totals } = reportData;
  const navy = '#1a3a6b';
  const light = '#f7f9fc';

  const tableRows = rows.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : light}">
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;font-family:sans-serif">${r.item_name}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;text-align:right;font-family:sans-serif">${fmtQty(r.quantity_sold)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;text-align:right;font-family:sans-serif">&#x20B9;${fmt(r.amount)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;text-align:right;font-family:sans-serif">&#x20B9;${fmt(r.average_price)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Sales by Item</title>
  <style>
    @page{size:A4 portrait;margin:14mm 14mm 10mm}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-family:sans-serif;font-size:12px;color:#111;margin:0;padding:0}
    table{width:100%;border-collapse:collapse}
  </style></head><body>
  <div style="text-align:right;margin-bottom:6px">
    <div style="font-size:15px;font-weight:900;text-transform:uppercase;color:${navy};letter-spacing:.03em;font-family:sans-serif">${companyName}</div>
  </div>
  <div style="border-top:2px solid ${navy};border-bottom:2px solid ${navy};padding:5px 0;text-align:center;margin-bottom:14px">
    <div style="font-size:13px;font-weight:800;color:${navy};letter-spacing:.1em;text-transform:uppercase;font-family:sans-serif">Sales by Item</div>
    <div style="font-size:10px;color:#555;margin-top:3px;font-family:sans-serif">${dateLabel}</div>
  </div>
  <table>
    <thead>
      <tr style="background:${navy}">
        <th style="padding:7px 10px;color:#fff;font-size:9px;text-align:left;text-transform:uppercase;letter-spacing:.06em;font-family:sans-serif">Item Name</th>
        <th style="padding:7px 10px;color:#fff;font-size:9px;text-align:right;text-transform:uppercase;letter-spacing:.06em;font-family:sans-serif">Quantity Sold</th>
        <th style="padding:7px 10px;color:#fff;font-size:9px;text-align:right;text-transform:uppercase;letter-spacing:.06em;font-family:sans-serif">Amount</th>
        <th style="padding:7px 10px;color:#fff;font-size:9px;text-align:right;text-transform:uppercase;letter-spacing:.06em;font-family:sans-serif">Average Price</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr style="border-top:2px solid ${navy}">
        <td style="padding:8px 10px;font-weight:800;font-size:11.5px;text-transform:uppercase;color:${navy};font-family:sans-serif">TOTAL</td>
        <td style="padding:8px 10px;font-weight:800;font-size:11.5px;text-align:right;color:${navy};font-family:sans-serif">${fmtQty(totals.total_qty)}</td>
        <td style="padding:8px 10px;font-weight:800;font-size:11.5px;text-align:right;color:${navy};font-family:sans-serif">&#x20B9;${fmt(totals.total_amount)}</td>
        <td style="padding:8px 10px"></td>
      </tr>
    </tbody>
  </table>
  </body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;opacity:0;pointer-events:none';
  document.body.appendChild(iframe);
  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 2500);
  }, 350);
};

// ─────────────────────────────────────────────────────────────────────────────
// Horizontal bar chart
// ─────────────────────────────────────────────────────────────────────────────

const BAR_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#6366f1'];

const SalesByItemChart = ({ rows, isDark }) => {
  if (!rows?.length) return null;
  const maxQty = Math.max(...rows.map(r => Number(r.quantity_sold)));
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => {
        const pct   = maxQty > 0 ? (Number(r.quantity_sold) / maxQty) * 100 : 0;
        const color = BAR_COLORS[i % BAR_COLORS.length];
        return (
          <div key={i} className="flex items-center gap-3 min-w-0">
            <div
              className={`text-xs font-medium shrink-0 truncate ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
              style={{ width: 160 }}
              title={r.item_name}
            >
              {r.item_name}
            </div>
            <div
              className="relative flex-1 h-6 rounded-md overflow-hidden"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#eef2ff' }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-md transition-all duration-700 ease-out"
                style={{ width: `${Math.max(pct, 2)}%`, background: color, opacity: 0.82 }}
              />
              <span className="absolute inset-0 flex items-center pl-2.5 text-[10px] font-bold text-white" style={{ mixBlendMode: 'plus-lighter' }}>
                {fmtQty(r.quantity_sold)} units
              </span>
            </div>
            <div
              className={`text-xs font-bold tabular-nums shrink-0 text-right ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}
              style={{ width: 90 }}
            >
              ₹{fmt(r.amount)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────

const Pagination = ({ page, totalPages, onGoTo, isDark }) => {
  if (totalPages <= 1) return null;
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const nums = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const s = new Set([1, totalPages, page, page - 1, page + 1].filter(p => p >= 1 && p <= totalPages));
    return [...s].sort((a, b) => a - b);
  })();
  const navBtn = (disabled, onClick, child) => (
    <button onClick={onClick} disabled={disabled}
      className={`p-1.5 rounded-lg border flex items-center transition
        ${disabled
          ? isDark ? 'border-gray-700 text-gray-600 cursor-not-allowed' : 'border-gray-100 text-gray-300 cursor-not-allowed'
          : isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
      {child}
    </button>
  );
  return (
    <div className={`flex items-center justify-between gap-1 pt-3 mt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      {navBtn(!canPrev, () => onGoTo(page - 1), <ChevronLeft size={14} />)}
      <div className="flex items-center gap-1">
        {nums.map((p, i) => {
          const showDot = nums[i - 1] !== undefined && p - nums[i - 1] > 1;
          return (
            <React.Fragment key={p}>
              {showDot && <span className={`text-xs px-0.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>…</span>}
              <button onClick={() => onGoTo(p)}
                className={`min-w-[26px] h-[26px] rounded-md text-xs font-bold border transition
                  ${p === page ? 'bg-blue-600 border-blue-600 text-white'
                    : isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                {p}
              </button>
            </React.Fragment>
          );
        })}
      </div>
      {navBtn(!canNext, () => onGoTo(page + 1), <ChevronRight size={14} />)}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Audit log badge colours
// ─────────────────────────────────────────────────────────────────────────────

const actionColor = action => {
  if (action.includes('DELETE')) return { bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-600 dark:text-red-400' };
  if (action.includes('IMPORT')) return { bg: 'bg-blue-100 dark:bg-blue-900/30',  text: 'text-blue-600 dark:text-blue-400' };
  if (action.includes('ADJUST')) return { bg: 'bg-amber-100 dark:bg-amber-900/30',text: 'text-amber-600 dark:text-amber-400' };
  if (action.includes('USER'))   return { bg: 'bg-purple-100 dark:bg-purple-900/30',text: 'text-purple-600 dark:text-purple-400' };
  return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400' };
};

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

const StatisticsPage = ({ theme }) => {
  const isDark = theme === 'dark';
  const { isAdmin } = useAuth();

  // ── Unified period — one selector drives EVERYTHING ───────────────────────
  const [period,     setPeriod]     = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');

  // ── Data ──────────────────────────────────────────────────────────────────
  const [stats,     setStats]     = useState(null);
  const [statsLoad, setStatsLoad] = useState(true);
  const [sbiData,   setSbiData]   = useState(null);
  const [sbiLoad,   setSbiLoad]   = useState(false);
  const [sbiExport, setSbiExport] = useState(false);

  // ── Bill export dropdown ──────────────────────────────────────────────────
  const [showExport, setShowExport] = useState(false);
  const [expFrom,    setExpFrom]    = useState('');
  const [expTo,      setExpTo]      = useState('');
  const [exporting,  setExporting]  = useState(false);

  // ── Bulk delete ───────────────────────────────────────────────────────────
  const [bulkOpen, setBulkOpen] = useState(false);

  // ── Audit log ─────────────────────────────────────────────────────────────
  const [auditLogs,       setAuditLogs]       = useState([]);
  const [auditTotal,      setAuditTotal]      = useState(0);
  const [auditPage,       setAuditPage]       = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditSearch,     setAuditSearch]     = useState('');
  const [auditLoad,       setAuditLoad]       = useState(false);
  const AUDIT_LIMIT = 15;

  // ── Build query params for the current period ─────────────────────────────
  const buildSbiParams = useCallback(() => {
    if (period === 'custom') {
      if (!customFrom || !customTo) return null;
      return { fromDate: customFrom, toDate: customTo };
    }
    return { period };
  }, [period, customFrom, customTo]);

  // ── Load dashboard + SBI in parallel ─────────────────────────────────────
  const loadAll = useCallback(async () => {
    const sbiParams = buildSbiParams();
    if (!sbiParams) return; // custom with incomplete dates

    setStatsLoad(true);
    setSbiLoad(true);

    // Dashboard summary uses named periods (day/week/month); custom falls back to month for headline numbers
    const summaryPeriod = period === 'custom' ? 'month' : period;

    const [summaryRes, sbiRes] = await Promise.allSettled([
      fetchDashboardStats(summaryPeriod),
      fetchSalesByItem(sbiParams),
    ]);

    if (summaryRes.status === 'fulfilled') setStats(summaryRes.value);
    setStatsLoad(false);

    if (sbiRes.status === 'fulfilled') setSbiData(sbiRes.value);
    setSbiLoad(false);
  }, [buildSbiParams, period]);

  useEffect(() => {
    if (period !== 'custom') loadAll();
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Audit log ─────────────────────────────────────────────────────────────
  const loadAuditLogs = useCallback(async (pg = 1, search = '') => {
    if (!isAdmin) return;
    setAuditLoad(true);
    try {
      const r = await fetchAuditLogs({ page: pg, limit: AUDIT_LIMIT, search });
      setAuditLogs(r.logs);
      setAuditTotal(r.total);
      setAuditPage(r.page);
      setAuditTotalPages(r.totalPages);
    } catch { /* silent */ }
    setAuditLoad(false);
  }, [isAdmin]);

  useEffect(() => { if (isAdmin) loadAuditLogs(1, ''); }, [loadAuditLogs, isAdmin]);

  const handleAuditSearch = e => {
    const v = e.target.value;
    setAuditSearch(v);
    if (v.length === 0 || v.length > 2) loadAuditLogs(1, v);
  };

  // ── Bill Excel export (two-sheet) ─────────────────────────────────────────
  const doExportBills = async () => {
    setExporting(true);
    try {
      const bills = await fetchBills(expFrom && expTo ? { fromDate: expFrom, toDate: expTo } : {});
      if (!bills?.length) { alert('No bills found.'); setExporting(false); return; }

      const summaryRows = bills.map(b => ({
        'Invoice No':      b.bill_no,
        'Date':            new Date(b.date).toLocaleDateString('en-IN'),
        'Customer Name':   b.customer_name,
        'Mobile':          b.customer_mobile || '',
        'Vehicle Reg No':  b.vehicle_reg_no  || '',
        'GSTIN':           b.customer_gstin  || '',
        'Job Card No':     b.job_card_no     || '',
        'Taxable (₹)':     Number(b.subtotal),
        'GST (₹)':         Number(b.total_tax),
        'Discount (₹)':    Number(b.discount_amount),
        'Grand Total (₹)': Number(b.grand_total),
        'Status':          b.status,
      }));

      const lineRows = [];
      bills.forEach(b => {
        const items = b.line_items || [];
        if (!items.length) {
          lineRows.push({ 'Invoice No': b.bill_no, 'Date': new Date(b.date).toLocaleDateString('en-IN'), 'Customer Name': b.customer_name, 'Item Name': '(no items)' });
        } else {
          items.forEach(item => lineRows.push({
            'Invoice No':        b.bill_no,
            'Date':              new Date(b.date).toLocaleDateString('en-IN'),
            'Customer Name':     b.customer_name,
            'Vehicle Reg No':    b.vehicle_reg_no || '',
            'Item Name':         item.name,
            'HSN/SAC':           item.hsn_code || '',
            'Qty':               Number(item.qty),
            'Rate (₹)':          Number(item.custom_rate),
            'Tax %':             Number(item.tax_rate),
            'Taxable Value (₹)': Number(item.taxable_value),
            'CGST (₹)':          Number(item.cgst_amt),
            'SGST (₹)':          Number(item.sgst_amt),
            'IGST (₹)':          Number(item.igst_amt),
            'Line Total (₹)':    Number(item.line_total),
          }));
        }
      });

      const aw = rows => rows.length === 0 ? [] : Object.keys(rows[0]).map(k => ({
        wch: Math.max(k.length, ...rows.map(r => String(r[k] ?? '').length)) + 2
      }));

      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(summaryRows); ws1['!cols'] = aw(summaryRows);
      const ws2 = XLSX.utils.json_to_sheet(lineRows);    ws2['!cols'] = aw(lineRows);
      XLSX.utils.book_append_sheet(wb, ws1, 'Invoice Summary');
      XLSX.utils.book_append_sheet(wb, ws2, 'Line Items');
      const suf = expFrom && expTo ? `_${expFrom}_to_${expTo}` : `_all_${new Date().toISOString().split('T')[0]}`;
      XLSX.writeFile(wb, `VMA_Invoices${suf}.xlsx`);
      setShowExport(false); setExpFrom(''); setExpTo('');
    } catch { alert('Export failed.'); }
    setExporting(false);
  };

  // ── Sales by Item exports ─────────────────────────────────────────────────
  const doSbiExcel = () => {
    if (!sbiData?.rows?.length) { alert('No data to export.'); return; }
    setSbiExport(true);
    const rows = [
      ...sbiData.rows.map(r => ({
        'Item Name':         r.item_name,
        'Quantity Sold':     Number(r.quantity_sold),
        'Amount (₹)':        Number(r.amount),
        'Average Price (₹)': Number(r.average_price),
      })),
      { 'Item Name': 'TOTAL', 'Quantity Sold': Number(sbiData.totals.total_qty), 'Amount (₹)': Number(sbiData.totals.total_amount), 'Average Price (₹)': '' },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 40 }, { wch: 16 }, { wch: 16 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales by Item');
    XLSX.writeFile(wb, `VMA_Sales_by_Item_${sbiData.startDate}_to_${sbiData.endDate}.xlsx`);
    setSbiExport(false);
  };

  const doSbiPdf = () => {
    if (!sbiData?.rows?.length) { alert('No data to export.'); return; }
    const label = `From ${new Date(sbiData.startDate + 'T00:00:00').toLocaleDateString('en-IN')} To ${new Date(sbiData.endDate + 'T00:00:00').toLocaleDateString('en-IN')}`;
    printSalesByItemPdf(sbiData, label);
  };

  // ── Style tokens ──────────────────────────────────────────────────────────
  const card = isDark
    ? 'bg-gray-800 border border-gray-700 rounded-xl'
    : 'bg-white border border-gray-200 rounded-xl';

  const inputCls = isDark
    ? 'bg-gray-700 border border-gray-600 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 transition'
    : 'bg-white border border-gray-300 text-gray-800 text-xs rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 transition';

  const thCls = isDark ? 'bg-gray-700/60 text-gray-400' : 'bg-gray-50 text-gray-500';

  // ── Derived display label ─────────────────────────────────────────────────
  const sbiLabel = sbiData
    ? `${new Date(sbiData.startDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} — ${new Date(sbiData.endDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
    : '';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">

        {/* ══ Header ═══════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h2 className={`text-xl font-black uppercase tracking-wide flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            <BarChart3 size={20} className="text-blue-500" /> Analytics
          </h2>

          <div className="flex items-center gap-2 flex-wrap">

            {/* Export Bills — small quiet button → dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExport(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition
                  ${showExport
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : isDark ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                <Download size={13} /> Export Bills
              </button>

              {showExport && (
                <div className={`absolute right-0 top-full mt-2 z-40 w-72 rounded-xl border shadow-2xl p-4
                  ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <p className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                      <Calendar size={12} /> Export to Excel
                    </p>
                    <button onClick={() => setShowExport(false)} className={`${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                      <X size={13} />
                    </button>
                  </div>
                  <p className={`text-[10px] mb-3 leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Two sheets — Invoice Summary and Line Items with customer names. Leave blank for all bills.
                  </p>
                  <div className="space-y-2 mb-3">
                    <div>
                      <label className={`block text-[10px] font-semibold mb-1 uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>From</label>
                      <input type="date" value={expFrom} onChange={e => setExpFrom(e.target.value)} className={inputCls + ' w-full'} />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-semibold mb-1 uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>To</label>
                      <input type="date" value={expTo} onChange={e => setExpTo(e.target.value)} className={inputCls + ' w-full'} />
                    </div>
                  </div>
                  <button
                    onClick={doExportBills}
                    disabled={exporting}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition">
                    <Download size={12} />{exporting ? 'Exporting…' : 'Download Excel'}
                  </button>
                </div>
              )}
            </div>

            {/* Bulk delete — admin only */}
            {isAdmin && (
              <button
                onClick={() => setBulkOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition
                  ${isDark ? 'border-red-800/60 text-red-400 bg-red-900/20 hover:bg-red-900/40' : 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'}`}>
                <Trash2 size={13} /> Bulk Delete
              </button>
            )}
          </div>
        </div>

        {/* ══ Unified period selector ══════════════════════════════════════ */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex p-1 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            {[['day','Today'],['week','This Week'],['month','This Month'],['custom','Custom']].map(([id, label]) => (
              <button key={id} onClick={() => setPeriod(id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all
                  ${period === id
                    ? 'bg-blue-600 text-white shadow'
                    : isDark ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' : 'text-gray-500 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className={inputCls} />
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>to</span>
              <input type="date" value={customTo}   onChange={e => setCustomTo(e.target.value)}   className={inputCls} />
              <button
                onClick={loadAll}
                disabled={!customFrom || !customTo}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition">
                Apply
              </button>
            </>
          )}
        </div>

        {/* ══ Summary stat cards ═══════════════════════════════════════════ */}
        {statsLoad ? (
          <div className={`${card} p-8 text-center text-sm font-bold opacity-40 animate-pulse`}>Loading…</div>
        ) : stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Revenue */}
            <div className={`${card} p-5 relative overflow-hidden group shadow-sm`}>
              <div className={`absolute -right-4 -top-4 opacity-[0.07] group-hover:scale-110 transition-transform duration-500 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`}>
                <IndianRupee size={100} />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total Revenue</p>
                <p className={`text-2xl font-black mb-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  ₹{Number(stats.summary?.total_revenue || 0).toLocaleString('en-IN')}
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Active bills only</p>
              </div>
            </div>

            {/* Bill count */}
            <div className={`${card} p-5 relative overflow-hidden group shadow-sm`}>
              <div className={`absolute -right-4 -top-4 opacity-[0.07] group-hover:scale-110 transition-transform duration-500 ${isDark ? 'text-blue-400' : 'text-blue-500'}`}>
                <TrendingUp size={100} />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Bills Generated</p>
                <p className={`text-2xl font-black mb-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  {stats.summary?.total_bills || 0}
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Excluding cancelled</p>
              </div>
            </div>

            {/* External bills */}
            <div className={`${card} p-5 shadow-sm`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                <Layers size={12} /> External Bills
              </p>
              {!stats.externalBreakdown?.length ? (
                <p className={`text-sm font-semibold opacity-40 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>None recorded.</p>
              ) : stats.externalBreakdown.map((ext, i) => (
                <div key={i} className={`flex justify-between items-center py-2 border-b last:border-0 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <div>
                    <p className={`text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{ext.name}</p>
                    <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{ext.count} entries</p>
                  </div>
                  <p className={`font-black text-sm tabular-nums ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    ₹{Number(ext.total_amount).toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ Sales by Item — the one and only item report ═════════════════ */}
        <div className={`${card} shadow-sm overflow-hidden`}>

          {/* Card header */}
          <div className={`flex flex-wrap justify-between items-center gap-3 px-5 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div>
              <p className={`text-sm font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Sales by Item</p>
              {sbiLabel && (
                <p className={`text-[10px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{sbiLabel}</p>
              )}
            </div>
            {sbiData?.rows?.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={doSbiExcel}
                  disabled={sbiExport}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition disabled:opacity-50
                    ${isDark ? 'border-emerald-700 text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/40' : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}`}>
                  <Download size={12} /> Excel
                </button>
                <button
                  onClick={doSbiPdf}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition
                    ${isDark ? 'border-red-800 text-red-400 bg-red-900/20 hover:bg-red-900/40' : 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'}`}>
                  <FileText size={12} /> PDF
                </button>
                <button
                  onClick={loadAll}
                  title="Refresh"
                  className={`p-1.5 rounded-lg border transition ${isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  <RefreshCcw size={12} className={sbiLoad ? 'animate-spin' : ''} />
                </button>
              </div>
            )}
          </div>

          {/* Card body */}
          <div className="p-5">
            {sbiLoad ? (
              <div className="py-12 text-center text-sm font-bold opacity-40 animate-pulse">Loading…</div>
            ) : !sbiData || sbiData.rows.length === 0 ? (
              <div className="py-12 text-center text-sm opacity-40 font-bold">
                {period === 'custom' && (!customFrom || !customTo)
                  ? 'Select a date range above and click Apply.'
                  : 'No items sold in this period.'}
              </div>
            ) : (
              <div className="space-y-6">

                {/* Bar chart */}
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-gray-700/25 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <SalesByItemChart rows={sbiData.rows} isDark={isDark} />
                </div>

                {/* Data table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className={`text-[10px] uppercase font-semibold tracking-wider ${thCls}`}>
                        <th className="px-4 py-2.5 text-left rounded-l-lg">Item Name</th>
                        <th className="px-4 py-2.5 text-right">Qty Sold</th>
                        <th className="px-4 py-2.5 text-right">Amount</th>
                        <th className="px-4 py-2.5 text-right rounded-r-lg">Avg Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sbiData.rows.map((r, i) => (
                        <tr key={i} className={`border-b transition-colors
                          ${isDark ? 'border-gray-700/60 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-blue-50/25'}`}>
                          <td className={`px-4 py-3 font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{r.item_name}</td>
                          <td className={`px-4 py-3 text-right tabular-nums font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            {fmtQty(r.quantity_sold)}
                          </td>
                          <td className={`px-4 py-3 text-right tabular-nums font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            ₹{fmt(r.amount)}
                          </td>
                          <td className={`px-4 py-3 text-right tabular-nums ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            ₹{fmt(r.average_price)}
                          </td>
                        </tr>
                      ))}

                      {/* Totals row */}
                      <tr className={`border-t-2 ${isDark ? 'border-gray-500' : 'border-gray-300'}`}>
                        <td className={`px-4 py-3 font-black text-xs uppercase tracking-wide ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                          Total
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums font-black text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                          {fmtQty(sbiData.totals.total_qty)}
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums font-black text-xs ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                          ₹{fmt(sbiData.totals.total_amount)}
                        </td>
                        <td className="px-4 py-3" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══ Audit Log ════════════════════════════════════════════════════ */}
        {isAdmin ? (
          <div className={`${card} shadow-sm`}>
            <div className={`flex flex-wrap justify-between items-center gap-3 px-5 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <p className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <ClipboardList size={14} /> Audit Log
                {auditTotal > 0 && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    {auditTotal.toLocaleString()}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={12} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    placeholder="Search…"
                    value={auditSearch}
                    onChange={handleAuditSearch}
                    className={`pl-7 pr-3 py-1.5 rounded-lg border text-xs outline-none focus:ring-1 focus:ring-blue-500 w-40
                      ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                  />
                </div>
                <button onClick={() => loadAuditLogs(auditPage, auditSearch)} disabled={auditLoad}
                  className={`p-1.5 rounded-lg border transition ${isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  <RefreshCcw size={12} className={auditLoad ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            <div className="p-5">
              {auditLoad && !auditLogs.length ? (
                <div className="py-10 text-center text-sm opacity-40 animate-pulse font-bold">Loading…</div>
              ) : !auditLogs.length ? (
                <div className="py-10 text-center text-sm opacity-40 font-bold">No audit logs found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={`text-[10px] uppercase ${thCls}`}>
                      <tr>
                        <th className="px-3 py-2 text-left rounded-l-lg">Action</th>
                        <th className="px-3 py-2 text-left">Details</th>
                        <th className="px-3 py-2 text-right rounded-r-lg">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map(log => {
                        const c = actionColor(log.action);
                        return (
                          <tr key={log.id} className={`border-b transition-colors ${isDark ? 'border-gray-700/50 hover:bg-gray-700/25' : 'border-gray-100 hover:bg-gray-50/60'}`}>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${c.bg} ${c.text}`}>
                                {log.action.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className={`px-3 py-2.5 text-xs max-w-xs truncate ${isDark ? 'text-gray-300' : 'text-gray-600'}`} title={log.details}>
                              {log.details || '—'}
                            </td>
                            <td className={`px-3 py-2.5 text-xs text-right whitespace-nowrap tabular-nums ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              {new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination page={auditPage} totalPages={auditTotalPages} onGoTo={p => loadAuditLogs(p, auditSearch)} isDark={isDark} />
            </div>
          </div>
        ) : (
          <div className={`${card} p-5 flex items-center gap-3 opacity-50`}>
            <Lock size={16} />
            <p className="text-sm font-bold text-gray-500">Audit Log — Admin Only</p>
          </div>
        )}

      </div>

      {isAdmin && (
        <BulkDeleteModal
          isOpen={bulkOpen}
          onClose={() => setBulkOpen(false)}
          onSuccess={() => { loadAll(); loadAuditLogs(1, auditSearch); }}
        />
      )}
    </div>
  );
};

export default StatisticsPage;