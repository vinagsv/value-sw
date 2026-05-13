import apiClient from './apiClient';

export const fetchUsers = async () => {
  const { data } = await apiClient.get('/auth/users');
  return data;
};

export const createUser = async (userData) => {
  const { data } = await apiClient.post('/auth/users', userData);
  return data;
};

export const updateUser = async (id, userData) => {
  const { data } = await apiClient.put(`/auth/users/${id}`, userData);
  return data;
};

export const deleteUser = async (id) => {
  const { data } = await apiClient.delete(`/auth/users/${id}`);
  return data;
};