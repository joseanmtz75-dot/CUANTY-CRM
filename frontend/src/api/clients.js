import axios from 'axios';

const API = axios.create({ baseURL: '' });

export const getClients = (filters = {}) => {
  const params = {};
  if (typeof filters === 'string') {
    // Backward compat: getClients('Nuevo')
    if (filters) params.estatus = filters;
  } else {
    if (filters.estatus) params.estatus = filters.estatus;
    if (filters.search) params.search = filters.search;
    if (filters.incluirDescartados) params.incluirDescartados = 'true';
  }
  return API.get('/clients', { params }).then(res => res.data);
};

export const createClient = (data) =>
  API.post('/clients', data).then(res => res.data);

export const updateClient = (id, data) =>
  API.put(`/clients/${id}`, data).then(res => res.data);

export const deleteClient = (id) =>
  API.delete(`/clients/${id}`).then(res => res.data);

export const bulkImportClients = (clients) =>
  API.post('/clients/bulk', { clients }).then(res => res.data);

export const getTodayFollowUps = (vendedor) => {
  const params = {};
  if (vendedor) params.vendedor = vendedor;
  return API.get('/clients/today', { params }).then(res => res.data);
};

export const getInteractions = (clientId, page = 1) =>
  API.get(`/clients/${clientId}/interactions`, { params: { page } }).then(res => res.data);

export const logInteraction = (clientId, data) =>
  API.post(`/clients/${clientId}/interactions`, data).then(res => res.data);

export const getSuggestions = () =>
  API.get('/clients/suggestions').then(res => res.data);

export const getCleanup = () =>
  API.get('/clients/cleanup').then(res => res.data);

export const getClientIntelligence = (clientId) =>
  API.get(`/clients/${clientId}/intelligence`).then(res => res.data);

export const bulkAssignClients = (data) =>
  API.put('/clients/bulk-assign', data).then(res => res.data);

// Vendedores
export const getVendedores = () =>
  API.get('/vendedores').then(res => res.data);

export const createVendedor = (nombre) =>
  API.post('/vendedores', { nombre }).then(res => res.data);

export const deleteVendedor = (id) =>
  API.delete(`/vendedores/${id}`).then(res => res.data);
