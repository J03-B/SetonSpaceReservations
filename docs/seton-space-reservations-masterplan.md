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
- Notify the primary manager.
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
| `users` | Created on signup. Stores profile data and access level (`none`, `requester`, `manager`, `tech_admin`). |
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
18. **Support contact — decided 2026-08-29:** Phase 1 help page is the Account/Sign in card layout. Contact is `j03-b@setonschool.dev`. Escalation path remains open.
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
Status: Approved
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
