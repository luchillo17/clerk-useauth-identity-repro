import type { Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignOutButton,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";
import { AuthGate } from "./auth-gate";
import { ClerkWebContainerPatch } from "./clerk-webcontainer-patch";

export const metadata: Metadata = {
  title: "Clerk useAuth() identity churn repro",
  description:
    "Counts useAuth() object-reference changes while userId/sessionId/orgId stay equal",
};

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const keysReady =
  Boolean(publishableKey) && !publishableKey?.includes("REPLACE_ME");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!keysReady) {
    return (
      <html lang="en">
        <body>
          <header className="topbar">
            <strong>useAuth identity churn</strong>
          </header>
          <main>
            <h1>
              Clerk <code>useAuth()</code> object-identity churn
            </h1>
            <div className="card">
              <p className="warn">Add Clerk keys to start the meter.</p>
              <ol>
                <li>
                  Copy <code>.env.example</code> → <code>.env.local</code>
                </li>
                <li>
                  Set <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{" "}
                  <code>CLERK_SECRET_KEY</code> from the Clerk dashboard
                </li>
                <li>
                  Allow this origin (localhost / StackBlitz preview) under
                  Clerk Domains
                </li>
                <li>
                  Restart <code>npm run dev</code>
                </li>
              </ol>
            </div>
          </main>
        </body>
      </html>
    );
  }

  // Core 3: ClerkProvider must live inside <body>, not wrap <html>.
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <ClerkWebContainerPatch />
          <header className="topbar">
            <strong>useAuth identity churn</strong>
            <span className="spacer" />
            <AuthGate
              signedOut={<SignInButton mode="modal" />}
              signedIn={
                <>
                  <UserButton />
                  <SignOutButton />
                </>
              }
            />
          </header>
          <main>{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
