"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sign up");
      setResult(`Account placeholder created with code ${data.code}`);
      setName(""); setEmail(""); setPassword(""); setConfirm("");
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
        <h1 className="text-3xl md:text-5xl font-extrabold mb-3" style={{ color: "#21432a" }}>Create account</h1>
        <p className="text-lg md:text-xl mb-8 max-w-xl" style={{ color: "#2a5a3a" }}>
          Fill in your details. We will assign a unique code like <strong>AS 01</strong>.
        </p>
        <form onSubmit={handleSubmit} className="rounded-2xl p-6 md:p-8 bg-white/90 shadow-md border border-emerald-900/5 max-w-md animate-fade-up">
          <label className="block text-sm font-semibold mb-1" style={{ color: "#275539" }}>Full name</label>
          <input value={name} onChange={(e)=>setName(e.target.value)} required className="w-full rounded-xl border border-emerald-900/15 px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 input-field" placeholder="A. Kumar" />

          <label className="block text-sm font-semibold mb-1" style={{ color: "#275539" }}>Email</label>
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required className="w-full rounded-xl border border-emerald-900/15 px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 input-field" placeholder="farmer@example.com" />

          <label className="block text-sm font-semibold mb-1" style={{ color: "#275539" }}>Password</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required className="w-full rounded-xl border border-emerald-900/15 px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 input-field" placeholder="••••••••" />

          <label className="block text-sm font-semibold mb-1" style={{ color: "#275539" }}>Retype password</label>
          <input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required className="w-full rounded-xl border border-emerald-900/15 px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 input-field" placeholder="••••••••" />

          {error && <div className="mb-3 chip" style={{ color: "#7c2d12", background: "#ffedd5" }}>{error}</div>}
          {result && <div className="mb-3 chip" style={{ color: "#064e3b", background: "#d1fae5" }}>{result}</div>}

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2 transition-transform duration-200 hover:scale-[1.01]">{loading ? "Saving..." : "Create account"}</button>
          <div className="mt-4 text-sm flex items-center justify-between" style={{ color: "#275539" }}>
            <Link href="/login" className="underline">Back to login</Link>
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


