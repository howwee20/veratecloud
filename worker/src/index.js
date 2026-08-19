const MODEL_CATALOG_URL = 'https://openrouter.ai/api/v1/models?output_modalities=text&sort=most-popular'
const CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions'
const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30

const EFFORT_POLICIES = {
  light: {
    reasoning: 'low',
    maxTokens: 2048,
    maxBudget: 0.08,
    instruction: 'Work directly. Use only the reasoning needed for a correct, concise answer.'
  },
  medium: {
    reasoning: 'medium',
    maxTokens: 4096,
    maxBudget: 0.2,
    instruction: 'Use balanced reasoning. Check the important assumptions before answering.'
  },
  high: {
    reasoning: 'high',
    maxTokens: 8192,
    maxBudget: 0.4,
    instruction: 'Reason carefully. Work through the task, inspect likely failure points, and verify the answer before returning it.'
  },
  xhigh: {
    reasoning: 'xhigh',
    maxTokens: 12288,
    maxBudget: 0.7,
    instruction: 'Apply deep effort. Consider alternatives, challenge the first answer, and return the strongest verified result.'
  },
  ultra: {
    reasoning: 'max',
    maxTokens: 16384,
    maxBudget: 1,
    instruction: 'Use maximum useful effort. Explore multiple approaches, resolve contradictions, and verify the final result thoroughly.'
  }
}

const SPEED_POLICIES = {
  economy: { serviceTier: 'flex', provider: { sort: 'price' } },
  standard: {},
  fast: { serviceTier: 'fast', provider: { sort: 'throughput' } }
}

const json = (payload, status = 200, headers = {}) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }
})

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || ''
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)
  if (!origin || !allowed.includes(origin)) return null
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-PolySwap-Access',
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

function encodeBase64Url(bytes) {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  input.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

async function issueAccessToken(env, sessionId) {
  const payload = encodeBase64Url(new TextEncoder().encode(JSON.stringify({
    sid: sessionId,
    exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS
  })))
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(env.ALPHA_ACCESS_SECRET), new TextEncoder().encode(payload))
  return `${payload}.${encodeBase64Url(signature)}`
}

async function verifyAccessToken(env, token, sessionId) {
  if (!env.ALPHA_ACCESS_SECRET || typeof token !== 'string') return false
  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra) return false
  try {
    const valid = await crypto.subtle.verify('HMAC', await hmacKey(env.ALPHA_ACCESS_SECRET), decodeBase64Url(signature), new TextEncoder().encode(payload))
    if (!valid) return false
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)))
    return claims.sid === sessionId && Number(claims.exp) > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

async function secureEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(left)),
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(right))
  ])
  const a = new Uint8Array(leftHash)
  const b = new Uint8Array(rightHash)
  let difference = a.length ^ b.length
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) difference |= a[index] ^ b[index]
  return difference === 0
}

async function handleAccess(request, env, cors) {
  if (!env.ALPHA_ACCESS_CODE || !env.ALPHA_ACCESS_SECRET) {
    return json({ error: { message: 'Friends alpha access is not configured yet.' } }, 503, cors)
  }
  const body = await request.json().catch(() => null)
  if (!body || !validClientId(body.sessionId, 'anon') || typeof body.code !== 'string') {
    return json({ error: { message: 'Enter the friends alpha code.' } }, 400, cors)
  }
  if (!(await secureEqual(body.code.trim(), env.ALPHA_ACCESS_CODE.trim()))) {
    return json({ error: { message: 'That access code is not valid.' } }, 401, cors)
  }
  return json({ accessToken: await issueAccessToken(env, body.sessionId), expiresIn: ACCESS_TTL_SECONDS }, 200, cors)
}

async function getRuntimeState(env) {
  return (await env.DB.prepare('SELECT paused, pause_reason, updated_at FROM runtime_state WHERE id = ?').bind('global').first()) || { paused: 0 }
}

