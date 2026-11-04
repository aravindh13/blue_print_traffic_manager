import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Map from './Map';

export default function DriverDashboard({ driver, token, onLogout }) {
  const [ambulance, setAmbulance] = useState(null);
  const [assignedIncident, setAssignedIncident] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [routes, setRoutes] = useState({});
  const [simulating, setSimulating] = useState(false);
  const [hospitalRec, setHospitalRec] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

  useEffect(() => {
    const newSocket = io(WS_URL);
    setSocket(newSocket);

    newSocket.on('incident:assigned', ({ incident }) => {
      if (incident.assignedAmbulance?._id === driver.id) {
        setAssignedIncident(incident);
        setHospitalRec(null);
        setRoutes({});
        setSimulating(false);
      }
    });

    newSocket.on('incident:enroute', ({ incidentId, ambulanceId }) => {
      if (ambulanceId === driver.id) {
        setAssignedIncident(prev => prev ? { ...prev, status: 'enroute' } : null);
        setAmbulance(prev => prev ? { ...prev, status: 'busy' } : null);
        setSimulating(true);
      }
    });

    newSocket.on('ambulance:moved', ({ ambulanceId, lat, lng }) => {
      if (ambulanceId === driver.id) {
        setAmbulance(prev => prev ? { ...prev, lat, lng } : null);
      }
    });

    newSocket.on('incident:arrived', ({ incidentId }) => {
      setAssignedIncident(null);
      setRoutes({});
      setSimulating(false);
    });

    newSocket.on('route:update', ({ ambulanceId, route }) => {
      if (ambulanceId === driver.id) {
        setRoutes({ [ambulanceId]: route });
      }
    });

    newSocket.on('sim:started', ({ ambulanceId }) => {
      if (ambulanceId === driver.id) {
        setSimulating(true);
      }
    });

    newSocket.on('hospital:recommended', ({ hospitalRec, route }) => {
      setHospitalRec(hospitalRec);
      if (route) setRoutes({ hospitalRoute: route });
    });

    newSocket.on('sim:stopped', ({ ambulanceId }) => {
      if (ambulanceId === driver.id) {
        setSimulating(false);
        setRoutes({});
      }
    });

    newSocket.on('signal:changed', ({ id, state, lat, lng }) => {
      setSignals(prev => prev.map(s => s._id === id ? { ...s, state, lat: lat || s.lat, lng: lng || s.lng } : s));
    });

    return () => newSocket.disconnect();
  }, [driver.id, WS_URL]);

  useEffect(() => {
    fetch(API_URL + '/api/ambulances', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const amb = data.find(a => a._id === driver.id);
          if (amb) {
            setAmbulance(amb);
            if (amb.assignedIncident) setAssignedIncident(amb.assignedIncident);
            if (amb.assignedIncident) setSimulating(true);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch(API_URL + '/api/hospitals').then(res => res.json()).then(data => setHospitals(Array.isArray(data) ? data : []));
    fetch(API_URL + '/api/signals').then(res => res.json()).then(data => setSignals(Array.isArray(data) ? data : []));
  }, [driver.id, token, API_URL]);

  const handleAccept = () => {
    if (!assignedIncident || !socket) return;
    socket.emit('driver:accept', { ambulanceId: driver.id });
  };

  const handleReject = () => {
    if (!assignedIncident || !socket) return;
    socket.emit('driver:reject', { ambulanceId: driver.id });
    setAssignedIncident(null);
    setSimulating(false);
    setRoutes({});
  };

  const handleStop = () => {
    if (!socket) return;
    socket.emit('driver:stop', { ambulanceId: driver.id });
    setSimulating(false);
    setRoutes({});
  };

  const handleStatusChange = async (status) => {
    try {
      const res = await fetch(API_URL + '/api/ambulances/' + driver.id + '/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const data = await res.json();
        setAmbulance(data);
      }
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '16px', animation: 'spin 1.5s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="#e0f2fe" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#0284c7" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <p style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '14px' }}>Loading Driver Portal...</p>
        </div>
      </div>
    );
  }

  const isAvailable = ambulance && ambulance.status === 'available';
  const isOffline = ambulance && ambulance.status === 'offline';
  const preemptedSignals = (signals || []).filter(s => s.lockedBy && s.lockedBy._id === (ambulance && ambulance._id));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header ── */}
      <header className="glass-header" style={{ padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 4px 8px rgba(2,132,199,0.35))' }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="url(#gd_head)" />
            <path d="M9 11.5h6m-3-3v6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            <defs>
              <linearGradient id="gd_head" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38bdf8" />
                <stop offset="1" stopColor="#0284c7" />
              </linearGradient>
            </defs>
          </svg>
          <div>
            <h1 style={{ fontSize: '21px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px', background: 'linear-gradient(135deg, #0284c7, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Driver Portal
            </h1>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              {driver.name} • {driver.vehicleNumber}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            padding: '7px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px',
            background: isAvailable ? 'linear-gradient(135deg,#dcfce7,#bbf7d0)' : 'linear-gradient(135deg,#fee2e2,#fecaca)',
            color: isAvailable ? '#059669' : '#dc2626',
            border: isAvailable ? '1px solid rgba(5,150,105,0.3)' : '1px solid rgba(220,38,38,0.3)'
          }}>
            {isAvailable ? '● Available' : isOffline ? '○ Offline' : '● On Duty'}
          </div>
          <button
            onClick={onLogout}
            style={{
              padding: '9px 20px', borderRadius: '10px', border: '1px solid rgba(15,23,42,0.1)',
              background: '#f8fafc', color: '#475569', fontWeight: '600', fontSize: '13px',
              cursor: 'pointer', transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => { e.target.style.background = '#f1f5f9'; e.target.style.color = '#0f172a'; }}
            onMouseLeave={e => { e.target.style.background = '#f8fafc'; e.target.style.color = '#475569'; }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px', width: '100%', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', alignItems: 'start' }}>

          {/* Map */}
          <div className="glass-panel" style={{ borderRadius: '20px', overflow: 'hidden', height: '640px', padding: 0 }}>
            <Map
              ambulances={ambulance ? [ambulance] : []}
              incidents={assignedIncident ? [assignedIncident] : []}
              hospitals={hospitals}
              signals={signals}
              socket={socket}
              routes={routes}
              recommendedHospital={hospitalRec}
            />
          </div>

          {/* Right Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* ── Status Card ── */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#e0f2fe,#bae6fd)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#0f172a' }}>Your Status</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border: '1px solid rgba(2,132,199,0.2)' }}>
                  <div style={{ fontSize: '10px', color: '#0284c7', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Vehicle</div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#0284c7' }}>{ambulance ? ambulance.vehicleNumber : '—'}</div>
                </div>
                <div style={{ padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: '1px solid rgba(15,23,42,0.07)' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Location</div>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: '600', color: '#334155' }}>
                    {ambulance ? `${ambulance.lat.toFixed(4)}, ${ambulance.lng.toFixed(4)}` : '—'}
                  </div>
                </div>
              </div>

              {/* Status Toggle Buttons — FIXED */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleStatusChange('available')}
                  style={{
                    flex: 1, padding: '13px 0', borderRadius: '12px', border: 'none',
                    fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s ease',
                    background: isAvailable
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                    color: isAvailable ? '#ffffff' : '#64748b',
                    boxShadow: isAvailable ? '0 4px 12px rgba(16,185,129,0.35)' : '0 1px 3px rgba(0,0,0,0.06)',
                    transform: isAvailable ? 'translateY(-1px)' : 'none'
                  }}
                >
                  ✓ Available
                </button>
                <button
                  onClick={() => handleStatusChange('offline')}
                  style={{
                    flex: 1, padding: '13px 0', borderRadius: '12px', border: 'none',
                    fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s ease',
                    background: isOffline
                      ? 'linear-gradient(135deg, #64748b, #475569)'
                      : 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                    color: isOffline ? '#ffffff' : '#64748b',
                    boxShadow: isOffline ? '0 4px 12px rgba(71,85,105,0.35)' : '0 1px 3px rgba(0,0,0,0.06)',
                    transform: isOffline ? 'translateY(-1px)' : 'none'
                  }}
                >
                  ○ Offline
                </button>
              </div>
            </div>

            {/* ── Incident Card ── */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#fff1f2,#fecdd3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1" fill="#e11d48"/></svg>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#0f172a' }}>Incident Request</h3>
              </div>

              {assignedIncident ? (
                <div>
                  {/* Incident detail card */}
                  <div style={{
                    padding: '16px', borderRadius: '14px', marginBottom: '16px',
                    background: assignedIncident.severity >= 4
                      ? 'linear-gradient(135deg,#fff1f2,#ffe4e6)'
                      : 'linear-gradient(135deg,#fffbeb,#fef3c7)',
                    border: assignedIncident.severity >= 4
                      ? '1px solid rgba(225,29,72,0.3)'
                      : '1px solid rgba(217,119,6,0.3)',
                    borderLeft: assignedIncident.severity >= 4
                      ? '4px solid #e11d48'
                      : '4px solid #d97706'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800',
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                        background: assignedIncident.severity >= 4 ? '#e11d48' : '#d97706',
                        color: '#fff'
                      }}>
                        Level {assignedIncident.severity}
                      </span>
                      <span style={{
                        fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px',
                        color: assignedIncident.severity >= 4 ? '#e11d48' : '#d97706'
                      }}>
                        {assignedIncident.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '6px', color: '#0f172a' }}>
                      {assignedIncident.description || 'Emergency Response Required'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace', fontWeight: '500' }}>
                      📍 {assignedIncident.lat.toFixed(4)}, {assignedIncident.lng.toFixed(4)}
                    </div>
                  </div>

                  {/* Accept / Reject */}
                  {assignedIncident.status === 'assigned' && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={handleAccept}
                        style={{
                          flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(16,185,129,0.35)', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.target.style.transform = 'none'}
                      >
                        ✓ Accept Dispatch
                      </button>
                      <button
                        onClick={handleReject}
                        style={{
                          flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                          background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                          color: '#64748b', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.06)', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.target.style.background = 'linear-gradient(135deg,#fee2e2,#fecaca)'; e.target.style.color = '#dc2626'; }}
                        onMouseLeave={e => { e.target.style.background = 'linear-gradient(135deg,#f1f5f9,#e2e8f0)'; e.target.style.color = '#64748b'; }}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}

                  {/* En Route */}
                  {(assignedIncident.status === 'enroute' || simulating) && (
                    <div>
                      <div style={{
                        padding: '16px', borderRadius: '14px', marginBottom: '14px',
                        background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)',
                        border: '1px solid rgba(2,132,199,0.25)', textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '13px', color: '#0284c7', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0284c7', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
                          En Route to Incident
                        </div>
                        {simulating && <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '5px', fontWeight: '600' }}>🛰 Live Navigation Active</div>}
                      </div>

                      {/* FIXED Stop Navigation button */}
                      <button
                        onClick={handleStop}
                        style={{
                          width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(217,119,6,0.35)', transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                        onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.target.style.transform = 'none'}
                      >
                        ⬛ Stop Navigation
                      </button>
                    </div>
                  )}
                </div>
              ) : hospitalRec ? (
                <div style={{
                  padding: '18px', borderRadius: '14px',
                  background: 'linear-gradient(135deg,#faf5ff,#f3e8ff)',
                  border: '1px solid rgba(124,58,237,0.25)', borderLeft: '4px solid #7c3aed'
                }}>
                  <div style={{ fontSize: '11px', color: '#7c3aed', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Hospital Routing Active
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                    {hospitalRec.hospital ? hospitalRec.hospital.name : ''}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', borderRadius: '14px', border: '2px dashed rgba(15,23,42,0.1)', background: 'rgba(248,250,252,0.5)' }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.4 }}>📡</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>Awaiting dispatch assignment...</div>
                </div>
              )}
            </div>

            {/* ── Green Corridor Active ── */}
            {preemptedSignals.length > 0 && (
              <div style={{
                padding: '18px 20px', borderRadius: '16px',
                background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)',
                border: '1px solid rgba(16,185,129,0.3)', borderLeft: '4px solid #10b981'
              }}>
                <div style={{ fontSize: '13px', color: '#059669', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🚦 Green Corridor Active
                  <span style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: '20px', background: '#10b981', color: '#fff', fontSize: '12px', fontWeight: '800' }}>
                    {preemptedSignals.length}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#34d399', marginTop: '4px', fontWeight: '500' }}>
                  {preemptedSignals.length} signal{preemptedSignals.length > 1 ? 's' : ''} preempted on your route
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
