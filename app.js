const models = [
  { id: 'auto', name: 'Auto', provider: 'Polyswap', badge: 'A', color: '#25252a', note: 'Policy route' },
  { id: 'google-gemma', name: 'Gemma 4 26B A4B', provider: 'Google', badge: 'G', color: '#4285f4', note: 'Free' },
  { id: 'nvidia-nemotron', name: 'Nemotron 3 Nano 30B A3B', provider: 'NVIDIA', badge: 'N', color: '#76b900', note: 'Free' },
  { id: 'openai-gpt', name: 'GPT', provider: 'OpenAI', badge: 'O', color: '#171717', note: 'Cloud' },
  { id: 'anthropic-claude', name: 'Claude Sonnet', provider: 'Anthropic', badge: 'A', color: '#d97757', note: 'Cloud' },
  { id: 'google-gemini', name: 'Gemini Pro', provider: 'Google', badge: 'G', color: '#5b6cf8', note: 'Cloud' },
  { id: 'moonshot-kimi', name: 'Kimi K2', provider: 'MoonshotAI', badge: 'K', color: '#6657d9', note: 'Cloud' },
  { id: 'qwen-coder', name: 'Qwen Coder', provider: 'Qwen', badge: 'Q', color: '#6954d8', note: 'Cloud' },
  { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'DeepSeek', badge: 'D', color: '#4d6bfe', note: 'Cloud' },
  { id: 'meta-llama', name: 'Llama', provider: 'Meta', badge: 'M', color: '#1677ff', note: 'Open' },
  { id: 'mistral', name: 'Mistral', provider: 'Mistral AI', badge: 'M', color: '#f7a600', note: 'Cloud' }
]

const $ = selector => document.querySelector(selector)
const modelTrack = $('#modelTrack')
const modelMenu = $('#modelMenu')
const modelButton = $('#modelButton')
const modelOptions = $('#modelOptions')
const modelSearch = $('#modelSearch')
const selectedModelLabel = $('#selectedModelLabel')
const prompt = $('#prompt')
const submitButton = $('#submitButton')
const conversation = $('#conversation')
const composer = $('#composer')
const fileInput = $('#fileInput')
const attachmentRow = $('#attachmentRow')
const accessButton = $('#access')
const accessLabel = $('#accessLabel')
const localState = $('#localState')

let selectedModel = models[0]
let attachments = []
let fullAccess = true
let messages = []

function providerMark(model) {
  return '<span class="provider-mark" style="background:' + model.color + ';border-color:' + model.color + ';color:#fff">' + model.badge + '</span>'
}

function modelChip(model) {
  const active = selectedModel.id === model.id ? ' active' : ''
  return '<button class="model-chip' + active + '" type="button" data-model="' + model.id + '" aria-label="Use ' + model.provider + ' ' + model.name + '"><span class="model-dot" style="background:' + model.color + '">' + model.badge + '</span><span>' + model.name + '</span><small>' + model.note + '</small></button>'
}

function renderTrack() {
  modelTrack.innerHTML = models.concat(models).map(modelChip).join('')
}

function renderOptions(query) {
  const clean = (query || '').trim().toLowerCase()
  const visible = models.filter(model => (model.name + ' ' + model.provider + ' ' + model.note).toLowerCase().includes(clean))
  modelOptions.innerHTML = visible.map(model => {
    const active = selectedModel.id === model.id ? ' active' : ''
    return '<button class="model-option' + active + '" type="button" data-model="' + model.id + '">' +
      providerMark(model) +
      '<span class="model-option-copy"><strong>' + model.name + '</strong><small>' + model.provider + '</small></span>' +
      '<small>' + model.note + '</small></button>'
  }).join('')
}

function chooseModel(id) {
  selectedModel = models.find(model => model.id === id) || models[0]
  selectedModelLabel.textContent = selectedModel.name
  const mark = modelButton.querySelector('.provider-mark')
  mark.textContent = selectedModel.badge
  mark.style.background = selectedModel.color
  mark.style.borderColor = selectedModel.color
  mark.style.color = '#fff'
  modelMenu.hidden = true
  modelButton.setAttribute('aria-expanded', 'false')
  renderTrack()
  renderOptions(modelSearch.value)
  saveState()
}

function renderMessages() {
  conversation.replaceChildren()
  if (!messages.length) return
  const turns = document.createElement('div')
  turns.className = 'turns'
  messages.forEach(message => {
    const turn = document.createElement('div')
    turn.className = message.role === 'user' ? 'user-turn' : 'assistant-turn' + (message.pending ? ' pending' : '')
    turn.textContent = message.text
    turns.appendChild(turn)
  })
  conversation.appendChild(turns)
  conversation.scrollTop = conversation.scrollHeight
}

