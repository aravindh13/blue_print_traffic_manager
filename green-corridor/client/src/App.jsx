import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import DriverDashboard from './components/DriverDashboard';
import Login from './components/Login';

function App() {
  const [view, setView] = useState('control');
  const [driver, setDriver] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedDriver = localStorage.getItem('driver');
    if (savedToken && savedDriver) {
      setToken(savedToken);
      setDriver(JSON.parse(savedDriver));
      setView('driver-dashboard');
    }
  }, []);

  const handleLoginSuccess = (driverData, authToken) => {
    setDriver(driverData);
    setToken(authToken);
    setView('driver-dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('driver');
    setDriver(null);
    setToken(null);
    setView('control');
  };

  if (view === 'control') {
    return (
      <div>
        <Dashboard />
        <button
          onClick={() => setView('driver-login')}
          className="glass-panel"
          style={{
            position: 'fixed', bottom: '24px', right: '24px', padding: '12px 20px',
            color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '13px', fontWeight: '600', zIndex: 1000
          }}
        >
          Driver Login 👨‍⚕️
        </button>
      </div>
    );
  }

  if (view === 'driver-login') {
    return (
      <div>
        <Login onLoginSuccess={handleLoginSuccess} />
        <button
          onClick={() => setView('control')}
          className="glass-panel"
          style={{
            position: 'fixed', top: '24px', left: '24px', padding: '10px 16px',
            color: 'var(--text-main)', cursor: 'pointer', fontSize: '12px', fontWeight: '500', zIndex: 1000
          }}
        >
          ← Back to Control Center
        </button>
      </div>
    );
  }

  if (view === 'driver-dashboard' && driver && token) {
    return <DriverDashboard driver={driver} token={token} onLogout={handleLogout} />;
  }

  return <Dashboard />;
}

export default App;
