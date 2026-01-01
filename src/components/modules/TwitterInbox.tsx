import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Archive, Image as ImageIcon, Heart, Repeat, Loader2, AlertCircle, Bookmark, ExternalLink, Settings2, Trash2, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface Tweet {
  id: string;
  author_name: string;
  author_username: string;
  author_profile_image_url?: string;
  tweet_content: string;
  media_urls?: string[];
  like_count: number;
  retweet_count: number;
  bookmark_count: number;
  tweet_created_at: string;
}

export default function TwitterInbox() {
  const [handle, setHandle] = useState('');
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [strategy, setStrategy] = useState<'timeline' | 'following'>('timeline');
  const [savedTweetIds, setSavedTweetIds] = useState<Set<string>>(new Set());
  const [expandedTweetIds, setExpandedTweetIds] = useState<Set<string>>(new Set());
  
  // Watchlist state
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [newWatchHandle, setNewWatchHandle] = useState('');
  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState(false);

  useEffect(() => {
    // Load watchlist from local storage
    const stored = localStorage.getItem('twitter_watchlist');
    if (stored) {
      setWatchlist(JSON.parse(stored));
    }
  }, []);

  const addToWatchlist = () => {
    if (!newWatchHandle.trim()) return;
    const newList = [...new Set([...watchlist, newWatchHandle.trim()])];
    setWatchlist(newList);
    localStorage.setItem('twitter_watchlist', JSON.stringify(newList));
    setNewWatchHandle('');
  };

  const removeFromWatchlist = (h: string) => {
    const newList = watchlist.filter(item => item !== h);
    setWatchlist(newList);
    localStorage.setItem('twitter_watchlist', JSON.stringify(newList));
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedTweetIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedTweetIds(newSet);
  };

  const fetchTweetsForHandle = async (targetHandle: string) => {
      // Load config from localStorage
      const twitterToken = localStorage.getItem('twitter_bearer_token');
      const rapidKey = localStorage.getItem('rapid_api_key');
      const useRapid = localStorage.getItem('use_rapid_api') === 'true';

      const minLikes = localStorage.getItem('crawler_min_likes') || '50';
      const minRetweets = localStorage.getItem('crawler_min_retweets') || '10';
      const minReplies = localStorage.getItem('crawler_min_replies') || '5';
      const minBookmarks = localStorage.getItem('crawler_min_bookmarks') || '5';

      const queryParams = new URLSearchParams({
        limit: '20', // Limit per user to avoid rate limits
        source: useRapid ? 'rapidapi' : 'real',
        target_type: strategy,
        target_handle: targetHandle,
        min_likes: minLikes,
        min_retweets: minRetweets,
        min_replies: minReplies,
        min_bookmarks: minBookmarks,
      });

      const token = useRapid ? rapidKey : twitterToken;

      const resp = await fetch(`/api/twitter/following-tweets?${queryParams.toString()}`, {
        headers: {
          [useRapid ? 'x-rapidapi-key' : 'x-twitter-bearer-token']: token || '',
        },
      });

      return await resp.json();
  };

  const handleFetch = async () => {
    setLoading(true);
    setError('');
    setTweets([]);

    try {
      let allTweets: Tweet[] = [];
      
      // Determine sources: Manual Handle OR Watchlist
      const sources = handle.trim() ? [handle.trim()] : watchlist;
      
      if (sources.length === 0) {
        setError('请输入用户名或添加监控账号列表');
        setLoading(false);
        return;
      }

      // Parallel Fetch (limit concurrency if needed, but for now Promise.all is okay for small lists)
      const promises = sources.map(async (source) => {
         try {
            return await fetchTweetsForHandle(source);
         } catch (e) {
            console.error(`Error fetching for ${source}:`, e);
            return { tweets: [] }; // Fail gracefully for individual sources
         }
      });
      const results = await Promise.all(promises);

      results.forEach(data => {
         if (data && data.tweets && Array.isArray(data.tweets)) {
            allTweets = [...allTweets, ...data.tweets];
         } else if (data && data.error) {
             console.warn(data.error); // Log specific error but don't stop everything
         }
      });

      // De-duplicate by ID
      const uniqueTweets = Array.from(new Map(allTweets.map(item => [item.id, item])).values());
      
      // Sort by engagement (simple sum)
      uniqueTweets.sort((a, b) => (b.like_count + b.retweet_count) - (a.like_count + a.retweet_count));

      if (uniqueTweets.length > 0) {
        setTweets(uniqueTweets);
      } else {
        // If single source failed, show its error if possible, otherwise generic
        if (results.length === 1 && results[0]?.error) {
             setError(results[0].error);
        } else {
             setError('在指定的来源中未找到符合条件的推文，或部分账号访问受限');
        }
      }

    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToPractices = async (tweet: Tweet) => {
    if (savedTweetIds.has(tweet.id)) return;
    
    // Optimistic UI update
    const newSaved = new Set(savedTweetIds);
    newSaved.add(tweet.id);
    setSavedTweetIds(newSaved);

    try {
      const response = await fetch('/api/content/practices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${tweet.author_name} 的推文`,
          description: tweet.tweet_content, 
          url: `https://twitter.com/${tweet.author_username}/status/${tweet.id}`,
          logo_url: tweet.author_profile_image_url,
          tags: ['Twitter', tweet.author_name]
        })
      });

      if (response.ok) {
        toast.success('已保存到优秀实践');
      } else {
        const data = await response.json();
        toast.error(data.error || '保存失败');
        // Revert on failure
        const reverted = new Set(savedTweetIds);
        reverted.delete(tweet.id);
        setSavedTweetIds(reverted);
      }
    } catch (error) {
      console.error(error);
      toast.error('保存出错，请检查网络');
      // Revert on failure
      const reverted = new Set(savedTweetIds);
      reverted.delete(tweet.id);
      setSavedTweetIds(reverted);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto py-8"
    >
      <div className="mb-12 flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="flex-1 flex gap-2">
             <input 
                type="text" 
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder={watchlist.length > 0 ? `抓取 ${watchlist.length} 个监控账号（或输入特定用户）...` : "输入要抓取的 Twitter 用户名（不含 @）…"}
                className="flex-1 p-4 bg-zinc-900 border-none rounded-lg outline-none text-white placeholder-zinc-600 focus:ring-1 focus:ring-white transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              />
              <Dialog open={isWatchlistModalOpen} onOpenChange={setIsWatchlistModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-full bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:text-white">
                    <Settings2 size={20} />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>管理监控账号列表</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="输入用户名 (不含 @)" 
                        value={newWatchHandle}
                        onChange={(e) => setNewWatchHandle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addToWatchlist()}
                        className="bg-zinc-900 border-zinc-800 text-white"
                      />
                      <Button onClick={addToWatchlist} className="bg-white text-black hover:bg-zinc-200">
                        <Plus size={16} />
                      </Button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                       {watchlist.length === 0 && <p className="text-zinc-500 text-sm text-center py-4">暂无监控账号</p>}
                       {watchlist.map(h => (
                         <div key={h} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
                           <span>@{h}</span>
                           <button onClick={() => removeFromWatchlist(h)} className="text-zinc-500 hover:text-red-500 transition-colors">
                             <Trash2 size={14} />
                           </button>
                         </div>
                       ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
          </div>
          
          <button 
            onClick={handleFetch}
            disabled={loading || (!handle.trim() && watchlist.length === 0)}
            className="px-8 py-4 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : '抓取'}
          </button>
        </div>
        
        {/* Strategy Selection */}
        <div className="flex gap-6 px-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="radio" 
              name="inbox_strategy" 
              checked={strategy === 'timeline'}
              onChange={() => setStrategy('timeline')}
              className="accent-white"
            />
            <span className={`text-sm transition-colors ${strategy === 'timeline' ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
              抓取时间线
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="radio" 
              name="inbox_strategy" 
              checked={strategy === 'following'}
              onChange={() => setStrategy('following')}
              className="accent-white"
            />
            <span className={`text-sm transition-colors ${strategy === 'following' ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
              抓取关注的人 (Beta)
            </span>
          </label>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-4 rounded-lg">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {tweets.map((tweet) => {
          const isExpanded = expandedTweetIds.has(tweet.id);
          const isLongText = tweet.tweet_content.length > 150;
          const displayContent = isExpanded || !isLongText 
              ? tweet.tweet_content 
              : tweet.tweet_content.slice(0, 150) + '...';
          const isSaved = savedTweetIds.has(tweet.id);

          return (
          <div key={tweet.id} className="p-6 border border-zinc-900 rounded-lg flex gap-6 bg-black hover:border-zinc-800 transition-colors">
            {tweet.author_profile_image_url ? (
               <img 
                 src={tweet.author_profile_image_url} 
                 alt={tweet.author_name}
                 className="w-12 h-12 rounded-full flex-shrink-0 bg-zinc-800"
               />
            ) : (
              <div className="w-12 h-12 bg-zinc-800 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-zinc-400">
                {tweet.author_name[0]}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-bold text-zinc-200">{tweet.author_name}</span>
                  <span className="text-zinc-500 text-sm ml-2">@{tweet.author_username}</span>
                </div>
                <div className="text-zinc-600 text-sm flex items-center gap-2">
                  <span>{new Date(tweet.tweet_created_at).toLocaleString()}</span>
                  <a 
                    href={`https://twitter.com/${tweet.author_username}/status/${tweet.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-zinc-300 transition-colors"
                    title="在 X (Twitter) 上查看"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
              
              <div className="text-zinc-400 mb-4 leading-relaxed whitespace-pre-wrap break-words">
                 {/* Simple linkification could be added here if needed, for now just text */}
                 {displayContent}
                 {isLongText && (
                    <button 
                      onClick={() => toggleExpand(tweet.id)}
                      className="ml-2 text-zinc-500 hover:text-zinc-300 text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {isExpanded ? '收起' : '展开全文'}
                    </button>
                 )}
              </div>
              
              {tweet.media_urls && tweet.media_urls.length > 0 && (
                <div className={`grid gap-2 mb-4 ${tweet.media_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                   {tweet.media_urls.map((url, index) => (
                      <img 
                        key={index} 
                        src={url} 
                        alt="Tweet media" 
                        className="rounded-lg w-full h-auto max-h-96 object-cover border border-zinc-800"
                        loading="lazy"
                      />
                   ))}
                </div>
              )}
              
              <div className="flex items-center gap-6 mb-6 text-sm text-zinc-600">
                <div className="flex items-center gap-2" title="点赞数">
                  <Heart size={14} />
                  <span>{tweet.like_count}</span>
                </div>
                <div className="flex items-center gap-2" title="转发数">
                  <Repeat size={14} />
                  <span>{tweet.retweet_count}</span>
                </div>
                <div className="flex items-center gap-2" title="收藏数">
                  <Bookmark size={14} />
                  <span>{tweet.bookmark_count}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => handleSaveToPractices(tweet)}
                  disabled={isSaved}
                  className={`flex items-center gap-2 px-4 py-2 border rounded text-sm transition-all ${
                    isSaved 
                      ? 'bg-green-900/20 border-green-900/50 text-green-500 cursor-default' 
                      : 'border-zinc-800 text-zinc-400 hover:border-white hover:text-white'
                  }`}
                >
                  {isSaved ? <Check size={14} /> : <Archive size={14} />}
                  {isSaved ? '已保存' : '保存到优秀实践'}
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-zinc-800 rounded text-sm text-zinc-400 hover:border-white hover:text-white transition-all">
                  <ImageIcon size={14} />
                  保存到图片流
                </button>
              </div>
            </div>
          </div>
          )
        })}
        
        {!loading && tweets.length === 0 && !error && (
          <div className="text-center text-zinc-600 py-12">
            输入用户名或添加监控列表，然后点击抓取开始
          </div>
        )}
      </div>
    </motion.div>
  );
}
