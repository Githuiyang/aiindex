import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("lhy38871@163.com");
  const [password, setPassword] = useState("123abc");
  const [loading, setLoading] = useState(false);

  const toChineseAuthError = (raw: string) => {
    const msg = (raw || "").trim();
    if (!msg) return "登录失败，请稍后重试";
    if (msg.includes("Invalid login credentials")) return "邮箱或密码错误";
    if (msg.includes("Email not confirmed")) return "邮箱未确认";
    if (msg.includes("User not found")) return "用户不存在";
    if (msg.includes("Too many requests")) return "请求过于频繁，请稍后再试";
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(toChineseAuthError(error.message));
    } else if (data?.user) {
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-md animate-scaleIn">
        <h2 className="text-2xl font-bold mb-2">登录</h2>
        <p className="text-surface-400 mb-6">使用邮箱和密码登录（已为你填好默认账户）</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">邮箱</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-surface-800 border border-surface-700 px-3 py-2 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">密码</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-surface-800 border border-surface-700 px-3 py-2 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? "登录中…" : "登录"}
          </button>
        </form>
        <p className="text-center text-sm text-surface-500 mt-6">
          需要注册？请使用默认账户登录后在设置页完善信息
        </p>
      </div>
    </div>
  );
}
