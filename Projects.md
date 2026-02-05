# Public Beta Project Checklist

> Scope: Journal Supabase (open review model)

## Milestone 0 — Launch Definition

- [ ] Confirm public beta scope: submit → open discussion → review opinions → editorial decision → list visibility
- [ ] Confirm review model: open review (submissions and discussions are public after submit)
- [ ] Define SLOs (availability, error budget, incident response window)

## Milestone 1 — P0 Release Readiness

### CI / Quality Gates
- [ ] `bun run build` must pass on default branch
- [ ] `bun run lint` must pass on default branch
- [ ] `bun run test` must pass on default branch
- [ ] Add minimal tests for:
  - [ ] Auth guard routes (`/submit`, `/me`)
  - [ ] Submission create/update flow
  - [ ] Review opinion create/reply permission boundaries

### Release Process
- [ ] Protect default branch (PR required)
- [ ] Add release versioning (`0.1.0-beta.x`)
- [ ] Add changelog template for each release

## Milestone 2 — P0 Security & Abuse Resistance (Open Review Compatible)

### RLS / Authorization Validation
- [ ] Keep public-read policies aligned with open review model
- [ ] Verify write paths require authenticated identity and relationship checks
- [ ] Add explicit regression SQL checks for:
  - [ ] Anonymous write blocked
  - [ ] Self-review blocked
  - [ ] Cross-submission reply mismatch blocked

### Anti-abuse
- [ ] Add rate limits for comment/review creation
- [ ] Enforce account verification requirement before posting
- [ ] Add moderation tools: report, hide, restore, mute

## Milestone 3 — P0 Operations

### Environment & Secrets
- [ ] Separate dev/staging/prod env configs
- [ ] Verify OAuth callback and site URL for production domain
- [ ] Ensure frontend only uses anon key; no service role leakage

### Migration / Rollback
- [ ] Define migration order and release runbook
- [ ] Provide rollback SQL for high-risk schema changes
- [ ] Run one full staging drill: migrate → verify → rollback → re-migrate

### Monitoring / Alerting
- [ ] Frontend error tracking (Sentry or equivalent)
- [ ] DB/API error-rate dashboard and alerts
- [ ] Business KPI alerts: submission failure, login failure, review submit failure

## Milestone 4 — P1 Product Completeness

### Discovery & Usability
- [ ] Add pagination for accepted and in-review lists
- [ ] Add search (title/author/keywords)
- [ ] Add sorting and filters (updated time, activity)

### Open Review UX
- [ ] Explicit “open review” disclosure copy on submission detail
- [ ] Threaded replies / quote reply / mention support
- [ ] Community guidelines visible at posting points

### Admin Operations
- [ ] User search in admin permission panel
- [ ] Add freeze/mute controls
- [ ] Add audit log view for sensitive actions

## Milestone 5 — P1 Documentation & Compliance

- [ ] Production deployment guide
- [ ] Incident response playbook
- [ ] Privacy policy / terms / community rules
- [ ] Public “How open review works” page

## Milestone 6 — P2 Growth & Reliability

- [ ] Notification pipeline (email/in-app)
- [ ] Metrics board (DAU, participation, conversion)
- [ ] Performance optimization for hot lists and heavy queries

## Release Gate (Must all be checked)

- [ ] Build/lint/test green for 7 consecutive days
- [ ] No critical authorization bypass in checklist tests
- [ ] Migration + rollback drill passed
- [ ] Monitoring/alerting validated with on-call owner
- [ ] Open review policy copy published in product
