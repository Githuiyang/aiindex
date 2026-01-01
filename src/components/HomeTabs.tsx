import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Heart, Clock, User, Pencil } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/useAuthStore';
import { PracticeDetailModal } from '@/components/modals/PracticeDetailModal';

const HomeTabs = () => {
  const [activeTab, setActiveTab] = useState<'best-practices' | 'image-stream' | 'latest-crawls' | 'x-crawler'>('best-practices');
  const { user } = useAuth();
  const { isAdmin } = useAuthStore();
  const [selectedPractice, setSelectedPractice] = useState<{ id: string; title: string; subtitle: string; description: string; url: string; tags: string[]; source_logo_url?: string } | null>(null);

  // 获取优秀实践内容
  const { data: bestPractices = [], isLoading: loadingPractices, refetch: refetchPractices } = useQuery({
    queryKey: ['best-practices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practice_links')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    }
  });

  // 获取图片流内容
  const { data: imageStream = [], isLoading: loadingImages } = useQuery({
    queryKey: ['image-stream'],
    queryFn: async () => {
      // 从归档内容中获取图片类型的内容
      const { data: archivedImages, error } = await supabase
        .from('archived_content')
        .select(`
          *,
          tweet_results!inner(*)
        `)
        .eq('archive_type', 'image-stream')
        .order('archived_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return archivedImages || [];
    }
  });

  // 获取最新抓取内容
  const { data: latestCrawls = [], isLoading: loadingCrawls } = useQuery({
    queryKey: ['latest-crawls'],
    queryFn: async () => {
      const { data: crawlResults, error } = await supabase
        .from('tweet_results')
        .select('*')
        .order('crawled_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return crawlResults || [];
    }
  });

  // 获取X抓取（直接从后端API读取，过滤点赞≥50）
  const { data: xCrawler = [], isLoading: loadingXCrawler } = useQuery({
    queryKey: ['x-crawler', user?.id],
    queryFn: async () => {
      const storedBearer = localStorage.getItem('twitter_bearer_token') || ''
      const sourceParam = storedBearer ? 'real' : ''
      const base = '/api/twitter/following-tweets?limit=100' + (sourceParam ? `&source=${sourceParam}` : '')
      const headers = {
        ...(user?.id ? { 'x-user-id': user.id } : {}),
        ...(storedBearer ? { 'x-twitter-bearer-token': storedBearer } : {}),
      } as Record<string, string> | undefined
      const resp = await fetch(base, { headers })
      const json = await resp.json()
      const tweets: Array<{ 
        id: string; 
        author_id: string;
        author_name: string;
        author_username: string; 
        author_profile_image_url?: string;
        tweet_content: string; 
        like_count: number; 
        retweet_count: number; 
        tweet_created_at: string 
      }> = Array.isArray(json?.tweets) ? json.tweets : []
      return tweets.filter((t) => Number(t?.like_count || 0) >= 50)
    },
  })

  const tabs = [
    {
      id: 'best-practices',
      label: '优秀实践',
      icon: '🎯',
      count: bestPractices.length
    },
    {
      id: 'image-stream',
      label: '图片流',
      icon: '🖼️',
      count: imageStream.length
    },
    {
      id: 'latest-crawls',
      label: '最新抓取',
      icon: '🕷️',
      count: latestCrawls.length
    }
    ,
    {
      id: 'x-crawler',
      label: 'X抓取',
      icon: '𝕏',
      count: xCrawler.length
    }
  ];

  const renderBestPractices = () => {
    if (loadingPractices) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bestPractices.map((item) => (
          <Card 
            key={item.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer relative group"
            onClick={() => setSelectedPractice(item)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
                {item.source_logo_url && (
                  <img 
                    src={item.source_logo_url} 
                    alt="" 
                    className="w-6 h-6 rounded"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {item.subtitle || item.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {item.tags?.slice(0, 3).map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPractice(item);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(item.url, '_blank');
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderImageStream = () => {
    if (loadingImages) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {imageStream.map((item) => {
          const tweet = item.tweet_results;
          const imageUrls = tweet.media_urls || [];
          
          return (
            <div key={item.id} className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              {imageUrls.length > 0 ? (
                <img 
                  src={imageUrls[0]} 
                  alt={tweet.content?.slice(0, 100)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                  <span className="text-gray-400 text-sm text-center px-2">
                    {tweet.content?.slice(0, 50)}...
                  </span>
                </div>
              )}
              
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-end">
                <div className="w-full p-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>@{tweet.author_username}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="w-3 h-3" />
                      <span>{tweet.like_count}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLatestCrawls = () => {
    if (loadingCrawls) {
      return (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {latestCrawls.map((tweet) => (
          <Card key={tweet.id}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold">
                  @{tweet.author_username?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">@{tweet.author_username}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(tweet.tweet_created_at).toLocaleDateString()}</span>
                      <a 
                        href={`https://x.com/${tweet.author_username}/status/${tweet.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-3 line-clamp-3">{tweet.content}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Heart className="w-4 h-4" />
                      <span>{tweet.like_count} 收藏</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>↻ {tweet.retweet_count} 转发</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>💬 {tweet.reply_count || 0} 回复</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderXCrawler = () => {
    if (loadingXCrawler) {
      return (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {xCrawler.map((tweet: { 
          id: string; 
          author_id: string;
          author_name: string;
          author_username: string; 
          author_profile_image_url?: string;
          tweet_content: string; 
          like_count: number; 
          retweet_count: number; 
          tweet_created_at: string 
        }) => (
          <div key={tweet.id} className="p-4 rounded-lg bg-surface-800 relative group">
            <div className="flex items-start justify-between text-xs text-surface-400 mb-2">
              <div className="flex items-center gap-2">
                {tweet.author_profile_image_url ? (
                  <img src={tweet.author_profile_image_url} alt={tweet.author_name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center">
                    <User className="w-4 h-4 text-surface-400" />
                  </div>
                )}
                <div>
                  <div className="font-bold text-surface-100">{tweet.author_name}</div>
                  <div className="text-surface-500">@{tweet.author_username}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                <span>{new Date(tweet.tweet_created_at).toLocaleDateString()}</span>
                <a 
                  href={`https://x.com/${tweet.author_username}/status/${tweet.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-surface-400 hover:text-surface-200 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <div className="text-sm text-surface-200 line-clamp-3 mb-3 ml-10">{tweet.tweet_content}</div>
            <div className="flex items-center gap-4 text-xs text-surface-400 ml-10">
              <div className="flex items-center gap-1"><Heart className="w-3 h-3" /><span>{tweet.like_count}</span></div>
              <div>↻ {tweet.retweet_count}</div>
            </div>
          </div>
        ))}
        {xCrawler.length === 0 && <div className="text-sm text-gray-500">暂无符合条件的数据（收藏≥50）。</div>}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Tab 导航 */}
      <div className="border-b border-gray-300 mb-4">
        <nav className="flex space-x-6 text-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'best-practices' | 'image-stream' | 'latest-crawls')}
              className={`
                py-3 px-1 border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-400'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 内容 */}
      <div className="min-h-[480px] animate-scaleIn">
        {activeTab === 'best-practices' && renderBestPractices()}
        {activeTab === 'image-stream' && renderImageStream()}
        {activeTab === 'latest-crawls' && renderLatestCrawls()}
        {activeTab === 'x-crawler' && renderXCrawler()}
      </div>

      <PracticeDetailModal 
        isOpen={!!selectedPractice}
        onClose={() => setSelectedPractice(null)}
        item={selectedPractice}
        onUpdate={refetchPractices}
      />
    </div>
  );
};

export default HomeTabs;
