import { Router, type Request, type Response } from 'express'
import { handleGetFollowingTweets } from '../twitter.js'
import { getHomeTimeline, getUserTimeline, normalizeV1Tweets } from '../twitter_oauth1.js'

const router = Router()

type RequestWithUser = Request & { user?: { id: string } }

router.get('/following-tweets', async (req: Request, res: Response) => {
  const userIdFromQuery = (req.query.user_id as string) || (req.headers['x-user-id'] as string)
  if (userIdFromQuery) {
    ;(req as RequestWithUser).user = { id: userIdFromQuery }
  }
  return handleGetFollowingTweets(req, res)
})

router.get('/user-timeline', async (req: Request, res: Response) => {
  try {
    const screen_name = (req.query.screen_name as string) || ''
    const count = parseInt((req.query.count as string) || '50')
    const mode = (req.query.mode as string) || 'home'
    if (mode === 'home') {
      const arr = await getHomeTimeline(count)
      const pick = normalizeV1Tweets('', arr).slice(0, count)
      return res.json({ tweets: pick, totalCount: pick.length })
    }
    if (!screen_name) return res.status(400).json({ error: '缺少参数：screen_name' })
    const arr = await getUserTimeline(screen_name, count)
    const pick = normalizeV1Tweets(screen_name, arr).slice(0, count)
    return res.json({ tweets: pick, totalCount: pick.length })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'twitter_oauth1_failed'
    if (message === 'twitter_oauth1_failed') return res.status(500).json({ error: 'Twitter 拉取失败' })
    return res.status(500).json({ error: message })
  }
})

export default router
