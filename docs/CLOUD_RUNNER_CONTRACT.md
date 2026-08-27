# PolySwap Cloud runner contract

The phone is a control surface. It never owns the process that performs the
work. The durable `cloud_jobs` row is the source of truth shared by the phone,
the control plane, and every interchangeable intelligence.

## Job lifecycle

1. The phone creates a job with `POST /v1/jobs`. The Worker locks its goal,
   acceptance criteria, model route, privacy mode, permission profile, and cost
   ceiling into D1.
2. The Worker publishes the job ID to the `polyswap-jobs` queue. Its built-in
   consumer claims the row transactionally. Included Cloudflare models receive
   at most one public web observation. Certified OpenRouter models can use a
   bounded multi-turn loop of read-only `search_web` and `open_page` tools. A
   cron trigger republishes stranded queued jobs every five minutes.
3. The built-in runner moves the job to `running`, records checkpoints, enforces
   the maximum cost, and stores a result and receipt. It is restricted to
   read-only research, analysis, and drafting. Requests for consequential
   actions stop at a draft boundary and finish as `completed_unverified`.
4. A future isolated desktop-harness adapter can instead claim work through
   `POST /v1/runner/claim` with `Authorization: Bearer $RUNNER_TOKEN` and
   `{ "runnerId": "..." }`. This external runner path remains disabled until a
   runner secret and sandbox broker are provisioned.
5. An external runner posts checkpoints to `POST /v1/runner/jobs/:jobId`. Every update
   must include the current `runnerId`; revoked, paused, waiting, cancelled, or
   terminal leases are rejected.
6. Before an external side effect, the runner posts an `approval` object and
   stops. The phone approves or denies it through the user job-action endpoint.
7. Completion includes the actual cost, a result summary, and an evidence
   receipt. The isolated workspace is then destroyed; the durable receipt and
   selected artifacts remain.

## Runner update example

```json
{
  "runnerId": "runner_us_east_01",
  "status": "running",
  "checkpointId": "checkpoint_17",
  "actualUsd": 0.021,
  "event": {
    "kind": "checkpoint",
    "label": "Three verified roles found",
    "detail": "Checking two additional official employer listings.",
    "evidence": "artifact://job/report-17.json"
  }
}
```

To request a one-time human decision:

```json
{
  "runnerId": "runner_us_east_01",
  "approval": {
    "title": "Submit application",
    "description": "Send the tailored resume and final application.",
    "resource": "Vector Dynamics controls engineer application"
  },
  "event": {
    "kind": "approval",
    "label": "Application ready",
    "detail": "No data has been submitted."
  }
}
```

To finish:

```json
{
  "runnerId": "runner_us_east_01",
  "status": "completed",
  "actualUsd": 0.037,
  "resultSummary": "Five current roles were verified and ranked.",
  "receipt": {
    "status": "verified",
    "evidence": [
      "artifact://job/report.html",
      "https://employer.example/jobs/123"
    ]
  },
  "event": {
    "kind": "completed",
    "label": "Definition of done verified",
    "detail": "All five links were reopened successfully."
  }
}
```

## Non-negotiable runner rules

- Provision one isolated workspace per job lease and destroy it after the run.
- Never give a model credentials outside that job's permission scope.
- Check the lease before every consequential browser, email, call, or submit
  action; do not infer approval from the original prompt.
- Stop before the cost ceiling. A route may be swapped, but the job record,
  checkpoint, permissions, and proof requirements remain unchanged.
- Label evidence as observed, verified, simulated, or blocked. A navigation
  start or model assertion is not proof of completion.
- Do not route sensitive artifacts through OpenRouter unless the job explicitly
  selects that route and its privacy policy permits the payload.

## Deployed cloud layers

1. D1 migrations `0003_cloud_jobs.sql` and `0004_mobile_push.sql`.
2. A Cloudflare Queue consumer with a dead-letter queue and cron recovery.
3. Server-side quotes, cost ceilings, actual usage, and durable receipts.
4. A bounded read-only Browser Rendering and Workers AI runner.
5. Stored iOS PWA Web Push subscriptions and terminal-state notifications.
6. A server-side OpenRouter key, curated mobile model catalog, ZDR-required
   provider routing, per-job maximum, shared launch ceiling, and metered model
   receipts.

## Remaining production layers

1. Add encrypted artifact storage and a job-scoped secret broker.
2. Provision an isolated Work Kernel adapter for broader desktop-parity tools.
3. Build provider-specific approval and verification adapters before enabling
   email, calling, submissions, purchases, or other side effects.
4. Replace the friends-alpha session token with passkey-backed accounts and
   per-user authorization before broad release.
5. Add a native or user-approved media bridge before claiming phone music or
   other device control.
6. Add the authenticated outbound Mac runner before exposing local models in
   the phone picker; local jobs cannot continue while that Mac is asleep.
