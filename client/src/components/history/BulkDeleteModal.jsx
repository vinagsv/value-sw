import React, { useState } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import apiClient from '../../api/apiClient';

const BulkDeleteModal = ({ isOpen, onClose, onSuccess }) => {
  const [dateRange, setDateRange] = useState({ fromDate: '', toDate: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleBulkDelete = async () => {
    if (!dateRange.fromDate || !dateRange.toDate) {
      return alert("Please select both from and to dates.");
    }
    
    const confirmDelete = window.confirm(`Are you absolutely sure you want to PERMANENTLY DELETE all bills from ${dateRange.fromDate} to ${dateRange.toDate}? This will restore inventory stock for these bills.`);
    
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await apiClient.post('/bills/bulk-delete', dateRange);
      alert("Bulk delete successful. Stock restored.");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Bulk delete failed", error);
      alert("Failed to delete bills.");
    }
    setIsDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
      {/* Changed from glass-card to a solid background for better visibility */}
      <div className="w-full max-w-md p-6 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-3">
          <h3 className="text-lg font-black uppercase text-red-600 flex items-center gap-2">
            <AlertTriangle size={20} /> Bulk Delete Bills
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"><X size={20} /></button>
        </div>
        
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-5">
          Select a date range. All bills within this range will be hard-deleted. Inventory stock for these bills <span className="text-emerald-600 dark:text-emerald-400">will be restored</span>.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">From Date</label>
            <input 
              type="date" 
              value={dateRange.fromDate} 
              onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })} 
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">To Date</label>
            <input 
              type="date" 
              value={dateRange.toDate} 
              onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })} 
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            Cancel
          </button>
          <button 
            onClick={handleBulkDelete} 
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white shadow-lg transition-all rounded-lg px-4 py-2 font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <Trash2 size={18} /> {isDeleting ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkDeleteModal;