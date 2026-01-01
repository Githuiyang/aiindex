import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { Loader, Plus } from "lucide-react";

export default function PracticeForm() {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [sourceLogo, setSourceLogo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // 自动提取元信息（可选）
  const handleExtract = async () => {
    if (!url) return;
    setFetching(true);
    try {
      const res = await fetch("/api/admin/extract-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.title) setTitle(data.title);
      if (data.subtitle) setSubtitle(data.subtitle);
      if (data.logo) setSourceLogo(data.logo);
    } catch {
      alert("提取失败，请手动填写");
    }
    setFetching(false);
  };

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const handleRemoveTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url) return;
    setLoading(true);
    const { error } = await supabase.from("practice_links").insert({
      url,
      title,
      subtitle,
      source_logo_url: sourceLogo,
      tags,
      status: "published",
      created_by: user?.id,
    });
    if (error) {
      alert("发布失败：" + error.message);
    } else {
      alert("发布成功");
      setUrl(""); setTitle(""); setSubtitle(""); setSourceLogo(""); setTags([]);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">发布 AI 优秀实践</h1>
      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">链接地址 *</label>
          <div className="flex gap-2">
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 rounded-lg bg-surface-800 border border-surface-700 px-3 py-2 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="例如：https://example.com/article"
            />
            <button
              type="button"
              onClick={handleExtract}
              disabled={fetching}
              className="btn btn-secondary"
            >
              {fetching ? <Loader className="w-4 h-4 animate-spin" /> : "提取信息"}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">标题 *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg bg-surface-800 border border-surface-700 px-3 py-2 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="一句话标题"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">副标题</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="w-full rounded-lg bg-surface-800 border border-surface-700 px-3 py-2 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="简要描述（可选）"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">来源图标链接</label>
          <input
            type="url"
            value={sourceLogo}
            onChange={(e) => setSourceLogo(e.target.value)}
            className="w-full rounded-lg bg-surface-800 border border-surface-700 px-3 py-2 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="例如：https://example.com/logo.png"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">标签</label>
          <div className="flex gap-2 mb-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
              className="flex-1 rounded-lg bg-surface-800 border border-surface-700 px-3 py-2 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="输入后回车添加"
            />
            <button type="button" onClick={handleAddTag} className="btn btn-secondary">
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-2 bg-brand-600/20 text-brand-300 px-2 py-1 rounded-md text-sm">
                {t}
                <button type="button" onClick={() => handleRemoveTag(t)} className="text-brand-400 hover:text-brand-200">×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Link to="/practices" className="btn btn-secondary">返回列表</Link>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? "发布中…" : "立即发布"}
          </button>
        </div>
      </form>
    </div>
  );
}
