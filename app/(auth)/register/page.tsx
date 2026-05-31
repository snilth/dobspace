"use client";

import { useState, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { signUp } from "@/lib/auth/client";
import { CatIcon } from "@/components/shared/cat-icon";
import { cn } from "@/lib/utils";

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score: 1, label: "Weak", color: "bg-error" };
  if (score === 2) return { score: 2, label: "Fair", color: "bg-[oklch(61%_0.19_55)]" };
  if (score === 3) return { score: 3, label: "Good", color: "bg-[oklch(57%_0.18_148)]" };
  return { score: 4, label: "Strong", color: "bg-[oklch(52%_0.19_148)]" };
}

function passwordMeetsRequirements(pw: string) {
  return (
    pw.length >= 8 &&
    /[A-Z]/.test(pw) &&
    /[a-z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const meetsReqs = passwordMeetsRequirements(password);

  const requirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Uppercase letter (A–Z)", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter (a–z)", met: /[a-z]/.test(password) },
    { label: "Number (0–9)", met: /[0-9]/.test(password) },
    { label: "Special character (!@#...)", met: /[^A-Za-z0-9]/.test(password) },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!meetsReqs) { setError("Password does not meet the requirements."); return; }
    setError("");
    setLoading(true);
    const result = await signUp.email({ name, email, password });
    if (result.error) {
      setError(result.error.message ?? "Failed to create account. Please try again.");
      setLoading(false);
      return;
    }
    router.push(`/check-email?email=${encodeURIComponent(email)}`);
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
            Ship faster,<br />together.
          </h2>
          <p className="text-[oklch(52%_0.01_258)] text-sm leading-relaxed">
            Kanban boards, AI-powered insights, and real-time collaboration — all in one place.
          </p>
          <div className="mt-10 space-y-3">
            {["Real-time Kanban board", "AI assistant that knows your project", "Sprint tracking & team workload"].map((feat) => (
              <div key={feat} className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-brand flex-shrink-0" />
                <span className="text-sm text-[oklch(65%_0.01_258)]">{feat}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-[oklch(32%_0.008_258)]">© 2026 DobSpace. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-surface overflow-y-auto">
        <div className="w-full max-w-[360px] py-8">
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center">
              <CatIcon className="w-4 h-4 text-brand-foreground" />
            </div>
            <span className="font-bold text-foreground">DobSpace</span>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-foreground mb-1">Create your account</h1>
            <p className="text-sm text-muted">Free forever. No credit card required.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Full name" type="text" value={name} onChange={setName} placeholder="Jane Smith" />
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />

            {/* Password with strength */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-2">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  className="w-full h-10 px-3 pr-9 text-sm bg-card border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/8 transition-all placeholder:text-muted-2"
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors">
                  {showPass ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength bar */}
              {password && (
                <div className="space-y-1.5">
                  <div className="flex gap-1 h-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={cn(
                        "flex-1 rounded-full transition-all",
                        i <= strength.score ? strength.color : "bg-surface-3"
                      )} />
                    ))}
                  </div>
                  <p className={cn("text-[11px] font-semibold", {
                    "text-error": strength.score === 1,
                    "text-[oklch(61%_0.19_55)]": strength.score === 2,
                    "text-[oklch(57%_0.18_148)]": strength.score >= 3,
                  })}>
                    {strength.label}
                  </p>
                  <div className="space-y-0.5">
                    {requirements.map((r) => (
                      <div key={r.label} className="flex items-center gap-1.5">
                        <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", r.met ? "bg-success" : "bg-surface-3")} />
                        <span className={cn("text-[10px]", r.met ? "text-muted" : "text-muted-2")}>{r.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-error bg-[oklch(97%_0.02_27)] border border-[oklch(88%_0.06_27)] rounded-lg px-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-error flex-shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !meetsReqs}
              className="w-full h-10 bg-brand text-brand-foreground text-sm font-semibold rounded-[8px] hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Create account
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-brand font-semibold hover:text-brand-dark transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}

function Field({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground-2">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required
        className="w-full h-10 px-3 text-sm bg-card border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/8 transition-all placeholder:text-muted-2"
      />
    </div>
  );
}
