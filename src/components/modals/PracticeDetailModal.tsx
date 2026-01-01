import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Edit2, Check, X } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface PracticeItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  url: string;
  source_logo_url?: string;
  tags?: string[];
}

interface PracticeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PracticeItem | null;
  onUpdate: () => void;
}

export const PracticeDetailModal = ({ isOpen, onClose, item, onUpdate }: PracticeDetailModalProps) => {
  const { isAdmin } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<PracticeItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setFormData(item);
      setIsEditing(false);
    }
  }, [isOpen, item]);

  if (!item || !formData) return null;

  const handleSave = async () => {
    if (!formData) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('practice_links')
        .update({
          title: formData.title,
          subtitle: formData.subtitle,
          description: formData.description,
          url: formData.url,
          source_logo_url: formData.source_logo_url,
        })
        .eq('id', item.id);
        
      if (error) throw error;
      
      toast.success('保存成功');
      setIsEditing(false);
      onClose(); // Close to refresh list (or invalidate query)
      onUpdate();
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-white p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-zinc-800 flex flex-row items-start justify-between">
          <div className="flex-1 mr-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-zinc-400">标题</Label>
                  <Input
                    id="title"
                    value={formData?.title || ''}
                    onChange={(e) => setFormData(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                    className="bg-zinc-900 border-zinc-800 text-white mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="subtitle" className="text-zinc-400">副标题</Label>
                  <Input
                    id="subtitle"
                    value={formData?.subtitle || ''}
                    onChange={(e) => setFormData(prev => prev ? ({ ...prev, subtitle: e.target.value }) : null)}
                    className="bg-zinc-900 border-zinc-800 text-white mt-1"
                  />
                </div>
              </div>
            ) : (
              <>
                <DialogTitle className="text-xl font-bold leading-tight">{formData.title}</DialogTitle>
                {formData.subtitle && <p className="text-zinc-400 mt-1">{formData.subtitle}</p>}
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2 relative z-[100]">
            {isAdmin && !isEditing && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Edit button clicked', { isAdmin, isEditing, formData });
                  setIsEditing(true);
                }}
                className="text-zinc-400 hover:text-white cursor-pointer relative z-[100]"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
            {isEditing && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSave}
                  disabled={loading}
                  className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>标题</Label>
                <Input 
                  value={formData.title} 
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea 
                  value={formData.description || formData.subtitle || ''} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-zinc-900 border-zinc-800 min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label>链接</Label>
                <Input 
                  value={formData.url} 
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
              <div className="space-y-2">
                <Label>来源图标链接</Label>
                <Input 
                  value={formData.source_logo_url || ''} 
                  onChange={(e) => setFormData({ ...formData, source_logo_url: e.target.value })}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <h2 className="text-2xl font-bold">{formData.title}</h2>
                {formData.source_logo_url && (
                  <img src={formData.source_logo_url} alt="来源" className="w-8 h-8 rounded" />
                )}
              </div>
              
              <div className="prose prose-invert max-w-none">
                <p className="text-zinc-300 leading-relaxed">
                  {formData.description || formData.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-zinc-800 hover:bg-zinc-700">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <Button 
                  className="w-full sm:w-auto" 
                  onClick={() => window.open(formData.url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  访问原文
                </Button>
              </div>
            </div>
          )}
        </div>

        {isEditing && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={loading}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? '保存中...' : '保存更改'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
