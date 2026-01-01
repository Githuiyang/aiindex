import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Clock, User, BarChart3, Play, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface CrawlTask {
  id: string;
  target_accounts: string[];
  like_threshold: number;
  retweet_threshold: number;
  frequency: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

interface TweetStats {
  total: number;
  withMedia: number;
  avgLikes: number;
  topTweet?: {
    content: string;
    like_count: number;
  };
}

export default function CrawlHistory() {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  // 获取抓取历史
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['crawl-history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crawl_tasks')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CrawlTask[];
    },
    enabled: !!user?.id
  });

  // 获取任务统计
  const { data: taskStats } = useQuery({
    queryKey: ['task-stats', selectedTask],
    queryFn: async () => {
      if (!selectedTask) return null;
      
      // 获取推文统计
      const { data: tweets, error } = await supabase
        .from('tweet_results')
        .select('content, like_count, media_urls')
        .eq('task_id', selectedTask);

      if (error) throw error;

      const stats: TweetStats = {
        total: tweets.length,
        withMedia: tweets.filter(t => t.media_urls && t.media_urls.length > 0).length,
        avgLikes: tweets.length > 0 ? Math.round(tweets.reduce((sum, t) => sum + t.like_count, 0) / tweets.length) : 0,
        topTweet: tweets.length > 0 ? tweets.reduce((prev, current) => 
          prev.like_count > current.like_count ? prev : current
        ) : undefined
      };

      return stats;
    },
    enabled: !!selectedTask
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'running': return '运行中';
      case 'failed': return '失败';
      default: return '待处理';
    }
  };

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-blue-500" />
            <h2 className="text-2xl font-bold mb-2">需要登录</h2>
            <p className="text-gray-600 mb-6">请登录后查看抓取历史</p>
            <Button onClick={() => window.location.href = '/login'}>
              立即登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <Alert variant="destructive">
          <AlertDescription>加载失败：{error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">抓取历史</h1>
        <p className="text-gray-600">
          查看您的Twitter抓取任务历史和结果统计
        </p>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">暂无抓取历史</h3>
            <p className="text-gray-600 mb-6">您还没有创建任何抓取任务</p>
            <Button onClick={() => window.location.href = '/twitter-crawler'}>
              创建第一个任务
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* 统计概览 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">总任务数</p>
                    <p className="text-2xl font-bold">{tasks.length}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">已完成</p>
                    <p className="text-2xl font-bold text-green-600">
                      {tasks.filter(t => t.status === 'completed').length}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">运行中</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {tasks.filter(t => t.status === 'running').length}
                    </p>
                  </div>
                  <Play className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">失败</p>
                    <p className="text-2xl font-bold text-red-600">
                      {tasks.filter(t => t.status === 'failed').length}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 任务列表 */}
          <div className="space-y-4">
            {tasks.map((task) => (
              <Card 
                key={task.id} 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedTask === task.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedTask(selectedTask === task.id ? null : task.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <User className="w-5 h-5 mr-2 text-gray-500" />
                      抓取任务
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(task.status)}>
                        {getStatusText(task.status)}
                      </Badge>
                      <Eye className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">目标账号:</span>
                      <span className="font-mono">{task.target_accounts?.slice(0, 3).join(', ')}{task.target_accounts?.length > 3 ? '...' : ''}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">收藏阈值:</span>
                      <span>{task.like_threshold}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">转推阈值:</span>
                      <span>{task.retweet_threshold}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">频率:</span>
                      <span>{task.frequency}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">创建时间:</span>
                      <span>{format(new Date(task.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}</span>
                    </div>
                  </div>
                  
                  {/* 详细统计 */}
                  {selectedTask === task.id && taskStats && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="font-semibold mb-3">抓取统计</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{taskStats.total}</p>
                          <p className="text-sm text-gray-600">总推文</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{taskStats.withMedia}</p>
                          <p className="text-sm text-gray-600">含媒体</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">{taskStats.avgLikes}</p>
                          <p className="text-sm text-gray-600">平均收藏</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-orange-600">
                            {taskStats.topTweet?.like_count || 0}
                          </p>
                          <p className="text-sm text-gray-600">最高收藏</p>
                        </div>
                      </div>
                      
                      {taskStats.topTweet && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-semibold mb-1">最受欢迎推文:</p>
                          <p className="text-sm text-gray-700 line-clamp-2">{taskStats.topTweet.content}</p>
                        </div>
                      )}
                      
                      <div className="mt-4 flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => window.location.href = `/crawl-results/${task.id}`}
                        >
                          查看结果
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = '/twitter-crawler'}
                        >
                          重新抓取
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}