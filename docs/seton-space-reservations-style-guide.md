---
title: Seton Space Reservations — Style Guide
document_type: product_ux_content_and_engineering_style_guide
version: 1.0
status: baseline
date: 2026-06-29
audience:
  - product designers
  - content designers
  - frontend engineers
  - backend engineers
  - QA agents
  - AI implementation agents
companion_document: seton-space-reservations-masterplan.md
---

# Seton Space Reservations — Style Guide

## 1. Purpose

This guide defines how the Seton Space Reservations product should look, sound, behave, and be implemented.

It covers:

- Product principles
- Terminology
- Voice and tone
- Information architecture
- Interaction patterns
- Visual design rules
- Status design
- Forms
- Calendars
- Tables
- Notifications
- Accessibility
- Responsive behavior
- Engineering conventions
- AI-agent do and do-not rules

The master plan defines what the system must do. This style guide defines how that behavior should be presented and implemented consistently.

---

## 2. Product Character

The product should feel:

- Clear
- Dependable
- Calm
- Respectful
- Institutional but not bureaucratic
- Efficient
- Privacy-conscious
- Accessible
- Easy to scan

The product should not feel:

- Promotional
- Casual
- Playful
- Mysterious
- Overly technical
- Punitive
- Cluttered
- Visually noisy

---

## 3. Design Principles

### 3.1 Availability first

Users should understand whether a space is available before they encounter secondary details.

### 3.2 Status must be unmistakable

Every request and time block must have a clear text status. Color may support the status but may not replace text.

### 3.3 One primary action per screen

Examples:

- Public calendar: `Request this space`
- Access application: `Submit access request`
- Reservation form: `Review request`
- Manager review: `Approve request`

Secondary actions must be visually quieter.

### 3.4 Separate access approval from reservation approval

Never use vague text such as `Approved` without context when confusion is possible.

Preferred:

- `Requester access approved`
- `Reservation approved`

### 3.5 Protect private information by default

Public views use privacy-safe status labels only. Private details appear only after authentication and authorization.

### 3.6 Prevent errors before submission

Show availability, rules, validation, buffers, and conflicts early.

### 3.7 Explain the next step

Every status page should answer:

- What is the current status?
- Who must act?
- What happens next?
- When should the user expect an update?

### 3.8 Build for additional spaces

Do not design layouts, data structures, navigation, or copy as though DMC, Faustina Hall, and Gym are the only possible spaces.

---

## 4. Canonical Terminology

Use these terms exactly unless a formally approved product decision changes them.

| Use | Do Not Use |
|---|---|
| Space | Room, venue, facility interchangeably |
| Reservation request | Booking, application, order |
| Reservation | Booking request |
| Requester access | User approval, account approval |
| Seton user | Internal user, employee, member |
| External user | Outsider, guest user |
| Space manager | Room owner, approver, admin |
| Tech Admin | Super admin, webmaster |
| Approve | Accept, confirm |
| Decline | Reject, deny |
| Request changes | Send back, fail |
| Pending | Waiting, on hold |
| Blocked | Unavailable, busy, closed, unless the exact status is Closed |
| Confirmation number | Ticket number, case number |
| Public calendar | Master calendar |
| Availability | Openings |

### 4.1 Status labels

Use title case in UI labels:

- Draft
- Submitted
- Under Review
- Changes Requested
- Resubmitted
- Approved
- Declined
- Cancelled by Requester
- Cancelled by Manager
- Expired
- Completed

Public calendar:

- Available
- Pending
- Reserved
- Blocked
- Closed

External requester access:

- Not Submitted
- Submitted
- Under Review
- Changes Requested
- Approved
- Declined
- Suspended
- Revoked

### 4.2 Avoid ambiguous “approved”

Use:

- `Requester access approved`
- `Reservation approved`
- `Approved by [name] on [date]`

Avoid:

- `You are approved`
- `Approved` when more than one object may be approved

---

## 5. Voice and Tone

### 5.1 Core voice

Use plain, direct, neutral language.

Preferred:

> Your reservation request was submitted to the Gym managers.

Avoid:

