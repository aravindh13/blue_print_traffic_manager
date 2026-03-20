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
          style={{
            position: 'fixed', bottom: '20px', right: '20px', padding: '10px 16px',
            backgroundColor: '#16213e', border: '1px solid #0f3460', borderRadius: '8px',
            color: '#eee', cursor: 'pointer', fontSize: '12px', zIndex: 1000
          }}
        >
          Driver Login
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
          style={{
            position: 'fixed', bottom: '20px', left: '20px', padding: '8px 14px',
            backgroundColor: '#16213e', border: '1px solid #0f3460', borderRadius: '6px',
            color: '#888', cursor: 'pointer', fontSize: '11px', zIndex: 1000
          }}
        >
          Control Center
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
