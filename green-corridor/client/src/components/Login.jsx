import { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(API_URL + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('driver', JSON.stringify(data.ambulance));
      onLoginSuccess(data.ambulance, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const s = {
    container: { minHeight: '100vh', backgroundColor: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
    box: { width: '100%', maxWidth: '360px', backgroundColor: '#16213e', borderRadius: '12px', padding: '32px', border: '1px solid #0f3460' },
    header: { textAlign: 'center', marginBottom: '24px' },
    icon: { fontSize: '40px', marginBottom: '12px' },
    title: { fontSize: '20px', fontWeight: '600', marginBottom: '4px', color: '#eee' },
    subtitle: { fontSize: '12px', color: '#888' },
    error: { marginBottom: '16px', padding: '10px', backgroundColor: '#2a1a1a', borderRadius: '6px', fontSize: '12px', color: '#f87171', textAlign: 'center' },
    form: { display: 'flex', flexDirection: 'column', gap: '12px' },
    label: { fontSize: '11px', color: '#888', display: 'block', marginBottom: '6px' },
    input: { width: '100%', padding: '10px 12px', backgroundColor: '#1e1e3f', border: '1px solid #333', borderRadius: '6px', color: '#eee', fontSize: '13px', outline: 'none', boxSizing: 'border-box' },
    button: { width: '100%', padding: '12px', backgroundColor: '#22c55e', border: 'none', borderRadius: '6px', color: 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer', marginTop: '4px' },
    demo: { marginTop: '20px', padding: '12px', backgroundColor: '#1e1e3f', borderRadius: '6px', fontSize: '11px' },
    demoTitle: { color: '#888', marginBottom: '8px' },
    demoItem: { color: '#3b82f6', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '4px 0', display: 'block' },
    demoPassword: { color: '#666', marginTop: '8px' },
  };

  return (
    <div style={s.container}>
      <div style={s.box}>
        <div style={s.header}>
          <div style={s.icon}>🚑</div>
          <h1 style={s.title}>Driver Login</h1>
          <p style={s.subtitle}>Green Corridor</p>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={s.form}>
          <div>
            <label style={s.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={s.input} placeholder="driver@gc.com" required />
          </div>

          <div>
            <label style={s.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={s.input} placeholder="****" required />
          </div>

          <button type="submit" disabled={loading} style={{ ...s.button, backgroundColor: loading ? '#333' : '#22c55e', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={s.demo}>
          <p style={s.demoTitle}>Demo credentials:</p>
          {['arjun@gc.com', 'priya@gc.com', 'ravi@gc.com'].map(e => (
            <button key={e} onClick={() => setEmail(e)} style={s.demoItem}>{e}</button>
          ))}
          <p style={s.demoPassword}>Password: password123</p>
        </div>
      </div>
    </div>
  );
}
