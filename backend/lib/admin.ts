import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'aiindex-secret-key-change-in-production'
const SALT_ROUNDS = 10

export interface AdminPayload {
  isAdmin: boolean
  timestamp: number
}

/**
 * 验证管理员密码
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  // 从环境变量读取管理员密码的哈希值
  const hashedPasswordFromEnv = process.env.ADMIN_PASSWORD_HASH

  if (!hashedPasswordFromEnv) {
    console.error('ADMIN_PASSWORD_HASH not set in environment variables')
    return false
  }

  try {
    return await bcrypt.compare(password, hashedPasswordFromEnv)
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}

/**
 * 生成管理员 JWT token
 */
export function generateAdminToken(): string {
  const payload: AdminPayload = {
    isAdmin: true,
    timestamp: Date.now()
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h' // 24小时过期
  })
}

/**
 * 验证管理员 JWT token
 */
export function verifyAdminToken(token: string): AdminPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminPayload
    return decoded
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}

/**
 * 生成密码哈希（用于初始化）
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS)
}
