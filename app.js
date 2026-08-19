const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models?output_modalities=text&sort=most-popular'
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_KEY_URL = 'https://openrouter.ai/api/v1/auth/keys'
const STATE_KEY = 'polyswap-public-v2'
const OPENROUTER_KEY_STORAGE = 'polyswap-openrouter-key-v1'
const PKCE_STORAGE = 'polyswap-openrouter-pkce-v1'

const PROVIDERS = {
  openrouter: { name: 'OpenRouter' },
  openai: { name: 'OpenAI', icon: 'assets/providers/openai.svg' },
  anthropic: { name: 'Anthropic', icon: 'assets/providers/anthropic.svg' },
  google: { name: 'Google', icon: 'assets/providers/gemini.svg' },
  'google-ai-studio': { name: 'Google', icon: 'assets/providers/gemini.svg' },
  'meta-llama': { name: 'Meta', icon: 'assets/providers/meta.svg' },
  meta: { name: 'Meta', icon: 'assets/providers/meta.svg' },
  mistralai: { name: 'Mistral AI', icon: 'assets/providers/mistral.svg' },
  mistral: { name: 'Mistral AI', icon: 'assets/providers/mistral.svg' },
  moonshotai: { name: 'Moonshot AI', icon: 'assets/providers/kimi.svg' },
  moonshot: { name: 'Moonshot AI', icon: 'assets/providers/kimi.svg' },
  qwen: { name: 'Qwen', icon: 'assets/providers/qwen.svg' },
  deepseek: { name: 'DeepSeek', icon: 'assets/providers/deepseek.svg' },
  nvidia: { name: 'NVIDIA', icon: 'assets/providers/nvidia.svg' },
  'x-ai': { name: 'xAI' },
  cohere: { name: 'Cohere' },
  perplexity: { name: 'Perplexity' }
}

const AUTO_MODEL = {
  id: 'openrouter/auto',
  name: 'Auto',
  provider: 'OpenRouter',
  providerSlug: 'openrouter',
  badge: 'A',
  note: 'Policy route',
  contextLength: 0,
  promptPrice: 0,
  completionPrice: 0,
  supportsTools: true,
  supportsImages: true,
  isFree: false,
  isAuto: true
}

const $ = selector => document.querySelector(selector)
const modelTrack = $('#modelTrack')
const modelMenu = $('#modelMenu')
const modelButton = $('#modelButton')
const modelOptions = $('#modelOptions')
const modelSearch = $('#modelSearch')
const selectedModelLabel = $('#selectedModelLabel')
const catalogStats = $('#catalogStats')
const railLabel = $('#railLabel')
const providerFilter = $('#providerFilter')
const contextFilter = $('#contextFilter')
const modalityFilter = $('#modalityFilter')
const prompt = $('#prompt')
const submitButton = $('#submitButton')
const conversation = $('#conversation')
const composer = $('#composer')
const fileInput = $('#fileInput')
const attachmentRow = $('#attachmentRow')
const connectionButton = $('#connectionButton')
const connectionInline = $('#connectionInline')
const connectionInlineLabel = $('#connectionInlineLabel')
const localState = $('#localState')
const modeButton = $('#modeButton')
const modeLabel = $('#modeLabel')

let catalog = []
let selectedModel = AUTO_MODEL
let preferredModelId = AUTO_MODEL.id
let catalogFilter = 'all'
let favorites = []
let recentModels = []
let attachments = []
let messages = []
let mode = 'chat'
let openRouterKey = localStorage.getItem(OPENROUTER_KEY_STORAGE) || ''
let activeController = null
let renderFrame = null

