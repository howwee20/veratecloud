const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models?output_modalities=text&sort=most-popular'
const POLYSWAP_API_ROOT = document.querySelector('meta[name="polyswap-api"]')?.content.replace(/\/$/, '') || 'https://api.polyswap.ai'
const STATE_KEY = 'polyswap-public-v2'
const SESSION_KEY = 'polyswap-anonymous-session-v1'
const THREAD_KEY = 'polyswap-thread-v1'

const LOBE_ICON_ROOT = 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@1.94.0/icons'
const lobeIcon = filename => `${LOBE_ICON_ROOT}/${filename}`
const favicon = domain => `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`
const OPENROUTER_MARK = lobeIcon('openrouter-color.svg')

const PROVIDERS = {
  openrouter: { name: 'OpenRouter', icon: OPENROUTER_MARK },
  ai21: { name: 'AI21 Labs', icon: lobeIcon('ai21-brand-color.svg') },
  'aion-labs': { name: 'Aion Labs', icon: lobeIcon('aionlabs-color.svg') },
  allenai: { name: 'Allen Institute for AI', icon: lobeIcon('ai2-color.svg') },
  amazon: { name: 'Amazon', icon: lobeIcon('aws-color.svg') },
  'anthracite-org': { name: 'Anthracite', icon: 'https://cdn-avatars.huggingface.co/v1/production/uploads/658a46cbfb9c2bdfae75b3a6/HDYkduzAwQRNHuRl5eYdP.png' },
  openai: { name: 'OpenAI', icon: 'assets/providers/openai.svg' },
  anthropic: { name: 'Anthropic', icon: 'assets/providers/anthropic.svg' },
  'arcee-ai': { name: 'Arcee AI', icon: lobeIcon('arcee-color.svg') },
  baidu: { name: 'Baidu', icon: lobeIcon('baidu-color.svg') },
  bytedance: { name: 'ByteDance', icon: lobeIcon('bytedance-color.svg') },
  'bytedance-seed': { name: 'ByteDance Seed', icon: lobeIcon('bytedance-color.svg') },
  cognitivecomputations: { name: 'Cognitive Computations', icon: 'https://www.gravatar.com/avatar/506bfc052d479937a4f87a78e227de47?d=retro&size=128' },
  cohere: { name: 'Cohere', icon: lobeIcon('cohere-color.svg') },
  deepcogito: { name: 'Deep Cogito', icon: lobeIcon('deepcogito-color.svg') },
  deepseek: { name: 'DeepSeek', icon: 'assets/providers/deepseek.svg' },
  'dots-studio': { name: 'Dots Studio', icon: 'https://openrouter.ai/images/icons/DotsStudio.png' },
  google: { name: 'Google', icon: 'assets/providers/gemini.svg' },
  'google-ai-studio': { name: 'Google', icon: 'assets/providers/gemini.svg' },
  gryphe: { name: 'Gryphe', icon: 'https://cdn-avatars.huggingface.co/v1/production/uploads/64ae4107ad6218d51a2a7d0c/3dcor68aYBKEcTlOUHJpK.png' },
  'ibm-granite': { name: 'IBM Granite', icon: lobeIcon('ibm.svg') },
  inception: { name: 'Inception', icon: lobeIcon('inception.svg') },
  inclusionai: { name: 'InclusionAI', icon: 'https://cdn-avatars.huggingface.co/v1/production/uploads/662e1f9da266499277937d33/fyKuazRifqiaIO34xrhhm.jpeg' },
  kwaipilot: { name: 'KwaiPilot', icon: lobeIcon('kwaipilot-color.svg') },
  liquid: { name: 'Liquid AI', icon: lobeIcon('liquid.svg') },
  mancer: { name: 'Mancer', icon: favicon('mancer.tech') },
  meituan: { name: 'Meituan', icon: 'https://cdn-avatars.huggingface.co/v1/production/uploads/61ac8f8a00d01045fca0ad2f/4TJKRXMsRyZsyi4H3rWsh.jpeg' },
  'meta-llama': { name: 'Meta', icon: 'assets/providers/meta.svg' },
  meta: { name: 'Meta', icon: 'assets/providers/meta.svg' },
  microsoft: { name: 'Microsoft', icon: lobeIcon('microsoft-color.svg') },
  minimax: { name: 'MiniMax', icon: lobeIcon('minimax-color.svg') },
  mistralai: { name: 'Mistral AI', icon: 'assets/providers/mistral.svg' },
  mistral: { name: 'Mistral AI', icon: 'assets/providers/mistral.svg' },
  moonshotai: { name: 'Moonshot AI', icon: 'assets/providers/kimi.svg' },
  moonshot: { name: 'Moonshot AI', icon: 'assets/providers/kimi.svg' },
  morph: { name: 'Morph', icon: lobeIcon('morph-color.svg') },
  'nex-agi': { name: 'Nex AGI', icon: 'https://cdn-avatars.huggingface.co/v1/production/uploads/65435cad429b80b14922ab8d/a_O9jT_daz_NXTfxtcw6S.png' },
  nousresearch: { name: 'Nous Research', icon: lobeIcon('nousresearch.svg') },
  nvidia: { name: 'NVIDIA', icon: 'assets/providers/nvidia.svg' },
  perceptron: { name: 'Perceptron', icon: favicon('perceptron.inc') },
  perplexity: { name: 'Perplexity', icon: lobeIcon('perplexity-color.svg') },
  poolside: { name: 'Poolside', icon: lobeIcon('poolside-color.svg') },
  qwen: { name: 'Qwen', icon: 'assets/providers/qwen.svg' },
  rekaai: { name: 'Reka AI', icon: 'https://cdn-avatars.huggingface.co/v1/production/uploads/67cfd5c7a9e354203d6904ec/ArJ3mrKcYxCEV23zbk7E8.jpeg' },
  relace: { name: 'Relace', icon: lobeIcon('relace.svg') },
  sakana: { name: 'Sakana AI', icon: favicon('sakana.ai') },
  sao10k: { name: 'Sao10K', icon: 'https://cdn-avatars.huggingface.co/v1/production/uploads/64be6a5376a6e2efccc638c1/gvRRLHsicTCxpURJeQDv3.jpeg' },
  stepfun: { name: 'StepFun', icon: lobeIcon('stepfun-color.svg') },
  tencent: { name: 'Tencent', icon: lobeIcon('tencent-color.svg') },
  thedrummer: { name: 'TheDrummer', icon: 'https://cdn-avatars.huggingface.co/v1/production/uploads/65f2fd1c25b848bd061b5c2e/9KR0rcumxWqnaXq3hPNKb.webp' },
  thinkingmachines: { name: 'Thinking Machines', icon: 'https://cdn-avatars.huggingface.co/v1/production/uploads/680a76de1b8d08640089fab0/r60-JyW_pv4llgjEyDYj9.png' },
  undi95: { name: 'Undi95', icon: 'https://cdn-avatars.huggingface.co/v1/production/uploads/63ab1241ad514ca8d1430003/9UwuBl5D-GuIJKIOVHm3Z.png' },
  upstage: { name: 'Upstage', icon: lobeIcon('upstage-color.svg') },
  writer: { name: 'Writer', icon: favicon('writer.com') },
  'x-ai': { name: 'xAI', icon: lobeIcon('xai.svg') },
  xiaomi: { name: 'Xiaomi', icon: lobeIcon('xiaomimimo.svg') },
  'z-ai': { name: 'Z.ai', icon: lobeIcon('zai.svg') }
}