async function recoverStaleReservations(env) {
  const stale = await env.DB.prepare("SELECT COALESCE(SUM(reserved_usd), 0) AS total FROM requests WHERE status = 'streaming' AND created_at < datetime('now', '-15 minutes')").first()
  const total = Math.max(0, Number(stale?.total || 0))
  if (!total) return
  await env.DB.batch([
    env.DB.prepare("UPDATE requests SET status = 'failed', error = 'The request timed out.', completed_at = CURRENT_TIMESTAMP WHERE status = 'streaming' AND created_at < datetime('now', '-15 minutes')"),
    env.DB.prepare('UPDATE budget SET reserved_usd = MAX(0, reserved_usd - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(total, 'shared')
  ])
}

async function rateLimit(request, env, sessionId) {
  const minute = new Date().toISOString().slice(0, 16)
  const ip = request.headers.get('CF-Connecting-IP') || 'local'
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sessionId}:${ip}`))
  const fingerprint = encodeBase64Url(digest).slice(0, 24)
  await env.DB.prepare(`INSERT INTO rate_windows (bucket, fingerprint, requests, updated_at)
    VALUES (?, ?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(bucket, fingerprint) DO UPDATE SET requests = requests + 1, updated_at = CURRENT_TIMESTAMP`)
    .bind(minute, fingerprint).run()
  const row = await env.DB.prepare('SELECT requests FROM rate_windows WHERE bucket = ? AND fingerprint = ?').bind(minute, fingerprint).first()
  if (Math.random() < 0.02) env.DB.prepare("DELETE FROM rate_windows WHERE updated_at < datetime('now', '-1 day')").run().catch(() => {})
  return Number(row?.requests || 0) <= Math.max(1, Number(env.REQUESTS_PER_MINUTE || 20))
}

async function reserveBudget(env, body, id, effortPolicy) {
  const sharedBudget = Math.max(0, Number(env.SHARED_BUDGET_USD || 10))
  const perRequestMaximum = Math.max(0.01, Number(env.MAX_REQUEST_BUDGET_USD || 1))
  const requested = Math.min(perRequestMaximum, effortPolicy.maxBudget, Math.max(0.01, Number(body.budgetTarget || effortPolicy.maxBudget)))
  const reservation = await env.DB.prepare('UPDATE budget SET reserved_usd = reserved_usd + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND spent_usd + reserved_usd + ? <= ?')
    .bind(requested, 'shared', requested, sharedBudget).run()
  if (!reservation.meta?.changes) throw new Error('The shared launch credit is currently exhausted.')

  const lastUserMessage = [...body.messages].reverse().find(message => message.role === 'user')
  const promptText = textFromContent(lastUserMessage?.content).slice(0, 250000)
  const title = promptText.trim().replace(/\s+/g, ' ').slice(0, 90) || 'Untitled work'
  try {
    await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO sessions (id) VALUES (?)').bind(body.sessionId),
      env.DB.prepare('UPDATE sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?').bind(body.sessionId),
      env.DB.prepare('INSERT OR IGNORE INTO threads (id, session_id, title, model) VALUES (?, ?, ?, ?)').bind(body.threadId, body.sessionId, title, body.model),
      env.DB.prepare('UPDATE threads SET model = ?, title = CASE WHEN title IS NULL OR title = ? THEN ? ELSE title END, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND session_id = ?').bind(body.model, 'Untitled work', title, body.threadId, body.sessionId),
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

async function handleStatus(env, cors) {
  if (!env.DB) return json({ ready: false, accessConfigured: Boolean(env.ALPHA_ACCESS_CODE && env.ALPHA_ACCESS_SECRET) }, 200, cors)
  const [runtime, budget] = await Promise.all([
    getRuntimeState(env),
    env.DB.prepare('SELECT spent_usd, reserved_usd FROM budget WHERE id = ?').bind('shared').first()
  ])
  const limit = Math.max(0, Number(env.SHARED_BUDGET_USD || 10))
  return json({
    ready: Boolean(env.OPENROUTER_API_KEY) && !Number(runtime.paused) && Number(budget?.spent_usd || 0) + Number(budget?.reserved_usd || 0) < limit,
    accessConfigured: Boolean(env.ALPHA_ACCESS_CODE && env.ALPHA_ACCESS_SECRET),
    paused: Boolean(Number(runtime.paused)),
    remainingUsd: Math.max(0, limit - Number(budget?.spent_usd || 0) - Number(budget?.reserved_usd || 0))
  }, 200, cors)
}

async function handleChat(request, env, ctx, cors) {
  if (!env.DB) return json({ error: { message: 'PolySwap conversation storage is not connected yet.' } }, 503, cors)
  const length = Number(request.headers.get('Content-Length') || 0)
  if (length > 1_200_000) return json({ error: { message: 'This request is too large.' } }, 413, cors)
  const body = await request.json().catch(() => null)
  if (!body || !validClientId(body.sessionId, 'anon') || !validClientId(body.threadId, 'thread')) {
    return json({ error: { message: 'This browser session is invalid. Refresh and try again.' } }, 400, cors)
  }
  if (!(await verifyAccessToken(env, request.headers.get('X-PolySwap-Access'), body.sessionId))) {
    return json({ error: { message: 'Friends alpha access is required.' }, code: 'ACCESS_REQUIRED' }, 401, cors)
  }
  if (typeof body.model !== 'string' || body.model.length > 160 || !validateMessages(body.messages)) {
    return json({ error: { message: 'The model or conversation payload is invalid.' } }, 400, cors)
  }
  const effort = Object.hasOwn(EFFORT_POLICIES, body.effort) ? body.effort : 'medium'
  const speed = Object.hasOwn(SPEED_POLICIES, body.speed) ? body.speed : 'standard'
  const effortPolicy = EFFORT_POLICIES[effort]
  const speedPolicy = SPEED_POLICIES[speed]
  const runtime = await getRuntimeState(env)
  if (Number(runtime.paused)) return json({ error: { message: runtime.pause_reason || 'PolySwap is temporarily paused.' } }, 503, cors)
  if (!env.OPENROUTER_API_KEY) return json({ error: { message: 'PolySwap launch credit is not connected yet.' } }, 503, cors)
  if (!(await rateLimit(request, env, body.sessionId))) {
    return json({ error: { message: 'Too many requests at once. Wait a minute and try again.' } }, 429, cors)
  }
  await recoverStaleReservations(env)

  const id = requestId()
  let reserved = 0
  try {
    reserved = await reserveBudget(env, body, id, effortPolicy)
  } catch (error) {
    return json({ error: { message: error.message } }, 402, cors)
  }

  const upstreamBody = {
    model: body.model,
    messages: [
      { role: 'system', content: `PolySwap effort: ${effort}. ${effortPolicy.instruction}` },
      ...body.messages
    ],
    stream: true,
    max_tokens: Math.max(1536, Math.min(effortPolicy.maxTokens, Number(body.maxTokens || effortPolicy.maxTokens))),
    reasoning: { effort: effortPolicy.reasoning, exclude: true },
    usage: { include: true },
    user: body.sessionId,
    session_id: body.threadId
  }
  if (speedPolicy.serviceTier) upstreamBody.service_tier = speedPolicy.serviceTier
  if (speedPolicy.provider) upstreamBody.provider = speedPolicy.provider

  const upstream = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://polyswap.ai',
      'X-Title': 'PolySwap'
    },
    body: JSON.stringify(upstreamBody)
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

function adminAuthorized(request, env) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  return Boolean(env.ADMIN_TOKEN && token === env.ADMIN_TOKEN)
}

async function handleAdminOverview(request, env, cors) {
  if (!adminAuthorized(request, env)) return json({ error: { message: 'Unauthorized' } }, 401, cors)
  const [budget, runtime, counts, models, messages, requests] = await Promise.all([
    env.DB.prepare('SELECT spent_usd, reserved_usd, updated_at FROM budget WHERE id = ?').bind('shared').first(),
    getRuntimeState(env),
    env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM sessions) AS sessions,
      (SELECT COUNT(*) FROM threads) AS threads,
      (SELECT COUNT(*) FROM requests) AS requests,
      (SELECT COUNT(*) FROM requests WHERE status = 'complete') AS completed,
      (SELECT COUNT(*) FROM requests WHERE status = 'failed') AS failed`).first(),
    env.DB.prepare("SELECT model, COUNT(*) AS requests, COALESCE(SUM(actual_usd), 0) AS cost_usd FROM requests WHERE status = 'complete' GROUP BY model ORDER BY requests DESC LIMIT 20").all(),
    env.DB.prepare('SELECT id, session_id, thread_id, role, content, model, cost_usd, created_at FROM messages ORDER BY id DESC LIMIT 250').all(),
    env.DB.prepare('SELECT id, session_id, thread_id, model, reserved_usd, actual_usd, status, error, created_at, completed_at FROM requests ORDER BY created_at DESC LIMIT 100').all()
  ])
  return json({ budget, runtime, counts, models: models.results || [], messages: messages.results || [], requests: requests.results || [] }, 200, cors)
}

