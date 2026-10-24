"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

type IdSnap = {
  userId: string | null | undefined;
  sessionId: string | null | undefined;
  orgId: string | null | undefined;
};

type Counts = {
  objectChurnWhileIdsStable: number;
  totalObjectChurn: number;
  isRefreshingFlips: number;
  getTokenChurnWhileIdsStable: number;
  bridgeCallbackChurn: number;
  renderCount: number;
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
 * Counters live in refs and flush on an interval. Do NOT setState from an
 * effect that observes `auth` identity — when useAuth() returns a new object
 * every consumer render (the bug), that feedback loop hits max update depth.
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
  const countsRef = useRef<Counts>({
    objectChurnWhileIdsStable: 0,
    totalObjectChurn: 0,
    isRefreshingFlips: 0,
    getTokenChurnWhileIdsStable: 0,
    bridgeCallbackChurn: 0,
    renderCount: 0,
  });
  countsRef.current.renderCount += 1;

  const [snap, setSnap] = useState(() => ({
    ...countsRef.current,
    elapsedSec: 0,
  }));

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

  useEffect(() => {
    const started = Date.now();
    const settle = window.setTimeout(() => {
      settledRef.current = true;
    }, 1500);
    const id = window.setInterval(() => {
      setSnap({
        ...countsRef.current,
        elapsedSec: Math.floor((Date.now() - started) / 1000),
      });
    }, 250);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(settle);
    };
  }, []);

  useEffect(() => {
    if (prevAuthRef.current !== auth) {
      countsRef.current.totalObjectChurn += 1;
      const prevIds = prevIdsRef.current;
      const nextIds: IdSnap = { userId, sessionId, orgId };
      if (
        settledRef.current &&
        isLoaded &&
        isSignedIn &&
        sameIds(prevIds, nextIds)
      ) {
        countsRef.current.objectChurnWhileIdsStable += 1;
      }
      prevAuthRef.current = auth;
      prevIdsRef.current = nextIds;
    }

    if (prevRefreshingRef.current !== isRefreshing) {
      if (settledRef.current && isRefreshing !== undefined) {
        countsRef.current.isRefreshingFlips += 1;
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
        countsRef.current.getTokenChurnWhileIdsStable += 1;
      }
      prevGetTokenRef.current = getToken;
    }

    if (prevBridgeRef.current !== bridge) {
      if (settledRef.current) {
        countsRef.current.bridgeCallbackChurn += 1;
      }
      prevBridgeRef.current = bridge;
    }
  });

  const {
    objectChurnWhileIdsStable,
    totalObjectChurn,
    isRefreshingFlips,
    getTokenChurnWhileIdsStable,
    bridgeCallbackChurn,
    renderCount,
  } = snap;

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
          <strong>{snap.elapsedSec}s</strong>
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
          {isRefreshing === undefined
            ? "(not on UseAuthReturn)"
            : String(isRefreshing)}
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
