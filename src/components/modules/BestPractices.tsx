import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import ArticleView from '../views/ArticleView';
import { Loader2, Plus, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';

interface Practice {
  id: number;
  title: string;
  subtitle?: string;
  description: string;
  url: string;
  logo_url?: string;
  created_at: string;
}

export default function BestPractices() {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [selectedPractice, setSelectedPractice] = useState<Practice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  
  // Form States
  const [manualTitle, setManualTitle] = useState('');
  const [manualSubtitle, setManualSubtitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  
  const handleManualSubmit = async () => {
    if (!manualTitle.trim() || !manualContent.trim()) {
        toast.error('标题和内容不能为空');
        return;
    }
    
    setIsManualModalOpen(false);
    
    const newPractice = {
        title: manualTitle,
        subtitle: manualSubtitle,
        description: manualContent,
        url: '', 
        tags: ['手动录入'],
        logo_url: ''
    };

    try {
       const saveRes = await fetch('/api/content/practices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPractice)
       });

       if (saveRes.ok) {
          const saved = await saveRes.json();
          setPractices(prev => [saved, ...prev]);
          // Reset form
          setManualTitle('');
          setManualSubtitle('');
          setManualContent('');
          toast.success('保存成功');
       } else {
          toast.error('保存失败');
       }
    } catch (e) {
       toast.error('保存出错');
    }
  };
  
  const handleAiSuggest = async () => {
     if (!manualContent.trim()) {
         toast.error('请先输入内容');
         return;
     }
     setIsAnalyzing(true);
     try {
        const analyzeRes = await fetch('/api/scrape/text', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
            text: manualContent,
            userTitle: manualTitle
         })
       });
       
       if (analyzeRes.ok) {
          const data = await analyzeRes.json();
          if (data.title) setManualTitle(data.title);
          if (data.subtitle) setManualSubtitle(data.subtitle);
          toast.success('AI 已生成建议');
       } else {
          toast.error('AI 分析失败');
       }
     } catch (e) {
        toast.error('AI 分析出错');
     } finally {
        setIsAnalyzing(false);
     }
  };

  useEffect(() => {
    fetch('/api/content/practices')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPractices(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = async (newTitle: string, newSubtitle: string, newContent: string) => {
    if (!selectedPractice) return;
    
    try {
      const res = await fetch(`/api/content/practices/${selectedPractice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          subtitle: newSubtitle,
          description: newContent
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setPractices(prev => prev.map(p => p.id === updated.id ? updated : p));
        setSelectedPractice(updated);
      } else {
        toast.error('更新失败');
      }
    } catch (e) {
      toast.error('更新出错');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/content/practices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPractices(prev => prev.filter(p => p.id !== id));
        setSelectedPractice(null);
        toast.success('删除成功');
      } else {
        toast.error('删除失败');
      }
    } catch (e) {
      toast.error('删除出错');
    }
  };

  if (selectedPractice) {
    return (
      <ArticleView 
        title={selectedPractice.title}
        subtitle={selectedPractice.subtitle}
        content={selectedPractice.description}
        date={new Date(selectedPractice.created_at).toLocaleDateString()}
        url={selectedPractice.url}
        onBack={() => setSelectedPractice(null)}
        onUpdate={handleUpdate}
        onDelete={() => handleDelete(selectedPractice.id)}
      />
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto py-8 border-4 border-red-500"
    >
      <div className="bg-red-500 text-white p-4 mb-4 text-center text-2xl font-bold">
        DEBUG MODE: NEW VERSION LOADED
      </div>
      <div className="mb-12 flex justify-end">
        <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
          <DialogTrigger asChild>
            <button 
              className="px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              新建实践案例
            </button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新建实践案例</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">标题</label>
                <Input 
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="请输入标题..."
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">摘要 (Subtitle)</label>
                <Textarea 
                  value={manualSubtitle}
                  onChange={(e) => setManualSubtitle(e.target.value)}
                  placeholder="简短的摘要..."
                  className="bg-zinc-900 border-zinc-800 text-white min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">完整内容</label>
                <div className="relative">
                    <Textarea 
                      value={manualContent}
                      onChange={(e) => setManualContent(e.target.value)}
                      placeholder="在此处粘贴完整文章内容..."
                      className="bg-zinc-900 border-zinc-800 text-white min-h-[300px] font-mono text-sm"
                    />
                    <Button
                        onClick={handleAiSuggest}
                        disabled={isAnalyzing || !manualContent.trim()}
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-4 right-4 bg-indigo-600 hover:bg-indigo-500 text-white border-none"
                    >
                        {isAnalyzing ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
                        AI 生成建议 (标题 & 摘要)
                    </Button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <Button 
                  onClick={() => setIsManualModalOpen(false)}
                  variant="outline"
                  className="bg-transparent border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
                >
                  取消
                </Button>
                <Button 
                  onClick={handleManualSubmit}
                  disabled={isAnalyzing || !manualTitle.trim() || !manualContent.trim()}
                  className="bg-white text-black hover:bg-zinc-200"
                >
                  <ArrowRight className="mr-2" size={16} />
                  保存
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-zinc-500" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {practices.map((item) => (
            <div 
              key={item.id}
              onClick={() => setSelectedPractice(item)}
              className="group p-6 border border-zinc-900 rounded-lg hover:border-zinc-700 hover:bg-zinc-900/50 transition-all cursor-pointer bg-black flex flex-col h-full"
            >
              {item.logo_url ? (
                 <img src={item.logo_url} alt="logo" className="w-10 h-10 rounded-full mb-4 object-cover" />
              ) : (
                 <div className="w-10 h-10 bg-zinc-800 rounded mb-4 group-hover:scale-110 transition-transform"></div>
              )}
              
              <h3 className="text-xl font-bold mb-2 text-zinc-100 group-hover:text-white transition-colors line-clamp-2">
                {item.title}
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed line-clamp-3">
                {item.description}
              </p>
              <div className="mt-auto pt-4 text-xs text-zinc-600">
                {new Date(item.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
          
          {practices.length === 0 && (
             <div className="col-span-full text-center py-12 text-zinc-600">
               暂无内容，请从 Twitter Inbox 保存或添加新内容。
             </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
