import { NavLink } from 'react-router-dom';
import { useSocket, useNotifications, useAlerts } from '../hooks/useData';

// Traffic light icon for sidebar
function IconTraffic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="20" rx="4"/>
      <circle cx="12" cy="7"  r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="17" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}

// ─── SVG Icon components ───────────────────────────────────────────────────
function IconGrid() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}
function IconWrench() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ─── Professional Logo mark ────────────────────────────────────────────────
function LogoMark() {
  return (
    <div style={{
      width: 44, height: 44,
      borderRadius: 14,
      background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 6px 20px rgba(37,99,235,.35)',
      flexShrink: 0,
    }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" fillOpacity="0.9"/>
        <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fillOpacity="0"/>
        <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fillOpacity="0" strokeOpacity="0.6"/>
      </svg>
    </div>
  );
}

const navItems = [
  { path: '/control',     label: 'Dashboard',           icon: <IconGrid />,    badge: null },
  { path: '/maintenance', label: 'Maintenance',          icon: <IconWrench />,  badge: 'alerts' },
  { path: '/traffic',     label: 'Traffic Signal AI',    icon: <IconTraffic />, badge: null },
];

export default function Sidebar() {
  const { notifications, dismiss } = useNotifications();
  const { alerts } = useAlerts({ resolved: false });
  const connected = useSocket();

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount  = alerts.filter(a => a.severity === 'warning').length;

  return (
    <>
      {/* ────────────────── SIDEBAR ────────────────── */}
      <aside style={{
        width: 268,
        minWidth: 268,
        background: '#fff',
        borderRight: '1.5px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(15,23,42,.06)',
        zIndex: 40,
        overflow: 'hidden',
      }}>

        {/* ── Brand / Logo ── */}
        <div style={{ padding: '22px 20px 18px', borderBottom: '1.5px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <LogoMark />
            <div>
              <h1 className="logo-text" style={{ fontSize: '1.1rem', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                PredictMaint
              </h1>
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 1 }}>
                AI Monitoring Platform
              </p>
            </div>
          </div>
        </div>

        {/* ── Nav Label ── */}
        <div style={{ padding: '16px 16px 6px' }}>
          <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Navigation
          </p>
        </div>

        {/* ── Nav Items ── */}
        <nav style={{ flex: 1, padding: '0 10px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((item) => {
            const alertCount = item.badge === 'alerts' ? alerts.length : 0;
            const hasCritical = item.badge === 'alerts' && criticalCount > 0;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon" style={{ flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {alertCount > 0 && (
                  <span style={{
                    background: hasCritical ? '#dc2626' : '#d97706',
                    color: '#fff',
                    borderRadius: 99,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '1px 8px',
                    minWidth: 20,
                    textAlign: 'center',
                    animation: hasCritical ? 'pulse-dot 1.5s infinite' : 'none',
                  }}>
                    {alertCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ── Alert Summary ── */}
        {alerts.length > 0 && (
          <div style={{ padding: '0 12px 12px' }}>
            <div style={{
              background: 'linear-gradient(135deg,#fff5f5,#fff7ed)',
              border: '1.5px solid #fecaca',
              borderRadius: 14,
              padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <IconBell />
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>Active Alerts</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                  <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>{criticalCount}</p>
                  <p style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>Critical</p>
                </div>
                <div style={{ flex: 1, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                  <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706', lineHeight: 1 }}>{warningCount}</p>
                  <p style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>Warning</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── System Info ── */}
        <div style={{ borderTop: '1.5px solid #f1f5f9', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                position: 'relative',
                display: 'inline-flex',
                width: 10,
                height: 10,
              }}>
                <span style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: connected ? '#22c55e' : '#ef4444',
                  animation: connected ? 'ping-slow 1.8s cubic-bezier(0,0,0.2,1) infinite' : 'none',
                  opacity: 0.6,
                }} />
                <span style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: connected ? '#22c55e' : '#ef4444',
                }} />
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: connected ? '#059669' : '#dc2626' }}>
                {connected ? 'Live Stream' : 'Offline'}
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
              v2.0
            </span>
          </div>
          <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>
            Real-time IoT Monitoring
          </p>
        </div>
      </aside>

      {/* ────────────────── NOTIFICATIONS ────────────────── */}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360 }}>
        {notifications.map((notif, index) => {
          const isCritical = notif.title?.toLowerCase().includes('critical');
          const isWarning  = notif.title?.toLowerCase().includes('warning');
          return (
            <div
              key={notif.id || index}
              className="card-glass animate-slide-right"
              style={{
                borderLeft: `4px solid ${isCritical ? '#dc2626' : isWarning ? '#d97706' : '#2563eb'}`,
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 36, height: 36,
                  borderRadius: 10,
                  background: isCritical ? '#fef2f2' : isWarning ? '#fffbeb' : '#eff6ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem', flexShrink: 0,
                }}>
                  {isCritical ? '🚨' : isWarning ? '⚠️' : 'ℹ️'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>{notif.title}</p>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>{notif.message}</p>
                </div>
                <button
                  onClick={() => dismiss(notif.id)}
                  style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}
                >
                  <IconClose />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
