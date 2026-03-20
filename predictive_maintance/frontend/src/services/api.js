const API_URL = 'http://localhost:5000/api';

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'API Error');
    }
    
    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // Stats
  getStats: () => fetchAPI('/stats'),
  getHealth: () => fetchAPI('/health'),

  // Devices
  getDevices: () => fetchAPI('/devices'),
  getDevice: (id) => fetchAPI(`/devices/${id}`),
  createDevice: (data) => fetchAPI('/devices', { method: 'POST', body: JSON.stringify(data) }),
  updateDeviceStatus: (id, status) => fetchAPI(`/devices/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteDevice: (id) => fetchAPI(`/devices/${id}`, { method: 'DELETE' }),

  // Metrics
  getMetrics: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/metrics${query ? `?${query}` : ''}`);
  },
  getLatestMetrics: (deviceId) => fetchAPI(`/metrics/latest${deviceId ? `?deviceId=${deviceId}` : ''}`),
  getDeviceMetrics: (deviceId) => fetchAPI(`/metrics/device/${deviceId}`),

  // Alerts
  getAlerts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/alerts${query ? `?${query}` : ''}`);
  },
  getAlertStats: () => fetchAPI('/alerts/stats'),
  getAlert: (id) => fetchAPI(`/alerts/${id}`),
  createAlert: (data) => fetchAPI('/alerts', { method: 'POST', body: JSON.stringify(data) }),
  resolveAlert: (id) => fetchAPI(`/alerts/${id}/resolve`, { method: 'PATCH' }),
  unresolveAlert: (id) => fetchAPI(`/alerts/${id}/unresolve`, { method: 'PATCH' }),
  deleteAlert: (id) => fetchAPI(`/alerts/${id}`, { method: 'DELETE' }),

  // Simulator
  startSimulator: () => fetchAPI('/simulator/start', { method: 'POST' }),
  stopSimulator: () => fetchAPI('/simulator/stop', { method: 'POST' }),
  getSimulatorStatus: () => fetchAPI('/simulator/status'),
  toggleML: () => fetchAPI('/ml/toggle', { method: 'POST' }),
};

export default api;