> Great news! Your awesome request is on its way to our team!

### 5.2 Tone by situation

#### Routine

Calm and concise.

> Select a date to view availability.

#### Success

Clear, not celebratory.

> Reservation approved.

#### Pending

Specific about ownership.

> The Faustina Hall managers are reviewing your request.

#### Error

State the problem and recovery action.

> This time is no longer available. Choose a different time and submit again.

#### Decline

Respectful and factual.

> Your reservation request was declined because the space is unavailable at that time.

#### Permission denied

Do not imply wrongdoing.

> You do not have access to this request.

#### Destructive action

State consequences before confirmation.

> Cancel this reservation? The time will become available to other requesters.

---

## 6. Content Rules

### 6.1 Sentence style

- Use sentence case for headings, buttons, and labels.
- Use active voice.
- Keep sentences short.
- Put the action first.
- Avoid internal jargon.
- Define uncommon terms.
- Do not use exclamation points in system messages.
- Do not use emojis.

### 6.2 Button labels

Use verbs that describe the result.

Preferred:

- View availability
- Request this space
- Save draft
- Review request
- Submit request
- Approve request
- Decline request
- Request changes
- Cancel reservation
- Add block
- Assign manager

Avoid:

- Continue
- Done
- Yes
- No
- Submit, when a more precise label is possible

### 6.3 Confirmation language

Use explicit object names.

Preferred:

> Submit reservation request?

Avoid:

> Are you sure?

### 6.4 Dates and times

Display:

- `September 12, 2026`
- `3:00 PM–5:00 PM`
- `Eastern Time`

For compact tables:

- `Sep 12, 2026`
- `3:00–5:00 PM`

Rules:

- Always include the time zone when ambiguity is possible.
- Do not use ambiguous numeric dates such as `9/12/26`.
- Use an en dash for time ranges.
- Display daylight-saving-aware local time.
- Store timestamps in UTC.

### 6.5 Numbers

- Use numerals for capacity, dates, time, and counts.
- Use `25 people`, not `twenty-five people`.
- Use `1 request` and `2 requests`.
- Do not show unnecessary decimal places.

### 6.6 Empty states

Every empty state should include:

- What is empty
- Why it may be empty
- The next available action

Example:

> No pending requests  
> New requests for your assigned spaces will appear here.

---

## 7. Information Architecture

### 7.1 Public navigation

Recommended top-level items:

- Availability
- Spaces
- How it works
- Sign in

Optional:

- Policies
- Help

### 7.2 Signed-in requester navigation

- Availability
- My requests
- Spaces
- Help
- Account

### 7.3 Manager navigation

- Review requests
- Calendar
- Reservations
- Blocks
- Reports
- Help

### 7.4 Tech Admin navigation

- Access requests
- Users
- Spaces
- Managers
- Rules
- Notifications
- Audit log
- Reports
- System

### 7.5 Navigation rules

- Show only authorized sections.
- Do not show disabled links to unauthorized tools.
- Preserve the user's current space and date filters when practical.
- Use breadcrumbs in multi-level admin areas.
- Keep public navigation simple.

---

## 8. Page Layout

### 8.1 Standard page structure

1. Global header
2. Breadcrumbs, when needed
3. Page title
4. Short description or status summary
5. Primary action
6. Main content
7. Secondary information
8. Help or support link

### 8.2 Maximum content width

- Reading content: approximately 720–800 px
- Forms: approximately 640–760 px
- Dashboards and calendars: wider responsive container
- Avoid full-width paragraphs on large screens

### 8.3 Visual hierarchy

Use, in order:

1. Page title
2. Current status
3. Primary action
4. Key dates and space
5. Supporting details
6. History and metadata

Do not give internal metadata the same visual weight as the action the user must take.

---

## 9. Visual Foundation

The exact Seton brand palette and typography must be confirmed. Until confirmed, agents should use a restrained, accessible institutional theme and keep all design tokens centralized.

### 9.1 Color roles

Define tokens by purpose, not by raw color name.

Required semantic tokens:

