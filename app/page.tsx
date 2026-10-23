import { Show } from "@clerk/nextjs";
import { AuthChurnMeter } from "./auth-churn-meter";

export default function HomePage() {
  return (
    <>
      <h1>
        Clerk <code>useAuth()</code> object-identity churn
      </h1>
      <p>
        While signed in and idle, this page counts how often the{" "}
        <strong>object reference</strong> returned by <code>useAuth()</code>{" "}
        changes even though <code>userId</code> / <code>sessionId</code> /{" "}
        <code>orgId</code> stay equal. It also counts{" "}
        <code>isRefreshing</code> flips and a Convex-style{" "}
        <code>useCallback(..., [auth])</code> bridge identity churn.
      </p>

      <Show when="signed-out">
        <div className="card">
          <p className="warn">Sign in to start the meter.</p>
          <p>
            Set <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> (and{" "}
            <code>CLERK_SECRET_KEY</code> for middleware) in{" "}
            <code>.env.local</code> — see README.
          </p>
        </div>
      </Show>

      <Show when="signed-in">
        <AuthChurnMeter />
      </Show>
    </>
  );
}
