# VoiceDesk Eval Console: design

## Problem

VoiceDesk runs automated evals of three AI phone agents (dental front desk, storage receptionist,
plumbing revenue recovery). Each run simulates callers k times per scenario, scores every call with
code checks and an LLM judge, and compares the result with a saved baseline. The results are
published as one JSON snapshot (`evals/results/published.json`, written by `evals/publish.py`).

The existing `/evals` page in VoiceDesk is server-rendered and tied to the Python app. This console
is a separate, static front end over the same snapshot, so the eval data can be read, filtered and
linked without running the backend.

## Users and the questions they ask

| User                                  | Question                                                                                | Where it is answered                                |
| ------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Agent developer after a prompt change | Did anything get worse than the baseline?                                               | Baseline comparison, regressions first              |
| Same developer, next step             | Why did this scenario fail?                                                             | Scenario detail: failing turn, checks, judge reason |
| Reviewer or client                    | How good is the agent overall, and is it trending up?                                   | Runs list with pass rate and containment            |
| Anyone sharing a finding              | Can I send a link to exactly this view?                                                 | Filters live in the URL                             |
| Security reviewer                     | Did any agent leak a prompt or another customer's data, or act outside its permissions? | Security view, verdict per agent                    |

## Component tree

```
main.tsx            QueryClientProvider, BrowserRouter
└─ App              routes
   └─ Layout        header with environment badge, <main>
      ├─ RunsPage        /                                   runs list + agent filter
      ├─ RunPage         /runs/:runId                        scenario table + agent/status filters
      ├─ ComparePage     /runs/:runId/compare                per-agent changes vs baseline
      ├─ SecurityPage    /runs/:runId/security               per-agent security table, OWASP scenarios
      └─ ScenarioPage    /runs/:runId/:agent/:scenarioId     attempts, checks, transcript
         shared: SnapshotBoundary (loading/error), FilterBar, TableScroll, AttemptTabs,
                 ChecksTable, Transcript, OwaspIds, RunNotFound
```

## Data flow

```
VITE_EVALS_URL ──fetch──▶ fetchSnapshot (validates shape) ──▶ TanStack Query cache ['snapshot', url]
                                                                   │
          URL (path params + ?agent=&status=) ──▶ pure selectors in src/lib/selectors.ts
                                                                   │
                                                             page components (render only)
```

- One request loads the whole snapshot (about 0.6 MB, 2 runs of history plus the latest full run).
  Every page derives its view from it, so navigating between pages never refetches.
- All derivation lives in pure functions (`runRows`, `scenarioRows`, `firstFailure`,
  `failingTurn`, `comparisonRows`, `parseFilters`). They are unit-tested without React, and
  `firstFailure` mirrors VoiceDesk's own `_first_failure` so both UIs point at the same check.
- Pages are thin: `SnapshotBoundary` handles pending and error once, then hands the data to a view.

## Security track

VoiceDesk's security evals (OWASP Top 10 for LLM Applications 2025) add fields to the same snapshot.
Nothing existing changed shape, so the console kept working and the new view is purely additive.

- **Per agent:** `security_calls`, `injection_resistance_rate`, `prompt_leaks`, `pii_leaks`,
  `unauthorized_tool_calls`, `criticals`. Runs from before the track have none of them, and the
  console says "predates the security track" instead of showing zeros that were never measured.
- **Verdict** uses the live `/evals` page's rules: any critical, else "no leak, N% gave way" when
  resistance is under 100%, else "held".
- **Critical everywhere.** A prompt leak, cross-customer PII leak or unauthorized tool call counts
  as a critical failure next to a missed handoff: in the runs list, the `critical` filter, the
  scenario sort order and the first failure shown (security criticals first, as in VoiceDesk).
- **OWASP ids** come from each result's `scenario_def.owasp`, shown as badges with a legend.
- **Filter:** `track=security` in the URL narrows the existing scenario list, so security transcripts
  reuse the same detail page.

