import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const hasClerkKeys =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY) &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes("REPLACE_ME") &&
  !process.env.CLERK_SECRET_KEY?.includes("REPLACE_ME");

/**
 * StackBlitz / cold boots often have no secrets yet. Skip Clerk middleware
 * so the WebContainer can start; the page shows a setup card instead.
 */
const middleware = hasClerkKeys
  ? clerkMiddleware()
  : (_req: NextRequest) => NextResponse.next();

export default middleware;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
