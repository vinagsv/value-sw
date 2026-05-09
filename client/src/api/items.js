import apiClient from './apiClient';

export const fetchItems = async (search = '') => {
  const { data } = await apiClient.get(`/items?search=${search}`);
  return data;
};

export const createItem = async (itemData) => {
  const { data } = await apiClient.post('/items', itemData);
  return data;
};

export const updateItem = async (id, itemData) => {
  const { data } = await apiClient.put(`/items/${id}`, itemData);
  return data;
};

export const deleteItem = async (id) => {
  const { data } = await apiClient.delete(`/items/${id}`);
  return data;
};