## State management choices

| State                          | Where it lives                         | Why                                                                                                      |
| ------------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Server data (the snapshot)     | TanStack Query                         | Caching, loading/error flags, retry and refetch for free. No hand-written `useEffect` fetching.          |
| Filters (agent, status, track) | URL query string via `useSearchParams` | Shareable links, back button works, survives reload. Unknown values are dropped so old links still load. |
| Selected run and scenario      | URL path params                        | Same reasons; every view has an address.                                                                 |
| Selected attempt tab           | Local `useState`                       | Purely visual and short-lived.                                                                           |

No global store (Redux, Zustand) is used: once server state is in Query and navigation state is in
the URL, nothing is left that more than one component needs to share.

## Testing strategy

Built test-first. Each feature is a `test:` commit that fails, then a `feat:` commit that makes it
pass, then an optional `refactor:` commit with the tests still green.

| Layer                | Tool                                        | What it covers                                                                                                          |
| -------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Pure logic           | Vitest                                      | Selectors and formatting, including edge cases (no calls, unknown filters, `[critical]` tags)                           |
| Components and pages | Vitest + React Testing Library + MSW        | Behaviour as a user sees it: queries by role and label, real router and Query client, network mocked at the fetch level |
| End to end           | Playwright on `vite build` + `vite preview` | Real browser, desktop and Pixel 7 viewports, light and dark mode, keyboard navigation, no horizontal overflow           |
| Accessibility        | `@axe-core/playwright`                      | WCAG 2.1 A and AA rules on every page in the e2e suite                                                                  |

The unit tests use a small hand-made fixture that contains a regression and a missed handoff,
because the real snapshot currently has neither. The e2e tests use a frozen copy of the real
snapshot (`public/fixtures/published.json`) so they are deterministic.

CI enforces an 85% line-coverage minimum.

## Environments

| Environment | Trigger                                  | `VITE_APP_ENV` | `VITE_EVALS_URL`                               |
| ----------- | ---------------------------------------- | -------------- | ---------------------------------------------- |
| development | `npm run dev`                            | development    | `/fixtures/published.json`                     |
| CI          | GitHub Actions on every PR               | ci             | `/fixtures/published.json`                     |
| staging     | Vercel Preview deployment for every PR   | staging        | `/fixtures/published.json`                     |
| production  | Vercel Production deployment from `main` | production     | raw GitHub URL of VoiceDesk's `published.json` |

The header badge shows which environment a page came from. Staging uses the frozen fixture so a
reviewer sees the PR's UI change against known data; production reads the snapshot VoiceDesk
actually publishes.

## Trade-offs

- **Read the committed snapshot, not the live API.** VoiceDesk's `/evals/data` returns a
  page-shaped view (not the snapshot), sends no CORS headers, and runs on a free Render instance
  that sleeps. The snapshot on `raw.githubusercontent.com` is the exact published shape, allows any
  origin and is always up. Cost: new results appear only after `--publish` commits the snapshot,
  and GitHub's CDN caches for about 5 minutes. Benefit: no change to the VoiceDesk repo.
- **One big request instead of paginated endpoints.** Simple and fast at about 1.3 MB (0.6 MB before
  the security track roughly doubled the transcripts). If history grew
  to hundreds of runs, the next step would be a per-run endpoint and a Query key per run.
- **Transcripts only for the latest run per model.** That is how VoiceDesk keeps the snapshot
  small. Older runs show summary numbers and an explicit message instead of a blank page.
- **Tables scroll horizontally on phones** instead of turning into stacked cards. Stacked cards
  through CSS can strip table semantics for screen readers; a focusable, labelled scroll region
  keeps them and passes axe.
- **No component library.** The UI is small, and hand-written CSS with design tokens keeps the
  bundle light and the contrast fully under control (axe caught and drove the token values).
- **React 18 and React Router 6**, as requested, rather than the newest majors.
