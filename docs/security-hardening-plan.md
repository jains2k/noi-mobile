# Security hardening plan

Last reviewed: 2026-07-04

Scope: Noi iOS app, web app, and backend APIs.

Reference: [Fingerprint vibe coding security checklist](https://fingerprint.com/blog/vibe-coding-security-checklist/)

## Current strengths

- Database queries are generally parameterized.
- Dynamic task-update columns are allowlisted.
- Passwords are hashed with Argon2.
- Fly forces HTTPS.
- An untrusted live CORS preflight did not receive an allow-origin response.
- The iOS JWT is stored in SecureStore.
- iOS App Transport Security disallows arbitrary network loads.

## P0: immediate work

### 1. Centralize backend request validation

Create strict schemas for every API input, including tasks, journals, moods,
focus sessions, AI actions, settings, authentication, and analytics.

- Enforce string length limits.
- Restrict enum values such as status, energy, action, theme, and font.
- Enforce numeric ranges.
- Validate ISO dates.
- Reject unknown properties.
- Add endpoint-specific request-size and AI prompt limits.
- Add matching database constraints where practical.

### 2. Add distributed rate limiting

Use a shared Fly-compatible Redis service and rate-limit by account and IP.
Cover sign-in, signup, password reset, AI, analytics, data writes, and account
deletion. Add daily per-user AI quotas.

### 3. Fix CSRF and session configuration

Restore CSRF checks for browser authentication and cookie-authenticated writes.
Replace the broad mobile JWT-return flow with a one-time, short-lived code using
state and PKCE. Keep the existing mobile `callbackUrl` contract intact. Explicitly
set secure cookie attributes and narrowly scope any cross-site cookie behavior.

### 4. Fix account deletion identity and transaction handling

- Resolve the canonical user ID through `resolveUserId(session)`.
- Delete related records in one database transaction.
- Invalidate reset tokens and sessions.
- Return generic errors.
- Test stale sessions, rollback, and cross-user isolation.

### 5. Restrict analytics ingestion

Require authentication, allowlist event names and property schemas, cap property
size, and rate-limit ingestion to prevent database growth and analytics poisoning.

## P1: next security pass

### 6. Harden authentication

- Apply an explicit signup and reset password policy.
- Normalize and validate emails.
- Return identical errors for unknown accounts and invalid passwords.
- Add email verification.
- Hash reset tokens at rest and consume them transactionally.
- Invalidate existing sessions after password resets.
- Plan MFA or passkey support.

### 7. Redact logs and genericize client errors

Introduce structured logging with automatic redaction for email addresses,
tokens, authorization headers, journal text, task titles, and AI prompts. Never
return database messages or stack traces to clients.

### 8. Add browser security headers

- Deploy Content Security Policy in report-only mode before enforcement.
- Add HSTS, `X-Content-Type-Options`, `Referrer-Policy`, and
  `Permissions-Policy`.
- Configure CSP `frame-ancestors` for the intentional authentication iframe.
- Define and test a restrictive production CORS allowlist.

### 9. Harden iOS authentication WebView and API origin checks

Status: mobile-side origin/path enforcement, iframe source validation, and token
response validation implemented on 2026-07-04. Bearer-token attachment now uses
exact parsed-origin matching, and persisted auth is schema-validated. The one-time
backend exchange is still pending.

- Compare parsed URL origins rather than string prefixes.
- Add a strict WebView origin allowlist and expected-path checks.
- Reject non-HTTPS navigation.
- Validate token response status and schema before persistence.
- Verify web messages using both `event.origin` and `event.source`.
- Move final JWT delivery to the one-time exchange described above.

### 10. Protect notification privacy

Status: implemented on 2026-07-04. Task names are hidden by default and can be
enabled explicitly per account on trusted devices.

Use generic lock-screen notification text by default or add an explicit setting
that allows users to show task names.

### 11. Reduce dependency exposure

The 2026-07-03 mobile production audit reported 285 findings: 3 critical, 134
high, 42 moderate, and 106 low. Verify exploitability, but do not dismiss the
results solely because many are transitive.

- Determine whether the large `@anythingai/app` runtime dependency is necessary.
- Remove unused packages and dormant upload code.
- Move build-only tooling out of production dependencies.
- Upgrade Expo and React as a coordinated release.
- Add OSV/Bun/npm auditing, dependency review, and an exception file to CI.
- Generate a release SBOM.

## P2: defense in depth

- Replace hardcoded admin email addresses with database-backed roles.
- Add security audit records for login failures, resets, deletion, and admin use.
- Establish retention and deletion rules for journals, moods, analytics, and AI data.
- Add authorization tests for every API route.
- Add automated secret scanning.
- Document incident response and key rotation.
- Consider device intelligence only after foundational controls are complete and
  its privacy implications have been reviewed.

## Recommended implementation sequence

1. Centralized validation schemas and tests.
2. Distributed rate limits and AI quotas.
3. Transactional account deletion and analytics protection.
4. CSRF-safe mobile token exchange.
5. Error and log redaction.
6. Browser security headers and CORS tests.
7. iOS WebView and origin hardening.
8. Dependency cleanup and CI security gates.
9. MFA/passkeys, retention controls, and audit logging.

## Verification expectations

Every phase must include unit and integration tests, full web and mobile test
suites, web production compilation, and iOS compilation. Authentication changes
must also be tested on a physical iOS device to preserve the callback flow.
