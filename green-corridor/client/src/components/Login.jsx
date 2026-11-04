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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '400px', padding: '48px 40px', position: 'relative', zIndex: 10 }}>
        
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 8px 12px rgba(2, 132, 199, 0.25))' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="url(#grad_login)" />
              <path d="M9 11.5h6m-3-3v6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
              <defs>
                <linearGradient id="grad_login" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0ea5e9" />
                  <stop offset="1" stopColor="#0284c7" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="text-gradient" style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.5px' }}>Driver Portal</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Green Corridor AI</p>
        </div>

        {error && <div className="animate-fade-in" style={{ marginBottom: '24px', padding: '14px', background: 'var(--accent-crimson-subtle)', border: '1px solid rgba(225, 29, 72, 0.1)', borderRadius: '8px', fontSize: '13px', color: 'var(--accent-crimson)', textAlign: 'center', fontWeight: '600' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '600' }}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" placeholder="driver@gc.com" required style={{ padding: '14px 16px' }} />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '600' }}>Secure Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-input" placeholder="••••••••" required style={{ padding: '14px 16px', letterSpacing: password ? '2px' : 'normal' }} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '12px', padding: '16px', fontSize: '14px', width: '100%', background: 'linear-gradient(135deg, var(--accent-ocean), #0369a1)', border: 'none' }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                Authenticating...
              </span>
            ) : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="animate-fade-in delay-200" style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(15, 23, 42, 0.06)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-tertiary)', marginBottom: '16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available Demo Accounts</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {['arjun@gc.com', 'priya@gc.com', 'ravi@gc.com'].map(e => (
              <button key={e} onClick={() => setEmail(e)} className="badge badge-blue" style={{ border: 'none', cursor: 'pointer', padding: '6px 12px', transition: 'all 0.2s', ':hover': { transform: 'scale(1.05)' } }}>{e}</button>
            ))}
          </div>
          <p style={{ color: 'var(--text-tertiary)', marginTop: '16px', fontSize: '12px' }}>Standard PIN: <strong style={{ color: 'var(--text-primary)' }}>password123</strong></p>
        </div>
      </div>
    </div>
  );
}
