import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ControlDashboard from './pages/ControlDashboard'
import MaintenanceDashboard from './pages/MaintenanceDashboard'
import TrafficDashboard from './pages/TrafficDashboard'

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen" style={{ background: 'var(--color-surface-2)' }}>
        <Sidebar />
        <main className="flex-1 overflow-auto" style={{ background: 'var(--color-surface-2)' }}>
          <div className="p-6 max-w-screen-2xl mx-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/control" replace />} />
              <Route path="/control" element={<ControlDashboard />} />
              <Route path="/maintenance" element={<MaintenanceDashboard />} />
              <Route path="/traffic" element={<TrafficDashboard />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
