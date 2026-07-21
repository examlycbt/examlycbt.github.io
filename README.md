# CBT Practice Platform

A fully client-side computer-based-test (CBT) practice tool. Upload a Markdown
question bank, configure a test (topics, timer, marking scheme), take it under
practice or exam conditions, and review a scored, subject-wise report — all
persisted to the browser's `localStorage`, with no backend and no build step.

Plain ES modules only. No framework, no bundler. Open `index.html` via any
static server (or directly in a browser that allows `file://` module imports)
and it runs.

## Project Structure

```
cbt-platform/
├── index.html                 # Shell only: page containers + <link>/<script type="module"> refs
├── README.md
└── src/
    ├── styles/                 # One stylesheet per page/concern, all linked in index.html
    │   ├── base.css             # :root variables, resets, shared primitives (buttons, cards,
    │   │                        #   pills, inputs, toast) used by every page
    │   ├── theme-light.css      # Light-theme variable overrides
    │   ├── landing.css
    │   ├── config.css
    │   ├── test.css
    │   ├── summary.css
    │   ├── score.css
    │   └── report-modal.css
    │
    ├── storage/
    │   ├── keys.js               # localStorage key name constants
    │   └── local-storage.js      # lsGet/lsSet JSON wrappers around localStorage
    │
    ├── parsing/
    │   ├── md-parser.js          # Raw .md bank text -> field-labelled records
    │   ├── question-extractor.js # Records -> auto-gradable Question objects (MCQ/numeric)
    │   └── formatter.js          # escapeHtml + convertMath (superscript/subscript/fraction rendering)
    │
    ├── state/
    │   └── store.js              # The single global STATE object + uid()
    │
    ├── domain/                   # Pure(ish) business logic — no DOM access
    │   ├── bank-manager.js       # Save / get / delete / list question banks
    │   ├── topic-tree.js         # Subject/topic grouping, selection, and ordering
    │   ├── marking-scheme.js     # questionMarks() — positive/negative marks per question
    │   ├── scoring.js            # numericMatches(), computeScore()
    │   ├── attempt.js            # Attempt/response-state creation, paletteState()
    │   ├── timers.js             # Countdown + per-question stopwatch, formatTime()
    │   └── reports.js            # Question-issue report categories, creation, persistence
    │
    └── ui/                        # Rendering + DOM event wiring
        ├── toast.js
        ├── theme.js               # applyTheme / toggleTheme
        ├── ui-prefs.js            # Collapsible qstrip/side-panel + mobile drawer
        ├── router.js              # showPage / goLanding / exitTest
        ├── pages/
        │   ├── landing-page.js    # Upload bank, saved banks, past attempts
        │   ├── config-page.js     # Topic tree, mode, timer, marking scheme, Start Test
        │   ├── test-page.js       # Question card, qstrip, palette, timers, submit
        │   ├── summary-page.js    # Subject-wise results table
        │   └── score-page.js      # Score donut, stats, question review, report download
        ├── components/
        │   └── report-modal.js    # "Report an issue with this question" modal
        └── main.js                 # App bootstrap (see Startup below)
```

> **Note:** `main.js` currently lives at `src/main.js` (not under `src/ui/`).
> Confirm `index.html`'s `<script type="module" src="...">` path matches
> wherever the file actually ends up before shipping.

## Architecture Layers

- **`storage/`** — the only code that touches `localStorage` directly.
  Everything else goes through `lsGet`/`lsSet`.
- **`parsing/`** — turns bank text into data. No DOM, no `STATE`.
- **`state/`** — one exported `STATE` object, imported by reference everywhere
  it's needed. This is a deliberate **global mutable singleton**, not a
  reactive store: modules read and write `STATE` directly, and the UI
  re-renders explicitly (by calling a `render*()` function) rather than
  reacting to state changes automatically. There is no subscription/observer
  layer — keep it that way when extending the app.
- **`domain/`** — business rules (marking, scoring, timers, topic ordering,
  attempt/report construction). These modules avoid `document.*` calls where
  practical; where a domain concern genuinely needs to hand data back to a
  page for rendering (e.g. the timer countdown), it does so via callbacks
  passed in by the caller rather than touching the DOM itself.
- **`ui/`** — everything that reads from or writes to the DOM. Each page
  module exports a `render*()` function (build/update the DOM for that page)
  and an `init*Page()` function (attach event listeners once, at startup).

### Event handling convention

Static, render-once elements (topbar icons, footer buttons, back arrows) get
a direct `addEventListener` call inside each page's `init*Page()`.

