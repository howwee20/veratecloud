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

## Current alpha boundary

- The provider credential is server-side and is never shipped to the browser.
- The Worker enforces the shared launch budget, stores prompts and responses,
  and exposes an authenticated operator readback endpoint.
- Agent mode is deliberately gated. It does not claim execution until isolated
  hosted workers, durable projects, a run queue, and artifact storage are live.
- The working local alpha and its OpenCode/OpenRouter runtime live separately
  in `outputs/verate-app` while directory names are migrated.
- GitHub Pages serves the product shell. A Cloudflare Worker and D1 provide the
  first hosted control-plane boundary; accounts and isolated agent runners are
  the next layer on that same boundary.
