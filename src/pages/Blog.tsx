import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useRole } from "../hooks/useRole";
import { Plus, Pencil } from "lucide-react";

type Post = {
  id: string;
  title: string;
  summary: string;
  link: string;
};

const mock: Post[] = [
  { id: "b1", title: "从零搭建 AIIndex", summary: "架构、权限与动效设计的权衡", link: "https://example.com/post/aiindex" },
  { id: "b2", title: "提示词工程实践", summary: "如何写出可复用与稳定的提示词", link: "https://example.com/post/prompts" },
  { id: "b3", title: "RLS 权限配置笔记", summary: "Supabase 行级安全策略的常用模式", link: "https://example.com/post/rls" },
];

export default function Blog() {
  const { user } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();

  const openEditor = (initial?: { link?: string; desc?: string; title?: string }) => {
    navigate("/editor", { state: { type: "blog", action: "create", initial } });
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">学习博客</h1>
        {user && role === "admin" && (
          <button className="btn btn-gradient" onClick={() => openEditor()}>
            <Plus size={16} />
            <span className="ml-2">新建</span>
          </button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {mock.map((p) => (
          <div key={p.id} className="card animate-fadeIn">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold">{p.title}</h3>
              {user && role === "admin" && (
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded bg-surface-800 text-surface-200 hover:bg-surface-700"
                  onClick={() => openEditor({ link: p.link, desc: p.summary, title: p.title })}
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
            <p className="text-sm text-surface-400">{p.summary}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
