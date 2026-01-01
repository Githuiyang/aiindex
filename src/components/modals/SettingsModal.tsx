import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Loader2, Lock, Heart, Repeat, ExternalLink, User } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PreviewTweet {
  id: string;
  author_name: string;
  author_username: string;
  author_profile_image_url?: string;
  tweet_content: string;
  like_count: number;
  retweet_count: number;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [geminiKey, setGeminiKey] = useState('');
  const [twitterToken, setTwitterToken] = useState('');
  const [rapidApiKey, setRapidApiKey] = useState('');
  const [useRapidApi, setUseRapidApi] = useState(true);
  const [adminPassword, setAdminPassword] = useState('');
  
  // Advanced Strategy State
  const [targetSource, setTargetSource] = useState<'timeline' | 'following'>('timeline');
  const [targetHandle, setTargetHandle] = useState('elonmusk');
  const [minLikes, setMinLikes] = useState(50);
  const [minRetweets, setMinRetweets] = useState(10);
  const [minReplies, setMinReplies] = useState(5);
  const [minBookmarks, setMinBookmarks] = useState(5);

  const [verifying, setVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [adminAuthError, setAdminAuthError] = useState(false);
  const [previewTweet, setPreviewTweet] = useState<PreviewTweet | null>(null);
  const [previewError, setPreviewError] = useState('');

  const { isAdmin, login, logout } = useAuthStore();

  const toChineseError = (raw: string) => {
    const msg = (raw || '').trim();
    if (!msg) return '发生未知错误';

    if (msg === 'Unauthorized') return '未授权：请先登录，或填写 Twitter 访问令牌。';
    if (msg.includes('Target handle is required for Timeline strategy')) return '选择“指定用户时间线”策略时必须填写目标账号（不含 @）。';
    if (msg.includes('App-only tokens require a specific Target Handle')) {
      return '当前访问令牌为应用级（App-only），无法自动识别“我是谁”。请在“目标账号”中填写你要分析的用户名（不含 @）。';
    }
    if (msg.includes('Connection successful but no tweets met criteria')) return '连接成功，但没有推文满足当前阈值条件。请降低阈值或更换目标账号。';
    if (msg.includes('Found tweets for @') && msg.includes('none met engagement criteria')) return '已抓到推文，但没有满足当前阈值条件。请降低阈值后重试。';
    if (msg.includes('No data found with current strategy')) return '使用当前策略未找到数据。请调整抓取策略或目标账号。';
    if (msg.includes('No data source available')) return '没有可用的数据来源：请登录或填写 Twitter 访问令牌。';
    if (msg.includes('Network error') || msg.includes('service unavailable')) return '网络错误或服务不可用，请稍后重试。';
    if (msg.startsWith('API Error:')) return msg.replace(/^API Error:/, 'API 错误：');
    if (msg.includes('Twitter API error')) return msg.replace('Twitter API error', 'Twitter API 错误');
    if (msg.includes('RapidAPI error')) return msg.replace('RapidAPI error', 'RapidAPI 错误');
    if (msg.includes('API Connection OK')) return 'API 连接正常，但没有找到符合条件的推文。请降低阈值或更换目标账号。';

    return msg;
  };

  useEffect(() => {
    const savedGemini = localStorage.getItem('gemini_api_key');
    const savedTwitter = localStorage.getItem('twitter_bearer_token');
    const savedRapid = localStorage.getItem('rapid_api_key');
    const savedUseRapid = localStorage.getItem('use_rapid_api');
    
    // Load Strategy Config
    const savedTargetSource = localStorage.getItem('crawler_target_type');
    const savedTargetHandle = localStorage.getItem('crawler_target_handle');
    const savedMinLikes = localStorage.getItem('crawler_min_likes');
    const savedMinRetweets = localStorage.getItem('crawler_min_retweets');
    const savedMinReplies = localStorage.getItem('crawler_min_replies');
    const savedMinBookmarks = localStorage.getItem('crawler_min_bookmarks');

    if (savedGemini) setGeminiKey(savedGemini);
    if (savedTwitter) setTwitterToken(savedTwitter);
    if (savedRapid) setRapidApiKey(savedRapid);
    if (savedUseRapid) setUseRapidApi(savedUseRapid === 'true');
    
    if (savedTargetSource === 'timeline' || savedTargetSource === 'following') setTargetSource(savedTargetSource);
    if (savedTargetHandle) setTargetHandle(savedTargetHandle);
    if (savedMinLikes) setMinLikes(parseInt(savedMinLikes));
    if (savedMinRetweets) setMinRetweets(parseInt(savedMinRetweets));
    if (savedMinReplies) setMinReplies(parseInt(savedMinReplies));
    if (savedMinBookmarks) setMinBookmarks(parseInt(savedMinBookmarks));
  }, []);

  const handleVerifyTwitter = async () => {
    if (useRapidApi) {
      if (!rapidApiKey.trim()) {
        setVerificationStatus('error');
        setPreviewError('需要填写 RapidAPI Key');
        return;
      }
    } else {
      if (!twitterToken.trim()) { 
        setVerificationStatus('error');
        setPreviewError('需要填写 Twitter 访问令牌');
        return; 
      }
    }

    const cleanHandle = targetHandle.trim();

    // Validate Target Handle for Timeline Strategy
    if (targetSource === 'timeline' && !cleanHandle) {
      setVerificationStatus('error');
      setPreviewError('选择“指定用户时间线”策略时必须填写目标账号（不含 @）');
      return;
    }

    setVerifying(true);
    setVerificationStatus('idle');
    setPreviewTweet(null);
    setPreviewError('');

    try {
      const token = useRapidApi ? rapidApiKey.trim() : twitterToken.trim();
      console.log('Fetching tweets with token:', token.slice(0, 10) + '...');
      
      const queryParams = new URLSearchParams({
        limit: '1',
        source: useRapidApi ? 'rapidapi' : 'real',
        target_type: targetSource,
        target_handle: cleanHandle,
        min_likes: minLikes.toString(),
        min_retweets: minRetweets.toString(),
        min_replies: minReplies.toString(),
        min_bookmarks: minBookmarks.toString(),
      });

      const resp = await fetch(`/api/twitter/following-tweets?${queryParams.toString()}`, {
        headers: {
          [useRapidApi ? 'x-rapidapi-key' : 'x-twitter-bearer-token']: token,
        },
      });
      
      const data = await resp.json().catch(() => ({}));
      console.log('API Response:', { status: resp.status, data });
      
      if (resp.ok) {
        if (data.tweets && data.tweets.length > 0) {
          console.log('Setting preview tweet:', data.tweets[0]);
          setVerificationStatus('success');
          setPreviewTweet(data.tweets[0]);
        } else {
          console.warn('No tweets found in response', data);
          setVerificationStatus('error'); // Show error state to make it visible
          setPreviewError(toChineseError(data.message || 'API Connection OK, but no tweets found matching criteria.'));
        }
      } else {
        setVerificationStatus('error');
        setPreviewError(toChineseError(`API Error: ${resp.status} ${data?.error || ''}`));
      }
    } catch {
      setVerificationStatus('error');
      setPreviewError('网络错误或服务不可用，请稍后重试');
    }
    setVerifying(false);
  };

  const handleSaveKeys = () => {
    localStorage.setItem('gemini_api_key', geminiKey);
    localStorage.setItem('twitter_bearer_token', twitterToken);
    localStorage.setItem('rapid_api_key', rapidApiKey);
    localStorage.setItem('use_rapid_api', String(useRapidApi));
    
    // Save Strategy Config
    localStorage.setItem('crawler_target_type', targetSource);
    localStorage.setItem('crawler_target_handle', targetHandle);
    localStorage.setItem('crawler_min_likes', minLikes.toString());
    localStorage.setItem('crawler_min_retweets', minRetweets.toString());
    localStorage.setItem('crawler_min_replies', minReplies.toString());
    localStorage.setItem('crawler_min_bookmarks', minBookmarks.toString());

    onClose();
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'aiindex2025') {
      login();
      setAdminPassword('');
      setAdminAuthError(false);
    } else {
      setAdminAuthError(true);
      setTimeout(() => setAdminAuthError(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-zinc-950 border-l border-zinc-800 p-8 z-[70] shadow-2xl overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white">设置</h2>
              <button 
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-8">
              {/* Admin Auth Section */}
              <section>
                <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">管理员权限</h3>
                {isAdmin ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-green-500 font-medium text-sm">已认证</span>
                    </div>
                    <button 
                      onClick={logout}
                      className="text-xs text-zinc-400 hover:text-white underline"
                    >
                      退出
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-zinc-300 mb-2">管理员密码</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <input
                          type="password"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="请输入密码…"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-zinc-600 transition-colors"
                        />
                      </div>
                      {adminAuthError && (
                        <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle size={12} />
                          密码错误
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleAdminLogin}
                      className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors"
                    >
                      登录
                    </button>
                  </div>
                )}
              </section>

              <div className="h-px bg-zinc-900" />

              {/* Configuration Section */}
              <section className="space-y-6">
                <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">配置</h3>
                
                {/* Twitter Token */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm text-zinc-300">Twitter 接口设置</label>
                    <div className="flex items-center gap-2 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                      <button
                        onClick={() => setUseRapidApi(true)}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${
                          useRapidApi ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        RapidAPI (推荐)
                      </button>
                      <button
                        onClick={() => setUseRapidApi(false)}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${
                          !useRapidApi ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        官方 API
                      </button>
                    </div>
                  </div>

                  {useRapidApi ? (
                    <div className="space-y-2 mt-4">
                      <div className="relative">
                        <input
                          type="password"
                          value={rapidApiKey}
                          onChange={(e) => setRapidApiKey(e.target.value)}
                          placeholder="填写 RapidAPI Key..."
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-zinc-600 transition-colors"
                        />
                        <a 
                          href="https://rapidapi.com/hitandro-llc-hitandro-llc-default/api/twitter241/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-400 hover:underline flex items-center gap-1"
                        >
                          获取 Key <ExternalLink size={10} />
                        </a>
                      </div>
                      <p className="text-xs text-zinc-500">
                        使用 Twitter Data API (RapidAPI)，无需官方 Token，免费额度通常够用。
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <input
                        type="password"
                        value={twitterToken}
                        onChange={(e) => setTwitterToken(e.target.value)}
                        placeholder="例如：AAAAAAAAAAAAAAAAAAAA..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-zinc-600 transition-colors"
                      />
                      <p className="mt-2 text-xs text-zinc-500">
                        需要 Twitter 开发者账号和 Bearer Token。
                      </p>
                    </div>
                  )}
                </div>

                {/* Advanced Strategy */}
                <div className="pt-4 pb-2 border-t border-zinc-900">
                  <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">抓取策略</h3>
                  
                  {/* Target Source */}
                  <div className="mb-4">
                    <label className="block text-sm text-zinc-300 mb-2">抓取来源</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="targetSource" 
                          checked={targetSource === 'timeline'} 
                          onChange={() => setTargetSource('timeline')}
                          className="accent-white"
                        />
                        <span className="text-sm text-zinc-400">指定用户时间线</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="targetSource" 
                          checked={targetSource === 'following'} 
                          onChange={() => setTargetSource('following')}
                          className="accent-white"
                        />
                        <span className="text-sm text-zinc-400">关注列表高互动推文</span>
                      </label>
                    </div>
                  </div>

                  {/* Target Twitter Handle */}
                  <div className="mb-4">
                    <label className="block text-sm text-zinc-300 mb-2">
                      目标账号（不含 @）{targetSource === 'timeline' && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
                      <input
                        type="text"
                        value={targetHandle}
                        onChange={(e) => setTargetHandle(e.target.value.replace('@', ''))}
                        placeholder={targetSource === 'timeline' ? "必填（例如：elonmusk）" : "可选（例如：eviljer）"}
                        className={`w-full bg-zinc-900 border rounded-lg py-3 pl-8 pr-4 text-white focus:outline-none transition-colors ${
                          targetSource === 'timeline' && !targetHandle && verificationStatus === 'error'
                            ? 'border-red-500 focus:border-red-500' 
                            : 'border-zinc-800 focus:border-zinc-600'
                        }`}
                      />
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      {targetSource === 'timeline' 
                        ? '用于“指定用户时间线”：填写你要抓取的用户名（不含 @）。' 
                        : '不填则尝试使用已登录用户的关注列表（若访问令牌/登录态支持）。'}
                    </p>
                  </div>

                  {/* Minimum Engagement */}
                  <div>
                    <label className="block text-sm text-zinc-300 mb-2">最低互动阈值（满足任一项即可）</label>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <div className="text-xs text-zinc-500 mb-1 text-center">点赞</div>
                        <input
                          type="number"
                          value={minLikes}
                          onChange={(e) => setMinLikes(Number(e.target.value))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-center text-sm focus:border-zinc-600"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500 mb-1 text-center">转推</div>
                        <input
                          type="number"
                          value={minRetweets}
                          onChange={(e) => setMinRetweets(Number(e.target.value))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-center text-sm focus:border-zinc-600"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500 mb-1 text-center">回复</div>
                        <input
                          type="number"
                          value={minReplies}
                          onChange={(e) => setMinReplies(Number(e.target.value))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-center text-sm focus:border-zinc-600"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500 mb-1 text-center">书签</div>
                        <input
                          type="number"
                          value={minBookmarks}
                          onChange={(e) => setMinBookmarks(Number(e.target.value))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-center text-sm focus:border-zinc-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Connection Test & Preview */}
                <div className="pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-zinc-300">连接测试与预览</h4>
                  </div>

                  <button
                    onClick={handleVerifyTwitter}
                    disabled={verifying || (useRapidApi ? !rapidApiKey : !twitterToken)}
                    className="w-full py-3 bg-zinc-800 text-white font-bold rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        连接测试中…
                      </>
                    ) : (
                      '验证并预览'
                    )}
                  </button>

                  {/* Status Messages */}
                  {verificationStatus === 'success' && (
                    <div className="flex items-center gap-2 text-green-500 text-sm bg-green-500/10 p-3 rounded-lg">
                      <CheckCircle size={16} />
                      <span>连接验证成功</span>
                    </div>
                  )}

                  {verificationStatus === 'error' && (
                    <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg break-all">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{previewError || '验证失败'}</span>
                    </div>
                  )}

                  {/* Preview Card */}
                  {previewTweet && previewTweet.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-zinc-900 rounded-lg border border-zinc-800 p-4"
                    >
                      <div className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">实时预览</div>
                      <div className="flex items-start gap-3">
                        {previewTweet.author_profile_image_url ? (
                          <img 
                            src={previewTweet.author_profile_image_url} 
                            alt={previewTweet.author_name}
                            className="w-10 h-10 rounded-full bg-zinc-800"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                            <User size={20} className="text-zinc-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold text-white text-sm truncate">{previewTweet.author_name}</div>
                              <div className="text-zinc-500 text-xs truncate">@{previewTweet.author_username}</div>
                            </div>
                            <a 
                              href={`https://x.com/${previewTweet.author_username}/status/${previewTweet.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-zinc-500 hover:text-white transition-colors"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </div>
                          
                          <p className="mt-2 text-sm text-zinc-300 line-clamp-2">
                            {previewTweet.tweet_content}
                          </p>
                          
                          <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                            <div className="flex items-center gap-1">
                              <Heart size={12} />
                              <span>{previewTweet.like_count}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Repeat size={12} />
                              <span>{previewTweet.retweet_count}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </section>

              <div className="pt-8 border-t border-zinc-800">
                <button
                  onClick={handleSaveKeys}
                  className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  保存配置
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
