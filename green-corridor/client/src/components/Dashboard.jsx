import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Map from './Map';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [activeTab, setActiveTab] = useState('map');
  const [preemptedSignals, setPreemptedSignals] = useState([]);
  const [hospitalRec, setHospitalRec] = useState(null);
  const [deadlockStatus, setDeadlockStatus] = useState({ activeLocks: [], waitQueues: [], totalLocks: 0, totalWaiting: 0 });
  const [newIncident, setNewIncident] = useState({ lat: '12.9716', lng: '77.5946', severity: 3, description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [clickMode, setClickMode] = useState(false);
  const [routes, setRoutes] = useState({});

  useEffect(() => {
    const sock = io(API_URL, { reconnection: true, reconnectionDelay: 1000, reconnectionAttempts: 10 });
    setSocket(sock);

    sock.on('incident:assigned', (inc) => {
      setHospitalRec(null);
      setRoutes({});
      setIncidents(prev => {
        const exists = prev.find(i => i._id === (inc._id || inc.incidentId));
        return exists ? prev.map(i => i._id === inc._id ? inc : i) : [inc, ...prev];
      });
      setStatusMsg('Ambulance dispatched');
    });

    sock.on('incident:enroute', ({ incidentId }) => {
      setIncidents(prev => prev.map(i => i._id === incidentId ? { ...i, status: 'enroute' } : i));
    });

    sock.on('incident:arrived', ({ incidentId }) => {
      setIncidents(prev => prev.filter(i => i._id !== incidentId));
    });

    sock.on('hospital:recommended', ({ hospitalRec, route }) => {
      setHospitalRec(hospitalRec);
      if (route) setRoutes(prev => ({ ...prev, hospitalRoute: route }));
    });

    sock.on('incident:resolved', ({ incidentId }) => {
      setIncidents(prev => prev.filter(i => i._id !== incidentId));
      setAmbulances(prev => prev.map(a => {
        const assigned = a.assignedIncident?._id || a.assignedIncident;
        return assigned === incidentId ? { ...a, status: 'available', assignedIncident: null } : a;
      }));
      setPreemptedSignals([]);
      setRoutes({});
      setHospitalRec(null);
      setStatusMsg('');
    });

    sock.on('incident:arrived', ({ incidentId }) => {
      setIncidents(prev => prev.filter(i => i._id !== incidentId));
      setRoutes({});
    });

    sock.on('ambulance:moved', ({ ambulanceId, lat, lng }) => {
      setAmbulances(prev => prev.map(a => a._id === ambulanceId ? { ...a, lat, lng } : a));
    });

    sock.on('ambulance:status', ({ ambulanceId, status }) => {
      setAmbulances(prev => prev.map(a => a._id === ambulanceId ? { ...a, status } : a));
    });

    sock.on('signal:changed', ({ id, state, lat, lng }) => {
      setSignals(prev => prev.map(s => s._id === id ? { ...s, state, lat: lat || s.lat, lng: lng || s.lng } : s));
      if (state === 'green') {
        setPreemptedSignals(prev => {
          const exists = prev.find(p => p.id === id);
          if (!exists) return [...prev, { id, timestamp: Date.now() }];
          return prev;
        });
        setTimeout(() => setPreemptedSignals(prev => prev.filter(p => p.id !== id)), 30000);
      }
    });

    sock.on('sim:started', ({ ambulanceId, type }) => {
      console.log('Simulation started for', ambulanceId, 'type:', type);
    });

    sock.on('sim:stopped', ({ ambulanceId }) => {
      console.log('Simulation stopped for', ambulanceId);
    });

    sock.on('route:update', ({ ambulanceId, route }) => {
      setRoutes({ [ambulanceId]: route });
    });

    return () => sock.close();
  }, []);

  const fetchDeadlockStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/deadlock/status`);
      const data = await res.json();
      setDeadlockStatus(data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [iR, aR, hR, sR] = await Promise.all([
          fetch(`${API_URL}/api/incidents`),
          fetch(`${API_URL}/api/ambulances`),
          fetch(`${API_URL}/api/hospitals`),
          fetch(`${API_URL}/api/signals`),
        ]);
        const [inc, amb, hosp, sig] = await Promise.all([iR.json(), aR.json(), hR.json(), sR.json()]);
        setIncidents(inc || []);
        setAmbulances(amb || []);
        setHospitals(hosp || []);
        setSignals(sig || []);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    fetchDeadlockStatus();
    const interval = setInterval(fetchAll, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleReport = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMsg('');
    try {
      const res = await fetch(`${API_URL}/api/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: parseFloat(newIncident.lat),
          lng: parseFloat(newIncident.lng),
          severity: parseInt(newIncident.severity),
          description: newIncident.description,
          address: parseFloat(newIncident.lat).toFixed(4) + ', ' + parseFloat(newIncident.lng).toFixed(4),
        }),
      });
      if (res.ok) {
        const inc = await res.json();
        setIncidents(prev => [inc, ...prev]);
        setNewIncident({ lat: '12.9716', lng: '77.5946', severity: 3, description: '' });
        setStatusMsg('Incident reported');
      } else {
        const err = await res.json();
        setStatusMsg('Error: ' + (err.error || 'Failed'));
      }
    } catch (err) {
      setStatusMsg('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const availableAmb = ambulances.filter(a => a.status === 'available').length;
  const activeIncidents = incidents.filter(i => i.status !== 'resolved').length;
  const greenSignals = signals.filter(s => s.state === 'green').length;

  const handleMapClick = (lat, lng) => {
    if (clickMode) {
      setNewIncident(prev => ({ ...prev, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
      setClickMode(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header className="glass-header" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 4px 6px rgba(5, 150, 105, 0.3))' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="url(#grad_dash)" />
              <path d="M9 11.5h6m-3-3v6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
              <defs>
                <linearGradient id="grad_dash" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#10b981" />
                  <stop offset="1" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '22px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>Green Corridor</h1>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Emergency Response System</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          
          <div className="metric-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '16px', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '16px 24px' }}>
            <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.6)', borderRadius: '12px', color: 'var(--accent-emerald)', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.1)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-emerald)', lineHeight: 1 }}>{availableAmb}<span style={{fontSize:'14px', color:'rgba(5, 150, 105, 0.6)', fontWeight: '600'}}>/{ambulances.length}</span></div>
              <div style={{ fontSize: '12px', color: 'var(--accent-emerald)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Available</div>
            </div>
          </div>

          <div className="metric-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '16px', background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', border: '1px solid rgba(234, 88, 12, 0.4)', padding: '16px 24px' }}>
            <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.6)', borderRadius: '12px', color: '#ea580c', boxShadow: '0 4px 6px rgba(234, 88, 12, 0.1)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="10" width="22" height="9" rx="2" ry="2"/>
                <path d="M16 10V6a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2v4"/>
                <path d="M8 19v2M16 19v2"/>
                <circle cx="5.5" cy="18.5" r="1.5"/>
                <circle cx="18.5" cy="18.5" r="1.5"/>
                <path d="M10 13h1v2h2v-2h1" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#ea580c', lineHeight: 1 }}>
                {ambulances.filter(a => a.status === 'dispatched' || a.status === 'enroute').length}
                <span style={{ fontSize: '14px', color: 'rgba(234, 88, 12, 0.6)', fontWeight: '600' }}>/{ambulances.length}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#ea580c', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Ambulances</div>
            </div>
          </div>

          <div className="metric-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '16px', background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)', border: '1px solid rgba(225, 29, 72, 0.4)', padding: '16px 24px' }}>
            <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.6)', borderRadius: '12px', color: 'var(--accent-crimson)', boxShadow: '0 4px 6px rgba(225, 29, 72, 0.1)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-crimson)', lineHeight: 1 }}>{activeIncidents}</div>
              <div style={{ fontSize: '12px', color: 'var(--accent-crimson)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Active Incidents</div>
            </div>
          </div>

          <div className="metric-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '16px', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', border: '1px solid rgba(2, 132, 199, 0.4)', padding: '16px 24px' }}>
            <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.6)', borderRadius: '12px', color: 'var(--accent-ocean)', boxShadow: '0 4px 6px rgba(2, 132, 199, 0.1)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M22 12A10 10 0 0 0 12 2v0a10 10 0 0 0-10 10"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-ocean)', lineHeight: 1 }}>{greenSignals}</div>
              <div style={{ fontSize: '12px', color: 'var(--accent-ocean)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Green Lights</div>
            </div>
          </div>

          <div className="metric-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '16px', background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', border: '1px solid rgba(124, 58, 237, 0.4)', padding: '16px 24px' }}>
            <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.6)', borderRadius: '12px', color: 'var(--accent-amethyst)', boxShadow: '0 4px 6px rgba(124, 58, 237, 0.1)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-amethyst)', lineHeight: 1 }}>{deadlockStatus.totalLocks || 0}</div>
              <div style={{ fontSize: '12px', color: 'var(--accent-amethyst)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>System Locks</div>
            </div>
          </div>

        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Map
            ambulances={ambulances}
            incidents={incidents}
            hospitals={hospitals}
            signals={signals}
            socket={socket}
            onMapClick={clickMode ? handleMapClick : null}
            routes={routes}
          />
          {clickMode && (
            <div className="glass-panel" style={{ position: 'absolute', top: '24px', left: '50%', transform: 'translateX(-50%)', padding: '12px 24px', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--accent-blue)' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-blue)', animation: 'pulse 1.5s infinite' }}></div>
              <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>Click anywhere on map to set incident location</span>
              <button onClick={() => setClickMode(false)} className="btn-primary" style={{ padding: '6px 12px', marginLeft: '12px' }}>Cancel</button>
            </div>
          )}
        </div>

        <div className="glass-panel" style={{ width: '420px', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', padding: '0 8px' }}>
            {['Map', 'Incidents', 'Fleet', 'Signals', 'Locks'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} className={`tab-btn ${activeTab === tab.toLowerCase() ? 'tab-btn-active' : ''}`}>
                {tab}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
            {activeTab === 'map' && (
              <div>
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    Report Incident
                  </h3>
                  <form onSubmit={handleReport} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '500' }}>Latitude</div>
                        <input type="number" step="0.000001" value={newIncident.lat} onChange={e => setNewIncident(p => ({ ...p, lat: e.target.value }))} className="form-input" />
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '500' }}>Longitude</div>
                        <input type="number" step="0.000001" value={newIncident.lng} onChange={e => setNewIncident(p => ({ ...p, lng: e.target.value }))} className="form-input" />
                      </div>
                    </div>
                    <button type="button" onClick={() => setClickMode(!clickMode)} className="btn-primary" style={{ backgroundColor: clickMode ? 'var(--accent-blue)' : '#f1f5f9', color: clickMode ? 'white' : 'var(--text-main)', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                      {clickMode ? 'Select Location on Map...' : '📍 Pick on Map'}
                    </button>
                    
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '500' }}>Severity Level</div>
                      <select value={newIncident.severity} onChange={e => setNewIncident(p => ({ ...p, severity: e.target.value }))} className="form-input" style={{ cursor: 'pointer' }}>
                        {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>Level {v} - {['Low', 'Minor', 'Medium', 'High', 'Critical'][v - 1]}</option>)}
                      </select>
                    </div>
                    
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '500' }}>Description</div>
                      <input type="text" value={newIncident.description} placeholder="e.g. Multi-vehicle collision" onChange={e => setNewIncident(p => ({ ...p, description: e.target.value }))} className="form-input" />
                    </div>

                    <button type="submit" disabled={submitting} className={`btn-primary ${submitting ? '' : 'btn-danger'}`} style={{ marginTop: '8px', padding: '14px' }}>
                      {submitting ? 'Reporting...' : 'Dispatch Emergency Response'}
                    </button>
                  </form>
                  {statusMsg && <div style={{ marginTop: '12px', padding: '12px', background: 'var(--accent-green-bg)', borderRadius: '8px', fontSize: '13px', color: 'var(--accent-green)', fontWeight: '500', border: '1px solid rgba(16, 185, 129, 0.2)' }}>{statusMsg}</div>}
                </div>

                {hospitalRec && (
                  <div className="metric-card" style={{ marginBottom: '16px', background: 'var(--accent-blue-bg)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--accent-blue)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Recommended Hospital Routed</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>{hospitalRec.hospital?.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Capacity: {hospitalRec.hospital?.capacity} / Trauma Center</div>
                  </div>
                )}

                {preemptedSignals.length > 0 && (
                  <div className="metric-card" style={{ background: 'var(--accent-green-bg)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--accent-green)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>🚦</span> Green Corridor Active ({preemptedSignals.length} Signals Preempted)
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'incidents' && (
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)' }}>Active Incidents ({incidents.length})</h3>
                {loading ? <div style={{ color: 'var(--text-muted)' }}>Loading...</div> : incidents.length === 0 ? <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '8px' }}>No active incidents</div> : incidents.map(inc => (
                  <div key={inc._id} className="metric-card" style={{ marginBottom: '12px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: inc.severity >= 4 ? 'var(--accent-red)' : 'var(--accent-yellow)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                      <span className={`badge ${inc.severity >= 4 ? 'badge-red' : 'badge-yellow'}`}>Level {inc.severity}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>{inc.status}</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main)' }}>{inc.description || 'Emergency Response Required'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>📍 {inc.lat?.toFixed(4)}, {inc.lng?.toFixed(4)}</div>
                    {inc.assignedAmbulance && (
                      <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--accent-blue)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🚑</span> En Route: {inc.assignedAmbulance.vehicleNumber}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'fleet' && (
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)' }}>Fleet Overview ({ambulances.length})</h3>
                {loading ? <div style={{ color: 'var(--text-muted)' }}>Loading...</div> : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {ambulances.map(amb => (
                      <div key={amb._id} className="metric-card" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{amb.vehicleNumber}</span>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: amb.status === 'available' ? 'var(--accent-green)' : 'var(--accent-red)', boxShadow: `0 0 8px ${amb.status === 'available' ? 'var(--accent-green)' : 'var(--accent-red)'}` }} title={amb.status} />
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>👤 {amb.driverName}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'signals' && (
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)' }}>Traffic Signals ({signals.length})</h3>
                {loading ? <div style={{ color: 'var(--text-muted)' }}>Loading...</div> : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {signals.map(sig => (
                      <div key={sig._id} className={`badge ${sig.state === 'green' ? 'badge-green' : sig.state === 'yellow' ? 'badge-yellow' : 'badge-red'}`} style={{ padding: '6px 12px', fontSize: '10px' }}>
                        {sig.state === 'green' ? '🟢' : sig.state === 'yellow' ? '🟡' : '🔴'} {sig.name?.split(' ')[0] || 'Signal'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'locks' && (
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)' }}>Resource Locks</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div className="metric-card" style={{ textAlign: 'center', padding: '24px 16px' }}>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent-purple)' }}>{deadlockStatus.totalLocks || 0}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '4px' }}>ACTIVE LOCKS</div>
                  </div>
                  <div className="metric-card" style={{ textAlign: 'center', padding: '24px 16px' }}>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent-yellow)' }}>{deadlockStatus.totalWaiting || 0}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '4px' }}>WAIT QUEUE</div>
                  </div>
                </div>
                <button onClick={fetchDeadlockStatus} className="btn-primary" style={{ width: '100%', background: '#f1f5f9', color: 'var(--text-main)', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                  Force Refresh Locks
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
