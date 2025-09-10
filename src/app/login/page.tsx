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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-100/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Side - Login Form */}
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-emerald-800">AgriSense</h1>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Welcome back to your
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600">
                Smart Farm
              </span>
            </h2>
            <p className="text-lg text-gray-600 max-w-md mx-auto lg:mx-0">
              </p>
          </div>

          {/* Login Form */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 max-w-md mx-auto lg:mx-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                  Email or Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
          <input
            id="email"
            name="email"
            type="text"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 text-gray-900 placeholder-gray-500"
                    placeholder="farmer@example.com or 98xxxxxx"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
          <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
            <input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-14 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 text-gray-900 placeholder-gray-500"
                    placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              {/* Login Button */}
              <button
                disabled={loading}
                type="submit"
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  "Sign In to Dashboard"
                )}
              </button>

              {/* Links */}
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setError(null); setFpInfo(null); }}
                  className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                >
                  Forgot password?
                </button>
                <Link href="/register" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                  Create new account
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side - Visual Content */}
        <div className="relative hidden lg:block">
          <div className="relative">
            {/* Floating Elements */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-emerald-400/30 to-green-500/30 rounded-full blur-xl animate-float"></div>
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-gradient-to-br from-green-400/30 to-emerald-500/30 rounded-full blur-xl animate-float delay-1000"></div>
            
            {/* Main Visual Container */}
            <div className="relative bg-gradient-to-br from-white/90 to-emerald-50/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 overflow-hidden">
              {/* Header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Personal Farmer Assistant </h3>
                <p className="text-gray-600"></p>
              </div>

              {/* Feature Cards */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-white/60 rounded-2xl border border-emerald-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">AI Insights</h4>
                    <p className="text-sm text-gray-600">Smart crop recommendations</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white/60 rounded-2xl border border-emerald-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Real-time Alerts</h4>
                    <p className="text-sm text-gray-600">Weather & pest notifications</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white/60 rounded-2xl border border-emerald-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Market Trends</h4>
                    <p className="text-sm text-gray-600">Price analysis & forecasts</p>
                  </div>
                </div>
              </div>

              {/* Bottom Stats */}
              <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-white/40 rounded-xl">
                  <div className="text-xl font-bold text-emerald-600">500+</div>
                  <div className="text-xs text-gray-600">Active Farmers</div>
                </div>
                <div className="p-3 bg-white/40 rounded-xl">
                  <div className="text-xl font-bold text-emerald-600">95%</div>
                  <div className="text-xs text-gray-600">Success Rate</div>
                </div>
                <div className="p-3 bg-white/40 rounded-xl">
                  <div className="text-xl font-bold text-emerald-600">24/7</div>
                  <div className="text-xs text-gray-600">Support</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Forgot Password Modal */}
        {showForgot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
              <button
                onClick={() => {
                  setShowForgot(false);
                  setForgotStep(1);
                  setFpEmail("");
                  setFpOtp("");
                  setFpNew("");
                  setFpConfirm("");
                  setError(null);
                  setFpInfo(null);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {fpInfo && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 mb-4">
                <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-emerald-700">{fpInfo}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 mb-4">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <form onSubmit={handleForgotNext} className="space-y-6">
              {forgotStep === 1 && (
                <>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Your email address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      </div>
                      <input
                        type="email"
                        required
                        value={fpEmail}
                        onChange={(e) => setFpEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 text-gray-900 placeholder-gray-500"
                        placeholder="farmer@example.com"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={fpLoading}
                    className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {fpLoading ? "Checking..." : "Send Reset Code"}
                  </button>
                </>
              )}

              {forgotStep === 2 && (
                <>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Enter 6-digit code sent to {fpEmail}
                    </label>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      value={fpOtp}
                      onChange={(e) => setFpOtp(e.target.value)}
                      className="w-full px-4 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 text-gray-900 placeholder-gray-500 text-center text-2xl tracking-widest"
                      placeholder="000000"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={fpLoading}
                      className="flex-1 py-4 px-6 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {fpLoading ? "Validating..." : "Verify Code"}
                    </button>
                    <button
                      type="button"
                      disabled={fpLoading}
                      onClick={async () => {
                        setError(null);
                        setFpInfo(null);
                        setFpLoading(true);
                        try {
                          const s = await fetch("/api/auth/send-otp", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email: fpEmail })
                          });
                          const sd = await s.json();
                          if (!s.ok) throw new Error(sd.error || "Failed");
                          setFpInfo(`OTP re-sent to ${fpEmail}`);
                        } catch (e) {
                          const msg = e instanceof Error ? e.message : "Failed";
                          setError(msg);
                        } finally {
                          setFpLoading(false);
                        }
                      }}
                      className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Resend
                    </button>
                  </div>
                </>
              )}

              {forgotStep === 3 && (
                <>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">New password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        type={fpShowPwd ? "text" : "password"}
                        required
                        value={fpNew}
                        onChange={(e) => setFpNew(e.target.value)}
                        className="w-full pl-12 pr-14 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 text-gray-900 placeholder-gray-500"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setFpShowPwd(s => !s)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        {fpShowPwd ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Confirm new password</label>
                  <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        type={fpShowPwd ? "text" : "password"}
                        required
                        value={fpConfirm}
                        onChange={(e) => setFpConfirm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 text-gray-900 placeholder-gray-500"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={fpLoading}
                    className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {fpLoading ? "Updating..." : "Update Password"}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


