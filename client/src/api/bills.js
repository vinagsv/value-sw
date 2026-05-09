import apiClient from './apiClient';

export const fetchBills = async (params = {}) => {
  const { data } = await apiClient.get('/bills', { params });
  return data;
};

export const createBill = async (billData) => {
  const { data } = await apiClient.post('/bills', billData);
  return data;
};

export const updateBill = async (id, billData) => {
  const { data } = await apiClient.put(`/bills/${id}`, billData);
  return data;
};

export const cancelBill = async (id) => {
  const { data } = await apiClient.put(`/bills/${id}/cancel`);
  return data;
};

export const uncancelBill = async (id) => {
  const { data } = await apiClient.put(`/bills/${id}/uncancel`);
  return data;
};

export const deleteBill = async (id) => {
  const { data } = await apiClient.delete(`/bills/${id}`);
  return data;
};

export const bulkDeleteBills = async (dateRange) => {
  const { data } = await apiClient.post('/bills/bulk-delete', dateRange);
  return data;
};