- `surface`
- `surface-subtle`
- `surface-strong`
- `text-primary`
- `text-secondary`
- `text-inverse`
- `border`
- `border-strong`
- `action-primary`
- `action-primary-hover`
- `action-secondary`
- `focus`
- `status-available`
- `status-pending`
- `status-reserved`
- `status-blocked`
- `status-closed`
- `status-success`
- `status-warning`
- `status-danger`
- `status-neutral`

Do not scatter literal color values through component code.

### 9.2 Status color requirements

- Available: positive but not overly saturated
- Pending: caution/attention
- Reserved: strong occupied state
- Blocked: neutral or administrative unavailable state
- Closed: subdued unavailable state
- Declined/error: danger state
- Approved: success state

Each state must also include:

- Text label
- Icon or shape when useful
- Accessible contrast

### 9.3 Typography

Until brand fonts are confirmed:

- Use a system font stack.
- Use no more than two typeface families.
- Body text must remain highly readable.
- Minimum normal body size: 16 px.
- Avoid all caps except short utility labels.
- Avoid very light font weights.

Recommended scale:

- Display/page title: 32–40 px
- Section heading: 24–28 px
- Subheading: 20–22 px
- Body: 16–18 px
- Small metadata: 14 px minimum

### 9.4 Spacing

Use a consistent spacing scale, such as:

- 4
- 8
- 12
- 16
- 24
- 32
- 48
- 64

Avoid arbitrary one-off spacing values unless required for alignment.

### 9.5 Borders and elevation

- Use borders to define forms, cards, and tables.
- Use shadows sparingly.
- Do not use heavy card stacking.
- Keep status blocks visually distinct without excessive decoration.

### 9.6 Icons

- Use a consistent icon set.
- Pair unfamiliar icons with text.
- Do not use icons as the sole label for critical actions.
- Provide accessible names.
- Avoid decorative icons that add noise.

---

## 10. Core Components

### 10.1 Header

Public header:

- Seton or product identity
- Availability
- Spaces
- How it works
- Sign in

Authenticated header:

- Role-appropriate navigation
- User menu
- Clear role context when the user has multiple roles

### 10.2 Space card

Include:

- Space name
- Location
- Capacity
- Short description
- Current or next availability
- `View space` action
- Optional approved image

Do not show private manager information publicly.

### 10.3 Status badge

A status badge must:

- Use canonical label
- Have sufficient contrast
- Not rely on color alone
- Remain readable at 200% zoom
- Use consistent placement

### 10.4 Summary panel

Use for key request information:

- Status
- Space
- Date
- Time
- Confirmation number
- Requester action required
- Manager action required

### 10.5 Timeline

Use to show request history:

- Submitted
- Changes requested
- Resubmitted
- Approved or declined
- Cancelled

Each item may show:

- Date and time
- Actor role
- Public message
- Status

Do not expose manager-only notes.

### 10.6 Confirmation dialog

Use only for consequential actions:

- Approve
- Decline
- Cancel
- Revoke access
- Delete/archive a space
- Override conflict

Dialog must include:

- Action title
- Consequence
- Required reason when applicable
- Specific confirm button
- Safe cancel button

---

## 11. Calendar and Availability Design

### 11.1 Required views

- Day
- Week
- Month
- List

The List view is required for accessibility and small screens.

### 11.2 Public calendar content

Show:

- Space
- Date
- Time
- Public status

Do not show:

- Requester
- Event title
- Organization
- Private notes
- Manager identity

### 11.3 Calendar behavior

- Use clear grid labels.
- Keep time labels visible while scrolling when practical.
- Support keyboard navigation.
- Provide a text alternative.
- Show the time zone.
- Preserve filters when switching views.
- Make status legend visible.
- Avoid tiny click targets.
- Do not require hover.

### 11.4 Availability selection

When a requester chooses a time:

- Highlight the selected start and end.
- Show setup and cleanup effects.
- Warn about operating hours.
- Recheck availability before submission.
- Explain that availability is not final until approval.

### 11.5 Mobile calendar

Default to:

- Day or list view
- Large date controls
- Space selector
- Filter drawer
- Simple status rows

Do not force a desktop week grid onto a narrow screen.

