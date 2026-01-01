import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Practices from "./pages/Practices";
import Gallery from "./pages/Gallery";
import Blog from "./pages/Blog";
import TwitterCrawler from "./pages/TwitterCrawler";
import CrawlResults from "./pages/CrawlResults";
import CrawlHistory from "./pages/CrawlHistory";
import { useAuth } from "./hooks/useAuth";
import Editor from "./pages/Editor";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  const { loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/practices" element={<Practices />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/twitter-crawler" element={<TwitterCrawler />} />
          <Route path="/crawl-results/:taskId" element={<CrawlResults />} />
          <Route path="/crawl-history" element={<CrawlHistory />} />
          <Route path="/editor" element={<Editor />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;