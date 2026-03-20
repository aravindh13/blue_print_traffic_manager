import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useSocket, useNotifications, useAlerts } from '../hooks/useData';

const navItems = [
  { 
    path: '/control', 
    label: 'Dashboard', 
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    emoji: '📊'
  },
  { 
    path: '/maintenance', 
    label: 'Maintenance', 
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    emoji: '🔧'
  },
];

export default function Sidebar() {
  const { notifications, dismiss } = useNotifications();
  const { alerts } = useAlerts({ resolved: false });
  const connected = useSocket();
  
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  return (
    <>
      <aside className="w-72 bg-gradient-to-b from-slate-800 to-slate-900 border-r border-slate-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl shadow-lg">
              🔮
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">PredictMaint</h1>
              <p className="text-xs text-slate-400">Smart Monitoring</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const alertCount = item.path === '/maintenance' ? alerts.length : 0;
            const hasCritical = item.path === '/maintenance' && criticalCount > 0;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                  }`
                }
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  NavLink ? 'bg-slate-700/50 group-hover:bg-slate-600/50' : ''
                }`}>
                  <svg className={`w-5 h-5 ${NavLink ? '' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </div>
                <span className="flex-1 font-medium">{item.label}</span>
                {alertCount > 0 && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    hasCritical 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {alertCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Alert Summary */}
        {alerts.length > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-slate-700/50 rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-3">Active Alerts</p>
              <div className="flex gap-3">
                <div className="flex-1 bg-red-500/20 rounded-lg p-2 text-center">
                  <p className="text-xl font-bold text-red-400">{criticalCount}</p>
                  <p className="text-xs text-slate-400">Critical</p>
                </div>
                <div className="flex-1 bg-amber-500/20 rounded-lg p-2 text-center">
                  <p className="text-xl font-bold text-amber-400">{warningCount}</p>
                  <p className="text-xs text-slate-400">Warning</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className={`text-sm font-medium ${connected ? 'text-green-400' : 'text-red-400'}`}>
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <span className="text-xs text-slate-500">v1.0</span>
          </div>
        </div>
      </aside>

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
        {notifications.map((notif, index) => (
          <div
            key={notif.id || index}
            className={`rounded-2xl shadow-2xl border-2 overflow-hidden ${
              notif.title?.toLowerCase().includes('critical') 
                ? 'bg-gradient-to-r from-red-600 to-rose-600 border-red-400' 
                : notif.title?.toLowerCase().includes('warning')
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-400'
            }`}
          >
            <div className="flex items-start gap-4 p-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                notif.title?.toLowerCase().includes('critical') ? 'bg-red-500/30' : 'bg-amber-500/30'
              }`}>
                {notif.title?.toLowerCase().includes('critical') ? '🚨' : '⚠️'}
              </div>
              <div className="flex-1">
                <p className="font-bold text-white">{notif.title}</p>
                <p className="text-sm text-white/80 mt-1">{notif.message}</p>
              </div>
              <button 
                onClick={() => dismiss(notif.id)} 
                className="text-white/70 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
