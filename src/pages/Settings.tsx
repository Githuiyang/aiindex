import { useState, useEffect, useCallback } from 'react'
import { supabase, type UserFollowing } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Settings() {
  const { user } = useAuth()
  const [following, setFollowing] = useState<UserFollowing[]>([])
  const [newUsername, setNewUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [bearer, setBearer] = useState('')
  const [verifying, setVerifying] = useState(false)

  const fetchFollowing = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_following')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFollowing(data || [])
    } catch (err) {
      console.error('Failed to fetch following:', err)
    }
  }, [user?.id])

  useEffect(() => {
    if (user) {
      fetchFollowing()
    }
    const saved = localStorage.getItem('twitter_bearer_token') || ''
    setBearer(saved)
  }, [user, fetchFollowing])

  const [previewTweet, setPreviewTweet] = useState<{
    id: string
    author_name: string
    author_username: string
    author_profile_image_url?: string
    tweet_content: string
    like_count: number
    retweet_count: number
  } | null>(null)

  const verifyBearer = async () => {
    if (!bearer.trim()) { alert('请先填写 Twitter 访问令牌'); return }
    setVerifying(true)
    setPreviewTweet(null)
    try {
      const resp = await fetch('/api/twitter/following-tweets?limit=1&source=real', {
        headers: {
          ...(user?.id ? { 'x-user-id': user.id } : {}),
          'x-twitter-bearer-token': bearer.trim(),
        },
      })
      const ok = resp.ok
      const data = await resp.json().catch(() => ({}))
      if (ok) {
        if (data.tweets && data.tweets.length > 0) {
          console.log('Setting preview tweet:', data.tweets[0])
          setPreviewTweet(data.tweets[0])
        } else {
          console.warn('No tweets found', data)
          alert('API验证通过，但未找到推文。可能是关注列表为空，或API速率限制。')
        }
      } else {
        alert(`验证失败：${resp.status} ${data?.error || ''}`)
      }
    } catch {
      alert('网络错误或服务不可用')
    }
    setVerifying(false)
  }

  const addFollowing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUsername.trim()) return

    setLoading(true)
    try {
      // 这里需要调用Twitter API来获取用户信息
      // 暂时使用模拟数据
      const mockTwitterUser = {
        twitter_user_id: `mock_${Date.now()}`,
        twitter_username: newUsername,
        display_name: newUsername,
      }

      const { error } = await supabase
        .from('user_following')
        .insert([
          {
            user_id: user?.id,
            ...mockTwitterUser,
          },
        ])

      if (error) throw error
      
      setNewUsername('')
      fetchFollowing()
    } catch (err) {
      console.error('Failed to add following:', err)
    } finally {
      setLoading(false)
    }
  }

  const removeFollowing = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_following')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchFollowing()
    } catch (err) {
      console.error('Failed to remove following:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">设置</h1>
          <p className="mt-2 text-gray-600">管理您的账户设置和关注列表</p>
        </div>

        {/* Twitter Bearer Token 设置 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Twitter 访问令牌</h2>
            <p className="text-sm text-gray-600 mt-1">用于抓取真实数据（不填则使用示例数据）</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <input
                type="password"
                value={bearer}
                onChange={(e) => setBearer(e.target.value)}
                placeholder="填写形如：AAAAAAAAA... 的访问令牌"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { localStorage.setItem('twitter_bearer_token', bearer || ''); alert('已保存'); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  保存到本地
                </button>
                <button
                  type="button"
                  onClick={() => { localStorage.removeItem('twitter_bearer_token'); setBearer(''); alert('已清除'); }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  清除
                </button>
                <button
                  type="button"
                  disabled={verifying}
                  onClick={verifyBearer}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {verifying ? '验证中…' : '验证 & 预览'}
                </button>
              </div>
              
              {previewTweet && (
                <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="text-xs text-gray-500 mb-2 font-medium">真实抓取预览</div>
                  <div className="flex items-start gap-3">
                    {previewTweet.author_profile_image_url ? (
                      <img src={previewTweet.author_profile_image_url} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold">
                        {previewTweet.author_name?.[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 truncate">{previewTweet.author_name}</span>
                        <span className="text-sm text-gray-500 truncate">@{previewTweet.author_username}</span>
                      </div>
                      <p className="text-gray-800 mt-1 text-sm line-clamp-3">{previewTweet.tweet_content}</p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>❤️ {previewTweet.like_count}</span>
                        <span>↻ {previewTweet.retweet_count}</span>
                        <a 
                          href={`https://x.com/${previewTweet.author_username}/status/${previewTweet.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline flex items-center gap-1"
                        >
                          🔗 原文
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500">仅保存在浏览器本地，调用接口时随请求发送。</p>
            </div>
          </div>
        </div>

        {/* 关注管理 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">关注管理</h2>
            <p className="text-sm text-gray-600 mt-1">添加您想要分析的Twitter用户</p>
          </div>
          <div className="p-6">
            <form onSubmit={addFollowing} className="mb-6">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="输入Twitter用户名（不含@）"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? '添加中...' : '添加'}
                </button>
              </div>
            </form>

            <div className="space-y-3">
              {following.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-medium">@{user.twitter_username[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">@{user.twitter_username}</div>
                      {user.display_name && (
                        <div className="text-sm text-gray-500">{user.display_name}</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFollowing(user.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    移除
                  </button>
                </div>
              ))}
              {following.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  暂无关注的用户，请添加Twitter用户开始分析
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
