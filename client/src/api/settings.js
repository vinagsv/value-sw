import apiClient from './apiClient';

export const fetchSettings = async () => {
  const { data } = await apiClient.get('/settings');
  return data;
};

export const fetchNextBillNumber = async () => {
  const { data } = await apiClient.get('/settings/next-bill-no');
  return data;
};

export const fetchNextGatePassNumber = async () => {
  const { data } = await apiClient.get('/settings/next-gatepass-no');
  return data;
};

export const updateSettings = async (settingsData) => {
  const { data } = await apiClient.put('/settings', settingsData);
  return data;
};