# VoiceDesk Eval Console

A React + TypeScript front end for the eval results of [VoiceDesk](https://github.com/adelsherif8/voicedesk),
a set of AI phone agents. It lists every eval run, filters scenarios by agent and status, shows the
full call transcript with the failing turn highlighted, and compares each run with its baseline,
regressions first.

Built test-first: the git history shows a failing `test:` commit before every `feat:` commit.

- **Production:** _link added once Vercel is connected_
- **Staging:** every pull request gets its own Vercel preview URL

![Baseline comparison](docs/img/compare.png)

| Scenario detail                                                        | Phone                                       |
| ---------------------------------------------------------------------- | ------------------------------------------- |
| ![Transcript with the failing turn highlighted](docs/img/scenario.png) | ![Runs list on a phone](docs/img/phone.png) |

## Stack

Vite, React 18, TypeScript (strict), React Router, TanStack Query, Font Awesome.
Tests: Vitest, React Testing Library, MSW, Playwright, axe-core. ESLint and Prettier.

## Run it

```bash
npm install
npm run dev            # http://localhost:5173, reads the frozen fixture in public/fixtures
```

Copy `.env.example` to `.env.local` to point at another snapshot:

```bash
VITE_EVALS_URL=https://raw.githubusercontent.com/adelsherif8/voicedesk/master/evals/results/published.json
```

## Test it

```bash
npm test               # unit and component tests
npm run test:coverage  # same, fails under 85% line coverage
npx playwright install chromium
npm run build && npm run test:e2e   # e2e + axe on desktop and phone, light and dark
npm run lint && npm run typecheck && npm run format:check
```

## Deploy

| Environment | When                                  | Variables                                                          |
| ----------- | ------------------------------------- | ------------------------------------------------------------------ |
| Staging     | Vercel Preview, one per pull request  | `VITE_APP_ENV=staging`, `VITE_EVALS_URL=/fixtures/published.json`  |
| Production  | Vercel Production, on merge to `main` | `VITE_APP_ENV=production`, `VITE_EVALS_URL=<raw GitHub URL above>` |

Set these in Vercel under Project Settings, Environment Variables, scoped to Preview and
Production respectively. `vercel.json` rewrites deep links to `index.html` so routes like
`/runs/<id>/compare` load directly.

GitHub Actions (`.github/workflows/ci.yml`) runs on every PR: format, lint, type-check, unit tests
with coverage, then Playwright against a production build. Actions are pinned to commit SHAs.

## Docs

[docs/DESIGN.md](docs/DESIGN.md) covers the problem, users, component tree, data flow, state
choices, testing strategy, environments and trade-offs.
