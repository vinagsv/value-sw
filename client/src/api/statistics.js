import apiClient from './apiClient';

export const fetchDashboardStats = async (period = 'day') => {
  const { data } = await apiClient.get(`/statistics/dashboard?period=${period}`);
  return data;
};

export const fetchAuditLogs = async ({ page = 1, limit = 50, search = '' } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (search) params.append('search', search);
  const { data } = await apiClient.get(`/statistics/audit-logs?${params.toString()}`);
  return data;
};