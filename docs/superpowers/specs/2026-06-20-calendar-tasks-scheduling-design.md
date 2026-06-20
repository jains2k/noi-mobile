# Calendar & Tasks Scheduling Improvements — Design

Date: 2026-06-20

## Goal

Make scheduling tasks to a date/time easy and consistent across the app, and
declutter the Calendar tab. Every place a task is created should be able to set
a date (default = today) and an optional time. Must work on both iOS and web
(React Native Web) per the cross-platform requirement.

## Data model (no backend change)

Tasks already carry `due_date` (calendar day) and `planned_at` (date + time for
the planner). Scheduling maps to these:

- **Scheduled, no time** → `due_date` = chosen day, `planned_at` = null →
  appears on the month grid only.
- **Scheduled, with time** → `due_date` = chosen day, `planned_at` = day+time →
  appears on the grid **and** in the planner slot.
- **Not scheduled** → both null → backlog only.

## Shared component: `SchedulePicker`

New small component built on `@react-native-picker/picker` (already a
dependency; ships its own web build → wheel on iOS, `<select>` on web).

- **Date picker**: options from today → +365 days. Always includes the task's
  current `due_date` even if in the past (edit case). Labels: "Today",
  "Tomorrow", then `EEE, MMM d`.
- **Time picker**: "No specific time" + 30-minute increments
  (12:00am–11:30pm), value = hour/minute applied to the chosen date.

Used by both the Tasks add/edit modal and the Calendar add-task modal so the
scheduling UX is identical everywhere.

## Changes by screen

### 1. Dashboard (`src/app/dashboard.jsx`)
Remove the "view all" text in the Active Tasks header — all tasks are already
visible.

### 2 & 3. Tasks tab (`src/app/tasks.jsx`)
Add an **"Add to calendar"** toggle in the add/edit modal:
- Off by default for new tasks. Auto-on when editing a task that already has a
  `due_date`/`planned_at`.
- When on, reveal `SchedulePicker` (date defaults to today, time optional).
- Submit maps form → `due_date`/`planned_at` per the rules above; when off, both
  are cleared (null) on update.

### 3 & 4. Calendar tab (`src/app/calendar.jsx`)
- Move the **"add task"** button out of the Selected-Day card to a prominent
  button near the top (below the month navigator). Opens the modal pre-set to
  `selectedDate`.
- Add a **time picker** to the calendar add-task modal (date = selected day,
  time optional). Replaces the implicit `prefillHour`-only behavior.
- **Remove** the per-slot "add task" / "add another" buttons in the planner —
  planner is now read-only, showing only scheduled tasks in their slots.
- Planner slot range = union of the default 9am–9pm window and any hour that has
  a scheduled task, so early/late tasks aren't hidden.

### 5. Calendar tab cleanup
- Remove the **Hide/Show daily planner** toggle; always render the planner.
- Remove the **Day Load legend** row. Keep the colored day-load shading on the
  grid cells (only the legend text is removed).

### 6. Calendar grid font sizes (`src/app/calendar.jsx`)
Increase small grid fonts for legibility, enlarging cells/badges as needed:
- day number 10 → 13
- weekday header labels 10 → 12
- in-cell task chip text 7 → 9
- "+N" overflow text 7 → 9
- active-count badge 8 → 10

## Verification

Per CLAUDE.md, confirm both bundles compile:
- `npx expo export --platform ios --output-dir /private/tmp/noi-mobile-export`
- `npx expo export --platform web --output-dir /private/tmp/noi-web-export`

Manually exercise: create scheduled task from Tasks (with/without time), confirm
it shows on the calendar grid and planner; create from Calendar top button with a
time; confirm planner shows early/late tasks; confirm legend/toggle removed and
grid fonts larger.
