import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ArrowUpRight, Tag, Plus, Send, Pencil } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useRole } from "../hooks/useRole";

type Practice = {
  id: string;
  url: string;
  title: string;
  subtitle: string | null;
  source_domain: string | null;
  source_logo_url: string | null;
  tags: string[];
  created_at: string;
};

export default function Practices() {
  const [list, setList] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("practice_links")
      .select("id, url, title, subtitle, source_domain, source_logo_url, tags, created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && data.length) setList(data as Practice[]);
        else {
          setList([
            {
              id: "m1",
              url: "https://openai.com/",
              title: "GPT 助手集成示例",
              subtitle: "如何将助手集成到产品工作流",
              source_domain: "openai.com",
              source_logo_url: "https://openai.com/favicon.ico",
              tags: ["LLM", "助手"],
              created_at: new Date().toISOString(),
            },
            {
              id: "m2",
              url: "https://stability.ai/",
              title: "文生图提示词技巧",
              subtitle: "分层描述与风格控制的最佳实践",
              source_domain: "stability.ai",
              source_logo_url: "https://stability.ai/favicon.ico",
              tags: ["生图", "提示词"],
              created_at: new Date().toISOString(),
            },
            {
              id: "m3",
              url: "https://github.com/",
              title: "RAG 检索增强模式",
              subtitle: "嵌入维度与分块策略的权衡",
              source_domain: "github.com",
              source_logo_url: "https://github.com/favicon.ico",
              tags: ["RAG", "检索"],
              created_at: new Date().toISOString(),
            },
          ]);
        }
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-6 bg-surface-800 rounded mb-3"></div>
              <div className="h-4 bg-surface-800 rounded mb-2"></div>
              <div className="h-4 bg-surface-800 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );

  const openEditor = (initial?: { link?: string; desc?: string; title?: string }) => {
    navigate("/editor", { state: { type: "practice", action: role === "admin" ? "create" : "submit", initial } });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">AI 优秀实践</h1>
        {user && (
          <button
            className={`btn ${role === "admin" ? "btn-gradient" : "btn-secondary"}`}
            onClick={() => openEditor()}
          >
            {role === "admin" ? <Plus size={16} /> : <Send size={16} />}
            <span className="ml-2">{role === "admin" ? "新建" : "投稿"}</span>
          </button>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <a
            key={p.id}
            href={p.url}
            target="_blank"
            rel="noreferrer"
            className="card group block hover:-translate-y-1 transition-transform"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {p.source_logo_url && (
                  <img src={p.source_logo_url} alt="" className="w-6 h-6 rounded" />
                )}
                <span className="text-xs text-surface-400">{p.source_domain}</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-surface-500 group-hover:text-brand-400 transition-colors" />
                {role === "admin" && (
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded bg-surface-800 text-surface-200 hover:bg-surface-700"
                    onClick={(e) => {
                      e.preventDefault();
                      openEditor({ link: p.url, desc: p.subtitle || "", title: p.title });
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            </div>
            <h3 className="text-lg font-semibold text-surface-100 mb-2">{p.title}</h3>
            {p.subtitle && <p className="text-sm text-surface-400 mb-4 line-clamp-2">{p.subtitle}</p>}
            <div className="flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 text-xs bg-brand-600/20 text-brand-300 px-2 py-1 rounded">
                  <Tag size={12} /> {t}
                </span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
