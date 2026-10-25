# VoiceDesk Eval Console

**Live:** https://voicedesk-console.vercel.app

A React + TypeScript front end for the eval results of [VoiceDesk](https://github.com/adelsherif8/voicedesk),
a set of AI phone agents. It lists every eval run, filters scenarios by agent and status, shows the
full call transcript with the failing turn highlighted, compares each run with its baseline,
regressions first, and reports security results mapped to the OWASP Top 10 for LLM Applications 2025.

Built test-first: the git history shows a failing `test:` commit before every `feat:` commit.

- **Production:** https://voicedesk-console.vercel.app (deploys from `main`)
- **Staging:** every pull request gets its own Vercel preview URL

![Baseline comparison](docs/img/compare.png)

### Security view

Per run and agent: security calls, injection resistance, prompt leaks, cross-customer PII leaks,
unauthorized tool calls and a verdict. Any leak or unauthorized tool call is shown as critical.
Each security scenario lists the OWASP LLM ids it covers (LLM01, LLM02, LLM06, LLM07, LLM10), and the
scenario list can be narrowed to the security track with its transcripts and check results.

![Security view](docs/img/security.png)

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
