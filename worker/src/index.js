const MODEL_CATALOG_URL = 'https://openrouter.ai/api/v1/models?output_modalities=text&sort=most-popular'
const CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions'

const json = (payload, status = 200, headers = {}) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }
})

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || ''
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)
  if (!origin || !allowed.includes(origin)) return null
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  }
}

function requestId() {
  return `req_${crypto.randomUUID()}`
}

function validClientId(value, prefix) {
  return typeof value === 'string' && value.startsWith(`${prefix}_`) && value.length >= 12 && value.length <= 96 && /^[a-zA-Z0-9_-]+$/.test(value)
}

function textFromContent(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.map(part => typeof part === 'string' ? part : String(part?.text || '')).join('')
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 60) return false
  return messages.every(message => message && ['user', 'assistant', 'system'].includes(message.role) &&
    (typeof message.content === 'string' || Array.isArray(message.content)))
}

async function reserveBudget(env, body, id) {
  const sharedBudget = Math.max(0, Number(env.SHARED_BUDGET_USD || 10))
  const perRequestMaximum = Math.max(0.01, Number(env.MAX_REQUEST_BUDGET_USD || 1))
  const requested = Math.min(perRequestMaximum, Math.max(0.01, Number(body.budgetTarget || 0.2)))
  const reservation = await env.DB.prepare('UPDATE budget SET reserved_usd = reserved_usd + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND spent_usd + reserved_usd + ? <= ?')
    .bind(requested, 'shared', requested, sharedBudget).run()
  if (!reservation.meta?.changes) {
    throw new Error('The shared launch credit is currently exhausted.')
  }

  const lastUserMessage = [...body.messages].reverse().find(message => message.role === 'user')
  const promptText = textFromContent(lastUserMessage?.content).slice(0, 250000)
  const title = promptText.trim().replace(/\s+/g, ' ').slice(0, 90) || 'Untitled work'
  try {
    await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO sessions (id) VALUES (?)').bind(body.sessionId),
      env.DB.prepare('UPDATE sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?').bind(body.sessionId),
      env.DB.prepare('INSERT OR IGNORE INTO threads (id, session_id, title, model) VALUES (?, ?, ?, ?)').bind(body.threadId, body.sessionId, title, body.model),
      env.DB.prepare('UPDATE threads SET model = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND session_id = ?').bind(body.model, body.threadId, body.sessionId),
      env.DB.prepare('INSERT INTO requests (id, session_id, thread_id, model, reserved_usd, status) VALUES (?, ?, ?, ?, ?, ?)').bind(id, body.sessionId, body.threadId, body.model, requested, 'streaming'),
      env.DB.prepare('INSERT INTO messages (request_id, session_id, thread_id, role, content, model) VALUES (?, ?, ?, ?, ?, ?)').bind(id, body.sessionId, body.threadId, 'user', promptText, body.model)
    ])
  } catch (error) {
    await env.DB.prepare('UPDATE budget SET reserved_usd = MAX(0, reserved_usd - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(requested, 'shared').run().catch(() => {})
    throw error
  }
  return requested
}

async function releaseReservation(env, id, reserved, status, details = {}) {
  const actual = Math.max(0, Number(details.cost || 0))
  await env.DB.batch([
    env.DB.prepare('UPDATE requests SET actual_usd = ?, status = ?, error = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(actual, status, details.error || null, id),
    env.DB.prepare('UPDATE budget SET reserved_usd = MAX(0, reserved_usd - ?), spent_usd = spent_usd + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(reserved, actual, 'shared')
  ])
}

async function recordStream(env, stream, context) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let answer = ''
  let usage = null
  let model = context.model
  try {
    const processLine = line => {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) return
      const data = trimmed.slice(5).trim()
      if (!data || data === '[DONE]') return
      const chunk = JSON.parse(data)
      if (chunk.model) model = chunk.model
      if (chunk.usage) usage = chunk.usage
      answer += textFromContent(chunk.choices?.[0]?.delta?.content)
    }
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''
      lines.forEach(processLine)
      if (done) break
    }
    if (buffer.trim()) processLine(buffer)
    const cost = Number(usage?.cost || 0)
    if (answer) {
      await env.DB.prepare('INSERT INTO messages (request_id, session_id, thread_id, role, content, model, cost_usd, prompt_tokens, completion_tokens) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(context.id, context.sessionId, context.threadId, 'assistant', answer.slice(0, 1000000), model, cost, Number(usage?.prompt_tokens || 0), Number(usage?.completion_tokens || 0)).run()
    }
    await releaseReservation(env, context.id, context.reserved, 'complete', { cost })
  } catch (error) {
    await releaseReservation(env, context.id, context.reserved, 'failed', { error: error.message }).catch(() => {})
  }
}