---

## 12. Forms

### 12.1 Form structure

Group fields into sections:

1. Space and time
2. Event details
3. Attendance and setup
4. Services and accommodations
5. Contact information
6. Rules and confirmation
7. Review

### 12.2 Labels

- Every input has a visible label.
- Placeholder text does not replace a label.
- Required fields use text such as `Required`.
- Optional fields may use `Optional`.

### 12.3 Help text

Place help text before an error.

Example:

> Expected attendance  
> Include participants, staff, and guests.

### 12.4 Validation

- Validate on submit and when leaving a field if helpful.
- Do not display errors before the user interacts.
- Preserve all valid entries.
- Move focus to an error summary after failed submission.
- Link each summary error to the affected field.

### 12.5 Error copy

Preferred:

> End time must be later than start time.

Avoid:

> Invalid value.

Preferred:

> The Gym is not available from 3:00 PM to 5:00 PM. Choose another time.

Avoid:

> Conflict error 409.

### 12.6 Multi-step forms

Use a multi-step form only when it reduces cognitive load.

Required:

- Step names
- Current step
- Save draft
- Back action
- No loss of data
- Final review before submission

### 12.7 Attachments

When enabled:

- State allowed types and maximum size.
- Show upload progress.
- Show scan status.
- Allow removal before submission.
- Do not expose private attachments publicly.

---

## 13. Tables and Queues

### 13.1 Table use

Use tables for manager and admin queues when users need comparison across rows.

Columns should prioritize:

- Status
- Space
- Date and time
- Requester or organization, only for authorized users
- Submitted date
- Action required

### 13.2 Responsive tables

On small screens:

- Convert rows into stacked cards, or
- Keep only essential columns and allow row expansion.

Do not require horizontal scrolling for basic tasks when avoidable.

### 13.3 Sorting and filters

- Display active filters.
- Provide a clear `Reset filters` action.
- Keep sort labels explicit.
- Persist filters during the session where useful.

### 13.4 Row actions

Prefer one clear row action:

- `Review`

Place secondary actions inside the detail view or an accessible menu.

---

## 14. Dashboards

### 14.1 Requester dashboard

Prioritize:

1. Needs Attention
2. Pending
3. Upcoming Approved
4. Drafts
5. Past Requests

### 14.2 Manager dashboard

Prioritize:

1. New Requests
2. Requests Approaching Deadline
3. Conflicts
4. Upcoming Reservations
5. Recent Decisions

### 14.3 Tech Admin dashboard

Prioritize:

1. External Access Queue
2. System Exceptions
3. Unassigned Spaces
4. Failed Notifications
5. Recent Role Changes

Avoid decorative metrics without operational value.

---

## 15. Status Presentation

### 15.1 Reservation request page

At the top, show:

- Status badge
- Plain-language explanation
- Next step
- Owner of the next step
- Important deadline

Example:

> **Changes Requested**  
> The Gym manager needs additional information. Update the highlighted fields by September 10, 2026.

### 15.2 Public calendar

Use status and time only.

Example:

> 3:00 PM–5:00 PM — Reserved

### 15.3 Approved reservation

Show conditions prominently.

Example:

> **Reservation Approved**  
> Condition: Custodial support must be arranged before the event.

### 15.4 Declined request

Show:

- Declined status
- Reason category
- Requester-facing explanation
- Alternative action, when available

Do not show internal notes.

---

## 16. Notifications and Email Style

### 16.1 Email structure

1. Specific subject
2. Current status
3. Space, date, and time
4. Required action
5. Primary link
6. Supporting details
7. Support contact

### 16.2 Subject patterns

- `Reservation submitted — Gym — Sep 12`
- `Action required — Update your Faustina Hall request`
- `Reservation approved — DMC — Sep 12`
- `Reservation declined — Gym — Sep 12`
- `External requester access approved`
- `New external access request`
- `New reservation request — Faustina Hall — Sep 12`

### 16.3 Email body rules

