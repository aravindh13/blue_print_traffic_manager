import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import './index.css'

const API = ''  // uses Vite proxy → http://localhost:8100

const COLORS = {
  baseline: '#f97316', // Amber-Orange
  ai:       '#10b981', // Emerald
  accent:   '#0284c7', // Ocean
}

// ─────────────────────────────────────────────
// Custom Tooltip
// ─────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(0, 0, 0, 0.05)',
      borderRadius: 12,
      padding: '12px 16px',
      fontSize: 12,
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      fontWeight: 600,
    }}>
      <p style={{ color: '#64748b', marginBottom: 6, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Step {label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, margin: '2px 0', display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
          <span>{p.name}:</span>
          <strong style={{ filter: 'brightness(0.8)' }}>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}{unit}</strong>
        </p>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────
function KpiCard({ label, baseVal, aiVal, unit, accentClass = 'ocean', lowerIsBetter = true, format = v => v?.toFixed(1) ?? 'N/A' }) {
  const delta = baseVal != null && aiVal != null ? ((baseVal - aiVal) / (baseVal || 1)) * 100 : null
  const improved = lowerIsBetter ? delta > 0 : delta < 0
  
  return (
    <div className={`kpi-card ${accentClass}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-row">
        <div>
          <div className="kpi-val baseline" style={{ fontSize: '18px', opacity: 0.7 }}>{format(baseVal)}</div>
          <div className="kpi-unit">Baseline</div>
        </div>
        <div style={{ color: '#cbd5e1', fontSize: 18, marginBottom: 8, fontWeight: 300 }}>→</div>
        <div>
          <div className="kpi-val ai">{format(aiVal)}</div>
          <div className="kpi-unit">AI (PPO)</div>
        </div>
        <div className="kpi-unit" style={{ marginBottom: 8, marginLeft: 'auto' }}>{unit}</div>
      </div>
      {delta != null && (
        <div className={`improvement-tag ${improved ? 'positive' : 'negative'}`}>
          {improved ? '▼' : '▲'} {Math.abs(delta).toFixed(1)}% {improved ? 'improvement' : 'increase'}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Emergency Events Badge
// ─────────────────────────────────────────────
function StatusBadge({ status }) {
  const cls = {
    DETECTED:   'badge badge-detected',
    PREEMPTING: 'badge badge-preempting',
    CLEARED:    'badge badge-cleared',
  }[status] || 'badge'
  return <span className={cls}>{status}</span>
}


// ─────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────
export default function App() {
  const [comparison, setComparison]   = useState(null)
  const [baseMetrics, setBaseMetrics] = useState([])
  const [aiMetrics, setAiMetrics]     = useState([])
  const [evEvents, setEvEvents]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const [cmp, dual, ev] = await Promise.all([
        fetch(`${API}/api/comparison`).then(r => r.json()),
        fetch(`${API}/api/metrics?mode=dual`).then(r => r.json()),
        fetch(`${API}/api/emergency_events?mode=ai`).then(r => r.json()),
      ])
      if (cmp.error) { setError(cmp.error); }
      else { setError(null); setComparison(cmp) }
      
      const dualData = dual.data || []
      
      // We map the unified dual step records directly to the chart formats
      setMergedWaiting(dualData.map(d => ({
        step: d.step,
        Baseline: d.grid_a_waiting != null ? +d.grid_a_waiting.toFixed(2) : null,
        AI: d.grid_b_waiting != null ? +d.grid_b_waiting.toFixed(2) : null
      })))
      
      setMergedQueue(dualData.map(d => ({
        step: d.step,
        Baseline: d.grid_a_queue,
        AI: d.grid_b_queue
      })))
      
      setMergedCO2(dualData.map(d => ({
        step: d.step,
        Baseline: d.grid_a_co2 != null ? +(d.grid_a_co2 / 1000).toFixed(2) : null,
        AI: d.grid_b_co2 != null ? +(d.grid_b_co2 / 1000).toFixed(2) : null
      })).filter(d => d.step % 100 === 0))
      
      setEvEvents(ev.data || [])
      setLastRefresh(new Date().toLocaleTimeString())
    } catch (e) {
      setError('Cannot reach API. Start the FastAPI backend first: uvicorn api.main:app --port 8100')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // React state for charts
  const [mergedWaiting, setMergedWaiting] = useState([])
  const [mergedQueue, setMergedQueue] = useState([])
  const [mergedCO2, setMergedCO2] = useState([])

  const compData = comparison && !comparison.error ? [
    { name: 'Avg Waiting Time (s)',   Baseline: +comparison.baseline.avg_waiting_time?.toFixed(2) || 0, AI: +comparison.ai.avg_waiting_time?.toFixed(2) || 0 },
    { name: 'Avg Queue Length',       Baseline: +comparison.baseline.avg_queue_length?.toFixed(2) || 0, AI: +comparison.ai.avg_queue_length?.toFixed(2) || 0 },
    { name: 'Throughput (vehicles)',  Baseline: comparison.baseline.total_throughput || 0,               AI: comparison.ai.total_throughput || 0 },
    { name: 'EV Response (steps)',    Baseline: comparison.baseline.avg_emergency_response_time || 0,    AI: comparison.ai.avg_emergency_response_time || 0 },
  ] : []

  if (loading) return (
    <div className="loading">
      <div className="spinner" />
      Loading simulation data...
    </div>
  )

  const hasData = !!comparison

  return (
    <>
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 4px 6px rgba(2, 132, 199, 0.2))' }}>
            <rect x="7" y="2" width="10" height="20" rx="5" fill="#1e293b" />
            <circle cx="12" cy="7" r="2.5" fill="#ef4444" />
            <circle cx="12" cy="12" r="2.5" fill="#f59e0b" />
            <circle cx="12" cy="17" r="2.5" fill="#10b981" />
            <path d="M12 2v20M7 12h10" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          </svg>
          <div>
            <div className="header-title">Gridlock-Breaker</div>
            <div className="header-sub">Advanced AI Traffic Coordination System</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {lastRefresh && <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: '600' }}>LAST SYNC: {lastRefresh}</span>}
          <button
            onClick={fetchData}
            style={{
              background: 'linear-gradient(135deg, var(--accent-blue), #0ea5e9)',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 20px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.2)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => e.target.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.target.style.transform = 'none'}
          >↻ Refresh Data</button>
          <div className="status-badge">
            <div className="status-dot" style={{ background: hasData ? 'var(--accent-green)' : 'var(--accent-orange)', boxShadow: hasData ? '0 0 8px var(--accent-green)' : '0 0 8px var(--accent-orange)' }} />
            {hasData ? 'System Online' : 'Simulation Pending'}
          </div>
        </div>
      </header>

      <main className="main">
        {error && (
          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '16px', padding: '16px 20px', marginBottom: '32px', color: '#e11d48', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span> {error}
          </div>
        )}

        <div className="legend">
          <div className="legend-item">
            <div className="legend-dot" style={{ background: COLORS.baseline }} />
            Baseline Control
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: COLORS.ai }} />
            AI Optimized (PPO)
          </div>
        </div>


        {/* ── Interpretation Guide ── */}
        <section style={{ 
          background: 'rgba(2, 132, 199, 0.03)', 
          border: '1px solid rgba(2, 132, 199, 0.1)', 
          borderRadius: '20px', 
          padding: '24px', 
          marginBottom: '32px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '32px'
        }}>
          <div>
            <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>💡</span> How to Interpret this Dashboard
            </h2>
            <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
              This dashboard compares standard traffic signal timing (<strong>Baseline</strong>) against our <strong>AI-Optimized PPO</strong> model. 
              The AI dynamically adjusts signals based on real-time vehicle demand, queue lengths, and emergency vehicle detection.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', fontWeight: '600', color: 'var(--text-tertiary)' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: COLORS.baseline }} /> Baseline: Fixed-time signal patterns.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', fontWeight: '600', color: 'var(--text-tertiary)' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: COLORS.ai }} /> AI Optimized: Adaptive reinforcement learning control.
            </div>
            <div style={{ fontSize: '11px', fontStyle: 'italic', color: 'var(--accent-blue)', marginTop: '4px' }}>
              * Optimization targets: Reduced waiting time & priority for Emergency Vehicles.
            </div>
          </div>
        </section>

        {/* ── KPI Summary ── */}
        {comparison && (
          <div className="kpi-grid">
            <KpiCard label="Avg Waiting Time" baseVal={comparison.baseline.avg_waiting_time} aiVal={comparison.ai.avg_waiting_time} unit="s" accentClass="amber" />
            <KpiCard label="Avg Queue Length" baseVal={comparison.baseline.avg_queue_length} aiVal={comparison.ai.avg_queue_length} unit="veh" accentClass="ocean" />
            <KpiCard label="Total Throughput" baseVal={comparison.baseline.total_throughput} aiVal={comparison.ai.total_throughput} unit="veh" accentClass="emerald" lowerIsBetter={false} />
            <KpiCard label="EV Response Time" baseVal={comparison.baseline.avg_emergency_response_time} aiVal={comparison.ai.avg_emergency_response_time} unit="steps" accentClass="crimson" format={v => v != null ? v.toFixed(0) : 'N/A'} />
            <KpiCard label="Total CO₂ Emission" baseVal={(comparison.baseline.total_co2 || 0) / 1000} aiVal={(comparison.ai.total_co2 || 0) / 1000} unit="kg" accentClass="purple" format={v => v?.toFixed(0) ?? 'N/A'} />
            <KpiCard label="Average Speed" baseVal={comparison.baseline.avg_speed} aiVal={comparison.ai.avg_speed} unit="m/s" accentClass="sky" lowerIsBetter={false} />
          </div>
        )}

        {/* ── Chart Grid ── */}
        <div className="charts-grid">

          {/* Grouped Bar — Overall Comparison */}
          {compData.length > 0 && (
            <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
              <div className="chart-title">Overall Performance Summary <span>Key Metrics Aggregated</span></div>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px', fontWeight: '500' }}>
                Comparison of total system performance across different traffic parameters. Higher throughput is better; lower waiting time, queue length, and emissions are better.
              </p>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={compData} margin={{ top: 10, right: 20, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                    axisLine={{ stroke: '#e2e8f0' }} 
                    tickLine={false} 
                    interval={0}
                    label={{ value: 'Traffic Metrics', position: 'insideBottom', offset: -25, fill: '#64748b', fontSize: 12, fontWeight: 800 }}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false}
                    label={{ value: 'Performance Value', angle: -90, position: 'insideLeft', offset: 0, fill: '#64748b', fontSize: 12, fontWeight: 800 }}
                  />
                  <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }} content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '30px', fontSize: '12px', fontWeight: '700' }} />
                  <Bar dataKey="Baseline" fill={COLORS.baseline} radius={[6, 6, 0, 0]} barSize={40} />
                  <Bar dataKey="AI"       fill={COLORS.ai}       radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Waiting Time Timeline */}
          {mergedWaiting.length > 0 && (
            <div className="chart-card">
              <div className="chart-title">Average Waiting Time <span>Temporal Analysis</span></div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={mergedWaiting} margin={{ left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="step" 
                    tick={{ fill: '#94a3b8', fontSize: 10 }} 
                    axisLine={{ stroke: '#e2e8f0' }} 
                    tickLine={false}
                    label={{ value: 'Simulation Step', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false}
                    label={{ value: 'Time (s)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  />
                  <Tooltip content={<CustomTooltip unit="s" />} />
                  <Line type="monotone" dataKey="Baseline" stroke={COLORS.baseline} dot={false} strokeWidth={3} strokeOpacity={0.4} />
                  <Line type="monotone" dataKey="AI"       stroke={COLORS.ai}       dot={false} strokeWidth={4} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Queue Length Timeline */}
          {mergedQueue.length > 0 && (
            <div className="chart-card">
              <div className="chart-title">Queue Length <span>Congestion Monitoring</span></div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={mergedQueue} margin={{ left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="step" 
                    tick={{ fill: '#94a3b8', fontSize: 10 }} 
                    axisLine={{ stroke: '#e2e8f0' }} 
                    tickLine={false}
                    label={{ value: 'Simulation Step', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false}
                    label={{ value: 'Vehicles', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  />
                  <Tooltip content={<CustomTooltip unit=" v" />} />
                  <Line type="monotone" dataKey="Baseline" stroke={COLORS.baseline} dot={false} strokeWidth={3} strokeOpacity={0.4} />
                  <Line type="monotone" dataKey="AI"       stroke={COLORS.ai}       dot={false} strokeWidth={4} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* CO₂ Timeline */}
          {mergedCO2.length > 0 && (
            <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
              <div className="chart-title">CO₂ Emissions Optimization <span>Interval Analysis (kg)</span></div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={mergedCO2} margin={{ left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="step" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} label={{ value: 'Simulation Timeline (Steps)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false}
                    label={{ value: 'CO₂ (kg)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  />
                  <Tooltip content={<CustomTooltip unit=" kg" />} />
                  <Line type="monotone" dataKey="Baseline" stroke={COLORS.baseline} dot={false} strokeWidth={3} strokeOpacity={0.3} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="AI"       stroke={COLORS.ai}       dot={false} strokeWidth={4} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Emergency Events Table ── */}
        <div className="chart-card" style={{ marginBottom: '40px' }}>
          <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '18px' }}>🚨</span>
            </div>
            Emergency Response Timeline <span>Real-time Interventions</span>
          </div>
          {evEvents.length > 0 ? (
            <div className="event-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>Vehicle ID</th>
                    <th>Intervention Status</th>
                    <th>Signal Control</th>
                  </tr>
                </thead>
                <tbody>
                  {evEvents.slice(0, 50).map((ev, i) => (
                    <tr key={i} style={{ 
                      background: ev.status === 'PREEMPTING' ? 'rgba(225, 29, 72, 0.02)' : 
                                 ev.status === 'DETECTED' ? 'rgba(245, 158, 11, 0.02)' : 'transparent' 
                    }}>
                      <td style={{ color: 'var(--accent-blue)', fontWeight: '800', fontFamily: 'monospace' }}>#{ev.step}</td>
                      <td style={{ fontWeight: '700', color: '#334155' }}>{ev.vehicle_id}</td>
                      <td><StatusBadge status={ev.status} /></td>
                      <td style={{ fontWeight: '600', color: 'var(--text-tertiary)' }}>{ev.tl_id ? `Node ${ev.tl_id}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {evEvents.length > 50 && (
                <div style={{ padding: '16px', textAlign: 'center', background: '#f8fafc', borderTop: '1px solid var(--border-light)', color: 'var(--text-tertiary)', fontSize: '12px', fontWeight: '600' }}>
                  Showing latest 50 events from total {evEvents.length}
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
               <div style={{ fontSize: '32px', marginBottom: '16px', opacity: 0.5 }}>📡</div>
               <div style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '14px' }}>No emergency events detected in current buffer</div>
               <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '4px' }}>Run AI simulation to monitor real-time preemption</div>
            </div>
          )}
        </div>

      </main>
    </>
  )
}
