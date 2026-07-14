export const notificationTemplates = [
  {
    templateId: 'welcome',
    phase: 'Setup',
    trigger: 'Employee upload imported, participant account created',
    recipient: 'Participant',
    subject: 'Welcome to {{Cohort}}: your 360 & DC journey begins',
    body: `Dear {{Participant Name}},

Congratulations on being nominated for the {{Cohort}} Development Centre. You have been recognised as a strong performer with the potential to grow further, and this journey is designed to support exactly that.

Your account on the 360 & DC Tool is ready. Use the link below to set your password and sign in.

Set your password: {{Password Link}}

Once signed in, please complete these steps:
1. Confirm your details
2. Submit your 360 nominations by {{Nomination Deadline}}. Submitting launches your confidential 360 feedback automatically.
3. Complete your Pre-Work and upload your photograph

Your DC dates will be shared by the TD team. For any questions, write to learn@bajajauto.co.in.

We wish you the very best for this development journey.

Regards,
Talent Development, Bajaj Auto`,
  },
  {
    templateId: 'stage-deadline-reminder',
    phase: 'Documents',
    trigger: 'Role Interview / Photograph / Pre-Work deadline approaching (T-3, T-1)',
    recipient: 'Participant',
    subject: 'Reminder: complete your {{Item Name}} by {{Deadline}}',
    body: `Dear {{Participant Name}},

A quick reminder that your {{Item Name}} is still pending. Please sign in to the 360 & DC Tool and complete it by {{Deadline}}.

Regards,
Talent Development, Bajaj Auto`,
  },
  {
    templateId: 'nom-reminder',
    phase: '360 cycle',
    trigger: 'Nomination deadline approaching, list not yet submitted',
    recipient: 'Participant',
    subject: 'Reminder: submit your 360 nominations by {{Nomination Deadline}}',
    body: `Dear {{Participant Name}},

A quick reminder that your 360 nominations are still pending. Please sign in to the 360 & DC Tool and submit your nominee list by {{Nomination Deadline}}.

Submitting your list launches your confidential 360 feedback immediately, so the earlier you submit, the more time your respondents have.

Please ensure all nominations are complete before submitting; the list locks on submission.

Regards,
Talent Development, Bajaj Auto`,
  },
  {
    templateId: 'nominations-confirmed',
    phase: '360 cycle',
    trigger: 'Nominations submitted, 360 launched',
    recipient: 'Participant',
    subject: 'Your 360 is live: invitations sent to {{Respondent Count}} respondents',
    body: `Dear {{Participant Name}},

Thank you for submitting your nominations. Your confidential 360 degree feedback is now live.

Invitations have been emailed to all {{Respondent Count}} respondents on your list, including your self assessment link. Responses are due by {{360 Cutoff}}.

Your nominee list is now locked. You can track response progress from your dashboard, but individual responses are never visible to anyone; feedback is only ever shown as group aggregates in your report.

Regards,
Talent Development, Bajaj Auto`,
  },
  {
    templateId: 'nominees-submitted-buhr',
    phase: '360 cycle',
    trigger: '360 nominees submitted by participant',
    recipient: 'BUHR',
    subject: '{{Participant Name}} has submitted 360 nominations',
    body: `Dear {{BUHR Name}},

{{Participant Name}} ({{Cohort}}) has submitted their 360 nominee list and their confidential 360 feedback has been launched to {{Respondent Count}} respondents.

This is for your information; no action is required. You can view the nominee list and progress from your BUHR dashboard.

360 & DC Tool`,
  },
  {
    templateId: 'resp-invite',
    phase: '360 cycle',
    trigger: '360 launched, invitation to each respondent',
    recipient: 'Respondent',
    subject: 'Confidential: 360 feedback for {{Participant Name}}',
    body: `Dear {{Respondent Name}},

You have been invited to share confidential 360 degree feedback for {{Participant Name}} as their {{Relationship}}.

Your perspective will help them gain a fuller understanding of how others experience their strengths and contributions, and the areas where they can grow further. The form takes about {{Estimated Time}}.

Open your feedback form: {{Magic Link}}

This is a secure link personal to you. No login or password is needed. If you have been asked to give feedback for more than one participant, the same link shows all of them in one place with their status.

Individual responses are never shown. Feedback is consolidated and presented as aggregates per respondent group in the report.

Please complete the form by {{360 Cutoff}}.

Thank you for your time and considered inputs.

Regards,
Talent Development, Bajaj Auto`,
  },
  {
    templateId: 'resp-reminder',
    phase: '360 cycle',
    trigger: 'Manual or scheduled reminder to pending respondents',
    recipient: 'Respondent',
    subject: 'Reminder: your 360 feedback for {{Participant Name}} is pending',
    body: `Dear {{Respondent Name}},

A gentle reminder that your 360 feedback for {{Participant Name}} is still pending.

Open your feedback form: {{Magic Link}}

The form takes about {{Estimated Time}} and closes on {{360 Cutoff}}. Your considered, honest inputs make a real difference to their development.

Regards,
Talent Development, Bajaj Auto`,
  },
  {
    templateId: 'threesixty-closed',
    phase: '360 cycle',
    trigger: '360 window closed for the cohort',
    recipient: 'TD Admin',
    subject: '360 window closed for {{Cohort}}: response summary',
    body: `The 360 feedback window for {{Cohort}} has closed.

Summary: {{Response Summary}}

You can now generate 360 reports from Generate & Release. Reports are generated directly from the tool's template; review each draft before switching on visibility.

360 & DC Tool`,
  },
  {
    templateId: 'report-360-released',
    phase: 'Reports',
    trigger: 'TD switches on 360 report visibility for a participant',
    recipient: 'Participant',
    subject: 'Your 360 Feedback Report is now available',
    body: `Dear {{Participant Name}},

Your 360 Feedback Report has been released and is available under My Reports in the 360 & DC Tool.

A few suggestions as you read it:
1. Read the How to Read pages first; they explain the rating scale and how group aggregates work.
2. Look for patterns across respondent groups rather than individual numbers.
3. Use the Reflection Workbook at the end, and consider discussing your takeaways with your manager or a coach.

Your report is a confidential document. Please use and share it with discretion.

Regards,
Talent Development, Bajaj Auto`,
  },
  {
    templateId: 'report-dc-released',
    phase: 'Reports',
    trigger: 'TD switches on DC report visibility for a participant',
    recipient: 'Participant + Manager',
    subject: 'Your Development Centre Report is now available',
    body: `Dear {{Participant Name}},

Your Development Centre Report has been released and is available under My Reports in the 360 & DC Tool.

The report brings together your assessor observations from the DC and your 360 feedback. Please go through the Guide pages first, then review each competency page and the Owning Your Development section.

Your Reporting Manager has also been notified so you can plan a development conversation together.

Regards,
Talent Development, Bajaj Auto`,
  },
]
