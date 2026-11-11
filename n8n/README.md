# LendLoop Workflow Automation (n8n + Convex)

Automated notification and overdue loan reminder workflows for **LendLoop**, built with **n8n** and **Convex**, secured with bidirectional HMAC-SHA256 signatures, idempotent write-backs, automatic retries, and dedicated error handling.

---

## 1. Architecture & Security Overview

```
                      ┌──────────────────────────────────────────┐
                      │              LendLoop App                │
                      │       Next.js 16 + Clerk Auth            │
                      └────────────────────┬─────────────────────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               Convex Cloud Backend                               │
│                                                                                  │
│   • loans.ts (Lifecycle mutations: requestLoan, approveLoan, declineLoan, etc.)  │
│   • n8n.ts (HMAC-SHA256 signer, dispatcher, idempotent logger, overdue query)    │
│   • http.ts:                                                                     │
│       - GET  /api/overdue-loans  (HMAC verified, returns loans where endDate < now) │
│       - POST /api/webhooks/n8n   (HMAC verified, idempotent write-backs)         │
└───────────────────────┬──────────────────────────────────▲───────────────────────┘
                        │                                  │
    POST /webhook/...   │                                  │  POST /api/webhooks/n8n
    X-LendLoop-Signature│                                  │  X-LendLoop-Signature
    (Data Minimization) │                                  │  (Idempotent Write-Back)
                        ▼                                  │
┌──────────────────────────────────────────────────────────┴───────────────────────┐
│                                  n8n Cloud / Docker                              │
│                                                                                  │
│   [Workflow 1] LendLoop — Request Notification                                   │
│       Webhook (rawBody: true) -> Verify HMAC -> 200/401 -> Compose -> Log        │
│                                                                                  │
│   [Workflow 2] LendLoop — Daily Overdue Reminders                                │
│       Schedule (9 AM) -> Sign GET -> Fetch /api/overdue-loans -> Log Reminders   │
│                                                                                  │
│   [Workflow 3] LendLoop — Error Handler                                          │
│       Error Trigger -> Format & Log Failure (Catches any workflow crashes)       │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Bidirectional HMAC-SHA256 Signing
- **Convex → n8n**: When a loan event occurs (`request.created`, `request.approved`, `request.declined`, `loan.returned`), Convex computes an HMAC over `${timestamp}.${rawBody}` and sends header `X-LendLoop-Signature: t=<timestamp>,v1=<hexDigest>`. n8n verifies this before processing and immediately drops unsigned or tampered requests with `HTTP 401`.
- **n8n → Convex**: When n8n writes back delivery statuses or queries overdue loans, it signs the request using the same shared secret. Convex's `http.ts` verifies the signature using the native Web Crypto API (`crypto.subtle`).
- **Replay Protection**: Both sides enforce a 5-minute timestamp tolerance window.
- **Timing Attack Prevention**: Both implementations use constant-time buffer comparisons (`crypto.timingSafeEqual`).

### Data Minimization
Payloads sent across the wire contain **only the minimal fields** needed for user notifications (`tool.name`, `loan.startDate/endDate`, `recipient.name/email`, `actor.name`). Internal database IDs (`clerkId`), permissions, and roles are never leaked.

### Idempotency & Retries
- Each write-back includes an `idempotencyKey` (e.g. `overdue_reminder:<loanId>:<YYYY-MM-DD>`).
- Convex checks `automationLogs.by_idempotency_key` before writing. Retries return `{ deduplicated: true }` without inserting duplicate activity logs or double-incrementing reminder counters.
- Both outbound HTTP calls in n8n and Convex implement **3 retries with exponential backoff**.

---

## 2. Workflows Included (`n8n/workflows/`)

| File | Name | Trigger | Description |
|---|---|---|---|
| [`request-notification.json`](./workflows/request-notification.json) | **LendLoop — Request Notification** | Webhook (`POST`) | Triggered by Convex on loan lifecycle events. Verifies HMAC, returns `200`/`401`, formats user notification, logs delivery, and writes status back to Convex idempotently. |
| [`overdue-reminders.json`](./workflows/overdue-reminders.json) | **LendLoop — Daily Overdue Reminders** | Schedule (09:00 UTC) | Daily cron that signs and fetches overdue approved loans from Convex (`GET /api/overdue-loans`), loops overdue borrowers, logs reminders, and writes status back with daily idempotency. |
| [`error-handler.json`](./workflows/error-handler.json) | **LendLoop — Error Handler** | Error Trigger | Catch-all workflow linked in Settings of other workflows. Formats and logs execution failure alerts so errors are visible and never fail silently. |

---

## 3. Environment Variables & Secrets Reference

**Secrets are kept strictly in environment variables and n8n settings — never hardcoded in files or exported workflow JSON.**

### Convex Backend Environment (`npx convex env set`)
```bash
# Shared HMAC secret (32-byte hex)
npx convex env set N8N_WEBHOOK_SECRET "your_32_byte_hex_secret"

# Production Webhook URL from n8n Workflow 1
npx convex env set N8N_REQUEST_WEBHOOK_URL "https://your-instance.app.n8n.cloud/webhook/lendloop-request-events"
```

### n8n Cloud Variables (`Personal -> Variables`)
| Key | Value | Description |
|---|---|---|
| `N8N_WEBHOOK_SECRET` | `your_32_byte_hex_secret` | Shared secret for signing & verifying HMAC payloads. |
| `CONVEX_SITE_URL` | `https://your-deployment.convex.site` | Base URL of Convex HTTP endpoints (no trailing slash). |

---

## 4. Self-Hosting via Docker (Optional)

If running n8n locally instead of n8n Cloud:

```bash
cd n8n
docker compose up -d
```

Open `http://localhost:5678`, import the 3 JSONs from `n8n/workflows/`, and expose your local webhook using an HTTP tunnel (e.g. `cloudflared` or `ngrok`):
```bash
ngrok http 5678
```
Set `N8N_REQUEST_WEBHOOK_URL` in Convex to your public tunnel URL.

---

## 5. In-App Activity Feed (Bonus Requirement)

All delivered notifications and overdue reminders are recorded in Convex's `automationLogs` table. The web app automatically surfaces this history directly on each loan card:
- *"Approval notification delivered to borrower@example.com · just now"*
- *"Overdue reminder (2 days late) sent to borrower@example.com · 2 hours ago"*
