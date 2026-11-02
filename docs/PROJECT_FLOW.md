# Sales CRM — Project Flow, Workflow & User Guide

> Audience: sales reps, sales managers, administrators, and developers onboarding to the project.
>
> Purpose: explain what the CRM does, how a lead becomes revenue, who can do what, and which screens support each step.

---

## Contents

1. [At a glance](#1-at-a-glance)
2. [Core concepts](#2-core-concepts)
3. [System architecture](#3-system-architecture)
4. [Roles and access](#4-roles-and-access)
5. [End-to-end sales flow](#5-end-to-end-sales-flow)
6. [Lead workflow](#6-lead-workflow)
7. [Follow-ups, tasks, activities, and meetings](#7-follow-ups-tasks-activities-and-meetings)
8. [Deal pipeline](#8-deal-pipeline)
9. [Customers, contacts, and companies](#9-customers-contacts-and-companies)
10. [Targets and reports](#10-targets-and-reports)
11. [Notifications and global search](#11-notifications-and-global-search)
12. [Page-by-page guide](#12-page-by-page-guide)
13. [Step-by-step playbooks](#13-step-by-step-playbooks)
14. [Data model](#14-data-model)
15. [API map](#15-api-map)
16. [Current limitations and known gaps](#16-current-limitations-and-known-gaps)
17. [Troubleshooting and FAQ](#17-troubleshooting-and-faq)

---

## 1. At a glance

The CRM manages the complete sales journey:

```
Lead → qualification → follow-ups → meetings → customer → deal → won/lost → reporting
```

| Question | Answer |
|---|---|
| Who uses it? | Admins, sales managers, sales employees, and report viewers. |
| Where do leads come from? | Manual entry, Excel/CSV upload, or a Google Sheets export saved as a spreadsheet. |
| What is the main sales object? | A **deal** with an estimated value and a pipeline stage. |
| When is revenue counted? | When a deal is closed as **WON** with closed revenue. |
| How is work scheduled? | Tasks/follow-ups, activities, meetings, and calendar entries. |
| How is performance measured? | Revenue targets, pipeline reports, lead reports, and rep performance reports. |
| Where do users log in? | The React dashboard at the configured frontend URL. |
| Where does data live? | PostgreSQL, accessed through Prisma from the Express API. |

---

## 2. Core concepts

| Term | Meaning |
|---|---|
| **Lead** | A potential customer. Has a status, priority, owner, source, and next follow-up. |
| **Contact** | A person, usually linked to a company. Can be a customer's primary contact. |
| **Company** | An organization that can own contacts, leads, customers, deals, tasks, and meetings. |
| **Customer** | An account created when a lead is converted or when a customer is created directly. |
| **Deal** | A revenue opportunity linked to a lead and/or customer, with a stage and estimated value. |
| **Pipeline stage** | The deal's position: Qualified, Meeting/Demo, Proposal, Negotiation, Won, or Lost. |
| **Task / Follow-up** | A scheduled action assigned to a user. Overdue/today/upcoming views are derived from tasks. |
| **Activity** | A record of a call, message, email, reminder, or other interaction. |
| **Meeting** | A scheduled session with internal and/or external participants, linked to a lead, deal, customer, or company. |
| **Target** | A monthly or quarterly revenue quota for a user or team. |
| **Notification** | An in-app alert for assignments, invitations, and meeting changes. |
| **Import batch** | A record of one spreadsheet import, including per-row success/duplicate/failure results. |

### Status reference

| Object | Values |
|---|---|
| Lead status | `NEW`, `CONTACTED`, `QUALIFIED`, `DISQUALIFIED`, `CONVERTED` |
| Lead priority | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| Deal status | `OPEN`, `WON`, `LOST` |
| Pipeline stage kind | `OPEN`, `WON`, `LOST` |
| Task status | `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| Meeting status | `PLANNED`, `COMPLETED`, `CANCELLED`, `RESCHEDULED` |
| Activity type | `CALL`, `MESSAGE`, `EMAIL`, `REMINDER`, `OTHER` |
| Target period | `MONTHLY`, `QUARTERLY` |
| Import source | `EXCEL`, `GOOGLE_SHEETS` |
| Import batch status | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` |
| Import row status | `PENDING`, `CREATED`, `DUPLICATE`, `FAILED` |
| Product/service type | `PRODUCT`, `SERVICE` |

---

## 3. System architecture

```mermaid
flowchart LR
    U["User in browser"] --> D["React dashboard<br/>Vite + React Router + Tailwind"]
    D -->|"JSON over HTTP<br/>Bearer JWT"| A["Express API<br/>/api/v1"]
    A --> M["Auth + permission middleware"]
    M --> S["Module services<br/>leads, deals, tasks, meetings, targets, reports"]
    S --> P["Prisma ORM"]
    P --> DB[("PostgreSQL")]
    S --> N["Notification service"]
    N --> DB
    S --> X["Excel / CSV import + export<br/>xlsx"]
    A --> H["Health endpoint<br/>/api/v1/health"]
```

### Main components

| Layer | Location | Responsibility |
|---|---|---|
| Dashboard | `dashboard/` | Screens, forms, tables, calendar, pipeline board, session handling. |
| API | `backend/src/app.ts` | Mounts module routes under the API prefix. |
| Auth | `backend/src/modules/auth/` | Login, JWT issuing, `/auth/me`, token verification. |
| Permissions | `backend/src/modules/permission/` | Role-permission matrix and `requirePermission(...)`. |
| Business logic | `backend/src/modules/*/` | Validation, transactions, lifecycle rules, notifications. |
| Data access | `backend/prisma/schema.prisma` | Entities, relations, enums, indexes, soft deletes. |
| Seed data | `backend/prisma/seed/` | Roles, permissions, admin user, lead sources, pipeline stages, targets. |

### Login and request lifecycle

```mermaid
sequenceDiagram
    actor User
    participant UI as React dashboard
    participant API as Express API
    participant DB as PostgreSQL

    User->>UI: Enter email + password
    UI->>API: POST /api/v1/auth/login
    API->>DB: Find user and verify bcrypt password hash
    DB-->>API: User + role
    API-->>UI: Token (7-hour JWT) + user profile
    UI->>UI: Store session in localStorage
    UI->>API: GET /api/v1/auth/me on reload
    API-->>UI: Current user
    UI->>API: Module request with Authorization: Bearer <token>
    API->>API: authenticateToken
    API->>API: requirePermission(code), where required
    API->>DB: Read or write via Prisma
    DB-->>API: Result
    API-->>UI: JSON response
```

> The dashboard stores the session in `localStorage` under `salesflow.session`. The token expires after 7 hours; there is no refresh-token flow.

---

## 4. Roles and access

The system defines four roles:

| Role | Intended purpose |
|---|---|
| `ADMIN` | Full system administration, user management, and all CRM permissions. |
| `SALES_MANAGER` | Manage the sales team, tasks, meetings, targets, and reports. |
| `SALES_EMPLOYEE` | Day-to-day sales operations: leads, follow-ups, meetings, and deals. |
| `REPORT_VIEWER` | Read-only reporting access. |

### How access is enforced

1. The user logs in and receives a JWT containing their identity.
2. `authenticateToken` verifies the token on every protected request.
3. `requirePermission("module.action")` checks the permission attached to the user's role.
4. User-management routes use `requireAdmin` instead of a permission code.
5. Notifications require authentication but do not use a permission code.

### Default seeded permissions

| Permission group | ADMIN | SALES_MANAGER | SALES_EMPLOYEE | REPORT_VIEWER |
|---|---|---|---|---|
| Users | all | none | none | none |
| Roles/permissions | all | none | none | none |
| Leads | all | none | none | none |
| Deals | all | none | none | none |
| Contacts | all | none | none | none |
| Customers | all (via deal permissions) | none | none | none |
| Tasks | all | view/create/edit/delete | view/create/edit/delete | none |
| Activities | all | view/create | view/create | none |
| Meetings | all | view/create/edit/delete | view/create/edit | none |
| Targets | all | view/create/edit/delete | view | none |
| Reports | all | view/export | none | none |
| Products/services | all | view/create/edit | view | none |

> **Important:** the table above is what the current seed file grants, not necessarily what each role should have. The seed does **not** grant lead, deal, contact, or customer permissions to managers or employees. In practice, the seeded admin can use every CRM module, while other seeded roles are limited to tasks, activities, meetings, targets, reports, and products. Review `backend/prisma/seed/permission.seed.ts` before giving users non-admin roles.

### Current permission-code caveats

- Permission routes require `permissions.view` and `permissions.manage`, but the seed creates `roles.view` and `roles.manage` instead. This can block the Roles & Permissions screen even for admins until the codes are aligned.
- Lead assignment requires `leads.assign`, but that code is not present in the seeded permission list.
- Customer routes reuse deal permissions (`deals.view`, `deals.create`, `deals.edit`, `deals.delete`).
- The sidebar is visible to all authenticated users. Some pages enforce access in the UI, but navigation itself is not role-filtered.

---

## 5. End-to-end sales flow

```mermaid
flowchart TD
    A["Lead captured<br/>manual or imported"] --> B{"Duplicate lead?"}
    B -- Yes --> B1["Skip duplicate<br/>keep existing lead"]
    B -- No --> C["Lead created<br/>status NEW"]
    C --> D["Assign an owner"]
    D --> E["Contact the lead<br/>call, email, message"]
    E --> F{"Interested?"}
    F -- No --> G["DISQUALIFIED<br/>record reason"]
    F -- Yes --> H["QUALIFIED"]
    H --> I["Schedule meeting / demo"]
    I --> J["Create or link a deal"]
    J --> K["Move through pipeline stages"]
    K --> L{"Outcome"}
    L -- WON --> M["Close with revenue<br/>targets and reports update"]
    L -- LOST --> N["Close with loss reason"]
    H --> O["Convert lead to customer"]
    O --> P["Customer account created"]
    P --> J
    M --> Q["Review performance<br/>and plan next actions"]
    N --> Q
```

### The sales journey in plain language

1. **Capture** — A rep creates a lead manually or imports many leads from a spreadsheet.
2. **Clean** — The importer validates rows, detects duplicates, and skips duplicates.
3. **Assign** — A manager or admin assigns the lead to the right salesperson.
4. **Qualify** — The salesperson contacts the lead, logs activities, and updates the status.
5. **Schedule** — A meeting or demo is booked, with participants and follow-up tasks.
6. **Convert** — A qualified lead becomes a customer, creating or linking company/contact records.
7. **Pursue** — A deal is created and moved through the pipeline.
8. **Close** — The deal is closed as WON with revenue or LOST with a reason.
9. **Measure** — Won revenue feeds targets, reports, and dashboards.
10. **Retain** — Follow-up tasks and meetings continue against the customer.

---

## 6. Lead workflow

### Lead lifecycle

```mermaid
stateDiagram-v2
    [*] --> NEW: Lead created or imported
    NEW --> CONTACTED: First contact attempted
    NEW --> DISQUALIFIED: Not a fit
    CONTACTED --> QUALIFIED: Need confirmed
    CONTACTED --> DISQUALIFIED: Not a fit
    QUALIFIED --> CONVERTED: Customer created
    QUALIFIED --> DISQUALIFIED: Opportunity lost
    DISQUALIFIED --> NEW: Re-open
    CONVERTED --> [*]
```

### What each lead status means

| Status | Meaning | Typical next action |
|---|---|---|
| `NEW` | Just captured, not yet worked. | Assign an owner and make first contact. |
| `CONTACTED` | Outreach has started. | Qualify budget, need, authority, and timing. |
| `QUALIFIED` | A real opportunity exists. | Book a meeting and create/link a deal. |
| `DISQUALIFIED` | Not a fit or no opportunity. | Record the reason and stop active work. |
| `CONVERTED` | The lead became a customer. | Work the customer and its deals. |

### Adding a lead manually

1. Open **Leads**.
2. Select **Add Lead**.
3. Enter at least the lead/contact name.
4. Optionally add company, email, phone, source, product/service, priority, owner, and notes.
5. Choose **Next Follow-up** or mark that no follow-up is needed and provide a reason.
6. Save. The lead is created with status `NEW` (unless another status is selected).

### Importing leads from a spreadsheet

```mermaid
flowchart TD
    A["Leads → More → Import Leads"] --> B["Download Excel or CSV template<br/>optional but recommended"]
    B --> C["Upload .xlsx, .xls, or .csv<br/>maximum 5 MB"]
    C --> D["POST /leads/import/preview"]
    D --> E["Parse rows, validate fields,<br/>detect duplicates"]
    E --> F["Preview modal<br/>rows + duplicate warnings"]
    F --> G{"Looks correct?"}
    G -- No --> C
    G -- Yes --> H["Confirm import"]
    H --> I["Rows are created or skipped<br/>import batch records results"]
    I --> J["Result summary<br/>created / duplicates / failed"]
```

Template columns:

| Column | Required? | Notes |
|---|---|---|
| Lead Name | Yes | Stored as `contactName`. |
| Company | No | Used for company matching on conversion. |
| Email | No | Must be a valid email if present. |
| Phone | No | Normalized for duplicate checks. |
| Lead Source | No | Matched by name or ID. |
| Status | No | Defaults to `NEW`. |
| Priority | No | Defaults to `MEDIUM`. |
| Owner | No | Matched by name, email, or email prefix; falls back to the importer. |
| Next Follow-up | No | Parsed as a date when valid. |
| Notes | No | Free text. |

Import rules:

- Maximum **1,000 rows** per import.
- Duplicate detection uses normalized email, normalized phone, and contact-name/company combinations.
- Duplicates inside the file and duplicates against existing leads are flagged in the preview.
- Duplicate rows are **skipped** on confirm; existing leads are not overwritten.
- If no next follow-up and no no-follow-up note is supplied, the row gets a default `No follow-up needed` note.

### Assigning a lead

1. Open the lead from the **Leads** table.
2. Choose **Assign**.
3. Select an active user or unassign the lead.
4. Optionally add a note.
5. Save. The current assignment is closed and a new assignment history row is created.
6. The new owner receives a `LEAD_ASSIGNED` notification unless they assigned the lead to themselves.

### Converting a lead to a customer

1. Open a qualified lead.
2. Choose **Convert**.
3. Confirm or provide the customer details.
4. The system creates or links the company and contact, creates the customer, and links existing open deals to the customer.
5. The lead status becomes `CONVERTED`, with `convertedCustomerId` and `convertedAt` set.
6. The lead record is retained for history.

> Conversion can also supply an existing customer ID, in which case the lead is linked to that customer instead of creating a new one.

### Lead detail and export

- The lead detail dialog shows company, email, phone, owner, source, next follow-up, creation time, and priority.
- Leads can be exported to Excel using the current filtered/visible data.
- Lead stats on the page show NEW, CONTACTED, QUALIFIED, and CONVERTED counts plus a conversion percentage.

---

## 7. Follow-ups, tasks, activities, and meetings

### How follow-ups relate to tasks

There is no separate follow-up table. **Follow-ups are tasks** filtered by due date:

| Follow-up tab | Task condition |
|---|---|
| Today | Due today and not completed/cancelled |
| Overdue | Due before today and not completed/cancelled |
| Upcoming | Due after today and not completed/cancelled |
| Completed | Status `COMPLETED` |

### Task lifecycle

```mermaid
stateDiagram-v2
    [*] --> OPEN: Task created
    OPEN --> IN_PROGRESS: Work started
    OPEN --> COMPLETED: Done
    IN_PROGRESS --> COMPLETED: Done
    OPEN --> CANCELLED: No longer needed
    IN_PROGRESS --> CANCELLED: No longer needed
    OPEN --> OPEN: Rescheduled
    IN_PROGRESS --> IN_PROGRESS: Rescheduled
    COMPLETED --> [*]
    CANCELLED --> [*]
```

Tasks can be linked to exactly one of: lead, deal, customer, company, or meeting. They have a title, description, assignee, creator, due date, priority, and status. Completion records the completion time, user, and note. Cancellation records a reason. Rescheduling increments `rescheduleCount` and adds a history row.

### Daily follow-up routine

```mermaid
flowchart TD
    A["Open Follow-ups"] --> B["Check Overdue"]
    B --> C{"Can it be completed now?"}
    C -- Yes --> D["Complete task<br/>add completion note"]
    C -- No --> E["Reschedule<br/>add reason"]
    A --> F["Check Due Today"]
    F --> G["Call / email / meet<br/>log activity"]
    G --> H{"Next step needed?"}
    H -- Yes --> I["Create next task<br/>with due date"]
    H -- No --> J["Complete or cancel<br/>with reason"]
    A --> K["Review Upcoming"]
    K --> L["Prepare for meetings<br/>and proposals"]
```

### Activities

Activities record what happened:

- Type: call, message, email, reminder, or other.
- Outcome and notes.
- Occurred time.
- Performed by.
- Optional links to lead, deal, customer, company, or task.

Use activities when you want an interaction history without changing the task's due date.

### Meetings

```mermaid
stateDiagram-v2
    [*] --> PLANNED: Meeting scheduled
    PLANNED --> COMPLETED: Meeting held
    PLANNED --> CANCELLED: Meeting cancelled
    PLANNED --> RESCHEDULED: New time created
    RESCHEDULED --> [*]
    COMPLETED --> [*]
    CANCELLED --> [*]
```

Scheduling a meeting captures:

- Title, start time, duration, location, or meeting link.
- Organizer.
- Internal users and/or external contacts as participants.
- Optional lead, deal, customer, or company link.
- Notes.

Participants receive `MEETING_INVITATION` notifications. Meeting updates generate `MEETING_UPDATED` notifications. After a meeting, record the outcome and next steps, and create follow-up tasks if needed. Rescheduling creates a new meeting linked to the old one and marks the old one `RESCHEDULED`.

---

## 8. Deal pipeline

### Pipeline stages

Seeded stages:

| Position | Stage | Kind |
|---|---|---|
| 1 | Qualified | OPEN |
| 2 | Meeting/Demo | OPEN |
| 3 | Proposal | OPEN |
| 4 | Negotiation | OPEN |
| 5 | Won | WON |
| 6 | Lost | LOST |

### Deal lifecycle

```mermaid
stateDiagram-v2
    state "Qualified" as Qualified
    state "Meeting/Demo" as MeetingDemo
    state "Proposal" as Proposal
    state "Negotiation" as Negotiation
    state "Won" as Won
    state "Lost" as Lost

    [*] --> Qualified: Deal created
    Qualified --> MeetingDemo: Discovery completed
    MeetingDemo --> Proposal: Requirements confirmed
    Proposal --> Negotiation: Proposal sent
    Negotiation --> Won: Customer agrees
    Negotiation --> Lost: No decision or lost to competitor
    Qualified --> Lost: Disqualified
    MeetingDemo --> Lost: No opportunity
    Proposal --> Lost: Rejected
    Won --> [*]
    Lost --> [*]
```

### What a deal contains

| Field | Purpose |
|---|---|
| Name | Deal or opportunity name. |
| Lead / customer | Who the deal belongs to. At least one relationship is expected in normal use. |
| Owner | Salesperson responsible. |
| Product/service | What is being sold. |
| Stage | Current pipeline position. |
| Estimated value | Pipeline value, not booked revenue. |
| Expected close date | Forecast date. |
| Next action / due date | The next concrete step. |
| Closed revenue | Only set when the deal is WON. |
| Lost reason / note | Required when the deal is LOST. |

### Working a deal

1. Open **Deals & Pipeline**.
2. Use the default **pipeline board** or switch to the table view.
3. Create a deal and choose its initial OPEN stage.
4. Move the card between stages as the opportunity advances.
5. Keep next action and expected close date current.
6. Link meetings, tasks, and activities to the deal.
7. Close the deal:
   - **WON** requires closed revenue.
   - **LOST** requires a loss reason.
8. Closed deals cannot be edited or deleted through the normal deal endpoints.

### How deals affect other modules

- `WON` deals with closed revenue count toward **targets**.
- Deal data feeds **reports**, dashboard KPIs, and rep performance.
- `OPEN` deals count toward pipeline value.
- Stage changes are recorded in **deal stage history** with the changed-by user and timestamp.

---

## 9. Customers, contacts, and companies

### Relationship model

```mermaid
flowchart LR
    CO["Company"] --> CT["Contact"]
    CO --> CU["Customer"]
    CT --> CU
    CU --> D["Deal"]
    L["Lead"] --> CU
    L --> D
    CO --> L
```

- A **company** can have many contacts, customers, leads, deals, tasks, activities, meetings, and documents.
- A **contact** can belong to a company and can be the primary contact for one or more customers.
- A **customer** is the converted account. It can have a company, a primary contact, an owner, deals, tasks, activities, meetings, and documents.
- A **lead** is kept after conversion so history is preserved.

### Customers page

Use **Customers** to:

- View converted accounts.
- Create a customer directly (creates/links company and contact as needed).
- Edit customer details and ownership.
- See deal count and pipeline value per customer.
- View the primary contact.

### Contacts page

Use **Contacts** to manage people independently of customers. Contacts can be linked to companies and used in meetings.

### Companies page

The route `/companies` exists and the page has table, form, filter, and detail-dialog UI, but it currently uses **local component state only** and is disabled in the sidebar. Treat it as a placeholder until a companies API is added.

---

## 10. Targets and reports

### Targets

Targets are revenue quotas for a user or team over a monthly or quarterly period.

Progress is calculated from **WON deals** whose owner is the target user (or a member of the target team) and whose `closedAt` falls inside the target period.

Status thresholds:

| Progress | Status |
|---|---|
| 100% or more | `ACHIEVED` |
| 70%–99.9% | `ON_TRACK` |
| 40%–69.9% | `AT_RISK` |
| Below 40% | `BEHIND` |

Target screens show quota, achieved revenue, progress percentage, won-deal count, and status. Target changes are recorded in `TargetChange` history.

> The Sales Targets item is currently disabled in the sidebar, although the `/targets` route and target API exist.

### Reports

Reports support these periods:

- This month
- Last month
- Last 30 days
- Last 7 days
- This quarter
- This year
- All time

Report tabs:

| Tab | What it answers |
|---|---|
| Overview | Pipeline value, won revenue, lead count, win rate, average deal size, trends. |
| Leads | Lead volume, status distribution, source performance, conversion. |
| Deals | Pipeline by stage, won/lost performance, revenue. |
| Performance | Per-rep results and target attainment. |

Reports can be filtered by user and exported to Excel (`.xlsx`).

---

## 11. Notifications and global search

### Notifications

The notification bell is available in the top bar. Notifications are stored in the database and polled by the dashboard:

- Poll interval: about 20 seconds.
- Also refreshes when the window regains focus.
- Unread count is shown on the bell.
- Users can mark one notification read, mark all read, or delete a notification.

Notification types currently created by the backend:

| Type | Trigger |
|---|---|
| `LEAD_ASSIGNED` | A lead is assigned to a different user. |
| `TASK_ASSIGNED` | A task is created for or reassigned to a user. |
| `MEETING_INVITATION` | A user is added to a meeting. |
| `MEETING_UPDATED` | A meeting is updated. |

### Global search

Use the top-bar search or press `Ctrl+K` / `Cmd+K`.

Search covers:

- Leads
- Customers
- Contacts
- Deals
- Tasks
- Meetings
- System pages

Results are grouped by category, and system pages are matched locally.

---

## 12. Page-by-page guide

| Page | Route | Main purpose | Key actions |
|---|---|---|---|
| Dashboard | `/` | Sales overview and daily agenda. | Review KPIs, trends, today's meetings/tasks, recent leads, and calendar. |
| Leads | `/leads` | Manage prospects. | Add, edit, filter, assign, change status, convert, import, export, delete. |
| Follow-ups | `/follow-ups` | Work due tasks. | View today/overdue/upcoming/completed, complete, reschedule, log activity. |
| Daily Calls | `/daily-calls` | Review the day's call log. | Navigate dates, view call stats, search/filter outcomes, log a call, export. |
| Tasks | `/tasks` | Manage all tasks. | Create, edit, change status, link to records, export, delete. |
| Meetings | `/meetings` | Schedule and track meetings. | Create, edit, view calendar/grid/table, mark complete/cancel/reschedule, add participants. |
| Deals & Pipeline | `/deals` | Manage opportunities. | Create, edit, move stage, close won/lost, export, filter. |
| Customers | `/customers` | Manage converted accounts. | Create, edit, view contacts/deals, delete. |
| Contacts | `/contacts` | Manage people. | Create, edit, link to companies, delete. |
| Companies | `/companies` | Placeholder company directory. | UI only; disabled in sidebar. |
| Products & Services | `/products-services` | Maintain the catalog. | Create, edit, activate/deactivate, delete. |
| Sales Targets | `/targets` | Track quotas. | Create, edit, view progress/history, delete. Disabled in sidebar. |
| Reports | `/reports` | Analyze performance. | Switch tabs, choose period/user, export Excel. |
| Calendar | `/calendar` | See meetings and tasks by date. | Navigate dates, inspect agenda items. |
| Notifications | `/notifications` | Manage alerts. | Filter unread, mark read, delete. |
| Users | `/users` | Admin user management. | Create users, assign roles, activate/deactivate, reset details. Admin only. |
| Roles & Permissions | `/permissions` | View/configure role access. | Inspect role-permission matrix. See permission-code caveat. |
| Profile | `/profile` | Current user profile. | View account details and role. |
| Documents | — | Sidebar item only. | Disabled; no route or page is currently wired. |

---

## 13. Step-by-step playbooks

### A. First-time setup (developer or administrator)

Prerequisites:

- Node.js and npm
- PostgreSQL database
- Backend environment variables
- Dashboard environment variable

Backend:

```powershell
cd backend
npm install
```

Create `backend/.env` with:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

ADMIN_NAME=System Administrator
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-password
```

Then:

```powershell
npm run db:migrate
npm run db:seed
npm run dev
```

Dashboard:

```powershell
cd dashboard
npm install
```

Create `dashboard/.env` with:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

Then:

```powershell
npm run dev
```

Open the dashboard URL, sign in with the admin credentials from `backend/.env`, and verify `/api/v1/health`.

### B. Administrator setup after first login

1. Open **User Management**.
2. Create users and assign roles.
3. Open **Roles & Permissions** and review the matrix.
4. Open **Products & Services** and add the products/services the team sells.
5. Confirm pipeline stages exist (seeded by default).
6. Confirm lead sources exist (seeded by default).
7. Create monthly or quarterly targets for reps or teams.
8. Share the dashboard URL and login instructions with the team.

### C. Sales manager: import and distribute leads

1. Open **Leads**.
2. Choose **More → Import Leads**.
3. Download the Excel or CSV template.
4. Fill in at least the **Lead Name** column.
5. Upload the file and review the preview.
6. Fix duplicate warnings or accept that duplicates will be skipped.
7. Confirm the import and review the result summary.
8. Assign owners to the new leads.
9. Confirm each lead has a next follow-up date or a no-follow-up reason.
10. Review **Reports → Leads** after the team starts working the list.

### D. Sales rep: daily routine

1. Open **Dashboard** and review today's agenda and KPIs.
2. Open **Follow-ups**.
3. Work **Overdue** items first.
4. For each contact:
   - Call, email, or message.
   - Log an **Activity** with the outcome.
   - Update the lead/deal.
   - Complete the task or reschedule it with a reason.
5. Check **Due Today** and complete those tasks.
6. Review **Upcoming** tasks and prepare for meetings.
7. Open **Meetings** and confirm today's/next meetings.
8. Update deal stages and next actions.

### E. Sales rep: convert a lead and create a deal

1. Open **Leads** and select a qualified lead.
2. Choose **Convert**.
3. Confirm customer details.
4. Open **Customers** and verify the new account.
5. Open **Deals & Pipeline**.
6. Create a deal linked to the lead/customer.
7. Set owner, product/service, estimated value, stage, and expected close date.
8. Add a next action and due date.
9. Move the deal through stages as it progresses.
10. Close as WON with revenue or LOST with a reason.

### F. Sales rep: schedule a meeting and follow up

1. Open **Meetings**.
2. Choose **Schedule Meeting**.
3. Add title, date/time, duration, location or link.
4. Link the meeting to a lead, deal, customer, or company.
5. Add internal and external participants.
6. Save. Participants receive invitations.
7. After the meeting, mark it **COMPLETED** and record outcome and next steps.
8. Create follow-up tasks for the next actions.
9. Log an activity if you want the interaction in the timeline.

### G. Manager or report viewer: review performance

1. Open **Reports**.
2. Choose a period such as **This Month** or **This Quarter**.
3. Optionally filter by user.
4. Review Overview, Leads, Deals, and Performance tabs.
5. Export to Excel when a shareable file is needed.
6. Open **Sales Targets** (when enabled) to compare quota vs. achieved revenue.

---

## 14. Data model

Simplified relationship view:

```mermaid
erDiagram
    ROLE ||--o{ USER : assigned_to
    USER ||--o{ LEAD : owns
    USER ||--o{ DEAL : owns
    USER ||--o{ TASK : assigned
    USER ||--o{ MEETING : organizes
    USER ||--o{ REVENUE_TARGET : receives
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ ACTIVITY : performs

    COMPANY ||--o{ CONTACT : has
    COMPANY ||--o{ CUSTOMER : has
    COMPANY ||--o{ LEAD : has

    CONTACT ||--o{ CUSTOMER : primary_contact
    LEAD ||--o{ DEAL : converts_to
    LEAD ||--o{ TASK : has
    LEAD ||--o{ ACTIVITY : has
    LEAD ||--o{ MEETING : has
    LEAD ||--o{ DOCUMENT : has

    CUSTOMER ||--o{ DEAL : has
    CUSTOMER ||--o{ TASK : has
    CUSTOMER ||--o{ ACTIVITY : has
    CUSTOMER ||--o{ MEETING : has
    CUSTOMER ||--o{ DOCUMENT : has

    DEAL ||--o{ TASK : has
    DEAL ||--o{ ACTIVITY : has
    DEAL ||--o{ MEETING : has
    DEAL ||--o{ DOCUMENT : has
    DEAL }o--|| PIPELINE_STAGE : in_stage
    DEAL ||--o{ DEAL_STAGE_HISTORY : records

    MEETING ||--o{ MEETING_PARTICIPANT : has
    MEETING ||--o{ TASK : creates_follow_up

    TASK ||--o{ ACTIVITY : logs
    TASK ||--o{ TASK_RESCHEDULE_HISTORY : records

    REVENUE_TARGET ||--o{ TARGET_CHANGE : records
    IMPORT_BATCH ||--o{ IMPORT_ROW : contains
    IMPORT_ROW ||--o| LEAD : creates
```

Key modeling rules:

- Soft deletes are used on major entities via `deletedAt`.
- Leads keep their source, owner, assignment history, and conversion link.
- Current lead assignment is the row with `unassignedAt = NULL`.
- Deals have both a stage and a status; status is separate from lead status.
- Tasks can link to only one of lead, deal, customer, company, or meeting.
- Closed deals cannot be edited or deleted through normal endpoints.
- Financial values use `Decimal(14, 2)`.
- Important indexes support owner/status, pipeline, due dates, and duplicate checks.

---

## 15. API map

Base URL in development: `http://localhost:5000/api/v1`

| Module | Base path | Notes |
|---|---|---|
| Health | `/health` | No authentication. |
| Auth | `/auth` | `POST /login`, `GET /me`, `POST /logout`. |
| Users | `/users` | Admin only. CRUD. |
| Permissions | `/permissions` | Roles, permissions, role-permission assignments, current user's permissions. |
| Leads | `/leads` | CRUD, options, stats, assign, status, import preview/confirm. |
| Lead import | `/leads/import` | `POST /preview`, `POST /confirm`. |
| Deals | `/deals` | CRUD, options, move stage, close. |
| Customers | `/customers` | CRUD, options. Uses deal permissions. |
| Contacts | `/contacts` | CRUD. |
| Tasks | `/tasks` | CRUD, options, follow-up stats, status update. |
| Activities | `/activities` | Create, list (with optional `dateFrom`/`dateTo` filters), get. |
| Meetings | `/meetings` | CRUD, options. |
| Targets | `/targets` | CRUD, options. |
| Reports | `/reports` | Options, overview, leads, deals, performance, export. |
| Products & Services | `/products-services` | CRUD. |
| Notifications | `/notifications` | List, unread count, mark read, mark all read, delete. |

> There is no companies module mounted in the backend at the time of this document.

---

## 16. Current limitations and known gaps

These are important for anyone testing or rolling out the system:

1. **Companies is UI-only.** The sidebar item is disabled, and the page uses local state with no API.
2. **Documents is not implemented.** The sidebar item is disabled and no `/documents` route exists.
3. **Sales Targets is hidden in the sidebar.** The page and API exist, but the menu item is disabled.
4. **Seeded role permissions are incomplete.** Managers and employees do not receive lead/deal/contact/customer permissions by default.
5. **REPORT_VIEWER has no seeded permissions.** The role exists but cannot access reports until permissions are assigned.
6. **Permission-code mismatch.** Permission routes require `permissions.view` / `permissions.manage`; the seed creates `roles.view` / `roles.manage`.
7. **Lead assignment permission is missing.** `leads.assign` is required by the route but is not seeded.
8. **Customer access is coupled to deals.** Customer routes require `deals.*` permissions.
9. **No refresh-token flow.** JWTs last 7 hours; users must log in again after expiry.
10. **No self-service password reset.** Password recovery is not implemented in the login flow.
11. **Login errors may surface as HTTP 500.** `AuthError` extends `Error` rather than `AppError`, so invalid login handling should be verified.
12. **Notifications are polled, not pushed.** Updates can take up to about 20 seconds.
13. **Navigation is not role-filtered.** All authenticated users see the full sidebar; backend permissions and some page-level checks enforce access.
14. **No automated tests.** The backend test script is still a placeholder.

---

## 17. Troubleshooting and FAQ

### The dashboard cannot reach the API

- Confirm the backend is running on the expected port.
- Confirm `dashboard/.env` has `VITE_API_URL=http://localhost:5000/api/v1`.
- Restart Vite after changing `.env`.
- Confirm the backend CORS `FRONTEND_URL` matches the dashboard origin.

### Login fails with a server error

- Check the backend console for the underlying error.
- Confirm the user exists, is active, and has a valid password hash.
- Verify `JWT_SECRET` is set.
- Review the `AuthError` handling noted in the limitations.

### Seeding fails

- Confirm `DATABASE_URL` is reachable.
- Confirm `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` are set.
- Make sure the admin password is at most 72 bytes.
- Run migrations before seeding.

### A non-admin user cannot open leads or deals

This is expected with the current seed. Grant the relevant permissions in the role-permission table or update the seed, then log in again so the permission set is refreshed.

### A lead was skipped during import

The importer treats it as a duplicate. Check the preview reason:

- Same email as an existing lead.
- Same phone (normalized) as an existing lead.
- Same contact name + company as another row or existing lead.

Existing leads are not overwritten by import.

### A deal cannot be edited or deleted

Closed deals (`WON` / `LOST`) are intentionally locked. Reopen or correct the data through an administrative process if needed.

### A target shows 0% progress

- Confirm the target period covers the deal's `closedAt` date.
- Confirm the deal status is `WON` and has closed revenue.
- Confirm the deal owner is the target user or a member of the target team.

### Where do I change the pipeline stages or lead sources?

They are seeded from:

- `backend/prisma/seed/pipelineStage.seed.ts`
- `backend/prisma/seed/leadSource.seed.ts`

There is no dedicated admin screen for editing them in the current dashboard.

---

## Quick reference card

| I want to... | Go to... |
|---|---|
| See my day | Dashboard or Calendar |
| Add or import prospects | Leads |
| Work overdue follow-ups | Follow-ups |
| Schedule a demo | Meetings |
| Move an opportunity forward | Deals & Pipeline |
| See converted accounts | Customers |
| Manage people at accounts | Contacts |
| Review quotas | Sales Targets (when enabled) |
| Analyze results | Reports |
| Add a team member | User Management (admin) |
| Check access rights | Roles & Permissions |
| Find anything quickly | Top-bar search or Ctrl/Cmd+K |
