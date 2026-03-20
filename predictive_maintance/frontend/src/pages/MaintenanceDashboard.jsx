import { useState } from 'react';
import { useAlerts } from '../hooks/useData';
import api from '../services/api';

const deviceIcons = {
  signal: '🚦',
  cctv: '📹',
  microcontroller: '🔌'
};

export default function MaintenanceDashboard() {
  const { alerts, loading, refetch } = useAlerts({ resolved: false });
  const { alerts: allAlerts } = useAlerts({});
  const [filter, setFilter] = useState('all');
  const [resolving, setResolving] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const filteredAlerts = alerts.filter((alert) =>
    filter === 'all' ? true : alert.severity === filter
  );

  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length
  };

  const resolvedCount = allAlerts.filter(a => a.resolved).length;

  const handleResolve = async (alertId) => {
    setResolving(alertId);
    try {
      await api.resolveAlert(alertId);
      refetch();
      setSelectedAlert(null);
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    } finally {
      setResolving(null);
    }
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 p-1">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
              <span className="text-3xl">🔧</span>
            </div>
          </div>
          <p className="text-slate-400 text-lg">Loading maintenance center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
          Maintenance Center
        </h1>
        <p className="text-slate-400 mt-2">Manage and resolve device alerts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-2xl">
              📋
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Alerts</p>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center text-2xl">
              🔴
            </div>
            <div>
              <p className="text-slate-400 text-sm">Critical</p>
              <p className="text-3xl font-bold text-red-400">{stats.critical}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center text-2xl">
              🟡
            </div>
            <div>
              <p className="text-slate-400 text-sm">Warning</p>
              <p className="text-3xl font-bold text-amber-400">{stats.warning}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center text-2xl">
              ✅
            </div>
            <div>
              <p className="text-slate-400 text-sm">Resolved</p>
              <p className="text-3xl font-bold text-green-400">{resolvedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All Alerts', count: stats.total, color: 'blue' },
          { key: 'critical', label: 'Critical', count: stats.critical, color: 'red' },
          { key: 'warning', label: 'Warning', count: stats.warning, color: 'amber' }
        ].map(({ key, label, count, color }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-5 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 ${
              filter === key
                ? color === 'red' ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/30' 
                  : color === 'amber' ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {label}
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              filter === key ? 'bg-white/20' : 'bg-slate-600'
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Alert List */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            📋 Alert Queue
          </h2>
          
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center text-4xl">
                ✅
              </div>
              <h3 className="text-xl font-bold text-green-400">All Clear!</h3>
              <p className="text-slate-400 mt-2">No alerts need your attention right now</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-auto pr-2">
              {filteredAlerts.map((alert) => {
                const isSelected = selectedAlert?.id === alert.id;
                const isCritical = alert.severity === 'critical';
                
                return (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlert(alert)}
                    className={`p-5 rounded-xl cursor-pointer transition-all border ${
                      isSelected 
                        ? isCritical 
                          ? 'bg-red-500/20 border-red-500/50' 
                          : 'bg-amber-500/20 border-amber-500/50'
                        : 'bg-slate-700/50 border-transparent hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${
                        isCritical ? 'bg-red-500/30' : 'bg-amber-500/30'
                      }`}>
                        {deviceIcons[alert.device?.type] || '📟'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-white">{alert.device?.location || 'Unknown Location'}</h4>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            isCritical 
                              ? 'bg-red-500/30 text-red-300 border border-red-500/50' 
                              : 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                          }`}>
                            {alert.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-slate-300">{alert.issue}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                          <span>{alert.device?.type}</span>
                          <span>•</span>
                          <span>{timeAgo(alert.createdAt)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${
                          alert.anomalyScore > 0.7 ? 'text-red-400' :
                          alert.anomalyScore > 0.4 ? 'text-amber-400' : 'text-green-400'
                        }`}>
                          {alert.anomalyScore?.toFixed(2)}
                        </div>
                        <p className="text-xs text-slate-400">score</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="space-y-4">
          {selectedAlert ? (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Alert Details</h3>
                <button onClick={() => setSelectedAlert(null)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
              </div>
              
              <div className={`p-4 rounded-xl mb-4 ${
                selectedAlert.severity === 'critical' ? 'bg-red-500/10' : 'bg-amber-500/10'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{deviceIcons[selectedAlert.device?.type]}</span>
                  <div>
                    <p className="font-bold text-lg text-white">{selectedAlert.device?.location || 'Unknown'}</p>
                    <p className="text-slate-400 capitalize">{selectedAlert.device?.type}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400">Issue</p>
                  <p className="font-medium text-white">{selectedAlert.issue}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Severity</p>
                    <p className={`font-bold ${
                      selectedAlert.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
                    }`}>
                      {selectedAlert.severity.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Anomaly Score</p>
                    <p className="font-bold text-xl">{selectedAlert.anomalyScore?.toFixed(3)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-400">Created</p>
                  <p className="text-sm">{new Date(selectedAlert.createdAt).toLocaleString()}</p>
                </div>

                <button
                  onClick={() => handleResolve(selectedAlert.id)}
                  disabled={resolving === selectedAlert.id}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resolving === selectedAlert.id ? (
                    <>
                      <span className="animate-spin">⟳</span> Processing...
                    </>
                  ) : (
                    <>
                      ✓ Mark as Resolved
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center text-3xl">
                👆
              </div>
              <p className="text-slate-400">Select an alert</p>
              <p className="text-sm text-slate-500 mt-1">to view details</p>
            </div>
          )}

          {/* Recent History */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              ✅ Resolved History
            </h3>
            <div className="space-y-2 max-h-48 overflow-auto">
              {allAlerts.filter(a => a.resolved).slice(0, 8).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-sm text-slate-300">{alert.device?.location?.split(',')[0] || 'Unknown'}</span>
                  </div>
                  <span className="text-xs text-slate-500">{timeAgo(alert.createdAt)}</span>
                </div>
              ))}
              {allAlerts.filter(a => a.resolved).length === 0 && (
                <p className="text-center text-slate-500 text-sm py-4">No resolved alerts yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
