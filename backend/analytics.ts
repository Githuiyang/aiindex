const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export interface SentimentAnalysis { sentiment: 'positive' | 'negative' | 'neutral'; score: number; confidence: number }

export async function analyzeSentiment(text: string): Promise<SentimentAnalysis> {
  const messages = [ { role: 'system', content: '请只返回JSON，包含 sentiment、score、confidence。' }, { role: 'user', content: `文本：「${text}」` }, ]
  if (DEEPSEEK_API_KEY) {
    try {
      const resp = await fetch(`${DEEPSEEK_API_BASE}/v1/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'deepseek-chat', messages, temperature: 0.3, max_tokens: 150 }) })
      if (!resp.ok) throw new Error(`DeepSeek API error: ${resp.status}`)
      const data = await resp.json(); const content = data.choices?.[0]?.message?.content
      if (content) { try { const result = JSON.parse(content); return { sentiment: result.sentiment || 'neutral', score: Math.max(0, Math.min(1, result.score ?? 0.5)), confidence: Math.max(0, Math.min(1, result.confidence ?? 0.8)) } } catch { return analyzeSentimentSimple(text) } }
      return analyzeSentimentSimple(text)
    } catch { return analyzeSentimentSimple(text) }
  }
  if (OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature: 0.3, max_tokens: 150 }) })
      if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`)
      const data = await response.json(); const content = data.choices?.[0]?.message?.content
      if (content) { try { const result = JSON.parse(content); return { sentiment: result.sentiment || 'neutral', score: Math.max(0, Math.min(1, result.score ?? 0.5)), confidence: Math.max(0, Math.min(1, result.confidence ?? 0.8)) } } catch { return analyzeSentimentSimple(text) } }
      return analyzeSentimentSimple(text)
    } catch { return analyzeSentimentSimple(text) }
  }
  return analyzeSentimentSimple(text)
}

export function analyzeSentimentSimple(text: string): SentimentAnalysis {
  const positiveWords = ['好','棒','优秀','喜欢','爱','赞','支持','感谢','开心','快乐','成功','胜利']
  const negativeWords = ['坏','差','糟糕','讨厌','恨','反对','批评','愤怒','难过','失败','错误','问题']
  const lowerText = text.toLowerCase()
  let p = 0, n = 0
  for (const w of positiveWords) if (lowerText.includes(w)) p++
  for (const w of negativeWords) if (lowerText.includes(w)) n++
  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral'
  let score = 0.5
  if (p > n) { sentiment = 'positive'; score = Math.min(1, 0.5 + (p - n) * 0.1) }
  else if (n > p) { sentiment = 'negative'; score = Math.max(0, 0.5 - (n - p) * 0.1) }
  const confidence = Math.min(1, (p + n) * 0.1 + 0.5)
  return { sentiment, score, confidence }
}

