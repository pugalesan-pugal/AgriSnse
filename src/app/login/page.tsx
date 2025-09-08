"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      // Persist session minimally in localStorage
      localStorage.setItem("agrisense.user", JSON.stringify({ id: data.id, code: data.code, name: data.name, email: data.email }));
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container-responsive py-12 md:py-20 grid lg:grid-cols-2 gap-10 items-center min-h-[80vh]">
      <section className="order-2 lg:order-1">
        <h1 className="text-3xl md:text-5xl font-extrabold mb-3" style={{ color: "#21432a" }}>Welcome back</h1>
        <p className="text-lg md:text-xl mb-8 max-w-xl" style={{ color: "#2a5a3a" }}>
          Sign in to continue receiving personalized crop guidance, reminders, and pest alerts.
        </p>
        <form onSubmit={handleSubmit} className="rounded-2xl p-6 md:p-8 bg-white/90 shadow-md border border-emerald-900/5 max-w-md animate-fade-up">
          <label htmlFor="email" className="block text-sm font-semibold mb-1" style={{ color: "#275539" }}>Email or Phone</label>
          <input
            id="email"
            name="email"
            type="text"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-emerald-900/15 px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 input-field"
            placeholder="farmer@example.com / 98xxxxxx"
          />

          <label htmlFor="password" className="block text-sm font-semibold mb-1" style={{ color: "#275539" }}>Password</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-emerald-900/15 px-4 py-3 pr-12 mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 input-field"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold chip"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>

          {error && <div className="mb-3 chip" style={{ color: "#7c2d12", background: "#ffedd5" }}>{error}</div>}
          <button disabled={loading} type="submit" className="btn-primary w-full mt-2 transition-transform duration-200 hover:scale-[1.01]">{loading ? "Signing in..." : "Sign In"}</button>
          <div className="mt-4 text-sm flex items-center justify-between" style={{ color: "#275539" }}>
            <Link href="#" className="underline">Forgot password?</Link>
            <Link href="/register" className="underline">Create account</Link>
          </div>
        </form>
      </section>

      <aside className="order-1 lg:order-2 relative">
        <div className="absolute -top-10 -left-10 w-56 h-56 rounded-full animate-float-slow" style={{ background: "radial-gradient(circle at 30% 30%, #ffd56b, transparent 60%)" }} />
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white/90 to-[#f7efe3] shadow-xl border border-emerald-900/5">
          <img src="/hero.png" alt="Farmer illustration" className="w-full h-auto block animate-fade-up" />
        </div>
      </aside>
    </main>
  );
}