- Keep the first paragraph useful, or omit it when the heading and Status card are enough.
- Include one primary action link.
- Do not include internal notes.
- Do not overuse branding.
- Include the time zone.
- Include the confirmation number for reservation messages.
- Use plain-text fallback.
- Avoid sensitive details in subject lines.
- Reservation details use labeled cards in one layout: label above, then a container. Text inside every container is centered. A divider sits above Request ID. Request ID is one row: the label on the left, then a container that lines up with the other cards, with the ID centered in it.
- Status is the only colored card when it appears: Pending (orange), Approved (green), or Declined (red). The manager request notice has no Status card. Space, When, Reason, Requester, Conflicts, decision stamps, Request ID, and Code stay the gray card.
- Requester confirmation heading is Reservation submitted. Manager notice heading is New reservation request. Do not use add-on or updated-request wording in those emails.
- Sign-in and sign-up: Code card, then the instruction under it. Color is never the only status signal.

### 16.4 In-app notification copy

Keep to:

- What changed
- Object
- Required action
- Time

Example:

> Changes requested for Gym reservation #SR-1042. Update by Sep 10.

---

## 17. Accessibility

Target: WCAG 2.2 AA.

### 17.1 Mandatory rules

- All functionality works with keyboard only.
- Focus order follows visual order.
- Focus is visible.
- Dialog focus is trapped and restored.
- Headings are hierarchical.
- Form fields have programmatic labels.
- Errors are announced.
- Status changes use live regions where appropriate.
- Text contrast meets requirements.
- Non-text contrast meets requirements.
- Controls have accessible names.
- Touch targets are sufficiently large.
- Content reflows at 400% zoom.
- Color is never the sole signal.
- Calendar has a list alternative.
- Motion respects reduced-motion preferences.
- Timeouts allow extension where user work may be lost.

### 17.2 Accessible naming

Preferred:

- `Approve reservation request for Gym on September 12, 2026`

Avoid:

- `Approve`

when multiple request actions are listed together.

### 17.3 Screen-reader order

For request detail:

1. Page title
2. Status
3. Required action
4. Space and date
5. Primary action
6. Request details
7. Messages
8. History

---

## 18. Responsive Design

### 18.1 Breakpoint philosophy

Use content-driven breakpoints rather than device-specific labels.

### 18.2 Mobile priorities

- Availability
- Status
- Date and time
- Primary action
- Required fields
- Simple navigation

### 18.3 Desktop enhancements

- Side-by-side calendar and details
- Denser manager tables
- Persistent filters
- Split review panels

### 18.4 Prohibited responsive behavior

- Hiding essential fields on mobile
- Requiring hover
- Tiny calendar cells
- Horizontal scrolling for the main request form
- Fixed-width dialogs wider than the viewport

---

## 19. Loading, Empty, and Error States

Every data-driven component must define:

- Loading
- Empty
- Partial
- Error
- Permission denied
- Stale or changed data
- Offline or unavailable service, where relevant

### 19.1 Loading

- Use text or skeletons.
- Do not shift layout excessively.
- Avoid indefinite spinners without context.

### 19.2 Stale data

Example:

> This request changed while you were reviewing it. Reload the latest version before deciding.

### 19.3 Service failure

Example:

> Availability could not be loaded. Try again. If the problem continues, contact support.

---

## 20. Privacy Style Rules

### 20.1 Public UI

Never render:

- Requester identity
- Organization
- Event title
- Event description
- Contact details
- Manager notes
- Decision notes
- Attachments

### 20.2 Authorized UI

Show only what the role needs.

- Requester: own request details
- Space manager: assigned-space request details
- Tech Admin: system-wide details for administration

### 20.3 Logging

Do not place the following in routine logs:

- Full request descriptions
- Phone numbers
- Full email body content
- Attachment contents
- Authentication tokens
- Secrets

---

## 21. Engineering Style

This section is framework-neutral unless the project approves a specific implementation stack.

### 21.1 General code rules

- Prefer clear names over short names.
- Keep business rules in testable domain services.
- Keep authorization close to data access and actions.
- Use typed interfaces.
- Avoid duplicated constants.
- Centralize statuses and transitions.
- Centralize domain configuration.
- Keep public and private response models separate.
- Keep external integrations behind adapters.
- Write small, focused functions.
- Avoid hidden side effects.
- Use structured errors.
- Use database transactions for approval and conflict checks.
- Use background jobs for email and non-critical integrations.

