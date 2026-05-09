import React, { useEffect, useState, useCallback } from 'react';
import { Search, Ban, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchBills } from '../../api/bills';

const PAGE_SIZE = 15;

const PreviousBillsPanel = ({ onSelectBill, theme, refreshTrigger }) => {
  const isDark = theme === 'dark';
  const [bills, setBills] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const loadBills = useCallback(async (search = '') => {
    try {
      setLoading(true);
      const data = await fetchBills(search.length > 2 || search === '' ? { search } : {});
      setBills(data);
      setPage(1);
    } catch (error) {
      console.error('Failed to fetch bills', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount and whenever the parent signals a refresh (e.g. after save)
  useEffect(() => {
    loadBills(searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // FIX: Debounce search — previously fired a full API request on every
  // keystroke once the length exceeded 2. Typing "SHARMA" would fire 3
  // requests in rapid succession. Now we wait 300 ms after the user stops
  // typing before sending the request.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length > 2 || searchTerm.length === 0) {
        loadBills(searchTerm);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, loadBills]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const isCancelled = (bill) => bill.status === 'CANCELLED';

  // Pagination
  const totalPages = Math.max(1, Math.ceil(bills.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const start      = (safePage - 1) * PAGE_SIZE;
  const paginated  = bills.slice(start, start + PAGE_SIZE);

  const goTo    = (p) => setPage(Math.max(1, Math.min(p, totalPages)));
  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;

  const pageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set([1, totalPages, safePage, safePage - 1, safePage + 1].filter(p => p >= 1 && p <= totalPages));
    return Array.from(pages).sort((a, b) => a - b);
  };

  const pageNums = pageNumbers();

  return (
    <div className="flex flex-col h-full px-3 py-3 relative">

      {/* Search */}
      <div className="flex flex-col gap-2 mb-3 flex-shrink-0">
        <div className="relative w-full">
          <Search
            size={14}
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
          />
          <input
            type="text"
            placeholder="Search name, vehicle, mob..."
            value={searchTerm}
            onChange={handleSearchChange}
            className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition
              ${isDark
                ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500'
                : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`}
          />
        </div>
      </div>

      {/* Bill count + page info */}
      {!loading && bills.length > 0 && (
        <p className={`text-xs mb-2 flex-shrink-0 font-medium flex justify-between ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <span>{bills.length} bill{bills.length !== 1 ? 's' : ''}</span>
          <span>Page {safePage} of {totalPages}</span>
        </p>
      )}

      {/* Bill list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 -mx-1 px-1 custom-scrollbar">
        {loading ? (
          <div className={`text-center text-xs mt-10 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            Loading bills...
          </div>
        ) : bills.length === 0 ? (
          <div className={`text-center text-xs mt-10 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            No bills found.
          </div>
        ) : (
          paginated.map(bill => (
            <div
              key={bill.id}
              onClick={() => onSelectBill(bill)}
              className={`px-3 py-2.5 rounded-lg cursor-pointer border transition-all
                ${isCancelled(bill)
                  ? isDark
                    ? 'bg-red-900/20 border-red-800/60 hover:bg-red-900/30'
                    : 'bg-red-50 border-red-100 hover:bg-red-100/60'
                  : isDark
                    ? 'bg-gray-700/50 border-gray-600/80 hover:bg-gray-700 hover:border-gray-500'
                    : 'bg-white border-gray-100 hover:bg-blue-50/40 hover:border-blue-100'
                }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`font-bold text-xs tabular-nums
                  ${isCancelled(bill)
                    ? isDark ? 'text-red-400' : 'text-red-500'
                    : isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  {bill.bill_no}
                </span>
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                </span>
              </div>

              <div className={`text-xs font-medium truncate mb-1.5
                ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {bill.customer_name || '—'}
              </div>

              <div className="flex justify-between items-center">
                <span className={`text-xs font-bold tabular-nums
                  ${isCancelled(bill)
                    ? isDark ? 'text-red-400' : 'text-red-500'
                    : isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  ₹{Number(bill.grand_total).toLocaleString('en-IN')}
                </span>
                {isCancelled(bill) && (
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase
                    ${isDark ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-500'}`}>
                    <Ban size={10} /> Cancelled
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination controls */}
      {!loading && totalPages > 1 && (
        <div className={`flex-shrink-0 mt-2 pt-2 border-t flex items-center justify-between gap-1
          ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>

          <button
            onClick={() => goTo(safePage - 1)}
            disabled={!canPrev}
            className={`p-1.5 rounded-lg border transition flex items-center justify-center
              ${canPrev
                ? isDark
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                : isDark
                  ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                  : 'border-gray-100 text-gray-300 cursor-not-allowed'}`}>
            <ChevronLeft size={14} />
          </button>

          <div className="flex items-center gap-1">
            {pageNums.map((p, i) => {
              const prev = pageNums[i - 1];
              const showEllipsis = prev !== undefined && p - prev > 1;
              return (
                <React.Fragment key={p}>
                  {showEllipsis && (
                    <span className={`text-xs px-0.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>…</span>
                  )}
                  <button
                    onClick={() => goTo(p)}
                    className={`min-w-[26px] h-[26px] rounded-md text-xs font-bold border transition
                      ${p === safePage
                        ? isDark
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-blue-600 border-blue-600 text-white'
                        : isDark
                          ? 'border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}>
                    {p}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <button
            onClick={() => goTo(safePage + 1)}
            disabled={!canNext}
            className={`p-1.5 rounded-lg border transition flex items-center justify-center
              ${canNext
                ? isDark
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                : isDark
                  ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                  : 'border-gray-100 text-gray-300 cursor-not-allowed'}`}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default PreviousBillsPanel;