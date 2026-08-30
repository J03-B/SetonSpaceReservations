---
title: Seton Space Reservations — Master Plan
document_type: product_and_delivery_masterplan
version: 1.0
status: baseline
date: 2026-06-29
audience:
  - product managers
  - designers
  - engineers
  - QA agents
  - security reviewers
  - operations staff
  - AI implementation agents
source_of_truth: true
---

# Seton Space Reservations — Master Plan

## 1. Purpose of This Document

This document is the primary source of truth for the Seton Space Reservations project. It defines the product purpose, users, permissions, workflows, data model, business rules, security expectations, implementation approach, testing requirements, rollout plan, and constraints.

All human and AI contributors must use this document before making product, design, engineering, or operational decisions.

When another document conflicts with this master plan:

1. Follow the most recently approved decision.
2. Record the conflict.
3. Update this document or create a formal decision record.
4. Do not silently implement a contradictory interpretation.

---

## 2. Project Summary

Seton needs a public-facing space availability and reservation request system for shared facilities, initially:

- DMC
- Faustina Hall
- Gym

The system must allow anyone to view space availability by date and time without signing in.

Users with an approved requester account may submit reservation requests. Seton users are automatically eligible to submit requests after signing in with an approved Seton email domain. Non-Seton users must first request requester access. That access request is reviewed by Tech Admin.

Submitting a reservation request does not reserve the space immediately. Every reservation request must be approved or declined by a manager assigned to the requested space.

The product must protect personal information while making availability clear and preventing conflicting reservations.

---

## 3. Product Vision

Create one reliable, easy-to-use source for viewing and requesting Seton spaces, replacing fragmented email chains, informal calendars, and inconsistent approval processes.

The system should make the following questions easy to answer:

- Is the space available?
- Who may request it?
- Who approves the request?
- What information is required?
- What is the current request status?
- What changed, who changed it, and when?
- What will happen next?

---

## 4. Primary Goals

### 4.1 Public visibility

Anyone can:

- Open the site without signing in.
- View supported spaces.
- View availability by date and time.
- Switch between day, week, and month views.
- Filter by space.
- See whether a time is available, pending, reserved, blocked, or unavailable.
- View public space details and rules.

### 4.2 Controlled requester access

- Seton users with an approved Seton email domain are automatically authorized to submit reservation requests.
- Non-Seton users may create an account and request requester access.
- Non-Seton access requests go to Tech Admin for approval or decline.
- Only approved requester accounts may submit reservation requests.

### 4.3 Space-level approval

- Each space has at least one assigned manager.
- Each space should support a primary manager and one or more backup managers.
- Reservation requests are routed to the manager group for the selected space.
- A manager may approve, decline, request changes, or comment on a request.
- Tech Admin does not become the routine approver unless explicitly assigned as a manager.

### 4.4 Privacy and trust

- Public users never see requester names, email addresses, phone numbers, notes, or event details unless an administrator explicitly marks selected content as public.
- Every privileged action is logged.
- Users receive clear status notifications.
- Conflicts cannot be approved accidentally.

### 4.5 Operational scalability

The system must support additional spaces, managers, rules, and departments without code changes to the core workflow.

---

## 5. Non-Goals for the Initial Release

Unless separately approved, the first release does not include:

- Payment processing
- Invoicing
- Contracts or electronic signatures
- Equipment checkout outside the selected space
- Building access control or door unlocking
- Staff scheduling
- Catering ordering
- Public event promotion
- Full event registration or ticketing
- Complex recurring-event approval spanning many spaces
- Automatic approval of reservations
- Anonymous reservation requests
- Direct editing of another user's request
- Public display of requester identity or private event details

These may become later phases.

---

## 6. Known Assumptions

The following assumptions resolve ambiguity in the initial requirements. They must be verified before production launch.

1. **Seton email domain:** The initial assumed domain is `setonschool.net`.
2. **Tech Admin email:** Phase 1 bootstrap admin is `semperjoey@gmail.com`. Production Tech Admin remains open decision #3.
3. **Seton authentication provider:** Seton may use Google Workspace or Microsoft Entra ID. The final identity provider must be confirmed before production integration.
4. **Every reservation requires manager approval:** Seton users are automatically approved to submit requests, not automatically approved to reserve spaces.
5. **Public calendar privacy:** Public users see status blocks, not private requester or event information.
6. **Space managers may overlap:** A person may manage more than one space.
7. **Backup managers are allowed:** A space may have multiple approvers to avoid bottlenecks.
8. **First launch spaces:** DMC, Faustina Hall, and Gym.
9. **Time zone:** The deployment time zone is assumed to be `America/New_York`.
10. **Email is the primary notification channel:** In-app notifications may supplement email.

No agent may treat an assumption as permanently confirmed without recording the confirmation.

---

## 7. Definitions

| Term | Meaning |
|---|---|
| Visitor | A person viewing the public site without signing in. |
| Seton User | A signed-in user whose verified email belongs to an approved Seton domain. |
| External User | A signed-in user whose email is not in an approved Seton domain. |
| Requester | A user authorized to submit reservation requests. |
| Requester Access | Permission to create reservation requests. |
| Tech Admin | The administrator responsible for external requester access, system configuration, role assignment, and support. |
| Space Manager | A person authorized to review reservation requests for one or more assigned spaces. |
| Reservation Request | A request to use a space during a defined time range. |
| Reservation | An approved reservation request. |
| Availability Block | A scheduled period in which a space is unavailable for requests, such as maintenance or internal use. |
| Hold | A temporary conflict-prevention state used while a request is under review or being completed. |
| Public Status | The privacy-safe availability label shown to unauthenticated visitors. |
| Audit Event | A record of an important system or user action. |

---

## 8. User Roles and Permission Model

The system uses role-based access control plus space-level assignment.

### 8.1 Roles

#### Public Visitor

May:

- View spaces.
- View public space information.
- View availability and public statuses.
- Search and filter calendars.
- Open sign-in or account-request flows.

May not:

- Submit requests.
- View requester identity.
- View private request details.
- Comment.
- Approve or decline.
- Manage spaces or users.

#### Seton Requester

A signed-in user with a verified email in an approved Seton domain.

May:

- Submit reservation requests.
- View their own requests.
- Edit an eligible draft or returned request.
- Cancel their own eligible requests.
- Respond to manager questions.
- Duplicate a previous request.
- View public availability.

May not:

- Approve their own request unless separately assigned as a manager and the conflict-of-interest rule allows it.
- View another requester's private details.
- Manage users, spaces, or rules.

#### External Applicant

A signed-in external user whose requester access has not yet been approved.

May:

- View public availability.
- Submit an external requester-access application.
- View the status of their access application.
- Update requested profile information when returned for correction.

May not:

- Submit reservation requests.
- View private reservation details.
- Approve requests.

#### Approved External Requester

May do everything a Seton Requester may do after Tech Admin approval.

#### Space Manager

May, for assigned spaces only:

- View complete reservation request details.
- Approve requests.
- Decline requests.
- Request changes or clarification.
- Add internal manager notes.
- Create availability blocks.
- View schedule conflicts.
- View request history and audit details relevant to assigned spaces.
- Cancel or modify approved reservations when authorized by policy.

May not:

- Approve external requester-access applications unless also a Tech Admin.
- Manage spaces they are not assigned to.
- change system-wide settings.
- View unrelated private requests.
- erase audit records.

#### Tech Admin

May:

- Approve, decline, suspend, or revoke external requester access.
- Configure approved Seton email domains.
- Create, archive, and edit spaces.
- Assign primary and backup space managers.
- Manage system-wide rules.
- View all requests and audit events for support and governance.
- Manage notification templates.
- Manage account roles.
- Configure integrations.
- Resolve exceptional conflicts.
- Impersonate only through an auditable support mechanism, if such a feature is later approved.

May not:

- Delete audit history.
- bypass manager approval without a recorded override reason.
- access private data without a legitimate operational purpose.

#### System Administrator

Optional infrastructure role for deployment, security, backups, and configuration. This role should not automatically receive business approval powers.

### 8.2 Permission Matrix

| Capability | Visitor | Seton Requester | External Applicant | Approved External Requester | Space Manager | Tech Admin |
|---|---:|---:|---:|---:|---:|---:|
| View public calendar | Yes | Yes | Yes | Yes | Yes | Yes |
| Submit reservation request | No | Yes | No | Yes | Yes, as requester | Yes, as requester |
| View own requests | No | Yes | No | Yes | Yes | Yes |
| View all requests for assigned space | No | No | No | No | Yes | Yes |
| Approve/decline space request | No | No | No | No | Assigned spaces | Override only with reason |
| Request external access | No | Not needed | Yes | Already approved | If external | Not needed |
| Approve external access | No | No | No | No | No | Yes |
| Manage spaces | No | No | No | No | Limited operational fields if allowed | Yes |
| Assign managers | No | No | No | No | No | Yes |
| View audit logs | No | Own request history | Own access history | Own request history | Assigned spaces | All |
| Manage system settings | No | No | No | No | No | Yes |

---

## 9. Authentication and Account Rules

### 9.1 Public access

Public calendar and space pages must not require authentication.

### 9.2 Seton sign-in

Preferred approach:

- Use Seton's existing identity provider through secure single sign-on.
- Validate the email address and identity-provider tenant.
- Compare the verified domain against the system's approved Seton domains.
- Automatically grant requester access.
- Do not rely only on text entered into an email field.

### 9.3 External sign-in

External users may sign in through an approved authentication method.

Minimum account information:

- Full name
- Verified email address
- Organization or affiliation
- Phone number, when required by policy
- Reason for requesting access
- Agreement to terms and facility rules
- Optional sponsor or Seton contact

### 9.4 External requester-access workflow

States:

1. Not submitted
2. Submitted
3. Under review
4. Changes requested
5. Approved
6. Declined
7. Suspended
8. Revoked

Rules:

- A verified external user may submit one active application at a time.
- Tech Admin receives an email notification for new applications.
- Tech Admin must see the user's identity, organization, reason, date submitted, prior decisions, and relevant notes.
- Approval grants requester access but does not approve any reservation.
- Decline requires a user-visible reason category and may include a private internal note.
- Suspension temporarily prevents new requests.
- Revocation removes requester access.
- All decisions must be audited.

### 9.5 Domain administration

Tech Admin may maintain:

- Approved domains
- Blocked domains
- Domain-specific instructions
- Whether domain users are auto-approved as requesters
- Whether domain users require a particular SSO tenant

---

## 10. Space Model

Each space must have a configurable record.

### 10.1 Required fields

- Space ID
- Public name
- Short name
- Building or campus area
- Description
- Capacity
- Time zone
- Active/archived status
- Public visibility
- Primary manager
- At least one manager before accepting requests
- Default approval rules
- Minimum reservation duration
- Maximum reservation duration
- Minimum advance notice
- Maximum advance booking window
- Default setup buffer
- Default cleanup buffer
- Available operating hours
- Blackout dates
- Reservation instructions
- Accessibility information
- Public amenities
- Public photos, if approved

### 10.2 Optional fields

- Room number
- Floor
- Address
- Seating configurations
- Equipment list
- Usage restrictions
- Noise restrictions
- Food and beverage policy
- Athletic-specific rules
- Custodial requirements
- Security requirements
- Insurance requirements
- Emergency contact instructions
- Preferred event categories
- Manager-only notes
- Calendar integration ID

### 10.3 Initial spaces

#### DMC (Divine Mercy Center)

Owner confirmed the expansion as Divine Mercy Center. Reservable rooms:

- Classroom
- Common Space

The campus map drills into the Divine Mercy Center floor plan. The former whole-building catalog row `dmc` is inactive.

#### Carlo Acutis Tech Center

One reservable room: VEX Space. The campus map drills into the Carlo Acutis floor plan and selects that room. The former whole-building catalog row `catc` is inactive.

#### Faustina Hall

Use display name `Faustina Hall` unless Seton confirms a different official name.

#### Gym