### 21.2 Naming

Entities:

- `ReservationRequest`
- `Reservation`
- `ExternalAccessApplication`
- `SpaceManagerAssignment`
- `AvailabilityBlock`
- `AuditEvent`

Functions:

- `canSubmitReservationRequest`
- `canManageSpace`
- `findAvailabilityConflicts`
- `approveReservationRequest`
- `declineReservationRequest`
- `requestReservationChanges`
- `createAvailabilityBlock`

Avoid vague names:

- `handleData`
- `processThing`
- `doApproval`
- `adminCheck`

### 21.3 Status implementation

- Use one canonical enum or equivalent source.
- Do not compare free-form strings.
- Validate transitions centrally.
- Record transitions with actor, reason, and timestamp.
- Do not infer status only from UI state.

### 21.4 Authorization implementation

Every privileged operation must answer:

- Who is the actor?
- What role do they have?
- What scope applies?
- What object are they acting on?
- Is the transition allowed?
- Must the action be audited?

### 21.5 Public data models

Create explicit public models.

Example concept:

```text
PublicAvailabilitySlot
- spaceId
- startAt
- endAt
- publicStatus
```

Do not serialize a full reservation and remove a few fields at the UI layer.

### 21.6 Date and time

- Store timestamps in UTC.
- Store a space time zone.
- Render in the space time zone.
- Test daylight-saving transitions.
- Avoid naive date objects.
- Include offsets in APIs.
- Treat start as inclusive and end as exclusive where practical.
- Document interval logic.

### 21.7 Database rules

- Use foreign keys.
- Use unique constraints where meaningful.
- Use indexes for availability and queue queries.
- Preserve audit history.
- Use migrations.
- Backfill safely.
- Avoid destructive migrations without a rollback plan.
- Prevent concurrent double booking at the database or transactional service layer.

### 21.8 Error codes

Use stable machine-readable codes, for example:

- `AUTH_REQUIRED`
- `EMAIL_NOT_VERIFIED`
- `REQUESTER_ACCESS_REQUIRED`
- `SPACE_NOT_FOUND`
- `SPACE_INACTIVE`
- `OUTSIDE_OPERATING_HOURS`
- `RESERVATION_CONFLICT`
- `INVALID_STATE_TRANSITION`
- `MANAGER_SCOPE_REQUIRED`
- `SELF_APPROVAL_NOT_ALLOWED`
- `VERSION_CONFLICT`
- `NOTIFICATION_FAILED`

The UI maps codes to user-facing messages.

### 21.9 Logging

Every log entry should include:

- Event name
- Correlation ID
- Actor ID or anonymized reference
- Entity type and ID
- Outcome
- Timestamp

Do not include secrets or unnecessary personal information.

---

## 22. API Style

### 22.1 Resources

Use nouns for resources and explicit action endpoints only where a state-changing command is clearer.

### 22.2 Responses

Include:

- Stable identifiers
- Canonical status
- Relevant timestamps
- Version for concurrency
- Links or action metadata when helpful

### 22.3 Errors

Return:

- HTTP status
- Stable error code
- Human-readable message
- Field errors when applicable
- Correlation ID

### 22.4 Idempotency

Require idempotency for:

- Request creation
- Submission
- Approval
- Decline
- Cancellation
- Notification dispatch
- Calendar export

### 22.5 Pagination

Use consistent:

- Cursor or page token
- Limit
- Sort
- Filter
- Total count only when practical

---

## 23. Test Style

### 23.1 Test names

Use behavior-focused names.

Preferred:

> prevents a Gym manager from approving a Faustina Hall request

Avoid:

> manager test 3

### 23.2 Required test categories

- Happy path
- Permission denied
- Invalid state transition
- Conflict
- Concurrent update
- Notification failure
- Public privacy
- Time-zone edge case
- Accessibility behavior

### 23.3 Test data

