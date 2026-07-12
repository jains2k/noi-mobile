# Mobile development

## Prerequisites

- Node.js and npm
- Xcode with an installed iOS simulator runtime
- CocoaPods for native iOS dependency changes

This project supports iOS and web. There is currently no supported Android app.

## Install and run

```bash
npm install
npm run ios
```

Run the web build with Expo:

```bash
npx expo start --web
```

## Tests and build checks

Run the complete unit and integration test suite:

```bash
npm test -- --watch=false
```

Verify that the web bundle compiles:

```bash
npx expo export --platform web --output-dir /tmp/noi-mobile-web
```

Verify the native iOS project after dependency or Expo configuration changes:

```bash
npx expo run:ios
```

## Scheduling picker visual checks

`SchedulePicker` is shared by Tasks and Calendar. On iOS, native picker wheels do
not consistently inherit text color from the surrounding React Native view, so
month/day/time item text is explicitly styled for contrast. After changing picker
layout or theme styling, test the expanded date and time wheels on iPhone 13/16
simulators across each color theme and run
`src/components/__tests__/SchedulePicker.test.js`.

## Modal and task-row visual checks

Bottom sheets must dismiss from the explicit close/cancel action, a tap on the
backdrop, and an intentional downward drag on the handle. The shared gesture
threshold lives in `src/utils/bottomSheetGestures.js`; run
`src/utils/__tests__/bottomSheetGestures.test.js` after changing sheet behavior.

Long task titles should wrap inside their row without pushing completion,
edit, or delete actions off-screen. Manually verify dashboard active tasks,
Tasks list rows, and Calendar selected-day rows on narrow iPhone simulators.

Compact energy selectors use single-line, scale-to-fit labels. Verify the
`medium` option does not wrap in the task editor, calendar add-task modal, or
dashboard energy selector on narrow iPhone simulators.

## TestFlight release

Increment both `expo.version` and `expo.ios.buildNumber` in `app.json`, then run
the complete tests and iOS/web exports before creating a production build:

```bash
npx eas build --platform ios --profile production --auto-submit --non-interactive
```

The production submit profile targets App Store Connect app `6761880452`.

## Local notification verification

Local notifications must be tested in a development or production iOS build on
a physical device; Expo Go is not a sufficient release verification target.

1. Sign in and enable task and planning reminders in Settings.
2. Tap **send test notification**, background Noi, and confirm the test appears
   after approximately eight seconds. If iOS has previously denied permission,
   use the app's **open settings** action or erase the simulator app first.
3. Create a task several minutes in the future and confirm one reminder is
   listed by the native scheduler.
4. Edit, complete, and delete scheduled tasks and confirm obsolete reminders
   are removed.
5. Disable both reminder types and confirm all Noi-owned reminders are removed.
6. Put the app in the background, receive a reminder, and confirm tapping it
   opens the task list.
7. On a planning reminder, choose **Snooze** and confirm the next configured
   planning reminder remains scheduled. Choose **Done for today** and confirm
   the remaining reminders for that day are cancelled while tomorrow remains.
8. Force-quit and reopen the app from a notification to verify cold-start
   routing.
9. Sign out and confirm the signed-out user's reminders are removed.
10. Change notification permission in iOS Settings, return to Noi, and verify
   the displayed permission state updates.

Web reminders are in-session toast timers. They do not survive closing or
reloading the browser tab.

Task names are hidden from notification bodies by default to protect lock-screen
privacy. Enable **show task names** in Settings only on a trusted device.

## Authentication security checks

The native authentication WebView permits only HTTPS navigation on the configured
application and proxy origins, limited to account and authentication paths. Token
responses must return a successful HTTP status and a valid JWT/user payload. The
web iframe bridge additionally verifies both the message origin and source window.
Run `src/utils/auth/__tests__/authSecurity.test.js` after changing this contract.
The regression cases cover valid sign-in URLs, origin-confusion attempts, encoded
path separators, iframe source spoofing, malformed token payloads, preference
migration, and privacy-driven notification replacement.

Authenticated API requests use exact parsed-origin matching before reading or
attaching a bearer token. Relative API paths are resolved only against a configured
HTTPS base URL; protocol-relative, insecure, malformed, and lookalike-host URLs are
treated as external. Persisted auth is schema-validated whenever it is loaded.
