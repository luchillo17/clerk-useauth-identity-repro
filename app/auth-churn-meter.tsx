"use client";

import { useAuth } from "@clerk/nextjs";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type IdSnap = {
  userId: string | null | undefined;
  sessionId: string | null | undefined;
  orgId: string | null | undefined;
};

function sameIds(a: IdSnap, b: IdSnap): boolean {
  return (
    a.userId === b.userId &&
    a.sessionId === b.sessionId &&
    a.orgId === b.orgId
  );
}

/** Optional / non-typed field observed in some Clerk builds / profiler dumps. */
function readIsRefreshing(auth: object): boolean | undefined {
  if (!("isRefreshing" in auth)) return undefined;
  const v = (auth as { isRefreshing?: unknown }).isRefreshing;
  return typeof v === "boolean" ? v : undefined;
}

/**
 * Proves referential identity churn on Clerk's useAuth() return value.
 *
 * Expected (stable library): while idle with unchanged identity primitives,
 * objectChurnWhileIdsStable stays 0 (or near 0 after initial settle).
 *
 * Actual (bug): counter climbs on idle / token-refresh ticks even though
 * userId, sessionId, and orgId are unchanged — which rebuilds any
 * useCallback/useMemo that lists the whole auth object as a dependency
 * (ConvexProviderWithClerk-style bridges).
 */
export function AuthChurnMeter() {
  const auth = useAuth();
  const { isLoaded, isSignedIn, userId, sessionId, orgId, orgRole, getToken } =
    auth;
  const isRefreshing = readIsRefreshing(auth);

  const prevAuthRef = useRef(auth);
  const prevIdsRef = useRef<IdSnap>({ userId, sessionId, orgId });
  const prevRefreshingRef = useRef(isRefreshing);
  const prevGetTokenRef = useRef(getToken);
  const settledRef = useRef(false);

  const [objectChurnWhileIdsStable, setObjectChurnWhileIdsStable] = useState(0);
  const [totalObjectChurn, setTotalObjectChurn] = useState(0);
  const [isRefreshingFlips, setIsRefreshingFlips] = useState(0);
  const [getTokenChurnWhileIdsStable, setGetTokenChurnWhileIdsStable] =
    useState(0);
  const [bridgeCallbackChurn, setBridgeCallbackChurn] = useState(0);
  const [renderCount, setRenderCount] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Convex-style: memoize adapter work on the whole auth object.
  const bridge = useCallback(() => {
    return {
      isLoaded: auth.isLoaded,
      isAuthenticated: !!auth.isSignedIn,
      fetchAccessToken: async () => {
        const token = await auth.getToken({ template: undefined });
        return token ?? null;
      },
    };
  }, [auth]);

  const prevBridgeRef = useRef(bridge);

  useLayoutEffect(() => {
    setRenderCount((n) => n + 1);
  });

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    // Give Clerk one frame to settle before counting "idle" churn.
    const settle = window.setTimeout(() => {
      settledRef.current = true;
    }, 1500);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(settle);
    };
  }, []);

  useEffect(() => {
    if (prevAuthRef.current !== auth) {
      setTotalObjectChurn((n) => n + 1);
      const prevIds = prevIdsRef.current;
      const nextIds: IdSnap = { userId, sessionId, orgId };
      if (
        settledRef.current &&
        isLoaded &&
        isSignedIn &&
        sameIds(prevIds, nextIds)
      ) {
        setObjectChurnWhileIdsStable((n) => n + 1);
      }
      prevAuthRef.current = auth;
      prevIdsRef.current = nextIds;
    }

    if (prevRefreshingRef.current !== isRefreshing) {
      if (settledRef.current && isRefreshing !== undefined) {
        setIsRefreshingFlips((n) => n + 1);
      }
      prevRefreshingRef.current = isRefreshing;
    }

    if (prevGetTokenRef.current !== getToken) {
      const prevIds = prevIdsRef.current;
      const nextIds: IdSnap = { userId, sessionId, orgId };
      if (
        settledRef.current &&
        isLoaded &&
        isSignedIn &&
        sameIds(prevIds, nextIds)
      ) {
        setGetTokenChurnWhileIdsStable((n) => n + 1);
      }
      prevGetTokenRef.current = getToken;
    }

    if (prevBridgeRef.current !== bridge) {
      if (settledRef.current) {
        setBridgeCallbackChurn((n) => n + 1);
      }
      prevBridgeRef.current = bridge;
    }
  });

  return (
    <div className="card">
      <div className="metrics">
        <div className="metric">
          <strong>{objectChurnWhileIdsStable}</strong>
          <span>object churn while ids stable (bug signal)</span>
        </div>
        <div className="metric">
          <strong>{totalObjectChurn}</strong>
          <span>total useAuth() object ref changes</span>
        </div>
        <div className="metric">
          <strong>
            {isRefreshing === undefined ? "n/a" : isRefreshingFlips}
          </strong>
          <span>
            isRefreshing flips
            {isRefreshing === undefined ? " (field absent on this build)" : ""}
          </span>
        </div>
        <div className="metric">
          <strong>{getTokenChurnWhileIdsStable}</strong>
          <span>getToken fn churn while ids stable</span>
        </div>
        <div className="metric">
          <strong>{bridgeCallbackChurn}</strong>
          <span>useCallback([auth]) identity churn</span>
        </div>
        <div className="metric">
          <strong>{renderCount}</strong>
          <span>component renders</span>
        </div>
        <div className="metric">
          <strong>{elapsedSec}s</strong>
          <span>idle elapsed (after 1.5s settle)</span>
        </div>
      </div>

      <p style={{ marginTop: "1rem" }}>
        {objectChurnWhileIdsStable === 0 ? (
          <span className="ok">
            No stable-id object churn yet — leave this tab open ~30–60s (token
            refresh / idle ticks).
          </span>
        ) : (
          <span className="warn">
            Bug signal: useAuth() returned a new object{" "}
            {objectChurnWhileIdsStable} time(s) while userId/sessionId/orgId
            stayed equal.
          </span>
        )}
      </p>

      <h2 style={{ fontSize: "1rem", marginTop: "1.25rem" }}>
        Current primitives
      </h2>
      <ul className="mono">
        <li>isLoaded: {String(isLoaded)}</li>
        <li>isSignedIn: {String(isSignedIn)}</li>
        <li>
          isRefreshing:{" "}
          {isRefreshing === undefined ? "(not on UseAuthReturn)" : String(isRefreshing)}
        </li>
        <li>userId: {userId ?? "null"}</li>
        <li>sessionId: {sessionId ?? "null"}</li>
        <li>orgId: {orgId ?? "null"}</li>
        <li>orgRole: {orgRole ?? "null"}</li>
      </ul>

      <h2 style={{ fontSize: "1rem" }}>How to read this</h2>
      <ol>
        <li>Sign in (optionally activate an organization).</li>
        <li>Do nothing — leave the tab focused or backgrounded.</li>
        <li>
          <strong>Expected:</strong> <code>object churn while ids stable</code>{" "}
          stays <code>0</code>.
        </li>
        <li>
          <strong>Actual (bug):</strong> that counter increments on idle /
          refresh ticks; <code>useCallback([auth])</code> churn tracks with it.
        </li>
      </ol>
    </div>
  );
}
