# Clerk `useAuth()` object-identity churn — minimal repro

Public paste target for [clerk/javascript BUG_REPORT.yml](https://github.com/clerk/javascript/issues/new?template=BUG_REPORT.yml) **Reproduction** field.

**Public URL:**  
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

## Stack

- Next.js App Router **15.4.7** + `@clerk/nextjs` ^7.9.x (Clerk **Core 3**)
- Client gate: `app/auth-gate.tsx` (`useAuth`) — not server `Show` / `SignedIn`
- Meter counters live in refs and flush on an interval (avoids max-update-depth when `useAuth()` returns a new object every render)
- No Convex deploy — page mocks the bridge with `useCallback([auth])`

## StackBlitz: unsupported

Do **not** use StackBlitz / WebContainers for this repro. `@clerk/nextjs` App Router sign-in calls a server action that does `cookies().delete(...)`. WebContainers have no Next request scope for that → `POST /` 500 (`cookies().delete was called outside a request scope`), even with local patches. **Run locally** (below). Paste the GitHub URL into Clerk’s bug form.

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

StackBlitz is **unsupported** for this `@clerk/nextjs` App Router repro (see above).

## Env vars

| Var | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | `pk_test_…` |
| `CLERK_SECRET_KEY` | yes (middleware) | `sk_test_…` — local only; never commit |

No other secrets. No Vital Link product code.

## Files that matter

- `app/auth-churn-meter.tsx` — identity / optional `isRefreshing` / `getToken` / bridge counters
- `app/page.tsx` — signed-in demo shell
- `middleware.ts` — stock `clerkMiddleware()`

## License

MIT — free to paste into upstream Clerk issue trackers.
