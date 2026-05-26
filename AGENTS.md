# AGENTS.md — Operating notes for future agents

Hard-won lessons from real incidents. Read before changing AI plumbing, auth, or DB writes.

## Gemini / AI

- **Model deprecation is silent.** As of 2026-05, `gemini-1.5-flash` returns **404 NOT_FOUND** ("not supported for generateContent"), and `gemini-2.0-flash` returns **429 RESOURCE_EXHAUSTED with `limit: 0`** on `generate_content_free_tier_requests` even for a key labeled "Free tier" in AI Studio. Google retires models off the free tier without changing the UI label. **Current safe model: `gemini-2.5-flash`.**
- **The "Free tier" badge in AI Studio is not a guarantee.** Trust `fly logs`, not the AI Studio UI. If quota looks wrong, swap to the next-gen flash model before assuming the key/project is broken.
- **Always check `fly logs` first when an AI call appears to "succeed but do nothing".** The mobile fallback path in `magicSort` swallows the error and returns a single-task fallback, so a 429/404 looks identical to "AI returned 1 task." The only way to tell is logs.
- **Prompt-engineering trap: umbrella tasks.** When asking Gemini to split a brain dump into tasks, it will sometimes also emit the raw input as an extra "summary" task alongside the splits. The fix is an explicit no-umbrella rule + an example that mirrors the failure case. See `apps/web/src/app/api/utils/ai.js` `magicSort`.

## Auth & user IDs (multi-id minefield)

- **There are three different id namespaces floating around** for the same logical user, and confusing them silently writes to the wrong row or fails FK checks:
  - `auth_users.id` — the canonical identity. **All `*.user_id` FKs reference this.**
  - `users.id` — the separate app-settings table; **not** what FKs point at.
  - `session.user.id` — the id baked into the JWT. Can go stale (e.g. delete-account-and-recreate leaves the old session pointing at a now-deleted `auth_users.id`).
- **Never write `session.user.id` directly into a FK column.** Always go through `resolveUserId(session)` in `apps/web/src/app/api/utils/resolveUser.js`. It validates the session id against `auth_users` and, if stale, falls back to an email-gated recovery.
- **Recovery path is read-only and tightly gated** — well-formed email + exactly one `auth_users` match + at least one linked `auth_accounts` row. **It must never create users.** A past instinct to "just upsert the user" would let any authenticated session forge writes onto any email; don't do that.
- **`apps/web/src/auth.js` is system-managed — do not edit.** It has a warning comment at the top. Auth changes go in route handlers and utils.

## Neon serverless Postgres

- **Neon's tagged-template SQL rejects `undefined`.** A column with `undefined` in the INSERT throws and the whole request fails — often silently from the client's perspective because the catch returns a generic error. Always coalesce: `${field ?? null}` or `${field ?? defaultValue}`. See the `tasks` POST handler for the pattern.

## Mobile auth callback contract

- **`noi-web` signin/signup MUST honor `?callbackUrl=...`** or mobile auth silently breaks (AuthWebView modal never closes, native dashboard never renders). Already documented in memory but worth repeating here — if you touch the web auth pages, preserve this query param end-to-end.

## Deployment

- Web is on Fly. Always `fly deploy` from `apps/web/` after pushing — don't ask the user to do it.
- Build + test locally before deploying. Don't push incremental debug commits to diagnose crashes; use logs and local repros.

## Cross-platform

- Anything that runs in the app must work in both **React Native (iOS/Android)** and **React Native Web**. `metro.config.js` aliases native-only modules on web. If you add a native dependency, verify the web polyfill or alias.
