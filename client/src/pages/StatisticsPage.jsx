import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, IndianRupee, Layers, Download, Calendar, X, Trash2, ClipboardList, Search, ChevronLeft, ChevronRight, RefreshCcw, Lock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { fetchDashboardStats, fetchAuditLogs } from '../api/statistics';
import { fetchBills } from '../api/bills';
import BulkDeleteModal from '../components/history/BulkDeleteModal';
import { useAuth } from '../context/AuthContext';

// ── Pagination ────────────────────────────────────────────────────────────────
const Pagination = ({ page, totalPages, onGoTo, isDark }) => {
  if (totalPages <= 1) return null;
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const pageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = new Set([1, totalPages, page, page - 1, page + 1].filter(p => p >= 1 && p <= totalPages));
    return Array.from(pages).sort((a, b) => a - b);
  };
  const nums = pageNumbers();
  return (
    <div className={`flex items-center justify-between gap-1 pt-3 mt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      <button onClick={() => onGoTo(page - 1)} disabled={!canPrev}
        className={`p-1.5 rounded-lg border transition flex items-center ${canPrev ? (isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100') : (isDark ? 'border-gray-700 text-gray-600 cursor-not-allowed' : 'border-gray-100 text-gray-300 cursor-not-allowed')}`}>
        <ChevronLeft size={14} />
      </button>
      <div className="flex items-center gap-1">
        {nums.map((p, i) => {
          const prev = nums[i - 1];
          const showEllipsis = prev !== undefined && p - prev > 1;
          return (
            <React.Fragment key={p}>
              {showEllipsis && <span className={`text-xs px-0.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>…</span>}
              <button onClick={() => onGoTo(p)}
                className={`min-w-[26px] h-[26px] rounded-md text-xs font-bold border transition ${p === page ? 'bg-blue-600 border-blue-600 text-white' : (isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-gray-200' : 'border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700')}`}>
                {p}
              </button>
            </React.Fragment>
          );
        })}
      </div>
      <button onClick={() => onGoTo(page + 1)} disabled={!canNext}
        className={`p-1.5 rounded-lg border transition flex items-center ${canNext ? (isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100') : (isDark ? 'border-gray-700 text-gray-600 cursor-not-allowed' : 'border-gray-100 text-gray-300 cursor-not-allowed')}`}>
        <ChevronRight size={14} />
      </button>
    </div>
  );
};

const actionColor = (action = '') => {
  if (action.includes('DELETE')) return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' };
  if (action.includes('IMPORT')) return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' };
  if (action.includes('ADJUST')) return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' };
  if (action.includes('USER'))   return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' };
  return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400' };
};

// ── Main page ─────────────────────────────────────────────────────────────────
const StatisticsPage = ({ theme }) => {
  const isDark = theme === 'dark';
  const { isAdmin } = useAuth();

  const [period, setPeriod] = useState('day');
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Audit logs (admin only)
  const [auditLogs, setAuditLogs]         = useState([]);
  const [auditTotal, setAuditTotal]       = useState(0);
  const [auditPage, setAuditPage]         = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditSearch, setAuditSearch]     = useState('');
  const [auditLoading, setAuditLoading]   = useState(false);
  const AUDIT_PAGE_SIZE = 15;

  useEffect(() => { loadStats(); }, [period]);

  const loadStats = async () => {
    setIsLoading(true);
    try { setStats(await fetchDashboardStats(period)); }
    catch (error) { console.error('Failed to load stats', error); }
    setIsLoading(false);
  };

  const loadAuditLogs = useCallback(async (page = 1, search = '') => {
    if (!isAdmin) return;
    setAuditLoading(true);
    try {
      const result = await fetchAuditLogs({ page, limit: AUDIT_PAGE_SIZE, search });
      setAuditLogs(result.logs);
      setAuditTotal(result.total);
      setAuditPage(result.page);
      setAuditTotalPages(result.totalPages);
    } catch (err) { console.error('Failed to load audit logs', err); }
    setAuditLoading(false);
  }, [isAdmin]);

  useEffect(() => { if (isAdmin) loadAuditLogs(1, ''); }, [loadAuditLogs, isAdmin]);

  const handleAuditSearch = (e) => {
    const val = e.target.value;
    setAuditSearch(val);
    if (val.length === 0 || val.length > 2) { setAuditPage(1); loadAuditLogs(1, val); }
  };

  const handleAuditPageChange = (p) => {
    const safe = Math.max(1, Math.min(p, auditTotalPages));
    loadAuditLogs(safe, auditSearch);
  };

  const executeExport = async () => {
    setIsExporting(true);
    try {
      const dataToExport = exportFrom && exportTo
        ? await fetchBills({ fromDate: exportFrom, toDate: exportTo })
        : await fetchBills({});

      if (!dataToExport?.length) { alert('No bills found in the selected date range.'); setIsExporting(false); return; }

      const excelData = dataToExport.map(b => ({
        'Invoice No': b.bill_no, 'Date': new Date(b.date).toLocaleDateString('en-IN'),
        'Customer Name': b.customer_name, 'GSTIN': b.customer_gstin || 'N/A',
        'Vehicle Reg No': b.vehicle_reg_no || 'N/A',
        'Taxable Subtotal (₹)': Number(b.subtotal), 'Total Tax (₹)': Number(b.total_tax),
        'Discount (₹)': Number(b.discount_amount), 'Grand Total (₹)': Number(b.grand_total),
        'Status': b.status,
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      worksheet['!cols'] = Object.keys(excelData[0]).map(key => ({ wch: Math.max(key.length, ...excelData.map(row => String(row[key] ?? '').length)) + 2 }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices');
      const dateSuffix = exportFrom && exportTo ? `_${exportFrom}_to_${exportTo}` : `_all_${new Date().toISOString().split('T')[0]}`;
      XLSX.writeFile(workbook, `VMA_Invoices_Export${dateSuffix}.xlsx`);
      setShowExportPanel(false); setExportFrom(''); setExportTo('');
    } catch (err) {
      console.error('Export failed', err);
      alert('Export failed. Please try again.');
    } finally { setIsExporting(false); }
  };

  const card = isDark ? 'bg-gray-800 border border-gray-700 rounded-xl' : 'bg-white border border-gray-200 rounded-xl';
  const inputClass = isDark
    ? 'flex-1 px-2 py-1.5 rounded border outline-none bg-gray-700 border-gray-600 text-white text-xs'
    : 'flex-1 px-2 py-1.5 rounded border outline-none bg-white border-gray-300 text-gray-800 text-xs';

  const StatCard = ({ title, value, subtitle, icon: Icon, color }) => {
    const colorClasses = { green: isDark ? 'text-green-400' : 'text-green-600', blue: isDark ? 'text-blue-400' : 'text-blue-600' };
    return (
      <div className={`${card} p-6 relative overflow-hidden group shadow-sm`}>
        <div className={`absolute -right-6 -top-6 opacity-10 group-hover:scale-110 transition-transform duration-500 ${colorClasses[color] || 'text-gray-400'}`}><Icon size={120} /></div>
        <div className="relative z-10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{title}</h3>
          <div className={`text-3xl font-black mb-1 ${colorClasses[color] || 'text-gray-600'}`}>{value}</div>
          <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className={`text-2xl font-black uppercase tracking-wide flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            <BarChart3 size={24} className="text-blue-600" /> Dashboard Analytics
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`flex border p-1 rounded-lg backdrop-blur-md ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              {['day', 'week', 'month'].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 text-sm font-bold uppercase rounded-md transition-all ${period === p ? 'bg-blue-600 text-white shadow-md' : (isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-50')}`}>
                  {p === 'day' ? 'Today' : `This ${p}`}
                </button>
              ))}
            </div>

            {/* Bulk Delete — admin only */}
            {isAdmin && (
              <button onClick={() => setIsBulkModalOpen(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition ${isDark ? 'bg-red-900/30 border-red-700/50 text-red-400 hover:bg-red-900/50' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`}>
                <Trash2 size={16} /> Bulk Delete
              </button>
            )}

            <button onClick={() => setShowExportPanel(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition ${showExportPanel ? (isDark ? 'bg-green-700 border-green-600 text-white' : 'bg-green-600 border-green-700 text-white') : (isDark ? 'bg-gray-800 border-gray-600 text-green-400 hover:bg-gray-700' : 'bg-white border-gray-200 text-green-600 hover:bg-gray-50')}`}>
              <Download size={16} /> Export Excel
            </button>
          </div>
        </div>

        {/* Export Panel */}
        {showExportPanel && (
          <div className={`p-4 rounded-xl border shadow-sm animate-fadeIn ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}><Calendar size={15} /> Export Invoices to Excel</h3>
              <button onClick={() => setShowExportPanel(false)} className={`p-1 rounded transition ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}><X size={16} /></button>
            </div>
            <p className={`text-xs mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Select a date range to export specific bills, or leave blank to export all bills.</p>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>From Date</label>
                <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} className={inputClass} />
              </div>
              <div className="flex-1">
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>To Date</label>
                <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} className={inputClass} />
              </div>
              <button onClick={executeExport} disabled={isExporting}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition whitespace-nowrap">
                <Download size={15} />{isExporting ? 'Exporting...' : 'Download Excel'}
              </button>
            </div>
          </div>
        )}

        {/* Stats cards */}
        {isLoading || !stats ? (
          <div className="text-center py-20 opacity-50 font-bold animate-pulse">Calculating metrics...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard title="Total Revenue" value={`₹${Number(stats.summary?.total_revenue || 0).toLocaleString('en-IN')}`} subtitle="Active bills only" icon={IndianRupee} color="green" />
              <StatCard title="Bills Generated" value={stats.summary?.total_bills || 0} subtitle="Excluding cancelled" icon={TrendingUp} color="blue" />
              <div className={`${card} p-6 shadow-sm`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2"><Layers size={14} /> External Bills Overview</h3>
                <div className="space-y-3">
                  {stats.externalBreakdown?.length === 0 ? (
                    <p className="text-sm opacity-50 font-bold">No external bills recorded.</p>
                  ) : stats.externalBreakdown.map((ext, idx) => (
                    <div key={idx} className={`flex justify-between items-center border-b pb-2 last:border-0 last:pb-0 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div>
                        <div className={`font-bold text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{ext.name}</div>
                        <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{ext.count} entries</div>
                      </div>
                      <div className={`font-black ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>₹{Number(ext.total_amount).toLocaleString('en-IN')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top selling items */}
            <div className={`${card} p-6 shadow-sm`}>
              <h3 className={`text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 border-b pb-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>Top Selling Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className={`text-xs uppercase ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                    <tr>
                      <th className="px-4 py-2 rounded-l-lg">Item Name</th>
                      <th className="px-4 py-2 text-center">Qty Sold</th>
                      <th className="px-4 py-2 text-right rounded-r-lg">Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topItems?.length === 0 ? (
                      <tr><td colSpan="3" className="text-center py-6 opacity-50 font-bold">No items sold in this period.</td></tr>
                    ) : stats.topItems.map((item, idx) => (
                      <tr key={idx} className={`border-b transition-colors ${isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-100 hover:bg-blue-50/30'}`}>
                        <td className={`px-4 py-3 font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.name}</td>
                        <td className={`px-4 py-3 text-center font-bold ${isDark ? 'text-blue-400 bg-blue-900/20' : 'text-blue-600 bg-blue-50/30'}`}>{item.total_qty_sold}</td>
                        <td className={`px-4 py-3 text-right font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>₹{Number(item.total_revenue).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Audit Logs — admin only */}
        {isAdmin ? (
          <div className={`${card} p-6 shadow-sm`}>
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 border-b pb-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <ClipboardList size={14} /> Audit Log
                {auditTotal > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    {auditTotal.toLocaleString()} entries
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <input type="text" placeholder="Search logs..." value={auditSearch} onChange={handleAuditSearch}
                    className={`pl-7 pr-3 py-1.5 rounded-lg border text-xs outline-none focus:ring-2 focus:ring-blue-500 transition w-44 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-800'}`} />
                </div>
                <button onClick={() => loadAuditLogs(auditPage, auditSearch)} disabled={auditLoading} title="Refresh"
                  className={`p-1.5 rounded-lg border transition ${isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                  <RefreshCcw size={13} className={auditLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {auditLoading && auditLogs.length === 0 ? (
              <div className="text-center py-10 opacity-40 text-sm font-bold animate-pulse">Loading audit logs...</div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-10 opacity-40 text-sm font-bold">No audit logs found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={`text-xs uppercase sticky top-0 ${isDark ? 'bg-gray-700/80 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                    <tr>
                      <th className="px-3 py-2 text-left rounded-l-lg whitespace-nowrap">Action</th>
                      <th className="px-3 py-2 text-left">Details</th>
                      <th className="px-3 py-2 text-right rounded-r-lg whitespace-nowrap">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => {
                      const colors = actionColor(log.action);
                      return (
                        <tr key={log.id} className={`border-b transition-colors ${isDark ? 'border-gray-700/60 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-gray-50/60'}`}>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text}`}>
                              {log.action.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className={`px-3 py-2.5 text-xs max-w-[420px] truncate ${isDark ? 'text-gray-300' : 'text-gray-600'}`} title={log.details}>
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
            <Pagination page={auditPage} totalPages={auditTotalPages} onGoTo={handleAuditPageChange} isDark={isDark} />
          </div>
        ) : (
          /* Non-admin: show locked placeholder */
          <div className={`${card} p-6 shadow-sm`}>
            <div className="flex items-center gap-3 opacity-50">
              <Lock size={18} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Audit Log — Admin Only</h3>
            </div>
            <p className={`text-sm mt-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Audit logs are only visible to administrators.
            </p>
          </div>
        )}
      </div>

      {isAdmin && (
        <BulkDeleteModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          onSuccess={() => { loadStats(); loadAuditLogs(1, auditSearch); }}
        />
      )}
    </div>
  );
};

export default StatisticsPage;