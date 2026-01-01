import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useRole } from "../hooks/useRole";
import { Plus, Send, Pencil } from "lucide-react";

type MockImage = {
  id: string;
  src: string;
  prompt: string;
  tags: string[];
};

const mock: MockImage[] = [
  {
    id: "g1",
    src: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop",
    prompt: "夜晚未来城市景观，低饱和蓝紫色，柔和光晕",
    tags: ["城市", "蓝色", "紫色"],
  },
  {
    id: "g2",
    src: "https://images.unsplash.com/photo-1526045612212-70caf35c14df?q=80&w=800&auto=format&fit=crop",
    prompt: "抽象渐变波纹，极简科技风，暗色模式",
    tags: ["抽象", "渐变", "科技"],
  },
  {
    id: "g3",
    src: "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?q=80&w=800&auto=format&fit=crop",
    prompt: "人像布光：柔和轮廓光，电影感，低饱和",
    tags: ["人像", "电影感"],
  },
];

export default function Gallery() {
  const { user } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();

  const openEditor = (initial?: { link?: string; desc?: string; title?: string; image?: string }) => {
    navigate("/editor", { state: { type: "gallery", action: role === "admin" ? "create" : "submit", initial } });
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">生图优秀示例</h1>
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

      <div className="grid gap-6 md:grid-cols-3">
        {mock.map((m) => (
          <div key={m.id} className="card animate-fadeIn">
            <img src={m.src} alt="" className="w-full h-48 object-cover rounded-lg mb-3" />
            <p className="text-sm text-surface-300 mb-2">{m.prompt}</p>
            <div className="flex flex-wrap gap-2">
              {m.tags.map((t) => (
                <span key={t} className="text-xs bg-brand-600/20 text-brand-300 px-2 py-1 rounded">{t}</span>
              ))}
            </div>
            {role === "admin" && (
              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded bg-surface-800 text-surface-200 hover:bg-surface-700"
                  onClick={() => openEditor({ image: m.src, desc: m.prompt })}
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
