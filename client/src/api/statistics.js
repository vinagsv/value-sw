import apiClient from './apiClient';

export const fetchDashboardStats = async (period = 'day') => {
  const { data } = await apiClient.get(`/statistics/dashboard?period=${period}`);
  return data;
};

// NEW: Sales by item report — supports period OR custom date range
export const fetchSalesByItem = async ({ period, fromDate, toDate } = {}) => {
  const params = new URLSearchParams();
  if (fromDate && toDate) {
    params.append('fromDate', fromDate);
    params.append('toDate', toDate);
  } else if (period) {
    params.append('period', period);
  }
  const { data } = await apiClient.get(`/statistics/sales-by-item?${params.toString()}`);
  return data;
};

export const fetchAuditLogs = async ({ page = 1, limit = 50, search = '' } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (search) params.append('search', search);
  const { data } = await apiClient.get(`/statistics/audit-logs?${params.toString()}`);
  return data;
};