Use display name `Gym` unless Seton confirms a more specific official facility name.

---

## 11. Public Availability Experience

### 11.1 Public calendar views

Support:

- Day view
- Week view
- Month view
- Space-specific calendar
- Multi-space comparison
- Date picker
- Time-range filter
- Space filter
- Status legend

### 11.2 Public status labels

Use only these initial public labels:

- Available
- Pending
- Reserved
- Blocked
- Closed

Definitions:

- **Available:** The time is open for a request.
- **Pending:** A request is awaiting a decision or a temporary hold exists.
- **Reserved:** An approved reservation occupies the time.
- **Blocked:** The space is unavailable because of maintenance, internal use, setup, cleanup, or an administrative block.
- **Closed:** The time is outside configured operating hours.

### 11.3 Privacy rules

Public calendar entries must not reveal:

- Requester name
- Requester email
- Phone number
- Organization
- Event title
- Event description
- Private notes
- Approver identity
- Decision reason
- Internal operational details

The default public display should show only the status and time range.

### 11.4 Calendar accuracy

- Approved reservations must appear immediately after approval.
- Pending requests may appear as Pending according to the configured hold policy.
- Cancelled reservations must release availability immediately unless an administrative block replaces them.
- Setup and cleanup buffers count as unavailable time.
- All displayed times use the space time zone and clearly state it.

---

## 12. Reservation Request Form

### 12.1 Required fields

- Space
- Date
- Start time
- End time
- Event or activity title
- Event category
- Purpose or description
- Expected attendance
- Requester name
- Requester email
- Requester phone, if required
- Organization or department
- Setup needs
- Equipment needs
- Accessibility needs
- Food or beverage intent
- Agreement to space rules
- Confirmation that submitted information is accurate

### 12.2 Conditional fields

Show only when relevant:

- Recurrence details
- Athletic team or group
- Outside organization details
- Insurance information
- Sponsor or Seton contact
- Custodial support
- Security support
- A/V support
- Special seating arrangement
- Vendor information
- Attachment upload
- Public-event indicator

### 12.3 Form behavior

- Validate conflicts before submission.
- Explain that submission does not guarantee approval.
- Save drafts for signed-in users.
- Preserve entered information after validation errors.
- Use clear, field-specific error messages.
- Prevent end time earlier than or equal to start time.
- Warn when requested time is outside operating hours.
- Calculate setup and cleanup buffers.
- Show the applicable rules before final submission.
- Provide a final review screen.
- Generate a confirmation number after successful submission.

---

## 13. Reservation Lifecycle

### 13.1 Core states

1. Draft
2. Submitted
3. Under Review
4. Changes Requested
5. Resubmitted
6. Approved
7. Declined
8. Cancelled by Requester
9. Cancelled by Manager
10. Expired
11. Completed

### 13.2 State rules

#### Draft

- Visible only to the requester.
- Does not block availability.
- Editable.
- May expire after a configurable period.

#### Submitted

- Complete and awaiting manager processing.
- Manager notifications are sent.
- Conflict policy determines whether the time shows as Pending.

#### Under Review

- A manager has opened or claimed the request.
- Other managers may still view it.
- The system records who began review.

#### Changes Requested

- Manager asks the requester for corrections or clarification.
- The request is not approved.
- The requester may edit designated fields and resubmit.
- The hold may expire after a configurable time.

#### Resubmitted

- Returns to the manager queue with revision history.

#### Approved

- Creates an active reservation.
- Blocks the requested time plus buffers.
- Sends approval confirmation.
- Records approver, date, and any conditions.
- A manager may undo approval. That removes the occupancy lock and returns the request to Submitted (pending in the Requests queue).

#### Declined

- Does not create a reservation.
- Requires a user-visible reason category.
- Releases any hold.
- Preserves history.

#### Cancelled by Requester

- Allowed according to the cancellation policy.
- Releases availability.
- Notifies space managers.
- Preserves history.

#### Cancelled by Manager

- Requires a reason.
- Notifies the requester.
- Releases availability unless replaced by a block.

#### Expired

- Used when a draft, hold, or requested change passes its deadline.
- Releases availability.
- Sends notification when appropriate.

#### Completed

- Used after the event end time.
- Retained for reporting and history.

### 13.3 Allowed transitions

| From | To |
|---|---|
| Draft | Submitted, Cancelled by Requester, Expired |
| Submitted | Under Review, Changes Requested, Approved, Declined, Cancelled by Requester |
| Under Review | Changes Requested, Approved, Declined, Cancelled by Requester |
| Changes Requested | Resubmitted, Cancelled by Requester, Expired |
| Resubmitted | Under Review, Changes Requested, Approved, Declined, Cancelled by Requester |
| Approved | Submitted (manager undo), Cancelled by Requester, Cancelled by Manager, Completed |
| Declined | Terminal |
| Cancelled by Requester | Terminal |
| Cancelled by Manager | Terminal |
| Expired | Terminal |
| Completed | Terminal |

No agent may add an undocumented transition.

---

## 14. Approval Workflow

### 14.1 Routing

- Route each request to managers assigned to the selected space.
- Notify the school mailbox (`dev@setonschool.net`) and every manager with control of that space.
- Notify backup managers according to configuration.
- Show the request in each assigned manager's queue.
- Prevent managers assigned to other spaces from viewing private details.

### 14.2 Manager actions

A manager may:

- Approve
- Decline
- Request changes
- Ask a question
- Add internal notes
- Add approval conditions
- Propose a different time
- Reassign to another authorized manager
- Escalate to Tech Admin
- Cancel an approved reservation when authorized
- Undo an approval, returning the request to the Requests queue

### 14.3 Decision requirements

Approval requires:

- No active scheduling conflict.
- Request meets minimum required fields.
- Required conditions are satisfied or attached to approval.
- The acting manager is authorized for the space.
- The system records the manager and timestamp.

Decline requires:

- A user-visible reason category.
- Optional requester-facing explanation.
- Optional internal note.

### 14.4 Recommended reason categories

Approval conditions:

- Custodial support required
- Security support required
- A/V coordination required
- Capacity limit
- Setup restriction
- Food restriction
- Insurance documentation required
- Other documented condition

Decline reasons:

- Space unavailable
- Insufficient notice
- Request conflicts with facility rules
- Capacity exceeded
- Required information missing
- Request better suited to another space
- External use not permitted
- Operational or safety concern
- Other

### 14.5 Conflict-of-interest rule

A manager should not approve their own request when another authorized manager is available.

If self-approval is permitted as an exception:

- It must be explicitly enabled.
- The system must display a warning.
- A justification is required.
- The action must be audited.

Default: self-approval is not allowed.

---

## 15. Scheduling and Conflict Rules

### 15.1 Conflict calculation

A request conflicts when its effective occupied interval overlaps another effective occupied interval.

Effective occupied interval:

`requested start - setup buffer` through `requested end + cleanup buffer`

### 15.2 Conflict sources

Conflicts must consider:

- Approved reservations
- Active administrative blocks
- Closed hours
- Blackout dates
- Setup buffers
- Cleanup buffers
- Optional pending holds
- Imported external calendar events, if integration is enabled

### 15.3 Pending request policy

Recommended default:

- The first submitted request for a time creates a temporary Pending hold.
- Later users may see the time as Pending and cannot submit an identical conflicting request.
- The hold expires after a configurable review period.
- Managers may release the hold by declining or returning the request.
- Tech Admin may override with a reason.

Alternative policy:

- Allow multiple competing pending requests but approve only one.

This alternative must not be implemented without an explicit product decision.

### 15.4 Recurring requests

Initial release recommendation:

- Allow simple recurrence only after core single-event flow is stable.
- Recurring requests must be expanded into occurrences for conflict checking.
- Partial approval must be explicit.
- The user must see which occurrences are approved, declined, or conflicted.
- A manager must not unknowingly approve a series with hidden conflicts.

---

## 16. Changes and Cancellations

### 16.1 Requester changes before approval

- Drafts are fully editable.
- Submitted requests may be editable only if not under active review, or they may require withdrawal and resubmission.
- Changes to date, time, or space must trigger a new conflict check.
- All revisions are versioned.

### 16.2 Changes after approval

Changes to any of the following require reapproval unless the manager explicitly confirms otherwise:

- Space
- Date
- Start time
- End time
- Attendance above approved capacity
- Event type
- Material setup needs
- High-risk or restricted activity

Minor contact-detail corrections may not require reapproval.

### 16.3 Cancellation policy

The system must support configurable deadlines by space.

On cancellation:

- Notify requester and managers.
- Release the time immediately.
- Preserve the cancelled reservation record.
- Record reason and actor.
- Trigger follow-up tasks when operational services were scheduled.

---

## 17. Notifications

### 17.1 Channels

Initial required channel:

- Email

Optional future channels:

- In-app notifications
- SMS
- Microsoft Teams
- Slack

### 17.2 Required notification events

Requester access:

- External access application submitted
- Access application approved
- Access application declined
- Changes requested
- Access suspended
- Access revoked

Reservation:

- Draft reminder, if enabled
- Request submitted
- Manager question or changes requested
- Request resubmitted
- Request approved
- Request declined
- Reservation changed
- Reservation cancelled
- Upcoming reservation reminder
- Space manager changed
- Administrative block affecting a reservation
- Expired hold or request

Manager:

- New request submitted
- Request resubmitted
- Requester message received
- Request approaching review deadline
- Approved reservation changed or cancelled
- Backup approval escalation
- Daily or weekly pending digest, if enabled

### 17.3 Email content requirements

Every transactional email should include:

- Clear subject
- Space
- Date
- Start and end time
- Time zone
- Current status
- Action required, if any
- Link to the relevant request
- Contact or support information
- Privacy-safe content

Do not include sensitive internal notes.

### 17.4 Delivery and failure handling

- Log email send attempts and status.
- Retry temporary failures.
- Surface persistent delivery failures to Tech Admin.
- Do not expose provider secrets.
- Avoid duplicate notifications through idempotency controls.

---

## 18. Dashboards

### 18.1 Requester dashboard

Sections:

- Drafts
- Needs Attention
- Pending
- Approved
- Declined
- Cancelled
- Past Requests

Capabilities:

- Search
- Filter by space, date, and status
- View request detail
- Respond to changes requested
- Cancel eligible requests
- Duplicate a request
- Download or print confirmation

### 18.2 Space manager dashboard

Sections:

- New
- Under Review
- Changes Requested
- Upcoming Reservations
- Conflicts
- Calendar
- Blocks
- Recently Decided

Capabilities:

- Sort by submission date, event date, urgency, or space.
- Filter by status and event category.
- Claim or assign a request.
- Compare against the calendar.
- Approve, decline, or request changes.
- Add internal notes.
- Create blocks.
- Export operational schedules.

### 18.3 Tech Admin dashboard

Sections:

- External Access Queue
- Users
- Roles
- Spaces
- Manager Assignments
- Rules
- Notification Templates
- Audit Log
- Integration Status
- System Health
- Reports

---

## 19. Data Model

The live Phase 1 schema uses four tables (owner decision 2026-08-28). The fuller entity list in this section remains the long-term target if operational complexity returns.

| Table | Purpose |
|---|---|
| `users` | Created on signup. Stores profile data and access level (`admin`, `manager`, `trusted user`, `user`, `guest`). |
| `rooms` | Every reservable room and its public details. |
| `reservation_requests` | Requests awaiting a decision (who, when, description, status). |
| `reservations_confirmed` | Approved reservations only (who, when, description, who approved). Overlaps are blocked in the database. |

The final schema may vary, but the following entities and relationships are required for the full product.

### 19.1 User

Fields:

- id
- full_name
- normalized_email
- email_verified_at
- phone
- organization
- affiliation
- account_status
- created_at
- updated_at
- last_sign_in_at

### 19.2 RoleAssignment

Fields:

- id
- user_id
- role
- scope_type
- scope_id
- effective_from
- effective_until
- assigned_by
- created_at

Examples:

- Global Tech Admin
- Space Manager scoped to Gym

### 19.3 ApprovedDomain

Fields:

- id
- domain
- is_active
- auto_grant_requester
- required_identity_provider
- notes
- created_by
- created_at
- updated_at

### 19.4 ExternalAccessApplication

Fields:

- id
- user_id
- organization
- reason
- sponsor_contact
- status
- requester_message
- admin_reason_category
- admin_public_message
- admin_internal_note
- reviewed_by
- reviewed_at
- submitted_at
- updated_at

### 19.5 Space

Fields:

- id
- name
- short_name
- slug
- description
- building
- room
- address
- capacity
- timezone
- status
- is_public
- public_rules
- internal_notes
- min_duration_minutes
- max_duration_minutes
- min_notice_minutes
- max_advance_days
- setup_buffer_minutes
- cleanup_buffer_minutes
- created_at
- updated_at
- archived_at

### 19.6 SpaceManagerAssignment

Fields:

- id
- space_id
- user_id
- manager_type
- is_active
- assigned_by
- created_at

Manager types:

- Primary
- Backup

### 19.7 OperatingHours

Fields:

- id
- space_id
- day_of_week
- open_time
- close_time
- effective_from
- effective_until

### 19.8 SpaceBlackout

Fields:

- id
- space_id
- start_at
- end_at
- type
- public_status
- public_label
- internal_reason
- created_by
- created_at

### 19.9 ReservationRequest

Fields:

- id
- confirmation_number
- requester_id
- space_id
- status
- title
- category
- description
- organization
- expected_attendance
- start_at
- end_at
- setup_buffer_minutes
- cleanup_buffer_minutes
- equipment_needs
- accessibility_needs
- food_beverage
- custodial_needs
- security_needs
- public_event
- requester_notes
- submitted_at
- current_version
- created_at
- updated_at
- cancelled_at

### 19.10 RequestVersion

Fields:

- id
- reservation_request_id
- version_number
- snapshot
- changed_by
- change_reason
- created_at

### 19.11 ApprovalDecision

Fields:

- id
- reservation_request_id
- action
- reason_category
- public_message
- internal_note
- conditions
- decided_by
- decided_at

### 19.12 RequestComment

Fields:

- id
- reservation_request_id
- author_id
- visibility
- body
- created_at
- updated_at

Visibility:

- Requester and Managers
- Managers Only
- Tech Admin Only

### 19.13 Reservation

Fields:

- id
- reservation_request_id
- space_id
- requester_id
- start_at
- end_at
- effective_start_at
- effective_end_at
- status
- approved_by
- approved_at
- conditions
- created_at
- updated_at
- cancelled_at

### 19.14 Notification

Fields:

- id
- user_id
- type
- channel
- template_version
- related_entity_type
- related_entity_id
- status
- sent_at
- failure_reason
- idempotency_key
- created_at

### 19.15 AuditEvent

Fields:

- id
- actor_user_id
- actor_type
- action
- entity_type
- entity_id
- before_snapshot
- after_snapshot
- reason
- source_ip_or_hash
- user_agent_or_hash
- created_at

Audit records are append-only.

---

## 20. API and Service Boundaries

### 20.1 Required service areas

- Authentication
- User and role management
- Domain eligibility
- External access applications
- Space management
- Availability and calendar
- Reservation request lifecycle
- Approval workflow
- Notification delivery
- Audit logging
- Reporting
- Integration adapters

### 20.2 API principles

- Use authenticated, authorized server-side checks.
- Never trust role information supplied by the client.
- Use idempotency for create, approve, decline, cancel, and send-notification operations.
- Use optimistic locking or version checks for concurrent updates.
- Return stable error codes.
- Avoid exposing internal identifiers in public pages when a safer public identifier is available.
- Validate all date/time inputs on the server.
- Store reservation start and end as America/New_York wall-clock times so the data table matches the times people pick. Other timestamps stay timestamptz.
- Use pagination for list endpoints.
- Record security-sensitive failures.

### 20.3 Representative endpoints

Names are illustrative and may be adapted to the selected framework.

Public:

- `GET /spaces`
- `GET /spaces/{spaceId}`
- `GET /availability?spaceId=&start=&end=`

Authenticated requester:

- `GET /me`
- `GET /me/requests`
- `POST /reservation-requests`
- `GET /reservation-requests/{id}`
- `PATCH /reservation-requests/{id}`
- `POST /reservation-requests/{id}/submit`
- `POST /reservation-requests/{id}/cancel`
- `POST /reservation-requests/{id}/comments`

External access:

- `GET /me/access-application`
- `POST /access-applications`
- `PATCH /access-applications/{id}`
- `POST /access-applications/{id}/submit`

Manager:

- `GET /manager/requests`
- `POST /manager/requests/{id}/claim`
- `POST /manager/requests/{id}/request-changes`
- `POST /manager/requests/{id}/approve`
- `POST /manager/requests/{id}/decline`
- `POST /manager/spaces/{spaceId}/blocks`

Tech Admin:

- `GET /admin/access-applications`
- `POST /admin/access-applications/{id}/approve`
- `POST /admin/access-applications/{id}/decline`
- `POST /admin/access-applications/{id}/suspend`
- `POST /admin/access-applications/{id}/revoke`
- `POST /admin/spaces`
- `PATCH /admin/spaces/{id}`
- `POST /admin/spaces/{id}/managers`
- `GET /admin/audit-events`

---

## 21. Proposed Technical Baseline

This baseline makes the plan executable while keeping provider-specific decisions replaceable.

### 21.1 Application

- Responsive web application
- TypeScript
- Server-rendered application framework
- Component-based UI
- Server-side authorization
- Accessible form and calendar components

### 21.2 Data

- PostgreSQL
- Transactional constraints for reservation conflicts
- Migration-based schema changes
- Encrypted managed backups
- Separate production and non-production databases

### 21.3 Authentication

- OpenID Connect or SAML through Seton's identity provider
- External identity support through an approved provider
- Verified email requirement
- Session expiration and secure cookies
- Multi-factor authentication inherited from the identity provider where available

### 21.4 Email

- Transactional email provider with delivery tracking
- Template versioning
- Retry queue
- Idempotent sending

### 21.5 Hosting

- Managed hosting with:
  - TLS
  - private secrets
  - environment separation
  - logs
  - backups
  - monitoring
  - rollback capability

### 21.6 Architecture constraints

Agents must not:

- Store credentials in source control.
- use client-side checks as the only authorization.
- permit direct database access from the browser.
- rely on local server time.
- hard-code managers or spaces.
- hard-code the Seton domain in multiple places.
- send email directly inside a database transaction.
- delete audit history.
- approve a conflicting reservation without an explicit, auditable override.

---

## 22. Integrations

### 22.1 Identity provider

Required before production:

- Confirm Google Workspace or Microsoft Entra ID.
- Confirm approved tenant/domain identifiers.
- Confirm account lifecycle behavior.
- Confirm handling of alumni, contractors, or shared accounts.

### 22.2 Calendar integration

Optional but recommended:

- Import read-only busy blocks from an authoritative Seton calendar.
- Export approved reservations to a shared calendar.
- Use stable integration IDs.
- Prevent duplicate import/export.
- Define which system is authoritative.
- Do not expose private details publicly through external calendars.

### 22.3 Email

Required:

- Send transactional messages.
- Track delivery.
- Support reply-to routing where appropriate.
- Avoid including manager-only notes.

---

## 23. Security Requirements

### 23.1 Authorization

- Enforce permissions on the server.
- Scope manager access to assigned spaces.
- Scope requester access to their own requests.
- Require Tech Admin for external-access decisions and system configuration.
- Re-check authorization on every privileged action.

### 23.2 Data protection

- Encrypt data in transit.
- Encrypt managed data at rest.
- Minimize personally identifiable information.
- Redact sensitive data from public views and logs.
- Retain data only as long as operationally and legally required.
- Document retention periods before launch.

### 23.3 Session security

- Secure, HTTP-only cookies.
- CSRF protection where applicable.
- Session timeout.
- Reauthentication for sensitive admin actions when feasible.
- Account lockout and rate limiting.
- No secrets in browser storage.

### 23.4 Abuse protection

- Rate-limit sign-in, access application, and request submission.
- Protect public endpoints from scraping and denial-of-service patterns.
- Validate file uploads.
- Restrict file type and size.
- Scan attachments if attachments are enabled.
- Use anti-automation controls only when necessary and accessible.

### 23.5 Auditability

Audit:

- Sign-in
- Role assignment
- Domain changes
- Access application decisions
- Request submission
- Status transitions
- Manager decisions
- Reservation modifications
- Cancellations
- Blocks
- Overrides
- Export actions
- Sensitive data access where required

---

## 24. Privacy Requirements

- Public pages show status, not identity.
- Requesters see only their own private requests.
- Managers see only requests for assigned spaces.
- Tech Admin access must be justified by operational role.
- Internal notes must never appear in requester or public channels.
- Email templates must avoid unnecessary personal information.
- Reports should aggregate data where possible.
- Production data must not be copied into development environments without approved masking.

---

## 25. Accessibility Requirements

Target: WCAG 2.2 AA.

Required:

- Full keyboard navigation
- Visible focus indicators
- Semantic landmarks
- Form labels and instructions
- Error summary plus field errors
- Status not communicated by color alone
- Sufficient color contrast
- Screen-reader-friendly calendar alternatives
- Text list view for availability
- Logical heading structure
- Accessible modal behavior
- Accessible date and time inputs
- Touch targets appropriate for mobile
- Reduced-motion support
- No time-limited interactions without extension when user action is required

The calendar must have a usable non-grid alternative.

---

## 26. Performance and Reliability

Initial targets:

- Public page useful content visible quickly on common mobile connections.
- Availability queries respond within two seconds under normal load.
- Approval actions complete atomically.
- No double booking under concurrent approval attempts.
- 99.9% monthly availability target, excluding planned maintenance.
- Daily automated backups.
- Documented restore procedure.
- Monitoring for application errors, failed jobs, and email failures.
- Graceful error pages with support instructions.

---

## 27. Reporting

Initial reports:

- Requests by space
- Requests by status
- Approval rate
- Decline rate and reason
- Average decision time
- Upcoming reservations
- Space utilization
- Cancellations
- External requester counts
- Pending access applications
- Requests requiring operational support

Privacy rules apply to exports.

---

## 28. Search and Filtering

Public:

- Space
- Date
- Time
- Availability status

Requester:

- Confirmation number
- Space
- Date
- Status
- Event title

Manager:

- Space
- Date
- Status
- Requester
- Organization
- Event category
- Decision urgency

Tech Admin:

- User
- Email
- Domain
- Role
- Access status
- Space
- Audit action
- Date range

---

## 29. Error Handling

### 29.1 User-facing principles

Every error should state:

- What happened
- What the user can do
- Whether their data was saved
- How to get help when necessary

### 29.2 Required error cases

- Sign-in failed
- Email not verified
- External access not approved
- Space no longer available
- Conflict found
- Request changed by another user
- Request already decided
- Permission denied
- Notification failed
- File upload rejected
- Session expired
- Service unavailable

### 29.3 Concurrency

When two managers act simultaneously:

- Only one decision transaction may succeed.
- The second manager receives a clear message that the request changed.
- The audit log records both attempts when appropriate.
- No duplicate reservation is created.

---

## 30. Testing Strategy

### 30.1 Unit tests

Cover:

- Domain eligibility
- Role checks
- State transitions
- Conflict detection
- Buffer calculation
- Operating-hours validation
- Notification selection
- Privacy redaction
- Time-zone conversion

### 30.2 Integration tests

Cover:

- SSO callback
- External access approval
- Request submission
- Manager approval
- Concurrent approval
- Cancellation
- Email job creation
- Audit creation
- Calendar import/export

### 30.3 End-to-end tests

Minimum journeys:

