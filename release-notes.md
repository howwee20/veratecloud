# Verate 0.1.0 — Developer Preview

The first installable Verate build for Apple Silicon Macs.

Included:

- a real Code-OSS coding workspace with Explorer, editor, Git, terminal, debugger, and extension support
- Verate as the primary agent surface
- Free, Economy, Balanced, and Frontier execution policies
- hard budget, deadline, assurance, access, local-first, escalation, and parallel controls
- quote authorization before execution
- Codex CLI runtime integration
- OpenCode/OpenRouter adapter path for open and third-party models
- versioned execution receipts and proof-gated completion

Verified locally:

- Code-OSS and the built-in Verate extension compile successfully
- Apple Silicon application packaging completes
- the release archive extracts to an arm64 app with a valid ad-hoc code signature
- the signed app opens into Verate Light with the Verate panel selected and stock secondary Chat closed
- a Codex-backed run returned the requested result and passed a proof command against that exact result

Preview limitations:

- Apple Silicon only
- not Apple-notarized
- Codex requires its CLI and an authenticated local session
- OpenCode/OpenRouter routing requires separate local configuration and was not part of the release acceptance run
