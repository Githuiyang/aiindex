import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Twitter, Settings, Play } from 'lucide-react';

interface CrawlConfig {
  targetAccounts: string[];
  likeThreshold: number;
  retweetThreshold: number;
  frequency: 'hourly' | 'daily' | 'weekly';
  maxResults: number;
}

export default function TwitterCrawler() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState<CrawlConfig>({
    targetAccounts: [],
    likeThreshold: 50,
    retweetThreshold: 50,
    frequency: 'daily',
    maxResults: 100
  });
  const [accountsInput, setAccountsInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 创建抓取任务
  const createCrawlTask = useMutation({
    mutationFn: async (config: CrawlConfig) => {
      const { data, error } = await supabase
        .from('crawl_tasks')
        .insert({
          user_id: user?.id,
          target_accounts: config.targetAccounts,
          like_threshold: config.likeThreshold,
          retweet_threshold: config.retweetThreshold,
          frequency: config.frequency,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // 跳转到结果预览页面
      navigate(`/crawl-results/${data.id}`);
    },
    onError: (error) => {
      setError(error.message);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 解析账号列表
    const accounts = accountsInput
      .split('\n')
      .map(acc => acc.trim().replace('@', ''))
      .filter(acc => acc.length > 0);

    if (accounts.length === 0) {
      setError('请至少输入一个Twitter账号');
      return;
    }

    const newConfig = {
      ...config,
      targetAccounts: accounts
    };

    setConfig(newConfig);
    createCrawlTask.mutate(newConfig);
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="text-center py-12">
            <Twitter className="w-16 h-16 mx-auto mb-4 text-blue-500" />
            <h2 className="text-2xl font-bold mb-2">需要登录</h2>
            <p className="text-gray-600 mb-6">请登录后使用Twitter抓取功能</p>
            <Button onClick={() => navigate('/login')}>
              立即登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Twitter 内容抓取</h1>
        <p className="text-gray-600">
          基于关注列表智能筛选高质量内容，支持收藏数和转发数阈值筛选
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Twitter className="w-5 h-5 mr-2" />
              目标账号配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="accounts">Twitter 账号列表</Label>
              <Textarea
                id="accounts"
                placeholder="输入Twitter账号，每行一个&#10;例如：&#10;elonmusk&#10;naval&#10;paulg"
                value={accountsInput}
                onChange={(e) => setAccountsInput(e.target.value)}
                rows={5}
                className="font-mono"
              />
              <p className="text-sm text-gray-500 mt-1">
                支持 @username 或 username 格式，不需要包含 @ 符号
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              抓取设置
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="likeThreshold">收藏数阈值</Label>
              <Input
                id="likeThreshold"
                type="number"
                min="1"
                max="1000"
                value={config.likeThreshold}
                onChange={(e) => setConfig({...config, likeThreshold: parseInt(e.target.value) || 50})}
              />
              <p className="text-sm text-gray-500 mt-1">
                只抓取收藏数超过此值的推文（默认：50）
              </p>
            </div>

            <div>
              <Label htmlFor="retweetThreshold">转推原帖收藏数阈值</Label>
              <Input
                id="retweetThreshold"
                type="number"
                min="1"
                max="1000"
                value={config.retweetThreshold}
                onChange={(e) => setConfig({...config, retweetThreshold: parseInt(e.target.value) || 50})}
              />
              <p className="text-sm text-gray-500 mt-1">
                转推内容原帖收藏数阈值（默认：50）
              </p>
            </div>

            <div>
              <Label htmlFor="frequency">抓取频率</Label>
              <Select
                value={config.frequency}
                onValueChange={(value: 'hourly' | 'daily' | 'weekly') => setConfig({...config, frequency: value})}
              >
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">每小时</SelectItem>
                  <SelectItem value="daily">每天</SelectItem>
                  <SelectItem value="weekly">每周</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="maxResults">最大结果数</Label>
              <Input
                id="maxResults"
                type="number"
                min="10"
                max="500"
                value={config.maxResults}
                onChange={(e) => setConfig({...config, maxResults: parseInt(e.target.value) || 100})}
              />
              <p className="text-sm text-gray-500 mt-1">
                单次抓取最大推文数量（默认：100）
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/crawl-history')}
          >
            查看历史
          </Button>
          <Button
            type="submit"
            disabled={createCrawlTask.isPending}
          >
            {createCrawlTask.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                创建任务中...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                开始抓取
              </>
            )}
          </Button>
        </div>
      </form>

      {/* 功能说明 */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>功能说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">抓取逻辑</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>获取目标账号的关注列表</li>
                <li>筛选收藏数超过阈值的推文</li>
                <li>包含转推内容中原帖收藏数超过阈值的内容</li>
                <li>支持图片、视频等多媒体内容识别</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">使用限制</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>免费用户：每天最多抓取 5 个账号</li>
                <li>高级用户：每天最多抓取 20 个账号</li>
                <li>单次抓取最多处理 500 条推文</li>
                <li>抓取结果可归档到优秀实践或图片流</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}