function titleCase(value) {
  return value.split(/[-_]/).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function providerFor(id) {
  const slug = String(id || '').split('/')[0].toLowerCase()
  return { slug, ...(PROVIDERS[slug] || { name: titleCase(slug || 'Unknown') }) }
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

  return {
    id: String(raw.id),
    name,
    provider: provider.name,
    providerSlug: provider.slug,
    icon: provider.icon,
    badge: (provider.name || '?').charAt(0).toUpperCase(),
    note: `${isFree ? 'Free · ' : ''}${supportsTools ? 'Agent' : 'Chat'}`,
    description: String(raw.description || ''),
    contextLength: safeNumber(raw.context_length),
    promptPrice,
    completionPrice,
    supportsTools,
    supportsImages: modalities.includes('image'),
    isFree,
    isAuto: false
  }
}

function allModels() {
  return [AUTO_MODEL, ...catalog]
}

function hashColor(value) {
  let hash = 0
  for (const character of value) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0
  return `hsl(${Math.abs(hash) % 360} 58% 49%)`
}

function createProviderMark(model, className = 'provider-mark') {
  const mark = document.createElement('span')
  mark.className = `${className}${model.isAuto ? ' auto-mark' : ''}`
  mark.setAttribute('aria-hidden', 'true')
  if (model.icon) {
    const image = document.createElement('img')
    image.src = model.icon
    image.alt = ''
    mark.appendChild(image)
  } else {
    mark.textContent = model.badge || '?'
    if (!model.isAuto) {
      mark.style.background = hashColor(model.providerSlug)
      mark.style.borderColor = 'transparent'
      mark.style.color = '#fff'
    }
  }
  return mark
}

function featuredModels() {
  const result = [AUTO_MODEL]
  const perProvider = new Map()
  for (const model of catalog) {
    const count = perProvider.get(model.providerSlug) || 0
    if (count >= 2) continue
    result.push(model)
    perProvider.set(model.providerSlug, count + 1)
    if (result.length >= 19) break
  }
  return result
}

function createModelChip(model) {
  const chip = document.createElement('button')
  chip.className = `model-chip${selectedModel.id === model.id ? ' active' : ''}`
  chip.type = 'button'
  chip.dataset.model = model.id
  chip.setAttribute('aria-label', `Use ${model.provider} ${model.name}`)
  chip.appendChild(createProviderMark(model, 'model-logo'))
  const name = document.createElement('span')
  name.textContent = model.name
  const note = document.createElement('small')
  note.textContent = model.note
  chip.append(name, note)
  return chip
}

function renderTrack() {
  modelTrack.replaceChildren()
  const featured = featuredModels()
  const repeated = featured.length > 1 ? [...featured, ...featured] : featured
  const fragment = document.createDocumentFragment()
  repeated.forEach(model => fragment.appendChild(createModelChip(model)))
  modelTrack.appendChild(fragment)
}

function formatContext(value) {
  if (!value) return 'Context varies'
  if (value >= 1000000) return `${(value / 1000000).toFixed(value % 1000000 ? 1 : 0)}M context`
  return `${Math.round(value / 1000)}K context`
}

function formatPrice(model) {
  if (model.isAuto) return 'Policy route'
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
    option.title = model.description
    option.appendChild(createProviderMark(model))

    const copy = document.createElement('span')
    copy.className = 'model-option-copy'
    const strong = document.createElement('strong')
    strong.textContent = model.name
    const small = document.createElement('small')
    small.textContent = `${model.provider} · ${formatContext(model.contextLength)}${model.supportsImages ? ' · Vision' : ''}`
    copy.append(strong, small)

    const note = document.createElement('small')
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

function updateSelectedButton() {
  selectedModelLabel.textContent = selectedModel.name
  const existing = modelButton.querySelector('.provider-mark')
  existing.replaceWith(createProviderMark(selectedModel))
}

function chooseModel(id, persist = true) {
  selectedModel = allModels().find(model => model.id === id) || AUTO_MODEL
  preferredModelId = selectedModel.id
  recentModels = [selectedModel.id, ...recentModels.filter(modelId => modelId !== selectedModel.id)].slice(0, 12)
  updateSelectedButton()
  modelMenu.hidden = true
  modelButton.setAttribute('aria-expanded', 'false')
  renderTrack()
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

function renderMessages() {
  conversation.replaceChildren()
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
    mode,
    draft: prompt.value,
    economy: $('#economyLabel').textContent,
    cap: $('#capLabel').textContent,
    speed: $('#speedLabel').textContent,
    proof: $('#proofLabel').textContent,
    favorites,
    recentModels,
    messages: messages.filter(message => !message.pending).slice(-30)
  }))
}

