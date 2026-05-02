# noi — Developer Setup Guide

This document gives Claude Code (or a new developer) full context to set up and continue development on the noi app on a new machine.

---

## Overview

noi is a personal wellness app (tasks, mood, journal, focus). It has three parts:

| Part | Repo | Deployed at |
|------|------|-------------|
| Mobile (iOS/Android) | `github.com/jains2k/noi-mobile` | App Store / TestFlight |
| Web frontend + backend | `github.com/jains2k/noi-web` | `https://noi-web.fly.dev` |
| Database | Neon Postgres (hosted) | `ep-proud-block-amepdrhd.c-5.us-east-1.aws.neon.tech` |

The web app IS the backend — it's a React Router v7 (Vite) app deployed on Fly.io that serves both the web UI and the API routes (`/api/*`). The mobile app talks to it via `EXPO_PUBLIC_PROXY_BASE_URL`.

---

## Tech Stack

**Mobile** (`noi-mobile`):
- React Native 0.81.4 + Expo 54
- Expo Router 6 (file-based routing, `src/app/`)
- Zustand (auth store), TanStack React Query (server data)
- NativeWind (Tailwind for RN), Reanimated 4 + Moti
- EAS Build + EAS Submit for iOS distribution

**Web/Backend** (`noi-web`):
- React Router v7 (framework mode, Vite bundler)
- Bun runtime
- Auth.js v5 (`@auth/create/react`) for session management
- Neon Postgres via `@neondatabase/serverless`
- Tailwind CSS
- Deployed on Fly.io

---

## Prerequisites (Windows)

Install these in order:

```
1. Node.js LTS (https://nodejs.org) — v20+
2. Bun (https://bun.sh) — used by the web app
3. Git (https://git-scm.com)
4. EAS CLI: npm install -g eas-cli
5. Expo CLI: npm install -g expo (optional, npx expo works too)
6. VS Code or your editor of choice
```

For mobile development on Windows, you can only build for Android locally. iOS builds require EAS cloud (no Mac needed).

---

## Clone the repos

```bash
git clone git@github.com:jains2k/noi-web.git
git clone git@github.com:jains2k/noi-mobile.git
```

Or via HTTPS if SSH isn't set up:
```bash
git clone https://github.com/jains2k/noi-web.git
git clone https://github.com/jains2k/noi-mobile.git
```

---

## Web App Setup (`noi-web`)

### 1. Install dependencies
```bash
cd noi-web
bun install
```

### 2. Create `.env` file
```env
# Database (Neon Postgres)
DATABASE_URL=postgresql://neondb_owner:<password>@ep-proud-block-amepdrhd.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require

# Auth.js
AUTH_SECRET=<get from existing .env or generate: openssl rand -base64 32>
AUTH_URL=http://localhost:3000

# (Optional) Gemini AI
GEMINI_API_KEY=
```

> Get the actual `DATABASE_URL` and `AUTH_SECRET` values from the existing deployed environment on Fly.io:
> ```bash
> fly secrets list -a noi-web
> fly ssh console -a noi-web -C "env | grep DATABASE_URL"
> ```

### 3. Run locally
```bash
bun run dev
# Runs on http://localhost:3000
```

### 4. Deploy to Fly.io
```bash
fly deploy
# Always run this after pushing web changes — deploys to https://noi-web.fly.dev
```

---

## Mobile App Setup (`noi-mobile`)

### 1. Install dependencies
```bash
cd noi-mobile
npm install
```

### 2. The `.env` file
`.env` is gitignored. Create it:
```env
EXPO_PUBLIC_APP_URL=https://noi-web.fly.dev
EXPO_PUBLIC_BASE_CREATE_USER_CONTENT_URL=https://raw.createusercontent.com
EXPO_PUBLIC_BASE_URL=https://noi-web.fly.dev
EXPO_PUBLIC_PROXY_BASE_URL=https://noi-web.fly.dev
EXPO_PUBLIC_CREATE_ENV=PRODUCTION
EXPO_PUBLIC_HOST=noi-web.fly.dev
EXPO_PUBLIC_PROJECT_GROUP_ID=noi-app
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY=
```

### 3. Run locally
```bash
npx expo start          # Pick iOS/Android/Web
npx expo start --web    # Web only (works on Windows)
```

For Android on Windows: install Android Studio, set up an emulator, then `npx expo run:android`.

### 4. EAS Build (cloud iOS builds — no Mac needed)
```bash
eas login               # Account: tvishaj08
eas build --platform ios --profile production --non-interactive
```

### 5. Submit to App Store
```bash
eas submit --platform ios --latest --non-interactive
# ASC App ID 6761880452 is already in eas.json
```

---

## Key App Store / EAS Config

| Item | Value |
|------|-------|
| Expo account | `tvishaj08` |
| EAS project ID | `5193d01d-d4b4-492f-9024-a9b18a0f2d4f` |
| iOS bundle ID | `com.createinc.c73300dd5f5e4b5ea4a559f9ecd813e4` |
| App Store Connect App ID | `6761880452` (app name: "noi (cf4a3d)") |
| App Store Connect API Key ID | `RTWYH9RQL7` (stored in EAS servers) |
| ASC Issuer ID | `5e613df1-781f-404b-ad9f-50eee889e0c2` |
| ASC API Key file | `AuthKey_RTWYH9RQL7.p8` (keep this safe — needed for new machines) |

---

## Architecture Notes

- **Auth flow (mobile)**: JWT stored in Expo SecureStore via `useAuthStore` (Zustand). Login happens in a WebView pointing to `https://noi-web.fly.dev/account/signin`. Token auto-injected into all API calls via `src/__create/fetch.ts`.
- **Auth flow (web)**: Auth.js v5 session cookies. `auth_accounts` table uses camelCase `"userId"` (Auth.js convention, not `user_id`).
- **Delete account**: `DELETE /api/user/delete` — deletes from 7 tables in order, then client calls `signOut()`.
- **Theming**: 6 color presets + 5 fonts, persisted server-side at `/api/user/settings`.
- **Deployment**: web app deploys to Fly.io (`fly deploy` from `noi-web/`). Mobile uses EAS cloud builds.
- **Web bundler**: Metro (not webpack). Platform polyfills in `polyfills/` handle native-only modules for web.
- **`appVersionSource`**: set to `"local"` in `eas.json` — iOS build number comes from `app.json` `ios.buildNumber`.

---

## Current Status (as of 2026-04-30)

- Web app: live at `https://noi-web.fly.dev` ✓
- iOS app: submitted to App Store under "noi (cf4a3d)", build 23, pending review
- Last rejection reason: support URL didn't have a real support page → **TODO: build `/support` page**
- Delete account: fixed and working on both web and mobile ✓
- Sign-in error handling: fixed ✓

## Pending TODO

1. **Build `/support` page** on web app — add FAQ, "report an issue" link to GitHub issues
2. **Add "Help & Support" link** in mobile Settings screen pointing to `https://noi-web.fly.dev/support`
3. Update App Store Connect support URL to `https://noi-web.fly.dev/support`
4. Resubmit for App Store review after support page is live
