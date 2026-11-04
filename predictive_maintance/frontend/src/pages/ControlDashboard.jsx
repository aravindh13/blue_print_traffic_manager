import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDevices, useMetrics, useStats, useAlerts } from '../hooks/useData';
import api from '../services/api';

// ─── Professional SVG Icon Library ──────────────────────────────────────────
const Icons = {
  // Traffic signal — stylised pill with 3 lights
  Signal: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="7" y="1" width="10" height="22" rx="5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5"/>
      <circle cx="12" cy="6.5"  r="2.2" fill="#ef4444"/>
      <circle cx="12" cy="12"   r="2.2" fill="#f59e0b"/>
      <circle cx="12" cy="17.5" r="2.2" fill="#22c55e"/>
    </svg>
  ),
  // Camera / CCTV
  Camera: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 7l-7 5 7 5V7z"/>
      <rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  ),
  // Microchip / Controller
  Chip: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="7" width="10" height="10" rx="2"/>
      <path d="M7 9H4M7 12H4M7 15H4M17 9h3M17 12h3M17 15h3M9 7V4M12 7V4M15 7V4M9 17v3M12 17v3M15 17v3"/>
    </svg>
  ),
  // Grid / Dashboard
  Grid: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  // Alert / Critical
  AlertOctagon: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
      <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  // Warning triangle
  AlertTriangle: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  // Checkmark shield
  ShieldCheck: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
  // Thermometer
  Thermometer: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/>
    </svg>
  ),
  // Lightning bolt — Voltage
  Zap: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  // Radar / Anomaly
  ActivityPulse: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  // Map pin
  MapPin: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  // List / Device Status
  ListCheck: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  // Server / device grid
  Server: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/>
      <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
    </svg>
  ),
  // Play / Start
  Play: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><polygon points="5 3 19 12 5 21 5 3"/></svg>
  ),
  // Stop
  Stop: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><rect x="3" y="3" width="18" height="18" rx="3"/></svg>
  ),
  // Brain / ML
  Brain: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0012 4.5V9a3 3 0 01-3 3H6a4 4 0 000 8h.5"/>
      <path d="M14.5 2A2.5 2.5 0 0112 4.5V9a3 3 0 003 3h3a4 4 0 010 8h-.5"/>
    </svg>
  ),
  // Total count
  Hash: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
      <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
    </svg>
  ),
};

// ─── Device icon components (replaces emojis) ───────────────────────────────
const DeviceIconComp = {
  signal:         <Icons.Signal />,
  cctv:           <Icons.Camera />,
  microcontroller:<Icons.Chip />,
};

const DeviceIconSvg = {
  signal:          'signal',
  cctv:            'cctv',
  microcontroller: 'microcontroller',
};

const statusColors = {
  healthy:  '#059669',
  warning:  '#d97706',
  critical: '#dc2626',
};

// Map marker uses inline SVG (no emoji)
const markerSvgString = {
  signal:          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="7" y="1" width="10" height="22" rx="5" fill="white" fill-opacity="0.9" stroke="white" stroke-width="1.5"/><circle cx="12" cy="6.5" r="2.2" fill="#ef4444"/><circle cx="12" cy="12" r="2.2" fill="#f59e0b"/><circle cx="12" cy="17.5" r="2.2" fill="#22c55e"/></svg>`,
  cctv:            `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
  microcontroller: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M7 9H4M7 12H4M7 15H4M17 9h3M17 12h3M17 15h3"/></svg>`,
};