const AUTO_MODEL = {
  id: 'openrouter/auto',
  name: 'Auto',
  provider: 'PolySwap',
  providerSlug: 'polyswap',
  icon: 'assets/polyswap-mark.png?v=2',
  badge: 'P',
  note: 'Chooses the best fit',
  contextLength: 0,
  promptPrice: 0,
  completionPrice: 0,
  supportsTools: true,
  supportsImages: true,
  isFree: false,
  isAuto: true
}

const EFFORT_LEVELS = {
  light: { label: 'Light', reasoning: 'low', budget: 0.08, maxTokens: 2048 },
  medium: { label: 'Medium', reasoning: 'medium', budget: 0.2, maxTokens: 4096 },
  high: { label: 'High', reasoning: 'high', budget: 0.4, maxTokens: 8192 },
  xhigh: { label: 'Extra High', reasoning: 'xhigh', budget: 0.7, maxTokens: 12288 },
  ultra: { label: 'Ultra', reasoning: 'max', budget: 1, maxTokens: 16384 }
}

const SPEED_LEVELS = {
  economy: { label: 'Economy' },
  standard: { label: 'Standard' },
  fast: { label: 'Fast' }
}

const $ = selector => document.querySelector(selector)
const modelMenu = $('#modelMenu')
const modelOptions = $('#modelOptions')
const modelSearch = $('#modelSearch')
const modelMenuClose = $('#modelMenuClose')
const advancedFilters = $('#advancedFilters')
const advancedFiltersButton = $('#advancedFiltersButton')
const resetFiltersButton = $('#resetFiltersButton')
const providerFilter = $('#providerFilter')
const contextFilter = $('#contextFilter')
const modalityFilter = $('#modalityFilter')
const prompt = $('#prompt')
const submitButton = $('#submitButton')
const conversation = $('#conversation')
const composer = $('#composer')
const fileInput = $('#fileInput')
const attachmentRow = $('#attachmentRow')
const localState = $('#localState')
const signInButton = $('#signInButton')
const signInDialog = $('#signInDialog')
const infoDialog = $('#infoDialog')
const infoDialogTitle = $('#infoDialogTitle')
const infoDialogBody = $('#infoDialogBody')
const homeModel = $('#homeModel')
let homeModelMark = $('#homeModelMark')
const homeModelName = $('#homeModelName')
const homeModelMeta = $('#homeModelMeta')
const policyButton = $('#policyButton')
const policySummary = $('#policySummary')
const policyMenu = $('#policyMenu')
const modelPolicyRow = $('#modelPolicyRow')
const effortPolicyRow = $('#effortPolicyRow')
const speedPolicyRow = $('#speedPolicyRow')
const modelPolicyValue = $('#modelPolicyValue')
const effortPolicyValue = $('#effortPolicyValue')
const speedPolicyValue = $('#speedPolicyValue')
const effortMenu = $('#effortMenu')
const speedMenu = $('#speedMenu')

