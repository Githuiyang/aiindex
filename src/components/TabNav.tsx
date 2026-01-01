import { motion } from 'framer-motion';

interface TabNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'practices', label: 'AI 侦察兵' },
  { id: 'images', label: '图片流' },
  { id: 'blog', label: '学习博客' },
  { id: 'inbox', label: 'Twitter 归档' },
];

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <div className="flex justify-center mb-12">
      <div className="flex space-x-8 relative">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative py-2 text-sm tracking-wide transition-colors
              ${activeTab === tab.id ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}
            `}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