async function handleAdminState(request, env, cors) {
  if (!adminAuthorized(request, env)) return json({ error: { message: 'Unauthorized' } }, 401, cors)
  const body = await request.json().catch(() => null)
  if (!body || typeof body.paused !== 'boolean') return json({ error: { message: 'A paused boolean is required.' } }, 400, cors)
  const reason = body.paused ? String(body.reason || 'PolySwap is temporarily paused.').slice(0, 240) : null
  await env.DB.prepare('UPDATE runtime_state SET paused = ?, pause_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(body.paused ? 1 : 0, reason, 'global').run()
  return json({ ok: true, runtime: await getRuntimeState(env) }, 200, cors)
}

export default {
  async fetch(request, env, ctx) {
    const cors = corsHeaders(request, env)
    if (!cors) return json({ error: { message: 'Origin not allowed.' } }, 403)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname === '/health') return json({ ok: true, service: 'polyswap-api' }, 200, cors)
    if (request.method === 'GET' && url.pathname === '/v1/status') return handleStatus(env, cors)
    if (request.method === 'POST' && url.pathname === '/v1/access') return handleAccess(request, env, cors)
    if (request.method === 'GET' && url.pathname === '/v1/models') {
      const response = await fetch(MODEL_CATALOG_URL, { headers: { Accept: 'application/json' }, cf: { cacheTtl: 300, cacheEverything: true } })
      return new Response(response.body, { status: response.status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' } })
    }
    if (request.method === 'POST' && url.pathname === '/v1/chat') return handleChat(request, env, ctx, cors)
    if (request.method === 'GET' && (url.pathname === '/v1/admin/overview' || url.pathname === '/v1/admin/messages')) return handleAdminOverview(request, env, cors)
    if (request.method === 'POST' && url.pathname === '/v1/admin/state') return handleAdminState(request, env, cors)
    return json({ error: { message: 'Not found.' } }, 404, cors)
  }
}