1. Visitor views Gym availability.
2. Seton user signs in and submits a request.
3. External user requests access and is approved.
4. Approved external requester submits a request.
5. Manager requests changes.
6. Requester edits and resubmits.
7. Manager approves.
8. Public calendar shows Reserved without private details.
9. Requester cancels.
10. Availability reopens.
11. Tech Admin assigns a backup manager.
12. Unauthorized user is blocked from another user's request.
13. Two simultaneous approvals do not double book.
14. Screen-reader user accesses availability in list form.
15. Mobile user completes a request.

### 30.4 Security tests

- Broken access control
- ID enumeration
- CSRF
- XSS
- Injection
- Rate limiting
- Session fixation
- Privilege escalation
- Sensitive data exposure
- Attachment validation

### 30.5 User acceptance testing

Participants:

- One Tech Admin
- At least one manager for each initial space
- Seton requesters
- External requester
- Public visitor
- Accessibility reviewer

---

## 31. Acceptance Criteria for Initial Launch

The initial release is ready only when all of the following are true:

1. DMC, Faustina Hall, and Gym are configured.
2. Each space has confirmed operating hours, capacity, rules, and managers.
3. Public users can view privacy-safe availability.
4. Seton users can sign in and automatically receive requester access.
5. External users can apply for requester access.
6. Tech Admin can approve or decline external access.
7. Approved users can submit complete requests.
8. Requests route to the correct space managers.
9. Managers can approve, decline, and request changes.
10. Conflicting reservations cannot both be approved.
11. Requesters receive required emails.
12. Managers receive required emails.
13. Public calendar updates after decisions and cancellations.
14. Private details are not exposed publicly.
15. Role restrictions are enforced server-side.
16. Audit logs capture privileged actions.
17. Accessibility testing passes agreed WCAG 2.2 AA criteria.
18. Backup and restore procedures are tested.
19. Production support ownership is documented.
20. All launch-blocking issues are resolved or explicitly accepted.

---

## 32. Delivery Phases

### Phase 0 — Discovery and Confirmation

Deliverables:

- Confirm official project name.
- Confirm Seton domain.
- Confirm Tech Admin address.
- Confirm identity provider.
- Confirm official space names.
- Identify space managers.
- Gather hours, capacity, policies, and blackout dates.
- Decide pending-hold policy.
- Confirm data retention.
- Confirm calendar integrations.
- Approve this master plan.

### Phase 1 — Foundation

Deliverables:

- Repository and environments
- Authentication
- User and role model
- Space configuration
- Public space pages
- Public availability model
- Audit foundation
- Email infrastructure

### Phase 2 — Requester Workflows

Deliverables:

- Seton auto-eligibility
- External access application
- Tech Admin review
- Reservation request form
- Drafts
- Requester dashboard
- Request submission notifications

### Phase 3 — Manager Workflows

Deliverables:

- Manager queues
- Request detail
- Conflict checking
- Request changes
- Approval
- Decline
- Internal notes
- Blocks
- Decision notifications

### Phase 4 — Operational Hardening

Deliverables:

- Concurrency protection
- Monitoring
- Security testing
- Accessibility testing
- Reporting
- Backups
- Support documentation
- Admin controls

### Phase 5 — Pilot

Recommended pilot:

- Launch one space first.
- Use real managers and a controlled requester group.
- Measure decision time, error rate, email delivery, and user confusion.
- Resolve issues before adding all spaces.

### Phase 6 — Full Launch

- Enable DMC, Faustina Hall, and Gym.
- Publish support process.
- Train managers and Tech Admin.
- Monitor first 30 days.
- Review metrics and backlog.

---

## 33. Suggested Work Breakdown

### Product and policy

- Confirm requirements
- Confirm business rules
- Define cancellation policy
- Define review deadlines
- Define external-user approval criteria
- Define public status policy
- Define data retention

### UX and content

- Information architecture
- Public calendar
- Space detail page
- Sign-in and access application
- Request form
- Requester dashboard
- Manager dashboard
- Admin dashboard
- Email content
- Empty, loading, and error states
- Accessibility review

### Engineering

- Authentication
- Authorization
- Database schema
- Availability engine
- Request state machine
- Approval transactions
- Notification queue
- Audit service
- Admin configuration
- Reporting
- Calendar integrations
- Deployment and monitoring

### QA

- Test plan
- Automated tests
- Manual workflow tests
- Cross-browser tests
- Mobile tests
- Accessibility tests
- Security tests
- Load and concurrency tests
- UAT coordination

### Operations

- Manager training
- Tech Admin training
- Support playbook
- Backup verification
- Incident procedure
- Launch communications
- Post-launch review

---

## 34. Product Metrics

Track:

- Public calendar visits
- Sign-in conversion
- Request completion rate
- Form abandonment
- External access approval time
- Reservation decision time
- Approval rate
- Decline reasons
- Changes-requested rate
- Conflict rate
- Cancellation rate
- Email delivery failures
- Support requests
- Accessibility issues
- Space utilization

Do not optimize metrics at the expense of fairness, privacy, or safety.

---

## 35. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Wrong Seton domain grants access | Verify domain and identity-provider tenant; centralize configuration. |
| Manager bottleneck | Primary and backup managers; escalations and reminders. |
| Double booking | Transactional conflict checks and database constraints. |
| Public privacy leak | Separate public DTOs/views; automated privacy tests. |
| Hidden operating rules | Require complete space configuration before activation. |
| Email failure | Queued delivery, retries, monitoring, admin alerts. |
| Confusing “approved user” vs “approved request” | Use distinct labels: Requester Access Approved and Reservation Approved. |
| Unclear pending behavior | Confirm hold policy before launch. |
| Self-approval abuse | Block by default; audited exception only. |
| Calendar integration drift | Define authoritative system and reconciliation jobs. |
| Time-zone errors | Reservation start/end are Eastern wall clock; test DST transitions. |
| Inaccessible calendar | Provide list view and keyboard/screen-reader testing. |
| AI agents invent requirements | Require assumptions and decision records. |

---

## 36. Open Decisions Requiring Owner Approval

The following are not fully determined:

1. Official product name
2. Confirmed Seton email domain
3. Confirmed Tech Admin email address (Phase 1 bootstrap: `semperjoey@gmail.com`)
4. Identity provider
5. **Exact meaning and official name of DMC — decided 2026-08-29:** Divine Mercy Center, with two reservable rooms: Classroom and Common Space. Carlo Acutis Tech Center is one room: VEX Space. The old whole-building `dmc` and `catc` catalog rows are inactive.
6. Official name of Gym
7. Named managers for each space — campus-wide manager for Phase 1 is `jbenin@setonschool.net` (D-2026-08-29-manage-abilities, D-2026-08-29-campus-manager-net-only). Per-space assignment UI remains later.
8. Operating hours by space
9. Capacities and rules by space
10. Pending-hold policy and expiration
11. Manager review deadline
12. Cancellation deadline
13. Whether recurring requests are in the first release
14. Whether imported calendars are authoritative
15. Data retention period
16. Attachment requirements
17. Public event title visibility, if ever allowed
18. **Support contact — decided 2026-08-30:** Phase 1 help page is the Account/Sign in card layout. Send, Reply-To, and Help all use `dev@setonschool.net`. Escalation path remains open.
19. Hosting platform
20. Pilot space
21. **Schema scope for Phase 1 — decided 2026-08-28:** four tables (`users`, `rooms`, `reservation_requests`, `reservations_confirmed`). Role tables, domain tables, hours, blackouts, and audit were deferred.
22. **Phase 1 sign-in method — decided 2026-08-28:** email one-time code until Seton SSO is confirmed. Supabase email OTP is 6 digits (4-digit email OTP is not supported).
23. **Rooms catalog columns — decided 2026-08-29:** map rooms share one slug with `rooms.slug`. `current_status` is live occupancy: Open, Pending, or Reserved. `is_active` controls whether people can submit reservation requests. Inactive rooms stay visible on the map at half nametag size with no interaction. Room timezone, rules, and created_at were removed; campus timezone remains `America/New_York`.

Agents may implement placeholders only when the placeholder is clearly marked and does not create a security or policy risk.

### Recorded decision: D-2026-08-28-schema

```text
Decision ID: D-2026-08-28-schema
Date: 2026-08-28
Owner: Product owner (chat request)
Status: Approved
Context: The initial schema had 12 public tables. That is more than Phase 1 needs.
Decision: Keep four tables — users, rooms, reservation_requests, reservations_confirmed. Store access level on the user. Block overlapping confirmed reservations in the database. Public calendar still returns status and time only.
Alternatives Considered: Keep the full masterplan entity list; fold requests and confirmed reservations into one table.
Security Impact: Access level is stored on users and protected from self-edit. Authorization stays server-side.
Privacy Impact: Public availability RPC still omits requester and event details.
Accessibility Impact: None.
Operational Impact: Hours, backup managers, blackouts, and audit logs are not in the database yet.
Migration or Rollback: supabase/migrations/20260829030041_simplify_core_tables.sql
Documents Updated: this master plan, README
```

### Recorded decision: D-2026-08-28-otp-auth

```text
Decision ID: D-2026-08-28-otp-auth
Date: 2026-08-28
Owner: Product owner (chat request)
Status: Approved
Context: Phase 1 sign-in used email and password. The owner asked to sign in with email and a short code, and to simplify the sign-in screen.
Decision: Use passwordless email OTP for Phase 1. Sign-in collects email, then a code. New accounts also receive a code instead of a password. Seton SSO remains the preferred production method (open decision #4).
Alternatives Considered: Keep email/password; custom 4-digit codes outside Supabase Auth.
Security Impact: Authorization stays server-side. Email OTP is 6 digits (Supabase minimum). Magic Link template must include {{ .Token }} so the code is visible in email.
Privacy Impact: None. Public calendars still show status and time only.
Accessibility Impact: Sign-in uses a labeled email field and a labeled numeric code field with one-time-code autocomplete.
Operational Impact: Hosted Magic Link email template must include the OTP. Identity-provider SSO is still deferred.
Migration or Rollback: App auth actions in src/lib/auth/actions.ts; local template in supabase/templates/magic_link.html.
Documents Updated: this master plan, README
```

### Recorded decision: D-2026-08-29-account-groups

```text
Decision ID: D-2026-08-29-account-groups
Date: 2026-08-29
Owner: Product owner (chat request)
Status: Approved
Context: The account page showed requester-access copy, email verification, account status, organization, and phone. The owner asked for a centered account screen like sign-in, with Access as a group label only.
Decision: Account page displays Access as User (default), Manager, or Admin. Organization and phone are not on the account form. Sign out lives under Save profile, not in the header. Managers see assigned spaces from rooms.manager_id. Phase 1 bootstrap Admin is semperjoey@gmail.com; Admin assigns managers to spaces or buildings in a later workflow.
Alternatives Considered: Keep requester-access wording and header Sign out; wait for a manager-assignment table.
Security Impact: Authorization stays server-side. Bootstrap admin is granted tech_admin in the database and session from the Auth email, not from client-supplied roles. Users still cannot self-edit access_level.
Privacy Impact: Public calendars still show status and time only.
Accessibility Impact: Account uses labeled fields and a primary Save action with a quieter Log out control.
Operational Impact: Manager assignment UI is not built yet. Assigned spaces only appear when rooms.manager_id is set.
Migration or Rollback: supabase/migrations/20260829054249_bootstrap_admin_email.sql
Documents Updated: this master plan, README
```

### Recorded decision: D-2026-08-29-access-labels

