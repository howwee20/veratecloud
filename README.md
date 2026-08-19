# PolySwap

PolySwap is one working surface for interchangeable models and harnesses.

This repository contains the public product experience for `polyswap.ai`. It
opens directly into the workspace and loads OpenRouter's current model catalog
at runtime instead of carrying a hand-maintained model list.

The public Chat path now includes:

- Live model, provider, capability, modality, context, and price metadata
- Search, filters, favorites, and recent models
- OpenRouter OAuth PKCE with a user-controlled key stored in that browser
- Streamed chat responses with actual model, token, and cost reporting
- Text and image attachments within documented browser-side size limits
- Automatic catalog refresh on each page load

## Current alpha boundary

- Chat inference is real and runs directly from the browser through the user's
  secure model authorization.
- The site labels the budget as a target because a browser-only chat cannot
  enforce a transactional hard cap before final usage arrives.
- Agent mode is deliberately gated. It does not claim execution until isolated
  hosted workers, durable projects, a run queue, and artifact storage are live.
- The working local alpha and its OpenCode/OpenRouter runtime live separately
  in `outputs/verate-app` while directory names are migrated.
- GitHub Pages remains a temporary static host for Chat. Accounts and the hosted
  OpenCode execution boundary require an application host and worker platform.