let catalog = []
let selectedModel = AUTO_MODEL
let preferredModelId = AUTO_MODEL.id
let selectedEffort = 'medium'
let selectedSpeed = 'standard'
let catalogFilter = 'all'
let favorites = []
let recentModels = []
let attachments = []
let messages = []
let activeController = null
let renderFrame = null
let homeModelTimer = null
let homeModelIndex = 0
let homeModels = []

function newId(prefix) {
  const value = window.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${prefix}_${value}`
}

function persistentId(key, prefix) {
  let value = localStorage.getItem(key)
  if (!value) {
    value = newId(prefix)
    localStorage.setItem(key, value)
  }
  return value
}

const sessionId = persistentId(SESSION_KEY, 'anon')
let threadId = persistentId(THREAD_KEY, 'thread')

function titleCase(value) {
  return value.split(/[-_]/).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function providerFor(id) {
  const slug = String(id || '').split('/')[0].toLowerCase().replace(/^~/, '')
  return { slug, ...(PROVIDERS[slug] || { name: titleCase(slug || 'Unknown'), icon: OPENROUTER_MARK }) }
}

function safeNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function normalizeModel(raw) {
  const provider = providerFor(raw.id)
  const parameters = Array.isArray(raw.supported_parameters) ? raw.supported_parameters.map(String) : []
  const modalities = Array.isArray(raw.architecture?.input_modalities) ? raw.architecture.input_modalities.map(String) : []
  const promptPrice = safeNumber(raw.pricing?.prompt)
  const completionPrice = safeNumber(raw.pricing?.completion)
  const isFree = promptPrice === 0 && completionPrice === 0
  const rawName = String(raw.name || String(raw.id || '').split('/').pop() || 'Unknown model')
  const name = rawName.includes(':') ? rawName.slice(rawName.indexOf(':') + 1).trim() : rawName
  const supportsTools = parameters.includes('tools') || parameters.includes('tool_choice')
  const supportsReasoning = Boolean(raw.reasoning) || parameters.includes('reasoning') || parameters.includes('reasoning_effort')

  return {
    id: String(raw.id),
    name,
    provider: provider.name,
    providerSlug: provider.slug,
    icon: provider.icon,
    badge: (provider.name || '?').charAt(0).toUpperCase(),
    note: `${isFree ? 'Free · ' : ''}${supportsTools ? 'Agent' : 'Model'}`,
    description: String(raw.description || ''),
    contextLength: safeNumber(raw.context_length),
    promptPrice,
    completionPrice,
    supportsTools,
    supportsReasoning,
    supportedEfforts: Array.isArray(raw.reasoning?.supported_efforts) ? raw.reasoning.supported_efforts.map(String) : [],
    supportsImages: modalities.includes('image'),
    isFree,
    isAuto: false
  }
}

function allModels() {
  return [AUTO_MODEL, ...catalog]
}

function createProviderMark(model, className = 'provider-mark') {
  const mark = document.createElement('span')
  mark.className = `${className}${model.isAuto ? ' auto-mark' : ''}`
  mark.setAttribute('aria-hidden', 'true')
  if (model.icon) {
    const image = document.createElement('img')
    image.src = model.icon
    image.alt = ''
    image.addEventListener('error', () => {
      if (image.src === OPENROUTER_MARK) return
      image.src = OPENROUTER_MARK
    }, { once: true })
    mark.appendChild(image)
  } else {
    mark.textContent = model.badge || '?'
  }
  return mark
}

function featuredHomeModels() {
  const providerOrder = ['openai', 'anthropic', 'google', 'x-ai', 'deepseek', 'meta-llama', 'mistralai']
  const featured = providerOrder.map(slug => catalog.find(model => model.providerSlug === slug && (model.supportsTools || model.supportsImages)) || catalog.find(model => model.providerSlug === slug)).filter(Boolean)
  if (featured.length >= 3) return featured
  return catalog.slice(0, 6)
}

function homeModelDescription(model) {
  const details = [model.provider]
  if (model.isFree) details.push('Free')
  if (model.supportsTools) details.push('Tools')
  if (model.supportsImages) details.push('Vision')
  if (details.length < 3) details.push(formatContext(model.contextLength))
  return details.slice(0, 3).join(' · ')
}

function paintHomeModel(model) {
  const nextMark = createProviderMark(model, 'home-model-mark')
  nextMark.id = 'homeModelMark'
  homeModelMark.replaceWith(nextMark)
  homeModelMark = nextMark
  homeModelName.textContent = model.name
  homeModelMeta.textContent = homeModelDescription(model)
}

function rotateHomeModel() {
  if (!homeModels.length || document.body.classList.contains('has-conversation')) return
  homeModel.classList.add('is-switching')
  window.setTimeout(() => {
    homeModelIndex = (homeModelIndex + 1) % homeModels.length
    paintHomeModel(homeModels[homeModelIndex])
    homeModel.classList.remove('is-switching')
  }, 170)
}

function startHomeModelRotation() {
  if (homeModelTimer) window.clearInterval(homeModelTimer)
  homeModels = featuredHomeModels()
  homeModelIndex = 0
  if (!homeModels.length) return
  paintHomeModel(homeModels[0])
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && homeModels.length > 1) {
    homeModelTimer = window.setInterval(rotateHomeModel, 1900)
  }
}

function formatContext(value) {
  if (!value) return 'Context varies'
  if (value >= 1000000) return `${(value / 1000000).toFixed(value % 1000000 ? 1 : 0)}M context`
  return `${Math.round(value / 1000)}K context`
}

function formatPrice(model) {
  if (model.isAuto) return 'Automatic'
  if (model.isFree) return 'Free'
  const input = model.promptPrice * 1000000
  const output = model.completionPrice * 1000000
  const concise = value => value < 0.01 ? '<$0.01' : `$${value < 10 ? value.toFixed(2) : Math.round(value)}`
  return `${concise(input)} / ${concise(output)} per 1M`
}

function filteredModels() {
  const query = modelSearch.value.trim().toLowerCase()
  const minimumContext = Number(contextFilter.value)
  const visible = allModels().filter(model => {
    const matchesFilter = catalogFilter === 'all' ||
      (catalogFilter === 'agent' && model.supportsTools) ||
      (catalogFilter === 'free' && model.isFree) ||
      (catalogFilter === 'vision' && model.supportsImages) ||
      (catalogFilter === 'favorites' && favorites.includes(model.id)) ||
      (catalogFilter === 'recent' && recentModels.includes(model.id))
    const matchesProvider = providerFilter.value === 'all' || model.providerSlug === providerFilter.value
    const matchesContext = !minimumContext || model.contextLength >= minimumContext
    const matchesModality = modalityFilter.value === 'all' || model.supportsImages
    const haystack = `${model.name} ${model.provider} ${model.id} ${model.note}`.toLowerCase()
    return matchesFilter && matchesProvider && matchesContext && matchesModality && haystack.includes(query)
  })
  if (catalogFilter === 'recent') visible.sort((a, b) => recentModels.indexOf(a.id) - recentModels.indexOf(b.id))
  return visible
}

function renderOptions() {
  modelOptions.replaceChildren()
  const visible = filteredModels()
  if (!visible.length) {
    const empty = document.createElement('div')
    empty.className = 'model-empty'
    empty.textContent = 'No models match this search.'
    modelOptions.appendChild(empty)
    return
  }

  const fragment = document.createDocumentFragment()
  visible.forEach(model => {
    const row = document.createElement('div')
    row.className = `model-option-row${selectedModel.id === model.id ? ' active' : ''}`
    const option = document.createElement('button')
    option.className = 'model-option'
    option.type = 'button'
    option.dataset.model = model.id
    option.setAttribute('aria-pressed', String(selectedModel.id === model.id))
    option.setAttribute('aria-label', `${model.name} by ${model.provider}. ${formatPrice(model)}.`)
    option.appendChild(createProviderMark(model))

    const copy = document.createElement('span')
    copy.className = 'model-option-copy'
    const strong = document.createElement('strong')
    strong.textContent = model.name
    const small = document.createElement('small')
    small.textContent = model.isAuto
      ? 'PolySwap · Chooses the best model for the request'
      : `${model.provider} · ${formatContext(model.contextLength)}${model.supportsImages ? ' · Vision' : ''}${model.supportsTools ? ' · Tools' : ''}`
    copy.append(strong, small)

    const note = document.createElement('small')
    note.className = `model-option-price${model.isFree ? ' free' : ''}`
    note.textContent = formatPrice(model)
    option.append(copy, note)

    const favorite = document.createElement('button')
    favorite.className = `favorite-button${favorites.includes(model.id) ? ' active' : ''}`
    favorite.type = 'button'
    favorite.dataset.favorite = model.id
    favorite.textContent = favorites.includes(model.id) ? '★' : '☆'
    favorite.setAttribute('aria-label', `${favorites.includes(model.id) ? 'Remove' : 'Add'} ${model.name} ${favorites.includes(model.id) ? 'from' : 'to'} favorites`)
    row.append(option, favorite)
    fragment.appendChild(row)
  })
  modelOptions.appendChild(fragment)
}

function updatePolicyDisplay() {
  const effort = EFFORT_LEVELS[selectedEffort]
  const speed = SPEED_LEVELS[selectedSpeed]
  policySummary.textContent = `${selectedModel.name} · ${effort.label} · ${speed.label}`
  policyButton.setAttribute('aria-label', `Model ${selectedModel.name}, ${effort.label} effort, ${speed.label} speed`)
  modelPolicyValue.textContent = selectedModel.name
  effortPolicyValue.textContent = effort.label
  speedPolicyValue.textContent = speed.label

  const existing = policyButton.querySelector('.policy-model-mark')
  existing?.replaceWith(createProviderMark(selectedModel, 'policy-model-mark'))
  effortMenu.querySelectorAll('[data-effort]').forEach(option => option.setAttribute('aria-checked', String(option.dataset.effort === selectedEffort)))
  speedMenu.querySelectorAll('[data-speed]').forEach(option => option.setAttribute('aria-checked', String(option.dataset.speed === selectedSpeed)))
}

function closePolicySubmenus() {
  effortMenu.hidden = true
  speedMenu.hidden = true
  effortPolicyRow.setAttribute('aria-expanded', 'false')
  speedPolicyRow.setAttribute('aria-expanded', 'false')
}

function closePolicyMenu({ returnFocus = false } = {}) {
  closePolicySubmenus()
  policyMenu.hidden = true
  policyButton.setAttribute('aria-expanded', 'false')
  if (returnFocus) policyButton.focus()
}

function openPolicyMenu() {
  closeModelMenu()
  policyMenu.hidden = false
  policyButton.setAttribute('aria-expanded', 'true')
}

function togglePolicyMenu() {
  if (policyMenu.hidden) openPolicyMenu()
  else closePolicyMenu()
}

function openPolicySubmenu(menu, trigger) {
  const willOpen = menu.hidden
  closePolicySubmenus()
  if (!willOpen) return
  menu.hidden = false
  trigger.setAttribute('aria-expanded', 'true')
}

function openModelMenu({ focusSearch = false } = {}) {
  closePolicyMenu()
  if (modelMenu.hidden) {
    modelMenu.hidden = false
    renderOptions()
  }
  if (focusSearch) window.requestAnimationFrame(() => modelSearch.focus())
}

function closeModelMenu({ returnFocus = false } = {}) {
  modelMenu.hidden = true
  if (returnFocus) policyButton.focus()
}

function updateAdvancedFiltersButton() {
  const active = providerFilter.value !== 'all' || contextFilter.value !== '0' || modalityFilter.value !== 'all'
  advancedFiltersButton.classList.toggle('active', active)
  advancedFiltersButton.setAttribute('aria-label', active ? 'Filters are active' : 'More model filters')
}

function chooseModel(id, persist = true) {
  selectedModel = allModels().find(model => model.id === id) || AUTO_MODEL
  preferredModelId = selectedModel.id
  recentModels = [selectedModel.id, ...recentModels.filter(modelId => modelId !== selectedModel.id)].slice(0, 12)
  updatePolicyDisplay()
  closeModelMenu()
  renderOptions()
  if (persist) saveState()
}

function formatUsage(usage, modelId) {
  const parts = []
  const model = allModels().find(item => item.id === modelId)
  parts.push(model?.name || modelId || selectedModel.name)
  if (usage && Number.isFinite(Number(usage.cost))) {
    const cost = Number(usage.cost)
    parts.push(cost === 0 ? 'Free' : `$${cost < 0.01 ? cost.toFixed(5) : cost.toFixed(3)}`)
  }
  if (usage?.prompt_tokens || usage?.completion_tokens) parts.push(`${usage.prompt_tokens || 0} in · ${usage.completion_tokens || 0} out`)
  return parts.join(' · ')
}

function formatPolicy(effort, speed) {
  return `${EFFORT_LEVELS[effort]?.label || 'Medium'} · ${SPEED_LEVELS[speed]?.label || 'Standard'}`
}

function renderMessages() {
  conversation.replaceChildren()
  document.body.classList.toggle('has-conversation', messages.length > 0)
  if (!messages.length) return
  const turns = document.createElement('div')
  turns.className = 'turns'
  messages.forEach(message => {
    const turn = document.createElement('div')
    if (message.role === 'user') {
      turn.className = 'user-turn'
      turn.textContent = message.text
    } else {
      turn.className = `assistant-turn${message.pending ? ' pending' : ''}${message.error ? ' error' : ''}`
      const body = document.createElement('div')
      body.className = 'message-body'
      body.textContent = message.text || (message.pending ? 'Thinking…' : '')
      turn.appendChild(body)
      if (message.meta) {
        const meta = document.createElement('div')
        meta.className = 'message-meta'
        meta.textContent = message.meta
        turn.appendChild(meta)
      }
    }
    turns.appendChild(turn)
  })
  conversation.appendChild(turns)
  conversation.scrollTop = conversation.scrollHeight
}

function scheduleRender() {
  if (renderFrame) return
  renderFrame = requestAnimationFrame(() => {
    renderFrame = null
    renderMessages()
  })
}

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify({
    selectedModel: preferredModelId,
    selectedEffort,
    selectedSpeed,
    draft: prompt.value,
    favorites,
    recentModels,
    messages: messages.filter(message => !message.pending).slice(-30)
  }))
}

function restoreState() {
  try {
    const state = JSON.parse(localStorage.getItem(STATE_KEY) || '{}')
    preferredModelId = typeof state.selectedModel === 'string' ? state.selectedModel : AUTO_MODEL.id
    selectedEffort = Object.hasOwn(EFFORT_LEVELS, state.selectedEffort) ? state.selectedEffort : 'medium'
    selectedSpeed = Object.hasOwn(SPEED_LEVELS, state.selectedSpeed) ? state.selectedSpeed : 'standard'
    prompt.value = typeof state.draft === 'string' ? state.draft : ''
    favorites = Array.isArray(state.favorites) ? state.favorites.filter(value => typeof value === 'string').slice(0, 100) : []
    recentModels = Array.isArray(state.recentModels) ? state.recentModels.filter(value => typeof value === 'string').slice(0, 12) : []
    messages = Array.isArray(state.messages)
      ? state.messages.filter(message => message && ['user', 'assistant'].includes(message.role) && typeof message.text === 'string')
      : []
  } catch {
    preferredModelId = AUTO_MODEL.id
    selectedEffort = 'medium'
    selectedSpeed = 'standard'
  }
  renderMessages()
  updateSubmitState()
}

function setLocalStatus(text) {
  localState.textContent = text
}

async function loadCatalog() {
  setLocalStatus('')
  try {
    let response = await fetch(`${POLYSWAP_API_ROOT}/v1/models`, { headers: { Accept: 'application/json' } }).catch(() => null)
    if (!response?.ok) response = await fetch(OPENROUTER_MODELS_URL, { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`catalog returned ${response.status}`)
    const payload = await response.json()
    catalog = (Array.isArray(payload.data) ? payload.data : []).map(normalizeModel).filter(model => model.id && model.id !== AUTO_MODEL.id)
    providerFilter.replaceChildren(new Option('Any provider', 'all'))
    const providers = [...new Map(catalog.map(model => [model.providerSlug, model.provider])).entries()].sort((a, b) => a[1].localeCompare(b[1]))
    providers.forEach(([slug, name]) => providerFilter.appendChild(new Option(name, slug)))
    chooseModel(preferredModelId, false)
    startHomeModelRotation()
    setLocalStatus('')
  } catch (error) {
    catalog = []
    chooseModel(AUTO_MODEL.id, false)
    setLocalStatus(`Catalog error · ${error.message}`)
  }
}

function updateSubmitState() {
  const streaming = Boolean(activeController)
  submitButton.classList.toggle('streaming', streaming)
  submitButton.disabled = streaming ? false : !prompt.value.trim()
  submitButton.setAttribute('aria-label', streaming ? 'Stop response' : 'Send message')
  submitButton.title = streaming ? 'Stop response' : 'Send message'
}

function renderAttachments() {
  attachmentRow.hidden = attachments.length === 0
  attachmentRow.replaceChildren()
  attachments.forEach(file => {
    const chip = document.createElement('span')
    chip.className = 'attachment-chip'
    chip.textContent = file.name
    chip.title = `${file.name} · ${Math.max(1, Math.round(file.size / 1024))} KB`
    attachmentRow.appendChild(chip)
  })
}

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error(`Could not read ${file.name}`))
    reader.readAsDataURL(file)
  })
}

function isTextFile(file) {
  return file.type.startsWith('text/') || /\.(txt|md|json|csv|js|ts|tsx|jsx|py|html|css|xml|ya?ml)$/i.test(file.name)
}

async function buildUserContent(text) {
  const textParts = [text]
  const images = []
  for (const file of attachments) {
    if (file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} is larger than the 5 MB image limit.`)
      images.push({ type: 'image_url', image_url: { url: await fileAsDataUrl(file) } })
    } else if (isTextFile(file)) {
      if (file.size > 100 * 1024) throw new Error(`${file.name} is larger than the 100 KB text-file limit.`)
      textParts.push(`\n\n--- ${file.name} ---\n${await file.text()}`)
    } else {
      throw new Error(`${file.name} is not a supported text or image file.`)
    }
  }
  if (images.length && !selectedModel.supportsImages) throw new Error(`${selectedModel.name} does not advertise image input. Choose Auto or a Vision model.`)
  const combinedText = textParts.join('')
  return images.length ? [{ type: 'text', text: combinedText }, ...images] : combinedText
}

