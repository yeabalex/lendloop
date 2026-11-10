import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    INITIAL_ADMIN_EMAILS: v.optional(v.string()),
    N8N_WEBHOOK_SECRET: v.optional(v.string()),
    N8N_REQUEST_WEBHOOK_URL: v.optional(v.string()),
  },
});

export default app;

