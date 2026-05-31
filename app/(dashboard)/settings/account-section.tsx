"use client";

import { useState, useRef } from "react";
import { Loader2, Check, Camera } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

type Props = { name: string; email: string; image?: string | null };

export function AccountSection({ name, email, image }: Props) {
  const [displayName, setDisplayName] = useState(name);
  const [avatar, setAvatar] = useState<string | null>(image ?? null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = displayName.slice(0, 2).toUpperCase() || name.slice(0, 2).toUpperCase();
  const dirty = displayName.trim() !== name && displayName.trim().length > 0;

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      // Resize to 128x128 via canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext("2d")!;
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 128, 128);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        setAvatar(dataUrl);
        saveAvatar(dataUrl);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function saveAvatar(dataUrl: string) {
    setSaving(true);
    setError("");
    try {
      await authClient.updateUser({ image: dataUrl });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to upload avatar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setSaving(true);
    setError("");
    try {
      await authClient.updateUser({ name: displayName.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Your Account" description="Personal info & login">
      {/* Avatar */}
      <div className="flex items-center gap-4 pb-5 border-b border-border">
        <div className="relative group flex-shrink-0">
          <button
            type="button"
            onClick={handleAvatarClick}
            className="w-16 h-16 rounded-full overflow-hidden border-2 border-brand-muted focus:outline-none focus:ring-2 focus:ring-brand/40 transition-all"
          >
            {avatar ? (
              <img src={avatar} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-brand-subtle flex items-center justify-center">
                <span className="text-xl font-bold text-brand">{initials}</span>
              </div>
            )}
          </button>
          <button
            type="button"
            onClick={handleAvatarClick}
            className={cn(
              "absolute inset-0 rounded-full flex items-center justify-center",
              "bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            )}
          >
            <Camera className="w-5 h-5 text-white" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground">{name}</p>
          <p className="text-[12px] text-muted">{email}</p>
          <p className="text-[11px] text-muted mt-1">Click avatar to change · Max 2MB</p>
        </div>
      </div>

      {/* Name */}
      <form onSubmit={handleSaveName} className="pt-1 space-y-4">
        <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="Your name" />
        <div>
          <label className="text-xs font-semibold text-foreground-2 block mb-1.5">Email</label>
          <div className="h-10 px-3 flex items-center bg-surface-3 border border-border rounded-[8px]">
            <span className="text-sm text-muted">{email}</span>
          </div>
          <p className="text-[11px] text-muted mt-1">Email cannot be changed</p>
        </div>

        {error && <ErrorMsg>{error}</ErrorMsg>}

        <div className="flex justify-end">
          <SaveButton saving={saving} saved={saved} disabled={!dirty} />
        </div>
      </form>
    </Section>
  );
}

// ─── shared sub-components ──────────────────────────────────────────────────

export function Section({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-6 pb-5 border-b border-border">
        <h2 className="text-[16px] font-semibold text-foreground">{title}</h2>
        {description && <p className="text-[13px] text-muted mt-1">{description}</p>}
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

export function Field({ label, value, onChange, placeholder, disabled }: {
  label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-10 px-3 text-sm bg-card border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/8 transition-all placeholder:text-muted-2 disabled:bg-surface-3 disabled:text-muted"
      />
    </div>
  );
}

export function SaveButton({ saving, saved, disabled }: {
  saving: boolean; saved: boolean; disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={saving || disabled}
      className="flex items-center gap-1.5 px-4 h-9 bg-brand text-brand-foreground text-sm font-semibold rounded-[8px] hover:bg-brand-dark transition-colors disabled:opacity-50"
    >
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : null}
      {saved ? "Saved" : "Save"}
    </button>
  );
}

export function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs text-error bg-[oklch(97%_0.02_27)] border border-[oklch(88%_0.06_27)] rounded-lg px-3 py-2">
      <div className="w-1.5 h-1.5 rounded-full bg-error flex-shrink-0" />
      {children}
    </div>
  );
}
