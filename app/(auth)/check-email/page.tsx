"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Loader2, RotateCcw } from "lucide-react";
import { CatIcon } from "@/components/shared/cat-icon";
import { authClient } from "@/lib/auth/client";
import Link from "next/link";

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");

  async function handleResend() {
    if (!email) return;
    setResending(true);
    setError("");
    try {
      await authClient.sendVerificationEmail({ email, callbackURL: "/dashboard" });
      setResent(true);
    } catch {
      setError("Failed to resend. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] text-center">
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center">
            <CatIcon className="w-4 h-4 text-brand-foreground" />
          </div>
          <span className="font-bold text-foreground">DobSpace</span>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-brand-subtle flex items-center justify-center mx-auto mb-5">
          <Mail className="w-8 h-8 text-brand" />
        </div>

        <h1 className="text-[22px] font-bold text-foreground mb-2">Check your inbox</h1>
        <p className="text-sm text-muted mb-1">
          We sent a verification link to
        </p>
        {email && (
          <p className="text-sm font-semibold text-foreground mb-6">{email}</p>
        )}
        <p className="text-[12px] text-muted mb-8">
          Click the link in the email to verify your account. The link expires in 24 hours.
        </p>

        {resent ? (
          <p className="text-sm text-success font-medium mb-4">Email resent successfully.</p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="flex items-center justify-center gap-2 mx-auto text-sm font-semibold text-brand hover:text-brand-dark transition-colors disabled:opacity-50"
          >
            {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Resend verification email
          </button>
        )}

        {error && <p className="text-xs text-error mt-3">{error}</p>}

        <div className="mt-8 pt-6 border-t border-border">
          <Link href="/login" className="text-sm text-muted hover:text-foreground transition-colors">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return <Suspense><CheckEmailContent /></Suspense>;
}
