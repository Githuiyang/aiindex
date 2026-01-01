import crypto from 'crypto'
import { URLSearchParams } from 'url'

function percentEncode(str: string) { return encodeURIComponent(str).replace(/[!*()']/g, c => '%' + c.charCodeAt(0).toString(16)) }
function buildSignatureBase(method: string, url: string, params: Record<string, string>) {
  const sorted = Object.keys(params).sort().map(k => `${percentEncode(k)}=${percentEncode(params[k])}`).join('&')
  return [method.toUpperCase(), percentEncode(url), percentEncode(sorted)].join('&')
}

async function fetchV1(path: string, params: Record<string, string>) {
  const baseUrl = 'https://api.twitter.com/1.1/' + path
  const oauth = {
    oauth_consumer_key: process.env.TWITTER_OAUTH_CONSUMER_KEY || '',
    oauth_token: process.env.TWITTER_OAUTH_TOKEN || '',
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_version: '1.0',
  }
  const merged = { ...params, ...oauth }
  const base = buildSignatureBase('GET', baseUrl, merged)
  const key = `${percentEncode(process.env.TWITTER_OAUTH_CONSUMER_SECRET || '')}&${percentEncode(process.env.TWITTER_OAUTH_TOKEN_SECRET || '')}`
  const signature = crypto.createHmac('sha1', key).update(base).digest('base64')
  const s = new URLSearchParams(params)
  const authHeader = 'OAuth ' + Object.entries({ ...oauth, oauth_signature: signature }).map(([k, v]) => `${percentEncode(k)}="${percentEncode(String(v))}"`).join(', ')
  const resp = await fetch(`${baseUrl}?${s.toString()}`, { headers: { Authorization: authHeader } })
  if (!resp.ok) throw new Error(`Twitter API 错误：${resp.status}`)
  return resp.json()
}

export async function getHomeTimeline(count = 50) { const data = await fetchV1('statuses/home_timeline.json', { count: String(count), tweet_mode: 'extended' }); return Array.isArray(data) ? data : [] }
export async function getUserTimeline(screen_name: string, count = 50) { const data = await fetchV1('statuses/user_timeline.json', { screen_name, count: String(count), tweet_mode: 'extended' }); return Array.isArray(data) ? data : [] }

export function normalizeV1Tweets(screen_name: string, arr: unknown[]) {
  const asRecord = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})
  return (arr || []).map((t) => {
    const rec = asRecord(t); const user = asRecord(rec.user)
    const id = String(rec.id_str ?? rec.id ?? '')
    const author_username = screen_name || String(user.screen_name ?? '')
    const tweet_content = String(rec.full_text ?? rec.text ?? '')
    const retweet_count = Number(rec.retweet_count ?? 0)
    const quote_count = Number(rec.quote_count ?? 0)
    const reply_count = Number(rec.reply_count ?? 0)
    const like_count = Number(rec.favorite_count ?? 0)
    const engagement_score = Number(retweet_count * 4 + quote_count * 3 + reply_count * 2 + like_count)
    const tweet_created_at = String(rec.created_at ?? '')
    return { id, author_username, tweet_content, retweet_count, like_count, reply_count, engagement_score, tweet_created_at, sentiment_analysis: { sentiment: 'neutral', score: 0.5, confidence: 0.5 } }
  })
}
