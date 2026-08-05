const signature = `Warm Regards,
Talent Development
Bajaj Auto`

const support = `If you have any questions, please write to your Business HR, Palak Shukla (pshukla1@bajajauto.co.in), or Arshia Kriplani (learn@bajajauto.co.in).`

export const notificationTemplates = [
  {
    templateId: 'welcome',
    phase: 'Setup',
    trigger: 'Employee details uploaded, participant account created',
    recipient: 'Participant',
    subject: 'Welcome to the {{Cohort}} Development Centre | Your Tool credentials',
    body: `Dear {{Participant Name}},

Congratulations on being nominated for the {{Cohort}} Development Centre (DC) for {{Financial Year}}.

This is a carefully chosen step, and your nomination reflects the confidence your leaders have in your potential. Only a select group of individuals across the organization are nominated for this process, and you are among them.

We truly believe in your potential, and this is a step forward in enabling you to grow.

What is a Development Centre?

The Development Centre is a structured and rigorous process designed to help you gain deeper awareness of your strengths, development areas, and leadership potential.

As part of the process, you will participate in a series of simulations and exercises that mirror workplace situations and leadership challenges. To ensure objectivity and quality, trained external assessors will observe participants across these exercises and provide inputs based on demonstrated behaviours.

In addition to the Development Centre exercises, the process will also include a 360 Degree Feedback assessment to build a holistic understanding of your strengths and development opportunities.

The intent of the DC is developmental, not evaluative. The focus is on helping you build self-awareness and providing you with meaningful insights that can support your growth journey.

We see this as an investment in your future with us. While the process will require commitment and effort from your side, the insights and support you'll receive through it will benefit you immediately in your current role and in the long term as you prepare for larger responsibilities.

Getting Started

Your account on the Bajaj Auto 360/DC Tool is now active. Please save this email for future reference.

Login Details
Login Link: {{Login Link}}
Email ID: {{Participant Email}}
Password: {{Participant Password}}

Immediate Next Steps
1. Upload Photograph
2. Complete the Role Interview Form
3. Submit your 360 Degree Feedback nominations
4. Complete the Self Reflection Form

Deadline: {{Prework Deadline}} EOD

${support}

We wish you the very best for this development journey.

${signature}`,
  },
  {
    templateId: 'buhr-participant-credentials',
    phase: 'Setup',
    trigger: 'Participant accounts created for a cohort; sent once per BUHR after their mapped participants are set up',
    recipient: 'BUHR',
    subject: '{{Cohort}} | Login credentials of your mapped participants | Confidential',
    body: `Dear {{BUHR Name}},

As part of the {{Cohort}} Development Centre, accounts have been created on the Bajaj Auto 360/DC Tool for the participants mapped to you. Their login credentials are listed below for your reference.

Your BUHR Login Details
Login Link: {{Login Link}}
Email ID: {{BUHR Email}}
Password: {{BUHR Password}}

Please note: These credentials are shared for your reference and oversight only. Each participant is responsible for completing their own pre-work, Role Interview and self-assessment. Please do not use these credentials to log in on any participant's behalf. Doing so would compromise the confidentiality and integrity of their assessment.

Participants mapped to you:

Participant Name | Ticket ID | Login Email | Password
{{Participant Credentials}}

This email contains confidential information. Please store it securely and do not forward it.

${signature}`,
  },
  {
    templateId: 'nom-reminder',
    phase: '360 Cycle',
    trigger: 'Automatic at T-3 and T-1 before nomination deadline, if not submitted',
    recipient: 'Participant',
    subject: 'Reminder | Submit your 360 nominations by {{Nomination Deadline}}',
    body: `Dear {{Participant Name}},

As you move forward in your Development Centre journey, this is a reminder that your 360 nominations are yet to be submitted on the Bajaj Auto 360/DC Tool.

Please complete this by {{Nomination Deadline}} EOD.

Please note the following while nominating:

Self
- Description: Self-assessment completed by the participant
- Minimum nominees: 1
- Minimum responses required for reporting: 1

Reporting Manager
- Description: Immediate reporting manager
- Minimum nominees: 1 or more
- Minimum responses required for reporting: 1

Skip / BU Head
- Description: Skip-level manager or relevant BU Head
- Minimum nominees: 1 or more
- Minimum responses required for reporting: 1

Direct Reports
- Description: Team members reporting directly to the participant, if applicable
- Minimum nominees: Optional
- Minimum responses required for reporting: 2

Peers / Internal Customers / External Stakeholders
- Description: People who regularly interact with the participant
- Minimum nominees: 4 or more
- Minimum responses required for reporting: 2

Please ensure you fill all nominations before submitting. Changes cannot be made later.

Please note that the timelines given are sacrosanct and will not be extended.

Submitting your list launches your 360 immediately, so the earlier you submit, the more time your respondents have to respond.

${support}

${signature}`,
  },
  {
    templateId: 'nominations-confirmed',
    phase: '360 Cycle',
    trigger: 'Participant submits nominations, 360 launched',
    recipient: 'Participant',
    subject: 'Your 360 Degree Feedback is now live | {{Respondent Count}} respondents invited',
    body: `Dear {{Participant Name}},

Thank you for submitting your nominations. Your 360 Degree Feedback process has now been initiated.

Invitations have been sent to all {{Respondent Count}} respondents on your list, including your self-assessment. Respondents are to complete the form on or before {{360 Cutoff}}.

Please note:
- Your nominee list is now locked and cannot be changed.
- You can track response progress on the Tool at any time.
- You will not be able to see who has said what. Feedback is shown only as group aggregates.

Your 360° Feedback Report is confidential and shall be shared and used with utmost discretion by Managers, HR, and Assessors.

${support}

${signature}`,
  },
  {
    templateId: 'resp-invite',
    phase: '360 Cycle',
    trigger: '360 launched, one invitation per nominated respondent',
    recipient: 'Respondent',
    subject: 'Request for your feedback | 360 Degree Feedback for {{Participant Name}}',
    body: `Dear {{Respondent Name}},

You have been nominated to provide 360 Degree Feedback for {{Participant Name}} as their {{Relationship}}, as part of the {{Cohort}} Development Centre.

Your perspective will help them understand how others experience their strengths and contributions, and the areas where they can grow further. Your honest and considered inputs will support their development.

Feedback Link: {{Magic Link}}

This is a secure link personal to you and does not require a login or password. Please complete the form on or before {{360 Cutoff}}.

Confidentiality: Your individual responses will remain confidential and will not be shared with the participant or any other individual. Feedback from Peers, Direct Reports, and Stakeholders is combined and presented in aggregate form. Only Reporting Manager and Skip-Level Manager / BU Head feedback may be reported separately.

${support}

Thank you for your time and inputs.

${signature}`,
  },
  {
    templateId: 'resp-reminder',
    phase: '360 Cycle',
    trigger: 'Automatic final reminder at T-1 before the 360 cutoff, if pending',
    recipient: 'Respondent',
    subject: 'Reminder | 360 Degree Feedback for {{Participant Name}} is pending',
    body: `Dear {{Respondent Name}},

This is a gentle reminder that your 360 Degree Feedback for {{Participant Name}} is yet to be submitted.

Feedback Link: {{Magic Link}}
Time required: 15-20 minutes

The form closes on {{360 Cutoff}}. Please note that this timeline is sacrosanct and will not be extended.

Your inputs make a meaningful difference to this individual's development journey.

${support}

${signature}`,
  },
  {
    templateId: 'stage-deadline-reminder',
    phase: 'Documents',
    trigger: 'Automatic at T-3 and T-1 before each document deadline, if pending',
    recipient: 'Participant',
    subject: 'Reminder | Complete your Self Reflection by {{Prework Deadline}}',
    body: `Dear {{Participant Name}},

As you prepare for the {{Cohort}} Development Centre scheduled for {{DC Dates}}, the following items are still pending on the Bajaj Auto 360/DC Tool:

{{Pending Items}}

Please complete these by {{Prework Deadline}} EOD.

The Role Interview Form, Photograph, and Self Reflection Form are read by your assessors before the DC and help them understand your context. Please complete them with sincerity. The timelines are sacrosanct and will not be extended.

${support}

${signature}`,
  },
  {
    templateId: 'report-360-released',
    phase: 'Reports',
    trigger: 'TD Admin switches on 360° Feedback Report visibility for a participant',
    recipient: 'Participant',
    subject: 'Your 360° Feedback Report is now available',
    body: `Dear {{Participant Name}},

Thank you for participating in the 360 Degree Feedback process.

Your 360° Feedback Report is now available to view and download on the Bajaj Auto 360/DC Tool under My Reports.

As you read the report:
1. Please go through the How to Read This Report pages first.
2. Look for patterns and themes across respondent groups rather than individual scores.
3. Assume positive intent and view the feedback as an opportunity to learn.

Your report is confidential and shall be shared and used with utmost discretion by Managers, HR, and Assessors. Your Reporting Manager and BUHR have been copied for their awareness and support.

${support}

${signature}`,
  },
  {
    templateId: 'report-dc-released',
    phase: 'Reports',
    trigger: 'TD Admin switches on DC report visibility for a participant',
    recipient: 'Participant',
    subject: 'Your Development Centre Report is now available',
    body: `Dear {{Participant Name}},

In continuation with your DC, we are glad to share your DC Report. This report provides a balanced view of your strengths and development opportunities.

You can view and download it on the Bajaj Auto 360/DC Tool under My Reports.

Please go through the report thoroughly, as it will be useful for creating your Individual Development Plan (IDP). Your Reporting Manager and BUHR have been copied so that you can plan a development conversation together.

${support}

${signature}`,
  },
  {
    templateId: 'respondent-thank-you',
    phase: '360 Cycle',
    trigger: 'Respondent submits their 360 feedback',
    recipient: 'Respondent',
    subject: 'Thank you | Your feedback for {{Participant Name}} has been recorded',
    body: `Dear {{Respondent Name}},

Thank you for completing the 360 Degree Feedback for {{Participant Name}}. Your response has been recorded successfully.

Your inputs will be combined with feedback from other respondents and presented in aggregate form. No further action is required from you.

${signature}`,
  },
  {
    templateId: 'low-response-alert',
    phase: '360 Cycle',
    trigger: 'Automatic at T-3 before the 360 cutoff, if thresholds are not met',
    recipient: 'Participant',
    subject: 'Action needed | Your 360 may not generate a complete report',
    body: `Dear {{Participant Name}},

Your 360 window closes on {{360 Cutoff}}, and some respondent groups have not yet met the minimum responses required for reporting.

Responses received: {{Responded Count}} of {{Respondent Count}}
Groups below the minimum: {{Groups Below Threshold}}

Where a group does not meet the minimum, that group's scores cannot be shown in your report to protect respondent confidentiality. Please follow up personally with your pending respondents.

${support}

${signature}`,
  },
  {
    templateId: 'resp-recurring-reminder',
    phase: '360 Cycle',
    trigger: 'Automatic every two days until respondent submits or the window closes',
    recipient: 'Respondent',
    subject: 'Reminder | 360 Degree Feedback for {{Participant Name}} | {{Days Remaining}} days left',
    body: `Dear {{Respondent Name}},

Your 360 Degree Feedback for {{Participant Name}} is still pending. This reminder will stop as soon as you submit.

Feedback Link: {{Magic Link}}
Time required: 15-20 minutes
Closes on: {{360 Cutoff}} ({{Days Remaining}} days remaining)

If a respondent group does not receive the minimum responses, that group's feedback cannot be shown in the report. Your input genuinely affects whether this individual receives a complete picture.

${support}

${signature}`,
  },
  {
    templateId: 'daily-360-status',
    phase: '360 Cycle',
    trigger: 'Automatic daily from launch until cutoff while responses are outstanding',
    recipient: 'Participant',
    subject: 'Your 360 status | {{Responded Count}} of {{Respondent Count}} responses received',
    body: `Dear {{Participant Name}},

Here is the daily status of your 360 Degree Feedback. The window closes on {{360 Cutoff}} ({{Days Remaining}} days remaining).

Responses received: {{Responded Count}} of {{Respondent Count}}

Self: {{Self Responded}} / 1 — {{Self Status}}
Reporting Manager: {{RM Responded}} / {{RM Count}} — {{RM Status}}
Skip / BU Head: {{Skip Responded}} / {{Skip Count}} — {{Skip Status}}
Direct Reports: {{DR Responded}} / {{DR Count}} — {{DR Status}}
Peers / Internal Customers / External Stakeholders: {{Peer Responded}} / {{Peer Count}} — {{Peer Status}}

Awaiting a response from: {{Pending Respondent Names}}

Where a group does not meet the minimum responses, that group's feedback cannot be shown in your report. Please follow up personally with those still pending. This email stops automatically once all respondents have submitted.

${support}

${signature}`,
  },
  {
    templateId: 'nominees-submitted-buhr',
    phase: 'Operational',
    trigger: '360 nominees submitted by participant',
    recipient: 'BUHR',
    subject: '{{Participant Name}} has submitted 360 nominations',
    body: `Dear {{BUHR Name}},

{{Participant Name}} ({{Cohort}}) has submitted their 360 nominee list and invitations have been sent to {{Respondent Count}} respondents.

This is for your information; no action is required.

${signature}`,
  },
  {
    templateId: 'threesixty-closed',
    phase: 'Operational',
    trigger: '360 window closed for the cohort',
    recipient: 'TD Admin',
    subject: '360 window closed for {{Cohort}} | Response summary',
    body: `The 360 feedback window for {{Cohort}} has closed.

{{Response Summary}}

Reports can now be generated and reviewed in the Report Repository.

360 & DC Tool`,
  },
]
