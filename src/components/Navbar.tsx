import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, LogOut, Twitter, BarChart3 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();

  const navItems = [
    { label: "优秀实践", to: "/practices" },
    { label: "图片流", to: "/gallery" },
    { label: "学习博客", to: "/blog" },
  ];

  const userNavItems = [
    { label: "Twitter抓取", to: "/twitter-crawler", icon: <Twitter size={16} /> },
    { label: "抓取历史", to: "/crawl-history", icon: <BarChart3 size={16} /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-surface-950/80 backdrop-blur border-b border-surface-800">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link to="/" className="text-xl font-bold text-brand-400">AIIndex</Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} className="text-sm text-surface-300 hover:text-brand-400 transition-colors">
              {item.label}
            </Link>
          ))}
          
          {user && (
            <div className="flex items-center gap-4 ml-4 border-l border-surface-800 pl-4">
              {userNavItems.map((item) => (
                <Link key={item.to} to={item.to} className="text-sm text-surface-300 hover:text-brand-400 transition-colors flex items-center gap-1">
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-2 ml-4">
            {user ? (
              <>
                <span className="text-sm text-surface-300">{user.email}</span>
                <button onClick={signOut} className="btn btn-secondary">
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary">登录</Link>
                <Link to="/register" className="btn btn-primary">注册</Link>
              </>
            )}
          </div>
        </nav>

        {/* Mobile Menu Button */}
        <button className="md:hidden text-surface-300" onClick={() => setOpen((o) => !o)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {open && (
        <div className="md:hidden px-4 pb-4 animate-fadeIn">
          <nav className="flex flex-col gap-3">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to} onClick={() => setOpen(false)} className="text-sm text-surface-300 hover:text-brand-400">
                {item.label}
              </Link>
            ))}
            
            {user && (
              <div className="pt-3 border-t border-surface-800">
                <p className="text-xs text-surface-500 mb-2">抓取工具</p>
                {userNavItems.map((item) => (
                  <Link key={item.to} to={item.to} onClick={() => setOpen(false)} className="text-sm text-surface-300 hover:text-brand-400 flex items-center gap-2 py-1">
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
            
            <div className="flex gap-2 mt-2 pt-3 border-t border-surface-800">
              {user ? (
                <>
                  <span className="text-sm text-surface-300 flex-1">{user.email}</span>
                  <button onClick={signOut} className="btn btn-secondary">退出</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="btn btn-secondary w-full">登录</Link>
                  <Link to="/register" onClick={() => setOpen(false)} className="btn btn-primary w-full">注册</Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}