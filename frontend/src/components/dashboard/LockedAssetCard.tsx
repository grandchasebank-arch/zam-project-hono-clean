import { Lock } from "lucide-react";
import { useState } from "react";
import { Loader } from "@/components/shared/Loader";

interface LockedAssetCardProps {
  logoUrl: string;
  logoAlt: string;
  logoHeight?: number;
  title: string;
  description: string;
  badge: string;
  onClick: () => void;
}

export function LockedAssetCard({
  logoUrl,
  logoAlt,
  logoHeight = 24,
  title,
  description,
  badge,
  onClick,
}: LockedAssetCardProps) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        setLoading(true);
        setTimeout(() => {
          setLoading(false);
          onClick();
        }, 1100);
      }}
      className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-left transition-transform active:scale-[0.98]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgba(var(--text-rgb), 0.03) 0%, transparent 70%)",
      }}
    >
      {loading && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[4px]"
          style={{ background: "rgba(var(--bg-rgb), 0.8)" }}
        >
          <Loader size={24} />
        </div>
      )}
      <div className="mb-5 flex items-center justify-between">
        <img
          src={logoUrl}
          alt={logoAlt}
          style={{ height: logoHeight }}
          className="object-contain opacity-80"
        />
        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--pending)]">
          <Lock size={12} />
          Locked
        </div>
      </div>
      <h4 className="mb-2 text-[17px] font-semibold text-[var(--text)]">
        {title}
      </h4>
      <p className="text-[13px] leading-[1.5] text-[var(--muted)]">
        {description}
      </p>
      <div className="mt-4 inline-block rounded-lg border border-[var(--border-bright)] bg-white/[0.03] px-3 py-1 text-[10px] font-bold uppercase text-[var(--muted)]">
        {badge}
      </div>
    </button>
  );
}
