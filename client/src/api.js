const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Profile
  getProfile: () => req('GET', '/profile'),
  updateProfile: (data) => req('PUT', '/profile', data),

  // Companies
  getCompanies: () => req('GET', '/companies'),
  addCompany: (data) => req('POST', '/companies', data),
  getCompany: (id) => req('GET', `/companies/${id}`),
  updateCompany: (id, data) => req('PATCH', `/companies/${id}`, data),
  deleteCompany: (id) => req('DELETE', `/companies/${id}`),

  // Jobs
  getFeed: () => req('GET', '/jobs/feed'),
  getJobs: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req('GET', `/jobs${q ? '?' + q : ''}`);
  },
  updateJob: (id, data) => req('PATCH', `/jobs/${id}`, data),

  // Sync
  syncAll: () => req('POST', '/sync'),
  syncCompany: (id) => req('POST', `/sync/${id}`),

  // AI
  discover: () => req('POST', '/ai/discover'),
  lookupCompany: (name) => req('POST', '/ai/lookup-company', { name }),
};