function resolveRouteModel() {
  return selectedModel.isAuto ? 'openrouter/auto' : selectedModel.id
}

function targetDollars() {
  return EFFORT_LEVELS[selectedEffort].budget
}

function outputTokenTarget(model) {
  const effort = EFFORT_LEVELS[selectedEffort]
  const routeModel = allModels().find(item => item.id === model)
  const outputPrice = routeModel?.completionPrice || 0
  if (!outputPrice || targetDollars() === 0) return effort.maxTokens
  return Math.max(1536, Math.min(effort.maxTokens, Math.floor((targetDollars() * 0.75) / outputPrice)))
}

function contentText(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.map(part => typeof part === 'string' ? part : part?.text || '').join('')
}

async function consumeStream(response, assistant) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error?.message || payload.message || `PolySwap returned ${response.status}`)
  }
  if (!response.body) throw new Error('The browser did not receive a response stream.')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const processLine = line => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return
    const data = trimmed.slice(5).trim()
    if (!data || data === '[DONE]') return
    const chunk = JSON.parse(data)
    if (chunk.error) throw new Error(chunk.error.message || 'PolySwap stream error')
    if (chunk.model) assistant.modelId = chunk.model
    if (chunk.usage) assistant.usage = chunk.usage
    if (chunk.service_tier) assistant.serviceTier = chunk.service_tier
    const text = contentText(chunk.choices?.[0]?.delta?.content)
    if (text) {
      assistant.text += text
      scheduleRender()
    }
  }
  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ''
    for (const line of lines) processLine(line)
    if (done) break
  }
  if (buffer.trim()) processLine(buffer)
}