function restoreState() {
  try {
    const state = JSON.parse(localStorage.getItem(STATE_KEY) || '{}')
    preferredModelId = typeof state.selectedModel === 'string' ? state.selectedModel : AUTO_MODEL.id
    mode = state.mode === 'agent' ? 'agent' : 'chat'
    prompt.value = typeof state.draft === 'string' ? state.draft : ''
    if (['Economy', 'Free', 'Balanced', 'Frontier'].includes(state.economy)) $('#economyLabel').textContent = state.economy
    if (/^\$[0-9.]+ target$/.test(state.cap || '')) $('#capLabel').textContent = state.cap
    if (['Flexible', 'Balanced', 'Fast'].includes(state.speed)) $('#speedLabel').textContent = state.speed
    if (['Standard', 'High', 'Maximum'].includes(state.proof)) $('#proofLabel').textContent = state.proof
    favorites = Array.isArray(state.favorites) ? state.favorites.filter(value => typeof value === 'string').slice(0, 100) : []
    recentModels = Array.isArray(state.recentModels) ? state.recentModels.filter(value => typeof value === 'string').slice(0, 12) : []
    messages = Array.isArray(state.messages)
      ? state.messages.filter(message => message && ['user', 'assistant'].includes(message.role) && typeof message.text === 'string')
      : []
  } catch {
    preferredModelId = AUTO_MODEL.id
  }
  updateModeUi()
  renderMessages()
  updateSubmitState()
}

function setLocalStatus(text) {
  localState.textContent = text
}

function updateConnectionUi() {
  const connected = Boolean(openRouterKey)
  connectionButton.classList.toggle('connected', connected)
  connectionInline.classList.toggle('connected', connected)
  connectionButton.textContent = connected ? 'OpenRouter connected' : 'Connect OpenRouter'
  connectionInlineLabel.textContent = connected ? 'Connected' : 'Connect OpenRouter'
  connectionButton.title = connected ? 'Disconnect this browser from OpenRouter' : 'Connect with OpenRouter OAuth'
  connectionInline.title = connectionButton.title
}

function base64Url(bytes) {
  let binary = ''
  new Uint8Array(bytes).forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function startOAuth() {
  if (!window.crypto?.subtle) throw new Error('Secure browser cryptography is unavailable.')
  saveState()
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(48)))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = base64Url(digest)
  sessionStorage.setItem(PKCE_STORAGE, verifier)
  const callback = `${location.origin}${location.pathname}`
  const authUrl = new URL('https://openrouter.ai/auth')
  authUrl.searchParams.set('callback_url', callback)
  authUrl.searchParams.set('code_challenge', challenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  location.assign(authUrl.toString())
}

async function completeOAuthIfPresent() {
  const params = new URLSearchParams(location.search)
  const oauthError = params.get('error_description') || params.get('error')
  if (oauthError) {
    history.replaceState({}, '', `${location.pathname}#product`)
    messages.push({ role: 'assistant', text: `OpenRouter connection failed: ${oauthError}`, error: true })
    renderMessages()
    return
  }
  const code = params.get('code')
  if (!code) return
  setLocalStatus('Completing OpenRouter connection…')
  const verifier = sessionStorage.getItem(PKCE_STORAGE)
  if (!verifier) throw new Error('The secure connection request expired. Please connect again.')
  const response = await fetch(OPENROUTER_KEY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' })
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.key) throw new Error(payload.error?.message || payload.message || 'OpenRouter did not return a key.')
  openRouterKey = payload.key
  localStorage.setItem(OPENROUTER_KEY_STORAGE, openRouterKey)
  sessionStorage.removeItem(PKCE_STORAGE)
  history.replaceState({}, '', `${location.pathname}#product`)
  updateConnectionUi()
  setLocalStatus('OpenRouter connected · key stays in this browser')
}

async function connectionAction() {
  if (openRouterKey) {
    if (!window.confirm('Disconnect OpenRouter from this browser?')) return
    localStorage.removeItem(OPENROUTER_KEY_STORAGE)
    openRouterKey = ''
    updateConnectionUi()
    setLocalStatus('OpenRouter disconnected')
    return
  }
  try {
    await startOAuth()
  } catch (error) {
    messages.push({ role: 'assistant', text: `Could not start OpenRouter connection: ${error.message}`, error: true })
    renderMessages()
  }
}

