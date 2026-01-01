import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Edit2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import ReactMarkdown from 'react-markdown';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: {
    url: string;
    prompt: string;
    params?: string;
  } | null;
}

export default function ImageModal({ isOpen, onClose, image }: ImageModalProps) {
  const { isAdmin } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditingPrompt] = useState('');

  useEffect(() => {
    if (image) {
      setEditingPrompt(image.prompt);
    }
  }, [image]);

  const handleCopy = () => {
    if (image?.prompt) {
      navigator.clipboard.writeText(image.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveEdit = () => {
    // In a real app, this would update the backend
    setIsEditing(false);
  };

  return (
    <AnimatePresence>
      {isOpen && image && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[80]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 md:inset-10 z-[90] flex flex-col md:flex-row gap-6 md:gap-10 pointer-events-none"
          >
            {/* Image Container */}
            <div className="flex-1 flex items-center justify-center pointer-events-auto min-h-0">
              <img 
                src={image.url} 
                alt="大图" 
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            </div>

            {/* Info Container */}
            <div className="w-full md:w-96 bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex flex-col pointer-events-auto h-fit max-h-full overflow-y-auto">
              <div className="flex justify-between items-start mb-6 shrink-0">
                <h3 className="text-lg font-bold text-white">生成详情</h3>
                <button onClick={onClose} className="text-zinc-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">提示词</label>
                    <div className="flex items-center gap-3">
                      {isAdmin && !isEditing && (
                        <button 
                          onClick={() => setIsEditing(true)}
                          className="text-zinc-400 hover:text-white flex items-center gap-1 text-xs transition-colors"
                        >
                          <Edit2 size={14} />
                          编辑
                        </button>
                      )}
                      <button 
                        onClick={handleCopy}
                        className="text-zinc-400 hover:text-white flex items-center gap-1 text-xs transition-colors"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? '已复制' : '复制'}
                      </button>
                    </div>
                  </div>
                  
                  {isEditing ? (
                    <div className="space-y-3">
                      <textarea
                        value={editedPrompt}
                        onChange={(e) => setEditingPrompt(e.target.value)}
                        className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-zinc-500 font-mono resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="flex-1 py-2 bg-white text-black text-xs font-bold rounded hover:bg-zinc-200"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="flex-1 py-2 bg-zinc-800 text-white text-xs font-bold rounded hover:bg-zinc-700"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-zinc-300 text-sm leading-relaxed font-mono bg-zinc-900 p-4 rounded-lg border border-zinc-800 whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto">
                      <ReactMarkdown>{editedPrompt}</ReactMarkdown>
                    </div>
                  )}
                </div>

                {image.params && (
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">参数</label>
                    <div className="text-zinc-400 text-xs font-mono bg-zinc-900 p-3 rounded-lg border border-zinc-800 whitespace-pre-wrap break-words">
                      {image.params}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