function saveState() {
  localStorage.setItem('polyswap-public-v1', JSON.stringify({
    selectedModel: selectedModel.id,
    fullAccess,
    messages: messages.slice(-20)
  }))
}

function restoreState() {
  try {
    const state = JSON.parse(localStorage.getItem('polyswap-public-v1') || '{}')
    selectedModel = models.find(model => model.id === state.selectedModel) || models[0]
    fullAccess = state.fullAccess !== false
    messages = Array.isArray(state.messages)
      ? state.messages.filter(message => message && typeof message.text === 'string' && !message.pending)
      : []
  } catch {
    selectedModel = models[0]
  }
  accessButton.setAttribute('aria-pressed', String(fullAccess))
  accessLabel.textContent = fullAccess ? 'Full access' : 'Review mode'
  chooseModel(selectedModel.id)
  renderMessages()
}

function cycle(button, values, labelSelector, pairedValues) {
  button.addEventListener('click', () => {
    const label = $(labelSelector)
    const current = values.indexOf(label.textContent)
    const next = (current + 1) % values.length
    label.textContent = values[next]
    if (pairedValues) $('#capLabel').textContent = pairedValues[next]
    localState.textContent = 'Policy updated locally'
  })
}

modelTrack.addEventListener('click', event => {
  const chip = event.target.closest('[data-model]')
  if (chip) chooseModel(chip.dataset.model)
})

modelButton.addEventListener('click', () => {
  modelMenu.hidden = !modelMenu.hidden
  modelButton.setAttribute('aria-expanded', String(!modelMenu.hidden))
  if (!modelMenu.hidden) {
    renderOptions(modelSearch.value)
    modelSearch.focus()
  }
})

modelOptions.addEventListener('click', event => {
  const option = event.target.closest('[data-model]')
  if (option) chooseModel(option.dataset.model)
})
modelSearch.addEventListener('input', () => renderOptions(modelSearch.value))

document.addEventListener('pointerdown', event => {
  if (!modelMenu.hidden && !modelMenu.contains(event.target) && !modelButton.contains(event.target)) {
    modelMenu.hidden = true
    modelButton.setAttribute('aria-expanded', 'false')
  }
})

cycle($('#economyButton'), ['Economy', 'Free', 'Balanced', 'Frontier'], '#economyLabel', ['$0.20 cap', '$0.00 cap', '$1.00 cap', '$5.00 cap'])
cycle($('#capButton'), ['$0.20 cap', '$0.50 cap', '$1.00 cap', '$5.00 cap'], '#capLabel')
cycle($('#speedButton'), ['Flexible', 'Balanced', 'Fast'], '#speedLabel')
cycle($('#proofButton'), ['Standard', 'High', 'Maximum'], '#proofLabel')

prompt.addEventListener('input', () => {
  submitButton.disabled = !prompt.value.trim()
  localState.textContent = prompt.value.trim() ? 'Draft saved locally' : 'Drafts stay in this browser'
})

prompt.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    composer.requestSubmit()
  }
})

composer.addEventListener('submit', event => {
  event.preventDefault()
  const text = prompt.value.trim()
  if (!text) return
  messages.push({ role: 'user', text })
  prompt.value = ''
  submitButton.disabled = true
  attachments = []
  renderAttachments()
  const pending = { role: 'assistant', text: 'Preparing the hosted execution connection…', pending: true }
  messages.push(pending)
  renderMessages()
  setTimeout(() => {
    const index = messages.indexOf(pending)
    if (index >= 0) {
      messages[index] = {
        role: 'assistant',
        text: 'Your task is saved in this browser. Hosted execution will connect when Polyswap accounts are added.'
      }
    }
    localState.textContent = 'Saved locally'
    renderMessages()
    saveState()
  }, 650)
})

$('#attachButton').addEventListener('click', () => fileInput.click())
fileInput.addEventListener('change', () => {
  attachments = Array.from(fileInput.files).map(file => file.name)
  renderAttachments()
})

function renderAttachments() {
  attachmentRow.hidden = attachments.length === 0
  attachmentRow.replaceChildren()
  attachments.forEach(name => {
    const chip = document.createElement('span')
    chip.className = 'attachment-chip'
    chip.textContent = name
    attachmentRow.appendChild(chip)
  })
}

accessButton.addEventListener('click', () => {
  fullAccess = !fullAccess
  accessButton.setAttribute('aria-pressed', String(fullAccess))
  accessLabel.textContent = fullAccess ? 'Full access' : 'Review mode'
  saveState()
})

restoreState()
renderTrack()
renderOptions()