async function loadCatalog() {
  setLocalStatus('Loading live OpenRouter catalog…')
  try {
    const response = await fetch(OPENROUTER_MODELS_URL, { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`catalog returned ${response.status}`)
    const payload = await response.json()
    catalog = (Array.isArray(payload.data) ? payload.data : []).map(normalizeModel).filter(model => model.id && model.id !== AUTO_MODEL.id)
    const agentCount = catalog.filter(model => model.supportsTools).length
    const freeCount = catalog.filter(model => model.isFree).length
    const providerCount = new Set(catalog.map(model => model.providerSlug)).size
    catalogStats.textContent = `${catalog.length} models · ${agentCount} agent · ${freeCount} free`
    catalogStats.title = `${providerCount} providers in the live OpenRouter catalog`
    railLabel.textContent = `${catalog.length} models`
    providerFilter.replaceChildren(new Option('Any provider', 'all'))
    const providers = [...new Map(catalog.map(model => [model.providerSlug, model.provider])).entries()].sort((a, b) => a[1].localeCompare(b[1]))
    providers.forEach(([slug, name]) => providerFilter.appendChild(new Option(name, slug)))
    chooseModel(preferredModelId, false)
    setLocalStatus(openRouterKey ? `${catalog.length} live models ready` : `${catalog.length} live models · connect to chat`)
  } catch (error) {
    catalog = []
    catalogStats.textContent = 'Catalog unavailable · Auto still works'
    railLabel.textContent = 'Models'
    chooseModel(AUTO_MODEL.id, false)
    setLocalStatus(`Catalog error · ${error.message}`)
  }
}

function updateModeUi() {
  const agent = mode === 'agent'
  modeButton.setAttribute('aria-pressed', String(agent))
  modeLabel.textContent = agent ? 'Agent' : 'Chat'
  prompt.placeholder = agent ? 'Describe the work for an agent' : 'Ask anything or describe the work'
  prompt.setAttribute('aria-label', agent ? 'Describe agent work' : 'Message PolySwap')
}

function updateSubmitState() {
  const streaming = Boolean(activeController)
  submitButton.classList.toggle('streaming', streaming)
  submitButton.disabled = streaming ? false : !prompt.value.trim()
  submitButton.setAttribute('aria-label', streaming ? 'Stop response' : 'Send message')
  submitButton.title = streaming ? 'Stop response' : 'Send message'
}

function cycle(button, values, labelSelector, pairedValues) {
  button.addEventListener('click', () => {
    const label = $(labelSelector)
    const current = values.indexOf(label.textContent)
    const next = (current + 1) % values.length
    label.textContent = values[next]
    if (pairedValues) $('#capLabel').textContent = pairedValues[next]
    setLocalStatus('Chat policy updated')
    saveState()
  })
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
  if ($('#economyLabel').textContent === 'Free') return selectedModel.isFree ? selectedModel.id : 'openrouter/free'
  return selectedModel.isAuto ? 'openrouter/auto' : selectedModel.id
}

function targetDollars() {
  const match = $('#capLabel').textContent.match(/\$([0-9.]+)/)
  return match ? Number(match[1]) : 0.2
}

function outputTokenTarget(model) {
  const routeModel = allModels().find(item => item.id === model)
  const outputPrice = routeModel?.completionPrice || 0
  if (!outputPrice || targetDollars() === 0) return 2048
  return Math.max(64, Math.min(8192, Math.floor((targetDollars() * 0.75) / outputPrice)))
}

function contentText(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.map(part => typeof part === 'string' ? part : part?.text || '').join('')
}

async function consumeStream(response, assistant) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error?.message || payload.message || `OpenRouter returned ${response.status}`)
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
    if (chunk.error) throw new Error(chunk.error.message || 'OpenRouter stream error')
    if (chunk.model) assistant.modelId = chunk.model
    if (chunk.usage) assistant.usage = chunk.usage
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
  const assistant = { role: 'assistant', text: '', pending: true, modelId: routeModel, usage: null, meta: 'Streaming from OpenRouter' }
  messages.push(assistant)
  prompt.value = ''
  attachments = []
  fileInput.value = ''
  renderAttachments()
  renderMessages()
  activeController = new AbortController()
  updateSubmitState()
  setLocalStatus(`Streaming ${routeModel}…`)
  try {
    const response = await fetch(OPENROUTER_CHAT_URL, {
      method: 'POST',
      signal: activeController.signal,
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': location.origin,
        'X-Title': 'PolySwap'
      },
      body: JSON.stringify({ model: routeModel, messages: [...previous, { role: 'user', content }], stream: true, max_tokens: outputTokenTarget(routeModel) })
    })
    await consumeStream(response, assistant)
    assistant.pending = false
    if (!assistant.text) assistant.text = 'The selected route returned no text.'
    assistant.meta = formatUsage(assistant.usage, assistant.modelId)
    setLocalStatus(assistant.usage && Number.isFinite(Number(assistant.usage.cost)) ? `Complete · ${assistant.meta}` : 'Response complete')
  } catch (error) {
    assistant.pending = false
    if (error.name === 'AbortError') {
      if (!assistant.text) assistant.text = 'Stopped.'
      assistant.meta = `${formatUsage(assistant.usage, assistant.modelId)} · Stopped`
      setLocalStatus('Response stopped')
    } else {
      assistant.error = true
      assistant.text = assistant.text ? `${assistant.text}\n\nConnection ended: ${error.message}` : `OpenRouter request failed: ${error.message}`
      assistant.meta = formatUsage(assistant.usage, assistant.modelId)
      setLocalStatus('Request failed · see message')
    }
  } finally {
    activeController = null
    updateSubmitState()
    renderMessages()
    saveState()
  }
}

