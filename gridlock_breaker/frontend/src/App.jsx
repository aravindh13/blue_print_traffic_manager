import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import './index.css'

const API = ''  // uses Vite proxy → http://localhost:8100

const COLORS = {
  baseline: '#f78166',
  ai:       '#3fb950',
  accent:   '#58a6ff',
}

// ─────────────────────────────────────────────
// Custom Tooltip
// ─────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1c2533', border: '1px solid #30363d', borderRadius: 10,
      padding: '10px 14px', fontSize: 13,
    }}>
      <p style={{ color: '#8b949e', marginBottom: 4 }}>Step {label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}{unit}</strong>
        </p>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────
function KpiCard({ label, baseVal, aiVal, unit, lowerIsBetter = true, format = v => v?.toFixed(1) ?? 'N/A' }) {
  const delta = baseVal != null && aiVal != null ? ((baseVal - aiVal) / (baseVal || 1)) * 100 : null
  const improved = lowerIsBetter ? delta > 0 : delta < 0
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-row">
        <div>
          <div className="kpi-val baseline">{format(baseVal)}</div>
          <div className="kpi-unit">Baseline</div>
        </div>
        <div style={{ color: '#30363d', fontSize: 18, marginBottom: 4 }}>→</div>
        <div>
          <div className="kpi-val ai">{format(aiVal)}</div>
          <div className="kpi-unit">AI (PPO)</div>
        </div>
        <div className="kpi-unit" style={{ marginBottom: 4 }}>{unit}</div>
      </div>
      {delta != null && (
        <div className={`improvement-tag${improved ? '' : ' worse'}`}>
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
// No Data Placeholder
// ─────────────────────────────────────────────
function NoData() {
  return (
    <div className="no-data">
      <h3>No simulation data yet</h3>
      <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>Run the simulations to populate the dashboard:</p>
      <p><code>python simulation/run_baseline.py</code></p>
      <p style={{ margin: '0.4rem 0' }}><code>python simulation/run_ai.py</code></p>
    </div>
  )
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

  const hasData = baseMetrics.length > 0 || aiMetrics.length > 0

  return (
    <>
      <header className="header">
        <div>
          <div className="header-title">🚦 Gridlock-Breaker</div>
          <div className="header-sub">AI vs Baseline Traffic Coordination — Comparative Study</div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {lastRefresh && <span style={{ color: '#8b949e', fontSize: '0.8rem' }}>Updated {lastRefresh}</span>}
          <button
            onClick={fetchData}
            style={{
              background: 'linear-gradient(135deg,#1f6feb,#388bfd)', border: 'none',
              borderRadius: 8, padding: '0.4rem 1rem', color: '#fff',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            }}
          >↻ Refresh</button>
          <div className="status-badge">
            <div className="status-dot" />
            {hasData ? 'Data Ready' : 'Awaiting Simulation'}
          </div>
        </div>
      </header>

      <main className="main">
        {error && (
          <div style={{ background: 'rgba(247,129,102,0.1)', border: '1px solid rgba(247,129,102,.3)', borderRadius: 12, padding: '1rem 1.2rem', marginBottom: '1.5rem', color: '#f78166', fontSize: '0.9rem' }}>
            ⚠️ {error}
          </div>
        )}

        <div className="legend">
          <div className="legend-item">
            <div className="legend-dot" style={{ background: COLORS.baseline }} />
            Baseline (Fixed-Timer)
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: COLORS.ai }} />
            AI (PPO + Emergency Preemption)
          </div>
        </div>

        {!hasData && <NoData />}

        {/* ── KPI Summary ── */}
        {comparison && (
          <div className="kpi-grid">
            <KpiCard label="Average Waiting Time" baseVal={comparison.baseline.avg_waiting_time} aiVal={comparison.ai.avg_waiting_time} unit="s" />
            <KpiCard label="Average Queue Length" baseVal={comparison.baseline.avg_queue_length} aiVal={comparison.ai.avg_queue_length} unit="veh" />
            <KpiCard label="Total Throughput" baseVal={comparison.baseline.total_throughput} aiVal={comparison.ai.total_throughput} unit="veh" lowerIsBetter={false} />
            <KpiCard label="EV Response Time" baseVal={comparison.baseline.avg_emergency_response_time} aiVal={comparison.ai.avg_emergency_response_time} unit="steps" format={v => v != null ? v.toFixed(0) : 'N/A'} />
            <KpiCard label="Total CO₂ Emission" baseVal={(comparison.baseline.total_co2 || 0) / 1000} aiVal={(comparison.ai.total_co2 || 0) / 1000} unit="kg" format={v => v?.toFixed(0) ?? 'N/A'} />
            <KpiCard label="Average Speed" baseVal={comparison.baseline.avg_speed} aiVal={comparison.ai.avg_speed} unit="m/s" lowerIsBetter={false} />
          </div>
        )}

        {/* ── Chart Grid ── */}
        <div className="charts-grid">

          {/* Grouped Bar — Overall Comparison */}
          {compData.length > 0 && (
            <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
              <div className="chart-title">Overall Performance Comparison <span>(aggregated over full run)</span></div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={compData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 12 }} angle={-18} textAnchor="end" interval={0} />
                  <YAxis tick={{ fill: '#8b949e', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: '#8b949e', fontSize: 13, paddingTop: 16 }} />
                  <Bar dataKey="Baseline" fill={COLORS.baseline} radius={[4,4,0,0]} />
                  <Bar dataKey="AI"       fill={COLORS.ai}       radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Waiting Time Timeline */}
          {mergedWaiting.length > 0 && (
            <div className="chart-card">
              <div className="chart-title">Average Waiting Time <span>(per step)</span></div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={mergedWaiting}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis dataKey="step" tick={{ fill: '#8b949e', fontSize: 11 }} label={{ value: 'Simulation Step', position: 'insideBottom', fill: '#8b949e', dy: 14, fontSize: 11 }} />
                  <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip unit="s" />} />
                  <Legend wrapperStyle={{ color: '#8b949e', fontSize: 13 }} />
                  <Line type="monotone" dataKey="Baseline" stroke={COLORS.baseline} dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="AI"       stroke={COLORS.ai}       dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Queue Length Timeline */}
          {mergedQueue.length > 0 && (
            <div className="chart-card">
              <div className="chart-title">Queue Length <span>(halted vehicles)</span></div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={mergedQueue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis dataKey="step" tick={{ fill: '#8b949e', fontSize: 11 }} label={{ value: 'Simulation Step', position: 'insideBottom', fill: '#8b949e', dy: 14, fontSize: 11 }} />
                  <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip unit=" veh" />} />
                  <Legend wrapperStyle={{ color: '#8b949e', fontSize: 13 }} />
                  <Line type="monotone" dataKey="Baseline" stroke={COLORS.baseline} dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="AI"       stroke={COLORS.ai}       dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* CO₂ Timeline */}
          {mergedCO2.length > 0 && (
            <div className="chart-card">
              <div className="chart-title">CO₂ Emissions <span>(kg per interval)</span></div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={mergedCO2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis dataKey="step" tick={{ fill: '#8b949e', fontSize: 11 }} label={{ value: 'Simulation Step', position: 'insideBottom', fill: '#8b949e', dy: 14, fontSize: 11 }} />
                  <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip unit=" kg" />} />
                  <Legend wrapperStyle={{ color: '#8b949e', fontSize: 13 }} />
                  <Line type="monotone" dataKey="Baseline" stroke={COLORS.baseline} dot={false} strokeWidth={2} strokeDasharray="5 3" />
                  <Line type="monotone" dataKey="AI"       stroke={COLORS.ai}       dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Emergency Events Table ── */}
        <div className="chart-card" style={{ marginBottom: '2rem' }}>
          <div className="chart-title">
            Emergency Vehicle Events <span>(AI simulation)</span>
          </div>
          {evEvents.length > 0 ? (
            <div className="event-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>Vehicle ID</th>
                    <th>Status</th>
                    <th>Traffic Light</th>
                  </tr>
                </thead>
                <tbody>
                  {evEvents.slice(0, 50).map((ev, i) => (
                    <tr key={i}>
                      <td style={{ color: '#58a6ff', fontWeight: 600 }}>{ev.step}</td>
                      <td style={{ fontFamily: 'monospace', color: '#e6edf3' }}>{ev.vehicle_id}</td>
                      <td><StatusBadge status={ev.status} /></td>
                      <td style={{ color: '#8b949e' }}>{ev.tl_id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {evEvents.length > 50 && <p style={{ textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', marginTop: '0.8rem' }}>Showing 50 of {evEvents.length} events</p>}
            </div>
          ) : (
            <p style={{ color: '#8b949e', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              No emergency events logged yet. Ambulances spawn randomly — run the AI simulation to see events.
            </p>
          )}
        </div>

      </main>
    </>
  )
}
