document.documentElement.classList.add('js')

const header = document.querySelector('.site-header')
const menuToggle = document.querySelector('.menu-toggle')
const navigation = document.querySelector('.site-nav')

function closeMenu() {
  menuToggle?.setAttribute('aria-expanded', 'false')
  document.body.classList.remove('menu-open')
}

menuToggle?.addEventListener('click', () => {
  const next = menuToggle.getAttribute('aria-expanded') !== 'true'
  menuToggle.setAttribute('aria-expanded', String(next))
  document.body.classList.toggle('menu-open', next)
})

navigation?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu))

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMenu()
})

function updateHeader() {
  header?.classList.toggle('is-scrolled', window.scrollY > 18)
}

updateHeader()
window.addEventListener('scroll', updateHeader, { passive: true })

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const revealItems = [
  ...document.querySelectorAll('.product-stage, .oc-copy, .oc-section-head, .intelligence-panel, .figure-grid article, .site-footer')
]

revealItems.forEach((item, index) => {
  item.classList.add('reveal-item')
  if (index % 3) item.dataset.revealDelay = String(index % 3)
})

if (reducedMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach(item => item.classList.add('is-visible'))
} else {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return
      entry.target.classList.add('is-visible')
      revealObserver.unobserve(entry.target)
    })
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })

  revealItems.forEach(item => revealObserver.observe(item))
}

const sectionLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')]
const sectionMap = new Map(sectionLinks.map(link => [link.getAttribute('href').slice(1), link]))
const trackedSections = [...sectionMap.keys()].map(id => document.getElementById(id)).filter(Boolean)

if ('IntersectionObserver' in window && trackedSections.length) {
  const sectionObserver = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
    if (!visible) return
    sectionLinks.forEach(link => link.classList.toggle('is-active', link === sectionMap.get(visible.target.id)))
  }, { threshold: [0.08, 0.22, 0.5], rootMargin: '-16% 0px -58% 0px' })

  trackedSections.forEach(section => sectionObserver.observe(section))
}

