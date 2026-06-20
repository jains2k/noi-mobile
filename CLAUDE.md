# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Cross-Platform Requirement (must read)

**Every change must work on BOTH iOS and web.** This app ships from a single codebase that runs natively on iOS and as React Native Web via the Metro bundler (`npx expo start --web`), so "web" means the React Native Web build of this app — not the separate `apps/web` Next.js app. (There is no Android app yet — the stack supports it, but it isn't built or targeted, so don't treat Android as a required verification target.)

Rules:
- Prefer cross-platform APIs. Don't use a native-only module (e.g. `expo-secure-store`, `react-native-webview`, `react-native-maps`) unless it has a web alias in `metro.config.js` → `polyfills/web/`. If you introduce a native-only dependency, add a matching `polyfills/web/*.web.*` shim and wire it into `WEB_ALIASES`.
- After any change, verify both bundles compile:
  - `npx expo export --platform ios --output-dir /private/tmp/noi-mobile-export`
  - `npx expo export --platform web --output-dir /private/tmp/noi-web-export`
- Shared logic (auth store, `src/__create/fetch.ts`, routing in `src/app/`) runs identically on every platform — changes there automatically apply to web, so test the web build too.

## Tech Stack

- **Framework**: React Native 0.81.4 + Expo 54
- **Routing**: Expo Router 6 (file-based, typed routes, `@/*` → `./src/*`)
- **State**: Zustand (auth + modals), TanStack React Query (server data), React Context (theming)
- **Styling**: Tailwind CSS via NativeWind + React Native StyleSheet; Reanimated 4 + Moti for animations
- **Platforms**: iOS and Web (React Native Web via Metro bundler). Android is not built/targeted yet, though the RN stack supports adding it later.

## Development Commands

Use the npm scripts for repeatable local checks and Expo CLI for device builds:

```bash
npx expo start              # Start dev server (choose iOS/Android/Web)
npx expo start --dev-client --clear # Start Metro for the native development build
npx expo start --web        # Web only
npx expo run:ios            # Build and run on iOS simulator
npx expo run:android        # Build and run on Android emulator
npm test                    # Run Jest tests
npx expo export --platform ios --output-dir /private/tmp/noi-mobile-export # Verify iOS JS bundle compiles
eas build --platform ios    # EAS cloud build for iOS
eas build --platform android # EAS cloud build for Android
```

Environment variables are in `.env` — key ones:
- `EXPO_PUBLIC_PROXY_BASE_URL` — API base URL
- `EXPO_PUBLIC_APP_URL` — App URL for OAuth redirects

## Architecture

### File-based Routing (`src/app/`)

All screens live in `src/app/`. The root layout (`_layout.jsx`) wraps the entire app with:
1. QueryClient provider (React Query)
2. ThemeProvider (fetches user settings from `/api/user/settings`)
3. Auth initialization (loads JWT from Expo Secure Store)

`index.jsx` redirects to `/landing` (unauthenticated) or `/dashboard` (authenticated).

### Authentication Flow

- JWT stored in Expo Secure Store via `useAuthStore` (Zustand, `src/utils/auth/store.js`)
- `isReady` flag gates rendering until token is loaded from storage
- OAuth/login happens inside `AuthWebView.jsx` (a WebView pointing to the backend's `/account/signin` or `/account/signup`)
- All API requests auto-include `Authorization: Bearer <token>` via the fetch interceptor at `src/__create/fetch.ts`

### API Pattern

All calls go through `EXPO_PUBLIC_PROXY_BASE_URL`. The fetch interceptor (`src/__create/fetch.ts`) auto-injects:
- `Authorization: Bearer <jwt>`
- `x-createxyz-project-group-id`
- `x-forwarded-host`

React Query query keys: `["tasks"]`, `["moods"]`, `["settings"]`, `["user"]`. Mutations call `queryClient.invalidateQueries()` to refresh.

### Theming

`ThemeProvider` (`src/utils/ThemeProvider.jsx`) provides theme colors and font family via `useTheme()`. 6 presets: lavender, ocean, sage, rose, citrus, mint. 5 fonts: Fredoka, Inter, Quicksand, Lexend, SpaceMono. Settings persisted server-side at `/api/user/settings`.

### Platform-specific Code

`metro.config.js` resolves platform-specific polyfills from `polyfills/`. Web builds alias native-only modules (SecureStore → AsyncStorage, MapView → null, etc.) so the same codebase runs on all platforms.

### Shell Component

`src/components/Shell.jsx` is the main layout wrapper used by all authenticated screens — provides safe top spacing, a floating navigation menu button, modal navigation, and bottom padding. It depends on the root `SafeAreaProvider` in `src/app/_layout.jsx` and uses `src/utils/safeArea.js` to keep authenticated content below the iOS status bar/notch even when native insets briefly report `0`.

`src/utils/diagnostics.js` contains temporary visible runtime labels used to confirm that the simulator is loading the current JS bundle while investigating native/development-build cache issues.

## Key Directories

- `src/app/` — Screens (Expo Router file-based routing)
- `src/components/` — Shared UI components
- `src/utils/auth/` — Auth store, hooks, WebView, protected routes
- `src/utils/` — ThemeProvider, misc hooks
- `src/__create/` — Framework internals: fetch interceptor, error boundaries, logging
- `polyfills/` — Platform-specific polyfills (native/, web/, shared/)
- `patches/` — patch-package patches applied on `postinstall`