async function sendChat(text) {
  const previous = messages.filter(message => !message.pending && !message.error && ['user', 'assistant'].includes(message.role)).slice(-24).map(message => ({ role: message.role, content: message.text }))
  const content = await buildUserContent(text)
  const displaySuffix = attachments.length ? `\n\n${attachments.map(file => `Attached: ${file.name}`).join('\n')}` : ''
  messages.push({ role: 'user', text: text + displaySuffix })
  const routeModel = resolveRouteModel()
  const effort = selectedEffort
  const speed = selectedSpeed
  const assistant = { role: 'assistant', text: '', pending: true, modelId: routeModel, usage: null, effort, speed, meta: `Working · ${formatPolicy(effort, speed)}` }
  messages.push(assistant)
  prompt.value = ''
  attachments = []
  fileInput.value = ''
  renderAttachments()
  renderMessages()
  activeController = new AbortController()
  updateSubmitState()
  setLocalStatus(`Working · ${selectedModel.name} · ${formatPolicy(effort, speed)}`)
  try {
    const response = await fetch(`${POLYSWAP_API_ROOT}/v1/chat`, {
      method: 'POST',
      signal: activeController.signal,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        threadId,
        model: routeModel,
        messages: [...previous, { role: 'user', content }],
        stream: true,
        maxTokens: outputTokenTarget(routeModel),
        budgetTarget: targetDollars(),
        effort,
        speed
      })
    })
    await consumeStream(response, assistant)
    assistant.pending = false
    if (!assistant.text) assistant.text = 'The selected route returned no text.'
    assistant.meta = `${formatUsage(assistant.usage, assistant.modelId)} · ${formatPolicy(effort, speed)}`
    setLocalStatus(assistant.usage && Number.isFinite(Number(assistant.usage.cost)) ? `Complete · ${assistant.meta}` : 'Response complete')
  } catch (error) {
    assistant.pending = false
    if (error.name === 'AbortError') {
      if (!assistant.text) assistant.text = 'Stopped.'
      assistant.meta = `${formatUsage(assistant.usage, assistant.modelId)} · ${formatPolicy(effort, speed)} · Stopped`
      setLocalStatus('Response stopped')
    } else {
      assistant.error = true
      assistant.text = assistant.text ? `${assistant.text}\n\nConnection ended: ${error.message}` : `Model request failed: ${error.message}`
      assistant.meta = `${formatUsage(assistant.usage, assistant.modelId)} · ${formatPolicy(effort, speed)}`
      setLocalStatus('Request failed · see message')
    }
  } finally {
    activeController = null
    updateSubmitState()
    renderMessages()
    saveState()
  }
}

