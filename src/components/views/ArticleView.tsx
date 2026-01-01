import { motion } from 'framer-motion';
import { ArrowLeft, Edit2, Check, X, ExternalLink, Trash2, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuthStore } from '../../store/useAuthStore';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import 'github-markdown-css/github-markdown-dark.css'; // Ensure you have this or similar styles

interface ArticleViewProps {
  title: string;
  subtitle?: string;
  content: string;
  date?: string;
  url?: string;
  onBack: () => void;
  onUpdate?: (newTitle: string, newSubtitle: string, newContent: string) => void;
  onDelete?: () => void;
}

export default function ArticleView({ title, subtitle = '', content, date, url, onBack, onUpdate, onDelete }: ArticleViewProps) {
  const { isAdmin } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [editedSubtitle, setEditedSubtitle] = useState(subtitle || '');
  const [editedContent, setEditedContent] = useState(content);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedTitle, editedSubtitle, editedContent);
      toast.success('文章已在本地更新');
    }
    setIsEditing(false);
  };
  
  const handleAiSuggest = async () => {
     if (!editedContent.trim()) {
         toast.error('请先输入内容');
         return;
     }
     setIsAnalyzing(true);
     try {
        const analyzeRes = await fetch('/api/scrape/text', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
            text: editedContent,
            userTitle: editedTitle
         })
       });
       
       if (analyzeRes.ok) {
          const data = await analyzeRes.json();
          if (data.title) setEditedTitle(data.title);
          if (data.subtitle) setEditedSubtitle(data.subtitle);
          toast.success('AI 已重新生成建议');
       } else {
          toast.error('AI 分析失败');
       }
     } catch (e) {
        toast.error('AI 分析出错');
     } finally {
        setIsAnalyzing(false);
     }
  };
  
  const handleDelete = () => {
     if (confirm('确定要删除这篇文章吗？此操作无法撤销。')) {
        if (onDelete) onDelete();
     }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="max-w-3xl mx-auto py-8 px-4"
    >
      <div className="flex items-center justify-between mb-12">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          返回列表
        </button>

        <div className="flex items-center gap-2">
            {url && (
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
              >
                <ExternalLink size={14} />
                查看原文
              </a>
            )}

            {isAdmin && (
              isEditing ? (
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white border-none"
                  >
                    <Check size={14} />
                    保存
                  </Button>
                  <Button 
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-none"
                  >
                    <X size={14} />
                    取消
                  </Button>
                </div>
              ) : (
                <>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                    >
                      <Edit2 size={14} />
                      编辑
                    </button>
                    <button 
                      onClick={handleDelete}
                      className="flex items-center gap-2 px-4 py-2 bg-red-900/20 border border-red-900/50 rounded-lg text-sm text-red-500 hover:text-red-400 hover:border-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                      删除
                    </button>
                </>
              )
            )}
        </div>
      </div>

      <header className="mb-16">
        {date && <div className="text-zinc-500 text-sm mb-4 font-mono">{date}</div>}
        {isEditing ? (
          <div className="space-y-4 mb-8">
            <Input 
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="text-4xl md:text-5xl font-bold bg-zinc-900 border-zinc-800 text-white h-auto py-2"
              placeholder="标题"
            />
            <Textarea 
              value={editedSubtitle}
              onChange={(e) => setEditedSubtitle(e.target.value)}
              className="text-xl text-zinc-400 bg-zinc-900 border-zinc-800 min-h-[80px]"
              placeholder="摘要"
            />
          </div>
        ) : (
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
              {editedTitle}
            </h1>
            {editedSubtitle && (
              <p className="text-xl text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {editedSubtitle}
              </p>
            )}
          </div>
        )}
        <div className="h-px w-24 bg-zinc-800" />
      </header>

      <article className="prose prose-invert prose-lg max-w-none text-zinc-300 leading-relaxed break-words">
        {isEditing ? (
          <div className="relative">
            <Textarea 
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white min-h-[500px] font-mono text-base pb-16 whitespace-pre-wrap"
              placeholder="正文内容..."
            />
            <Button
                onClick={handleAiSuggest}
                disabled={isAnalyzing || !editedContent.trim()}
                variant="secondary"
                size="sm"
                className="absolute bottom-4 right-4 bg-indigo-600 hover:bg-indigo-500 text-white border-none"
            >
                {isAnalyzing ? <Loader2 className="animate-spin mr-2" size={14} /> : <Sparkles className="mr-2" size={14} />}
                AI 重新生成 (标题 & 摘要)
            </Button>
          </div>
        ) : (
          <ReactMarkdown 
            components={{
              // Customize components if needed to support specific styling
              p: ({node, ...props}) => <p className="mb-4 whitespace-pre-wrap" {...props} />,
              li: ({node, ...props}) => <li className="mb-2" {...props} />
            }}
          >
            {editedContent}
          </ReactMarkdown>
        )}
      </article>
    </motion.div>
  );
}