```text
Decision ID: D-2026-08-29-access-labels
Date: 2026-08-29
Owner: Product owner (chat request)
Status: Approved
Context: Header order mixed Manage before Help. Access displayed User/Manager/Admin, so new accounts looked like Users. The owner asked for Help leftmost, Manage only for managers, then Account; default access Guest (green); User light blue; Trusted User dark blue after manager approval.
Decision: Header is Help, then Manage (managers only), then Account or Sign in. Access labels are Guest (default, none), User (requester), Trusted User (trusted, manager-approved), Manager, and Admin. Guests cannot submit reservation requests. Users and Trusted Users can submit; reservation approval stays separate. Seton-domain auto-grant still promotes to User (requester), not Trusted User (open decision #2).
Alternatives Considered: Keep User as the default label; require Tech Admin (not space managers) to grant trusted access.
Security Impact: Authorization stays server-side. Users cannot self-edit access_level. Only staff can call approve_trusted_user, which may only raise none or requester to trusted.
Privacy Impact: Managers can list guest and user emails on Manage to approve trusted access.
Accessibility Impact: Access badges include text labels, not color alone. Header links keep a 44px minimum target.
Operational Impact: Manage includes a trusted-access queue. Phase 3 reservation queues are still pending.
Migration or Rollback: supabase/migrations/20260829070000_add_trusted_access_level.sql, supabase/migrations/20260829070001_trusted_user_approval.sql
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-29-rooms-columns

```text
Decision ID: D-2026-08-29-rooms-columns
Date: 2026-08-29
Owner: Product owner (chat request)
Status: Approved
Context: Local map rooms were only partly in Supabase, slugs were inconsistent (faustina-hall vs faustina), and rooms stored unused timezone, rules, and created_at columns. is_public did not match the need to show inactive rooms on the map.
Decision: Every map room has a matching rooms row linked by a single-token slug. Rename status to current_status and is_public to is_active. Drop timezone, rules, and created_at on rooms; keep updated_at. Description is blank and capacity is null until configured. is_active controls whether a room is clickable and reservable. Inactive rooms remain on the map at 50% nametag size with no hover, color, or click. Public select still allows current_status = active so inactive rooms can render.
Alternatives Considered: Hide inactive rooms; keep per-room timezone; keep faustina-hall.
Security Impact: Authorization stays server-side. Availability RPC only returns active, is_active rooms.
Privacy Impact: Public calendar still omits requester and event details.
Accessibility Impact: Inactive rooms are visible but not keyboard-operable.
Operational Impact: Room catalog is seeded from the campus map. Turning is_active off leaves the nametag in place.
Migration or Rollback: supabase/migrations/20260829050000_rooms_catalog_and_is_active.sql
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-29-room-occupancy-status

```text
Decision ID: D-2026-08-29-room-occupancy-status
Date: 2026-08-29
Owner: Product owner (chat request)
Status: Approved
Context: current_status was still active/archived after the rooms-column rename. The owner asked for Open, Pending, and Reserved, with is_active as the request gate.
Decision: rooms.current_status is live occupancy: Open, Pending, or Reserved, refreshed from confirmed reservations and pending requests. is_active is whether people can submit requests. Inactive rooms stay on the map but cannot be selected. Public map labels use Open, Pending, and Reserved (not Taken).
Alternatives Considered: Keep active/archived lifecycle on current_status; keep Taken as the reserved label.
Security Impact: Request inserts require rooms.is_active. Authorization stays server-side.
Privacy Impact: Public calendar still omits requester and event details.
Accessibility Impact: Legend and badges use the same Open / Pending / Reserved words.
Operational Impact: Occupancy on the room row is "right now"; the map still colors the selected time window.
Migration or Rollback: supabase/migrations/20260829080000_room_current_status_open_pending_reserved.sql
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-29-request-sent

```text
Decision ID: D-2026-08-29-request-sent
Date: 2026-08-29
Owner: Product owner (chat request)
Status: Approved
Context: Request this space sent signed-in users to Account because it opened /sign-in, and middleware sends authenticated users to /account. The confirmed reservations table name did not match reservation_requests.
Decision: Signed-in requesters submit a pending reservation_requests row for the selected time, the button says Request sent!, and the pending block appears in the room Requests list and the manager Requests panel. Guests stay on the map with an error. Signed-out users return to the map after sign-in. Rename confirmed_reservations to reservations_confirmed.
Alternatives Considered: Keep routing signed-in users through Account; keep the old table name.
Security Impact: Inserts stay server-side with RLS. Guests cannot submit. Public views still show status and time only.
Privacy Impact: The Requests list on the public map shows Pending and time, not requester details.
Accessibility Impact: The button label changes to Request sent! and errors are announced.
Operational Impact: Managers see new pending rows on Manage after refresh.
Migration or Rollback: supabase/migrations/20260829090000_rename_reservations_confirmed.sql; src/lib/auth/reservation-actions.ts
Documents Updated: this master plan, README
```

### Recorded decision: D-2026-08-29-request-reason

```text
Decision ID: D-2026-08-29-request-reason
Date: 2026-08-29
Owner: Product owner (chat request)
Status: Approved
Context: After submit, Request sent! stayed on the button. Requests had no reason. The time picker showed 3:00 AM while the stored time kept seconds from now (3:03). Manage cards did not lead with the room or requester identity.
Decision: When the selected time is pending, hide Request this space and show a Pending status. Signed-in requesters enter a required Reason stored in reservation_requests.description. Title is the room name. Manage request cards show room, requester name, and requester email, then when and why. Request times snap to the start and end fields (30-minute picker slots, no leftover seconds). Public map still shows status and time only.
Alternatives Considered: Keep Request sent!; keep exact clock seconds; make reason optional.
Security Impact: Inserts stay server-side. Description is not shown on public calendar.
Privacy Impact: Requester name and email appear only on Manage, not on the public map.
Accessibility Impact: An empty reason keeps Request this space faded. Pending replaces the button with a status.
Operational Impact: Managers see why the space is needed on each request card.
Migration or Rollback: none
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-29-request-reason-inline

```text
Decision ID: D-2026-08-29-request-reason-inline
Date: 2026-08-29
Owner: Product owner (chat request)
Status: Superseded
Context: Combined the reason field into the blue Request this space control.
Decision: Rejected. Restore the previous Reason label and text box. The helper line belongs on the button, not in the field.
Alternatives Considered: Keep the combined control.
Security Impact: None.
Privacy Impact: None.
Accessibility Impact: None.
Operational Impact: None.
Migration or Rollback: none
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-29-request-reason-button-copy

```text
Decision ID: D-2026-08-29-request-reason-button-copy
Date: 2026-08-29
Owner: Product owner (chat request)
Status: Approved
Context: A separate “Please provide a reason for the space.” line sat above Request this space. The owner wanted fewer lines, but the Reason field style to stay as it was.
Decision: Keep the Reason label and text box. Do not show the extra helper line. When the reason is empty, the faded button reads “Please provide a reason for the space.” When the requester types, that label fades out, “Request this space” fades in, and the button color fades back. Reason is still required. Public map still shows status and time only.
Alternatives Considered: Put the reason field inside the blue button (superseded).
Security Impact: None. Description is still required server-side.
Privacy Impact: None.
Accessibility Impact: The button name changes with the visible label. An empty reason still disables submit.
Operational Impact: None.
Migration or Rollback: none
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-29-eastern-wall-clock

```text
Decision ID: D-2026-08-29-eastern-wall-clock
Date: 2026-08-29
Owner: Product owner (chat request)
Status: Approved
Context: Booking 2:00 AM–3:00 AM stored 6:00 AM–7:00 AM in start_at/end_at because timestamptz was shown as UTC.
Decision: reservation_requests and reservations_confirmed start_at/end_at are timestamp without time zone in America/New_York. The table shows the same clock time the requester picked. Occupancy and availability convert now() and query bounds into Eastern before comparing. Public views still show status and time only.
Alternatives Considered: Keep timestamptz UTC in the table and only convert in the UI.
Security Impact: None. Authorization stays server-side.
Privacy Impact: None.
Accessibility Impact: Manage When omits a time-zone label. Different days show both dates.
Operational Impact: Existing UTC rows were converted to Eastern wall clock.
Migration or Rollback: supabase/migrations/20260829100000_eastern_wall_clock_times.sql
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-29-dmc-catc-rooms

```text
Decision ID: D-2026-08-29-dmc-catc-rooms
Date: 2026-08-29
Owner: Product owner (chat request)
Status: Approved
Context: The campus map treated DMC and CATC as single whole-building spaces. The owner added interior floor plans and named the rooms.
Decision: DMC is Divine Mercy Center with Classroom and Common Space. Carlo Acutis Tech Center has one room, VEX Space. Campus clicks drill into those floor plans the same way as Corpus Christi. Old `dmc` and `catc` room rows are inactive.
Alternatives Considered: Keep one bookable space per building; wait for traced polygons before going live.
Security Impact: Authorization stays server-side. Inactive whole-building rows cannot receive new requests.
Privacy Impact: Public calendar still shows status and time only.
Accessibility Impact: Room labels use the owner-supplied names.
Operational Impact: Room outlines can be refined in the building editors. Manager assignment, hours, and capacity are still open.
Migration or Rollback: supabase/migrations/20260829081000_dmc_catc_rooms.sql
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-29-manage-abilities

```text
Decision ID: D-2026-08-29-manage-abilities
Date: 2026-08-29
Owner: Product owner (chat request)
Status: Approved
Context: Manage was a placeholder plus trusted-access queue. The owner asked for Admin and Manager abilities as columns, icon header items, building-routed requests, a campus-wide manager, and an admin temporary view of other accounts.
Decision: Manage is visible only to managers and admins. Admins see Admin columns (room layouts, temporary view, trusted access) plus Manager columns (requests, current reservations). Managers see Manager columns only. Header Help, Manage, and Account are icons with accessible names. Reservation requests are visible to the room’s manager (rooms.manager_id) and to Tech Admin. jbenin@setonschool.net is campus manager for every building on first verified sign-in and always appears in Temporary view. Temporary view is admin-only, stored in an httpOnly cookie, keeps the admin session, and is disabled from Account. Mutations are blocked while temporary view is on. Trusted User approval is an Admin ability.
Alternatives Considered: Actually sign in as the target user; keep request visibility for all staff via is_staff().
Security Impact: Authorization stays server-side. Temporary view requires a real Tech Admin session on every request. The admin session is not replaced. Managers cannot see other buildings’ private request details.
Privacy Impact: Public calendar still shows status and time only. Manager columns show requester identity for assigned buildings only.
Accessibility Impact: Header icons include sr-only names and 44px targets. Temporary view is announced in a status banner.
Operational Impact: jbenin@setonschool.net is not in the user table until that person signs in; assignment runs then. Per-building manager UI is still later.
Migration or Rollback: supabase/migrations/20260829063946_campus_manager_and_request_routing.sql
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-29-campus-manager-dev

```text
Decision ID: D-2026-08-29-campus-manager-dev
Date: 2026-08-29
Owner: Product owner (chat request)
Status: Superseded by D-2026-08-29-campus-manager-net-only
Context: Campus-wide manager was only jbenin@setonschool.net. The owner asked for jbenin@setonschool.dev to manage every building on signup.
Decision: jbenin@setonschool.dev and jbenin@setonschool.net are both campus managers. On verified signup, that account is Manager and rooms.manager_id is set for every room. Temporary view lists both addresses until they exist.
Alternatives Considered: Replace .net with .dev; wait for a per-building manager table.
Security Impact: Authorization stays server-side. Only those emails receive campus-wide manager assignment.
Privacy Impact: None.
Accessibility Impact: None.
Operational Impact: If both accounts sign in, the later verified signup is assigned to every room.
Migration or Rollback: supabase/migrations/20260829110000_campus_manager_setonschool_dev.sql
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-29-campus-manager-net-only

