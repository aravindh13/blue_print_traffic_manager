import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LineChart, Line, Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDevices, useMetrics, useStats, useAlerts } from '../hooks/useData';
import api from '../services/api';

const deviceIcons = {
  signal: '🚦',
  cctv: '📹',
  microcontroller: '🔌'
};

const statusColors = {
  healthy: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444'
};

const createIcon = (status, type) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 40px; 
        height: 40px; 
        border-radius: 50%; 
        background: linear-gradient(135deg, ${statusColors[status]}30 0%, ${statusColors[status]}10 100%);
        border: 3px solid ${statusColors[status]};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        box-shadow: 0 4px 15px ${statusColors[status]}40;
        animation: ${status === 'critical' ? 'pulse 1s infinite' : 'none'};
      ">
        ${deviceIcons[type]}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

export default function ControlDashboard() {
  const { devices, loading: devicesLoading } = useDevices();
  const { stats, loading: statsLoading } = useStats();
  const { alerts } = useAlerts();
  const { latestMetric } = useMetrics();
  const [simulatorStatus, setSimulatorStatus] = useState({ running: false, mlEnabled: true });
  const [deviceMetrics, setDeviceMetrics] = useState({});
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);

  useEffect(() => {
    api.getSimulatorStatus().then(setSimulatorStatus);
  }, []);

  useEffect(() => {
    if (latestMetric && latestMetric.deviceId) {
      const { deviceId, temperature, voltage, errorRate, uptime, anomalyScore } = latestMetric;
      setDeviceMetrics(prev => ({
        ...prev,
        [deviceId]: { temperature, voltage, errorRate, uptime, anomalyScore, timestamp: latestMetric.timestamp }
      }));
      setMetricsHistory(prev => [
        { ...latestMetric, time: new Date().toLocaleTimeString(), index: prev.length },
        ...prev.slice(0, 49)
      ]);
    }
  }, [latestMetric]);

  const startSimulator = async () => {
    await api.startSimulator();
    setSimulatorStatus({ running: true, mlEnabled: true });
  };

  const stopSimulator = async () => {
    await api.stopSimulator();
    setSimulatorStatus({ running: false, mlEnabled: false });
  };

  const toggleML = async () => {
    const result = await api.toggleML();
    setSimulatorStatus(prev => ({ ...prev, mlEnabled: result.mlEnabled }));
  };

  const criticalDevices = devices.filter(d => d.status === 'critical');
  const warningDevices = devices.filter(d => d.status === 'warning');
  const healthyDevices = devices.filter(d => d.status === 'healthy');
  const loading = devicesLoading || statsLoading;

  const chartData = metricsHistory.slice(0, 20).map((m, i) => ({
    name: i,
    temperature: m.temperature || 0,
    voltage: m.voltage || 0,
    score: m.anomalyScore || 0
  }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 p-1">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
              <span className="text-3xl">⚡</span>
            </div>
          </div>
          <p className="text-slate-400 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
            Welcome to Monitor
          </h1>
          <p className="text-slate-400 mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Real-time monitoring for all your devices
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {simulatorStatus.running ? (
            <>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-green-400 font-medium">Live</span>
              </div>
              <button 
                onClick={stopSimulator} 
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-red-500 to-rose-500 text-white font-medium shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all"
              >
                ⏹️ Stop Monitoring
              </button>
            </>
          ) : (
            <button 
              onClick={startSimulator} 
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all"
            >
              ▶️ Start Monitoring
            </button>
          )}
          
          <button
            onClick={toggleML}
            className={`px-4 py-2.5 rounded-full font-medium transition-all ${
              simulatorStatus.mlEnabled 
                ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/30' 
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            🧠 ML {simulatorStatus.mlEnabled ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700 hover:border-blue-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-2xl">
              📊
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Devices</p>
              <p className="text-3xl font-bold text-white">{stats?.totalDevices || devices.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700 hover:border-red-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center text-2xl">
              🔴
            </div>
            <div>
              <p className="text-slate-400 text-sm">Critical</p>
              <p className="text-3xl font-bold text-red-400">{criticalDevices.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700 hover:border-amber-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center text-2xl">
              🟡
            </div>
            <div>
              <p className="text-slate-400 text-sm">Warning</p>
              <p className="text-3xl font-bold text-amber-400">{warningDevices.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700 hover:border-green-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center text-2xl">
              ✅
            </div>
            <div>
              <p className="text-slate-400 text-sm">Healthy</p>
              <p className="text-3xl font-bold text-green-400">{healthyDevices.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alert Banner */}
      {criticalDevices.length > 0 && (
        <div className="bg-gradient-to-r from-red-900/50 to-rose-900/50 rounded-2xl p-5 border border-red-500/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/30 flex items-center justify-center text-2xl animate-bounce">
              ⚠️
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-400">Attention Needed!</h3>
              <p className="text-slate-300">{criticalDevices.length} device(s) require immediate attention</p>
            </div>
            <div className="flex gap-2">
              {criticalDevices.slice(0, 2).map((d) => (
                <span key={d.id} className="px-3 py-1 bg-red-500/20 rounded-full text-sm text-red-300">
                  {d.type}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              🗺️ Device Locations
            </h2>
            <span className="text-sm text-slate-400">{devices.length} devices on map</span>
          </div>
          <div className="h-80 rounded-xl overflow-hidden">
            <MapContainer center={[40.7128, -74.006]} zoom={11} style={{ height: '100%', width: '100%' }} className="rounded-xl">
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              {devices.map((device) => (
                <Marker
                  key={device.id}
                  position={[device.latitude, device.longitude]}
                  icon={createIcon(device.status, device.type)}
                  eventHandlers={{ click: () => setSelectedDevice(device) }}
                >
                  <Popup>
                    <div className="p-2 min-w-[150px]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{deviceIcons[device.type]}</span>
                        <p className="font-bold capitalize">{device.type}</p>
                      </div>
                      <p className="text-sm text-gray-600">{device.location}</p>
                      <p className={`text-sm font-medium mt-2 ${
                        device.status === 'healthy' ? 'text-green-600' :
                        device.status === 'warning' ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        Status: {device.status}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Device List */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            📋 Device Status
          </h2>
          <div className="space-y-3 max-h-80 overflow-auto pr-2">
            {devices.map((device) => {
              const live = deviceMetrics[device.id];
              return (
                <div
                  key={device.id}
                  onClick={() => setSelectedDevice(device)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${
                    selectedDevice?.id === device.id 
                      ? 'bg-blue-500/20 border-blue-500/50' 
                      : 'bg-slate-700/50 border-transparent hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{deviceIcons[device.type]}</span>
                      <div>
                        <p className="font-medium text-white capitalize">{device.type}</p>
                        <p className="text-xs text-slate-400">{device.location?.split(',')[0]}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      device.status === 'healthy' ? 'bg-green-500/20 text-green-400' :
                      device.status === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {device.status}
                    </span>
                  </div>
                  {live && (
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-600">
                      <div className="text-center">
                        <p className="text-xs text-slate-400">Temp</p>
                        <p className="font-bold text-cyan-400">{live.temperature?.toFixed(1)}°</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-400">Voltage</p>
                        <p className="font-bold text-purple-400">{live.voltage?.toFixed(0)}V</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-400">Score</p>
                        <p className={`font-bold ${
                          live.anomalyScore > 0.7 ? 'text-red-400' : live.anomalyScore > 0.4 ? 'text-amber-400' : 'text-green-400'
                        }`}>{live.anomalyScore?.toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            🌡️ Temperature
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#475569" fontSize={10} />
              <YAxis stroke="#475569" domain={[0, 100]} fontSize={10} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="temperature" stroke="#06b6d4" strokeWidth={2} fill="url(#tempGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            ⚡ Voltage
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="voltGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#475569" fontSize={10} />
              <YAxis stroke="#475569" domain={[200, 260]} fontSize={10} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="voltage" stroke="#a855f7" strokeWidth={2} fill="url(#voltGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            🎯 Anomaly Score
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#475569" fontSize={10} />
              <YAxis stroke="#475569" domain={[0, 1]} fontSize={10} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={2} fill="url(#scoreGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Device Grid */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            📱 Live Device Grid
          </h2>
          <span className="text-sm text-slate-400">Auto-updating every 5 seconds</span>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {devices.slice(0, 10).map((device) => {
            const live = deviceMetrics[device.id];
            const isAnomaly = live?.anomalyScore > 0.4;
            return (
              <div
                key={device.id}
                className={`p-4 rounded-xl border transition-all hover:scale-105 ${
                  live?.anomalyScore > 0.7 
                    ? 'bg-gradient-to-br from-red-900/50 to-red-950/50 border-red-500/50' 
                    : isAnomaly 
                    ? 'bg-gradient-to-br from-amber-900/50 to-amber-950/50 border-amber-500/50'
                    : 'bg-slate-700/50 border-slate-600 hover:border-blue-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{deviceIcons[device.type]}</span>
                    <span className="text-sm font-medium text-slate-300 capitalize">{device.type}</span>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${
                    device.status === 'healthy' ? 'bg-green-500' : device.status === 'warning' ? 'bg-amber-500 animate-pulse' : 'bg-red-500 animate-pulse'
                  }`}></span>
                </div>
                <p className="text-xs text-slate-400 mb-3 truncate">{device.location}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">🌡️ Temp</span>
                    <span className="font-medium text-cyan-400">{live?.temperature?.toFixed(1) || '--'}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">⚡ Volt</span>
                    <span className="font-medium text-purple-400">{live?.voltage?.toFixed(1) || '--'}V</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">🎯 Score</span>
                    <span className={`font-bold ${
                      live?.anomalyScore > 0.7 ? 'text-red-400' : isAnomaly ? 'text-amber-400' : 'text-green-400'
                    }`}>
                      {live?.anomalyScore?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
