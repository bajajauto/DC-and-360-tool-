export const RATING_LABELS = {
  1: 'Rarely',
  2: 'Occasionally',
  3: 'Often',
  4: 'Almost Always',
}

export const MIN_COMMENT_LENGTH = 30

const BEHAVIOUR_INDICATORS = {
  'gi-1': ['When faced with a problem, is able to come up with new ideas'],
  'gi-2': ['Encourages others to share ideas', 'Appreciates the merit in ideas shared by others', 'Synthesizes ideas shared by others'],
  'gi-3': ['Applies a structured approach to assess ideas for effectiveness'],
  'spc-1': ['Frames a clear problem statement when faced with a problem', 'Identifies the root cause of a problem through analysis', 'Steps back to identify patterns beyond isolated incidents to determine solutions'],
  'spc-2': ['Identifies relevant risks and organisational constraints before actioning'],
  'spc-3': ['Breaks the problem into parts for targeted solutions', 'Adapts existing solutions to address the current problem'],
  'spc-4': ['Reviews impact of newly implemented solutions', 'Evaluates whether solutions meet internal or external customer needs', 'Continuously reviews progress towards goal achievement'],
  'spc-5': ['Implements corrective action to improve effectiveness'],
  'cipc-1': ['Identifies opportunities and need for improvement or change', 'Visualizes the desired end state and builds a case for improvement or change'],
  'cipc-2': ['Identifies and secures sponsors for the change initiative', 'Works to gain buy-in from all relevant stakeholders', 'Works to resolve resistance from direct and indirect stakeholders'],
  'cipc-3': ['Defines clear milestones to guide the improvement or change', 'Resolves bottlenecks that emerge during execution', 'Provides support and negotiates for required tools and resources'],
  'cipc-4': ['Tracks progress and implements course correction', 'Evaluates outcomes and takes corrective action for gap closure'],
  'dep-1': ['Clearly communicates goals, roles, and responsibilities and confirms team understanding', "Actively seeks the team's input on goals and key decisions"],
  'dep-2': ['Builds and sustains positive work relations with team, peers, and external networks', 'Monitors and tracks people engagement'],
  'dep-3': ['Provides timely and constructive feedback', 'Is open to receiving feedback', 'Conducts periodic reviews to track progress and alignment'],
  'dep-4': ['Addresses and resolves conflicts in a way that benefits the organisation', 'Creates a safe environment where team members feel comfortable taking risks'],
  'dep-5': ['Provides coaching, mentoring, and stretch assignments', 'Provides development support to improve individual performance', 'Shares and leverages talent across the organisation'],
  'dep-6': ['Encourages collaboration among employees with diverse perspectives', 'Actively creates a more inclusive work environment', 'Challenges bias and stereotypes', 'Encourages ideas based on merit'],
  'amt-1': ['Understands and negotiates the brief from stakeholders', 'Aligns own and team goals to organisational goals', 'Connects organisational vision to team goals'],
  'amt-2': ['Sets clear accountability for goal achievement', 'Ensures individuals meet committed goals', 'Calls out undesired behaviour promptly and constructively'],
  'amt-3': ['Removes blocks or obstacles faced by the team', 'Enables resource optimisation for team effectiveness'],
  'amt-4': ['Recognises and appreciates individual and team efforts', 'Challenges the team to achieve higher performance', 'Creates a culture where people want to do their best'],
  'amt-5': ['Takes on stretch goals to model ownership', 'Champions speed, innovation, and continuous improvement', 'Leads from the front in challenging conditions'],
  'cwai-1': ['Identifies critical internal and external stakeholders and builds credibility', 'Maintains stakeholder relationships to secure commitment'],
  'cwai-2': ['Understands and balances stakeholder views', 'Encourages collaboration beyond team boundaries', 'Secures stakeholder buy-in while solving problems'],
  'cwai-3': ['Anticipates concerns and conflicts', 'Negotiates outcomes that prioritise organisational objectives', 'Finds common ground to resolve conflict'],
  'ice-1': ['Defines high standards and continuously raises the bar', 'Questions assumptions around existing systems and processes', 'Leverages internal and external best practices'],
  'ice-2': ['Creates a learning environment that encourages diverse ideas', 'Anticipates failures and promotes open discussion for learning'],
  'ice-3': ['Evaluates alternatives from multiple perspectives', 'Zooms in on details and out to see the bigger picture'],
  'acfs-1': ['Stays current with business, industry, technology, and macroeconomic trends', 'Anticipates market opportunities and risks', 'Applies business and financial acumen', 'Clearly articulates strategy to stakeholders', 'Converts strategy into concrete short- and long-term plans'],
}

export const SURVEY_VARIANTS = {
  ALL_RESPONDENTS: 'ALL_RESPONDENTS',
  SENIOR_LEADER: 'SENIOR_LEADER',
}

export const SURVEY_RATING_COUNTS = {
  [SURVEY_VARIANTS.ALL_RESPONDENTS]: 30,
  [SURVEY_VARIANTS.SENIOR_LEADER]: 15,
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
    fourA: 'Adapt',
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
          { id: 'spc-1', text: 'Defines & analyses the problem' },
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
          { id: 'cipc-1', text: 'Identifies & advocates for opportunities for improvement/ change', seniorLeader: true },
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
    fourA: 'Align',
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
          { id: 'amt-4', text: 'Fosters and recognizes excellence in team' },
          { id: 'amt-5', text: 'Role models desired behaviour', seniorLeader: true },
        ],
      },
      {
        id: 'cwai',
        title: 'Collaborate with All Interfaces',
        shortCode: 'CWAI',
        behaviours: [
          { id: 'cwai-1', text: 'Builds & maintains critical stakeholder relationships', seniorLeader: true },
          { id: 'cwai-2', text: 'Influences stakeholders and encourages team to collaborate' },
          { id: 'cwai-3', text: 'Negotiates and resolves conflicts for effective outcomes' },
        ],
      },
    ],
  },
  {
    id: 'culture',
    title: 'Culture',
    fourA: 'Align',
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
    fourA: 'Anticipate',
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
            text: 'Scans the external environment, builds informed business strategy, and converts it into concrete plans.',
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
  const sections = SURVEY_SECTIONS.map((section) => ({
    ...section,
    competencies: section.competencies
      .map((competency) => ({
        ...competency,
        behaviours: competency.behaviours
          .filter((behaviour) => variant === SURVEY_VARIANTS.ALL_RESPONDENTS || behaviour.seniorLeader)
          .map((behaviour) => ({ ...behaviour, indicators: BEHAVIOUR_INDICATORS[behaviour.id] || [] })),
      }))
      .filter((competency) => competency.behaviours.length > 0),
  })).filter((section) => section.competencies.length > 0)

  const ratingCount = sections.reduce(
    (total, section) => total + section.competencies.reduce((sectionTotal, competency) => sectionTotal + competency.behaviours.length, 0),
    0,
  )
  if (ratingCount !== SURVEY_RATING_COUNTS[variant]) {
    throw new Error(`Survey configuration error: ${variant} must contain exactly ${SURVEY_RATING_COUNTS[variant]} rating statements, found ${ratingCount}`)
  }

  return sections
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
