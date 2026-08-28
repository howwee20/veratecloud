# PolySwap

PolySwap is one working surface for interchangeable models and harnesses.

This repository contains the public product experience for `polyswap.ai`. It
opens directly into the workspace and loads the current model catalog at
runtime instead of carrying a hand-maintained model list.

The public Chat path now includes:

- Live model, provider, capability, modality, context, and price metadata
- Search, filters, favorites, and recent models
- Anonymous browser identity with locally preserved draft and conversation state
- Streamed chat responses through the protected PolySwap Worker
- Text and image attachments within documented browser-side size limits
- Automatic catalog refresh on each page load

The mobile cloud alpha includes:

- A single phone-first dispatch screen at `mobile.html`: composer, active jobs,
  then past jobs, with no automatic Job Room navigation
- One-tap model selection with server-enforced permission and cost defaults
- Task, attention, and archive views with live checkpoints
- One-time approval controls for consequential external actions
- Intelligence swapping that requeues the same work record and checkpoint
- Completion receipts with actual cost and evidence
- A Worker/D1 durable job queue, automatic recovery, and revocable runner-lease
  endpoints
- A bounded Cloudflare runner for read-only web research, analysis, and drafting
- Server-side OpenRouter execution for DeepSeek Flash, Gemini Flash, Claude
  Sonnet, and Llama 4 with ZDR-required provider routing
- A bounded multi-turn browser loop for OpenRouter models, with every search,
  page observation, route, token count, cost, and source written to the job
  receipt
- Server-issued preflight quotes and enforced per-job cost ceilings
- Home-screen Web Push subscriptions for closed-app completion alerts
- A zero-cost media runtime that resolves music requests in the cloud and
  mounts the resolved YouTube video directly inside the expanded active job,
  then publishes the same request to the durable iPhone playback session
- A durable, versioned playback session with pause, resume, stop, skip, track
  changes, device heartbeats, and single-use iPhone pairing codes
- A compiled SwiftUI/WebKit/MusicKit iPhone client in `ios/PolySwapMobile` that
  shows the same one-screen dashboard, connects its authenticated cloud session
  to the native player, shows the foreground video, and carries audio through
  app switching and screen lock

Open `https://polyswap.ai/mobile.html` on a phone for the private cloud alpha.
For local UI work, serve this directory on port 4173 and open
`http://127.0.0.1:4173/mobile.html?demo=1` for the clearly labeled,
non-executing demo mode.

## Current alpha boundary

- The provider credential is server-side and is never shipped to the browser.
- The Worker enforces the shared launch budget, stores prompts and responses,
  and exposes an authenticated operator readback endpoint.
- The durable job record, queue, model handoff, budgets, events, receipts, and
  migrations are deployed. Queue consumers perform bounded read-only browser
  observation and Cloudflare-hosted model inference without a laptop staying
  online.
- Consequential work remains deliberately gated. The built-in runner will not
  submit forms, send email, call people, purchase items, or change accounts. It
  may prepare a draft and returns `completed_unverified` instead of claiming
  that an outside action happened. Music requests are separate media jobs. The
  cloud resolver publishes a durable playback revision, and the authenticated
  iPhone client resolves that same request through MusicKit for background
  playback. Safari alone is a job controller; it is not treated as a dependable
  lock-screen audio runtime.
- Physical iPhone playback requires signing the native target with a registered
  App ID whose MusicKit app service is enabled, then installing it directly or
  through TestFlight. The website and cloud controller deploy independently.
- Server-side quotes use the selected Cloudflare model's token rates and a
  bounded browser allowance. The job stores both the estimate and maximum;
  actual metered model and browser usage is written to its receipt.
- Installed iPhone home-screen apps can subscribe to Web Push. The Worker stores
  the endpoint server-side and sends completion, failure, approval, and budget
  alerts. Delivery depends on the user's notification permission and the
  platform push service.
- The file button is intentionally inactive until the encrypted artifact vault
  and job-scoped secret broker exist.
- Auto, Llama 3.3 70B, and Llama 3.1 8B Fast run inside Cloudflare's account.
  DeepSeek Flash, Gemini Flash, Claude Sonnet, and Llama 4 run through the
  server-side OpenRouter route. The API key never ships to the browser; each
  job is quoted before execution, enforces a maximum, and records actual cost.
- Local Mac models are not yet selectable from the phone. They require the
  outbound local-runner bridge described in the runner contract, and the Mac
  must be awake while such a job runs.
- The working local alpha and its OpenCode/OpenRouter runtime live separately
  in `outputs/verate-app` while directory names are migrated.
- GitHub Pages serves the product shell. A Cloudflare Worker, Queue, Browser
  Rendering binding, Workers AI binding, and D1 provide the hosted control
  plane and bounded runner.

The runner handoff and deployment order are specified in
`docs/CLOUD_RUNNER_CONTRACT.md`.
