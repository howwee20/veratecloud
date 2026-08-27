(function () {
  "use strict";

  const apiRoot = document.querySelector('meta[name="polyswap-api"]')?.content?.replace(/\/$/, "") || "";
  const params = new URLSearchParams(window.location.search);

  const MODELS = [
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
    },
    {
      id: "openai/gpt-5.6-luna",
      name: "Luna",
      short: "Luna",
      provider: "OpenAI through Cloudflare",
      route: "openai",
      privacy: "gateway",
      detail: "Add AI Gateway credit to enable",
      quote: 0,
      available: false,
      tone: "amber"
    },
    {
      id: "deepseek/deepseek-v4-flash",
      name: "DeepSeek V4 Flash",
      short: "DeepSeek",
      provider: "Cloudflare-hosted",
      route: "cloudflare",
      privacy: "cloudflare",
      detail: "Upgrade Workers to enable",
      quote: 0,
      available: false,
      tone: "rose"
    }
  ];

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
    selectedModel: savedModel?.available ? savedModel : MODELS[0],
    jobs: [],
    filter: "active",
    activeJob: null,
    swapJobId: null,
    pollTimer: null,
    previousStatuses: new Map(),
    serviceWorker: null,
    search: "",
    pendingJob: null
  };

  const els = {
    form: document.getElementById("jobComposer"),
    prompt: document.getElementById("jobPrompt"),
    send: document.getElementById("sendButton"),
    modelButton: document.getElementById("modelButton"),
    modelName: document.getElementById("modelLabel"),
    modelIcon: document.getElementById("modelIcon"),
    modelList: document.getElementById("modelOptions"),
    accessSelect: document.getElementById("permissionSelect"),
    budgetInput: document.getElementById("budgetInput"),
    privacySummary: document.getElementById("privacySummary"),
    runtimeNote: document.getElementById("runtimeNote"),
    taskList: document.getElementById("taskList"),
    tabs: Array.from(document.querySelectorAll("[data-filter]")),
    attentionCount: document.getElementById("attentionCount"),
    accessDialog: document.getElementById("accessDialog"),
    accessForm: document.getElementById("accessForm"),
    accessCode: document.getElementById("accessCode"),
    accessError: document.getElementById("accessError"),
    previewButton: document.getElementById("demoButton"),
    modelDialog: document.getElementById("modelDialog"),
    taskDialog: document.getElementById("taskDialog"),
    quoteDialog: document.getElementById("quoteDialog"),
    taskTemplate: document.getElementById("taskTemplate"),
    statusBanner: document.getElementById("statusBanner"),
    notifyButton: document.getElementById("notificationButton"),
    micButton: document.getElementById("voiceButton"),
    addButton: document.getElementById("addButton"),
    searchButton: document.getElementById("searchButton"),
    accountButton: document.getElementById("accountButton"),
    connectionDot: document.getElementById("connectionDot"),
    modelClose: document.getElementById("modelClose"),
    taskClose: document.getElementById("taskClose"),
    taskDetailId: document.getElementById("taskDetailId"),
    taskDetailStatus: document.getElementById("taskDetailStatus"),
    taskDetailTitle: document.getElementById("taskDetailTitle"),
    taskDetailGoal: document.getElementById("taskDetailGoal"),
    taskDetailModel: document.getElementById("taskDetailModel"),
    taskDetailPrivacy: document.getElementById("taskDetailPrivacy"),
    taskDetailBudget: document.getElementById("taskDetailBudget"),
    taskDetailAccess: document.getElementById("taskDetailAccess"),
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
    swapButton: document.getElementById("swapButton"),
    pauseButton: document.getElementById("pauseButton"),
    cancelButton: document.getElementById("cancelButton"),
    quoteClose: document.getElementById("quoteClose"),
    quoteCancel: document.getElementById("quoteCancel"),
    quoteStart: document.getElementById("quoteStart"),
    quoteGoal: document.getElementById("quoteGoal"),
    quoteModel: document.getElementById("quoteModel"),
    quoteRoute: document.getElementById("quoteRoute"),
    quoteEstimate: document.getElementById("quoteEstimate"),
    quoteMaximum: document.getElementById("quoteMaximum"),
    quoteBoundary: document.getElementById("quoteBoundary")
  };

  localStorage.setItem(STORAGE.session, state.sessionId);
  if (!sessionIsUsable) localStorage.removeItem(STORAGE.token);

  function createSessionId() {
    const suffix = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    return "anon_" + suffix.replace(/-/g, "_");
  }

  function findModel(id) {
    return MODELS.find((model) => model.id === id);
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

  function quoteFor(goal, model) {
    const lengthFactor = Math.min(2.2, Math.max(0.8, goal.trim().length / 180));
    return Math.max(0.001, Math.ceil(model.quote * lengthFactor * 1000) / 1000);
  }

  function privacyLabel(model) {
    if (model.route === "cloudflare") return "Cloudflare-hosted";
    if (model.route === "openai") return "OpenAI through Cloudflare";
    if (model.privacy === "zdr") return "Pinned zero-retention route";
    return "Private route chosen per job";
  }

  function updateComposer() {
    const model = state.selectedModel;
    els.modelName.textContent = model.short;
    els.modelIcon.src = providerIcon(model);
    els.privacySummary.className = "privacy-summary " + (model.privacy === "zdr" ? "zdr" : "standard");
    els.privacySummary.replaceChildren();
    const privacyDot = document.createElement("i");
    const planningQuote = quoteFor(els.prompt.value || "A typical agent task", model);
    els.privacySummary.append(privacyDot, document.createTextNode(" Est. " + money(planningQuote) + " · " + privacyLabel(model)));
    const budget = Number(els.budgetInput.value || 0);
    els.send.disabled = !els.prompt.value.trim() || budget <= 0;
  }

  function providerIcon(model) {
    if (model.id.includes("deepseek")) return "assets/providers/deepseek.svg";
    if (model.id.includes("llama")) return "assets/providers/meta.svg";
    if (model.route === "openai") return "assets/providers/openai.svg";
    return "assets/polyswap-mark.png?v=2";
  }

  function setRuntimeNote(message, tone) {
    els.runtimeNote.textContent = message;
    els.runtimeNote.dataset.tone = tone || "neutral";
    els.statusBanner.hidden = !(tone === "preview" || tone === "error");
    if (!els.statusBanner.hidden) {
      els.statusBanner.textContent = message;
      els.statusBanner.className = "status-banner " + (tone === "preview" ? "preview" : "error");
    }
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
      notifyTransitions(nextJobs);
      state.jobs = nextJobs;
      renderJobs();
      els.connectionDot.className = state.demo ? "preview" : "connected";
      if (!quiet) setRuntimeNote(state.demo ? "Preview mode · no cloud work is executed" : "Connected · jobs keep running after you close this page", state.demo ? "preview" : "success");
      openJobFromHash();
    } catch (error) {
      els.connectionDot.className = "";
      if (error.status === 401 || error.status === 403) {
        state.accessToken = "";
        localStorage.removeItem(STORAGE.token);
        showAccess();
      }
      setRuntimeNote("Could not reach the PolySwap control plane · " + error.message, "error");
    }
  }

  function notifyTransitions(nextJobs) {
    nextJobs.forEach((job) => {
      const previous = state.previousStatuses.get(job.id);
      if (previous && previous !== job.status && (ATTENTION.has(job.status) || TERMINAL.has(job.status))) {
        const body = ATTENTION.has(job.status)
          ? "PolySwap needs your approval to continue."
          : job.status === "completed" ? "Your job is done. Tap to see the receipt." : "Your job stopped. Tap for details.";
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

  function filteredJobs() {
    return state.jobs.filter((job) => {
      const matchesSearch = !state.search || (job.title + " " + job.goal).toLowerCase().includes(state.search);
      if (!matchesSearch) return false;
      if (state.filter === "attention") return ATTENTION.has(job.status);
      if (state.filter === "archive") return TERMINAL.has(job.status);
      return !TERMINAL.has(job.status);
    });
  }

  function renderJobs() {
    const jobs = filteredJobs();
    els.taskList.replaceChildren();
    jobs.forEach((job) => els.taskList.appendChild(renderJob(job)));
    if (!jobs.length) {
      const empty = document.createElement("p");
      empty.className = "empty-tasks";
      empty.textContent = state.search ? "No jobs match that search." : state.filter === "attention" ? "Nothing needs you right now." : state.filter === "archive" ? "Completed jobs will appear here." : "Send your first job above.";
      els.taskList.appendChild(empty);
    }
    const attention = state.jobs.filter((job) => ATTENTION.has(job.status)).length;
    els.attentionCount.textContent = attention || "";
    els.attentionCount.hidden = !attention;
    els.tabs.forEach((tab) => {
      const active = tab.dataset.filter === state.filter;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
  }

  function renderJob(job) {
    const node = els.taskTemplate.content.firstElementChild.cloneNode(true);
    const model = findModel(job.modelId) || { short: job.modelId?.split("/").pop() || "Model" };
    node.dataset.jobId = job.id;
    node.dataset.status = job.status;
    node.querySelector(".task-copy strong").textContent = job.title || titleFor(job.goal || "Untitled job");
    node.querySelector(".task-copy small").textContent = (job.currentInstruction || job.resultSummary || "Ready for a private cloud runtime.") + " · " + model.short;
    node.querySelector(".task-meta em").textContent = statusLabel(job.status);
    node.querySelector(".task-meta time").textContent = timeLabel(job.updatedAt || job.createdAt);
    node.addEventListener("click", () => openJob(job.id));
    return node;
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
    const budgetUsd = Number(els.budgetInput.value || 0);
    const payload = {
      sessionId: state.sessionId,
      goal,
      title: titleFor(goal),
      kind: kindFor(goal),
      modelId: model.id,
      modelRoute: model.route,
      privacyMode: model.privacy,
      permissionProfile: els.accessSelect.value,
      workspace: "Cloud workspace",
      acceptanceCriteria: [
        "Complete the requested work without inventing facts",
        "Pause before any consequential external action",
        "Return a result, cost, and evidence receipt"
      ],
      estimatedUsd: quoteFor(goal, model),
      budgetUsd,
      background: true
    };
    els.send.disabled = true;
    setRuntimeNote("Checking the route, cost and execution boundary…", "neutral");
    try {
      const quote = state.demo
        ? {
            modelId: model.id,
            modelLabel: model.name,
            provider: model.provider,
            privacy: privacyLabel(model),
            estimatedUsd: payload.estimatedUsd,
            maximumUsd: budgetUsd,
            capability: "Preview only",
            externalActions: "No work executes in preview mode"
          }
        : (await api("/v1/quote", { method: "POST", body: JSON.stringify(payload) })).quote;
      if (Number(quote.estimatedUsd) > budgetUsd) {
        setRuntimeNote("Raise the cost ceiling above the " + money(quote.estimatedUsd) + " estimate before sending.", "error");
        return;
      }
      payload.estimatedUsd = Number(quote.estimatedUsd);
      state.pendingJob = { payload, quote };
      els.quoteGoal.textContent = goal;
      els.quoteModel.textContent = quote.modelLabel;
      els.quoteRoute.textContent = quote.privacy || quote.provider;
      els.quoteEstimate.textContent = money(quote.estimatedUsd);
      els.quoteMaximum.textContent = money(budgetUsd);
      els.quoteBoundary.textContent = state.demo
        ? "Preview mode: this shows the authorization step, but no cloud work executes."
        : quote.capability + ". " + quote.externalActions + ".";
      els.quoteDialog.showModal();
      setRuntimeNote("Quote ready · review it before the cloud job starts", "success");
    } catch (error) {
      setRuntimeNote("Could not prepare the job · " + error.message, "error");
    } finally {
      updateComposer();
    }
  }

  async function startQuotedJob() {
    const pending = state.pendingJob;
    if (!pending) return;
    state.pendingJob = null;
    els.quoteStart.disabled = true;
    setRuntimeNote("Creating the durable job and starting its cloud runtime…", "neutral");
    try {
      let job;
      if (state.demo) {
        const now = new Date().toISOString();
        job = {
          id: "demo-" + Date.now(),
          ...pending.payload,
          status: "queued",
          actualUsd: 0,
          currentInstruction: "Waiting for a preview runtime.",
          createdAt: now,
          updatedAt: now,
          events: [{ type: "created", message: "Preview job created. No external work will run.", createdAt: now }],
          approvals: []
        };
        state.jobs.unshift(job);
        persistDemo();
        window.setTimeout(() => advanceDemo(job.id), 1400);
      } else {
        const response = await api("/v1/jobs", { method: "POST", body: JSON.stringify(pending.payload) });
        job = response.job;
        state.jobs.unshift(job);
      }
      els.quoteDialog.close();
      els.prompt.value = "";
      updateComposer();
      renderJobs();
      setRuntimeNote(state.demo ? "Preview job created · no cloud work is executed" : "Running in the cloud · you can close PolySwap now", state.demo ? "preview" : "success");
      await openJob(job.id);
    } catch (error) {
      state.pendingJob = pending;
      setRuntimeNote("Could not start the job · " + error.message, "error");
    } finally {
      els.quoteStart.disabled = false;
      updateComposer();
    }
  }

  function advanceDemo(jobId) {
    const job = state.jobs.find((item) => item.id === jobId);
    if (!job || job.status !== "queued") return;
    job.status = "running";
    job.currentInstruction = "Previewing how the PolySwap harness would claim and execute this job.";
    job.updatedAt = new Date().toISOString();
    job.events.push({ type: "claimed", message: "Preview runtime claimed the job.", createdAt: job.updatedAt });
    persistDemo();
    renderJobs();
    if (state.activeJob?.id === jobId) openJob(jobId, { preserveHash: true });
  }

  function renderModels() {
    els.modelList.replaceChildren();
    MODELS.forEach((model) => {
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
      button.querySelector("small").textContent = model.provider + " · " + model.detail;
      button.querySelector("em").textContent = model.available ? "typical " + money(model.quote) : "not connected";
      button.addEventListener("click", async () => {
        if (state.swapJobId) {
          await swapJob(state.swapJobId, model);
        } else {
          state.selectedModel = model;
          localStorage.setItem(STORAGE.model, model.id);
          updateComposer();
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
      renderJobDetail(job);
      if (!els.taskDialog.open) els.taskDialog.showModal();
      if (!options?.preserveHash) history.replaceState(null, "", window.location.pathname + window.location.search + "#job=" + encodeURIComponent(jobId));
    } catch (error) {
      setRuntimeNote("Could not open that job · " + error.message, "error");
    }
  }

  function renderJobDetail(job) {
    const model = findModel(job.modelId) || { name: job.modelId, provider: job.modelRoute };
    els.taskDetailId.textContent = "Job " + job.id.slice(-6);
    els.taskDetailStatus.textContent = statusLabel(job.status) + " · " + money(job.actualUsd) + " spent";
    els.taskDetailTitle.textContent = job.title;
    els.taskDetailGoal.textContent = job.goal;
    els.taskDetailModel.textContent = model.name + " · " + (model.provider || job.modelRoute || "PolySwap");
    els.taskDetailPrivacy.textContent = job.privacyMode === "zdr" ? "Pinned zero retention" : job.privacyMode === "cloudflare" ? "Cloudflare-hosted" : "Private route";
    els.taskDetailBudget.textContent = money(job.budgetUsd) + " max · " + money(job.estimatedUsd) + " planning estimate";
    els.taskDetailAccess.textContent = job.permissionProfile || "ask";

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
      els.receiptTitle.textContent = job.status === "completed" ? "Completed and verified" : "Runtime receipt";
      els.receiptSummary.textContent = job.resultSummary || receiptSummary || "Evidence was returned by the runtime.";
      if (receiptSummary && job.resultSummary && receiptSummary !== job.resultSummary) {
        const receipt = document.createElement("li");
        receipt.textContent = receiptSummary;
        els.receiptEvidence.appendChild(receipt);
      }
      receiptEvidence.forEach((evidence) => {
        const item = document.createElement("li");
        if (typeof evidence === "object" && evidence.url && evidence.url !== "#") {
          const link = document.createElement("a");
          link.href = evidence.url;
          link.target = "_blank";
          link.rel = "noopener";
          link.textContent = evidence.label || "Open evidence";
          item.appendChild(link);
        } else {
          item.textContent = typeof evidence === "string" ? evidence : evidence.label || "Evidence recorded";
        }
        els.receiptEvidence.appendChild(item);
      });
    }

    renderTimeline(job);
    const terminal = TERMINAL.has(job.status);
    els.swapButton.textContent = terminal ? "Run a similar job" : "Swap intelligence";
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
      item.querySelector("small").textContent = event.message || event.detail || "Checkpoint recorded.";
      item.querySelector("time").textContent = timeLabel(event.createdAt);
      els.taskTimeline.appendChild(item);
    });
  }

  function eventLabel(type) {
    const labels = {
      created: "Job created",
      claimed: "Runtime started",
      checkpoint: "Checkpoint",
      approval_requested: "Approval requested",
      approved: "Approved",
      denied: "Denied",
      model_swapped: "Intelligence swapped",
      completed: "Completed",
      failed: "Stopped",
      paused: "Paused",
      resumed: "Resumed"
    };
    return labels[type] || statusLabel(type);
  }

  async function actOnJob(job, action, extra) {
    try {
      if (state.demo) {
        applyDemoAction(job, action, extra);
      } else {
        const payload = await api("/v1/jobs/" + encodeURIComponent(job.id) + "/actions", {
          method: "POST",
          body: JSON.stringify({ sessionId: state.sessionId, action, ...(extra || {}) })
        });
        replaceJob(payload.job);
      }
      await openJob(job.id, { preserveHash: true });
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
        job.status = "queued";
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
      }
      renderJobs();
      await openJob(jobId, { preserveHash: true });
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
    els.taskDialog.close();
    els.prompt.value = job.goal;
    const model = findModel(job.modelId);
    if (model?.available) state.selectedModel = model;
    els.accessSelect.value = job.permissionProfile || "ask";
    els.budgetInput.value = job.budgetUsd || 0.25;
    updateComposer();
    els.prompt.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitAccess(event) {
    event.preventDefault();
    const code = els.accessCode.value.trim();
    if (!code) return;
    els.accessError.hidden = false;
    els.accessError.textContent = "Checking access…";
    try {
      const payload = await api("/v1/access", {
        method: "POST",
        body: JSON.stringify({ code, sessionId: state.sessionId })
      });
      state.accessToken = payload.accessToken;
      localStorage.setItem(STORAGE.token, payload.accessToken);
      els.accessError.textContent = "";
      els.accessError.hidden = true;
      els.accessDialog.close();
      await loadJobs();
    } catch (error) {
      els.accessError.textContent = error.message;
    }
  }

  function showAccess() {
    if (!els.accessDialog.open) els.accessDialog.showModal();
  }

  function enterPreview() {
    state.demo = true;
    const next = new URL(window.location.href);
    next.searchParams.set("demo", "1");
    history.replaceState(null, "", next.pathname + next.search + next.hash);
    setRuntimeNote("Preview mode · no cloud work is executed", "preview");
    els.accessDialog.close();
    loadJobs();
  }

  function openJobFromHash() {
    const match = window.location.hash.match(/^#job=(.+)$/);
    if (!match || els.taskDialog.open) return;
    const id = decodeURIComponent(match[1]);
    if (state.jobs.some((job) => job.id === id)) openJob(id, { preserveHash: true });
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
        setRuntimeNote("Notifications enabled · PolySwap can alert you after the app is closed", "success");
        await showNotification("PolySwap notifications are on", "Approvals and completed jobs will reach this phone.", "");
      } catch (error) {
        setRuntimeNote("Notifications could not be connected · " + error.message, "error");
      }
    } else {
      setRuntimeNote("Notifications were not enabled. Jobs still remain in the task list.", "neutral");
    }
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
    els.prompt.addEventListener("input", updateComposer);
    els.budgetInput.addEventListener("input", updateComposer);
    els.modelButton.addEventListener("click", () => {
      state.swapJobId = null;
      renderModels();
      els.modelDialog.showModal();
    });
    els.tabs.forEach((tab) => tab.addEventListener("click", () => {
      state.filter = tab.dataset.filter;
      renderJobs();
    }));
    els.accessForm.addEventListener("submit", submitAccess);
    els.previewButton.addEventListener("click", enterPreview);
    els.notifyButton.addEventListener("click", requestNotifications);
    els.micButton.addEventListener("click", startDictation);
    els.addButton.addEventListener("click", () => setRuntimeNote("The encrypted file vault is the next slice; this private alpha does not upload a file.", "neutral"));
    els.searchButton.addEventListener("click", searchJobs);
    els.accountButton.addEventListener("click", showAccess);
    els.modelClose.addEventListener("click", () => els.modelDialog.close());
    els.quoteClose.addEventListener("click", () => { state.pendingJob = null; els.quoteDialog.close(); });
    els.quoteCancel.addEventListener("click", () => { state.pendingJob = null; els.quoteDialog.close(); });
    els.quoteStart.addEventListener("click", startQuotedJob);
    els.taskClose.addEventListener("click", () => els.taskDialog.close());
    els.taskDialog.addEventListener("close", () => {
      state.activeJob = null;
      if (window.location.hash.startsWith("#job=")) history.replaceState(null, "", window.location.pathname + window.location.search);
    });
    window.addEventListener("hashchange", openJobFromHash);
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
    renderModels();
    updateComposer();
    if (state.demo) {
      els.connectionDot.className = "preview";
      setRuntimeNote("Preview mode · no cloud work is executed", "preview");
    }
    await registerServiceWorker();
    if (!state.demo && !state.accessToken) {
      showAccess();
      return;
    }
    await loadJobs();
    state.pollTimer = window.setInterval(() => loadJobs({ quiet: true }), 5000);
  }

  init();
})();
