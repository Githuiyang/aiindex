import { motion } from 'framer-motion';
import Masonry from 'react-masonry-css';
import { useState, useEffect } from 'react';
import ImageModal from '../modals/ImageModal';
import { Plus, Loader2, Edit2, Trash2, Upload, Link as LinkIcon } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

const breakpointColumnsObj = {
  default: 3,
  1100: 3,
  700: 2,
  500: 1
};

interface ImageItem {
  id: number;
  title: string;
  image_url: string;
  prompt: string;
  description?: string;
  created_at: string;
}

export default function ImageStream() {
  const { isAdmin } = useAuthStore();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<ImageItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formDescription, setFormDescription] = useState('');

  useEffect(() => {
    fetch('/api/content/images')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
           setImages(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormUrl('');
    setFormPrompt('');
    setFormDescription('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ImageItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setFormTitle(item.title);
    setFormUrl(item.image_url);
    setFormPrompt(item.prompt);
    setFormDescription(item.description || '');
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            toast.error('图片大小不能超过 5MB');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!formUrl) {
        toast.error('请提供图片');
        return;
    }

    setIsSubmitting(true);

    const payload = {
        title: formTitle || '未命名图片',
        image_url: formUrl,
        prompt: formPrompt,
        description: formDescription
    };

    try {
        let res;
        if (editingItem) {
            res = await fetch(`/api/content/images/${editingItem.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch('/api/content/images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (res.ok) {
            const saved = await res.json();
            if (editingItem) {
                setImages(prev => prev.map(img => img.id === saved.id ? saved : img));
                toast.success('更新成功');
            } else {
                setImages(prev => [saved, ...prev]);
                toast.success('创建成功');
            }
            setIsModalOpen(false);
            resetForm();
        } else {
            const errData = await res.json().catch(() => ({}));
            toast.error(errData.error || '保存失败');
        }
    } catch (e) {
        console.error(e);
        toast.error('操作出错');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这张图片吗？')) return;

    try {
        const res = await fetch(`/api/content/images/${id}`, { method: 'DELETE' });
        if (res.ok) {
            setImages(prev => prev.filter(img => img.id !== id));
            toast.success('删除成功');
        } else {
            toast.error('删除失败');
        }
    } catch (e) {
        toast.error('删除出错');
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-7xl mx-auto py-8 relative"
      >
        {isAdmin && (
          <div className="absolute top-0 right-0 z-10">
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                    <Button 
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                    >
                    <Plus size={16} />
                    新建图片
                    </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? '编辑图片' : '新建图片'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">标题</label>
                            <Input 
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                placeholder="图片标题..."
                                className="bg-zinc-900 border-zinc-800 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">图片来源</label>
                            <div className="flex gap-2 mb-2">
                                <div className="flex-1 relative">
                                    <Input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="h-10 w-full bg-zinc-900 border border-zinc-800 rounded-md flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                                        <Upload size={16} className="mr-2" />
                                        点击上传图片
                                    </div>
                                </div>
                                <div className="flex items-center text-zinc-600">或</div>
                                <div className="flex-1">
                                    <Input 
                                        value={formUrl}
                                        onChange={(e) => setFormUrl(e.target.value)}
                                        placeholder="输入图片 URL..."
                                        className="bg-zinc-900 border-zinc-800 text-white"
                                    />
                                </div>
                            </div>
                            {formUrl && (
                                <div className="mt-2 relative aspect-video rounded-lg overflow-hidden border border-zinc-800 bg-black">
                                    <img src={formUrl} alt="Preview" className="w-full h-full object-contain" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">提示词 (Prompt)</label>
                            <Textarea 
                                value={formPrompt}
                                onChange={(e) => setFormPrompt(e.target.value)}
                                placeholder="输入生成该图片的提示词..."
                                className="bg-zinc-900 border-zinc-800 text-white min-h-[100px] font-mono text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">参数/描述</label>
                            <Textarea 
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                placeholder="例如: --ar 16:9 --v 6.0"
                                className="bg-zinc-900 border-zinc-800 text-white min-h-[60px] font-mono text-sm"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                            <Button 
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                variant="outline"
                                disabled={isSubmitting}
                                className="bg-transparent border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
                            >
                                取消
                            </Button>
                            <Button 
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-white text-black hover:bg-zinc-200"
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                保存
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
          </div>
        )}

        {loading ? (
           <div className="flex justify-center py-20">
             <Loader2 className="animate-spin text-zinc-500" size={32} />
           </div>
        ) : (
          <div className={isAdmin ? "mt-12" : ""}>
            <Masonry
              breakpointCols={breakpointColumnsObj}
              className="my-masonry-grid"
              columnClassName="my-masonry-grid_column"
            >
              {images.map((img) => (
                <div key={img.id} className="mb-4 break-inside-avoid">
                  <div 
                    onClick={() => setSelectedImage(img)}
                    className="bg-zinc-900 rounded-lg overflow-hidden relative group cursor-zoom-in border border-zinc-900 hover:border-zinc-700 transition-colors"
                  >
                    <img 
                      src={img.image_url} 
                      alt={img.title}
                      className="w-full h-auto block transition-opacity duration-300 opacity-90 group-hover:opacity-100"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-4">
                      <span className="text-xs tracking-wider uppercase font-bold mb-2">查看提示词</span>
                      
                      {isAdmin && (
                          <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                              <Button 
                                size="sm" 
                                variant="secondary" 
                                className="h-8 w-8 p-0 rounded-full bg-white/20 hover:bg-white/40 text-white border-none"
                                onClick={(e) => handleOpenEdit(img, e)}
                              >
                                  <Edit2 size={14} />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                className="h-8 w-8 p-0 rounded-full bg-red-500/80 hover:bg-red-600 text-white border-none"
                                onClick={(e) => handleDelete(img.id, e)}
                              >
                                  <Trash2 size={14} />
                              </Button>
                          </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </Masonry>
            
            {images.length === 0 && (
               <div className="text-center py-20 text-zinc-600">
                  暂无图片，请从 Twitter Inbox 保存或手动添加。
               </div>
            )}
          </div>
        )}
        
        <style>{`
          .my-masonry-grid {
            display: flex;
            margin-left: -16px; /* gutter size offset */
            width: auto;
          }
          .my-masonry-grid_column {
            padding-left: 16px; /* gutter size */
            background-clip: padding-box;
          }
        `}</style>
      </motion.div>

      <ImageModal 
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        image={selectedImage ? {
           url: selectedImage.image_url,
           prompt: selectedImage.prompt || '暂无提示词',
           params: selectedImage.description || ''
        } : null}
      />
    </>
  );
}
