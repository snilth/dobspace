"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Eye, EyeOff, Lock } from "lucide-react";
import { CatIcon } from "@/components/shared/cat-icon";
import { signIn } from "@/lib/auth/client";

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn.email({ email, password });
    if (result.error) {
      if (result.error.status === 403) {
        router.push(`/check-email?email=${encodeURIComponent(email)}`);
        return;
      }
      setError("Incorrect email or password. Please try again.");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    setLoading(false);
  }


  return (
    <div className="min-h-screen flex bg-surface">
      {/* Left panel */}
      <div className="hidden lg:flex w-[420px] flex-shrink-0 bg-sidebar flex-col justify-between p-10">
        <div>
          <div className="flex items-center gap-2.5 mb-14">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-md shadow-brand/30">
              <CatIcon className="w-5 h-5 text-brand-foreground" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">DobSpace</span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-3 leading-snug">
            Welcome<br />back.
          </h2>
          <p className="text-[oklch(52%_0.01_258)] text-sm leading-relaxed">
            Your team is waiting. Pick up right where you left off.
          </p>

          <div className="mt-10 p-4 rounded-xl border border-[oklch(22%_0.015_258)] bg-[oklch(16%_0.015_258)]">
            <p className="text-xs text-[oklch(48%_0.01_258)] mb-1 font-semibold uppercase tracking-wider">Security</p>
            <p className="text-xs text-[oklch(58%_0.01_258)] leading-relaxed">
              All data is encrypted at rest and in transit. Sessions expire automatically after 7 days.
            </p>
          </div>
        </div>

        <p className="text-[10px] text-[oklch(32%_0.008_258)]">© 2026 DobSpace. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-surface">
        <div className="w-full max-w-[360px]">
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center">
              <CatIcon className="w-4 h-4 text-brand-foreground" />
            </div>
            <span className="font-bold text-foreground">DobSpace</span>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-foreground mb-1">Sign in</h1>
            <p className="text-sm text-muted">Enter your credentials to continue.</p>
          </div>

          {/* Google OAuth */}
          <button type="button" disabled title="Google sign-in coming soon"
            className="w-full h-10 flex items-center justify-center gap-2.5 border border-border bg-card rounded-[8px] text-sm font-semibold text-muted cursor-not-allowed opacity-50 mb-4 relative">
            <svg className="w-4 h-4 opacity-40" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
            <Lock className="w-3 h-3 ml-auto opacity-40" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-muted font-medium">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full h-10 px-3 text-sm bg-card border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/8 transition-all placeholder:text-muted-2"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-2">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-10 px-3 pr-9 text-sm bg-card border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/8 transition-all placeholder:text-muted-2"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                >
                  {showPass ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-error bg-[oklch(97%_0.02_27)] border border-[oklch(88%_0.06_27)] rounded-lg px-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-error flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-brand text-brand-foreground text-sm font-semibold rounded-[8px] hover:bg-brand-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Sign in
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-brand font-semibold hover:text-brand-dark transition-colors">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
