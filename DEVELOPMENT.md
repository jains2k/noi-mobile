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

## Local notification verification

Local notifications must be tested in a development or production iOS build on
a physical device; Expo Go is not a sufficient release verification target.

1. Sign in and enable task and to-do reminders in Settings.
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