Elements that are regenerated on every render (question options, palette
cells, qstrip cells, topic rows, review accordion items, bank/history rows)
use **event delegation**: one listener on the stable parent container,
reading `data-action` / `data-*` attributes and `closest()` to dispatch —
instead of re-attaching a listener to every regenerated child.

## Data Flow

1. **Landing** (`landing-page.js`) — user uploads a `.md` file. `md-parser.js`
   parses it into records; `question-extractor.js` filters those down to
   auto-gradable MCQ/numeric questions. The result is saved as a **Bank**
   (`bank-manager.js`) and the user is sent to Config.
2. **Config** (`config-page.js`) — user picks topics/subjects, question count,
   shuffle, timer, and marking scheme. `topic-tree.js` handles grouping,
   selection, and topic ordering. On "Start Test", `attempt.js`'s
   `createAttempt()` builds the **Attempt** (final question set + initial
   per-question **ResponseState** for each) and it's stored on
   `STATE.attempt` and in `localStorage` (`LS_ACTIVE`), so an in-progress
   test survives a page reload.
3. **Test** (`test-page.js`) — renders one question at a time. Every answer,
   navigation, or review-flag change mutates `STATE.attempt.responses[qid]`
   directly and re-persists via `LS_ACTIVE`. `timers.js` drives the total
   countdown and per-question stopwatch through callbacks wired by the page.
4. **Submit** — `scoring.js`'s `computeScore()` finalizes any un-checked
   responses, tallies marks (via `marking-scheme.js`), and produces a
   **Score**. The finished Attempt (now including `score`) is pushed onto
   `STATE.history` and persisted (`LS_HISTORY`); `LS_ACTIVE` is cleared.
5. **Summary → Score** (`summary-page.js`, `score-page.js`) — read the
   finished Attempt from `STATE.attempt` to render a subject-wise table, a
   score donut, and a per-question review accordion. The score page can
   export a Markdown report or jump back to Config to retake the same bank.

Past attempts remain browsable from the Landing page's history list, which
re-renders Summary/Score from the stored Attempt without needing the timer or
live-test machinery.

## Data Model

| Type | Shape (key fields) |
|---|---|
| **Bank** | `savedAt, count, questions[], raw` |
| **Question** | `qid, subject, topic, difficulty, marks, question, kind ('mcq'|'numeric'), options[], correctLetter, correctNumeric, solution` |
| **Attempt** | `id, bankName, config, questions[], responses{qid→ResponseState}, currentIndex, startedAt, finishedAt, totalSecondsRemaining, score` |
| **ResponseState** | `status, selected, numericInput, checked, review, timeSpentSec, firstSeenAt, lastSeenAt, answeredAt` |
| **Config** | `mode, markMode, flatMarks, negMode, negFlat, negByDiff, timerEnabled, timerMinutes, shuffleO, shuffleQ` |
| **Score** | `obtained, max, correct, wrong, unattempted, total, accuracy` |
| **Report** | `id, bankName, qid, questionNo, topic, category, categoryLabel, details, createdAt` |

## Storage

All persistence is `localStorage`, JSON-encoded via `lsGet`/`lsSet`
(`storage/local-storage.js`), under the keys defined in `storage/keys.js`:

| Key | Holds |
|---|---|
| `cbt_banks_v1` | All saved question banks, keyed by name |
| `cbt_history_v1` | Array of completed Attempts |
| `cbt_active_v1` | The in-progress Attempt (if any), for resume-on-reload |
| `cbt_theme_v1` | `'dark'` or `'light'` |
| `cbt_uiprefs_v1` | Qstrip/side-panel open state |
| `cbt_reports_v1` | Array of submitted question-issue Reports |

There is no server sync — everything is scoped to the browser/device.

## Startup

1. `index.html` loads the page-shell markup and its stylesheets, then loads
   `main.js` as an ES module (`<script type="module">`).
2. `main.js` hydrates `STATE` from every `localStorage` key above and applies
   the saved theme.
3. It calls each page/component's `init*Page()` / `initReportModal()` once,
   wiring all static event listeners for the app's lifetime.
4. It renders the Landing page's bank/history lists.
5. If an in-progress Attempt was found in `LS_ACTIVE`, it's restored onto
   `STATE`, a "resuming" toast is shown, and the app jumps straight to the
   Test page instead of Landing.

No other bootstrap step exists — there's no router guard, no data fetch; the
whole app is ready as soon as `main.js` finishes running synchronously.
