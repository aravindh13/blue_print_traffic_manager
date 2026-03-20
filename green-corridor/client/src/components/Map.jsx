import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createIcon = (color, emoji, size) => {
  return L.divIcon({
    html: '<div style="width:' + size + 'px;height:' + size + 'px;background:' + color + ';border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:' + (size * 0.4) + 'px;">' + emoji + '</div>',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    className: ''
  });
};

function InjectStyles() {
  useEffect(() => {
    if (document.getElementById('map-styles')) return;
    const style = document.createElement('style');
    style.id = 'map-styles';
    style.textContent = '.leaflet-popup-content-wrapper { background: #1e293b; color: #e2e8f0; border-radius: 8px; } .leaflet-popup-tip { background: #1e293b; } .leaflet-popup-content { margin: 10px 14px; font-size: 12px; }';
    document.head.appendChild(style);
  }, []);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapContent({ socket, routes, setLocalRoutes, setLocalSignals }) {
  const map = useMap();

  useEffect(() => {
    setLocalRoutes(routes || {});
  }, [routes, setLocalRoutes]);

  useEffect(() => {
    if (!socket) return;

    socket.on('route:update', ({ ambulanceId, route }) => {
      setLocalRoutes(prev => ({ ...prev, [ambulanceId]: route }));
    });

    socket.on('sim:stopped', ({ ambulanceId }) => {
      setLocalRoutes(prev => {
        const next = Object.assign({}, prev);
        delete next[ambulanceId];
        return next;
      });
    });

    socket.on('ambulance:moved', () => {
      setTimeout(() => map.invalidateSize(), 100);
    });

    socket.on('signal:changed', ({ id, state, lat, lng }) => {
      if (setLocalSignals) {
        setLocalSignals(prev => prev.map(s => s._id === id ? { ...s, state: state, lat: lat || s.lat, lng: lng || s.lng } : s));
      }
    });

    return () => {
      socket.off('route:update');
      socket.off('sim:stopped');
      socket.off('ambulance:moved');
      socket.off('signal:changed');
    };
  }, [socket, map, setLocalRoutes, setLocalSignals]);

  return null;
}

export default function Map({ ambulances, incidents, hospitals, signals, socket, onMapClick, routes, recommendedHospital }) {
  const [isClient, setIsClient] = useState(false);
  const [localAmbulances, setLocalAmbulances] = useState([]);
  const [localIncidents, setLocalIncidents] = useState([]);
  const [localRoutes, setLocalRoutes] = useState({});
  const [localSignals, setLocalSignals] = useState([]);

  const defaultCenter = [12.972598, 77.586136];
  const mapId = 'map-' + Date.now();

  const validAmbulances = (ambulances || []).filter(a => a && a.lat && a.lng);
  const validIncidents = (incidents || []).filter(i => i && i.lat && i.lng);
  const validHospitals = (hospitals || []).filter(h => h && h.lat && h.lng);
  const validSignals = (signals || []).filter(s => s && s.lat && s.lng);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setLocalAmbulances(validAmbulances);
  }, [validAmbulances]);

  useEffect(() => {
    setLocalIncidents(validIncidents);
  }, [validIncidents]);

  useEffect(() => {
    setLocalRoutes(routes || {});
  }, [routes]);

  useEffect(() => {
    setLocalSignals(validSignals);
  }, [validSignals]);

  useEffect(() => {
    if (!socket) return;
    const handleMoved = ({ ambulanceId, lat, lng }) => {
      setLocalAmbulances(prev => prev.map(a => a._id === ambulanceId ? { ...a, lat: lat, lng: lng } : a));
    };
    socket.on('ambulance:moved', handleMoved);
    return () => socket.off('ambulance:moved', handleMoved);
  }, [socket]);

  if (!isClient) {
    return <div style={{ width: '100%', height: '100%', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Loading...</div>;
  }

  return (
    <MapContainer id={mapId} center={defaultCenter} zoom={13} style={{ width: '100%', height: '100%' }} zoomControl={true} scrollWheelZoom={true}>
      <InjectStyles />
      <MapContent socket={socket} routes={routes} setLocalRoutes={setLocalRoutes} setLocalSignals={setLocalSignals} />
      {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {validHospitals.map(h => (
        <Marker key={h._id} position={[h.lat, h.lng]} icon={createIcon('#3b82f6', '🏥', 26)}>
          <Popup><b>{h.name}</b><br />{h.bedsAvailable || 'N/A'} beds</Popup>
        </Marker>
      ))}

      {recommendedHospital && recommendedHospital.hospital && (
        <Marker key="rec-hospital" position={[recommendedHospital.hospital.lat, recommendedHospital.hospital.lng]} icon={createIcon('#8b5cf6', '🏥', 30)}>
          <Popup><b>Recommended:</b><br />{recommendedHospital.hospital.name}</Popup>
        </Marker>
      )}

      {localSignals.map(s => (
        <Marker key={s._id} position={[s.lat, s.lng]} icon={createIcon(s.state === 'green' ? '#22c55e' : s.state === 'yellow' ? '#f59e0b' : '#dc2626', s.state === 'green' ? '🟢' : s.state === 'yellow' ? '🟡' : '🔴', 20)}>
          <Popup><b>{s.name || 'Signal'}</b><br />{s.state ? s.state.toUpperCase() : 'UNKNOWN'}</Popup>
        </Marker>
      ))}

      {localAmbulances.map(a => (
        <Marker key={a._id} position={[a.lat, a.lng]} icon={createIcon(a.status === 'available' ? '#22c55e' : '#ef4444', '🚑', 28)}>
          <Popup><b>{a.vehicleNumber}</b><br />{a.driverName}<br />{a.status}</Popup>
        </Marker>
      ))}

      {localIncidents.map(i => (
        <Marker key={i._id} position={[i.lat, i.lng]} icon={createIcon('#f59e0b', '⚠️', 28)}>
          <Popup><b>Incident</b><br />Level: {i.severity}/5<br />{i.description || 'Emergency'}</Popup>
        </Marker>
      ))}

      {Object.keys(localRoutes).map(key => {
        const route = localRoutes[key];
        if (!route || route.length < 2) return null;
        const isHospital = key === 'hospitalRoute';
        return <Polyline key={'route-' + key} positions={route} color={isHospital ? '#8b5cf6' : '#3b82f6'} weight={4} opacity={0.8} />;
      })}
    </MapContainer>
  );
}
