import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/Login'
import ParticipantLayout from './layouts/ParticipantLayout'
import Dashboard from './pages/participant/Dashboard'
import RoleInterview from './pages/participant/RoleInterview'
import Photograph from './pages/participant/Photograph'
import PreWork from './pages/participant/PreWork'
import Nominees360 from './pages/participant/Nominees360'
import Status360 from './pages/participant/Status360'
import Reports from './pages/participant/Reports'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/participant" element={<ParticipantLayout />}>
        <Route index element={<Navigate to="/participant/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="role-interview" element={<RoleInterview />} />
        <Route path="photograph" element={<Photograph />} />
        <Route path="pre-work" element={<PreWork />} />
        <Route path="360-nominees" element={<Nominees360 />} />
        <Route path="360-status" element={<Status360 />} />
        <Route path="reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
