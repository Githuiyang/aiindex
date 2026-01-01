import { useState } from 'react';
import TabNav from '../components/TabNav';
import BestPractices from '../components/modules/BestPracticesV2';
import ImageStream from '../components/modules/ImageStream';
import LearningBlog from '../components/modules/LearningBlog';
import TwitterInbox from '../components/modules/TwitterInbox';
import SettingsModal from '../components/modals/SettingsModal';
import { AnimatePresence } from 'framer-motion';
import { Settings } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('practices');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const renderModule = () => {
    switch (activeTab) {
      case 'practices': return <BestPractices key="practices" />;
      case 'images': return <ImageStream key="images" />;
      case 'blog': return <LearningBlog key="blog" />;
      case 'inbox': return <TwitterInbox key="inbox" />;
      default: return <BestPractices />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
      <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-md z-50 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-white">AIIndex</h1>
          
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="pt-32 px-6 pb-20">
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
        
        <AnimatePresence mode="wait">
          {renderModule()}
        </AnimatePresence>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
