import { Router, type Request, type Response } from 'express'
import {
  verifyAdminPassword,
  generateAdminToken,
  verifyAdminToken
} from '../lib/admin.js'

const router = Router()

/**
 * POST /api/admin/login
 * 管理员登录接口
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { password } = req.body || {}

    if (!password) {
      res.status(400).json({ error: 'missing_password' })
      return
    }

    // 验证密码
    const isValid = await verifyAdminPassword(password)

    if (!isValid) {
      res.status(401).json({ error: 'invalid_password' })
      return
    }

    // 生成 token
    const token = generateAdminToken()

    // 设置 HTTP-only cookie（更安全）
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24小时
    })

    res.json({
      success: true,
      token // 同时返回 token 用于前端存储
    })
  } catch (error) {
    console.error('Admin login error:', error)
    res.status(500).json({ error: 'internal_error' })
  }
})

/**
 * GET /api/admin/status
 * 检查管理员登录状态
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    // 从 cookie 或 header 获取 token
    const token = req.cookies?.admin_token || req.headers?.authorization?.replace('Bearer ', '')

    if (!token) {
      res.json({ isAdmin: false })
      return
    }

    // 验证 token
    const payload = verifyAdminToken(token)

    if (!payload || !payload.isAdmin) {
      res.json({ isAdmin: false })
      return
    }

    res.json({
      isAdmin: true,
      loginTime: new Date(payload.timestamp).toISOString()
    })
  } catch (error) {
    console.error('Admin status check error:', error)
    res.json({ isAdmin: false })
  }
})

/**
 * POST /api/admin/logout
 * 管理员登出
 */
router.post('/logout', async (_req: Request, res: Response): Promise<void> => {
  try {
    // 清除 cookie
    res.clearCookie('admin_token')

    res.json({ success: true })
  } catch (error) {
    console.error('Admin logout error:', error)
    res.status(500).json({ error: 'internal_error' })
  }
})

export default router
