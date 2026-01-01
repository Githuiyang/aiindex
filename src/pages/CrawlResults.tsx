import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Heart, Clock, Image, Archive, ArrowLeft, ExternalLink } from 'lucide-react';

interface TweetResult {
  id: string;
  tweet_id: string;
  content: string;
  author: string;
  author_username: string;
  like_count: number;
  retweet_count: number;
  reply_count: number;
  media_urls: string[];
  tweet_created_at: string;
  crawled_at: string;
}

interface CrawlTask {
  id: string;
  target_accounts: string[];
  like_threshold: number;
  retweet_threshold: number;
  status: string;
  created_at: string;
}

export default function CrawlResults() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedTweets, setSelectedTweets] = useState<string[]>([]);
  const [archiveType, setArchiveType] = useState<'best-practices' | 'image-stream'>('best-practices');
  const [error, setError] = useState<string | null>(null);

  // 获取抓取任务详情
  const { data: task, isLoading: loadingTask } = useQuery({
    queryKey: ['crawl-task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crawl_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error) throw error;
      return data as CrawlTask;
    },
    enabled: !!taskId
  });

  // 获取抓取结果
  const { data: tweetResults = [], isLoading: loadingResults } = useQuery({
    queryKey: ['crawl-results', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tweet_results')
        .select('*')
        .eq('task_id', taskId)
        .order('like_count', { ascending: false });

      if (error) throw error;
      return data as TweetResult[];
    },
    enabled: !!taskId
  });

  // 归档选中的推文
  const archiveTweets = useMutation({
    mutationFn: async () => {
      if (selectedTweets.length === 0) {
        throw new Error('请选择要归档的推文');
      }

      // 批量归档
      const archiveData = selectedTweets.map(tweetId => ({
        user_id: user?.id,
        tweet_result_id: tweetId,
        archive_type: archiveType,
        categories: []
      }));

      const { error } = await supabase
        .from('archived_content')
        .insert(archiveData);

      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedTweets([]);
      alert('归档成功！');
      // 跳转到对应的内容页面
      navigate(archiveType === 'best-practices' ? '/practices' : '/gallery');
    },
    onError: (error) => {
      setError(error.message);
    }
  });

  const handleTweetSelect = (tweetId: string, checked: boolean) => {
    if (checked) {
      setSelectedTweets(prev => [...prev, tweetId]);
    } else {
      setSelectedTweets(prev => prev.filter(id => id !== tweetId));
    }
  };

  const handleSelectAll = () => {
    if (selectedTweets.length === tweetResults.length) {
      setSelectedTweets([]);
    } else {
      setSelectedTweets(tweetResults.map(tweet => tweet.id));
    }
  };

  if (loadingTask || loadingResults) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <Alert variant="destructive">
          <AlertDescription>未找到抓取任务</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/twitter-crawler')}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回配置
          </Button>
          <div className="text-sm text-gray-500">
            任务状态: <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
              {task.status}
            </Badge>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-2">抓取结果</h1>
        <p className="text-gray-600">
          目标账号: {task.target_accounts?.join(', ')} | 
          收藏阈值: {task.like_threshold} | 
          转推阈值: {task.retweet_threshold}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 操作栏 */}
      {tweetResults.length > 0 && (
        <div className="mb-6 flex items-center justify-between bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-4">
            <Checkbox
              checked={selectedTweets.length === tweetResults.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-gray-600">
              已选择 {selectedTweets.length} 条推文
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Select value={archiveType} onValueChange={(value: 'best-practices' | 'image-stream') => setArchiveType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best-practices">优秀实践</SelectItem>
                <SelectItem value="image-stream">图片流</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              onClick={() => archiveTweets.mutate()}
              disabled={selectedTweets.length === 0 || archiveTweets.isPending}
              className="flex items-center"
            >
              {archiveTweets.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Archive className="w-4 h-4 mr-2" />
              )}
              归档选中
            </Button>
          </div>
        </div>
      )}

      {/* 推文列表 */}
      <div className="space-y-4">
        {tweetResults.map((tweet) => (
          <Card key={tweet.id} className={selectedTweets.includes(tweet.id) ? 'ring-2 ring-blue-500' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                <Checkbox
                  checked={selectedTweets.includes(tweet.id)}
                  onCheckedChange={(checked) => handleTweetSelect(tweet.id, checked as boolean)}
                />
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        @{tweet.author_username?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold">@{tweet.author_username}</h4>
                        <p className="text-sm text-gray-500">{tweet.author}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(tweet.tweet_created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{tweet.content}</p>
                  
                  {/* 媒体内容预览 */}
                  {tweet.media_urls && tweet.media_urls.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <Image className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-500">
                          {tweet.media_urls.length} 张图片
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-w-md">
                        {tweet.media_urls.slice(0, 4).map((url, index) => (
                          <img
                            key={index}
                            src={url}
                            alt={`媒体 ${index + 1}`}
                            className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
                            onClick={() => window.open(url, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
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
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://twitter.com/${tweet.author_username}/status/${tweet.tweet_id}`, '_blank')}
                      className="ml-auto"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tweetResults.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-500 mb-4">
              暂无符合条件的推文
            </div>
            <p className="text-sm text-gray-400">
              请调整抓取参数或稍后再试
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}