export const RATING_LABELS = {
  1: 'Rarely',
  2: 'Occasionally',
  3: 'Often',
  4: 'Almost Always',
}

export const MIN_COMMENT_LENGTH = 30

export const SURVEY_VARIANTS = {
  ALL_RESPONDENTS: 'ALL_RESPONDENTS',
  SENIOR_LEADER: 'SENIOR_LEADER',
}

export const SENIOR_LEADER_RELATIONSHIPS = new Set([
  'SKIP_MANAGER',
  'BU_HEAD',
  'Skip Manager',
  'Skip manager',
  'BU Head',
  'BU head',
  'Skip Manager / BU Head',
])

export const RELATIONSHIP_LABELS = {
  SELF: 'Self',
  REPORTING_MANAGER: 'Reporting Manager',
  SKIP_MANAGER: 'Skip Manager',
  BU_HEAD: 'BU Head',
  PEER: 'Peer / Internal Customer',
  DIRECT_REPORT: 'Direct Report',
}

export function getRelationshipLabel(relationship = '') {
  return RELATIONSHIP_LABELS[relationship] || relationship || 'Peer / Internal Customer'
}

export const SURVEY_SECTIONS = [
  {
    id: 'task-execution',
    title: 'Task and Execution',
    prompt:
      'Reflecting on how the Participant approaches idea generation, problem solving, and driving change, what should they Start, Stop, and Continue doing?',
    competencies: [
      {
        id: 'gi',
        title: 'Generates Ideas',
        shortCode: 'GI',
        behaviours: [
          { id: 'gi-1', text: 'Comes up with new ideas', seniorLeader: true },
          { id: 'gi-2', text: 'Encourages others to share ideas and builds on them' },
          { id: 'gi-3', text: 'Uses a structured approach to assess ideas for effectiveness' },
        ],
      },
      {
        id: 'spc',
        title: 'Solves Problems Creatively',
        shortCode: 'SPC',
        behaviours: [
          { id: 'spc-1', text: 'Defines and analyses the problem' },
          { id: 'spc-2', text: 'Identifies risks and constraints before planning actions to solve problems' },
          { id: 'spc-3', text: 'Implements solutions effectively', seniorLeader: true },
          { id: 'spc-4', text: 'Reviews progress and impact of solutions implemented', seniorLeader: true },
          { id: 'spc-5', text: 'Improves results through corrective action', seniorLeader: true },
        ],
      },
      {
        id: 'cipc',
        title: 'Champions Improvement & Positive Change',
        shortCode: 'CIPC',
        behaviours: [
          { id: 'cipc-1', text: 'Identifies and advocates for opportunities for improvement / change', seniorLeader: true },
          { id: 'cipc-2', text: 'Identifies and aligns stakeholders for change' },
          { id: 'cipc-3', text: 'Enables and drives execution for change', seniorLeader: true },
          { id: 'cipc-4', text: 'Evaluates and sustains change outcomes', seniorLeader: true },
        ],
      },
    ],
  },
  {
    id: 'people-relationships',
    title: 'People and Relationships',
    prompt:
      'Reflecting on how the Participant leads people, drives team performance, and collaborates across stakeholders, what should they Start, Stop, and Continue doing?',
    competencies: [
      {
        id: 'dep',
        title: 'Develops and Engages People',
        shortCode: 'DEP',
        behaviours: [
          { id: 'dep-1', text: 'Communicates goals and roles clearly and seeks team input on decisions' },
          { id: 'dep-2', text: 'Engages team and builds positive work relationships', seniorLeader: true },
          { id: 'dep-3', text: 'Periodically gives and receives feedback', seniorLeader: true },
          { id: 'dep-4', text: 'Resolves conflicts and enables risk-taking within the team' },
          { id: 'dep-5', text: 'Develops people and creates growth opportunities', seniorLeader: true },
          { id: 'dep-6', text: 'Builds collaborative and inclusive team environments' },
        ],
      },
      {
        id: 'amt',
        title: 'Aligns and Motivates Team',
        shortCode: 'AMT',
        behaviours: [
          { id: 'amt-1', text: 'Aligns team goals with organisational priorities and helps team see how their work connects to the bigger picture' },
          { id: 'amt-2', text: 'Drives accountability and ownership in team' },
          { id: 'amt-3', text: 'Removes barriers and optimises resources for team', seniorLeader: true },
          { id: 'amt-4', text: 'Fosters and recognises excellence in team' },
          { id: 'amt-5', text: 'Role models desired behaviour', seniorLeader: true },
        ],
      },
      {
        id: 'cwai',
        title: 'Collaborate with All Interfaces',
        shortCode: 'CWAI',
        behaviours: [
          { id: 'cwai-1', text: 'Builds and maintains critical stakeholder relationships', seniorLeader: true },
          { id: 'cwai-2', text: 'Influences stakeholders and encourages team to collaborate' },
          { id: 'cwai-3', text: 'Negotiates and resolves conflicts for effective outcomes' },
        ],
      },
    ],
  },
  {
    id: 'culture',
    title: 'Culture',
    prompt:
      'Reflecting on how the Participant sets standards of excellence, creates a learning culture, and brings multiple perspectives to decisions, what should they Start, Stop, and Continue doing?',
    competencies: [
      {
        id: 'ice',
        title: 'Inculcates a Culture of Excellence',
        shortCode: 'ICE',
        behaviours: [
          { id: 'ice-1', text: 'Sets and raises the bar for excellence', seniorLeader: true },
          { id: 'ice-2', text: 'Encourages diverse ideas and open discussion about failures' },
          { id: 'ice-3', text: 'Considers multiple perspectives for decision making' },
        ],
      },
    ],
  },
  {
    id: 'strategy-change',
    title: 'Strategy and Change',
    prompt:
      'Reflecting on how the Participant stays attuned to the business environment and shapes and executes strategy, what should they Start, Stop, and Continue doing?',
    competencies: [
      {
        id: 'acfs',
        title: 'Anticipates Changes & Formulates Strategy',
        shortCode: 'ACFS',
        behaviours: [
          {
            id: 'acfs-1',
            text: 'Scans the external environment, builds informed business strategy, and converts it into concrete plans',
            seniorLeader: true,
          },
        ],
      },
    ],
  },
]

export function getSurveyVariant(relationship = '') {
  return SENIOR_LEADER_RELATIONSHIPS.has(relationship) ? SURVEY_VARIANTS.SENIOR_LEADER : SURVEY_VARIANTS.ALL_RESPONDENTS
}

export function getSurveySections(relationship = '') {
  const variant = getSurveyVariant(relationship)

  if (variant === SURVEY_VARIANTS.ALL_RESPONDENTS) return SURVEY_SECTIONS

  return SURVEY_SECTIONS.map((section) => ({
    ...section,
    competencies: section.competencies
      .map((competency) => ({
        ...competency,
        behaviours: competency.behaviours.filter((behaviour) => behaviour.seniorLeader),
      }))
      .filter((competency) => competency.behaviours.length > 0),
  })).filter((section) => section.competencies.length > 0)
}

export function getBehaviourIds(sections) {
  return sections.flatMap((section) =>
    section.competencies.flatMap((competency) => competency.behaviours.map((behaviour) => behaviour.id)),
  )
}

export function getRequiredQuestionTotal(relationship = '') {
  const sections = getSurveySections(relationship)
  return getBehaviourIds(sections).length + sections.length * 3
}