const createIcon = (status, type) => {
  const c = statusColors[status];
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,${c},${c}cc);border:2.5px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px ${c}80,0 0 0 4px ${c}22;animation:${status==='critical'?'pulse-dot 1s infinite':'none'};">${markerSvgString[type]||''}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// ─── Stat Card with vivid gradient icon backgrounds ─────────────────────────
function StatCard({ icon, label, value, gradient, iconBg, textColor, delta }) {
  return (
    <div style={{
      background: gradient,
      borderRadius: 18,
      padding: '20px 22px',
      border: 'none',
      boxShadow: '0 4px 20px rgba(0,0,0,.08)',
      transition: 'all .22s',
      position: 'relative',
      overflow: 'hidden',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 12px 36px rgba(0,0,0,.14)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)';    e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,.08)'; }}
    >
      {/* decorative circle */}
      <div style={{ position:'absolute',top:-20,right:-20,width:100,height:100,borderRadius:'50%',background:'rgba(255,255,255,.1)' }}/>
      <div style={{ position:'absolute',bottom:-30,right:20,width:70,height:70,borderRadius:'50%',background:'rgba(255,255,255,.07)' }}/>

      <div style={{ display:'flex', alignItems:'center', gap:14, position:'relative' }}>
        <div style={{
          width:52, height:52, borderRadius:16,
          background: iconBg,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 4px 14px rgba(0,0,0,.15)',
          flexShrink:0,
        }}>
          {icon}
        </div>
        <div>
          <p style={{ fontSize:'0.7rem', color:'rgba(255,255,255,.8)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</p>
          <p style={{ fontSize:'2.2rem', fontWeight:900, color:'#fff', lineHeight:1.05, fontFamily:"'Plus Jakarta Sans',sans-serif", letterSpacing:'-0.03em' }}>{value}</p>
          {delta !== undefined && (
            <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'rgba(255,255,255,.7)', display:'inline-block', animation:'pulse-dot 2s infinite' }}/>
              <span style={{ fontSize:'0.7rem', color:'rgba(255,255,255,.75)', fontWeight:600 }}>Auto-updating</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Chart Card with colored header bar ─────────────────────────────────────
function ChartCard({ title, subtitle, icon, accentColor, children }) {
  return (
    <div style={{
      background:'#fff',
      borderRadius:18,
      overflow:'hidden',
      boxShadow:'0 2px 12px rgba(0,0,0,.06)',
      border:'1.5px solid #f1f5f9',
      transition:'all .22s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,.06)'}
    >
      {/* coloured top accent bar */}
      <div style={{ height:4, background:`linear-gradient(90deg, ${accentColor}, ${accentColor}88)` }}/>
      <div style={{ padding:'18px 20px 14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <div style={{
            width:36, height:36, borderRadius:11,
            background:`linear-gradient(135deg,${accentColor}22,${accentColor}11)`,
            border:`1.5px solid ${accentColor}33`,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            {icon}
          </div>
          <div>
            <h3 style={{ fontWeight:700, color:'#0f172a', fontSize:'0.92rem', fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.2 }}>{title}</h3>
            {subtitle && <p style={{ fontSize:'0.7rem', color:'#94a3b8', fontWeight:600, marginTop:1 }}>{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

const tooltipStyle = {
  contentStyle: {
    background:'#fff', border:'1.5px solid #e2e8f0',
    borderRadius:12, boxShadow:'0 4px 20px rgba(15,23,42,.10)',
    fontSize:'0.8rem', color:'#334155',
  },
};

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function ControlDashboard() {
  const { devices, loading: devicesLoading } = useDevices();
  const { stats,   loading: statsLoading   } = useStats();
  const { alerts }                           = useAlerts();
  const { latestMetric }                     = useMetrics();

  const [simulatorStatus, setSimulatorStatus] = useState({ running: false, mlEnabled: true });
  const [deviceMetrics,   setDeviceMetrics]   = useState({});
  const [metricsHistory,  setMetricsHistory]  = useState([]);
  const [selectedDevice,  setSelectedDevice]  = useState(null);

  useEffect(() => { api.getSimulatorStatus().then(setSimulatorStatus); }, []);

  useEffect(() => {
    if (latestMetric?.deviceId) {
      const { deviceId, temperature, voltage, errorRate, uptime, anomalyScore } = latestMetric;
      setDeviceMetrics(prev => ({ ...prev, [deviceId]: { temperature, voltage, errorRate, uptime, anomalyScore, timestamp: latestMetric.timestamp } }));
      setMetricsHistory(prev => [{ ...latestMetric, time: new Date().toLocaleTimeString(), index: prev.length }, ...prev.slice(0, 49)]);
    }
  }, [latestMetric]);

  const startSimulator = async () => { await api.startSimulator(); setSimulatorStatus({ running: true,  mlEnabled: true  }); };
  const stopSimulator  = async () => { await api.stopSimulator();  setSimulatorStatus({ running: false, mlEnabled: false }); };
  const toggleML       = async () => { const r = await api.toggleML(); setSimulatorStatus(p => ({ ...p, mlEnabled: r.mlEnabled })); };

  const criticalDevices = devices.filter(d => d.status === 'critical');
  const warningDevices  = devices.filter(d => d.status === 'warning');
  const healthyDevices  = devices.filter(d => d.status === 'healthy');
  const loading         = devicesLoading || statsLoading;

  const chartData = metricsHistory.slice(0, 20).map((m, i) => ({
    name: i, temperature: m.temperature||0, voltage: m.voltage||0, score: m.anomalyScore||0,
  }));

  if (loading) return (
    <div style={{ minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{
          width:72, height:72, margin:'0 auto 20px', borderRadius:'50%',
          background:'linear-gradient(135deg,#2563eb,#7c3aed)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 12px 40px rgba(37,99,235,.35)',
          animation:'pulse-dot 1.8s ease-in-out infinite',
        }}>
          <Icons.Zap size={30} color="white"/>
        </div>
        <p style={{ color:'#64748b', fontWeight:600, fontSize:'0.95rem' }}>Loading dashboard…</p>
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
            background:'linear-gradient(135deg,#2563eb,#7c3aed)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 8px 24px rgba(37,99,235,.35)',
          }}>
            <Icons.Grid size={26} color="white"/>
          </div>
          <div>
            <h1 style={{
              fontSize:'1.8rem', fontWeight:900, lineHeight:1.1,
              fontFamily:"'Plus Jakarta Sans',sans-serif",
              background:'linear-gradient(135deg,#0f172a,#2563eb,#7c3aed)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            }}>Control Dashboard</h1>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', display:'inline-block', animation:'pulse-dot 2s infinite' }}/>
              <p style={{ color:'#64748b', fontSize:'0.85rem', fontWeight:500 }}>
                Real-time monitoring across {devices.length} devices
              </p>
            </div>
          </div>
        </div>

        <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:10 }}>
          {simulatorStatus.running ? (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:99, background:'#f0fdf4', border:'1.5px solid #bbf7d0' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', animation:'pulse-dot 1.5s infinite', display:'inline-block' }}/>
                <span style={{ color:'#059669', fontWeight:700, fontSize:'0.82rem' }}>LIVE</span>
              </div>
              <button onClick={stopSimulator} style={{
                padding:'10px 20px', borderRadius:12,
                background:'linear-gradient(135deg,#dc2626,#e11d48)',
                border:'none', color:'#fff', fontSize:'0.85rem', fontWeight:700,
                cursor:'pointer', boxShadow:'0 4px 16px rgba(220,38,38,.3)',
                display:'flex', alignItems:'center', gap:8, transition:'all .2s',
              }}>
                <Icons.Stop size={14} color="white"/> Stop Monitoring
              </button>
            </>
          ) : (
            <button onClick={startSimulator} style={{
              padding:'10px 20px', borderRadius:12,
              background:'linear-gradient(135deg,#059669,#10b981)',
              border:'none', color:'#fff', fontSize:'0.85rem', fontWeight:700,
              cursor:'pointer', boxShadow:'0 4px 16px rgba(5,150,105,.3)',
              display:'flex', alignItems:'center', gap:8, transition:'all .2s',
            }}>
              <Icons.Play size={14} color="white"/> Start Monitoring
            </button>
          )}

          <button onClick={toggleML} style={{
            padding:'10px 18px', borderRadius:12, fontSize:'0.85rem', fontWeight:700,
            border:'1.5px solid', cursor:'pointer', transition:'all .2s',
            display:'flex', alignItems:'center', gap:8,
            borderColor: simulatorStatus.mlEnabled ? '#ddd6fe' : '#e2e8f0',
            background:  simulatorStatus.mlEnabled ? 'linear-gradient(135deg,#ede9fe,#faf5ff)' : '#f8fafc',
            color:       simulatorStatus.mlEnabled ? '#7c3aed' : '#64748b',
          }}>
            <Icons.Brain size={16} color={simulatorStatus.mlEnabled ? '#7c3aed' : '#94a3b8'}/>
            ML {simulatorStatus.mlEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      {/* ── Vivid Stat Cards ─────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:14 }}>
        <StatCard
          icon={<Icons.Hash size={24} color="white"/>}
          label="Total Devices" value={stats?.totalDevices || devices.length}
          gradient="linear-gradient(135deg,#2563eb 0%,#3b82f6 100%)"
          iconBg="rgba(255,255,255,.2)" delta
        />
        <StatCard
          icon={<Icons.AlertOctagon size={24} color="white"/>}
          label="Critical" value={criticalDevices.length}
          gradient="linear-gradient(135deg,#dc2626 0%,#f87171 100%)"
          iconBg="rgba(255,255,255,.2)"
        />
        <StatCard
          icon={<Icons.AlertTriangle size={24} color="white"/>}
          label="Warning" value={warningDevices.length}
          gradient="linear-gradient(135deg,#d97706 0%,#fbbf24 100%)"
          iconBg="rgba(255,255,255,.2)"
        />
        <StatCard
          icon={<Icons.ShieldCheck size={24} color="white"/>}
          label="Healthy" value={healthyDevices.length}
          gradient="linear-gradient(135deg,#059669 0%,#34d399 100%)"
          iconBg="rgba(255,255,255,.2)"
        />
      </div>

      {/* ── Critical Alert Banner ─────────────────────────────────────────── */}
      {criticalDevices.length > 0 && (
        <div style={{
          background:'linear-gradient(135deg,#fff5f5,#fef2f2)',
          border:'1.5px solid #fca5a5', borderRadius:16,
          padding:'16px 20px',
          display:'flex', alignItems:'center', gap:16,
          boxShadow:'0 4px 20px rgba(220,38,38,.08)',
        }}>
          <div style={{
            width:46, height:46, borderRadius:'50%',
            background:'linear-gradient(135deg,#dc2626,#f87171)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 16px rgba(220,38,38,.35)', flexShrink:0,
            animation:'pulse-dot 1.2s infinite',
          }}>
            <Icons.AlertOctagon size={22} color="white"/>
          </div>
          <div style={{ flex:1 }}>
            <h3 style={{ fontWeight:700, color:'#b91c1c', fontSize:'0.95rem', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              Immediate Attention Required
            </h3>
            <p style={{ color:'#64748b', fontSize:'0.84rem', marginTop:2 }}>
              {criticalDevices.length} device(s) in critical state — check Device Status panel
            </p>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {criticalDevices.slice(0, 3).map(d => (
              <span key={d.id} style={{
                padding:'4px 12px', background:'#fef2f2', border:'1px solid #fca5a5',
                borderRadius:99, fontSize:'0.75rem', color:'#dc2626', fontWeight:700,
                display:'flex', alignItems:'center', gap:4,
              }}>
                <Icons.Chip size={11} color="#dc2626"/> {d.type}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Map + Device List ─────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>

        {/* Map */}
        <div className="card" style={{ padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#eff6ff,#dbeafe)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icons.MapPin size={18} color="#2563eb"/>
              </div>
              <h2 style={{ fontWeight:700, color:'#0f172a', fontSize:'1rem', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                Device Locations
              </h2>
            </div>
            <div style={{ display:'flex', gap:10, fontSize:'0.75rem', color:'#64748b' }}>
              {[['#059669','Healthy'],['#d97706','Warning'],['#dc2626','Critical']].map(([c,l]) => (
                <span key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:c, display:'inline-block' }}/> {l}
                </span>
              ))}
            </div>
          </div>
          <div style={{ height:320, borderRadius:12, overflow:'hidden', border:'1.5px solid #e2e8f0' }}>
            <MapContainer center={[40.7128,-74.006]} zoom={11} style={{ height:'100%', width:'100%' }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="©OpenStreetMap"/>
              {devices.map(device => (
                <Marker key={device.id} position={[device.latitude,device.longitude]}
                  icon={createIcon(device.status, device.type)}
                  eventHandlers={{ click: () => setSelectedDevice(device) }}
                >
                  <Popup>
                    <div style={{ padding:6, minWidth:160 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                        <div style={{ width:28, height:28, borderRadius:8, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {DeviceIconComp[device.type]}
                        </div>
                        <p style={{ fontWeight:700, color:'#0f172a', textTransform:'capitalize' }}>{device.type}</p>
                      </div>
                      <p style={{ fontSize:'0.82rem', color:'#64748b' }}>{device.location}</p>
                      <span style={{
                        display:'inline-block', marginTop:8,
                        padding:'2px 10px', borderRadius:99, fontSize:'0.72rem', fontWeight:700,
                        background: device.status==='healthy'?'#f0fdf4':device.status==='warning'?'#fffbeb':'#fef2f2',
                        color: device.status==='healthy'?'#059669':device.status==='warning'?'#d97706':'#dc2626',
                        border:`1px solid ${device.status==='healthy'?'#bbf7d0':device.status==='warning'?'#fde68a':'#fecaca'}`,
                      }}>
                        {device.status.toUpperCase()}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Device List */}
        <div className="card" style={{ padding:20, display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#f0fdf4,#dcfce7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icons.ListCheck size={18} color="#059669"/>
            </div>
            <h2 style={{ fontWeight:700, color:'#0f172a', fontSize:'1rem', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Device Status</h2>
          </div>
          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:10, maxHeight:340, paddingRight:2 }}>
            {devices.map(device => {
              const live = deviceMetrics[device.id];
              const isSelected = selectedDevice?.id === device.id;
              return (
                <div key={device.id} onClick={() => setSelectedDevice(device)}
                  style={{
                    padding:'12px 14px', borderRadius:12, cursor:'pointer', transition:'all .2s',
                    border:`1.5px solid ${isSelected?'#bfdbfe':'#f1f5f9'}`,
                    background: isSelected ? '#eff6ff' : '#fff',
                    boxShadow: isSelected ? '0 0 0 3px rgba(37,99,235,.08)' : 'none',
                  }}
                  onMouseEnter={e => { if(!isSelected){ e.currentTarget.style.background='#f8fafc'; e.currentTarget.style.borderColor='#e2e8f0'; }}}
                  onMouseLeave={e => { if(!isSelected){ e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor='#f1f5f9'; }}}
                >
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{
                        width:36, height:36, borderRadius:10,
                        background: device.type==='signal'?'linear-gradient(135deg,#eff6ff,#dbeafe)':device.type==='cctv'?'linear-gradient(135deg,#f5f3ff,#ede9fe)':'linear-gradient(135deg,#f0fdf4,#dcfce7)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        {device.type==='signal'
                          ? <Icons.Signal size={20} color="#2563eb"/>
                          : device.type==='cctv'
                          ? <Icons.Camera size={18} color="#7c3aed"/>
                          : <Icons.Chip size={18} color="#059669"/>
                        }
                      </div>
                      <div>
                        <p style={{ fontWeight:600, color:'#0f172a', fontSize:'0.85rem', textTransform:'capitalize' }}>{device.type}</p>
                        <p style={{ fontSize:'0.72rem', color:'#94a3b8' }}>{device.location?.split(',')[0]}</p>
                      </div>
                    </div>
                    <span style={{
                      padding:'2px 10px', borderRadius:99, fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em',
                      background: device.status==='healthy'?'#f0fdf4':device.status==='warning'?'#fffbeb':'#fef2f2',
                      color:      device.status==='healthy'?'#059669':device.status==='warning'?'#d97706':'#dc2626',
                      border:`1px solid ${device.status==='healthy'?'#bbf7d0':device.status==='warning'?'#fde68a':'#fecaca'}`,
                    }}>
                      {device.status}
                    </span>
                  </div>
                  {live && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginTop:10, paddingTop:10, borderTop:'1px solid #f1f5f9' }}>
                      {[
                        { label:'Temp',  val:`${live.temperature?.toFixed(1)}°`, color:'#0891b2', icon:<Icons.Thermometer size={11} color="#0891b2"/> },
                        { label:'Volt',  val:`${live.voltage?.toFixed(0)}V`,     color:'#7c3aed', icon:<Icons.Zap size={11} color="#7c3aed"/> },
                        { label:'Score', val:live.anomalyScore?.toFixed(2),
                          color: live.anomalyScore>0.7?'#dc2626':live.anomalyScore>0.4?'#d97706':'#059669',
                          icon:<Icons.ActivityPulse size={11} color={live.anomalyScore>0.7?'#dc2626':live.anomalyScore>0.4?'#d97706':'#059669'}/> },
                      ].map(({ label, val, color, icon }) => (
                        <div key={label} style={{ textAlign:'center' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:3, marginBottom:2 }}>
                            {icon}
                            <p style={{ fontSize:'0.65rem', color:'#94a3b8' }}>{label}</p>
                          </div>
                          <p style={{ fontWeight:700, color, fontSize:'0.82rem' }}>{val}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:14 }}>
        <ChartCard title="Temperature" subtitle="°C over time" accentColor="#0891b2" icon={<Icons.Thermometer size={18} color="#0891b2"/>}>
          <ResponsiveContainer width="100%" height={155}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="tempG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#0891b2" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="#0891b2" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey="name" stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false}/>
              <YAxis stroke="#cbd5e1" domain={[0,100]} fontSize={10} tickLine={false} axisLine={false}/>
              <Tooltip {...tooltipStyle}/>
              <Area type="monotone" dataKey="temperature" stroke="#0891b2" strokeWidth={2.5} fill="url(#tempG)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Voltage" subtitle="Volts over time" accentColor="#7c3aed" icon={<Icons.Zap size={18} color="#7c3aed"/>}>
          <ResponsiveContainer width="100%" height={155}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="voltG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#7c3aed" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey="name" stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false}/>
              <YAxis stroke="#cbd5e1" domain={[200,260]} fontSize={10} tickLine={false} axisLine={false}/>
              <Tooltip {...tooltipStyle}/>
              <Area type="monotone" dataKey="voltage" stroke="#7c3aed" strokeWidth={2.5} fill="url(#voltG)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Anomaly Score" subtitle="ML detection index" accentColor="#d97706" icon={<Icons.ActivityPulse size={18} color="#d97706"/>}>
          <ResponsiveContainer width="100%" height={155}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="scoreG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#d97706" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="#d97706" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey="name" stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false}/>
              <YAxis stroke="#cbd5e1" domain={[0,1]} fontSize={10} tickLine={false} axisLine={false}/>
              <Tooltip {...tooltipStyle}/>
              <Area type="monotone" dataKey="score" stroke="#d97706" strokeWidth={2.5} fill="url(#scoreG)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Live Device Grid ──────────────────────────────────────────────── */}
      <div style={{ background:'#fff', borderRadius:18, padding:22, boxShadow:'0 2px 12px rgba(0,0,0,.06)', border:'1.5px solid #f1f5f9' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#faf5ff,#ede9fe)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icons.Server size={18} color="#7c3aed"/>
            </div>
            <h2 style={{ fontWeight:700, color:'#0f172a', fontSize:'1rem', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Live Device Grid</h2>
          </div>
          <span style={{ fontSize:'0.78rem', color:'#94a3b8', background:'#f8fafc', padding:'4px 12px', borderRadius:99, border:'1px solid #e2e8f0', fontWeight:600 }}>
            Auto-refresh · 5s
          </span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:12 }}>
          {devices.slice(0, 10).map(device => {
            const live   = deviceMetrics[device.id];
            const score  = live?.anomalyScore || 0;
            const isCrit = score > 0.7;
            const isWarn = score > 0.4 && !isCrit;

            // per-type color scheme
            const typeGrad = device.type==='signal'
              ? { bg:'linear-gradient(135deg,#eff6ff,#dbeafe)', border:'#bfdbfe', iconColor:'#2563eb' }
              : device.type==='cctv'
              ? { bg:'linear-gradient(135deg,#f5f3ff,#ede9fe)', border:'#ddd6fe', iconColor:'#7c3aed' }
              : { bg:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'#bbf7d0', iconColor:'#059669' };

            const alertStyle = isCrit
              ? { bg:'linear-gradient(135deg,#fff5f5,#fef2f2)', border:'#fca5a5' }
              : isWarn
              ? { bg:'linear-gradient(135deg,#fffdf0,#fffbeb)', border:'#fde68a' }
              : null;

            return (
              <div key={device.id}
                style={{
                  padding:14, borderRadius:14, transition:'all .2s', cursor:'default',
                  background: alertStyle ? alertStyle.bg : typeGrad.bg,
                  border: `1.5px solid ${alertStyle ? alertStyle.border : typeGrad.border}`,
                  boxShadow:'0 1px 4px rgba(0,0,0,.05)',
                }}
                onMouseEnter={e => e.currentTarget.style.transform='translateY(-3px)'}
                onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
              >
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,.7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {device.type==='signal'
                        ? <Icons.Signal size={16} color={typeGrad.iconColor}/>
                        : device.type==='cctv'
                        ? <Icons.Camera size={15} color={typeGrad.iconColor}/>
                        : <Icons.Chip   size={15} color={typeGrad.iconColor}/>
                      }
                    </div>
                    <span style={{ fontSize:'0.76rem', fontWeight:700, color:'#334155', textTransform:'capitalize' }}>{device.type}</span>
                  </div>
                  <span style={{
                    width:10, height:10, borderRadius:'50%', display:'inline-block',
                    background: device.status==='healthy'?'#22c55e':device.status==='warning'?'#f59e0b':'#ef4444',
                    boxShadow: `0 0 0 3px ${device.status==='healthy'?'#dcfce7':device.status==='warning'?'#fef3c7':'#fee2e2'}`,
                    animation: device.status!=='healthy' ? 'pulse-dot 1.5s infinite' : 'none',
                  }}/>
                </div>

                <p style={{ fontSize:'0.7rem', color:'#94a3b8', marginBottom:10, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {device.location}
                </p>

                {[
                  { icon:<Icons.Thermometer size={11} color="#0891b2"/>, val: live?.temperature?.toFixed(1)?`${live.temperature.toFixed(1)}°C`:'--', color:'#0891b2' },
                  { icon:<Icons.Zap         size={11} color="#7c3aed"/>, val: live?.voltage?.toFixed(1)?`${live.voltage.toFixed(1)}V`:'--',       color:'#7c3aed' },
                  { icon:<Icons.ActivityPulse size={11} color={isCrit?'#dc2626':isWarn?'#d97706':'#059669'}/>,
                    val: live?.anomalyScore!=null?live.anomalyScore.toFixed(2):'0.00',
                    color: isCrit?'#dc2626':isWarn?'#d97706':'#059669' },
                ].map(({ icon, val, color }, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.72rem', color:'#94a3b8' }}>{icon}</span>
                    <span style={{ fontSize:'0.8rem', fontWeight:700, color }}>{val}</span>
                  </div>
                ))}

                {/* Score bar */}
                <div style={{ height:5, borderRadius:99, background:'rgba(0,0,0,.06)', marginTop:10, overflow:'hidden' }}>
                  <div style={{
                    height:'100%', borderRadius:99,
                    width:`${(score*100).toFixed(0)}%`,
                    background: isCrit
                      ? 'linear-gradient(90deg,#dc2626,#f87171)'
                      : isWarn
                      ? 'linear-gradient(90deg,#d97706,#fbbf24)'
                      : 'linear-gradient(90deg,#059669,#34d399)',
                    transition:'width .6s ease',
                  }}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
