import type { AuthConfig } from "convex/server";

/**
 * Convex authentication configuration for Clerk JWT verification.
 * Requires `CLERK_JWT_ISSUER_DOMAIN` to be configured in Convex environment variables
 * and a Clerk JWT Template named `"convex"`.
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN ?? "",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;

