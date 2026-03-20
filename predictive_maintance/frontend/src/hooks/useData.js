import { useState, useEffect, useCallback } from 'react';
import socketService from '../services/socket';
import api from '../services/api';

export function useSocket() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    console.log('Connecting to socket...');
    socketService.connect();
    socketService.on('connected', (isConnected) => {
      console.log('Socket connected:', isConnected);
      setConnected(isConnected);
    });
    socketService.on('disconnected', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });
    
    return () => {
      socketService.off('connected');
      socketService.off('disconnected');
    };
  }, []);

  return connected;
}

export function useDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDevices = useCallback(async () => {
    try {
      const data = await api.getDevices();
      setDevices(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    socketService.on('device:created', (device) => {
      setDevices(prev => [device, ...prev]);
    });

    socketService.on('device:updated', (device) => {
      setDevices(prev => prev.map(d => d.id === device.id ? device : d));
    });

    socketService.on('device:deleted', ({ id }) => {
      setDevices(prev => prev.filter(d => d.id !== id));
    });

    return () => {
      socketService.off('device:created');
      socketService.off('device:updated');
      socketService.off('device:deleted');
    };
  }, []);

  return { devices, loading, error, refetch: fetchDevices };
}

export function useStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      console.error('Stats error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    
    const interval = setInterval(fetchStats, 10000);
    
    socketService.on('alert:created', fetchStats);
    socketService.on('alert:resolved', fetchStats);
    socketService.on('metrics:batch', fetchStats);

    return () => {
      clearInterval(interval);
      socketService.off('alert:created', fetchStats);
      socketService.off('alert:resolved', fetchStats);
      socketService.off('metrics:batch', fetchStats);
    };
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}

export function useMetrics(deviceId = null) {
  const [metrics, setMetrics] = useState([]);
  const [latestMetric, setLatestMetric] = useState(null);

  useEffect(() => {
    console.log('Subscribing to metrics...');
    socketService.subscribeToAll();

    socketService.on('device:metrics', (data) => {
      console.log('Received metrics:', data);
      if (!deviceId || data.deviceId === deviceId) {
        setLatestMetric(data);
        setMetrics(prev => [data, ...prev.slice(0, 99)]);
      }
    });

    return () => {
      socketService.off('device:metrics');
    };
  }, [deviceId]);

  return { metrics, latestMetric };
}

export function useAlerts(filters = {}) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts(filters);
      setAlerts(data);
    } catch (err) {
      console.error('Alerts error:', err);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    socketService.on('alert:created', (alert) => {
      if (filters.resolved === undefined || filters.resolved === false) {
        setAlerts(prev => [alert, ...prev]);
      }
    });

    socketService.on('alert:resolved', (alert) => {
      if (filters.resolved === false) {
        setAlerts(prev => prev.filter(a => a.id !== alert.id));
      } else {
        setAlerts(prev => prev.map(a => a.id === alert.id ? alert : a));
      }
    });

    socketService.on('alert:deleted', ({ id }) => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    });

    return () => {
      socketService.off('alert:created');
      socketService.off('alert:resolved');
      socketService.off('alert:deleted');
    };
  }, [JSON.stringify(filters)]);

  return { alerts, loading, refetch: fetchAlerts };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    socketService.on('notification', (notification) => {
      const id = Date.now();
      setNotifications(prev => [...prev, { ...notification, id }]);
      
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
    });

    return () => {
      socketService.off('notification');
    };
  }, []);

  const dismiss = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return { notifications, dismiss };
}
