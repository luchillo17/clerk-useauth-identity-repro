# Clerk `useAuth()` object-identity churn — minimal repro

Public paste target for [clerk/javascript BUG_REPORT.yml](https://github.com/clerk/javascript/issues/new?template=BUG_REPORT.yml) **Reproduction** field.

**Intended public URL (after personal push):**  
https://github.com/luchillo17/clerk-useauth-identity-repro

Owner must be personal account [`luchillo17`](https://github.com/luchillo17) — **not** `Vital-Link-360` / `carlos-vitallink360`.

## What it proves

While signed in and idle:

1. `useAuth()` often returns a **new object reference**.
2. `userId` / `sessionId` / `orgId` stay equal.
3. The demo counter **object churn while ids stable** increments (bug signal).
4. A Convex-style `useCallback(..., [auth])` bridge identity also churns in lockstep.
5. `getToken` function identity churn (while ids stable) is counted separately.
6. If this Clerk build exposes `isRefreshing` on the auth object, flips are counted; otherwise the UI shows `n/a`.

**Expected:** after a short settle (~1.5s), `object churn while ids stable` stays `0`.

**Actual:** that counter climbs on idle / token-refresh ticks without identity changes.

- Core 3 UI: `Show when="signed-in|signed-out"` (not `SignedIn`/`SignedOut`)

## Stack

- Next.js App Router **15.4.7** (pinned — Next **≥15.5** breaks on StackBlitz / WebContainers: [webcontainer-core#1978](https://github.com/stackblitz/webcontainer-core/issues/1978); webpack is the 15.4 default, so no `--webpack` flag)
- `@clerk/nextjs` ^7.9.x (Clerk **Core 3**: use `Show when="signed-in"|"signed-out"`, not `SignedIn`/`SignedOut`; `ClerkProvider` inside `<body>`)
- No Convex deploy required — the page mocks the bridge with `useCallback([auth])`

## Run locally

```bash
cp .env.example .env.local
# paste pk_test_ / sk_test_ from https://dashboard.clerk.com → API Keys
npm install
npm run dev
```

Open http://localhost:3000 → sign in → leave the tab idle 30–60s → watch the counters.

Clerk Dashboard → **Configure → Domains** (or allowed origins): add `http://localhost:3000`.

## Publish as `luchillo17` (required)

Do **not** create/push with Vital Link work tokens (`carlos-vitallink360`). Use personal login:

```bash
gh auth login   # choose luchillo17
gh api user --jq .login   # must print: luchillo17

cd /path/to/clerk-useauth-identity-repro
gh repo create luchillo17/clerk-useauth-identity-repro --public --source=. --remote=origin --push
```

If the name is taken:

```bash
gh repo create luchillo17/clerk-useauth-identity-churn-repro --public --source=. --remote=origin --push
```

**Reproduction field paste:**

```text
https://github.com/luchillo17/clerk-useauth-identity-repro
```

Optional StackBlitz:

```text
https://stackblitz.com/github/luchillo17/clerk-useauth-identity-repro
```

StackBlitz boots without keys (setup card). To run the meter: `.env.example` → `.env.local`, set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`, allow the StackBlitz preview origin in Clerk Domains, restart `npm run dev`. Do **not** bump Next past 15.4.7 if you need WebContainers.

## Env vars

| Var | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | `pk_test_…` |
| `CLERK_SECRET_KEY` | yes (middleware) | `sk_test_…` — local / StackBlitz only; never commit |

No other secrets. No Vital Link product code.

## Files that matter

- `app/auth-churn-meter.tsx` — identity / optional `isRefreshing` / `getToken` / bridge counters
- `app/page.tsx` — signed-in demo shell
- `middleware.ts` — stock `clerkMiddleware()`

## License

MIT — free to paste into upstream Clerk issue trackers.