```text
Decision ID: D-2026-08-29-campus-manager-net-only
Date: 2026-08-29
Owner: Product owner (chat request)
Status: Approved
Context: The previous decision added jbenin@setonschool.dev as a campus manager. The owner clarified that only jbenin@setonschool.net should be campus-wide manager; the .dev address should have no special access.
Decision: jbenin@setonschool.net is the only campus manager. On verified signup that account is Manager and rooms.manager_id is set for every room. Temporary view lists that address until it exists. jbenin@setonschool.dev receives no special role or room assignment.
Alternatives Considered: Keep both emails; treat .dev as a requester.
Security Impact: Authorization stays server-side. Only the .net email receives campus-wide manager assignment.
Privacy Impact: None.
Accessibility Impact: None.
Operational Impact: If the .dev account was already granted manager, it is demoted and rooms are reassigned to the .net account when that user exists.
Migration or Rollback: supabase/migrations/20260829120000_campus_manager_net_only.sql
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-29-help-support-email

```text
Decision ID: D-2026-08-29-help-support-email
Date: 2026-08-29
Owner: Product owner (chat request)
Status: Superseded by D-2026-08-30-mail-mailbox
Context: Open decision #18. The Help page was a long how-to with map-editor links. The owner asked for the same card layout as Account, Sign in, and Sign up, with a single contact line.
Decision: Help uses the shared auth card layout. Phase 1 support contact is j03-b@setonschool.dev. Escalation beyond that address is still open.
Alternatives Considered: Keep the how-to content; use TechAdmin@setonschool.net.
Security Impact: Contact is display-only. It is not used for authorization.
Privacy Impact: No requester or reservation details are shown on Help.
Accessibility Impact: The address is a mailto link with visible text.
Operational Impact: People email that address for questions. Map-editor links are no longer on Help.
Migration or Rollback: None
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-29-access-badge-colors

```text
Decision ID: D-2026-08-29-access-badge-colors
Date: 2026-08-29
Owner: Product owner (chat request)
Status: Approved
Context: Manage used plain text Admin and Manager headings. User and Trusted User pills were light blue and dark blue, which looked too close to Manager.
Decision: Manage section titles use the same rank pills as Account: Admin gold, Manager blue. Guest remains green. User is a light grey pill. Trusted User is a dark grey pill. Labels stay on the pills so color is not the only signal.
Alternatives Considered: Keep User/Trusted in blue; use colored bars instead of pills for Manage headings.
Security Impact: None. Access level is still stored and authorized server-side.
Privacy Impact: None.
Accessibility Impact: Pill text remains the access label.
Operational Impact: None.
Migration or Rollback: None
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-29-undo-approval

```text
Decision ID: D-2026-08-29-undo-approval
Date: 2026-08-29
Owner: Product owner (chat request)
Status: Approved
Context: Current reservations had no way to reverse an accidental approval. The owner asked for a yellow undo on approved reservations that returns them to Requests.
Decision: Managers and Tech Admin may undo an active approved reservation for a space they manage. Undo deletes the occupancy row in reservations_confirmed (so the unique request_id can be reused on re-approval) and sets the linked reservation_requests status back to pending. The request reappears in Requests with approve/decline. This is a documented Approved → Submitted transition, not a cancellation.
Alternatives Considered: Cancelled-by-manager (terminal); keep a cancelled confirmed row (blocked by unique request_id on re-approve).
Security Impact: Authorization stays server-side. Temporary view still blocks mutations. Managers cannot undo reservations for rooms they do not manage.
Privacy Impact: Public calendar still shows status and time only. After undo the time shows as Pending again, not requester details.
Accessibility Impact: The undo control is a 44px button with an undo icon plus accessible name, not color alone.
Operational Impact: None. No schema change.
Migration or Rollback: src/lib/auth/reservation-actions.ts
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-29-range-date-snap