if (!reducedMotion) {
  const productDemo = document.querySelector('[data-product-demo]')
  const demoModelName = productDemo?.querySelector('[data-demo-model]')
  const demoModelIcon = productDemo?.querySelector('.composer-model img')
  const demoRequest = productDemo?.querySelector('[data-demo-request]')
  const demoResponse = productDemo?.querySelector('[data-demo-response]')
  const demoWorkTime = productDemo?.querySelector('[data-demo-work-time]')
  const demoAddress = productDemo?.querySelector('[data-demo-address]')
  const demoTab = productDemo?.querySelector('[data-demo-tab]')
  const demoSequence = document.querySelector('[data-demo-sequence]')
  const demoStage = document.querySelector('[data-demo-stage]')
  const cloudState = document.querySelector('[data-cloud-state]')
  const messageCommand = document.querySelector('[data-message-command]')
  const messageReply = document.querySelector('[data-message-reply]')
  const messageAction = document.querySelector('[data-message-action]')
  const demoStates = [
    {
      mode: 'home', site: 'google', name: 'Google: Gemini 3.7 Flash',
      icon: 'assets/providers/gemini.svg', address: 'google.com', tab: 'Google',
      stage: 'Quoted', cloudState: 'Awaiting approval',
      messageCommand: 'AUTO: research the best current AI tools for this product.',
      messageReply: 'Quote ready · 8–12 min · $0.12 maximum.', messageAction: 'RUN',
      request: 'Find the best current AI tools for building this product.',
      response: 'I searched Google and opened the strongest sources in the browser.',
      workTime: 'Worked for 8s ›'
    },
    {
      mode: 'browser', site: 'google', name: 'Google: Gemini 3.7 Flash',
      icon: 'assets/providers/gemini.svg', address: 'google.com', tab: 'Google',
      stage: 'Running', cloudState: 'Gemini is working',
      messageCommand: 'RUN',
      messageReply: 'Cloud runtime started. I am searching now.', messageAction: 'OPEN',
      request: 'Find the best current AI tools for building this product.',
      response: 'I searched Google and opened the strongest sources in the browser.',
      workTime: 'Worked for 8s ›'
    },
    {
      mode: 'browser', site: 'cursor', name: 'Anthropic: Claude',
      icon: 'assets/providers/anthropic.svg', address: 'cursor.com', tab: 'Cursor',
      stage: 'Handoff', cloudState: 'Claude is continuing',
      messageCommand: 'Swap this job to Claude.',
      messageReply: 'Checkpoint saved. Claude picked up the same work.', messageAction: 'STATUS',
      request: 'Open Cursor and compare how it presents its desktop agent.',
      response: 'Cursor is open. Its page leads with the coding agent, desktop product, and direct download path.',
      workTime: 'Worked for 6s ›'
    },
    {
      mode: 'browser', site: 'doordash', name: 'OpenAI: GPT',
      icon: 'assets/providers/openai.svg', address: 'doordash.com', tab: 'DoorDash',
      stage: 'Running', cloudState: 'GPT is browsing',
      messageCommand: 'Find a highly rated dinner option nearby.',
      messageReply: 'Still working in the cloud. Your device can close.', messageAction: 'OPEN',
      request: 'Find a highly rated dinner option nearby.',
      response: 'DoorDash is open and ready for a delivery address so I can compare nearby options.',
      workTime: 'Worked for 7s ›'
    },
    {
      mode: 'work', site: 'github', name: 'DeepSeek',
      icon: 'assets/providers/deepseek.svg', address: 'github.com/howwee20/polyswap-releases', tab: 'GitHub Releases',
      stage: 'Verifying', cloudState: 'DeepSeek is verifying',
      messageCommand: 'Use DeepSeek to check the latest PolySwap release.',
      messageReply: 'Both installers found. Verification is running.', messageAction: 'REVIEW',
      request: 'Check whether both PolySwap installers are in the latest release.',
      response: 'The latest GitHub release includes the macOS Apple silicon DMG and Windows x64 installer.',
      workTime: 'Worked for 9s ›'
    },
    {
      mode: 'browser', site: 'youtube', name: 'Moonshot: Kimi',
      icon: 'assets/providers/kimi.svg', address: 'youtube.com/results?search_query=agentic+ai', tab: 'YouTube',
      stage: 'Complete', cloudState: 'Result ready',
      messageCommand: 'Find a useful recent course about agentic AI.',
      messageReply: 'Completed · sources and result are ready to inspect.', messageAction: 'RESULT',
      request: 'Find a useful recent video about agentic AI.',
      response: 'YouTube is open with current agentic AI courses and explainers ready to compare.',
      workTime: 'Worked for 6s ›'
    }
  ]
  let demoStateIndex = 0

  window.setInterval(() => {
    if (!productDemo) return
    demoStateIndex = (demoStateIndex + 1) % demoStates.length
    const state = demoStates[demoStateIndex]
    productDemo.dataset.mode = state.mode
    productDemo.dataset.site = state.site
    if (demoModelName) demoModelName.textContent = state.name
    if (demoModelIcon) demoModelIcon.src = state.icon
    if (demoRequest) demoRequest.textContent = state.request
    if (demoResponse) demoResponse.textContent = state.response
    if (demoWorkTime) demoWorkTime.textContent = state.workTime
    if (demoAddress) demoAddress.textContent = state.address
    if (demoTab) demoTab.textContent = state.tab
    if (demoSequence) demoSequence.textContent = `${String(demoStateIndex + 1).padStart(2, '0')} / ${String(demoStates.length).padStart(2, '0')}`
    if (demoStage) demoStage.textContent = state.stage
    if (cloudState) cloudState.textContent = state.cloudState
    if (messageCommand) messageCommand.textContent = state.messageCommand
    if (messageReply) messageReply.textContent = state.messageReply
    if (messageAction) messageAction.textContent = state.messageAction
  }, 4800)

  const modelRows = [...document.querySelectorAll('.model-row')]
  let selectedModelIndex = 0

  window.setInterval(() => {
    if (!modelRows.length) return
    modelRows[selectedModelIndex]?.classList.remove('selected')
    selectedModelIndex = (selectedModelIndex + 1) % modelRows.length
    modelRows[selectedModelIndex]?.classList.add('selected')
  }, 2200)

  const lifecycleRows = [...document.querySelectorAll('.lifecycle-list li')]
  const recordSequence = document.querySelector('[data-record-sequence]')
  let lifecycleIndex = 3

  window.setInterval(() => {
    if (!lifecycleRows.length) return
    lifecycleIndex = (lifecycleIndex + 1) % lifecycleRows.length
    lifecycleRows.forEach((row, index) => {
      row.classList.toggle('complete', index < lifecycleIndex)
      row.classList.toggle('current', index === lifecycleIndex)
      const state = row.querySelector('b')
      if (state) state.textContent = index < lifecycleIndex ? '✓' : index === lifecycleIndex ? '•••' : ''
    })
    if (recordSequence) recordSequence.textContent = `${String(lifecycleIndex + 1).padStart(2, '0')} / ${String(lifecycleRows.length).padStart(2, '0')}`
  }, 1650)
}
