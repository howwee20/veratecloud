(function () {
  "use strict";

  const apiRoot = document.querySelector('meta[name="polyswap-api"]')?.content?.replace(/\/$/, "") || "";
  const params = new URLSearchParams(window.location.search);

  const FALLBACK_MODELS = [
    {
      id: "polyswap/auto",
      name: "Auto",
      short: "Auto",
      provider: "Cloudflare-hosted",
      route: "cloudflare",
      privacy: "cloudflare",
      detail: "Uses the strongest included cloud worker",
      quote: 0.003,
      available: true,
      tone: "violet"
    },
    {
      id: "cloudflare/llama-3.3-70b",
      name: "Llama 3.3 70B",
      short: "Llama 70B",
      provider: "Cloudflare-hosted",
      route: "cloudflare",
      privacy: "cloudflare",
      detail: "Capable read-only research and drafting",
      quote: 0.003,
      available: true,
      tone: "blue"
    },
    {
      id: "cloudflare/llama-3.1-8b-fast",
      name: "Llama 3.1 8B Fast",
      short: "Llama Fast",
      provider: "Cloudflare-hosted",
      route: "cloudflare",
      privacy: "cloudflare",
      detail: "Cheapest included route for simple work",
      quote: 0.001,
      available: true,
      tone: "green"
    }
  ];
  let models = FALLBACK_MODELS;
  let youtubeApiPromise = null;
  const DEFAULT_BUDGET_USD = 0.25;

  const TERMINAL = new Set(["completed", "completed_unverified", "failed", "cancelled"]);
  const ATTENTION = new Set(["waiting_for_human", "waiting_for_approval", "blocked"]);
  const STORAGE = {
    session: "polyswap.mobile.session",
    token: "polyswap.mobile.access",
    model: "polyswap.mobile.model",
    demoJobs: "polyswap.mobile.demo-jobs"
  };
  const savedSessionId = localStorage.getItem(STORAGE.session) || "";
  const sessionIsUsable = /^anon_[a-zA-Z0-9_-]{7,90}$/.test(savedSessionId);
  const savedModel = findModel(localStorage.getItem(STORAGE.model));

  const state = {
    demo: params.get("demo") === "1",
    sessionId: sessionIsUsable ? savedSessionId : createSessionId(),
    accessToken: sessionIsUsable ? localStorage.getItem(STORAGE.token) || "" : "",
    selectedModel: savedModel?.available ? savedModel : models[0],
    jobs: [],
    activeJob: null,
    expandedJobId: "",
    jobDetails: new Map(),
    swapJobId: null,
    pollTimer: null,
    accessPromise: null,
    previousStatuses: new Map(),
    serviceWorker: null,
    mediaPlayers: [],
    playback: null,
    playbackRevision: -1,
    pairingCode: "",
    renderKey: "",
    taskView: "chat",
    pendingAttachment: null,
    activityOpen: false
  };

  const els = {
    form: document.getElementById("jobComposer"),
    prompt: document.getElementById("jobPrompt"),
    send: document.getElementById("sendButton"),
    attachmentButton: document.getElementById("attachmentButton"),
    attachmentInput: document.getElementById("attachmentInput"),
    attachmentChip: document.getElementById("attachmentChip"),
    modelButton: document.getElementById("modelButton"),
    modelName: document.getElementById("modelLabel"),
    modelIcon: document.getElementById("modelIcon"),
    modelList: document.getElementById("modelOptions"),
    activeList: document.getElementById("activeJobList"),
    pastList: document.getElementById("pastJobList"),
    activeCount: document.getElementById("activeCount"),
    pastCount: document.getElementById("pastCount"),
    activityToggle: document.getElementById("activityToggle"),
    activityDrawer: document.getElementById("activityDrawer"),
    activityTotal: document.getElementById("activityTotal"),
    modelDialog: document.getElementById("modelDialog"),
    taskDialog: document.getElementById("taskDialog"),
    taskTemplate: document.getElementById("taskTemplate"),
    statusBanner: document.getElementById("statusBanner"),
    notificationPrompt: document.getElementById("notificationPrompt"),
    notifyButton: document.getElementById("notificationButton"),
    micButton: document.getElementById("voiceButton"),
    modelClose: document.getElementById("modelClose"),
    taskClose: document.getElementById("taskClose"),
    taskMenu: document.getElementById("taskMenu"),
    taskChatTab: document.getElementById("taskChatTab"),
    taskLiveTab: document.getElementById("taskLiveTab"),
    taskFilesTab: document.getElementById("taskFilesTab"),
    taskProofTab: document.getElementById("taskProofTab"),
    taskChatPane: document.getElementById("taskChatPane"),
    taskLivePane: document.getElementById("taskLivePane"),
    taskFilesPane: document.getElementById("taskFilesPane"),
    taskProofPane: document.getElementById("taskProofPane"),
    jobConversation: document.getElementById("jobConversation"),
    taskDetailId: document.getElementById("taskDetailId"),
    taskDetailStatus: document.getElementById("taskDetailStatus"),
    taskDetailTitle: document.getElementById("taskDetailTitle"),
    taskDetailGoal: document.getElementById("taskDetailGoal"),
    approvalCard: document.getElementById("approvalCard"),
    approvalTitle: document.getElementById("approvalTitle"),
    approvalDescription: document.getElementById("approvalDescription"),
    approvalResource: document.getElementById("approvalResource"),
    approveButton: document.getElementById("approveButton"),
    denyButton: document.getElementById("denyButton"),
    receiptCard: document.getElementById("receiptCard"),
    receiptTitle: document.getElementById("receiptTitle"),
    receiptSummary: document.getElementById("receiptSummary"),
    receiptEvidence: document.getElementById("receiptEvidence"),
    taskTimeline: document.getElementById("taskTimeline"),
    agentLiveCard: document.getElementById("agentLiveCard"),
    agentStatusLabel: document.getElementById("agentStatusLabel"),
    agentStatusText: document.getElementById("agentStatusText"),
    agentStatusMeta: document.getElementById("agentStatusMeta"),
    taskWorkspace: document.getElementById("taskWorkspace"),
    taskRuntimeModel: document.getElementById("taskRuntimeModel"),
    taskArtifactList: document.getElementById("taskArtifactList"),
    taskAcceptanceList: document.getElementById("taskAcceptanceList"),
    proofState: document.getElementById("proofState"),
    proofEstimate: document.getElementById("proofEstimate"),
    proofMaximum: document.getElementById("proofMaximum"),
    proofActual: document.getElementById("proofActual"),
    proofCheckpoint: document.getElementById("proofCheckpoint"),
    swapButton: document.getElementById("swapButton"),
    pauseButton: document.getElementById("pauseButton"),
    cancelButton: document.getElementById("cancelButton"),
    taskActions: document.getElementById("taskActions"),
    followupComposer: document.getElementById("followupComposer"),
    followupPrompt: document.getElementById("followupPrompt"),
    followupSend: document.getElementById("followupSend"),
    taskModelButton: document.getElementById("taskModelButton"),
    playbackControls: document.getElementById("playbackControls"),
    playbackComposer: document.getElementById("playbackComposer"),
    playbackPrompt: document.getElementById("playbackPrompt"),
    playbackModel: document.getElementById("playbackModel"),
    playbackPause: document.getElementById("playbackPause"),
    playbackNext: document.getElementById("playbackNext"),
    pairPlayer: document.getElementById("pairPlayer"),
    pairingCode: document.getElementById("pairingCode"),
    playbackStatus: document.getElementById("playbackStatus")
  };

  localStorage.setItem(STORAGE.session, state.sessionId);
  if (!sessionIsUsable) localStorage.removeItem(STORAGE.token);

  function connectNativeRuntime() {
    const bridge = window.webkit?.messageHandlers?.polyswapNative;
    if (!bridge || state.demo || !state.accessToken) return;
    bridge.postMessage({ type: "connect", sessionId: state.sessionId, accessToken: state.accessToken });
  }

  function createSessionId() {
    const suffix = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    return "anon_" + suffix.replace(/-/g, "_");
  }

  function findModel(id) {
    return models.find((model) => model.id === id);
  }

  function money(value) {
    const numeric = Number(value || 0);
    return numeric < 0.01 ? "$" + numeric.toFixed(3) : "$" + numeric.toFixed(2);
  }

  function timeLabel(value) {
    if (!value) return "Just now";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Just now";
    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
    if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function statusLabel(status) {
    const labels = {
      queued: "Queued",
      running: "Working",
      recovering: "Recovering",
      background: "Working",
      paused: "Paused",
      waiting_for_human: "Needs you",
      waiting_for_approval: "Needs you",
      blocked: "Blocked",
      ready: "Ready",
      completed: "Done",
      completed_unverified: "Review result",
      failed: "Failed",
      cancelled: "Cancelled"
    };
    return labels[status] || "Queued";
  }

  function kindFor(goal) {
    const text = goal.toLowerCase();
    if (/call|phone|dial|voicemail/.test(text)) return "call";
    if (/email|message|inbox|follow up/.test(text)) return "email";
    if (/code|build|fix|repository|repo|website/.test(text)) return "coding";
    if (/apply|submit|form|research|find|internet|web/.test(text)) return "browser";
    return "work";
  }

  function titleFor(goal) {
    const normalized = goal.trim().replace(/\s+/g, " ");
    if (normalized.length <= 64) return normalized;
    return normalized.slice(0, 61).trimEnd() + "…";
  }

  function demoMediaRequest(goal) {
    const match = goal.trim().replace(/\s+/g, " ").match(/^(?:hey[, ]+)?(?:please\s+)?(?:(?:can|could|would)\s+you\s+)?(?:play|listen\s+to)\s+(.+?)(?:\s+(?:for\s+me|on\s+my\s+phone|on\s+iphone))?[.!?]*$/i);
    if (!match || /\b(chess|game|movie|video game|tic tac toe)\b/i.test(match[1])) return null;
    const query = match[1].trim().replace(/^(?:some|a)\s+/i, "").slice(0, 180);
    if (!query) return null;
    const isDrake = /\bdrake\b/i.test(query);
    return {
      title: "Play " + query,
      summary: (isDrake ? "Drake - Pipe Down (Audio)" : "YouTube player preview") + " is ready to play inside PolySwap.",
      media: {
        type: "media",
        provider: "youtube",
        videoId: isDrake ? "ZIu-V_xEehs" : "M7lc1UVf-VE",
        title: isDrake ? "Drake - Pipe Down (Audio)" : "YouTube player preview",
        author: isDrake ? "DrakeVEVO" : "YouTube Developers",
        url: "https://www.youtube.com/watch?v=" + (isDrake ? "ZIu-V_xEehs" : "M7lc1UVf-VE"),
        candidates: isDrake ? [
          { videoId: "ZIu-V_xEehs", title: "Drake - Pipe Down (Audio)", author: "DrakeVEVO", url: "https://www.youtube.com/watch?v=ZIu-V_xEehs" },
          { videoId: "uxpDa-c-4Mc", title: "Drake - Hotline Bling", author: "DrakeVEVO", url: "https://www.youtube.com/watch?v=uxpDa-c-4Mc" }
        ] : [
          { videoId: "M7lc1UVf-VE", title: "YouTube player preview", author: "YouTube Developers", url: "https://www.youtube.com/watch?v=M7lc1UVf-VE" }
        ]
      }
    };
  }

  function quoteFor(goal, model) {
    const lengthFactor = Math.min(2.2, Math.max(0.8, goal.trim().length / 180));
    return Math.max(0.001, Math.ceil(model.quote * lengthFactor * 1000) / 1000);
  }

  function privacyLabel(model) {
    if (model.route === "cloudflare") return "Cloudflare-hosted";
    if (model.privacy === "zdr") return "OpenRouter · zero retention";
    return "Private route chosen per job";
  }

  function updateComposer() {
    const model = state.selectedModel;
    els.modelName.textContent = model.short;
    els.modelIcon.src = providerIcon(model);
    els.send.disabled = !els.prompt.value.trim();
    els.prompt.style.height = "auto";
    els.prompt.style.height = Math.min(els.prompt.scrollHeight, 132) + "px";
  }

  function renderAttachment() {
    const attachment = state.pendingAttachment;
    els.attachmentChip.hidden = !attachment;
    if (attachment) els.attachmentChip.querySelector("span").textContent = attachment.name;
  }

  async function chooseAttachment(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 30000) {
      setRuntimeNote("That file is too large for this alpha · keep text attachments under 30 KB", "error");
      return;
    }
    try {
      const content = await file.text();
      if (!content.trim()) throw new Error("That file has no readable text.");
      state.pendingAttachment = { name: file.name.slice(0, 160), content: content.slice(0, 30000) };
      renderAttachment();
      els.prompt.focus();
    } catch (error) {
      setRuntimeNote(error.message || "PolySwap could not read that attachment.", "error");
    }
  }

  function clearAttachment() {
    state.pendingAttachment = null;
    renderAttachment();
  }

  function providerIcon(model) {
    if (model.id.includes("deepseek")) return "assets/providers/deepseek.svg";
    if (model.id.includes("llama")) return "assets/providers/meta.svg";
    if (model.id.startsWith("google/")) return "assets/providers/gemini.svg";
    if (model.id.startsWith("anthropic/")) return "assets/providers/anthropic.svg";
    if (model.id.startsWith("openai/")) return "assets/providers/openai.svg";
    return "assets/polyswap-mark.png?v=2";
  }

  function setRuntimeNote(message, tone) {
    const visible = tone === "error" || tone === "success";
    els.statusBanner.hidden = !visible;
    if (!visible) return;
    els.statusBanner.textContent = message;
    els.statusBanner.className = "status-banner " + (tone === "preview" ? "preview" : tone === "error" ? "error" : "success");
    if (tone === "success") window.setTimeout(() => { els.statusBanner.hidden = true; }, 2600);
  }

  async function api(path, options) {
    const init = options ? { ...options } : {};
    const headers = new Headers(init.headers || {});
    if (state.accessToken) headers.set("X-PolySwap-Access", state.accessToken);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    init.headers = headers;
    const response = await fetch(apiRoot + path, init);
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      const message = typeof payload === "object"
        ? payload?.error?.message || payload?.error || "Request failed"
        : payload || "Request failed";
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  async function ensureOpenAccess() {
    if (state.demo || state.accessToken) return true;
    if (state.accessPromise) return state.accessPromise;
    state.accessPromise = api("/v1/access/anonymous", {
      method: "POST",
      body: JSON.stringify({ sessionId: state.sessionId })
    }).then((payload) => {
      state.accessToken = payload.accessToken;
      localStorage.setItem(STORAGE.token, payload.accessToken);
      connectNativeRuntime();
      return true;
    }).finally(() => {
      state.accessPromise = null;
    });
    return state.accessPromise;
  }

  function modelFromApi(profile) {
    const label = profile.label || profile.id?.split("/").pop() || "Model";
    return {
      id: profile.id,
      name: label,
      short: label.startsWith("Auto ·") ? "Auto" : label,
      provider: profile.provider || "PolySwap",
      route: profile.route || "cloudflare",
      privacy: profile.privacy || "cloudflare",
      detail: profile.detail || "Ready for PolySwap jobs",
      quote: Number(profile.estimatedUsd || 0),
      available: Boolean(profile.available),
      tone: profile.route === "openrouter" ? "violet" : "blue",
      unavailableReason: profile.unavailableReason || "This intelligence is not available."
    };
  }

  async function loadModels() {
    try {
      const payload = await api("/v1/cloud-models");
      const liveModels = (payload.models || []).map(modelFromApi).filter((model) => model.id);
      if (!liveModels.length) return;
      const selectedId = localStorage.getItem(STORAGE.model) || state.selectedModel.id;
      models = liveModels;
      state.selectedModel = findModel(selectedId)?.available
        ? findModel(selectedId)
        : models.find((model) => model.id === "polyswap/auto" && model.available) || models.find((model) => model.available) || models[0];
      renderModels();
      updateComposer();
    } catch (_) {
      // The included fallback models keep the composer useful if catalog refresh fails.
    }
  }

  function demoSeed() {
    const stored = localStorage.getItem(STORAGE.demoJobs);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {
        localStorage.removeItem(STORAGE.demoJobs);
      }
    }

    const now = Date.now();
    return [
      {
        id: "demo-running",
        title: "Research instrumentation roles near Detroit",
        goal: "Find five instrumentation or controls engineering roles near Detroit that fit my physical-systems background.",
        kind: "browser",
        status: "running",
        modelId: "openai/gpt-5.6-luna",
        modelRoute: "openai",
        privacyMode: "private",
        permissionProfile: "ask",
        workspace: "Cloud workspace",
        acceptanceCriteria: ["Return five verified roles", "Link the official application pages", "Explain fit and salary when available"],
        estimatedUsd: 0.06,
        budgetUsd: 0.25,
        actualUsd: 0.021,
        currentInstruction: "Checking official employer listings and removing stale postings.",
        createdAt: new Date(now - 12 * 60000).toISOString(),
        updatedAt: new Date(now - 45000).toISOString(),
        events: [
          { type: "created", message: "Job accepted and cost ceiling locked at $0.25.", createdAt: new Date(now - 12 * 60000).toISOString() },
          { type: "claimed", message: "Private cloud runtime started with Luna.", createdAt: new Date(now - 11 * 60000).toISOString() },
          { type: "checkpoint", message: "Three verified roles found; checking two more.", createdAt: new Date(now - 45000).toISOString() }
        ],
        approvals: []
      },
      {
        id: "demo-approval",
        title: "Submit the Vector Dynamics application",
        goal: "Tailor my resume and submit the controls engineer application at Vector Dynamics.",
        kind: "browser",
        status: "waiting_for_human",
        modelId: "deepseek/deepseek-v4-flash",
        modelRoute: "openrouter",
        privacyMode: "zdr",
        permissionProfile: "ask",
        workspace: "Cloud workspace",
        acceptanceCriteria: ["Use the approved resume", "Do not invent qualifications", "Return the confirmation number and screenshot"],
        estimatedUsd: 0.02,
        budgetUsd: 0.15,
        actualUsd: 0.014,
        currentInstruction: "Waiting before sending your resume and final application.",
        createdAt: new Date(now - 38 * 60000).toISOString(),
        updatedAt: new Date(now - 3 * 60000).toISOString(),
        events: [
          { type: "created", message: "Job accepted. Resume access is limited to this job.", createdAt: new Date(now - 38 * 60000).toISOString() },
          { type: "checkpoint", message: "Application is complete and ready to submit.", createdAt: new Date(now - 4 * 60000).toISOString() },
          { type: "approval_requested", message: "Approval required before the external submission.", createdAt: new Date(now - 3 * 60000).toISOString() }
        ],
        approvals: [
          { id: "approval-submit", status: "pending", action: "Submit application", summary: "Send your tailored resume and application to Vector Dynamics.", createdAt: new Date(now - 3 * 60000).toISOString() }
        ]
      },
      {
        id: "demo-complete",
        title: "Compare three low-cost PCB assembly quotes",
        goal: "Find and compare three small-run PCB assembly vendors for 25 units.",
        kind: "browser",
        status: "completed",
        modelId: "polyswap/auto",
        modelRoute: "polyswap",
        privacyMode: "private",
        permissionProfile: "read-only",
        workspace: "Cloud workspace",
        acceptanceCriteria: ["Use comparable specifications", "Show landed cost", "Link primary quotes"],
        estimatedUsd: 0.04,
        budgetUsd: 0.20,
        actualUsd: 0.037,
        resultSummary: "JLCPCB was the lowest landed estimate; MacroFab was fastest for the quoted configuration.",
        receiptSummary: "3 vendor quotes checked · 3 primary links · 1 comparison table",
        evidence: [{ label: "Quote comparison", url: "#" }, { label: "Vendor sources", url: "#" }],
        createdAt: new Date(now - 28 * 3600000).toISOString(),
        updatedAt: new Date(now - 25 * 3600000).toISOString(),
        completedAt: new Date(now - 25 * 3600000).toISOString(),
        events: [
          { type: "completed", message: "All acceptance criteria verified. Final cost: $0.037.", createdAt: new Date(now - 25 * 3600000).toISOString() }
        ],
        approvals: []
      }
    ];
  }

  function persistDemo() {
    localStorage.setItem(STORAGE.demoJobs, JSON.stringify(state.jobs));
  }

  async function loadJobs(options) {
    const quiet = options?.quiet;
    try {
      const payload = state.demo
        ? { jobs: demoSeed() }
        : await api("/v1/jobs?sessionId=" + encodeURIComponent(state.sessionId));
      const nextJobs = payload.jobs || [];
      const newlyReadyMedia = nextJobs.find((job) => {
        if (job.kind !== "media" || job.status !== "ready") return false;
        return state.jobs.find((current) => current.id === job.id)?.status !== "ready";
      });
      if (newlyReadyMedia) state.expandedJobId = newlyReadyMedia.id;
      if (!state.demo) await loadPlayback({ quiet: true });
      notifyTransitions(nextJobs);
      state.jobs = nextJobs;
      renderJobs();
      updateNotificationPrompt();
      if (!quiet && state.demo) setRuntimeNote("Preview mode · no work is sent", "preview");
      const expanded = state.expandedJobId && state.jobs.find((job) => job.id === state.expandedJobId);
      const expandedDetail = expanded && state.jobDetails.get(expanded.id);
      if (expanded && expanded.updatedAt !== expandedDetail?.updatedAt && !state.demo) {
        const detail = await api("/v1/jobs/" + encodeURIComponent(expanded.id) + "?sessionId=" + encodeURIComponent(state.sessionId));
        state.jobDetails.set(expanded.id, detail.job);
        renderJobs();
      }
      if (els.taskDialog.open && state.activeJob) {
        const current = nextJobs.find((job) => job.id === state.activeJob.id);
        if (current && current.updatedAt !== state.activeJob.updatedAt) {
          const detail = state.demo
            ? current
            : (await api("/v1/jobs/" + encodeURIComponent(current.id) + "?sessionId=" + encodeURIComponent(state.sessionId))).job;
          state.activeJob = detail;
          state.jobDetails.set(detail.id, detail);
          renderJobDetail(detail);
        }
      }
      focusJobFromHash();
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        state.accessToken = "";
        localStorage.removeItem(STORAGE.token);
        if (!state.demo && !options?.retried) {
          try {
            await ensureOpenAccess();
            return loadJobs({ ...(options || {}), retried: true });
          } catch (accessError) {
            setRuntimeNote("PolySwap could not connect · " + accessError.message, "error");
            return;
          }
        }
      }
      setRuntimeNote("PolySwap could not connect · " + error.message, "error");
    }
  }

  async function loadPlayback(options) {
    try {
      const payload = await api("/v1/playback?sessionId=" + encodeURIComponent(state.sessionId));
      const previousRevision = state.playbackRevision;
      state.playback = payload.playback;
      state.playbackRevision = Number(payload.playback?.revision || 0);
      if (previousRevision >= 0 && state.playbackRevision !== previousRevision) applyPlaybackToWebPlayers(payload.playback);
      if (state.expandedJobId) renderJobs();
    } catch (error) {
      if (!options?.quiet) setRuntimeNote("The player could not connect · " + error.message, "error");
    }
  }

  function applyPlaybackToWebPlayers(playback) {
    state.mediaPlayers.forEach((player) => {
      try {
        if (playback.lastCommand === "pause") player.pauseVideo();
        else if (playback.lastCommand === "stop") player.stopVideo();
        else if (playback.lastCommand === "next") player.nextVideo();
        else if (playback.lastCommand === "previous") player.previousVideo();
        else if (playback.lastCommand === "resume") player.playVideo();
      } catch (_) {}
    });
  }

  function notifyTransitions(nextJobs) {
    nextJobs.forEach((job) => {
      const previous = state.previousStatuses.get(job.id);
      if (previous && previous !== job.status && (job.status === "ready" || ATTENTION.has(job.status) || TERMINAL.has(job.status))) {
        const body = job.status === "ready"
          ? "Your music is ready on the paired iPhone player."
          : ATTENTION.has(job.status)
          ? "PolySwap needs one answer to continue."
          : job.status === "completed" ? "Your job is done and is now under Past." : "Your job stopped. Tap to expand it.";
        showNotification(job.title, body, job.id);
      }
      state.previousStatuses.set(job.id, job.status);
    });
  }

  async function showNotification(title, body, jobId) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
      const registration = state.serviceWorker || await navigator.serviceWorker?.ready;
      if (registration) {
        await registration.showNotification(title, {
          body,
          icon: "/assets/polyswap-mark.png?v=2",
          badge: "/assets/polyswap-mark.png?v=2",
          data: { url: "/mobile.html#job=" + encodeURIComponent(jobId) }
        });
      } else {
        new Notification(title, { body });
      }
    } catch (_) {
      // Notification delivery is best-effort while the page is open.
    }
  }

  function renderJobs() {
    const nextRenderKey = JSON.stringify({
      jobs: state.jobs,
      expandedJobId: state.expandedJobId,
      expandedDetail: state.expandedJobId ? state.jobDetails.get(state.expandedJobId) || null : null,
      playback: state.playback ? {
        revision: state.playback.revision,
        desiredState: state.playback.desiredState,
        lastCommand: state.playback.lastCommand,
        error: state.playback.error,
        deviceConnected: Boolean(state.playback.device?.connected),
        deviceRevision: state.playback.device?.appliedRevision
      } : null,
      pairingCode: state.pairingCode
    });
    if (nextRenderKey === state.renderKey) return;
    state.renderKey = nextRenderKey;
    destroyMediaPlayers();
    const active = state.jobs.filter((job) => !TERMINAL.has(job.status));
    const past = state.jobs.filter((job) => TERMINAL.has(job.status));
    renderJobGroup(els.activeList, active, "Send a job above. It will keep running here after you leave.");
    renderJobGroup(els.pastList, past, "Finished jobs will appear here.");
    els.activeCount.textContent = String(active.length);
    els.pastCount.textContent = String(past.length);
    els.activityTotal.textContent = active.length ? active.length + " active" : String(past.length);
  }

  function setActivityOpen(open) {
    state.activityOpen = Boolean(open);
    els.activityToggle.setAttribute("aria-expanded", String(state.activityOpen));
    els.activityDrawer.hidden = !state.activityOpen;
  }

  function renderJobGroup(list, jobs, emptyMessage) {
    list.replaceChildren();
    jobs.forEach((job) => list.appendChild(renderJob(job)));
    if (!jobs.length) {
      const empty = document.createElement("p");
      empty.className = "empty-tasks";
      empty.textContent = emptyMessage;
      list.appendChild(empty);
    }
  }

  function renderJob(job) {
    const node = els.taskTemplate.content.firstElementChild.cloneNode(true);
    const summary = node.querySelector(".task-summary");
    const inline = node.querySelector(".task-inline");
    const model = findModel(job.modelId) || { short: job.modelId?.split("/").pop() || "Model" };
    node.dataset.jobId = job.id;
    node.dataset.status = job.status;
    node.querySelector(".task-copy strong").textContent = job.title || titleFor(job.goal || "Untitled job");
    node.querySelector(".task-copy small").textContent = plainJobUpdate(job) + " · " + model.short;
    node.querySelector(".task-meta em").textContent = job.kind === "phone" && job.status === "waiting_for_human" ? "Ready" : statusLabel(job.status);
    node.querySelector(".task-meta time").textContent = timeLabel(job.updatedAt || job.createdAt);
    summary.setAttribute("aria-expanded", "false");
    inline.hidden = true;
    summary.addEventListener("click", () => openJob(job.id));
    return node;
  }

  function renderInlineJob(container, job) {
    container.replaceChildren();

    const mediaEvidence = job.evidence || job.receipt?.evidence || [];
    const hasReadyVideo = job.kind === "media" && mediaEvidence.some(isYouTubeMedia);
    if (!hasReadyVideo) {
      const update = document.createElement("p");
      update.className = "inline-update";
      update.textContent = job.currentInstruction || plainJobUpdate(job) + ".";
      container.appendChild(update);
    }

    const pending = (job.approvals || []).find((approval) => approval.status === "pending");
    if (pending) {
      const attention = document.createElement("section");
      attention.className = "inline-attention";
      const title = document.createElement("strong");
      title.textContent = pending.title || pending.action || "PolySwap needs you";
      const detail = document.createElement("p");
      detail.textContent = pending.description || pending.summary || "Approve this one action so the job can continue.";
      const actions = document.createElement("div");
      actions.className = "inline-actions";
      actions.append(
        actionButton("Deny", "quiet", () => actOnJob(job, "deny", { approvalId: pending.id })),
        actionButton("Allow once", "primary", () => actOnJob(job, "approve", { approvalId: pending.id }))
      );
      attention.append(title, detail, actions);
      container.appendChild(attention);
    }

    if (job.kind === "media") renderInlinePlayback(container, job);

    const result = job.resultSummary || job.receipt?.summary || "";
    if (result && job.kind !== "media") {
      const receipt = document.createElement("section");
      receipt.className = "inline-result";
      const label = document.createElement("small");
      label.textContent = "Result";
      const text = document.createElement("p");
      text.textContent = result;
      receipt.append(label, text);
      (job.receipt?.evidence || []).slice(0, 8).forEach((evidence) => {
        if (typeof evidence !== "object" || !evidence.url || evidence.url === "#") return;
        const link = document.createElement("a");
        link.href = evidence.url;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = evidence.label || "Open evidence";
        receipt.appendChild(link);
      });
      container.appendChild(receipt);
    }

    const controls = document.createElement("div");
    controls.className = "inline-actions inline-job-actions";
    if (TERMINAL.has(job.status)) {
      controls.appendChild(actionButton("Run again", "primary", () => duplicateJob(job)));
    } else if (job.kind !== "media") {
      controls.append(
        actionButton("Change model", "primary", () => {
          state.swapJobId = job.id;
          renderModels();
          els.modelDialog.showModal();
        }),
        actionButton(job.status === "paused" ? "Resume" : "Pause", "quiet", () => actOnJob(job, job.status === "paused" ? "resume" : "pause")),
        actionButton("Cancel", "danger", () => actOnJob(job, "cancel"))
      );
    }
    if (controls.children.length) container.appendChild(controls);
  }

  function renderInlinePlayback(container, job) {
    const evidence = job.evidence || job.receipt?.evidence || [];
    const media = evidence.find(isYouTubeMedia);
    const card = document.createElement("section");
    card.className = media ? "inline-player media-only" : "inline-player";
    if (media) {
      const mediaResult = document.createElement("div");
      renderYouTubePlayer(mediaResult, media);
      card.appendChild(mediaResult);
    } else {
      const title = document.createElement("strong");
      title.textContent = "Finding the video…";
      card.appendChild(title);
    }
    container.appendChild(card);
  }

  function actionButton(label, tone, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "inline-button " + tone;
    button.textContent = label;
    button.addEventListener("click", async () => {
      button.disabled = true;
      try { await handler(); } finally { button.disabled = false; }
    });
    return button;
  }

  async function toggleInlineJob(jobId, options) {
    if (state.expandedJobId === jobId && !options?.forceOpen) {
      state.expandedJobId = "";
      renderJobs();
      return;
    }
    state.expandedJobId = jobId;
    try {
      if (!state.demo) {
        const payload = await api("/v1/jobs/" + encodeURIComponent(jobId) + "?sessionId=" + encodeURIComponent(state.sessionId));
        state.jobDetails.set(jobId, payload.job);
        replaceJob(payload.job);
      } else {
        const job = state.jobs.find((item) => item.id === jobId);
        if (job) state.jobDetails.set(jobId, job);
      }
    } catch (error) {
      setRuntimeNote("Could not refresh that job · " + error.message, "error");
    }
    renderJobs();
    window.setTimeout(() => document.querySelector('[data-job-id="' + CSS.escape(jobId) + '"]')?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 0);
  }

  function plainJobUpdate(job) {
    if (job.status === "queued") return "Waiting to start";
    if (job.status === "running" || job.status === "background" || job.status === "recovering") return "Working";
    if (job.status === "ready") return state.playback?.device?.connected ? "Playing on this iPhone" : "Ready";
    if (ATTENTION.has(job.status)) return "Waiting for you";
    if (job.status === "completed") return "Done";
    if (job.status === "completed_unverified") return "Ready to review";
    if (job.status === "failed") return job.error || "Stopped";
    if (job.status === "cancelled") return "Cancelled";
    return job.resultSummary || "Saved";
  }

  function progressFor(status) {
    if (status === "queued") return "12%";
    if (status === "running" || status === "background") return "58%";
    if (status === "recovering") return "42%";
    if (ATTENTION.has(status) || status === "paused") return "72%";
    if (TERMINAL.has(status)) return "100%";
    return "20%";
  }

  async function createJob(event) {
    event.preventDefault();
    const goal = els.prompt.value.trim();
    if (!goal) return;
    const model = state.selectedModel;
    if (!model.available) {
      setRuntimeNote(model.detail, "error");
      return;
    }
    const payload = {
      sessionId: state.sessionId,
      goal,
      title: titleFor(goal),
      kind: kindFor(goal),
      modelId: model.id,
      modelRoute: model.route,
      privacyMode: model.privacy,
      permissionProfile: "ask",
      workspace: "Cloud workspace",
      acceptanceCriteria: [
        "Complete the requested work without inventing facts",
        "Pause before any consequential external action",
        "Return a result, cost, and evidence receipt"
      ],
      estimatedUsd: quoteFor(goal, model),
      budgetUsd: DEFAULT_BUDGET_USD,
      background: true,
      attachments: state.pendingAttachment ? [state.pendingAttachment] : []
    };
    els.send.disabled = true;
    try {
      await startJob(payload);
    } catch (error) {
      setRuntimeNote("Could not start the job · " + error.message, "error");
    } finally {
      updateComposer();
    }
  }

  async function startJob(payload) {
    let job;
    if (state.demo) {
      const now = new Date().toISOString();
      const mediaRequest = demoMediaRequest(payload.goal);
      job = {
        id: "demo-" + Date.now(),
        ...payload,
        ...(mediaRequest ? {
          title: mediaRequest.title,
          kind: "media",
          modelId: "polyswap/media-agent",
          modelRoute: "polyswap",
          privacyMode: "standard",
          estimatedUsd: 0,
          budgetUsd: 0,
          resultSummary: mediaRequest.summary,
          receipt: { status: "playable_media", summary: mediaRequest.summary, evidence: [mediaRequest.media], actualUsd: 0 }
        } : {}),
        status: mediaRequest ? "ready" : "queued",
        actualUsd: 0,
        currentInstruction: mediaRequest ? "Ready to play inside PolySwap." : "Waiting to start",
        createdAt: now,
        updatedAt: now,
        events: [{ type: mediaRequest ? "ready" : "created", message: mediaRequest ? "The player is ready inside PolySwap." : "Preview job created. No work was sent.", createdAt: now }],
        approvals: []
      };
      state.jobs.unshift(job);
      persistDemo();
      if (!mediaRequest) window.setTimeout(() => advanceDemo(job.id), 1400);
    } else {
      const response = await api("/v1/jobs", { method: "POST", body: JSON.stringify(payload) });
      job = response.job;
      state.jobs.unshift(job);
    }
    if (job.kind === "media") state.expandedJobId = job.id;
    els.prompt.value = "";
    clearAttachment();
    updateComposer();
    renderJobs();
    updateNotificationPrompt();
    setActivityOpen(false);
    els.prompt.blur();
  }

  function advanceDemo(jobId) {
    const job = state.jobs.find((item) => item.id === jobId);
    if (!job || job.status !== "queued") return;
    job.status = "running";
    job.currentInstruction = "Previewing how the PolySwap harness would claim and execute this job.";
    job.updatedAt = new Date().toISOString();
    job.events.push({ type: "claimed", message: "Preview runtime claimed the job.", createdAt: job.updatedAt });
    state.jobDetails.set(job.id, job);
    persistDemo();
    renderJobs();
  }

  function renderModels() {
    els.modelList.replaceChildren();
    models.forEach((model) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "model-option";
      if (model.id === state.selectedModel.id) button.classList.add("selected");
      if (!model.available) {
        button.disabled = true;
        button.classList.add("unavailable");
      }
      button.innerHTML = '<img alt=""><span><strong></strong><small></small></span><em></em>';
      button.querySelector("img").src = providerIcon(model);
      button.querySelector("strong").textContent = model.name;
      button.querySelector("small").textContent = model.detail;
      button.querySelector("em").textContent = model.available ? money(model.quote) + " est." : "offline";
      button.addEventListener("click", async () => {
        if (state.swapJobId) {
          await swapJob(state.swapJobId, model);
        } else {
          state.selectedModel = model;
          localStorage.setItem(STORAGE.model, model.id);
          updateComposer();
          if (els.playbackModel) els.playbackModel.textContent = model.short;
        }
        state.swapJobId = null;
        els.modelDialog.close();
        renderModels();
      });
      els.modelList.appendChild(button);
    });
  }

  async function openJob(jobId, options) {
    let job = state.jobs.find((item) => item.id === jobId);
    if (!job) return;
    try {
      if (!state.demo) {
        const payload = await api("/v1/jobs/" + encodeURIComponent(jobId) + "?sessionId=" + encodeURIComponent(state.sessionId));
        job = payload.job;
        const index = state.jobs.findIndex((item) => item.id === jobId);
        if (index >= 0) state.jobs[index] = job;
      }
      state.activeJob = job;
      state.taskView = "chat";
      renderJobDetail(job);
      setTaskView("chat");
      els.taskActions.hidden = true;
      if (!els.taskDialog.open) els.taskDialog.showModal();
      if (!options?.preserveHash) history.replaceState(null, "", window.location.pathname + window.location.search + "#job=" + encodeURIComponent(jobId));
    } catch (error) {
      setRuntimeNote("Could not open that job · " + error.message, "error");
    }
  }

  function renderJobDetail(job) {
    els.taskDetailId.textContent = job.title || "PolySwap job";
    els.taskDetailStatus.textContent = job.kind === "media" && job.status === "ready"
      ? "Ready in PolySwap"
      : job.kind === "phone" && job.status === "waiting_for_human"
      ? "Ready on this iPhone"
      : statusLabel(job.status) + (Number(job.actualUsd) ? " · " + money(job.actualUsd) : "");
    els.taskDetailTitle.textContent = job.title;
    els.taskDetailGoal.textContent = job.goal;
    const activeModel = findModel(job.modelId) || { short: job.modelId?.split("/").pop() || "Model" };
    els.taskModelButton.textContent = activeModel.short;
    renderLiveState(job, activeModel);
    renderArtifacts(job, activeModel);
    renderProof(job);
    els.followupComposer.hidden = job.kind === "media";
    destroyMediaPlayers();
    renderConversation(job);

    const pending = (job.approvals || []).find((approval) => approval.status === "pending");
    els.approvalCard.hidden = !pending;
    if (pending) {
      els.approvalTitle.textContent = pending.action || pending.title || "Allow this action?";
      els.approvalDescription.textContent = pending.summary || pending.description || "PolySwap paused before a consequential external action.";
      els.approvalResource.textContent = pending.resource || "The runtime will continue only after this one-time approval.";
      els.approveButton.onclick = () => actOnJob(job, "approve", { approvalId: pending.id });
      els.denyButton.onclick = () => actOnJob(job, "deny", { approvalId: pending.id });
    }

    const receiptEvidence = job.evidence || job.receipt?.evidence || [];
    const receiptSummary = job.receiptSummary || job.receipt?.summary || "";
    const hasReceipt = Boolean(job.resultSummary || receiptSummary || receiptEvidence.length);
    els.receiptCard.hidden = !hasReceipt;
    els.receiptEvidence.replaceChildren();
    if (hasReceipt) {
      els.receiptTitle.textContent = job.kind === "media" ? "Now playing" : job.kind === "phone" ? "Choose where to play it" : job.status === "completed" ? "Done" : "Result";
      els.receiptSummary.textContent = job.resultSummary || receiptSummary || "PolySwap returned a result.";
      if (receiptSummary && job.resultSummary && receiptSummary !== job.resultSummary) {
        const receipt = document.createElement("li");
        receipt.textContent = receiptSummary;
        els.receiptEvidence.appendChild(receipt);
      }
      receiptEvidence.forEach((evidence) => {
        const item = document.createElement("li");
        if (isYouTubeMedia(evidence)) {
          if (job.kind === "media") {
            item.textContent = evidence.title || "Playable media resolved";
          } else {
            renderYouTubePlayer(item, evidence);
          }
        } else if (typeof evidence === "object" && safeExternalUrl(evidence.url)) {
          const link = document.createElement("a");
          link.href = safeExternalUrl(evidence.url);
          link.target = "_blank";
          link.rel = "noopener";
          link.textContent = evidence.label || "Open evidence";
          if (job.kind === "phone") {
            link.className = "phone-action";
            link.addEventListener("click", () => markPhoneActionOpened(job, evidence.label));
          }
          item.appendChild(link);
        } else {
          item.textContent = typeof evidence === "string" ? evidence : evidence.label || "Evidence recorded";
        }
        els.receiptEvidence.appendChild(item);
      });
    }

    renderTimeline(job);
    renderPlaybackControls(job);
    const terminal = TERMINAL.has(job.status);
    els.taskMenu.hidden = job.kind === "phone" || job.kind === "media";
    els.taskActions.hidden = true;
    els.swapButton.textContent = terminal ? "Run again" : "Change model";
    els.swapButton.onclick = terminal ? () => duplicateJob(job) : () => {
      state.swapJobId = job.id;
      renderModels();
      els.modelDialog.showModal();
    };
    els.pauseButton.disabled = terminal || ATTENTION.has(job.status);
    els.pauseButton.textContent = job.status === "paused" ? "Resume" : "Pause";
    els.pauseButton.onclick = () => actOnJob(job, job.status === "paused" ? "resume" : "pause");
    els.cancelButton.disabled = terminal;
    els.cancelButton.onclick = () => actOnJob(job, "cancel");
  }

  function setTaskView(view) {
    const allowed = new Set(["chat", "live", "files", "proof"]);
    state.taskView = allowed.has(view) ? view : "chat";
    const views = [
      ["chat", els.taskChatTab, els.taskChatPane],
      ["live", els.taskLiveTab, els.taskLivePane],
      ["files", els.taskFilesTab, els.taskFilesPane],
      ["proof", els.taskProofTab, els.taskProofPane]
    ];
    views.forEach(([name, tab, pane]) => {
      tab.classList.toggle("active", state.taskView === name);
      tab.setAttribute("aria-selected", String(state.taskView === name));
      pane.hidden = state.taskView !== name;
    });
  }

  function renderLiveState(job, activeModel) {
    const status = String(job.status || "queued");
    const isTerminal = TERMINAL.has(status);
    const needsAttention = ATTENTION.has(status);
    els.agentLiveCard.dataset.status = status;
    els.agentStatusLabel.textContent = needsAttention
      ? "PolySwap needs you"
      : isTerminal
      ? status === "completed" ? "PolySwap finished" : "PolySwap stopped"
      : "PolySwap is working";
    els.agentStatusText.textContent = job.currentInstruction || plainJobUpdate(job);
    els.agentStatusMeta.textContent = [
      job.workspace || "Cloud workspace",
      activeModel.name || activeModel.short,
      statusLabel(status)
    ].filter(Boolean).join(" · ");
  }

  function renderArtifacts(job, activeModel) {
    els.taskWorkspace.textContent = job.workspace || "Cloud workspace";
    els.taskRuntimeModel.textContent = activeModel.name || activeModel.short;
    els.taskArtifactList.replaceChildren();

    const artifacts = [];
    (job.evidence || job.receipt?.evidence || []).forEach((evidence) => {
      if (typeof evidence === "string") artifacts.push({ label: evidence, kind: "Evidence" });
      else if (evidence) artifacts.push({
        label: evidence.label || evidence.title || "Evidence recorded",
        detail: evidence.detail || evidence.summary || evidence.type || "",
        url: safeExternalUrl(evidence.url),
        kind: isYouTubeMedia(evidence) ? "Media" : evidence.kind || "Evidence"
      });
    });
    (job.events || []).filter((event) => event.kind === "attachment_context" || event.type === "attachment_context").forEach((event) => {
      artifacts.push({ label: event.label || "Attached file", detail: event.message || event.detail || "Input context", kind: "Input" });
    });

    if (!artifacts.length) {
      const empty = document.createElement("div");
      empty.className = "artifact-empty";
      empty.innerHTML = "<strong>No artifacts yet</strong><span>Files, links, and evidence will appear here as the agent returns them.</span>";
      els.taskArtifactList.appendChild(empty);
      return;
    }

    artifacts.forEach((artifact, index) => {
      const row = document.createElement(artifact.url && artifact.url !== "#" ? "a" : "div");
      row.className = "artifact-row";
      if (row.tagName === "A") {
        row.href = artifact.url;
        row.target = "_blank";
        row.rel = "noopener";
      }
      const indexLabel = String(index + 1).padStart(2, "0");
      row.innerHTML = "<i></i><span><strong></strong><small></small></span><em></em>";
      row.querySelector("i").textContent = indexLabel;
      row.querySelector("strong").textContent = artifact.label;
      row.querySelector("small").textContent = artifact.detail || artifact.kind;
      row.querySelector("em").textContent = row.tagName === "A" ? "↗" : artifact.kind;
      els.taskArtifactList.appendChild(row);
    });
  }

  function renderProof(job) {
    const status = String(job.status || "queued");
    els.proofState.textContent = status === "completed"
      ? "Completed with a receipt"
      : status === "completed_unverified"
      ? "Review required"
      : status === "failed" || status === "cancelled"
      ? "Work stopped"
      : ATTENTION.has(status)
      ? "Waiting for you"
      : "Work in progress";
    els.proofEstimate.textContent = Number.isFinite(Number(job.estimatedUsd)) ? money(Number(job.estimatedUsd)) : "—";
    els.proofMaximum.textContent = Number.isFinite(Number(job.budgetUsd)) ? money(Number(job.budgetUsd)) : "—";
    els.proofActual.textContent = Number.isFinite(Number(job.actualUsd)) && Number(job.actualUsd) > 0 ? money(Number(job.actualUsd)) : "Not final";
    els.proofCheckpoint.textContent = job.checkpointId || job.receipt?.checkpointId || (TERMINAL.has(status) ? "Recorded" : "Pending");

    const criteria = Array.isArray(job.acceptanceCriteria) ? job.acceptanceCriteria.filter(Boolean) : [];
    els.taskAcceptanceList.replaceChildren();
    const items = criteria.length ? criteria : ["Return a result that directly addresses the job."];
    items.forEach((criterion) => {
      const item = document.createElement("li");
      const mark = document.createElement("i");
      mark.textContent = status === "completed" ? "✓" : status === "completed_unverified" ? "!" : "·";
      const copy = document.createElement("span");
      copy.textContent = criterion;
      item.append(mark, copy);
      els.taskAcceptanceList.appendChild(item);
    });
  }

  function safeExternalUrl(value) {
    if (!value || value === "#") return "";
    try {
      const url = new URL(String(value), window.location.href);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  function renderConversation(job) {
    els.jobConversation.replaceChildren();
    const addTurn = (role, content, label, createdAt) => {
      if (!String(content || "").trim()) return;
      const turn = document.createElement("article");
      turn.className = "chat-turn " + role;
      const bubble = document.createElement("div");
      bubble.className = "turn-bubble";
      bubble.textContent = content;
      const meta = document.createElement("small");
      meta.textContent = label || (role === "user" ? "You" : "PolySwap") + (createdAt ? " · " + timeLabel(createdAt) : "");
      turn.append(bubble, meta);
      els.jobConversation.appendChild(turn);
    };

    addTurn("user", job.goal, "You", job.createdAt);
    const events = Array.isArray(job.events) ? job.events : [];
    let hasAssistantResult = false;
    events.forEach((event) => {
      const kind = event.kind || event.type || "";
      const detail = event.detail || event.message || "";
      if (kind === "attachment_context") {
        const turn = document.createElement("div");
        turn.className = "chat-progress";
        turn.innerHTML = "<i></i><span></span>";
        turn.querySelector("span").textContent = "Attached · " + (event.label || "file");
        els.jobConversation.appendChild(turn);
      } else if (kind === "user_message" && detail !== job.goal) {
        addTurn("user", detail, "You", event.createdAt);
      } else if (kind === "assistant_message") {
        hasAssistantResult = true;
        addTurn("assistant", detail, event.label || "PolySwap", event.createdAt);
      }
    });

    if (!hasAssistantResult && job.resultSummary && job.kind !== "media") {
      addTurn("assistant", job.resultSummary, "PolySwap", job.completedAt || job.updatedAt);
    }

    const media = (job.evidence || job.receipt?.evidence || []).find(isYouTubeMedia);
    if (job.kind === "media" && media) {
      const mediaTurn = document.createElement("div");
      mediaTurn.className = "chat-media";
      renderYouTubePlayer(mediaTurn, media);
      els.jobConversation.appendChild(mediaTurn);
    }

    if (!TERMINAL.has(job.status) && job.status !== "ready") {
      const progress = document.createElement("div");
      progress.className = "chat-progress working";
      progress.innerHTML = "<i></i><span></span>";
      progress.querySelector("span").textContent = job.currentInstruction || plainJobUpdate(job) + "…";
      els.jobConversation.appendChild(progress);
    }
  }

  function renderPlaybackControls(job) {
    const isMedia = job?.kind === "media";
    els.playbackControls.hidden = !isMedia;
    if (!isMedia) return;
    const playback = state.playback;
    els.playbackModel.textContent = state.selectedModel.short;
    els.playbackPause.textContent = playback?.desiredState === "paused" ? "Resume" : "Pause";
    const connected = Boolean(playback?.device?.connected);
    els.pairPlayer.hidden = connected;
    els.playbackStatus.textContent = connected
      ? "Playing on this iPhone · you can leave PolySwap"
      : "The web player works here. Pair the iPhone player for background playback.";
  }

  async function sendPlaybackCommand(prompt) {
    const command = String(prompt || "").trim();
    if (!command) return;
    if (state.demo) {
      const track = demoMediaRequest(command);
      if (track) {
        await startJob({
          sessionId: state.sessionId,
          goal: command,
          title: titleFor(command),
          kind: "media",
          modelId: state.selectedModel.id,
          modelRoute: state.selectedModel.route,
          privacyMode: state.selectedModel.privacy,
          permissionProfile: "ask",
          workspace: "Cloud workspace",
          acceptanceCriteria: [],
          estimatedUsd: 0,
          budgetUsd: 0,
          background: true
        });
        return;
      }
      const lowered = command.toLowerCase();
      const lastCommand = /next|skip/.test(lowered) ? "next" : /previous|back/.test(lowered) ? "previous" : /stop/.test(lowered) ? "stop" : /resume|continue/.test(lowered) ? "resume" : "pause";
      state.playback = {
        ...(state.playback || {}),
        revision: Number(state.playback?.revision || 0) + 1,
        lastCommand,
        desiredState: lastCommand === "pause" ? "paused" : lastCommand === "stop" ? "stopped" : "playing"
      };
      applyPlaybackToWebPlayers(state.playback);
      renderPlaybackControls(state.activeJob);
      return;
    }
    try {
      const payload = await api("/v1/playback/commands", {
        method: "POST",
        body: JSON.stringify({ sessionId: state.sessionId, prompt: command, modelId: state.selectedModel.id })
      });
      state.playback = payload.playback || state.playback;
      state.playbackRevision = Number(state.playback?.revision || state.playbackRevision);
      if (payload.job) {
        replaceJob(payload.job);
        renderJobs();
      } else {
        renderJobs();
        applyPlaybackToWebPlayers(state.playback);
      }
    } catch (error) {
      setRuntimeNote("Could not update the player · " + error.message, "error");
    }
  }

  async function submitPlaybackCommand(event) {
    event.preventDefault();
    const prompt = els.playbackPrompt.value.trim();
    if (!prompt) return;
    els.playbackPrompt.value = "";
    await sendPlaybackCommand(prompt);
  }

  async function submitFollowup(event) {
    event.preventDefault();
    const job = state.activeJob;
    const prompt = els.followupPrompt.value.trim();
    if (!job || !prompt || job.kind === "media") return;
    els.followupSend.disabled = true;
    try {
      if (state.demo) {
        const now = new Date().toISOString();
        job.events = job.events || [];
        job.events.push({ kind: "user_message", label: "You", detail: prompt, createdAt: now });
        job.status = "running";
        job.currentInstruction = "Previewing the continued job with the same context.";
        job.updatedAt = now;
        replaceJob(job);
        persistDemo();
        renderJobDetail(job);
        window.setTimeout(() => {
          const current = state.jobs.find((item) => item.id === job.id);
          if (!current) return;
          const completedAt = new Date().toISOString();
          current.events.push({ kind: "assistant_message", label: "PolySwap preview", detail: "This follow-up stayed inside the same durable job and kept its model, history, permissions, and work record.", createdAt: completedAt });
          current.status = "completed";
          current.resultSummary = "This follow-up stayed inside the same durable job and kept its model, history, permissions, and work record.";
          current.updatedAt = completedAt;
          current.completedAt = completedAt;
          persistDemo();
          if (state.activeJob?.id === current.id) {
            state.activeJob = current;
            renderJobDetail(current);
          }
          renderJobs();
        }, 900);
      } else {
        const payload = await api("/v1/jobs/" + encodeURIComponent(job.id) + "/actions", {
          method: "POST",
          body: JSON.stringify({ sessionId: state.sessionId, action: "followup", prompt })
        });
        replaceJob(payload.job);
        state.jobDetails.set(job.id, payload.job);
        state.activeJob = payload.job;
        renderJobDetail(payload.job);
      }
      els.followupPrompt.value = "";
      renderJobs();
    } catch (error) {
      setRuntimeNote("Could not continue the job · " + error.message, "error");
    } finally {
      els.followupSend.disabled = !els.followupPrompt.value.trim();
    }
  }

  async function createPlayerPairing() {
    if (state.demo) {
      setRuntimeNote("Pairing is available in the installed PolySwap phone app.", "neutral");
      return;
    }
    try {
      const payload = await api("/v1/playback/pairings", {
        method: "POST",
        body: JSON.stringify({ sessionId: state.sessionId })
      });
      state.pairingCode = payload.code;
      renderJobs();
    } catch (error) {
      setRuntimeNote("Could not make a pairing code · " + error.message, "error");
    }
  }

  function isYouTubeMedia(evidence) {
    return Boolean(evidence && typeof evidence === "object" && evidence.type === "media" && evidence.provider === "youtube" && mediaCandidates(evidence).length);
  }

  function renderYouTubePlayer(item, media) {
    item.className = "media-result";
    const candidates = mediaCandidates(media);
    const shell = document.createElement("div");
    shell.className = "media-player-shell";
    const target = document.createElement("div");
    target.id = "youtube-player-" + Math.random().toString(36).slice(2);
    const play = document.createElement("button");
    play.type = "button";
    play.className = "media-play";
    play.textContent = "Play";
    play.hidden = true;
    const unavailable = document.createElement("p");
    unavailable.className = "media-unavailable";
    unavailable.textContent = "PolySwap could not load this result. Try the job again.";
    unavailable.hidden = true;
    shell.append(target, play, unavailable);
    const caption = document.createElement("div");
    caption.className = "media-caption";
    const title = document.createElement("strong");
    const author = document.createElement("span");
    caption.append(title, author);
    item.append(shell, caption);

    let candidateIndex = 0;
    let player = null;
    const showCandidate = () => {
      const candidate = candidates[candidateIndex];
      title.textContent = candidate?.title || "YouTube";
      author.textContent = candidate?.author || "YouTube";
    };
    const tryNext = () => {
      candidateIndex += 1;
      if (!player || candidateIndex >= candidates.length) {
        play.hidden = true;
        unavailable.hidden = false;
        return;
      }
      unavailable.hidden = true;
      play.hidden = true;
      showCandidate();
      player.loadVideoById(candidates[candidateIndex].videoId);
    };
    showCandidate();
    ensureYouTubeApi().then((YT) => {
      const nativeAudio = params.get("native") === "1" || Boolean(state.playback?.device?.connected);
      player = new YT.Player(target.id, {
        width: "100%",
        height: "100%",
        videoId: candidates[0].videoId,
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          controls: nativeAudio ? 0 : 1,
          disablekb: nativeAudio ? 1 : 0,
          rel: 0,
          origin: window.location.origin
        },
        events: {
          onReady: (event) => {
            if (nativeAudio) event.target.mute();
            event.target.playVideo();
          },
          onAutoplayBlocked: () => { play.hidden = false; },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) play.hidden = true;
          },
          onError: tryNext
        }
      });
      state.mediaPlayers.push(player);
      play.addEventListener("click", () => player?.playVideo());
    }).catch(() => {
      unavailable.hidden = false;
    });
  }

  function mediaCandidates(media) {
    const raw = Array.isArray(media?.candidates) && media.candidates.length ? media.candidates : [media];
    return raw.filter((candidate) => candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate.videoId || "")).slice(0, 6);
  }

  function ensureYouTubeApi() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (youtubeApiPromise) return youtubeApiPromise;
    youtubeApiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previous === "function") previous();
        resolve(window.YT);
      };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        script.onerror = () => reject(new Error("YouTube player failed to load."));
        document.head.appendChild(script);
      }
      window.setTimeout(() => {
        if (!window.YT?.Player) reject(new Error("YouTube player timed out."));
      }, 10000);
    });
    return youtubeApiPromise;
  }

  function destroyMediaPlayers() {
    state.mediaPlayers.forEach((player) => {
      try { player.destroy(); } catch (_) {}
    });
    state.mediaPlayers = [];
  }

  function markPhoneActionOpened(job, target) {
    if (state.demo || TERMINAL.has(job.status)) return;
    api("/v1/jobs/" + encodeURIComponent(job.id) + "/actions", {
      method: "POST",
      keepalive: true,
      body: JSON.stringify({ sessionId: state.sessionId, action: "opened", target: target || "music app" })
    }).then((payload) => {
      replaceJob(payload.job);
      renderJobs();
    }).catch(() => {});
  }

  function renderTimeline(job) {
    els.taskTimeline.replaceChildren();
    const events = Array.isArray(job.events) && job.events.length
      ? job.events
      : [{ type: job.status, message: job.currentInstruction || "Job record created.", createdAt: job.updatedAt }];
    events.slice().reverse().forEach((event) => {
      const item = document.createElement("div");
      const eventType = event.type || event.kind || "progress";
      item.className = "timeline-item " + eventType;
      item.innerHTML = '<i></i><span><strong></strong><small></small></span><time></time>';
      item.querySelector("strong").textContent = event.label || eventLabel(eventType);
      item.querySelector("small").textContent = plainEventDetail(eventType, event.message || event.detail);
      item.querySelector("time").textContent = timeLabel(event.createdAt);
      els.taskTimeline.appendChild(item);
    });
  }

  function eventLabel(type) {
    const labels = {
      created: "Sent",
      queued: "Sent",
      claimed: "Started",
      running: "Started",
      ready: "Ready",
      checkpoint: "Update",
      user_message: "You",
      assistant_message: "PolySwap",
      attachment_context: "Attached",
      followup: "Continued",
      approval_requested: "Approval requested",
      approved: "Approved",
      denied: "Denied",
      model_swapped: "Model changed",
      completed: "Done",
      failed: "Stopped",
      paused: "Paused",
      resumed: "Resumed"
    };
    return labels[type] || statusLabel(type);
  }

  function plainEventDetail(type, detail) {
    if (type === "created" || type === "queued") return "Waiting to start.";
    if (type === "claimed" || type === "running") return "PolySwap started working.";
    if (type === "ready") return detail || "Ready on this iPhone.";
    if (type === "completed") return "The result is ready.";
    return detail || "Updated.";
  }

  async function actOnJob(job, action, extra) {
    try {
      if (state.demo) {
        applyDemoAction(job, action, extra);
        if (state.activeJob?.id === job.id) {
          state.activeJob = job;
          renderJobDetail(job);
        }
      } else {
        const payload = await api("/v1/jobs/" + encodeURIComponent(job.id) + "/actions", {
          method: "POST",
          body: JSON.stringify({ sessionId: state.sessionId, action, ...(extra || {}) })
        });
        replaceJob(payload.job);
        state.jobDetails.set(job.id, payload.job);
        if (state.activeJob?.id === job.id) {
          state.activeJob = payload.job;
          renderJobDetail(payload.job);
        }
      }
      renderJobs();
    } catch (error) {
      setRuntimeNote("Could not update the job · " + error.message, "error");
    }
  }

  function applyDemoAction(job, action, extra) {
    const now = new Date().toISOString();
    if (action === "pause") job.status = "paused";
    if (action === "resume") job.status = "queued";
    if (action === "cancel") job.status = "cancelled";
    if (action === "approve" || action === "deny") {
      const approval = (job.approvals || []).find((item) => item.id === extra?.approvalId);
      if (approval) approval.status = action === "approve" ? "approved" : "denied";
      job.status = action === "approve" ? "queued" : "cancelled";
    }
    job.updatedAt = now;
    job.events = job.events || [];
    job.events.push({ type: action === "approve" ? "approved" : action === "deny" ? "denied" : action, message: "Preview action recorded. No external system was changed.", createdAt: now });
    persistDemo();
  }

  async function swapJob(jobId, model) {
    const job = state.jobs.find((item) => item.id === jobId);
    if (!job) return;
    try {
      if (state.demo) {
        job.modelId = model.id;
        job.modelRoute = model.route;
        job.privacyMode = model.privacy;
        if (!TERMINAL.has(job.status)) job.status = "queued";
        job.updatedAt = new Date().toISOString();
        job.events = job.events || [];
        job.events.push({ type: "model_swapped", message: "Preview route changed to " + model.name + ".", createdAt: job.updatedAt });
        persistDemo();
      } else {
        const payload = await api("/v1/jobs/" + encodeURIComponent(jobId) + "/actions", {
          method: "POST",
          body: JSON.stringify({
            sessionId: state.sessionId,
            action: "swap",
            modelId: model.id,
            modelRoute: model.route,
            privacyMode: model.privacy
          })
        });
        replaceJob(payload.job);
        state.jobDetails.set(jobId, payload.job);
      }
      renderJobs();
      const updated = state.jobs.find((item) => item.id === jobId);
      if (state.activeJob?.id === jobId && updated) {
        state.activeJob = updated;
        renderJobDetail(updated);
      }
      setRuntimeNote("Intelligence swapped to " + model.name + " · work context preserved", state.demo ? "preview" : "success");
    } catch (error) {
      setRuntimeNote("Could not swap intelligence · " + error.message, "error");
    }
  }

  function replaceJob(job) {
    const index = state.jobs.findIndex((item) => item.id === job.id);
    if (index >= 0) state.jobs[index] = job;
    else state.jobs.unshift(job);
  }

  function duplicateJob(job) {
    state.expandedJobId = "";
    els.prompt.value = job.goal;
    const model = findModel(job.modelId);
    if (model?.available) state.selectedModel = model;
    updateComposer();
    els.prompt.focus();
  }

  function focusJobFromHash() {
    const match = window.location.hash.match(/^#job=(.+)$/);
    if (!match) return;
    const id = decodeURIComponent(match[1]);
    if (!state.jobs.some((job) => job.id === id)) return;
    history.replaceState(null, "", window.location.pathname + window.location.search);
    openJob(id);
  }

  function base64UrlBytes(value) {
    const padded = value + "=".repeat((4 - value.length % 4) % 4);
    const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  async function requestNotifications() {
    if (!("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator)) {
      setRuntimeNote("Install PolySwap on your Home Screen first, then enable notifications from the app.", "error");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      try {
        const registration = state.serviceWorker || await navigator.serviceWorker.ready;
        const keyPayload = await api("/v1/push/public-key");
        const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlBytes(keyPayload.publicKey)
        });
        await api("/v1/push/subscriptions", {
          method: "POST",
          body: JSON.stringify({ sessionId: state.sessionId, subscription: subscription.toJSON() })
        });
        updateNotificationPrompt();
        setRuntimeNote("Notifications enabled · PolySwap can alert you after the app is closed", "success");
        await showNotification("PolySwap notifications are on", "Approvals and completed jobs will reach this phone.", "");
      } catch (error) {
        setRuntimeNote("Notifications could not be connected · " + error.message, "error");
      }
    } else {
      setRuntimeNote("Notifications were not enabled. Jobs still remain in the task list.", "neutral");
    }
  }

  function updateNotificationPrompt() {
    const supported = "Notification" in window && "PushManager" in window && "serviceWorker" in navigator;
    const alreadyOn = supported && Notification.permission === "granted";
    els.notificationPrompt.hidden = state.demo || !state.jobs.length || alreadyOn;
  }

  function startDictation() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      els.prompt.focus();
      setRuntimeNote("Tap the microphone on your iPhone keyboard to dictate the job.", "neutral");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      els.prompt.value = (els.prompt.value + " " + transcript).trim();
      updateComposer();
    };
    recognition.onerror = () => setRuntimeNote("Dictation stopped. You can use the phone keyboard microphone instead.", "neutral");
    recognition.start();
    setRuntimeNote("Listening…", "success");
  }

  function searchJobs() {
    const query = window.prompt("Search your PolySwap jobs", state.search || "");
    if (query === null) return;
    state.search = query.trim().toLowerCase();
    renderJobs();
    setRuntimeNote(state.search ? "Showing jobs matching “" + query.trim() + "”" : "Showing all jobs", "neutral");
  }

  function bindEvents() {
    els.form.addEventListener("submit", createJob);
    els.activityToggle.addEventListener("click", () => setActivityOpen(!state.activityOpen));
    els.prompt.addEventListener("input", updateComposer);
    els.attachmentButton.addEventListener("click", () => els.attachmentInput.click());
    els.attachmentInput.addEventListener("change", chooseAttachment);
    els.attachmentChip.querySelector("button").addEventListener("click", clearAttachment);
    els.modelButton.addEventListener("click", () => {
      state.swapJobId = null;
      renderModels();
      els.modelDialog.showModal();
    });
    els.notifyButton.addEventListener("click", requestNotifications);
    els.micButton.addEventListener("click", startDictation);
    els.playbackComposer.addEventListener("submit", submitPlaybackCommand);
    els.playbackPause.addEventListener("click", () => sendPlaybackCommand(state.playback?.desiredState === "paused" ? "resume" : "pause"));
    els.playbackNext.addEventListener("click", () => sendPlaybackCommand("next"));
    els.playbackModel.addEventListener("click", () => {
      state.swapJobId = null;
      renderModels();
      els.modelDialog.showModal();
    });
    els.pairPlayer.addEventListener("click", createPlayerPairing);
    els.modelClose.addEventListener("click", () => els.modelDialog.close());
    els.taskClose.addEventListener("click", () => els.taskDialog.close());
    els.taskChatTab.addEventListener("click", () => setTaskView("chat"));
    els.taskLiveTab.addEventListener("click", () => setTaskView("live"));
    els.taskFilesTab.addEventListener("click", () => setTaskView("files"));
    els.taskProofTab.addEventListener("click", () => setTaskView("proof"));
    els.taskMenu.addEventListener("click", () => {
      els.taskActions.hidden = !els.taskActions.hidden;
    });
    els.taskModelButton.addEventListener("click", () => {
      if (!state.activeJob) return;
      state.swapJobId = state.activeJob.id;
      renderModels();
      els.modelDialog.showModal();
    });
    els.followupComposer.addEventListener("submit", submitFollowup);
    els.followupPrompt.addEventListener("input", () => {
      els.followupPrompt.style.height = "auto";
      els.followupPrompt.style.height = Math.min(els.followupPrompt.scrollHeight, 112) + "px";
      els.followupSend.disabled = !els.followupPrompt.value.trim();
    });
    els.taskDialog.addEventListener("close", () => {
      destroyMediaPlayers();
      state.activeJob = null;
      els.taskActions.hidden = true;
      if (window.location.hash.startsWith("#job=")) history.replaceState(null, "", window.location.pathname + window.location.search);
    });
    window.addEventListener("hashchange", focusJobFromHash);
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(window.location.protocol)) return;
    try {
      state.serviceWorker = await navigator.serviceWorker.register("/mobile-sw.js");
    } catch (_) {
      setRuntimeNote("Install support is unavailable in this preview, but the mobile app still works.", "neutral");
    }
  }

  async function init() {
    bindEvents();
    setActivityOpen(false);
    renderModels();
    renderAttachment();
    els.followupSend.disabled = true;
    updateComposer();
    if (state.demo) {
      setRuntimeNote("Preview mode · no work is sent", "preview");
    }
    await registerServiceWorker();
    await loadModels();
    if (!state.demo) {
      try {
        await ensureOpenAccess();
      } catch (error) {
        setRuntimeNote("PolySwap could not connect · " + error.message, "error");
        return;
      }
    }
    connectNativeRuntime();
    await loadJobs();
    state.pollTimer = window.setInterval(() => loadJobs({ quiet: true }), 5000);
  }

  init();
})();