policyButton.addEventListener('click', togglePolicyMenu)
modelPolicyRow.addEventListener('click', () => openModelMenu({ focusSearch: true }))
effortPolicyRow.addEventListener('click', () => openPolicySubmenu(effortMenu, effortPolicyRow))
speedPolicyRow.addEventListener('click', () => openPolicySubmenu(speedMenu, speedPolicyRow))

effortMenu.addEventListener('click', event => {
  const option = event.target.closest('[data-effort]')
  if (!option || !Object.hasOwn(EFFORT_LEVELS, option.dataset.effort)) return
  selectedEffort = option.dataset.effort
  updatePolicyDisplay()
  closePolicySubmenus()
  saveState()
})

speedMenu.addEventListener('click', event => {
  const option = event.target.closest('[data-speed]')
  if (!option || !Object.hasOwn(SPEED_LEVELS, option.dataset.speed)) return
  selectedSpeed = option.dataset.speed
  updatePolicyDisplay()
  closePolicySubmenus()
  saveState()
})

modelMenuClose.addEventListener('click', () => closeModelMenu({ returnFocus: true }))

modelOptions.addEventListener('click', event => {
  const favorite = event.target.closest('[data-favorite]')
  if (favorite) {
    const id = favorite.dataset.favorite
    favorites = favorites.includes(id) ? favorites.filter(modelId => modelId !== id) : [id, ...favorites]
    renderOptions()
    saveState()
    return
  }
  const option = event.target.closest('[data-model]')
  if (option) chooseModel(option.dataset.model)
})

