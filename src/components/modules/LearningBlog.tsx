import { motion } from 'framer-motion';
import { useState } from 'react';
import ArticleView from '../views/ArticleView';

const BLOG_POSTS = {
  1: {
    title: 'AI 界面的极简主义',
    content: `
# 减法的哲学

在设计 AI 工具时，我们常常会忍不住暴露每一个参数、每一个开关、以及所有可能的配置项。但 AI 的真正力量，恰恰在于它能把复杂性抽象掉。

## 为什么选择黑白？

去掉颜色，会迫使我们回到更基本的设计要素：
1. **排版**：层级只依赖字号与字重。
2. **留白**：分组与分隔完全靠空间关系。
3. **对比**：注意力由明暗而不是色相引导。

这种克制也呼应了模型本身的“黑箱”属性：神秘、强大、且足够基础。
    `,
    date: '2024.05.25'
  },
  2: {
    title: '把提示词当作代码',
    content: '# 提示词工程\n\n把自然语言当作编程接口：可复用、可版本化、可评估……',
    date: '2024.05.24'
  },
  3: {
    title: '生成式 UI 的未来',
    content: '# 生成式 UI\n\n当界面能根据用户意图自我生成时，交互范式会如何变化？',
    date: '2024.05.23'
  }
};

export default function LearningBlog() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (selectedId !== null) {
    const post = BLOG_POSTS[selectedId as keyof typeof BLOG_POSTS];
    return (
      <ArticleView 
        title={post.title}
        content={post.content}
        date={post.date}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto py-8"
    >
      <div className="space-y-12">
        {[1, 2, 3].map((item) => (
          <article 
            key={item} 
            onClick={() => setSelectedId(item)}
            className="group cursor-pointer border-l-2 border-zinc-900 pl-6 hover:border-white transition-colors py-2"
          >
            <div className="text-xs font-mono text-zinc-500 mb-3">2024.05.{20 + item}</div>
            <h2 className="text-2xl font-bold mb-3 text-zinc-300 group-hover:text-white transition-colors">
              {BLOG_POSTS[item as keyof typeof BLOG_POSTS]?.title || `AI 设计随想 #${item}`}
            </h2>
            <p className="text-zinc-500 leading-relaxed max-w-xl group-hover:text-zinc-400 transition-colors">
              在做 AIIndex 的过程中，我意识到“去掉颜色”会迫使我们在排版与留白上更自律……
            </p>
          </article>
        ))}
      </div>
    </motion.div>
  );
}
