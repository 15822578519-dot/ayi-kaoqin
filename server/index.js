import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PORT } from './config.js'
import { signToken, verifyCode, authMiddleware } from './auth.js'
import * as store from './store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const isProd = process.env.NODE_ENV === 'production'

app.use(cors())
app.use(express.json())

// ===== 工具：状态制考勤模型 =====
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// 状态默认值：上班 200 元/天，缺勤 0 元/天（均可手动改）
const DEFAULT_SALARY = { work: 200, absent: 0 }
const VALID_STATUS = new Set(['work', 'absent'])

// 兼容旧数据：缺 status 一律视为上班
function normStatus(r) {
  if (VALID_STATUS.has(r.status)) return r.status
  return 'work'
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function validRecord(body) {
  if (!body || typeof body !== 'object') return '请求体无效'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || '')) return '日期格式应为 YYYY-MM-DD'
  if (!VALID_STATUS.has(body.status)) return '状态应为 work(上班) 或 absent(缺勤)'
  // 允许不填工资（由默认值兜底）
  const raw = body.salary
  if (raw !== undefined && raw !== null && raw !== '') {
    const salary = Number(raw)
    if (!isFinite(salary) || salary < 0) return '应付工资应为不小于 0 的数字'
  }
  return null
}

// ===== 登录（白名单口令）=====
app.post('/api/login', (req, res) => {
  const code = req.body && req.body.code
  if (!verifyCode(code)) {
    return res.status(401).json({ error: '口令错误' })
  }
  res.json({ token: signToken() })
})

// ===== 受保护接口 =====
app.use('/api', authMiddleware)

// 台账列表（可按月筛选）
app.get('/api/records', (req, res) => {
  const month = typeof req.query.month === 'string' ? req.query.month : ''
  const list = store.getByMonth(month)
  list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  res.json({ list })
})

// 新增
app.post('/api/records', (req, res) => {
  const err = validRecord(req.body)
  if (err) return res.status(400).json({ error: err })
  const status = req.body.status
  const salary = isFinite(Number(req.body.salary)) ? round2(Number(req.body.salary)) : DEFAULT_SALARY[status]
  const record = {
    id: genId(),
    date: req.body.date,
    status,
    salary,
    note: typeof req.body.note === 'string' ? req.body.note : '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  store.add(record).then(() => res.json({ record }))
})

// 编辑
app.put('/api/records/:id', (req, res) => {
  const err = validRecord(req.body)
  if (err) return res.status(400).json({ error: err })
  const status = req.body.status
  const salary = isFinite(Number(req.body.salary)) ? round2(Number(req.body.salary)) : DEFAULT_SALARY[status]
  const patch = {
    date: req.body.date,
    status,
    salary,
    note: typeof req.body.note === 'string' ? req.body.note : ''
  }
  store.update(req.params.id, patch).then((updated) => {
    if (!updated) return res.status(404).json({ error: '记录不存在' })
    res.json({ record: updated })
  })
})

// 删除
app.delete('/api/records/:id', (req, res) => {
  store.remove(req.params.id).then((ok) => {
    if (!ok) return res.status(404).json({ error: '记录不存在' })
    res.json({ ok: true })
  })
})

// 月度汇总
app.get('/api/summary', (req, res) => {
  const month = typeof req.query.month === 'string' ? req.query.month : ''
  const list = store.getByMonth(month)
  const totalSalary = round2(list.reduce((s, r) => s + (Number(r.salary) || 0), 0))
  const workDays = list.filter((r) => normStatus(r) === 'work').length
  const absentDays = list.filter((r) => normStatus(r) === 'absent').length
  res.json({ totalSalary, workDays, absentDays, count: list.length })
})

// ===== 生产环境：托管前端构建产物 =====
if (isProd) {
  const dist = path.join(__dirname, '..', 'dist')
  if (fs.existsSync(dist)) {
    app.use(express.static(dist))
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next()
      res.sendFile(path.join(dist, 'index.html'))
    })
  } else {
    console.warn('[warn] 未找到 dist 目录，请先执行 npm run build')
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`阿姨考勤服务已启动: http://localhost:${PORT}  (${isProd ? '生产' : '开发'}模式)`)
})
