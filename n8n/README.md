# LendLoop Automation (n8n)

## Architecture

```mermaid
flowchart TD
  subgraph Client["Next.js 16 + Clerk"]
    UI["LendLoop UI (Borrow / Approve / Return)"]
  end

  subgraph Backend["Convex Cloud Backend"]
    Mutations["loans.ts (Lifecycle Mutations)"]
    Scheduler["events.ts (Async Scheduler)"]
    Dispatcher["n8n.ts (HMAC Signer & Dispatcher)"]
    HTTP["http.ts (Authenticated API Router)"]
    DB[("Database (loans & automationLogs)")]
  end

  subgraph Automation["n8n Workflows"]
    WF1["Request Notification (Webhook)"]
    WF2["Daily Overdue Reminders (Schedule)"]
    WF3["Error Handler (Error Trigger)"]
  end

  UI -->|User Action| Mutations
  Mutations -->|Record| DB
  Mutations -->|Schedule| Scheduler
  Scheduler --> Dispatcher

  Dispatcher -->|"POST Webhook (HMAC Signed)"| WF1
  WF1 -->|"POST /api/webhooks/n8n (Write-back)"| HTTP
  WF2 -->|"GET /api/overdue-loans (HMAC Signed)"| HTTP
  WF2 -->|"POST /api/webhooks/n8n (Idempotent Log)"| HTTP
  HTTP --> DB

  WF1 -.->|"On Failure"| WF3
  WF2 -.->|"On Failure"| WF3
```

---

## File Structure

```
n8n/
├── README.md
├── docker-compose.yml
└── workflows/
    ├── error-handler.json        # Error trigger catching workflow failures
    ├── overdue-reminders.json     # 9:00 AM daily cron polling overdue loans
    └── request-notification.json  # Real-time webhook for borrow status events
```

---

## Environment Variables

```bash
# Convex Deployment
npx convex env set N8N_WEBHOOK_SECRET "your_hmac_secret"
npx convex env set N8N_REQUEST_WEBHOOK_URL "https://your-instance.app.n8n.cloud/webhook/lendloop-request-events"

# n8n Cloud (Personal -> Variables)
# N8N_WEBHOOK_SECRET = your_hmac_secret
# CONVEX_SITE_URL    = https://your-deployment.convex.site
```
