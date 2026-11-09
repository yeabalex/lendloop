import { ConvexReactClient } from "convex/react";

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud";

/**
 * Shared singleton Convex client instance for the browser.
 */
export const convex = new ConvexReactClient(convexUrl);

