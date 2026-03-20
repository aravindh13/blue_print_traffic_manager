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

  const s = {
    container: { display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1a1a2e', color: '#eee' },
    header: { padding: '16px 24px', backgroundColor: '#16213e', borderBottom: '1px solid #0f3460', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
    headerTitle: { fontSize: '20px', fontWeight: '600', margin: 0 },
    headerSub: { fontSize: '12px', color: '#888', margin: 0 },
    main: { display: 'flex', flex: 1, overflow: 'hidden' },
    mapArea: { flex: 1, position: 'relative' },
    sidebar: { width: '380px', backgroundColor: '#16213e', borderLeft: '1px solid #0f3460', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    tabs: { display: 'flex', borderBottom: '1px solid #0f3460' },
    tab: { flex: 1, padding: '12px 4px', backgroundColor: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '11px' },
    tabActive: { color: '#22c55e', borderBottom: '2px solid #22c55e' },
    content: { flex: 1, overflow: 'auto', padding: '16px' },
    section: { marginBottom: '16px' },
    sectionTitle: { fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: '#ccc' },
    form: { display: 'flex', flexDirection: 'column', gap: '10px' },
    input: { width: '100%', padding: '10px 12px', backgroundColor: '#1e1e3f', border: '1px solid #333', borderRadius: '6px', color: '#eee', fontSize: '12px' },
    button: { width: '100%', padding: '10px 12px', backgroundColor: '#dc2626', border: 'none', borderRadius: '6px', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '12px' },
    buttonDisabled: { backgroundColor: '#666', cursor: 'not-allowed' },
    card: { padding: '12px', backgroundColor: '#1e1e3f', borderRadius: '8px', marginBottom: '8px' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
    badge: { display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', color: 'white' },
    badgeGreen: { backgroundColor: '#22c55e' },
    badgeRed: { backgroundColor: '#dc2626' },
    badgeOrange: { backgroundColor: '#f59e0b' },
    badgeBlue: { backgroundColor: '#3b82f6' },
    textMuted: { fontSize: '11px', color: '#888' },
    statBox: { padding: '8px 16px', backgroundColor: '#1e1e3f', borderRadius: '6px' },
    clickBanner: { position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#3b82f6', color: 'white', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', zIndex: 1000 },
  };

  const tabStyle = (id) => ({ ...s.tab, ...(activeTab === id ? s.tabActive : {}) });

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={{ fontSize: '28px' }}>🚑</div>
          <div>
            <h1 style={s.headerTitle}>Green Corridor</h1>
            <p style={s.headerSub}>Emergency Response</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={s.statBox}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#22c55e' }}>{availableAmb}/{ambulances.length}</div>
            <div style={s.textMuted}>Available</div>
          </div>
          <div style={s.statBox}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626' }}>{activeIncidents}</div>
            <div style={s.textMuted}>Active</div>
          </div>
          <div style={s.statBox}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>{greenSignals}</div>
            <div style={s.textMuted}>Green</div>
          </div>
          <div style={s.statBox}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#a855f7' }}>{deadlockStatus.totalLocks || 0}</div>
            <div style={s.textMuted}>Locks</div>
          </div>
        </div>
      </header>

      <div style={s.main}>
        <div style={s.mapArea}>
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
            <div style={s.clickBanner} onClick={() => setClickMode(false)}>
              Click on map to set location
            </div>
          )}
        </div>

        <div style={s.sidebar}>
          <div style={s.tabs}>
            {['Map', 'Incidents', 'Fleet', 'Signals', 'Locks'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} style={tabStyle(tab.toLowerCase())}>
                {tab}
              </button>
            ))}
          </div>

          <div style={s.content}>
            {activeTab === 'map' && (
              <div>
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>Report Incident</h3>
                  <form onSubmit={handleReport} style={s.form}>
                    <div style={s.grid2}>
                      <div>
                        <div style={s.textMuted}>Latitude</div>
                        <input type="number" step="0.000001" value={newIncident.lat} onChange={e => setNewIncident(p => ({ ...p, lat: e.target.value }))} style={s.input} />
                      </div>
                      <div>
                        <div style={s.textMuted}>Longitude</div>
                        <input type="number" step="0.000001" value={newIncident.lng} onChange={e => setNewIncident(p => ({ ...p, lng: e.target.value }))} style={s.input} />
                      </div>
                    </div>
                    <button type="button" onClick={() => setClickMode(!clickMode)} style={{ ...s.input, backgroundColor: clickMode ? '#3b82f6' : '#333', cursor: 'pointer' }}>
                      {clickMode ? 'Click on Map' : 'Set Location'}
                    </button>
                    <select value={newIncident.severity} onChange={e => setNewIncident(p => ({ ...p, severity: e.target.value }))} style={s.input}>
                      {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>Level {v} - {['Low', 'Minor', 'Medium', 'High', 'Critical'][v - 1]}</option>)}
                    </select>
                    <input type="text" value={newIncident.description} placeholder="Description" onChange={e => setNewIncident(p => ({ ...p, description: e.target.value }))} style={s.input} />
                    <button type="submit" disabled={submitting} style={{ ...s.button, ...(submitting ? s.buttonDisabled : {}) }}>
                      {submitting ? 'Reporting...' : 'Report Incident'}
                    </button>
                  </form>
                  {statusMsg && <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#1e3a5f', borderRadius: '6px', fontSize: '12px', color: '#22c55e' }}>{statusMsg}</div>}
                </div>

                {hospitalRec && (
                  <div style={{ ...s.card, border: '1px solid #333' }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Recommended Hospital</div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{hospitalRec.hospital?.name}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{hospitalRec.hospital?.bedsAvailable} beds</div>
                  </div>
                )}

                {preemptedSignals.length > 0 && (
                  <div style={{ ...s.card, border: '1px solid #22c55e', backgroundColor: '#1e3a2f' }}>
                    <div style={{ fontSize: '12px', color: '#22c55e' }}>Green Signals ({preemptedSignals.length})</div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'incidents' && (
              <div>
                <h3 style={s.sectionTitle}>Active Incidents ({incidents.length})</h3>
                {loading ? <div style={{ color: '#666' }}>Loading...</div> : incidents.length === 0 ? <div style={{ color: '#666', textAlign: 'center', padding: '40px' }}>No active incidents</div> : incidents.map(inc => (
                  <div key={inc._id} style={s.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...s.badge, backgroundColor: inc.severity >= 4 ? '#dc2626' : '#f59e0b' }}>Level {inc.severity}</span>
                      <span style={{ fontSize: '10px', color: '#888' }}>{inc.status}</span>
                    </div>
                    <div style={{ fontSize: '13px', marginBottom: '4px' }}>{inc.description || 'Incident'}</div>
                    <div style={s.textMuted}>{inc.lat?.toFixed(4)}, {inc.lng?.toFixed(4)}</div>
                    {inc.assignedAmbulance && <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '4px' }}>{inc.assignedAmbulance.vehicleNumber}</div>}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'fleet' && (
              <div>
                <h3 style={s.sectionTitle}>Fleet ({ambulances.length})</h3>
                {loading ? <div style={{ color: '#666' }}>Loading...</div> : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {ambulances.map(amb => (
                      <div key={amb._id} style={{ ...s.card, border: amb.status === 'available' ? '1px solid #22c55e33' : '1px solid #dc262633' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '600' }}>{amb.vehicleNumber}</span>
                          <span style={{ ...s.badge, fontSize: '8px', backgroundColor: amb.status === 'available' ? '#22c55e' : '#dc2626' }}>{amb.status}</span>
                        </div>
                        <div style={s.textMuted}>{amb.driverName}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'signals' && (
              <div>
                <h3 style={s.sectionTitle}>Traffic Signals ({signals.length})</h3>
                {loading ? <div style={{ color: '#666' }}>Loading...</div> : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {signals.map(sig => (
                      <div key={sig._id} style={{
                        padding: '6px 10px',
                        backgroundColor: sig.state === 'green' ? '#1a3f1a' : sig.state === 'yellow' ? '#3f3f1a' : '#3f1a1a',
                        borderRadius: '4px',
                        fontSize: '10px',
                        color: sig.state === 'green' ? '#22c55e' : sig.state === 'yellow' ? '#eab308' : '#dc2626'
                      }}>
                        {sig.state === 'green' ? '🟢' : sig.state === 'yellow' ? '🟡' : '🔴'} {sig.name?.split(' ')[0] || 'Signal'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'locks' && (
              <div>
                <h3 style={s.sectionTitle}>Resource Locks</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ ...s.card, textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#a855f7' }}>{deadlockStatus.totalLocks || 0}</div>
                    <div style={s.textMuted}>Active Locks</div>
                  </div>
                  <div style={{ ...s.card, textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#eab308' }}>{deadlockStatus.totalWaiting || 0}</div>
                    <div style={s.textMuted}>Waiting</div>
                  </div>
                </div>
                <button onClick={fetchDeadlockStatus} style={{ ...s.input, cursor: 'pointer', backgroundColor: '#333' }}>Refresh</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
