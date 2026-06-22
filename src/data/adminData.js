export const cohorts = [
  {
    id: 'ex-lx-25',
    name: "EX to LX Cohort '25",
    programme: 'Development Centre',
    eventDate: '25–26 Jul 2025',
    participantCount: 8,
  },
  {
    id: 'mx-ex-25',
    name: "MX to EX Cohort '25",
    programme: 'Development Centre',
    eventDate: '18–19 Sep 2025',
    participantCount: 12,
  },
]

export const participants = [
  { id: 'rahul-kumar', name: 'Rahul Kumar', initials: 'RK', employeeId: 'EX-78432', designation: 'Senior Manager', bu: 'Two-Wheeler', cohortId: 'ex-lx-25', progress: 86, stage: 'DC assessments', responses: 7, totalResponses: 8, reportStatus: 'waiting', lastActivity: '18 Jun 2025' },
  { id: 'neha-sharma', name: 'Neha Sharma', initials: 'NS', employeeId: 'EX-77214', designation: 'Senior Manager', bu: 'EV & New Businesses', cohortId: 'ex-lx-25', progress: 100, stage: 'Completed', responses: 7, totalResponses: 7, reportStatus: 'generated', lastActivity: '19 Jun 2025' },
  { id: 'arjun-patel', name: 'Arjun Patel', initials: 'AP', employeeId: 'EX-76103', designation: 'Deputy General Manager', bu: 'International Business', cohortId: 'ex-lx-25', progress: 75, stage: '360 feedback', responses: 6, totalResponses: 8, reportStatus: 'waiting', lastActivity: '17 Jun 2025' },
  { id: 'sunita-rao', name: 'Sunita Rao', initials: 'SR', employeeId: 'EX-75991', designation: 'Senior Manager', bu: 'Finance', cohortId: 'ex-lx-25', progress: 100, stage: 'Completed', responses: 9, totalResponses: 9, reportStatus: 'generated', lastActivity: '20 Jun 2025' },
  { id: 'vikram-singh', name: 'Vikram Singh', initials: 'VS', employeeId: 'EX-75117', designation: 'Senior Manager', bu: 'Manufacturing', cohortId: 'ex-lx-25', progress: 63, stage: 'Pre-work', responses: 3, totalResponses: 8, reportStatus: 'waiting', lastActivity: '15 Jun 2025' },
  { id: 'meera-iyer', name: 'Meera Iyer', initials: 'MI', employeeId: 'EX-74882', designation: 'Senior Manager', bu: 'Human Resources', cohortId: 'ex-lx-25', progress: 92, stage: 'DC assessments', responses: 8, totalResponses: 8, reportStatus: 'ready', lastActivity: '20 Jun 2025' },
  { id: 'rohan-desai', name: 'Rohan Desai', initials: 'RD', employeeId: 'EX-74290', designation: 'Regional Manager', bu: 'Sales', cohortId: 'ex-lx-25', progress: 50, stage: '360 nominees', responses: 0, totalResponses: 7, reportStatus: 'waiting', lastActivity: '12 Jun 2025' },
  { id: 'kavita-nair', name: 'Kavita Nair', initials: 'KN', employeeId: 'EX-73904', designation: 'Senior Manager', bu: 'Digital & Technology', cohortId: 'ex-lx-25', progress: 38, stage: 'Role interview', responses: 0, totalResponses: 8, reportStatus: 'waiting', lastActivity: '10 Jun 2025' },
]

export const processSteps = [
  { id: 'application', label: 'Application profile', owner: 'Participant' },
  { id: 'role', label: 'Role interview', owner: 'Participant' },
  { id: 'photo', label: 'Photograph', owner: 'Participant' },
  { id: 'prework', label: 'Pre-work', owner: 'Participant' },
  { id: 'nominees', label: '360 nominees', owner: 'Participant' },
  { id: 'feedback', label: '360 feedback', owner: 'Nominees' },
  { id: 'assessment', label: 'DC assessments', owner: 'Assessors' },
  { id: 'report', label: 'Report', owner: 'TD' },
]

export const competencyScores = [
  { code: 'GI', name: 'Generates Ideas', self: 3.6, manager: 3.2, others: 3.4, aggregate: 3.4 },
  { code: 'SPC', name: 'Solves Problems Creatively', self: 3.5, manager: 3.1, others: 3.2, aggregate: 3.2 },
  { code: 'CIPC', name: 'Champions Improvement & Positive Change', self: 3.2, manager: 2.8, others: 3.0, aggregate: 3.0 },
  { code: 'DEP', name: 'Develops & Engages People', self: 3.1, manager: 3.5, others: 3.6, aggregate: 3.5 },
  { code: 'AMT', name: 'Aligns & Motivates Team', self: 3.4, manager: 3.6, others: 3.5, aggregate: 3.5 },
]

export function getParticipant(id) {
  return participants.find((participant) => participant.id === id)
}
