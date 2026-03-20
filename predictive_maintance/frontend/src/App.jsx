import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ControlDashboard from './pages/ControlDashboard'
import MaintenanceDashboard from './pages/MaintenanceDashboard'

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6 bg-slate-900/50">
          <Routes>
            <Route path="/" element={<Navigate to="/control" replace />} />
            <Route path="/control" element={<ControlDashboard />} />
            <Route path="/maintenance" element={<MaintenanceDashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
