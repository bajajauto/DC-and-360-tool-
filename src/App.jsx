import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { UserProvider } from './context/UserContext'
import LoginPage from './pages/Login'
import InviteRedeem from './pages/InviteRedeem'

// Participant
import ParticipantLayout from './layouts/ParticipantLayout'
import Dashboard from './pages/participant/Dashboard'
import RoleInterview from './pages/participant/RoleInterview'
import Photograph from './pages/participant/Photograph'
import PreWork from './pages/participant/PreWork'
import Nominees360 from './pages/participant/Nominees360'
import Status360 from './pages/participant/Status360'
import Reports from './pages/participant/Reports'
import Report360 from './pages/participant/Report360'

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
import { AuditLog, EmailOutbox, NotificationTemplates, QuestionBank, TrackersExports } from './pages/td/TDOperations'

// Assessor
import AssessorLayout from './layouts/AssessorLayout'
import CandidateProfiles from './pages/assessor/CandidateProfiles'
import EvidenceDetail from './pages/assessor/EvidenceDetail'

// BUHR
import BUHRLayout from './layouts/BUHRLayout'
import BUHRDashboard from './pages/buhr/Dashboard'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    document.querySelectorAll('[data-route-scroll]').forEach((element) => {
      element.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    })
  }, [pathname])

  return null
}

export default function App() {
  return (
    <UserProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/invite/:token" element={<InviteRedeem />} />

        <Route path="/participant" element={<ParticipantLayout />}>
          <Route index element={<Navigate to="/participant/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="role-interview" element={<RoleInterview />} />
          <Route path="photograph" element={<Photograph />} />
          <Route path="pre-work" element={<PreWork />} />
          <Route path="360-nominees" element={<Nominees360 />} />
          <Route path="360-status" element={<Status360 />} />
          <Route path="reports" element={<Reports />} />
          <Route path="360-report" element={<Report360 />} />
        </Route>

        <Route path="/respondent" element={<RespondentLayout />}>
          <Route index element={<Navigate to="/respondent/dashboard" replace />} />
          <Route path="dashboard" element={<RespondentDashboard />} />
          <Route path="feedback/:taskId" element={<FeedbackForm />} />
        </Route>

        <Route path="/td" element={<TDLayout />}>
          <Route index element={<Navigate to="/td/dashboard" replace />} />
          <Route path="dashboard" element={<Cohorts />} />
          <Route path="cohorts" element={<Cohorts />} />
          <Route path="participants/:participantId" element={<ParticipantDetail />} />
          <Route path="reports" element={<TDReports />} />
          <Route path="reports/:participantId" element={<ReportPreview />} />
          <Route path="exports" element={<TrackersExports />} />
          <Route path="outbox" element={<EmailOutbox />} />
          <Route path="question-bank" element={<QuestionBank />} />
          <Route path="templates" element={<NotificationTemplates />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="settings" element={<Placeholder title="Programme setup" />} />
        </Route>

        <Route path="/assessor" element={<AssessorLayout />}>
          <Route index element={<Navigate to="/assessor/candidates" replace />} />
          <Route path="candidates" element={<CandidateProfiles />} />
          <Route path="candidates/:participantId/:evidenceType" element={<EvidenceDetail />} />
        </Route>

        <Route path="/buhr" element={<BUHRLayout />}>
          <Route index element={<Navigate to="/buhr/dashboard" replace />} />
          <Route path="dashboard" element={<BUHRDashboard view="dashboard" />} />
          <Route path="people" element={<BUHRDashboard view="people" />} />
          <Route path="reports" element={<BUHRDashboard view="reports" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </UserProvider>
  )
}