modelTrack.addEventListener('click', event => {
  const chip = event.target.closest('[data-model]')
  if (chip) chooseModel(chip.dataset.model)
})

modelButton.addEventListener('click', () => {
  modelMenu.hidden = !modelMenu.hidden
  modelButton.setAttribute('aria-expanded', String(!modelMenu.hidden))
  if (!modelMenu.hidden) {
    renderOptions()
    modelSearch.focus()
  }
})

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

;[providerFilter, contextFilter, modalityFilter].forEach(filter => filter.addEventListener('change', renderOptions))

document.addEventListener('pointerdown', event => {
  if (!modelMenu.hidden && !modelMenu.contains(event.target) && !modelButton.contains(event.target)) {
    modelMenu.hidden = true
    modelButton.setAttribute('aria-expanded', 'false')
  }
})

cycle($('#economyButton'), ['Economy', 'Free', 'Balanced', 'Frontier'], '#economyLabel', ['$0.20 target', '$0.00 target', '$1.00 target', '$5.00 target'])
cycle($('#capButton'), ['$0.20 target', '$0.50 target', '$1.00 target', '$5.00 target'], '#capLabel')
cycle($('#speedButton'), ['Flexible', 'Balanced', 'Fast'], '#speedLabel')
cycle($('#proofButton'), ['Standard', 'High', 'Maximum'], '#proofLabel')

modeButton.addEventListener('click', () => {
  mode = mode === 'chat' ? 'agent' : 'chat'
  updateModeUi()
  setLocalStatus(mode === 'agent' ? 'Agent preview · hosted workers are not connected yet' : 'Chat mode · live OpenRouter inference')
  saveState()
})

prompt.addEventListener('input', () => {
  updateSubmitState()
  setLocalStatus(prompt.value.trim() ? 'Draft saved in this browser' : (openRouterKey ? 'Ready' : 'Connect OpenRouter to chat'))
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
  if (!openRouterKey) {
    setLocalStatus('Connect OpenRouter to send this message')
    try { await startOAuth() } catch (error) {
      messages.push({ role: 'assistant', text: `Could not start OpenRouter connection: ${error.message}`, error: true })
      renderMessages()
    }
    return
  }
  if (mode === 'agent') {
    messages.push(
      { role: 'user', text },
      { role: 'assistant', text: 'Hosted Agent mode is not connected yet. Switch to Chat for real model responses now. Agent execution requires an isolated worker, project storage, and a durable run queue; PolySwap will not pretend that browser-only code can safely execute your repository.', error: true }
    )
    prompt.value = ''
    updateSubmitState()
    renderMessages()
    saveState()
    setLocalStatus('Agent mode is waiting for hosted workers')
    return
  }
  try {
    await sendChat(text)
  } catch (error) {
    messages.push({ role: 'assistant', text: `Could not prepare the request: ${error.message}`, error: true })
    renderMessages()
    setLocalStatus('Request not sent')
  }
})

$('#attachButton').addEventListener('click', () => fileInput.click())
fileInput.addEventListener('change', () => {
  attachments = Array.from(fileInput.files).slice(0, 5)
  renderAttachments()
  setLocalStatus(attachments.length ? `${attachments.length} attachment${attachments.length === 1 ? '' : 's'} ready` : 'No attachments selected')
})

connectionButton.addEventListener('click', connectionAction)
connectionInline.addEventListener('click', connectionAction)

async function initialize() {
  restoreState()
  updateConnectionUi()
  updateSelectedButton()
  renderTrack()
  renderOptions()
  try {
    await completeOAuthIfPresent()
  } catch (error) {
    history.replaceState({}, '', `${location.pathname}#product`)
    messages.push({ role: 'assistant', text: `OpenRouter connection failed: ${error.message}`, error: true })
    renderMessages()
    setLocalStatus('OpenRouter connection failed')
  }
  await loadCatalog()
  updateConnectionUi()
  updateSubmitState()
}

initialize()
