// Cloudflare Worker — 阿姨考勤 API（D1 数据库）
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    // CORS
    if (method === 'OPTIONS') {
      return new Response(null, { headers: cors() })
    }

    try {
      // 路由
      if (path === '/api/login' && method === 'POST') return login(request, env)
      if (!path.startsWith('/api')) return new Response('Not Found', { status: 404 })

      // 鉴权
      const auth = request.headers.get('Authorization') || ''
      if (!verifyToken(auth, env.JWT_SECRET)) {
        return json({ error: '口令错误' }, 401)
      }

      if (path === '/api/records' && method === 'GET') return list(url, env)
      if (path === '/api/records' && method === 'POST') return create(request, env)
      if (path.startsWith('/api/records/') && method === 'PUT') return update(path, request, env)
      if (path.startsWith('/api/records/') && method === 'DELETE') return remove(path, env)
      if (path === '/api/summary' && method === 'GET') return summary(url, env)

      return new Response('Not Found', { status: 404 })
    } catch (e) {
      return json({ error: e.message || '服务器错误' }, 500)
    }
  }
}

// ---- CORS ----
function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() }
  })
}

function readBody(request) {
  return request.json().catch(() => ({}))
}

// ---- 鉴权 ----
async function signToken(secret) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = { iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600 }
  const enc = (o) => btoa(JSON.stringify(o)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const data = enc(header) + '.' + enc(payload)
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return data + '.' + sigStr
}

async function verifyToken(auth, secret) {
  if (!auth.startsWith('Bearer ')) return false
  const token = auth.slice(7)
  try {
    const [header, payload, sig] = token.split('.')
    const data = header + '.' + payload
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    return await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data))
  } catch { return false }
}

// ---- 业务 ----
async function login(request, env) {
  const body = await readBody(request)
  const codes = env.ACCESS_CODE.split(',').map(s => s.trim())
  if (!codes.includes(body.code || '')) return json({ error: '口令错误' }, 401)
  return json({ token: await signToken(env.JWT_SECRET) })
}

function ensureTable(env) {
  return env.DB.exec('CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, date TEXT, status TEXT, salary REAL, note TEXT, createdAt TEXT, updatedAt TEXT)')
}

async function list(url, env) {
  await ensureTable(env)
  const month = url.searchParams.get('month') || ''
  let result
  if (month) {
    result = await env.DB.prepare('SELECT * FROM records WHERE date LIKE ?1 ORDER BY date DESC').bind(month + '%').all()
  } else {
    result = await env.DB.prepare('SELECT * FROM records ORDER BY date DESC').all()
  }
  return json({ list: result.results.map(rowToRecord) })
}

async function create(request, env) {
  await ensureTable(env)
  const body = await readBody(request)
  const err = validate(body)
  if (err) return json({ error: err }, 400)
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  const status = body.status || 'work'
  const salary = isFinite(Number(body.salary)) ? round2(Number(body.salary)) : (status === 'work' ? 200 : 0)
  const now = new Date().toISOString()
  await env.DB.prepare('INSERT INTO records (id, date, status, salary, note, createdAt, updatedAt) VALUES (?1,?2,?3,?4,?5,?6,?7)')
    .bind(id, body.date, status, salary, body.note || '', now, now).run()
  return json({ record: { id, date: body.date, status, salary, note: body.note || '', createdAt: now, updatedAt: now } })
}

async function update(path, request, env) {
  await ensureTable(env)
  const id = path.split('/').pop()
  const body = await readBody(request)
  const err = validate(body)
  if (err) return json({ error: err }, 400)
  const status = body.status || 'work'
  const salary = isFinite(Number(body.salary)) ? round2(Number(body.salary)) : (status === 'work' ? 200 : 0)
  const now = new Date().toISOString()
  const result = await env.DB.prepare('UPDATE records SET date=?1, status=?2, salary=?3, note=?4, updatedAt=?5 WHERE id=?6')
    .bind(body.date, status, salary, body.note || '', now, id).run()
  if (result.changes === 0) return json({ error: '记录不存在' }, 404)
  return json({ record: { id, date: body.date, status, salary, note: body.note || '', updatedAt: now } })
}

async function remove(path, env) {
  await ensureTable(env)
  const id = path.split('/').pop()
  const result = await env.DB.prepare('DELETE FROM records WHERE id=?1').bind(id).run()
  if (result.changes === 0) return json({ error: '记录不存在' }, 404)
  return json({ ok: true })
}

async function summary(url, env) {
  await ensureTable(env)
  const month = url.searchParams.get('month') || ''
  let result
  if (month) {
    result = await env.DB.prepare("SELECT * FROM records WHERE date LIKE ?1").bind(month + '%').all()
  } else {
    result = await env.DB.prepare('SELECT * FROM records').all()
  }
  const list = result.results.map(rowToRecord)
  const totalSalary = round2(list.reduce((s, r) => s + (r.salary || 0), 0))
  const workDays = list.filter(r => (r.status || 'work') === 'work').length
  const absentDays = list.filter(r => (r.status || 'work') === 'absent').length
  return json({ totalSalary, workDays, absentDays, count: list.length })
}

// ---- 工具 ----
function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100 }

function validate(body) {
  if (!body || typeof body !== 'object') return '请求体无效'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || '')) return '日期格式应为 YYYY-MM-DD'
  if (!['work', 'absent'].includes(body.status)) return '状态应为 work 或 absent'
  if (body.salary !== undefined && body.salary !== null && body.salary !== '' && (!isFinite(Number(body.salary)) || Number(body.salary) < 0)) return '应付工资应为不小于0的数字'
  return null
}

function rowToRecord(r) {
  return { id: r.id, date: r.date, status: r.status, salary: r.salary, note: r.note || '', createdAt: r.createdAt, updatedAt: r.updatedAt }
}