modelSearch.addEventListener('input', renderOptions)

document.querySelector('.model-filter-bar').addEventListener('click', event => {
  const button = event.target.closest('[data-catalog-filter]')
  if (!button) return
  catalogFilter = button.dataset.catalogFilter
  document.querySelectorAll('[data-catalog-filter]').forEach(item => item.classList.toggle('active', item === button))
  renderOptions()
})

advancedFiltersButton.addEventListener('click', () => {
  advancedFilters.hidden = !advancedFilters.hidden
  advancedFiltersButton.setAttribute('aria-expanded', String(!advancedFilters.hidden))
})

resetFiltersButton.addEventListener('click', () => {
  providerFilter.value = 'all'
  contextFilter.value = '0'
  modalityFilter.value = 'all'
  updateAdvancedFiltersButton()
  renderOptions()
})

;[providerFilter, contextFilter, modalityFilter].forEach(filter => filter.addEventListener('change', () => {
  updateAdvancedFiltersButton()
  renderOptions()
}))

document.addEventListener('pointerdown', event => {
  if (!modelMenu.hidden && !modelMenu.contains(event.target) && !homeModel.contains(event.target)) {
    closeModelMenu()
  }
  const insidePolicy = policyButton.contains(event.target) || policyMenu.contains(event.target) || effortMenu.contains(event.target) || speedMenu.contains(event.target)
  if (!policyMenu.hidden && !insidePolicy) closePolicyMenu()
})

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return
  if (!modelMenu.hidden) return closeModelMenu({ returnFocus: true })
  if (!effortMenu.hidden || !speedMenu.hidden) return closePolicySubmenus()
  if (!policyMenu.hidden) closePolicyMenu({ returnFocus: true })
})

