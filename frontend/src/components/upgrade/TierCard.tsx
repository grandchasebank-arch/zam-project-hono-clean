import { Check } from "lucide-react";
import type { TierOption } from "@/types/upgrade";

interface TierCardProps {
  tier: TierOption;
  selected: boolean;
  onSelect: (tier: TierOption) => void;
}

export function TierCard({ tier, selected, onSelect }: TierCardProps) {
  const isVanguard = tier.variant === "vanguard";
  const hintBg = isVanguard
    ? { background: "rgba(197, 160, 89, 0.1)", color: "var(--gold)" }
    : {};

  return (
    <div
      onClick={() => onSelect(tier)}
      className={[
        "relative mb-4 cursor-pointer overflow-hidden rounded-[20px] border bg-[var(--surface)] transition-all duration-[400ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
        selected
          ? isVanguard
            ? "scale-[1.02] border-[var(--gold)] shadow-[0_0_40px_rgba(197,160,89,0.15)]"
            : "scale-[1.02] border-[var(--accent)] bg-white/[0.02] shadow-[0_0_30px_rgba(255,255,255,0.08)]"
          : "border-[var(--border)]",
        tier.variant === "explorer" && !selected ? "opacity-85" : "",
      ].join(" ")}
    >
      {selected && (
        <div className="absolute right-6 top-5 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--success)]">
          <Check size={12} strokeWidth={3} /> Selected
        </div>
      )}

      <div className="px-6 py-8">
        <div className="mb-3 flex flex-col gap-1">
          <span className="text-xl font-bold tracking-[-0.02em]">
            {tier.name}
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono-data text-lg font-semibold text-[var(--text)]">
              {tier.price}
            </span>
            <span className="text-[11px] font-medium text-[var(--muted)]">
              / one-time
            </span>
          </div>
          <div
            className="mt-2 w-fit rounded bg-white/5 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[var(--muted)]"
            style={hintBg}
          >
            {tier.clearance}
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-[1.5] text-[var(--muted)]">
          {tier.description}
        </p>
      </div>

      <div
        className="overflow-hidden bg-white/[0.02] transition-[max-height] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]"
        style={{ maxHeight: selected ? 600 : 0 }}
      >
        <ul
          className="list-none border-t border-[var(--border)] px-6 pb-8 pt-6"
          style={{ borderTop: selected ? "1px solid var(--border)" : "none" }}
        >
          {tier.features.map((f, i) => (
            <li
              key={i}
              className="mb-2.5 flex gap-3 text-xs leading-[1.4] text-[var(--muted)]"
            >
              <span className="opacity-40">•</span>
              <span dangerouslySetInnerHTML={{ __html: f }} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
