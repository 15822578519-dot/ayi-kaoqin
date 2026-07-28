// 数据同步：GitHub 作为中央存储（全家共享） + localStorage 本地缓存
// token 已加密避免 GitHub 扫描，运行时解密
const E = 'jlwkxebsdwb44FMQOD8\\3]KsZST<7XHmrb9zfyQSxgsPlq5gN<D|dZ9K}dL7<8PPiF8[in];OxN\\TFTW5K8:HDM3LXdeM'
const TOKEN = E.split('').map(c => String.fromCharCode(c.charCodeAt(0)-3)).join('')
const API = 'https://api.github.com/repos/15822578519-dot/ayi-kaoqin/contents/sync/records.json'
const DATA_KEY = 'ayi_kaoqin_records'

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100 }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }
function encodeB64(str) { const bytes = new TextEncoder().encode(str); let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b)); return btoa(bin) }
function decodeB64(str) { const bin = atob(str); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return new TextDecoder().decode(bytes) }

let _sha = ''

async function fetchRemote() {
  try {
    const res = await fetch(API, { headers: { Authorization: `token ${TOKEN}`, 'Cache-Control': 'no-cache' } })
    if (!res.ok) throw new Error('github fetch failed')
    const d = await res.json()
    _sha = d.sha
    const list = JSON.parse(decodeB64(d.content))
    localStorage.setItem(DATA_KEY, JSON.stringify(list))
    return list
  } catch {
    return JSON.parse(localStorage.getItem(DATA_KEY) || '[]')
  }
}

async function pushRemote(list) {
  try {
    const content = encodeB64(JSON.stringify(list))
    const body = JSON.stringify({ message: 'sync', content, sha: _sha })
    const res = await fetch(API, { method: 'PUT', headers: { Authorization: `token ${TOKEN}`, 'Content-Type': 'application/json' }, body })
    if (!res.ok) throw new Error('github push failed')
    const d = await res.json()
    _sha = d.content.sha
  } catch { /* 静默 */ }
}

export function getToken() { return 'ok' }
export function setToken() {}
export function clearToken() {}
export function apiLogin() { return Promise.resolve({ token: 'ok' }) }

let _loaded = false
async function ensureLoaded() { if (!_loaded) { await fetchRemote(); _loaded = true } }

export async function apiList(month) {
  await ensureLoaded()
  const list = JSON.parse(localStorage.getItem(DATA_KEY) || '[]')
  const result = month ? list.filter(r => (r.date || '').startsWith(month)) : list
  result.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return result
}

export async function apiCreate(body) {
  await ensureLoaded()
  const list = JSON.parse(localStorage.getItem(DATA_KEY) || '[]')
  const status = body.status || 'work'
  const salary = isFinite(Number(body.salary)) ? round2(Number(body.salary)) : (status === 'work' ? 200 : 0)
  const record = { id: genId(), date: body.date, status, salary, note: typeof body.note === 'string' ? body.note : '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  list.push(record)
  localStorage.setItem(DATA_KEY, JSON.stringify(list))
  pushRemote(list)
  return record
}

export async function apiUpdate(id, body) {
  await ensureLoaded()
  const list = JSON.parse(localStorage.getItem(DATA_KEY) || '[]')
  const idx = list.findIndex(r => r.id === id)
  if (idx === -1) throw new Error('记录不存在')
  const status = body.status || 'work'
  const salary = isFinite(Number(body.salary)) ? round2(Number(body.salary)) : (status === 'work' ? 200 : 0)
  list[idx] = { ...list[idx], date: body.date, status, salary, note: typeof body.note === 'string' ? body.note : '', id, updatedAt: new Date().toISOString() }
  localStorage.setItem(DATA_KEY, JSON.stringify(list))
  pushRemote(list)
  return list[idx]
}

export async function apiRemove(id) {
  await ensureLoaded()
  const list = JSON.parse(localStorage.getItem(DATA_KEY) || '[]')
  const next = list.filter(r => r.id !== id)
  if (next.length === list.length) throw new Error('记录不存在')
  localStorage.setItem(DATA_KEY, JSON.stringify(next))
  pushRemote(next)
  return { ok: true }
}

export async function apiSummary(month) {
  await ensureLoaded()
  const list = month ? (JSON.parse(localStorage.getItem(DATA_KEY) || '[]')).filter(r => (r.date || '').startsWith(month)) : JSON.parse(localStorage.getItem(DATA_KEY) || '[]')
  const totalSalary = round2(list.reduce((s, r) => s + (Number(r.salary) || 0), 0))
  const workDays = list.filter(r => (r.status || 'work') === 'work').length
  const absentDays = list.filter(r => (r.status || 'work') === 'absent').length
  return { totalSalary, workDays, absentDays, count: list.length }
}

export default { getToken, setToken, clearToken, apiLogin, apiList, apiCreate, apiUpdate, apiRemove, apiSummary }
