"use client";

import { useLayoutEffect } from "react";

declare global {
  interface Window {
    __internal_onBeforeSetActive?: (
      intent?: string,
    ) => void | Promise<void>;
  }
}

/**
 * `@clerk/nextjs` App Router provider sets
 * `window.__internal_onBeforeSetActive` to a server action that does
 * `cookies().delete(...)`. StackBlitz WebContainers have no Next request
 * store for that action → POST / 500 on sign-in.
 *
 * No-op the hook after Clerk mounts (child layout effect runs later).
 * Local Node still refreshes via `__internal_onAfterSetActive` → router.refresh().
 */
export function ClerkWebContainerPatch() {
  useLayoutEffect(() => {
    window.__internal_onBeforeSetActive = () => Promise.resolve();
  });
  return null;
}
