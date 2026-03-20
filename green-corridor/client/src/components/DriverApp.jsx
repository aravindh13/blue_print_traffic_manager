import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

export default function DriverApp() {
  const [ambulances, setAmbulances] = useState([]);
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState('');
  const [assignedIncident, setAssignedIncident] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  // ── Setup Socket + Fetch ──────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(WS_URL);
    socketRef.current = socket;

    socket.on('incident:assigned', ({ incident }) => {
      if (incident?.assignedAmbulance?._id === selectedAmbulanceId ||
          incident?.assignedAmbulance === selectedAmbulanceId) {
        setAssignedIncident(incident);
        setSimMessage('📥 New incident assigned!');
      }
    });

    socket.on('incident:enroute', ({ incidentId }) => {
      setAssignedIncident(prev => prev?._id === incidentId ? { ...prev, status: 'enroute' } : prev);
    });

    socket.on('incident:resolved', ({ incidentId }) => {
      setAssignedIncident(prev => {
        if (prev?._id === incidentId) {
          setSimulating(false);
          setSimMessage('✅ Incident resolved! Ambulance now available.');
          return null;
        }
        return prev;
      });
    });

    socket.on('incident:rejected', ({ incidentId }) => {
      setAssignedIncident(prev => prev?._id === incidentId ? null : prev);
    });

    socket.on('sim:started', () => {
      setSimulating(true);
      setSimMessage('🚑 GPS simulation started — en route to incident!');
    });

    socket.on('sim:stopped', () => {
      setSimulating(false);
      setSimMessage('⏹ Simulation stopped.');
    });

    socket.on('sim:error', ({ message }) => {
      setSimulating(false);
      setSimMessage(`❌ ${message}`);
    });

    fetch(`${API_URL}/api/ambulances`)
      .then(r => r.json())
      .then(data => {
        setAmbulances(data || []);
        if (data?.length > 0) {
          setSelectedAmbulanceId(data[0]._id);
          if (data[0].assignedIncident) setAssignedIncident(data[0].assignedIncident);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => socket.disconnect();
  }, []);

  // Re-fetch ambulance details when selection changes
  useEffect(() => {
    if (!selectedAmbulanceId) return;
    const amb = ambulances.find(a => a._id === selectedAmbulanceId);
    if (amb) {
      setAssignedIncident(amb.assignedIncident || null);
      setSimulating(false);
      setSimMessage('');
    }
  }, [selectedAmbulanceId]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleAccept = async () => {
    if (!selectedAmbulanceId) return;
    try {
      const res = await fetch(`${API_URL}/api/ambulances/${selectedAmbulanceId}/accept`, {
        method: 'POST',
      });
      if (res.ok) {
        setAssignedIncident(prev => prev ? { ...prev, status: 'enroute' } : prev);
        setSimMessage('✅ Accepted! Now click Simulate GPS to start moving.');
      }
    } catch (err) {
      setSimMessage(`❌ ${err.message}`);
    }
  };

  const handleReject = async () => {
    if (!selectedAmbulanceId) return;
    try {
      const res = await fetch(`${API_URL}/api/ambulances/${selectedAmbulanceId}/reject`, {
        method: 'POST',
      });
      if (res.ok) {
        setAssignedIncident(null);
        setSimulating(false);
        setSimMessage('❌ Rejected. Waiting for next assignment...');
      }
    } catch (err) {
      setSimMessage(`❌ ${err.message}`);
    }
  };

  const handleSimulate = () => {
    if (!socketRef.current || !selectedAmbulanceId) return;
    if (simulating) {
      socketRef.current.emit('driver:stop', { ambulanceId: selectedAmbulanceId });
      setSimulating(false);
    } else {
      socketRef.current.emit('driver:simulate', { ambulanceId: selectedAmbulanceId });
      setSimMessage('⏳ Starting GPS simulation...');
    }
  };

  const handleResolve = async () => {
    if (!selectedAmbulanceId) return;
    try {
      // Stop any active simulation first
      if (simulating && socketRef.current) {
        socketRef.current.emit('driver:stop', { ambulanceId: selectedAmbulanceId });
        setSimulating(false);
      }
      const res = await fetch(`${API_URL}/api/ambulances/${selectedAmbulanceId}/resolve`, {
        method: 'POST',
      });
      if (res.ok) {
        setAssignedIncident(null);
        setSimulating(false);
        setSimMessage('✅ Incident resolved! Ambulance is now available.');
        // Refresh the ambulance list to reflect updated status
        const ambRes = await fetch(`${API_URL}/api/ambulances`);
        const data = await ambRes.json();
        setAmbulances(data || []);
      } else {
        const err = await res.json();
        setSimMessage(`❌ ${err.error || 'Failed to resolve'}`);
      }
    } catch (err) {
      setSimMessage(`❌ ${err.message}`);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const selectedAmb = ambulances.find(a => a._id === selectedAmbulanceId);
  const status = selectedAmb?.status || 'offline';
  const statusColor = status === 'available' ? 'bg-green-500' : status === 'busy' ? 'bg-red-500' : 'bg-gray-400';

  const severityColor = (s) => {
    if (s >= 5) return 'text-red-700 bg-red-100';
    if (s >= 4) return 'text-orange-700 bg-orange-100';
    if (s >= 3) return 'text-yellow-700 bg-yellow-100';
    return 'text-green-700 bg-green-100';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4 font-sans">
      <div className="max-w-xl mx-auto space-y-4">

        {/* Header */}
        <div className="text-center py-6">
          <div className="text-5xl mb-2">🚑</div>
          <h1 className="text-3xl font-bold text-white">Driver Console</h1>
          <p className="text-blue-300 mt-1">Green Corridor Emergency Response</p>
        </div>

        {/* Ambulance Selector */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20">
          <label className="block text-sm font-semibold text-blue-200 mb-2">Select Your Ambulance</label>
          {loading ? (
            <p className="text-gray-400 text-sm">Loading ambulances...</p>
          ) : (
            <select
              value={selectedAmbulanceId}
              onChange={e => setSelectedAmbulanceId(e.target.value)}
              className="w-full bg-white/5 text-white border border-white/20 rounded-xl px-4 py-3
                         focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            >
              <option value="">-- Select ambulance --</option>
              {ambulances.map(a => (
                <option key={a._id} value={a._id} className="bg-slate-900">
                  {a.vehicleNumber} · {a.driverName}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Status Card */}
        {selectedAmb && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20 space-y-3">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${statusColor}`} />
              <h2 className="text-white font-semibold text-lg">{selectedAmb.vehicleNumber}</h2>
              <span className={`ml-auto text-xs font-bold px-3 py-1 rounded-full ${statusColor} text-white`}>
                {status.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-blue-300 text-xs mb-1">Driver</p>
                <p className="text-white font-medium">{selectedAmb.driverName}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-blue-300 text-xs mb-1">Location</p>
                <p className="text-white font-medium text-xs">
                  {(selectedAmb.lat||0).toFixed(4)}, {(selectedAmb.lng||0).toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Incident Card */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20">
          <h2 className="text-white font-semibold text-lg mb-4">🚨 Incident</h2>

          {assignedIncident ? (
            <div className="space-y-4">
              {/* Severity */}
              <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-bold text-sm ${severityColor(assignedIncident.severity)}`}>
                ⚠️ Severity {assignedIncident.severity}/5
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-blue-300 text-xs mb-1">Type</p>
                  <p className="text-white font-medium">{assignedIncident.type || 'Emergency'}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-blue-300 text-xs mb-1">Status</p>
                  <p className="text-white font-medium capitalize">{assignedIncident.status}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 col-span-2">
                  <p className="text-blue-300 text-xs mb-1">Location</p>
                  <p className="text-white font-medium">
                    {(assignedIncident.lat||0).toFixed(4)}, {(assignedIncident.lng||0).toFixed(4)}
                  </p>
                </div>
                {assignedIncident.description && (
                  <div className="bg-white/5 rounded-xl p-3 col-span-2">
                    <p className="text-blue-300 text-xs mb-1">Notes</p>
                    <p className="text-white text-xs">{assignedIncident.description}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons - Accept / Reject */}
              {assignedIncident.status === 'assigned' && (
                <div className="flex gap-3">
                  <button
                    onClick={handleAccept}
                    className="flex-1 bg-green-500 hover:bg-green-400 active:bg-green-600
                               text-white font-bold py-3 rounded-xl transition text-base shadow-lg"
                  >
                    ✅ Accept
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex-1 bg-red-500 hover:bg-red-400 active:bg-red-600
                               text-white font-bold py-3 rounded-xl transition text-base shadow-lg"
                  >
                    ✗ Reject
                  </button>
                </div>
              )}

              {/* GPS Simulation Button */}
              {(assignedIncident.status === 'enroute' || assignedIncident.status === 'assigned') && (
                <button
                  onClick={handleSimulate}
                  className={`w-full font-bold py-3.5 rounded-xl transition text-base shadow-lg ${
                    simulating
                      ? 'bg-orange-500 hover:bg-orange-400 text-white animate-pulse'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {simulating ? '⏹ Stop GPS Simulation' : '🗺 Simulate GPS Route'}
                </button>
              )}

              {assignedIncident.status === 'enroute' && (
                <div className="space-y-3">
                  <div className="bg-blue-900/50 border border-blue-500/30 rounded-xl p-3 text-center">
                    <p className="text-blue-200 text-sm font-semibold">
                      {simulating ? '🚗 Auto-driving to incident via OSRM route...' : '🔵 En Route to Incident'}
                    </p>
                  </div>
                  <button
                    onClick={handleResolve}
                    className="w-full bg-purple-600 hover:bg-purple-500 active:bg-purple-700
                               text-white font-bold py-3 rounded-xl transition text-base shadow-lg"
                  >
                    🏁 Mark as Resolved
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">⏳</div>
              <p className="text-gray-300 font-medium">Waiting for assignment...</p>
              <p className="text-gray-500 text-sm mt-1">
                {selectedAmb ? 'Your ambulance is available' : 'Select an ambulance above'}
              </p>
            </div>
          )}
        </div>

        {/* Status Message */}
        {simMessage && (
          <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-blue-100 text-sm text-center">
            {simMessage}
          </div>
        )}

        {/* Help */}
        <div className="text-center text-xs text-blue-400 pb-6">
          💡 Accept → Simulate GPS → Watch your ambulance move on the map in real-time
        </div>
      </div>
    </div>
  );
}
