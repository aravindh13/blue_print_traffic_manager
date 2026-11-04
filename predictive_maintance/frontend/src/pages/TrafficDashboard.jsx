import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ─── API base — uses the /traffic-api proxy → localhost:8100 ───────────────
const API = '/traffic-api';

const COLORS = {
  baseline: '#f97316',
  ai:       '#10b981',
  accent:   '#2563eb',
};

// ─── Custom Recharts Tooltip ────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1.5px solid #e2e8f0',
      borderRadius: 12, padding: '12px 16px', fontSize: 12,
      boxShadow: '0 4px 20px rgba(15,23,42,.1)', fontWeight: 600,
    }}>
      <p style={{ color: '#94a3b8', marginBottom: 6, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Step {label}
      </p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, margin: '2px 0', display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <span>{p.name}:</span>
          <strong style={{ filter: 'brightness(0.85)' }}>
            {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}{unit}
          </strong>
        </p>
      ))}
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ label, baseVal, aiVal, unit, accentColor, lowerIsBetter = true, format = v => v?.toFixed(1) ?? 'N/A' }) {
  const delta    = baseVal != null && aiVal != null ? ((baseVal - aiVal) / (baseVal || 1)) * 100 : null;
  const improved = lowerIsBetter ? delta > 0 : delta < 0;

  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #e2e8f0',
      borderRadius: 16,
      padding: '20px 20px 16px',
      boxShadow: '0 1px 4px rgba(15,23,42,.06)',
      borderLeft: `5px solid ${accentColor}`,
      transition: 'all .2s',
      position: 'relative',
      overflow: 'hidden',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(15,23,42,.10)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,.06)'; }}
    >
      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f97316', opacity: 0.75, lineHeight: 1, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{format(baseVal)}</p>
          <p style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>Baseline</p>
        </div>
        <span style={{ color: '#cbd5e1', fontSize: 20, marginBottom: 18 }}>→</span>
        <div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', lineHeight: 1, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{format(aiVal)}</p>
          <p style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>AI (PPO)</p>
        </div>
        <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 18, marginLeft: 'auto' }}>{unit}</span>
      </div>
      {delta != null && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          marginTop: 12, padding: '3px 10px', borderRadius: 99,
          fontSize: '0.72rem', fontWeight: 700,
          background: improved ? '#f0fdf4' : '#fff1f2',
          color:      improved ? '#059669' : '#dc2626',
          border: `1px solid ${improved ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {improved ? '▼' : '▲'} {Math.abs(delta).toFixed(1)}% {improved ? 'improvement' : 'increase'}
        </span>
      )}
    </div>
  );
}

// ─── Status badge for emergency events ────────────────────────────────────
function EvBadge({ status }) {
  const styles = {
    DETECTED:   { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
    PREEMPTING: { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
    CLEARED:    { bg: '#dcfce7', color: '#059669', border: '#bbf7d0' },
  }[status] || { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' };

  return (
    <span style={{
      padding: '3px 10px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 800,
      textTransform: 'uppercase', letterSpacing: '0.05em',
      background: styles.bg, color: styles.color, border: `1px solid ${styles.border}`,
    }}>
      {status}
    </span>
  );
}

const tooltipStyle = {
  contentStyle: { background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 20px rgba(15,23,42,.1)', fontSize: '0.8rem' },
};

// ─── Main page ───────────────────────────────────────────────────────────────
export default function TrafficDashboard() {
  const [comparison,    setComparison   ] = useState(null);
  const [mergedWaiting, setMergedWaiting] = useState([]);
  const [mergedQueue,   setMergedQueue  ] = useState([]);
  const [mergedCO2,     setMergedCO2    ] = useState([]);
  const [evEvents,      setEvEvents     ] = useState([]);
  const [loading,       setLoading      ] = useState(true);
  const [error,         setError        ] = useState(null);
  const [lastRefresh,   setLastRefresh  ] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cmp, dual, ev] = await Promise.all([
        fetch(`${API}/comparison`).then(r => r.json()),
        fetch(`${API}/metrics?mode=dual`).then(r => r.json()),
        fetch(`${API}/emergency_events?mode=ai`).then(r => r.json()),
      ]);

      if (cmp.error) { setError(cmp.error); }
      else           { setError(null); setComparison(cmp); }

      const dualData = dual.data || [];
      setMergedWaiting(dualData.map(d => ({
        step:     d.step,
        Baseline: d.grid_a_waiting != null ? +d.grid_a_waiting.toFixed(2) : null,
        AI:       d.grid_b_waiting != null ? +d.grid_b_waiting.toFixed(2) : null,
      })));
      setMergedQueue(dualData.map(d => ({ step: d.step, Baseline: d.grid_a_queue, AI: d.grid_b_queue })));
      setMergedCO2(dualData.map(d => ({
        step:     d.step,
        Baseline: d.grid_a_co2 != null ? +(d.grid_a_co2 / 1000).toFixed(2) : null,
        AI:       d.grid_b_co2 != null ? +(d.grid_b_co2 / 1000).toFixed(2) : null,
      })).filter(d => d.step % 100 === 0));
      setEvEvents(ev.data || []);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e) {
      setError('Cannot reach the Gridlock-Breaker API. Start it with: uvicorn api.main:app --port 8100');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const compData = comparison && !comparison.error ? [
    { name: 'Avg Waiting (s)',  Baseline: +(comparison.baseline.avg_waiting_time?.toFixed(2)  || 0), AI: +(comparison.ai.avg_waiting_time?.toFixed(2)  || 0) },
    { name: 'Avg Queue (veh)', Baseline: +(comparison.baseline.avg_queue_length?.toFixed(2)   || 0), AI: +(comparison.ai.avg_queue_length?.toFixed(2)   || 0) },
    { name: 'Throughput',      Baseline: comparison.baseline.total_throughput || 0,                   AI: comparison.ai.total_throughput || 0 },
    { name: 'EV Response (s)', Baseline: comparison.baseline.avg_emergency_response_time || 0,        AI: comparison.ai.avg_emergency_response_time || 0 },
  ] : [];

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, margin: '0 auto 20px', borderRadius: '50%',
            background: 'linear-gradient(135deg,#2563eb,#10b981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 40px rgba(37,99,235,.3)',
            animation: 'pulse-dot 1.8s ease-in-out infinite',
          }}>
            <span style={{ fontSize: '2rem' }}>🚦</span>
          </div>
          <p style={{ color: '#64748b', fontWeight: 600 }}>Loading traffic simulation data…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-float-up">

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14,
            background: 'linear-gradient(135deg,#2563eb,#10b981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(37,99,235,.3)',
          }}>
            {/* Traffic light SVG logo */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="7" y="2" width="10" height="20" rx="5" fill="rgba(255,255,255,0.15)"/>
              <circle cx="12" cy="7"  r="2.5" fill="#ef4444"/>
              <circle cx="12" cy="12" r="2.5" fill="#f59e0b"/>
              <circle cx="12" cy="17" r="2.5" fill="#10b981"/>
            </svg>
          </div>
          <div>
            <h1 style={{
              fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.15,
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              background: 'linear-gradient(135deg,#1d4ed8,#10b981)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Gridlock-Breaker AI
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 500, marginTop: 3 }}>
              AI Traffic Signal Optimization · Baseline vs PPO Model
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastRefresh && (
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
              SYNCED: {lastRefresh}
            </span>
          )}
          <button
            onClick={fetchData}
            style={{
              padding: '9px 18px', borderRadius: 12,
              background: 'linear-gradient(135deg,#2563eb,#0ea5e9)',
              border: 'none', color: '#fff',
              fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37,99,235,.25)',
              display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            ↻ Refresh Data
          </button>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 99,
            background: '#f8fafc', border: '1.5px solid #e2e8f0',
            fontSize: '0.78rem', fontWeight: 700, color: '#64748b',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: comparison ? '#22c55e' : '#f59e0b',
              display: 'inline-block',
              animation: 'pulse-dot 2s infinite',
            }} />
            {comparison ? 'Data Loaded' : 'Simulation Pending'}
          </div>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          background: '#fff5f5', border: '1.5px solid #fca5a5',
          borderRadius: 14, padding: '14px 18px',
          color: '#dc2626', fontSize: '0.875rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: '1.1rem' }}>⚠️</span>
          {error}
        </div>
      )}

      {/* ── Legend + Interpretation ── */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
          {[['#f97316','Baseline Control (Fixed-time)'],['#10b981','AI Optimized (PPO Reinforcement Learning)']].map(([c,l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: c, display: 'inline-block' }} />
              {l}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: 8, display: 'flex', gap: 8 }}>
              💡 How to Read This Dashboard
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.6 }}>
              Compares standard fixed-time signal control (<strong>Baseline</strong>) against our
              {' '}<strong>AI-Optimized PPO</strong> model. The AI dynamically adjusts signals based on
              real-time vehicle demand, queue lengths, and emergency vehicle detection.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
            {[
              ['#f97316','Baseline: Fixed-time signal patterns'],
              ['#10b981','AI Optimized: Adaptive RL control'],
            ].map(([c,t]) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#64748b' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: c, flexShrink: 0 }} />
                {t}
              </div>
            ))}
            <p style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600 }}>
              * Goal: Reduce waiting time & prioritise Emergency Vehicles
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {comparison && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          <KpiCard label="Avg Waiting Time"   baseVal={comparison.baseline.avg_waiting_time}              aiVal={comparison.ai.avg_waiting_time}              unit="s"     accentColor="#f97316" />
          <KpiCard label="Avg Queue Length"   baseVal={comparison.baseline.avg_queue_length}              aiVal={comparison.ai.avg_queue_length}              unit="veh"   accentColor="#2563eb" />
          <KpiCard label="Total Throughput"   baseVal={comparison.baseline.total_throughput}              aiVal={comparison.ai.total_throughput}              unit="veh"   accentColor="#10b981" lowerIsBetter={false} />
          <KpiCard label="EV Response Time"   baseVal={comparison.baseline.avg_emergency_response_time}   aiVal={comparison.ai.avg_emergency_response_time}   unit="steps" accentColor="#dc2626" format={v => v != null ? v.toFixed(0) : 'N/A'} />
          <KpiCard label="Total CO₂ Emission" baseVal={(comparison.baseline.total_co2 || 0) / 1000}        aiVal={(comparison.ai.total_co2 || 0) / 1000}        unit="kg"    accentColor="#7c3aed" format={v => v?.toFixed(0) ?? 'N/A'} />
          <KpiCard label="Average Speed"      baseVal={comparison.baseline.avg_speed}                      aiVal={comparison.ai.avg_speed}                      unit="m/s"   accentColor="#0ea5e9" lowerIsBetter={false} />
        </div>
      )}

      {/* ── Overall Bar Chart ── */}
      {compData.length > 0 && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ marginBottom: 8 }}>
            <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              Overall Performance Summary <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key Metrics Aggregated</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
              Higher throughput is better; lower waiting time, queue length, and emissions are better.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={compData} margin={{ top: 10, right: 20, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} interval={0}
                label={{ value: 'Traffic Metrics', position: 'insideBottom', offset: -25, fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false}
                label={{ value: 'Value', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
              <Tooltip cursor={{ fill: 'rgba(241,245,249,0.7)' }} content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: 28, fontSize: '0.8rem', fontWeight: 700 }} />
              <Bar dataKey="Baseline" fill={COLORS.baseline} radius={[6, 6, 0, 0]} barSize={36} />
              <Bar dataKey="AI"       fill={COLORS.ai}       radius={[6, 6, 0, 0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Timeline Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 16 }}>
        {mergedWaiting.length > 0 && (
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', marginBottom: 16, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              Average Waiting Time <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, marginLeft: 8, textTransform: 'uppercase' }}>Temporal</span>
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={mergedWaiting} margin={{ left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="step" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false}
                  label={{ value: 'Simulation Step', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false}
                  label={{ value: 'Time (s)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                <Tooltip content={<CustomTooltip unit="s" />} />
                <Line type="monotone" dataKey="Baseline" stroke={COLORS.baseline} dot={false} strokeWidth={3} strokeOpacity={0.4} />
                <Line type="monotone" dataKey="AI"       stroke={COLORS.ai}       dot={false} strokeWidth={4} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {mergedQueue.length > 0 && (
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', marginBottom: 16, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              Queue Length <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, marginLeft: 8, textTransform: 'uppercase' }}>Congestion</span>
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={mergedQueue} margin={{ left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="step" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false}
                  label={{ value: 'Simulation Step', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false}
                  label={{ value: 'Vehicles', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                <Tooltip content={<CustomTooltip unit=" v" />} />
                <Line type="monotone" dataKey="Baseline" stroke={COLORS.baseline} dot={false} strokeWidth={3} strokeOpacity={0.4} />
                <Line type="monotone" dataKey="AI"       stroke={COLORS.ai}       dot={false} strokeWidth={4} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── CO₂ Chart (full width) ── */}
      {mergedCO2.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', marginBottom: 16, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            CO₂ Emissions Optimization <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, marginLeft: 8, textTransform: 'uppercase' }}>Interval Analysis (kg)</span>
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mergedCO2} margin={{ left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="step" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false}
                label={{ value: 'Timeline (Steps)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false}
                label={{ value: 'CO₂ (kg)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
              <Tooltip content={<CustomTooltip unit=" kg" />} />
              <Line type="monotone" dataKey="Baseline" stroke={COLORS.baseline} dot={false} strokeWidth={3} strokeOpacity={0.3} strokeDasharray="5 5" />
              <Line type="monotone" dataKey="AI"       stroke={COLORS.ai}       dot={false} strokeWidth={4} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Emergency Events Table ── */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🚨</div>
          <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            Emergency Response Timeline
          </h3>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
            Real-time Interventions
          </span>
        </div>

        {evEvents.length > 0 ? (
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  {['Step','Vehicle ID','Status','Signal Node'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evEvents.slice(0, 50).map((ev, i) => (
                  <tr key={i} style={{ background: ev.status === 'PREEMPTING' ? 'rgba(220,38,38,.03)' : ev.status === 'DETECTED' ? 'rgba(245,158,11,.03)' : 'transparent' }}>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#2563eb', fontWeight: 800, fontFamily: 'monospace', borderTop: '1px solid #f1f5f9' }}>
                      #{ev.step}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 700, color: '#334155', borderTop: '1px solid #f1f5f9' }}>
                      {ev.vehicle_id}
                    </td>
                    <td style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
                      <EvBadge status={ev.status} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', borderTop: '1px solid #f1f5f9' }}>
                      {ev.tl_id ? `Node ${ev.tl_id}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {evEvents.length > 50 && (
              <div style={{ padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
                Showing latest 50 of {evEvents.length} events
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '48px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '2px dashed #e2e8f0' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.5 }}>📡</div>
            <p style={{ fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>No emergency events detected</p>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 4 }}>Run AI simulation to monitor real-time signal preemption</p>
          </div>
        )}
      </div>

    </div>
  );
}
