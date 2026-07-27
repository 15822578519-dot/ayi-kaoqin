// ===== 配置示例 =====
// 复制本文件为 server/config.js（或直接使用环境变量）来修改白名单等配置。
// 不复制也可直接运行，默认口令为 888888。

// 家庭成员访问口令（白名单），逗号分隔可设多个
// 例：ACCESS_CODE=888888,mama,baba
// 也可用环境变量：ACCESS_CODE=888888,mama node server/index.js
export const ACCESS_CODE = (process.env.ACCESS_CODE || '888888')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// 令牌签名密钥（部署建议用环境变量 JWT_SECRET 覆盖）
export const JWT_SECRET = process.env.JWT_SECRET || 'ayi-kaoqin-default-secret-change-me'

// 服务端口
export const PORT = Number(process.env.PORT || 3000)

// 数据存储文件
export const DATA_FILE = process.env.DATA_FILE || 'data/records.json'

// 令牌有效期（毫秒），默认 30 天
export const TOKEN_TTL = Number(process.env.TOKEN_TTL || 30 * 24 * 60 * 60 * 1000)
