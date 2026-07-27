import crypto from 'node:crypto'
import { ACCESS_CODE, JWT_SECRET, TOKEN_TTL } from './config.js'

// ===== 口令校验 + HMAC 令牌签发/校验 =====

export function verifyCode(code) {
  return typeof code === 'string' && ACCESS_CODE.includes(code.trim())
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64url')
}

// 签发令牌：payload 仅含签发时间，签名用 HMAC-SHA256
export function signToken() {
  const payload = { iat: Date.now() }
  const data = b64url(JSON.stringify(payload))
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url')
  return `${data}.${sig}`
}

// 校验令牌：失败时抛错，由调用方转 401
export function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    throw new Error('invalid token')
  }
  const [data, sig] = token.split('.')
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url')
  // 时序安全比较
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('bad signature')
  }
  let payload
  try {
    payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'))
  } catch {
    throw new Error('bad payload')
  }
  if (TOKEN_TTL && Date.now() - (payload.iat || 0) > TOKEN_TTL) {
    throw new Error('token expired')
  }
  return payload
}

// Express 中间件：保护需要登录的接口
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  try {
    verifyToken(token)
    next()
  } catch {
    res.status(401).json({ error: '未登录或登录已过期' })
  }
}
