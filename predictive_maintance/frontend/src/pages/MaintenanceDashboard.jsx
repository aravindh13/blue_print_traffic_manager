import { useState } from 'react';
import { useAlerts } from '../hooks/useData';
import api from '../services/api';

// ─── Professional SVG Icons (matching ControlDashboard) ─────────────────────
const Icons = {
  Wrench: ({ size=22, color='currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  ClipBoard: ({ size=22, color='currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1"/>
    </svg>
  ),
  AlertOctagon: ({ size=22, color='currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
      <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  AlertTriangle: ({ size=22, color='currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  ShieldCheck: ({ size=22, color='currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
  CheckCircle: ({ size=22, color='currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  Signal: ({ size=20, color='currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="7" y="1" width="10" height="22" rx="5" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1.5"/>
      <circle cx="12" cy="6.5"  r="2.2" fill="#ef4444"/>
      <circle cx="12" cy="12"   r="2.2" fill="#f59e0b"/>
      <circle cx="12" cy="17.5" r="2.2" fill="#22c55e"/>
    </svg>
  ),
  Camera: ({ size=20, color='currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  ),
  Chip: ({ size=20, color='currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="7" width="10" height="10" rx="2"/>
      <path d="M7 9H4M7 12H4M7 15H4M17 9h3M17 12h3M17 15h3M9 7V4M12 7V4M15 7V4M9 17v3M12 17v3M15 17v3"/>
    </svg>
  ),
  Thermometer: ({ size=14, color='currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/>
    </svg>
  ),
  Zap: ({ size=14, color='currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Activity: ({ size=14, color='currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Clock: ({ size=14, color='currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Cursor: ({ size=28, color='currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/>
    </svg>
  ),
  Filter: ({ size=14, color='currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  ),
  History: ({ size=18, color='currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
    </svg>
  ),
};

// ─── Device icon by type ─────────────────────────────────────────────────────
const deviceIconMap = (type, size=20) => {
  if (type==='signal')          return <Icons.Signal  size={size} color="#2563eb"/>;
  if (type==='cctv')            return <Icons.Camera  size={size} color="#7c3aed"/>;
  if (type==='microcontroller') return <Icons.Chip    size={size} color="#059669"/>;
  return <Icons.Chip size={size} color="#64748b"/>;
};
const deviceIconBg = { signal:'linear-gradient(135deg,#eff6ff,#dbeafe)', cctv:'linear-gradient(135deg,#f5f3ff,#ede9fe)', microcontroller:'linear-gradient(135deg,#f0fdf4,#dcfce7)' };

const SEV = {
  critical: { bg:'linear-gradient(135deg,#fff5f5,#fef2f2)', border:'#fca5a5', text:'#dc2626', grad:'linear-gradient(135deg,#dc2626,#f87171)', iconBg:'rgba(220,38,38,.1)', pillBg:'#fef2f2', pillBorder:'#fca5a5' },
  warning:  { bg:'linear-gradient(135deg,#fffdf0,#fffbeb)', border:'#fde68a', text:'#d97706', grad:'linear-gradient(135deg,#d97706,#fbbf24)', iconBg:'rgba(217,119,6,.1)',  pillBg:'#fffbeb', pillBorder:'#fde68a' },
};

export default function MaintenanceDashboard() {
  const { alerts, loading, refetch } = useAlerts({ resolved: false });
  const { alerts: allAlerts }        = useAlerts({});
  const [filter,        setFilter       ] = useState('all');
  const [resolving,     setResolving    ] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const filteredAlerts = alerts.filter(a => filter==='all' || a.severity===filter);
  const stats = {
    total:    alerts.length,
    critical: alerts.filter(a => a.severity==='critical').length,
    warning:  alerts.filter(a => a.severity==='warning').length,
  };
  const resolvedCount = allAlerts.filter(a => a.resolved).length;

  const handleResolve = async (alertId) => {
    setResolving(alertId);
    try { await api.resolveAlert(alertId); refetch(); setSelectedAlert(null); }
    catch (e) { console.error(e); }
    finally    { setResolving(null); }
  };

  const timeAgo = (date) => {
    const s = Math.floor((Date.now()-new Date(date))/1000);
    if (s<60)  return `${s}s ago`;
    const m=Math.floor(s/60); if (m<60) return `${m}m ago`;
    const h=Math.floor(m/60); if (h<24) return `${h}h ago`;
    return `${Math.floor(h/24)}d ago`;
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{
          width:72, height:72, margin:'0 auto 20px', borderRadius:'50%',
          background:'linear-gradient(135deg,#d97706,#ef4444)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 12px 40px rgba(217,119,6,.35)',
          animation:'pulse-dot 1.8s ease-in-out infinite',
        }}>
          <Icons.Wrench size={30} color="white"/>
        </div>
        <p style={{ color:'#64748b', fontWeight:600, fontSize:'0.95rem' }}>Loading maintenance data…</p>
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }} className="animate-float-up">

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{
            width:52, height:52, borderRadius:16,
            background:'linear-gradient(135deg,#d97706,#ef4444)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 8px 24px rgba(217,119,6,.35)',
          }}>
            <Icons.Wrench size={26} color="white"/>
          </div>
          <div>
            <h1 style={{
              fontSize:'1.8rem', fontWeight:900, lineHeight:1.1,
              fontFamily:"'Plus Jakarta Sans',sans-serif",
              background:'linear-gradient(135deg,#0f172a,#d97706,#ef4444)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            }}>Maintenance Center</h1>
            <p style={{ color:'#64748b', fontSize:'0.85rem', fontWeight:500, marginTop:3 }}>
              Manage diagnostics, resolve alerts, and track device health
            </p>
          </div>
        </div>
      </div>

      {/* ── Vivid Stat Cards ─────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:14 }}>
        {[
          {
            icon:<Icons.ClipBoard size={24} color="white"/>,
            label:'Total Alerts', value:stats.total,
            gradient:'linear-gradient(135deg,#2563eb 0%,#3b82f6 100%)',
            glow:'rgba(37,99,235,.3)',
          },
          {
            icon:<Icons.AlertOctagon size={24} color="white"/>,
            label:'Critical', value:stats.critical,
            gradient:'linear-gradient(135deg,#dc2626 0%,#f87171 100%)',
            glow:'rgba(220,38,38,.3)',
          },
          {
            icon:<Icons.AlertTriangle size={24} color="white"/>,
            label:'Warning', value:stats.warning,
            gradient:'linear-gradient(135deg,#d97706 0%,#fbbf24 100%)',
            glow:'rgba(217,119,6,.3)',
          },
          {
            icon:<Icons.ShieldCheck size={24} color="white"/>,
            label:'Resolved', value:resolvedCount,
            gradient:'linear-gradient(135deg,#059669 0%,#34d399 100%)',
            glow:'rgba(5,150,105,.3)',
          },
        ].map(({ icon, label, value, gradient, glow }) => (
          <div key={label} style={{
            background:gradient, borderRadius:18, padding:'20px 22px',
            boxShadow:`0 4px 20px ${glow}`, position:'relative', overflow:'hidden',
            transition:'all .22s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow=`0 14px 36px ${glow}`; }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)';    e.currentTarget.style.boxShadow=`0 4px 20px ${glow}`; }}
          >
            <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.1)' }}/>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:50, height:50, borderRadius:15, background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(0,0,0,.12)', flexShrink:0 }}>
                {icon}
              </div>
              <div>
                <p style={{ fontSize:'0.7rem', color:'rgba(255,255,255,.8)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</p>
                <p style={{ fontSize:'2.4rem', fontWeight:900, color:'#fff', lineHeight:1, fontFamily:"'Plus Jakarta Sans',sans-serif", letterSpacing:'-0.04em' }}>{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs ───────────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.78rem', color:'#94a3b8', fontWeight:600, marginRight:4 }}>
          <Icons.Filter size={13} color="#94a3b8"/> FILTER:
        </span>
        {[['all','All Alerts',stats.total],['critical','Critical',stats.critical],['warning','Warning',stats.warning]].map(([key,label,count]) => {
          const active = filter===key;
          const accent = key==='critical'?'#dc2626':key==='warning'?'#d97706':'#2563eb';
          return (
            <button key={key} onClick={() => setFilter(key)} style={{
              padding:'8px 18px', borderRadius:99, fontSize:'0.82rem', fontWeight:700, cursor:'pointer',
              border:'1.5px solid', transition:'all .18s',
              background: active ? `linear-gradient(135deg,${accent},${accent}cc)` : '#fff',
              borderColor: active ? accent : '#e2e8f0',
              color:       active ? '#fff' : '#64748b',
              boxShadow:   active ? `0 4px 14px ${accent}33` : 'none',
              display:'flex', alignItems:'center', gap:6,
            }}>
              {label}
              <span style={{
                padding:'1px 7px', borderRadius:99, fontSize:'0.7rem', fontWeight:800,
                background: active ? 'rgba(255,255,255,.25)' : '#f1f5f9',
                color:       active ? '#fff' : '#64748b',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Main Content: Alert Queue + Detail Panel ──────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:16, alignItems:'start' }}>

        {/* Alert Queue */}
        <div style={{ background:'#fff', borderRadius:18, border:'1.5px solid #f1f5f9', boxShadow:'0 2px 12px rgba(0,0,0,.06)', overflow:'hidden' }}>
          {/* card header */}
          <div style={{ height:4, background:'linear-gradient(90deg,#d97706,#ef4444,#dc2626)' }}/>
          <div style={{ padding:'18px 20px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid #f8fafc' }}>
            <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#fffbeb,#fef3c7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icons.ClipBoard size={18} color="#d97706"/>
            </div>
            <h2 style={{ fontWeight:700, color:'#0f172a', fontSize:'1rem', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Alert Queue</h2>
            <span style={{ marginLeft:'auto', fontSize:'0.75rem', color:'#94a3b8', background:'#f8fafc', padding:'3px 10px', borderRadius:99, border:'1px solid #e2e8f0', fontWeight:600 }}>
              {filteredAlerts.length} alerts
            </span>
          </div>

          <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:10, maxHeight:520, overflowY:'auto' }}>
            {filteredAlerts.length === 0 ? (
              <div style={{ padding:'52px 20px', textAlign:'center' }}>
                <div style={{ width:72, height:72, margin:'0 auto 16px', borderRadius:'50%', background:'linear-gradient(135deg,#f0fdf4,#dcfce7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icons.ShieldCheck size={32} color="#059669"/>
                </div>
                <p style={{ color:'#059669', fontWeight:700, fontSize:'1.1rem', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>All Clear!</p>
                <p style={{ color:'#94a3b8', fontSize:'0.85rem', marginTop:4 }}>No alerts need your attention right now</p>
              </div>
            ) : (
              filteredAlerts.map(alert => {
                const s = SEV[alert.severity] || SEV.warning;
                const isSelected = selectedAlert?.id === alert.id;
                return (
                  <div key={alert.id}
                    onClick={() => setSelectedAlert(isSelected ? null : alert)}
                    style={{
                      padding:'14px 16px', borderRadius:14, cursor:'pointer', transition:'all .2s',
                      background: isSelected ? s.bg : '#fafafa',
                      border:`1.5px solid ${isSelected ? s.border : '#f1f5f9'}`,
                      boxShadow: isSelected ? `0 4px 20px ${s.text}18` : '0 1px 3px rgba(0,0,0,.04)',
                    }}
                    onMouseEnter={e => { if(!isSelected){ e.currentTarget.style.background=s.bg; e.currentTarget.style.borderColor=s.border; }}}
                    onMouseLeave={e => { if(!isSelected){ e.currentTarget.style.background='#fafafa'; e.currentTarget.style.borderColor='#f1f5f9'; }}}
                  >
                    <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                      {/* severity icon */}
                      <div style={{ width:38, height:38, borderRadius:12, background:s.iconBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {alert.severity==='critical'
                          ? <Icons.AlertOctagon size={20} color={s.text}/>
                          : <Icons.AlertTriangle size={20} color={s.text}/>
                        }
                      </div>

                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                          <h3 style={{ fontWeight:700, color:'#0f172a', fontSize:'0.9rem', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                            {alert.type?.replace(/_/g,' ')?.replace(/\b\w/g,c=>c.toUpperCase())}
                          </h3>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{
                              padding:'2px 10px', borderRadius:99, fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.04em',
                              background:s.pillBg, color:s.text, border:`1px solid ${s.pillBorder}`,
                            }}>
                              {alert.severity}
                            </span>
                          </div>
                        </div>

                        <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:6, flexWrap:'wrap' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ width:26, height:26, borderRadius:7, background:deviceIconBg[alert.deviceType]||'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              {deviceIconMap(alert.deviceType, 14)}
                            </div>
                            <span style={{ fontSize:'0.8rem', color:'#64748b', fontWeight:600, textTransform:'capitalize' }}>
                              {alert.deviceType} — {alert.deviceId?.slice(-4)}
                            </span>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:4, color:'#94a3b8', fontSize:'0.75rem' }}>
                            <Icons.Clock size={12} color="#94a3b8"/>
                            {timeAgo(alert.createdAt)}
                          </div>
                        </div>

                        {alert.value != null && (
                          <div style={{ marginTop:10 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                              <span style={{ fontSize:'0.72rem', color:'#94a3b8', fontWeight:600 }}>Anomaly Score</span>
                              <span style={{ fontSize:'0.8rem', fontWeight:800, color:s.text }}>{Number(alert.value).toFixed(2)}</span>
                            </div>
                            <div style={{ height:6, borderRadius:99, background:'#f1f5f9', overflow:'hidden' }}>
                              <div style={{
                                height:'100%', borderRadius:99,
                                width:`${Math.min(100, Number(alert.value)*100).toFixed(0)}%`,
                                background:s.grad, transition:'width .6s ease',
                              }}/>
                            </div>
                          </div>
                        )}

                        {isSelected && (
                          <div style={{ marginTop:12, display:'flex', justifyContent:'flex-end', gap:8 }}>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedAlert(null); }} style={{
                              padding:'7px 14px', borderRadius:10, border:'1.5px solid #e2e8f0',
                              background:'#fff', color:'#64748b', fontSize:'0.8rem', fontWeight:700, cursor:'pointer',
                            }}>
                              Dismiss
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleResolve(alert.id); }} disabled={resolving===alert.id} style={{
                              padding:'7px 16px', borderRadius:10, border:'none',
                              background:'linear-gradient(135deg,#059669,#10b981)',
                              color:'#fff', fontSize:'0.8rem', fontWeight:700, cursor:'pointer',
                              boxShadow:'0 4px 12px rgba(5,150,105,.3)',
                              display:'flex', alignItems:'center', gap:6,
                              opacity: resolving===alert.id ? 0.7 : 1,
                            }}>
                              <Icons.CheckCircle size={14} color="white"/>
                              {resolving===alert.id ? 'Resolving…' : 'Mark Resolved'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel — Alert Detail + Resolved History */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Detail Panel */}
          <div style={{ background:'#fff', borderRadius:18, border:'1.5px solid #f1f5f9', boxShadow:'0 2px 12px rgba(0,0,0,.06)', overflow:'hidden' }}>
            <div style={{ height:4, background:'linear-gradient(90deg,#2563eb,#7c3aed)' }}/>
            <div style={{ padding:'18px 20px' }}>
              {!selectedAlert ? (
                <div style={{ padding:'48px 20px', textAlign:'center' }}>
                  <div style={{ width:64, height:64, margin:'0 auto 14px', borderRadius:'50%', background:'linear-gradient(135deg,#eff6ff,#dbeafe)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icons.Cursor size={28} color="#2563eb"/>
                  </div>
                  <p style={{ fontWeight:700, color:'#334155', fontSize:'0.95rem', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Select an alert</p>
                  <p style={{ color:'#94a3b8', fontSize:'0.82rem', marginTop:4 }}>to view details and resolve</p>
                </div>
              ) : (
                (() => {
                  const s = SEV[selectedAlert.severity] || SEV.warning;
                  return (
                    <div>
                      {/* detail header */}
                      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18, padding:'14px 16px', background:s.bg, borderRadius:14, border:`1.5px solid ${s.border}` }}>
                        <div style={{ width:44, height:44, borderRadius:14, background:s.grad, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 6px 18px ${s.text}33`, flexShrink:0 }}>
                          {selectedAlert.severity==='critical'
                            ? <Icons.AlertOctagon size={22} color="white"/>
                            : <Icons.AlertTriangle size={22} color="white"/>
                          }
                        </div>
                        <div>
                          <h3 style={{ fontWeight:700, color:s.text, fontSize:'1rem', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                            {selectedAlert.type?.replace(/_/g,' ')?.replace(/\b\w/g,c=>c.toUpperCase())}
                          </h3>
                          <p style={{ fontSize:'0.75rem', color:'#94a3b8', marginTop:2 }}>{timeAgo(selectedAlert.createdAt)}</p>
                        </div>
                      </div>

                      {/* detail fields */}
                      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        {[
                          { label:'Device Type', value: <div style={{ display:'flex', alignItems:'center', gap:6 }}><div style={{ width:26,height:26,borderRadius:8,background:deviceIconBg[selectedAlert.deviceType]||'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center' }}>{deviceIconMap(selectedAlert.deviceType,13)}</div><span style={{ textTransform:'capitalize' }}>{selectedAlert.deviceType}</span></div> },
                          { label:'Device ID',   value: <code style={{ background:'#f8fafc', padding:'2px 8px', borderRadius:6, fontSize:'0.82rem', color:'#334155' }}>{selectedAlert.deviceId}</code> },
                          { label:'Location',    value: selectedAlert.location },
                          { label:'Occurred',    value: <div style={{ display:'flex', alignItems:'center', gap:5 }}><Icons.Clock size={12} color="#94a3b8"/>{new Date(selectedAlert.createdAt).toLocaleString()}</div> },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'#f8fafc', borderRadius:10 }}>
                            <span style={{ fontSize:'0.78rem', color:'#94a3b8', fontWeight:700 }}>{label}</span>
                            <span style={{ fontSize:'0.84rem', fontWeight:600, color:'#334155' }}>{value}</span>
                          </div>
                        ))}
                      </div>

                      {/* value gauge */}
                      {selectedAlert.value != null && (
                        <div style={{ marginTop:14, padding:'14px 16px', background:'#f8fafc', borderRadius:12 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <Icons.Activity size={13} color={s.text}/>
                              <span style={{ fontSize:'0.78rem', color:'#64748b', fontWeight:700 }}>Anomaly Score</span>
                            </div>
                            <span style={{ fontSize:'1rem', fontWeight:900, color:s.text, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                              {Number(selectedAlert.value).toFixed(3)}
                            </span>
                          </div>
                          <div style={{ height:10, borderRadius:99, background:'#e2e8f0', overflow:'hidden' }}>
                            <div style={{ height:'100%', borderRadius:99, width:`${Math.min(100,Number(selectedAlert.value)*100)}%`, background:s.grad, transition:'width .6s'}}/>
                          </div>
                          <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:'0.7rem', color:'#94a3b8', fontWeight:600 }}>
                            <span>0.0 – Normal</span><span style={{ color:s.text }}>1.0 – Critical</span>
                          </div>
                        </div>
                      )}

                      <button onClick={() => handleResolve(selectedAlert.id)} disabled={resolving===selectedAlert.id} style={{
                        width:'100%', marginTop:16, padding:'12px 20px', borderRadius:12, border:'none',
                        background:'linear-gradient(135deg,#059669,#10b981)',
                        color:'#fff', fontWeight:700, fontSize:'0.9rem', cursor:'pointer',
                        boxShadow:'0 6px 20px rgba(5,150,105,.3)',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                        transition:'all .2s', opacity: resolving===selectedAlert.id ? 0.7 : 1,
                      }}>
                        <Icons.CheckCircle size={18} color="white"/>
                        {resolving===selectedAlert.id ? 'Resolving…' : 'Mark as Resolved'}
                      </button>
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          {/* Resolved History */}
          <div style={{ background:'#fff', borderRadius:18, border:'1.5px solid #f1f5f9', boxShadow:'0 2px 12px rgba(0,0,0,.06)', overflow:'hidden' }}>
            <div style={{ height:4, background:'linear-gradient(90deg,#059669,#34d399)' }}/>
            <div style={{ padding:'18px 20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#f0fdf4,#dcfce7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icons.History size={16} color="#059669"/>
                </div>
                <h3 style={{ fontWeight:700, color:'#0f172a', fontSize:'0.95rem', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Resolved History</h3>
                <span style={{
                  marginLeft:'auto', padding:'2px 10px', borderRadius:99, fontSize:'0.75rem', fontWeight:700,
                  background:'#f0fdf4', color:'#059669', border:'1px solid #bbf7d0',
                  display:'flex', alignItems:'center', gap:4,
                }}>
                  <Icons.ShieldCheck size={12} color="#059669"/> {resolvedCount}
                </span>
              </div>

              {resolvedCount === 0 ? (
                <p style={{ color:'#94a3b8', fontSize:'0.83rem', textAlign:'center', padding:'20px 0' }}>No resolved alerts yet</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {allAlerts.filter(a => a.resolved).slice(0, 5).map(alert => (
                    <div key={alert.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'#f8fafc', borderRadius:10, border:'1px solid #f1f5f9' }}>
                      <div style={{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg,#059669,#34d399)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Icons.CheckCircle size={16} color="white"/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontWeight:600, color:'#334155', fontSize:'0.83rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {alert.type?.replace(/_/g,' ')?.replace(/\b\w/g,c=>c.toUpperCase())}
                        </p>
                        <p style={{ fontSize:'0.72rem', color:'#94a3b8', marginTop:1, display:'flex', alignItems:'center', gap:3 }}>
                          <Icons.Clock size={11} color="#94a3b8"/> {timeAgo(alert.resolvedAt || alert.updatedAt)}
                        </p>
                      </div>
                      <div style={{ width:28, height:28, borderRadius:8, background:deviceIconBg[alert.deviceType]||'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {deviceIconMap(alert.deviceType, 14)}
                      </div>
                    </div>
                  ))}
                  {resolvedCount > 5 && (
                    <p style={{ textAlign:'center', color:'#94a3b8', fontSize:'0.78rem', padding:'4px 0', fontWeight:600 }}>
                      +{resolvedCount-5} more resolved alerts
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