```text
Decision ID: D-2026-08-29-range-date-snap
Date: 2026-08-29
Owner: Product owner (chat request)
Status: Approved
Context: Picking a start date in December left the end date on today, so the calendar stretched across months and looked broken.
Decision: Changing the start date moves the end date to that same day (times stay). Changing the end date also moves the start date to that day when start is more than 5 calendar days away. Nearby end-date changes (5 days or fewer) keep start, so December 12 can still become an 11–12 range. The month grid follows the selected range instead of stretching from today. Public views still show status and time only.
Alternatives Considered: Keep the other date fixed; hard-cap every range at 5 days with no nearby exception.
Security Impact: None. Request authorization stays server-side.
Privacy Impact: None.
Accessibility Impact: Start date and end date fields still have visible labels. The calendar still exposes day names.
Operational Impact: None.
Migration or Rollback: src/lib/availability/range-time.ts, src/components/map/availability-planner.tsx
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-30-reservation-decision-email

```text
Decision ID: D-2026-08-30-reservation-decision-email
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: Masterplan §17.2 requires request approved and request declined emails. Managers could approve or decline with no requester notice, and decline had no reason.
Decision: After a manager or Tech Admin approves or declines a pending request, email the requester from Seton Spaces <dev@setonschool.net> using the same card style as the sign-in code email. The message includes space, when (America/New_York), confirmation number, who decided, and the decision timestamp. Declines require a requester-facing reason, which is stored and included in the email. Replies and Help questions go to the same mailbox. A failed send does not undo the decision. Undo approval does not send mail.
Alternatives Considered: Send from the Help address; include manager-only notes; block the decision if mail fails.
Security Impact: Authorization stays server-side. Temporary view still blocks mutations. Email HTML escapes requester-facing text.
Privacy Impact: Public calendar still shows status and time only. Decision mail goes to the requester, not the public.
Accessibility Impact: Decline requires a labeled reason field. Approve and decline controls keep 44px tap targets and accessible names.
Operational Impact: Delivery uses the Gmail API as the school mailbox (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_REFRESH_TOKEN). Sign-in codes stay on Supabase.
Migration or Rollback: supabase/migrations/20260830042841_reservation_decline_audit.sql, src/lib/email/*, src/lib/auth/reservation-actions.ts, src/app/manage/request-cards.tsx
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-30-mail-mailbox

```text
Decision ID: D-2026-08-30-mail-mailbox
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: Help and Reply-To used j03-b@setonschool.dev, which is not a real mailbox. j03-b@setonschool.net is also not the mailbox in use. A test confirmation appeared in the dev@setonschool.net Sent folder but never arrived at semperjoey@gmail.com, while sign-in codes from the same From address do arrive.
Decision: All product mail is sent from and replied to Seton Spaces <dev@setonschool.net>. Help shows that address. Emails omit links unless the site origin is public https (not localhost).
Alternatives Considered: Reply-To j03-b@setonschool.net; keep a separate Help address.
Security Impact: None. Authorization stays server-side.
Privacy Impact: Public calendar still shows status and time only.
Accessibility Impact: Help mailto text matches the address.
Operational Impact: Replies go to the mailbox. Sign-in codes stay on Supabase. Reservation notices use the Gmail API.
Migration or Rollback: src/lib/brand.ts, src/lib/email/*, src/app/help/page.tsx
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-30-smtp-reservation-mail

```text
Decision ID: D-2026-08-30-smtp-reservation-mail
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Superseded by D-2026-08-30-resend-mail
Context: Sign-in codes already arrive through Supabase Auth. The owner clarified that Google Workspace SMTP is only for reservation mail: confirmations, declines, and a notice when a request is submitted.
Decision: Sign-in OTP remains Supabase-only. After a request is inserted, SMTP emails Seton Spaces <dev@setonschool.net> with space, when (America/New_York), confirmation number, requester, and reason. After approve or decline, SMTP emails the requester. Product wording stays declined, not rejected. A failed send does not undo the request or decision. Duplicate pending inserts do not send a second notice. Undo approval does not send mail.
Alternatives Considered: Also email the requester a “request submitted” copy; notify the campus manager address instead of the mailbox.
Security Impact: Authorization stays server-side. Temporary view still blocks mutations. The new-request notice is not a public calendar view.
Privacy Impact: Public calendar still shows status and time only. Requester identity is included only on the mailbox notice, not on public views.
Accessibility Impact: None in the UI. Decline still requires a labeled reason.
Operational Impact: SMTP_HOST/SMTP_USER/SMTP_PASS (or Resend) must be set for these messages. Sign-in codes do not use this SMTP.
Migration or Rollback: src/lib/email/reservation-decision.ts, src/lib/auth/reservation-actions.ts, src/lib/email/layout.ts
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-30-resend-mail

```text
Decision ID: D-2026-08-30-resend-mail
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Superseded by D-2026-08-30-gmail-api-send
Context: Google Workspace SMTP put reservation mail in Sent, but Gmail dropped new subjects. The owner briefly chose Resend, then asked for the Gmail API with no extra DNS.
Alternatives Considered: Keep smtp.gmail.com; add include:_spf.google.com and Google DKIM to the existing SiteLock SPF.
Security Impact: Authorization stays server-side. API key is server-only.
Privacy Impact: Public calendar still shows status and time only. New-request notices still go to the mailbox, not the public.
Accessibility Impact: None.
Operational Impact: Add and verify setonschool.net at resend.com/domains (Resend CNAMEs; root Google MX can stay). Set RESEND_API_KEY locally and on Vercel. Until the domain is verified, Resend can only send from onboarding@resend.dev to the Resend account email.
Migration or Rollback: src/lib/email/send.ts, .env.example; remove nodemailer
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-30-gmail-api-send

```text
Decision ID: D-2026-08-30-gmail-api-send
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: The owner asked for an app that sends only as the school mailbox, with no DNS changes. Resend still required domain CNAMEs to send as that address to other people.
Decision: Reservation approved, declined, and new-request mail is sent with the Gmail API as the authorized school mailbox. From and Reply-To are that mailbox. The OAuth refresh token is server-only. Sign-in OTP stays on Supabase. No extra DNS records are added. Gmail may still drop new subjects because the domain is not SPF/DKIM aligned.
Alternatives Considered: Resend with domain verification; send from a gmail.com address.
Security Impact: Authorization stays server-side. The refresh token can send only as the Google account that granted gmail.send. Temporary view still blocks mutations.
Privacy Impact: Public calendar still shows status and time only.
Accessibility Impact: None.
Operational Impact: Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN locally and on Vercel. Run node scripts/gmail-oauth.mjs once, signed in as the school mailbox. Redirect URI is http://127.0.0.1:42813/oauth2callback.
Migration or Rollback: src/lib/email/send.ts, scripts/gmail-oauth.mjs, .env.example
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-30-email-templates

```text
Decision ID: D-2026-08-30-email-templates
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: Admins needed a place to view reservation mail and copy the two Supabase OTP templates. Requesters also needed a submitted confirmation, not only the mailbox notice.
Decision: Manage includes an admin-only Email templates column. Cards match Room layouts: a 2-column grid. Opening a card shows a centered overlay preview over the page so the Manage columns do not grow or require horizontal scrolling. A top-left control switches Show example information and Show raw. Raw uses {space}, {when}, {reason}, {request_id} and similar tokens. All six templates share the confirmation chrome: logo to the left of Seton Spaces, a divider before details, Request ID as the reservation_requests UUID, and Open Seton Spaces plus Questions outside the white card. Sign in and Sign up copy HTML with {{ .Token }} and {{ .SiteURL }} for the Open Seton Spaces link. The logo is a public Supabase Storage object (bucket brand, object logo.png) so Auth mail does not depend on the Vercel origin. After insert, Gmail sends both the mailbox notice and a requester confirmation. Failed send still does not undo the request. Duplicate pending inserts still do not send a second pair.
Alternatives Considered: One shared OTP preview; mailbox notice only; edit templates from the database; load the logo from seton-space.vercel.app.
Security Impact: Authorization stays server-side. The preview is admin-only on Manage. Copy is the same HTML the app already sends or pastes into Supabase. The brand bucket is public for known object URLs only — no SELECT listing policy.
Privacy Impact: Public calendar still shows status and time only. Requester identity stays on the mailbox notice. The requester confirmation does not add identity fields.
Accessibility Impact: Cards use 44px tap targets and aria-expanded. The preview is a modal dialog with Escape, Close, a labeled iframe, and a labeled example/raw radiogroup.
Operational Impact: Sign-in and sign-up still share one Supabase Magic Link slot in hosted Auth; both copies are available so wording can be chosen. Reservation mail still uses the Gmail API. Hosted Auth templates must be re-pasted after logo URL changes. Open Seton Spaces uses https://seton-space.vercel.app (D-2026-08-30-email-open-site).
Migration or Rollback: src/lib/email/messages.ts, src/lib/email/otp-html.ts, src/lib/email/logo.ts, src/lib/email/reservation-decision.ts, src/lib/auth/reservation-actions.ts, src/app/manage/email-template-cards.tsx, src/app/manage/manage-board.tsx, supabase/migrations/20260830073158_public_brand_storage_bucket.sql, supabase/templates/magic_link.html
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-30-email-open-site

```text
Decision ID: D-2026-08-30-email-open-site
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: Manage email-template previews showed Open Seton Spaces next to Questions, but Gmail bodies often had Questions only. Sent mail dropped the action when the public origin was http://localhost or missing, because Gmail rejects those hrefs. The owner asked that the control open the live site for now.
Decision: Open Seton Spaces always renders in the footer, to the left of Questions. The href is https://seton-space.vercel.app (BRAND.siteUrl) for Gmail reservation mail, Manage previews, OTP copy HTML, and the hosted Magic Link template. Official product hosting remains open decision 19.
Alternatives Considered: Use NEXT_PUBLIC_SITE_URL or {{ .SiteURL }}; omit the action when the origin is not https; link mailbox notices to /manage.
Security Impact: The link is a public https origin. Authorization stays server-side on the site.
Privacy Impact: None. The public calendar still shows status and time only.
Accessibility Impact: The footer is one line: Open Seton Spaces | Questions, so both controls stay visible in Gmail.
Operational Impact: Hosted Auth Magic Link HTML must be re-pasted so OTP mail matches. Change BRAND.siteUrl when the official domain is confirmed.
Migration or Rollback: src/lib/brand.ts, src/lib/email/messages.ts, src/lib/email/otp-html.ts, src/lib/email/layout.ts, src/lib/email/reservation-decision.ts, src/lib/auth/reservation-actions.ts, supabase/templates/magic_link.html
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-30-all-occupancy

```text
Decision ID: D-2026-08-30-all-occupancy
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: Pending occupancy past a 14-day fetch window did not appear while choosing another time. The date grid also only listed weeks around the selected range, so later pending days were not in the calendar at all.
Decision: The map loads every pending request and confirmed reservation (status and time only). The room date grid extends through those occupancy weeks and marks Pending or Reserved days. Choosing a time no longer depends on a short availability window.
Alternatives Considered: Keep a 90-day query cap and refetch when the range moves; show occupancy only on the week timeline.
Security Impact: Authorization stays server-side. The public occupancy payload still omits requester and event details.
Privacy Impact: Public calendar still shows status and time only.
Accessibility Impact: Occupied day buttons include the public status in the accessible name.
Operational Impact: Occupancy volume stays small (status and time per block). Raise MAX_WEEK_ROWS if a room’s occupancy spans more than two years.
Migration or Rollback: src/lib/data/availability.ts, src/app/page.tsx, src/app/api/availability/route.ts, src/components/map/map-workspace.tsx, src/components/map/availability-planner.tsx, src/lib/availability/status-at-time.ts
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-30-access-level-labels

```text
Decision ID: D-2026-08-30-access-level-labels
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: users.access_level used none, requester, trusted, manager, and tech_admin. The owner asked for dashboard options admin, manager, trusted user, user, and guest, and for Account to list managed rooms by building.
Decision: The Postgres enum values are admin, manager, trusted user, user, and guest. Existing rows map tech_admin→admin, trusted→trusted user, requester→user, none→guest. Seton-domain verification still grants request permission as user. Bootstrap admin remains admin. Campus manager remains manager. Account Rooms groups catalog rooms by building; full control of every room in a building shows “{building} — all access”.
Alternatives Considered: Keep the old enum labels and only change the UI; use trusted_user without a space.
Security Impact: Authorization stays server-side. is_tech_admin() checks access_level = admin. Request insert still requires a verified non-guest level.
Privacy Impact: Public calendar still shows status and time only. Account room lists are visible only to the signed-in manager or admin.
Accessibility Impact: Rooms uses headings and lists, not color alone.
Operational Impact: Supabase Table Editor shows the new enum options. Existing functions and the request-insert policy use the new labels.
Migration or Rollback: supabase/migrations/20260830043910_rename_access_level_values.sql
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-30-map-wayfinding-icons

```text
Decision ID: D-2026-08-30-map-wayfinding-icons
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: The owner asked to place men's bathroom, women's bathroom, and office markers on any map from the room editor.
Decision: Those markers are wayfinding only — not reservable rooms and not shown as requester or event details. Editors for each building floor and the campus map can stamp, drag, and remove them. Placements persist in the browser until copied into map configuration. Public map views show status and time on rooms as before; icons do not add personal data.
Alternatives Considered: Treat icons as rooms with space slugs; store placements only after a config paste.
Security Impact: Icons are display configuration. Authorization for reservations stays server-side.
Privacy Impact: Public calendar and public map still omit requester and event details.
Accessibility Impact: Each marker has an accessible name (Men's bathroom, Women's bathroom, Office). On the public map they do not capture clicks so rooms stay usable.
Operational Impact: Copy this floor / Copy all floors includes an icons array for map-config.ts.
Migration or Rollback: None
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-30-guest-no-request-panel

```text
Decision ID: D-2026-08-30-guest-no-request-panel
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: Unsigned visitors were treated as guests for submission, but the room request form still appeared on the right. The owner asked that guests keep the left time-range planner and timeslot views and not see the request popup.
Decision: Anyone who cannot submit (not signed in, or signed in as Guest) does not see the request form. The left availability planner and room timeslots stay visible. The floor camera does not reserve space for a hidden right panel. Request inserts remain server-side and still require a non-guest requester.
Alternatives Considered: Keep the form with a Sign in button; hide the form only for unsigned visitors and still show it for signed-in Guests.
Security Impact: Hiding the UI is not authorization. Server-side checks still block guest and unsigned submissions.
Privacy Impact: Public calendar still shows status and time only. The hidden form does not add requester or event details.
Accessibility Impact: Guests are not offered a request heading or reason field they cannot use.
Operational Impact: None.
Migration or Rollback: None
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-30-request-notice-managers

```text
Decision ID: D-2026-08-30-request-notice-managers
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: New-request mail already went to Seton Spaces <dev@setonschool.net>. The owner asked that a submitted reservation request also go to that mailbox and to any managers who control the room.
Decision: After a request is inserted, exactly two messages are sent. One confirmation goes only to the requester. One new-request notice goes to a single To list: the school mailbox (BRAND.email / dev@setonschool.net) plus every manager with control of that room (assigned rooms.manager_id and the campus manager). Addresses on that notice are deduped. A failed send does not undo the request. Duplicate pending inserts still do not send a second notice. Tech Admin is not added unless they manage the room. Requester identity stays on the manager notice only, not on public views.
Alternatives Considered: Mailbox only; email every Admin; wait for a backup-manager table.
Security Impact: Manager emails are resolved with a security-definer function because requesters cannot read other users.email. Authorization for submit and review stays server-side.
Privacy Impact: Public calendar still shows status and time only. Requester identity is included only on the manager/mailbox notice.
Accessibility Impact: None in the UI.
Operational Impact: Phase 1 usually has one assigned manager (campus-wide). When more managers are assigned to a room, they receive the same notice.
Migration or Rollback: supabase/migrations/20260830153000_room_manager_notice_emails.sql, src/lib/email/reservation-decision.ts, src/lib/auth/reservation-actions.ts
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-30-request-notice-actions

```text
Decision ID: D-2026-08-30-request-notice-actions
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: The manager request-notice email listed requester then request ID, with no overlap summary and no way to decide from the message.
Decision: After Requester, the notice lists Conflicts: overlapping pending requests and confirmed reservations for that room and time, or None. Before Request ID, a green Approve button and a red Decline button link to /manage with a signed token. Opening the link goes to Manage. If the manager is already signed in, the decision is applied and Manage shows a confirmation. If they are signed out, sign-in returns them to that Manage URL and then applies the decision. Email decline stores the reason “Declined from the request notice.” Authorization stays server-side; the token is not a substitute for a manager session. Public views still show status and time only.
Alternatives Considered: Open Manage without applying; require a typed decline reason from the email.
Security Impact: Links include an HMAC token so a requester who knows the request id cannot CSRF a signed-in manager. Apply still requires a manager session for that room. Temporary view still blocks mutations.
Privacy Impact: Conflict lines on the manager notice may include other requesters’ names. They are not shown on public calendars.
Accessibility Impact: Buttons are labeled Approve and Decline. Manage announces the confirmation or error.
Operational Impact: Set EMAIL_DECISION_SECRET, or GOOGLE_CLIENT_SECRET is used. Add request_notice_conflicts for overlap lookup.
Migration or Rollback: supabase/migrations/20260830180000_request_notice_conflicts.sql; src/lib/email/*, src/lib/auth/reservation-actions.ts, src/app/manage/page.tsx, src/lib/supabase/middleware.ts
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-30-email-decline-reason

```text
Decision ID: D-2026-08-30-email-decline-reason
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: D-2026-08-30-request-notice-actions auto-applied Decline from the notice with a stored default reason. The owner asked that Decline instead open the same reason form used on Manage.
Decision: The notice Decline button still goes to Manage with a signed token. It does not apply the decline. If the manager is signed in (or after sign-in), Manage opens that request’s existing Reason for decline form (required reason, Send decline, Cancel). Submit follows the same server-side decline path as the Manage button. Approve from the notice still auto-applies when signed in. Public views still show status and time only.
Alternatives Considered: Keep auto-decline with a default reason; collect the reason inside the email.
Security Impact: Decline still requires a manager session and a typed reason. The token only opens the form for that request; it does not skip authorization.
Privacy Impact: None beyond the existing manager notice.
Accessibility Impact: The reason field is focused when opened from the email link. Cancel returns to the request actions.
Operational Impact: None.
Migration or Rollback: src/app/manage/page.tsx, src/app/manage/request-cards.tsx, src/lib/auth/reservation-actions.ts
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-30-timeslot-midnight-range

```text
Decision ID: D-2026-08-30-timeslot-midnight-range
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: The room timeslot column hid later hour labels after about six visible hours, so the day looked like it stopped around 10. The owner asked for 12 to 12.
Decision: The selected-room timeslot view is a full local day from 12 AM through 12 AM. Hour labels stay visible for every hour in the current viewport. Operating hours by space remain an open decision and are not enforced by this display.
Alternatives Considered: Keep a 6-hour label window; show only 7 AM–10 PM.
Security Impact: None. This is public availability display.
Privacy Impact: Public calendar still shows status and time only.
Accessibility Impact: Hour labels remain 12-hour clock text (12 AM through 12 AM).
Operational Impact: None.
Migration or Rollback: None
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-30-combine-own-pending

```text
Decision ID: D-2026-08-30-combine-own-pending
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: A requester who already had a pending time (for example 5–10) could not submit an overlapping follow-up, so they could not extend to 10–11 by sending 4–11. Separate pending rows for the same person were also harder to review.
Decision: If the same requester submits another pending request for the same room that overlaps or touches an earlier pending request of theirs, the submit is allowed with a required reason. The rows combine into one pending request: the time becomes the union (earliest start through latest end), and the reasons are merged. Adjacent add-ons such as 5–10 then 10–11 also combine. Other people’s pending holds still hide Request this space. Public views still show status and time only. Managers receive an updated notice; the original request ID is kept.
Alternatives Considered: Keep hiding the form on any pending overlap; require withdrawal and a new request; merge only exact overlaps and not adjacent times.
Security Impact: Combine runs server-side as the signed-in requester on their own pending rows. It does not approve occupancy. Overlapping confirmed reservations stay blocked at approval.
Privacy Impact: Own pending ranges are loaded only for the signed-in user to decide whether the form stays available. They are not added to the public availability payload.
Accessibility Impact: A short explanation is shown when the selected time continues or overlaps the requester’s own pending request.
Operational Impact: Managers see one combined card instead of several overlapping cards from the same person.
Migration or Rollback: supabase/migrations/20260830185103_combine_own_pending_request.sql; src/lib/auth/reservation-actions.ts; src/components/map/map-workspace.tsx; src/components/map/room-request-panel.tsx
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-30-extend-approved-request

```text
Decision ID: D-2026-08-30-extend-approved-request
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: A 5–10 pending request plus a 7–11 follow-up should become one 5–11 request to approve. If 5–10 was already approved, a 7–11 submit must not be blocked, must not try to re-approve 5–10, and must only request the added time.
Decision: Overlapping or adjacent pending requests from the same person on the same room still combine into one pending row covering the union (5–10 plus 7–11 becomes 5–11). If the overlapping time is already an approved reservation of that requester, the new request is only the uncovered remainder (7–11 against approved 5–10 becomes pending 10–11). The map still shows one solid 5–11 occupancy (Reserved then Pending). The manager and requester notices show When as a green Approved card and an orange Pending card, with the combined 5–11 span above them. Approve applies only to the pending remainder. Public views still show status and time only.
Alternatives Considered: Expand the confirmed reservation in place; keep 7–11 as a full overlapping request that cannot be approved.
Security Impact: Combine and remainder clipping stay server-side. Adjacent add-ons do not overlap confirmed rows at approval. Other people’s pending holds still hide Request this space.
Privacy Impact: Own reserved ranges are loaded only for the signed-in user. Public calendar still omits requester identity.
Accessibility Impact: The request panel explains when a submit will combine pending rows or request only the added time. Email cards are labeled Approved and Pending in text, not color alone.
Operational Impact: Managers approve only the new slice. The original approved reservation stays in place.
Migration or Rollback: src/lib/auth/reservation-actions.ts; src/lib/email/layout.ts; src/lib/email/messages.ts; src/components/map/map-workspace.tsx
Documents Updated: this master plan
```

### Recorded decision: D-2026-08-30-email-detail-cards

```text
Decision ID: D-2026-08-30-email-detail-cards
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: Request, approved, and declined mail mixed inline Label: value lines with Conflicts and When cards, so the details were harder to scan. Declined mail had no red When card.
Decision: Reservation notification emails (requester confirmation, manager request notice, approved, declined) put every detail in the same labeled container as Conflicts: label above, then a rounded card. Status, When, Reason, and Requester use status color with matching text (pending orange, approved green, declined red). Space, Conflicts, Approved by / Declined by, Decision made, and Request ID stay the gray Conflicts card. When cards keep an Approved, Pending, or Declined label in the card. Sign-in and sign-up OTP mail is unchanged. Public views still show status and time only.
Alternatives Considered: Color only When; keep Status as inline text; put all fields in one card.
Security Impact: None. Link tokens and server-side approval are unchanged.
Privacy Impact: Requester name and email stay on the manager notice only. Public calendar still omits requester and event details.
Accessibility Impact: Status is written in the card, not color alone. Plain-text fallback still lists each label and value.
Operational Impact: New mail uses the card layout. Already-sent messages are not rewritten.
Migration or Rollback: src/lib/email/layout.ts; src/lib/email/messages.ts
Documents Updated: this master plan, style guide §16.3
```

### Recorded decision: D-2026-08-30-otp-code-card

```text
Decision ID: D-2026-08-30-otp-code-card
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: Sign-in and sign-up mail showed the one-time code between two divider lines, unlike the labeled cards on reservation mail.
Decision: Sign-in and sign-up mail put the code in a labeled Code card, the same gray container as Space and Request ID. The instruction is the intro above one divider, then the Code card. Dividers no longer wrap the code. The 6-digit code stays large and letter-spaced inside the card. Hosted Auth still uses the Magic Link template; paste the updated supabase/templates/magic_link.html (and the Manage Sign up copy if that wording is used). Public views still show status and time only.
Alternatives Considered: Keep the code between dividers; color the code card pending orange.
Security Impact: None. The code is still {{ .Token }} in the hosted template. Authorization stays server-side.
Privacy Impact: None.
Accessibility Impact: The card is labeled Code in text. Plain-text fallback lists Code then the digits.
Operational Impact: Re-paste the Magic Link HTML in hosted Supabase Auth so live sign-in mail matches. Sign-in and sign-up still share one Auth template slot.
Migration or Rollback: src/lib/email/otp-html.ts; src/lib/email/layout.ts; supabase/templates/magic_link.html
Documents Updated: this master plan, style guide §16.3
```

### Recorded decision: D-2026-08-30-email-copy-cards

```text
Decision ID: D-2026-08-30-email-copy-cards
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: Reservation mail had extra intro lines, add-on headings, and several colored cards. Sign-in and sign-up put the instruction above the code.
Decision: Status is the only colored container and uses the words Pending, Approved, or Declined. All other cards stay gray with centered text. Requester confirmation heading and subject use Reservation submitted. Manager notice heading and subject use New reservation request. Add-on, combined, and extra intro copy are omitted from those emails. Sign-in and sign-up place Enter this code… under the Code card. Public views still show status and time only.
Alternatives Considered: Keep add-on headings; color When and Reason; keep intro paragraphs above the details.
Security Impact: None. Approval links and server-side checks are unchanged.
Privacy Impact: Requester identity stays on the manager notice only.
Accessibility Impact: Status is written in the card. OTP instruction remains visible after the code.
Operational Impact: Re-paste the Magic Link HTML in hosted Supabase Auth. Combine/extend still happens in the product; the emails no longer name it.
Migration or Rollback: src/lib/email/layout.ts; src/lib/email/messages.ts; src/lib/email/otp-html.ts; supabase/templates/magic_link.html
Documents Updated: this master plan, style guide §16.2–16.3
```

### Recorded decision: D-2026-08-30-notice-no-status

```text
Decision ID: D-2026-08-30-notice-no-status
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: The manager request notice included a Pending Status card. The heading already says it is a new request.
Decision: The manager request notice has no Status card. Requester confirmation still shows Pending. Approved and declined mail still show Approved or Declined.
Alternatives Considered: Keep Status on the notice for consistency.
Security Impact: None.
Privacy Impact: None.
Accessibility Impact: The notice heading remains New reservation request.
Operational Impact: None.
Migration or Rollback: src/lib/email/messages.ts
Documents Updated: this master plan, style guide §16.3
```

### Recorded decision: D-2026-08-30-request-id-divider

```text
Decision ID: D-2026-08-30-request-id-divider
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: Request ID sat in the same stack of cards as Space and When.
Decision: Reservation emails (confirmation, manager notice, approved, declined) place a divider above Request ID. Sign-in and sign-up have no Request ID.
Alternatives Considered: Keep Request ID in the same card stack with no divider.
Security Impact: None.
Privacy Impact: None.
Accessibility Impact: Request ID remains labeled in text.
Operational Impact: None.
Migration or Rollback: src/lib/email/layout.ts; src/lib/email/messages.ts
Documents Updated: this master plan, style guide §16.3
```

### Recorded decision: D-2026-08-30-request-id-copy

```text
Decision ID: D-2026-08-30-request-id-copy
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Superseded by D-2026-08-30-request-id-no-copy
Context: Request ID used the same large centered card as Space and When. The owner asked for a quieter left-aligned row with a copy control.
Decision: Request ID is a smaller left-aligned row: label, ID, and a copy icon. Clicking the icon copies the ID when the client allows script (including the Manage preview). The ID also uses select-all so one click highlights it in mail clients that strip script, such as Gmail. Sign-in and sign-up have no Request ID.
Alternatives Considered: Keep the large centered card; open a site page to copy.
Security Impact: Copy uses the ID already in the message. The Manage preview iframe allows scripts only for this generated HTML.
Privacy Impact: None beyond the existing Request ID in manager and requester mail.
Accessibility Impact: The copy control is named Copy request ID. The ID remains visible as text.
Operational Impact: Gmail still strips script, so copy-from-icon may not run there; selecting the ID still works.
Migration or Rollback: src/lib/email/layout.ts; src/lib/email/messages.ts; src/app/manage/email-template-cards.tsx
Documents Updated: this master plan, style guide §16.3
```

### Recorded decision: D-2026-08-30-request-id-no-copy

```text
Decision ID: D-2026-08-30-request-id-no-copy
Date: 2026-08-30
Owner: Product owner (chat request)
Status: Approved
Context: The Request ID copy icon did not copy in mail clients that strip script.
Decision: Remove the copy icon and copy script. Request ID stays a smaller one-row field: label on the left, ID centered in the container. Mail clients still let people select the ID as text.
Alternatives Considered: Keep a non-working icon; open a site page to copy.
Security Impact: The Manage preview iframe no longer allows scripts for this.
Privacy Impact: None.
Accessibility Impact: Request ID remains visible labeled text.
Operational Impact: None.
Migration or Rollback: src/lib/email/layout.ts; src/app/manage/email-template-cards.tsx
Documents Updated: this master plan, style guide §16.3
```

---

## 37. AI Agent Operating Instructions

### 37.1 Before starting any task

Every agent must:

1. Read this master plan.
2. Read the style guide.
3. Identify the relevant role, workflow, and state.
4. Check the open-decisions list.
5. State assumptions in the work artifact.
6. Avoid changing unrelated behavior.
7. Preserve privacy, authorization, auditability, and accessibility.

### 37.2 What agents should do

- Use the defined terminology.
- Keep requester access approval separate from reservation approval.
- Keep Tech Admin responsibilities separate from space-manager responsibilities.
- Enforce permissions server-side.
- Design data and APIs for multiple spaces.
- Use configuration rather than hard-coded names, domains, managers, or hours.
- Include empty, error, loading, and denied states.
- Write tests for business rules.
- Record state transitions.
- Preserve audit history.
- Use privacy-safe public data structures.
- Add migration and rollback notes for schema changes.
- Update documentation when behavior changes.
- Flag decisions that require a human owner.

### 37.3 What agents must not do

- Do not assume Seton users receive automatic reservation approval.
- Do not let external users submit reservations before requester access approval.
- Do not expose requester or event details publicly.
- Do not let a manager approve unrelated spaces.
- Do not silently allow self-approval.
- Do not permit overlapping approved reservations.
- Do not delete historical decisions or audit events.
- Do not hard-code `TechAdmin@setonschool.net` in business logic.
- Do not hard-code initial spaces as the only spaces the system can support.
- Do not send manager-only notes to requesters.
- Do not use color as the only status signal.
- Do not introduce a new status without updating the state model.
- Do not choose a major vendor or identity platform without recording the decision.
- Do not bypass authorization in development shortcuts that could reach production.
- Do not use production personal data in test fixtures.
- Do not mark a feature complete without tests and documentation.

### 37.4 Required task output format for agents

For implementation tasks, agents should provide:

- Objective
- Relevant requirements
- Assumptions
- Files changed
- Data/schema changes
- Authorization impact
- Privacy impact
- Accessibility impact
- Tests added or updated
- Known limitations
- Open decisions
- Rollback notes

---

## 38. Definition of Done

A feature is done only when:

- Product behavior matches this master plan.
- UI follows the style guide.
- Authorization is enforced server-side.
- Privacy is verified.
- Accessibility is reviewed.
- Business rules are tested.
- Error and empty states are implemented.
- Audit behavior is implemented where required.
- Notifications are tested where required.
- Documentation is updated.
- No unresolved critical security issue remains.
- A reviewer other than the implementer approves the change.
- The feature works in production-like configuration.

---

## 39. Decision Record Template

Use this format for significant decisions:

```text
Decision ID:
Date:
Owner:
Status: Proposed | Approved | Rejected | Superseded
Context:
Decision:
Alternatives Considered:
Security Impact:
Privacy Impact:
Accessibility Impact:
Operational Impact:
Migration or Rollback:
Documents Updated:
```

---

## 40. Final Product Rule

The system exists to make availability clear, requester access controlled, approvals accountable, and private information protected.

When convenience conflicts with security, privacy, auditability, or prevention of double booking, the safer and more accountable behavior takes priority.
