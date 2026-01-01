import { useState, useEffect, useCallback } from 'react'
import { supabase, type DailySummary, type TweetAnalysis } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [tweets, setTweets] = useState<TweetAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const fetchDailySummary = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', user?.id)
        .eq('summary_date', selectedDate)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setSummary(data)
    } catch (err) {
      console.error('Failed to fetch daily summary:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id, selectedDate])

  const fetchTopTweets = useCallback(async () => {
    try {
      const { data: summaries, error: summaryError } = await supabase
        .from('daily_summaries')
        .select('id')
        .eq('user_id', user?.id)
        .eq('summary_date', selectedDate)
        .single()

      if (summaryError || !summaries) return

      const { data, error } = await supabase
        .from('tweet_analysis')
        .select('*')
        .eq('summary_id', summaries.id)
        .order('engagement_score', { ascending: false })
        .limit(10)

      if (error) throw error
      setTweets(data || [])
    } catch (err) {
      console.error('Failed to fetch tweets:', err)
    }
  }, [user?.id, selectedDate])

  useEffect(() => {
    if (user) {
      fetchDailySummary()
      fetchTopTweets()
    }
  }, [user, selectedDate, fetchDailySummary, fetchTopTweets])

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100'
      case 'negative': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">每日摘要</h1>
          <p className="mt-2 text-gray-600">查看您关注的Twitter账户的最新分析结果</p>
        </div>

        {/* 日期选择器 */}
        <div className="mb-6">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 统计卡片 */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">总推文数</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{summary.total_tweets}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">正面情绪</div>
              <div className="mt-2 text-3xl font-bold text-green-600">{summary.positive_count}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">负面情绪</div>
              <div className="mt-2 text-3xl font-bold text-red-600">{summary.negative_count}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">中性情绪</div>
              <div className="mt-2 text-3xl font-bold text-gray-600">{summary.neutral_count}</div>
            </div>
          </div>
        )}

        {/* 情绪分析图表 */}
        {summary && summary.sentiment_distribution && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">情绪分布</h2>
            <div className="flex items-center space-x-8">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                  <span className="text-sm text-gray-600">正面 {(summary.sentiment_distribution.positive * 100).toFixed(1)}%</span>
                </div>
                <div className="flex items-center mb-2">
                  <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                  <span className="text-sm text-gray-600">负面 {(summary.sentiment_distribution.negative * 100).toFixed(1)}%</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-400 rounded mr-2"></div>
                  <span className="text-sm text-gray-600">中性 {(summary.sentiment_distribution.neutral * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 热门推文 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">热门推文</h2>
            <p className="text-sm text-gray-600 mt-1">基于互动量和情绪分析排序</p>
          </div>
          <div className="divide-y divide-gray-200">
            {tweets.map((tweet) => (
              <div key={tweet.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="font-medium text-gray-900">@{tweet.author_username}</span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getSentimentColor(tweet.sentiment_analysis?.sentiment || 'neutral')}`}>
                        {tweet.sentiment_analysis?.sentiment === 'positive' ? '正面' : 
                         tweet.sentiment_analysis?.sentiment === 'negative' ? '负面' : '中性'}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{tweet.tweet_content}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>❤️ {tweet.like_count}</span>
                      <span>🔄 {tweet.retweet_count}</span>
                      <span>💬 {tweet.reply_count}</span>
                      <span>评分: {tweet.engagement_score.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {tweets.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                暂无数据，请先添加关注的Twitter用户
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}