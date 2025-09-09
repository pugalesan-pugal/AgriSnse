"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  // forgot password states
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [fpEmail, setFpEmail] = useState("");
  const [fpOtp, setFpOtp] = useState("");
  const [fpNew, setFpNew] = useState("");
  const [fpConfirm, setFpConfirm] = useState("");
  const [fpShowPwd, setFpShowPwd] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpInfo, setFpInfo] = useState<string | null>(null);
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

  async function handleForgotNext(e: React.FormEvent) {
    e.preventDefault();
    setFpInfo(null);
    setError(null);
    try {
      setFpLoading(true);
      if (forgotStep === 1) {
        const r = await fetch("/api/auth/check-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fpEmail }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to check email");
        if (!d.exists) throw new Error("Account not found");
        const s = await fetch("/api/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fpEmail }) });
        const sd = await s.json();
        if (!s.ok) throw new Error(sd.error || "Failed to send OTP");
        setFpInfo(`OTP sent to ${fpEmail}`);
        setForgotStep(2);
      } else if (forgotStep === 2) {
        if (!fpOtp || fpOtp.length !== 6) throw new Error("Enter the 6-digit OTP");
        setForgotStep(3);
      } else if (forgotStep === 3) {
        if (fpNew !== fpConfirm) throw new Error("Passwords do not match");
        const s = await fetch("/api/auth/forgot/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fpEmail, otp: fpOtp, newPassword: fpNew }) });
        const sd = await s.json();
        if (!s.ok) throw new Error(sd.error || "Failed to reset password");
        setFpInfo("Password updated. You can now sign in.");
        setShowForgot(false);
        setForgotStep(1);
        setFpEmail(""); setFpOtp(""); setFpNew(""); setFpConfirm("");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      setError(msg);
    } finally {
      setFpLoading(false);
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
            <button type="button" onClick={()=>{ setShowForgot(true); setError(null); setFpInfo(null); }} className="underline">Forgot password?</button>
            <Link href="/register" className="underline">Create account</Link>
          </div>
        </form>
        {showForgot && (
          <div className="rounded-2xl p-6 md:p-8 bg-white/90 shadow-md border border-emerald-900/5 max-w-md animate-fade-up mt-6">
            <h2 className="text-xl font-bold mb-3" style={{ color: "#21432a" }}>Reset password</h2>
            {fpInfo && <div className="mb-2 chip" style={{ color: "#064e3b", background: "#d1fae5" }}>{fpInfo}</div>}
            {error && <div className="mb-2 chip" style={{ color: "#7c2d12", background: "#ffedd5" }}>{error}</div>}
            <form onSubmit={handleForgotNext}>
              {forgotStep === 1 && (
                <>
                  <label className="block text-sm font-semibold mb-1" style={{ color: "#275539" }}>Your email</label>
                  <input type="email" required value={fpEmail} onChange={(e)=>setFpEmail(e.target.value)} className="w-full rounded-xl border border-emerald-900/15 px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 input-field" placeholder="farmer@example.com" />
                  <button type="submit" disabled={fpLoading} className="btn-primary w-full">{fpLoading ? "Checking..." : "Continue"}</button>
                </>
              )}
              {forgotStep === 2 && (
                <>
                  <label className="block text-sm font-semibold mb-1" style={{ color: "#275539" }}>Enter OTP sent to {fpEmail}</label>
                  <input inputMode="numeric" pattern="[0-9]*" maxLength={6} required value={fpOtp} onChange={(e)=>setFpOtp(e.target.value)} className="w-full rounded-xl border border-emerald-900/15 px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 input-field" placeholder="6-digit code" />
                  <div className="flex gap-3">
                    <button type="submit" disabled={fpLoading} className="btn-primary flex-1">{fpLoading ? "Validating..." : "Continue"}</button>
                    <button type="button" disabled={fpLoading} onClick={async ()=>{ setError(null); setFpInfo(null); setFpLoading(true); try { const s = await fetch("/api/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fpEmail }) }); const sd = await s.json(); if (!s.ok) throw new Error(sd.error || "Failed"); setFpInfo(`OTP re-sent to ${fpEmail}`); } catch (e) { const msg = e instanceof Error ? e.message : "Failed"; setError(msg); } finally { setFpLoading(false); } }} className="chip">Resend</button>
                  </div>
                </>
              )}
              {forgotStep === 3 && (
                <>
                  <label className="block text-sm font-semibold mb-1" style={{ color: "#275539" }}>New password</label>
                  <div className="relative">
                    <input type={fpShowPwd ? "text" : "password"} required value={fpNew} onChange={(e)=>setFpNew(e.target.value)} className="w-full rounded-xl border border-emerald-900/15 px-4 py-3 pr-12 mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 input-field" placeholder="••••••••" />
                    <button type="button" onClick={()=>setFpShowPwd(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold chip">{fpShowPwd ? "Hide" : "Show"}</button>
                  </div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: "#275539" }}>Confirm new password</label>
                  <input type={fpShowPwd ? "text" : "password"} required value={fpConfirm} onChange={(e)=>setFpConfirm(e.target.value)} className="w-full rounded-xl border border-emerald-900/15 px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 input-field" placeholder="••••••••" />
                  <button type="submit" disabled={fpLoading} className="btn-primary w-full">{fpLoading ? "Saving..." : "Update password"}</button>
                </>
              )}
            </form>
          </div>
        )}
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


