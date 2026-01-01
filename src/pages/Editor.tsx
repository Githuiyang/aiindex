import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

type EditorState = {
  type?: "practice" | "gallery" | "blog";
  action?: "create" | "submit" | "edit";
  initial?: {
    link?: string;
    desc?: string;
    title?: string;
    image?: string;
    content?: string;
  };
};

export default function Editor() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as EditorState;
  const type = state.type || "practice";
  const action = state.action || "create";
  const [title, setTitle] = useState(state.initial?.title || "");
  const [link, setLink] = useState(state.initial?.link || "");
  const [desc, setDesc] = useState(state.initial?.desc || "");
  const [content, setContent] = useState(state.initial?.content || "");
  const [imageUrl, setImageUrl] = useState(state.initial?.image || "");
  const [imageFileUrl, setImageFileUrl] = useState<string>("");

  const titleLabel = type === "blog" ? "标题" : type === "gallery" ? "图片标题" : "实践标题";
  const linkLabel = type === "gallery" ? "图片链接" : "链接";
  const contentLabel = type === "blog" ? "正文 Markdown" : "详细描述 Markdown";
  const primaryText = action === "edit" ? "保存" : action === "submit" ? "提交" : "创建";

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setImageFileUrl(url);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`${primaryText}成功`);
    navigate(-1);
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{type === "blog" ? "编辑博客" : type === "gallery" ? "编辑图片" : "编辑实践"}</h1>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>返回</button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <form onSubmit={onSubmit} className="space-y-4">
            {type === "blog" && (
              <div>
                <label className="block text-sm font-medium mb-2">{titleLabel}</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg bg-surface-800 border border-surface-700 px-3 py-2 text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-2">{linkLabel}</label>
              <input value={link} onChange={(e) => setLink(e.target.value)} className="w-full rounded-lg bg-surface-800 border border-surface-700 px-3 py-2 text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">描述</label>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full rounded-lg bg-surface-800 border border-surface-700 px-3 py-2 text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{contentLabel}</label>
              <textarea rows={10} value={content} onChange={(e) => setContent(e.target.value)} className="w-full rounded-lg bg-surface-800 border border-surface-700 px-3 py-2 text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">图片</label>
              <div className="flex gap-2">
                <input type="url" placeholder="例如：https://example.com/cover.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="flex-1 rounded-lg bg-surface-800 border border-surface-700 px-3 py-2 text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <input type="file" accept="image/*" onChange={onFileChange} className="rounded-lg bg-surface-800 border border-surface-700 px-3 py-2 text-surface-100" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>取消</button>
              <button type="submit" className="btn btn-primary">{primaryText}</button>
            </div>
          </form>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">预览</h2>
          {imageUrl || imageFileUrl ? (
            <img src={imageFileUrl || imageUrl} alt="" className="w-full h-48 object-cover rounded-lg mb-3" />
          ) : null}
          {title && <h3 className="text-xl font-bold mb-2">{title}</h3>}
          {desc && <p className="text-sm text-surface-300 mb-3">{desc}</p>}
          {content && (
            <pre className="text-sm whitespace-pre-wrap text-surface-200">{content}</pre>
          )}
        </div>
      </div>
    </main>
  );
}
