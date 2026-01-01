import { Router, type Request, type Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL as string
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
const anonKey = process.env.VITE_SUPABASE_ANON_KEY as string
const admin = createClient(supabaseUrl, serviceKey)
const anon = createClient(supabaseUrl, anonKey)

const router = Router()

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    res.status(400).json({ error: 'missing_email_or_password' })
    return
  }
  const list = await admin.auth.admin.listUsers()
  const exist = list.data.users?.find((u: { id?: string; email?: string }) => u.email === email)
  if (exist?.id) {
    res.status(200).json({ ok: true, userId: exist.id, existed: true })
    return
  }
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error || !created.data.user?.id) {
    res.status(500).json({ error: created.error?.message || 'create_failed' })
    return
  }
  const userId = created.data.user.id
  const upsert = await admin.from('users').upsert({ id: userId, email, password_hash: 'supabase_auth', plan: 'free' }, { onConflict: 'id' })
  if (upsert.error) {
    res.status(500).json({ error: upsert.error.message })
    return
  }
  res.json({ ok: true, userId })
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    res.status(400).json({ error: 'missing_email_or_password' })
    return
  }
  const { data, error } = await anon.auth.signInWithPassword({ email, password })
  if (error) {
    res.status(401).json({ error: error.message })
    return
  }
  res.json({ ok: true, user: data.user, session: data.session })
})

router.post('/logout', async (_req: Request, res: Response): Promise<void> => {
  res.json({ ok: true })
})

export default router

