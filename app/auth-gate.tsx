"use client";

import { useAuth } from "@clerk/nextjs";
import type { ReactNode } from "react";

/**
 * Client gate. Server `<Show>` calls `auth()` → `headers()`, which throws
 * on StackBlitz WebContainers ("headers was called outside a request scope").
 * `useAuth()` stays in the browser and is what this repro measures.
 */
export function AuthGate({
  signedIn,
  signedOut,
}: {
  signedIn?: ReactNode;
  signedOut?: ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  return <>{isSignedIn ? signedIn : signedOut}</>;
}
