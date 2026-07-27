import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ===== 白名单与基础配置 =====
// 家庭内部工具：ACCESS_CODE 即“进入口令”，逗号可分隔多个口令。
// 部署时建议用环境变量覆盖，避免把口令写进代码仓库。
export const ACCESS_CODE = (process.env.ACCESS_CODE || '888888')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// 令牌签名密钥（部署时可用环境变量 JWT_SECRET 覆盖）
export const JWT_SECRET = process.env.JWT_SECRET || 'ayi-kaoqin-default-secret-change-me'

// 服务端口
export const PORT = Number(process.env.PORT || 3000)

// 数据存储文件（考勤台账落在这里，单 JSON 文件）
export const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'records.json')

// 令牌有效期（毫秒），默认 30 天
export const TOKEN_TTL = Number(process.env.TOKEN_TTL || 30 * 24 * 60 * 60 * 1000)
