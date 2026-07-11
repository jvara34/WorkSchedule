---
name: verify
description: Verify schedule-planner changes end-to-end in a real browser, including Firebase sync via local emulators.
---

# Verifying schedule-planner

Vite + React SPA (base `/WorkSchedule/`), backend is Firebase (Auth + Firestore) via `src/firebase.ts` / `src/persistence.ts`.

## Build

```bash
npm run build   # tsc -b && vite build; must pass
```

Note: `npx eslint src/` has a pre-existing failure in `AddShiftModal.tsx` (react-hooks/set-state-in-effect) — not a regression signal.

## Full-stack local run (no Firebase account needed)

Requires Java + `firebase` CLI (both installed on this machine).

1. In a temp dir, create `firebase.json` (auth port 9099, firestore port 8080, ui disabled) and a `firestore.rules` matching the production rules (see README/plan; pin the boss UID after creating the user).
2. `firebase emulators:start --only auth,firestore --project demo-asua` (background). Rules file hot-reloads on edit.
3. Create the boss user (auth emulator is in-memory, redo after every restart):
   ```bash
   curl -s "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo" \
     -H 'Content-Type: application/json' \
     -d '{"email":"andrew@asua-schedule.app","password":"testpass123","returnSecureToken":true}'
   ```
   Grab `localId` from the response and substitute it into `firestore.rules`.
   Gotcha: `UID` is a read-only zsh variable — name the shell var something else.
4. `VITE_USE_EMULATORS=1 npm run dev` — `src/firebase.ts` connects to the emulators only when this env var is set (and only in dev). App serves at `http://localhost:5173/WorkSchedule/` (curl `localhost`, not `127.0.0.1`).

## Drive it

Playwright browsers are cached at `~/Library/Caches/ms-playwright/` (headless shell at `chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell`). `npm install playwright-core` in a scratch dir and launch with `executablePath` — no browser download needed.

Two-context test (separate localStorage = boss device vs viewer device):
- Boss: click `text=Boss Login`, fill `.modal .form-input` nth(0)=`Andrew` nth(1)=password, click `.modal .btn-primary`. Wait for `text=Manage Roster`.
- Add shift: `.day-column` nth(N) → `text=+ Add Worker` → `selectOption('.modal select', '__custom__')` → fill `input[placeholder="Worker name"]` → `.modal .btn-primary`.
- Viewer context: shift text should appear without reload (live sync); `.sync-badge` should read `Live`; `.add-btn` count must be 0.
- Rules probe via REST on the firestore emulator: anonymous GET of `/v1/projects/demo-asua/databases/(default)/documents/appState/schedule_a` → 200; anonymous PATCH → 403 PERMISSION_DENIED.

Auto-accept dialogs (`page.on('dialog')`) — the seed-migration `window.confirm` fires when the boss logs in on a device whose localStorage has data while the server is empty.
