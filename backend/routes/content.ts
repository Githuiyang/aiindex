import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// Practices
router.get('/practices', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('practices').select('*').order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/practices', async (req: Request, res: Response) => {
  const { title, subtitle, url, description, tags, logo_url } = req.body
  // In a real app, get user_id from auth middleware
  // const user_id = req.user?.id
  const { data, error } = await supabase.from('practices').insert([{ title, subtitle, url, description, tags, logo_url }]).select()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data[0])
})

router.delete('/practices/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const { error } = await supabase.from('practices').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

router.patch('/practices/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const { title, subtitle, description } = req.body
  
  const { data, error } = await supabase
    .from('practices')
    .update({ title, subtitle, description })
    .eq('id', id)
    .select()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data[0])
})

// Images
router.get('/images', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('images').select('*').order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/images', async (req: Request, res: Response) => {
  const { title, prompt, image_url, description } = req.body
  const { data, error } = await supabase.from('images').insert([{ title, prompt, image_url, description }]).select()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data[0])
})

router.delete('/images/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const { error } = await supabase.from('images').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

router.patch('/images/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const { title, prompt, image_url, description } = req.body
  
  const { data, error } = await supabase
    .from('images')
    .update({ title, prompt, image_url, description })
    .eq('id', id)
    .select()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data[0])
})

// Posts
router.get('/posts', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/posts', async (req: Request, res: Response) => {
  const { title, content, tags } = req.body
  const { data, error } = await supabase.from('posts').insert([{ title, content, tags }]).select()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data[0])
})

export default router