prompt.addEventListener('input', () => {
  updateSubmitState()
  setLocalStatus(prompt.value.trim() ? 'Draft saved in this browser' : '')
  saveState()
})

prompt.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    composer.requestSubmit()
  }
})

composer.addEventListener('submit', async event => {
  event.preventDefault()
  if (activeController) {
    activeController.abort()
    return
  }
  const text = prompt.value.trim()
  if (!text) return
  try {
    await sendChat(text)
  } catch (error) {
    messages.push({ role: 'assistant', text: `Could not prepare the request: ${error.message}`, error: true })
    renderMessages()
    setLocalStatus('Request not sent')
  }
})

signInButton.addEventListener('click', () => {
  if (typeof signInDialog.showModal === 'function') signInDialog.showModal()
})

homeModel.addEventListener('click', () => openModelMenu())

$('#promptExamples').addEventListener('click', event => {
  const example = event.target.closest('[data-example-prompt]')
  if (!example) return
  prompt.value = example.dataset.examplePrompt
  prompt.focus()
  updateSubmitState()
  setLocalStatus('Draft saved in this browser')
  saveState()
})

const FOOTER_INFO = {
  privacy: ['Privacy', 'Your draft and anonymous conversation history stay in this browser. When you send a prompt, PolySwap sends it through the selected model route to generate a response.'],
  terms: ['Terms', 'PolySwap is an early product. Review important outputs before relying on them; model responses can be incomplete or wrong.'],
  pricing: ['Pricing', 'The model picker shows each route\u2019s available usage pricing. Accounts and paid plans are not live yet.'],
  docs: ['Docs', 'Choose the model, effort, and speed. PolySwap translates those choices into reasoning depth, provider routing, and delivery priority while keeping the workspace stable.']
}

document.querySelector('.site-footer').addEventListener('click', event => {
  const trigger = event.target.closest('[data-footer-info]')
  if (!trigger) return
  const [title, body] = FOOTER_INFO[trigger.dataset.footerInfo]
  infoDialogTitle.textContent = title
  infoDialogBody.textContent = body
  if (typeof infoDialog.showModal === 'function') infoDialog.showModal()
})

$('#attachButton').addEventListener('click', () => fileInput.click())
fileInput.addEventListener('change', () => {
  attachments = Array.from(fileInput.files).slice(0, 5)
  renderAttachments()
  setLocalStatus(attachments.length ? `${attachments.length} attachment${attachments.length === 1 ? '' : 's'} ready` : 'No attachments selected')
})

async function initialize() {
  restoreState()
  updatePolicyDisplay()
  renderOptions()
  await loadCatalog()
  updateSubmitState()
}

initialize()