async function handleChat(request, env, ctx, cors) {
  if (!env.OPENROUTER_API_KEY) return json({ error: { message: 'PolySwap launch credit is not connected yet.' } }, 503, cors)
  if (!env.DB) return json({ error: { message: 'PolySwap conversation storage is not connected yet.' } }, 503, cors)
  const length = Number(request.headers.get('Content-Length') || 0)
  if (length > 1_200_000) return json({ error: { message: 'This request is too large.' } }, 413, cors)
  const body = await request.json().catch(() => null)
  if (!body || !validClientId(body.sessionId, 'anon') || !validClientId(body.threadId, 'thread')) {
    return json({ error: { message: 'This browser session is invalid. Refresh and try again.' } }, 400, cors)
  }
  if (typeof body.model !== 'string' || body.model.length > 160 || !validateMessages(body.messages)) {
    return json({ error: { message: 'The model or conversation payload is invalid.' } }, 400, cors)
  }

  const id = requestId()
  let reserved = 0
  try {
    reserved = await reserveBudget(env, body, id)
  } catch (error) {
    return json({ error: { message: error.message } }, 402, cors)
  }

  const upstream = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://polyswap.ai',
      'X-Title': 'PolySwap'
    },
    body: JSON.stringify({
      model: body.model,
      messages: body.messages,
      stream: true,
      max_tokens: Math.max(32, Math.min(8192, Number(body.maxTokens || 2048))),
      usage: { include: true },
      user: body.sessionId,
      session_id: body.threadId
    })
  }).catch(error => ({ ok: false, status: 502, error }))

  if (!upstream.ok || !upstream.body) {
    const payload = upstream.json ? await upstream.json().catch(() => ({})) : {}
    const message = payload.error?.message || upstream.error?.message || `The model route returned ${upstream.status}.`
    await releaseReservation(env, id, reserved, 'failed', { error: message })
    return json({ error: { message } }, upstream.status || 502, cors)
  }

  const [clientStream, recordStreamBranch] = upstream.body.tee()
  ctx.waitUntil(recordStream(env, recordStreamBranch, { id, reserved, sessionId: body.sessionId, threadId: body.threadId, model: body.model }))
  const headers = new Headers(upstream.headers)
  Object.entries(cors).forEach(([key, value]) => headers.set(key, value))
  headers.set('Cache-Control', 'no-store')
  return new Response(clientStream, { status: upstream.status, headers })
}

async function handleAdmin(request, env, cors) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) return json({ error: { message: 'Unauthorized' } }, 401, cors)
  const rows = await env.DB.prepare('SELECT m.id, m.session_id, m.thread_id, m.role, m.content, m.model, m.cost_usd, m.created_at FROM messages m ORDER BY m.id DESC LIMIT 250').all()
  const budget = await env.DB.prepare('SELECT spent_usd, reserved_usd, updated_at FROM budget WHERE id = ?').bind('shared').first()
  return json({ messages: rows.results || [], budget }, 200, cors)
}

export default {
  async fetch(request, env, ctx) {
    const cors = corsHeaders(request, env)
    if (!cors) return json({ error: { message: 'Origin not allowed.' } }, 403)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname === '/health') return json({ ok: true, service: 'polyswap-api' }, 200, cors)
    if (request.method === 'GET' && url.pathname === '/v1/models') {
      const response = await fetch(MODEL_CATALOG_URL, { headers: { Accept: 'application/json' }, cf: { cacheTtl: 300, cacheEverything: true } })
      return new Response(response.body, { status: response.status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' } })
    }
    if (request.method === 'POST' && url.pathname === '/v1/chat') return handleChat(request, env, ctx, cors)
    if (request.method === 'GET' && url.pathname === '/v1/admin/messages') return handleAdmin(request, env, cors)
    return json({ error: { message: 'Not found.' } }, 404, cors)
  }
}
