import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const resp = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (resp.ok) {
      navigate("/login");
    } else {
      const data = await resp.json().catch(() => ({}));
      alert("注册失败：" + (data?.error || resp.statusText));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-md animate-scaleIn">
        <h2 className="text-2xl font-bold mb-2">注册</h2>
        <p className="text-surface-400 mb-6">使用邮箱与密码注册，系统将自动完成邮箱确认</p>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">邮箱</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-surface-800 border border-surface-700 px-3 py-2 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="例如：you@example.com"
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
              placeholder="至少 6 位"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? "注册中…" : "注册"}
          </button>
        </form>
        <p className="text-center text-sm text-surface-500 mt-6">
          已有账号？
          <Link to="/login" className="text-brand-400 hover:underline ml-1">立即登录</Link>
        </p>
      </div>
    </div>
  );
}