- Use fictional users and organizations.
- Do not copy production data.
- Include Seton and external domains.
- Include primary and backup managers.
- Include DST boundary dates.
- Include overlapping intervals.

---

## 24. Documentation Style

Every technical change should document:

- Purpose
- Behavior
- Configuration
- Permissions
- Data changes
- Failure modes
- Tests
- Rollback
- Open decisions

Use diagrams only when they improve understanding. Keep a text equivalent.

---

## 25. AI Agent Workflow

### 25.1 Before producing work

An AI agent must:

1. Read the master plan.
2. Identify relevant user roles.
3. Identify current and target states.
4. Check permissions.
5. Check privacy requirements.
6. Check accessibility requirements.
7. Check open decisions.
8. State assumptions.

### 25.2 During implementation

An AI agent must:

- Use canonical terminology.
- Reuse shared components and tokens.
- Implement loading, empty, error, and denied states.
- Add tests.
- Avoid unrelated refactors.
- Keep scope clear.
- Update docs when behavior changes.
- Flag policy decisions instead of silently inventing them.

### 25.3 Before completion

An AI agent must verify:

- Correct role can perform the action.
- Incorrect role cannot perform the action.
- Public data contains no private details.
- Status transition is valid.
- Conflict behavior is correct.
- Audit record is created.
- Email is privacy-safe.
- Keyboard and screen-reader behavior are considered.
- Mobile layout works.
- Tests cover failure cases.

---

## 26. Do and Do Not Reference

### Do

- Use `Reservation request submitted`.
- Use `Requester access approved`.
- Show the space, date, time, and time zone.
- Explain who acts next.
- Use one primary action.
- Use status text plus color/icon.
- Keep public availability privacy-safe.
- Use configuration for spaces, managers, domains, and rules.
- Test concurrent approvals.
- Preserve history.
- Provide a list view for calendars.
- Require a reason for declines, cancellations, and overrides.

### Do Not

- Do not say `Booking confirmed` before manager approval.
- Do not let Seton domain users bypass space-manager approval.
- Do not let external users request spaces before access approval.
- Do not expose event titles publicly.
- Do not show manager-only notes to requesters.
- Do not hard-code DMC, Faustina Hall, and Gym into reusable components.
- Do not use red/green alone.
- Do not use vague button labels such as `Yes`.
- Do not create a new status without updating the state model.
- Do not approve conflicts silently.
- Do not allow manager access outside assigned spaces.
- Do not use placeholders as labels.
- Do not discard user input after a recoverable error.
- Do not hide essential actions on mobile.
- Do not include secrets or personal data in logs.

---

## 27. Review Checklist

### Product

- Does the design match the master plan?
- Is requester access distinct from reservation approval?
- Is the next action clear?

### Content

- Are canonical terms used?
- Is copy direct and specific?
- Are dates, times, and time zones clear?
- Are decline and error messages respectful?

### Visual

- Is hierarchy clear?
- Is there one primary action?
- Are statuses distinguishable without color?
- Is the page uncluttered?

### Accessibility

- Is keyboard navigation complete?
- Are labels programmatic?
- Are errors announced?
- Is there a calendar list view?
- Does content reflow?

### Privacy

- Is public data safe?
- Are internal notes separated?
- Is role-scoped data enforced?

### Engineering

- Are permissions server-side?
- Are transitions validated centrally?
- Are conflicts transaction-safe?
- Are constants centralized?
- Are tests present?
- Is audit behavior implemented?

---

## 28. Unconfirmed Brand Items

The following require Seton approval before final visual polish:

- Official logo usage
- Brand colors
- Brand typography
- Photography rules
- Formal product name
- Co-branding rules
- Footer language
- Legal and privacy links

Until confirmed:

- Use neutral accessible tokens.
- Keep branding configurable.
- Do not invent official colors or logo treatments.
- Do not scrape or reuse brand assets without permission.

---

## 29. Final Style Rule

Every screen and message should make the current status, responsible party, next action, and privacy boundary obvious.

Clarity takes priority over decoration. Consistency takes priority over novelty. Security, privacy, accessibility, and prevention of double booking take priority over convenience.
