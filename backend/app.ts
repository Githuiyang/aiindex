/**
 * API server (moved from api/ to avoid Vercel function count)
 */
import express, { type Request, type Response } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import twitterRoutes from './routes/twitter.js'
import adminRoutes from './routes/admin.js'
import adminAuthRoutes from './routes/adminAuth.js'
import contentRoutes from './routes/content.js'
import scrapeRoutes from './routes/scrape.js'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(cookieParser())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/twitter', twitterRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin/auth', adminAuthRoutes)
app.use('/api/content', contentRoutes)
app.use('/api/scrape', scrapeRoutes)

app.use('/api/health', (req: Request, res: Response): void => {
  void req
  res.status(200).json({ success: true, message: 'ok' })
})

app.use((error: Error, req: Request, res: Response, next: express.NextFunction) => {
  void error
  void req
  void next
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app

