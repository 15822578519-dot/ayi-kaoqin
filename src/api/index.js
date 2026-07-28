// 单机版：数据存 localStorage，无需服务器
const DATA_KEY = 'ayi_kaoqin_records'

function readAll() {
  try { return JSON.parse(localStorage.getItem(DATA_KEY) || '[]') } catch { return [] }
}
function writeAll(list) { localStorage.setItem(DATA_KEY, JSON.stringify(list)) }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }
function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100 }

export function getToken() { return 'ok' }
export function setToken() {}
export function clearToken() {}
export function apiLogin() { return Promise.resolve({ token: 'ok' }) }

export function apiList(month) {
  const list = readAll()
  const result = month ? list.filter(r => (r.date || '').startsWith(month)) : list
  result.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return Promise.resolve(result)
}

export function apiCreate(body) {
  const list = readAll()
  const status = body.status || 'work'
  const salary = isFinite(Number(body.salary)) ? round2(Number(body.salary)) : (status === 'work' ? 200 : 0)
  const record = { id: genId(), date: body.date, status, salary, note: typeof body.note === 'string' ? body.note : '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  list.push(record)
  writeAll(list)
  return Promise.resolve(record)
}

export function apiUpdate(id, body) {
  const list = readAll()
  const idx = list.findIndex(r => r.id === id)
  if (idx === -1) return Promise.reject(new Error('记录不存在'))
  const status = body.status || 'work'
  const salary = isFinite(Number(body.salary)) ? round2(Number(body.salary)) : (status === 'work' ? 200 : 0)
  list[idx] = { ...list[idx], date: body.date, status, salary, note: typeof body.note === 'string' ? body.note : '', id, updatedAt: new Date().toISOString() }
  writeAll(list)
  return Promise.resolve(list[idx])
}

export function apiRemove(id) {
  const list = readAll()
  const next = list.filter(r => r.id !== id)
  if (next.length === list.length) return Promise.reject(new Error('记录不存在'))
  writeAll(next)
  return Promise.resolve({ ok: true })
}

export function apiSummary(month) {
  const list = month ? readAll().filter(r => (r.date || '').startsWith(month)) : readAll()
  const totalSalary = round2(list.reduce((s, r) => s + (Number(r.salary) || 0), 0))
  const workDays = list.filter(r => (r.status || 'work') === 'work').length
  const absentDays = list.filter(r => (r.status || 'work') === 'absent').length
  return Promise.resolve({ totalSalary, workDays, absentDays, count: list.length })
}

export default { getToken, setToken, clearToken, apiLogin, apiList, apiCreate, apiUpdate, apiRemove, apiSummary }
