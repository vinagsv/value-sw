import apiClient from './apiClient';

export const fetchGatePasses = async (search = '') => {
  const { data } = await apiClient.get(`/gatepasses?search=${search}`);
  return data;
};

export const createGatePass = async (gpData) => {
  const { data } = await apiClient.post('/gatepasses', gpData);
  return data;
};

export const updateGatePass = async (id, gpData) => {
  const { data } = await apiClient.put(`/gatepasses/${id}`, gpData);
  return data;
};

export const deleteGatePass = async (id) => {
  const { data } = await apiClient.delete(`/gatepasses/${id}`);
  return data;
};