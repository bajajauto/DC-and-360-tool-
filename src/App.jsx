import { Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider } from './context/UserContext'
import LoginPage from './pages/Login'

// Participant
import ParticipantLayout from './layouts/ParticipantLayout'
import Dashboard from './pages/participant/Dashboard'
import RoleInterview from './pages/participant/RoleInterview'
import Photograph from './pages/participant/Photograph'
import PreWork from './pages/participant/PreWork'
import Nominees360 from './pages/participant/Nominees360'
import Status360 from './pages/participant/Status360'
import Reports from './pages/participant/Reports'

// Respondent
import RespondentLayout from './layouts/RespondentLayout'
import RespondentDashboard from './pages/respondent/Dashboard'
import FeedbackForm from './pages/respondent/FeedbackForm'

// Talent Development admin
import TDLayout from './layouts/TDLayout'
import Cohorts from './pages/td/Cohorts'
import ParticipantDetail from './pages/td/ParticipantDetail'
import ReportPreview from './pages/td/ReportPreview'
import TDReports from './pages/td/TDReports'
import Placeholder from './pages/td/Placeholder'

// Assessor
import AssessorLayout from './layouts/AssessorLayout'
import CandidateProfiles from './pages/assessor/CandidateProfiles'
import EvidenceDetail from './pages/assessor/EvidenceDetail'

export default function App() {
  return (
    <UserProvider>
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

        <Route path="/respondent" element={<RespondentLayout />}>
          <Route index element={<Navigate to="/respondent/dashboard" replace />} />
          <Route path="dashboard" element={<RespondentDashboard />} />
          <Route path="feedback/:taskId" element={<FeedbackForm />} />
        </Route>

        <Route path="/td" element={<TDLayout />}>
          <Route index element={<Navigate to="/td/cohorts" replace />} />
          <Route path="cohorts" element={<Cohorts />} />
          <Route path="participants/:participantId" element={<ParticipantDetail />} />
          <Route path="reports" element={<TDReports />} />
          <Route path="reports/:participantId" element={<ReportPreview />} />
          <Route path="settings" element={<Placeholder title="Programme setup" />} />
        </Route>

        <Route path="/assessor" element={<AssessorLayout />}>
          <Route index element={<Navigate to="/assessor/candidates" replace />} />
          <Route path="candidates" element={<CandidateProfiles />} />
          <Route path="candidates/:participantId/:evidenceType" element={<EvidenceDetail />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </UserProvider>
  )
}
