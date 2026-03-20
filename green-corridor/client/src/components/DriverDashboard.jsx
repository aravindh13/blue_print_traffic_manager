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
    return <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eee' }}>Loading...</div>;
  }

  const preemptedSignals = (signals || []).filter(s => s.lockedBy && s.lockedBy._id === (ambulance && ambulance._id));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e', color: '#eee' }}>
      <header style={{ padding: '16px 24px', backgroundColor: '#16213e', borderBottom: '1px solid #0f3460', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>🚑</span>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Driver Dashboard</h1>
            <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{driver.name} - {driver.vehicleNumber}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            padding: '6px 12px',
            backgroundColor: ambulance && ambulance.status === 'available' ? '#1a3f1a' : '#3f1a1a',
            borderRadius: '6px',
            border: '1px solid ' + (ambulance && ambulance.status === 'available' ? '#22c55e' : '#ef4444'),
            fontSize: '12px',
            color: ambulance && ambulance.status === 'available' ? '#22c55e' : '#ef4444'
          }}>
            {ambulance && ambulance.status === 'available' ? 'Available' : 'On Duty'}
          </div>
          <button onClick={onLogout} style={{ padding: '8px 16px', backgroundColor: '#333', border: '1px solid #444', borderRadius: '6px', color: '#ccc', cursor: 'pointer', fontSize: '12px' }}>
            Logout
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>
          <div style={{ backgroundColor: '#16213e', borderRadius: '12px', overflow: 'hidden', height: '500px' }}>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', backgroundColor: '#16213e', borderRadius: '12px', border: '1px solid #0f3460' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: '#ccc' }}>Your Status</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ padding: '10px', backgroundColor: '#1e1e3f', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>Vehicle</div>
                  <div style={{ fontSize: '12px', fontWeight: '600' }}>{ambulance ? ambulance.vehicleNumber : '-'}</div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#1e1e3f', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>Location</div>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace' }}>{ambulance ? ambulance.lat.toFixed(4) + ', ' + ambulance.lng.toFixed(4) : '-'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button onClick={() => handleStatusChange('available')} style={{ flex: 1, padding: '8px', backgroundColor: ambulance && ambulance.status === 'available' ? '#22c55e' : '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', color: 'white' }}>
                  Available
                </button>
                <button onClick={() => handleStatusChange('offline')} style={{ flex: 1, padding: '8px', backgroundColor: ambulance && ambulance.status === 'offline' ? '#666' : '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', color: 'white' }}>
                  Offline
                </button>
              </div>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#16213e', borderRadius: '12px', border: '1px solid #0f3460' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: '#ccc' }}>Incident Request</h3>

              {assignedIncident ? (
                <div>
                  <div style={{ padding: '12px', backgroundColor: '#2a1a1a', borderRadius: '8px', marginBottom: '12px', border: '1px solid #dc262644' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', color: 'white', backgroundColor: assignedIncident.severity >= 4 ? '#dc2626' : '#f59e0b' }}>
                        Level {assignedIncident.severity}
                      </span>
                      <span style={{ fontSize: '10px', color: '#888' }}>{assignedIncident.status}</span>
                    </div>
                    <div style={{ fontSize: '13px', marginBottom: '4px' }}>{assignedIncident.description || 'Incident'}</div>
                    <div style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>{assignedIncident.lat.toFixed(4)}, {assignedIncident.lng.toFixed(4)}</div>
                  </div>

                  {assignedIncident.status === 'assigned' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={handleAccept} style={{ flex: 1, padding: '10px', backgroundColor: '#22c55e', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: 'white' }}>
                        Accept
                      </button>
                      <button onClick={handleReject} style={{ flex: 1, padding: '10px', backgroundColor: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: 'white' }}>
                        Reject
                      </button>
                    </div>
                  )}

                  {(assignedIncident.status === 'enroute' || simulating) && (
                    <div>
                      <div style={{ padding: '10px', backgroundColor: '#1e3a5f', borderRadius: '6px', textAlign: 'center', marginBottom: '10px' }}>
                        <div style={{ fontSize: '12px', color: '#93c5fd' }}>En Route to Incident</div>
                        {simulating && <div style={{ fontSize: '10px', color: '#60a5fa', marginTop: '4px' }}>Navigating...</div>}
                      </div>
                      <button onClick={handleStop} style={{ width: '100%', padding: '10px', backgroundColor: '#f59e0b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: 'white' }}>
                        Stop Navigation
                      </button>
                    </div>
                  )}
                </div>
              ) : hospitalRec ? (
                <div style={{ padding: '12px', backgroundColor: '#2a1a3a', borderRadius: '8px', border: '1px solid #9333ea44' }}>
                  <div style={{ fontSize: '12px', color: '#c084fc', marginBottom: '8px' }}>Hospital Recommended</div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>{hospitalRec.hospital ? hospitalRec.hospital.name : ''}</div>
                </div>
              ) : (
                <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#1e1e3f', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Waiting for assignment</div>
                </div>
              )}
            </div>

            {preemptedSignals.length > 0 && (
              <div style={{ padding: '12px', backgroundColor: '#1a3f1a', borderRadius: '8px', border: '1px solid #22c55e44' }}>
                <div style={{ fontSize: '12px', color: '#22c55e', marginBottom: '8px' }}>Green Corridor ({preemptedSignals.length})</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
