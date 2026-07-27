import fs from 'node:fs'
import path from 'node:path'
import { DATA_FILE } from './config.js'

// ===== 极简 JSON 文件存储 =====
// 家庭量级（几百~几千条）完全够用；用串行写锁避免并发写丢数据。
// 关键：每次写操作只加一次锁，锁内做 读→改→写，避免嵌套死锁。

function ensureFile() {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf-8')
}

function readAll() {
  ensureFile()
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function writeList(list) {
  ensureFile()
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf-8')
}

// 串行写锁：所有写操作排队执行，且不互相嵌套
let writeChain = Promise.resolve()
function withWriteLock(fn) {
  const run = writeChain.then(fn, fn)
  // 复位链尾，保证失败也不阻断后续写入
  writeChain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

export function getAll() {
  return readAll()
}

export function getByMonth(month) {
  const list = readAll()
  if (!month) return list
  return list.filter((r) => (r.date || '').startsWith(month))
}

export function add(record) {
  return withWriteLock(() => {
    const list = readAll()
    list.push(record)
    writeList(list)
    return record
  })
}

export function update(id, patch) {
  return withWriteLock(() => {
    const list = readAll()
    const idx = list.findIndex((r) => r.id === id)
    if (idx === -1) return null
    list[idx] = { ...list[idx], ...patch, id, updatedAt: new Date().toISOString() }
    writeList(list)
    return list[idx]
  })
}

export function remove(id) {
  return withWriteLock(() => {
    const list = readAll()
    const next = list.filter((r) => r.id !== id)
    if (next.length === list.length) return false
    writeList(next)
    return true
  })
}
