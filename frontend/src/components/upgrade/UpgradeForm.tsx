import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Loader } from "@/components/shared/Loader";
import { useUpgradeTiers } from "@/hooks/useUpgrade";
import { TierList } from "./TierList";
import type { TierOption } from "@/types/upgrade";

const TIER_KEY = "spacex_selected_tier";

export function UpgradeForm() {
  const { data: tiers = [], isLoading } = useUpgradeTiers();
  const [selected, setSelected] = useState<TierOption | null>(null);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size={28} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="mb-2 text-2xl font-semibold tracking-[-0.02em]">
          Select Membership Tier
        </h2>
        <p className="text-sm leading-[1.6] text-[var(--muted)]">
          Elevate your clearance to unlock ecosystem assets and performance
          yields.
        </p>
      </div>

      <TierList
        tiers={tiers}
        selectedId={selected?.id ?? null}
        onSelect={(t) => {
          setSelected(t);
          setError(false);
        }}
      />

      {error && (
        <p className="mt-5 text-center text-xs font-semibold text-[#ef4444]">
          Please select a membership level to continue
        </p>
      )}

      <button
        type="button"
        disabled={submitting}
        onClick={() => {
          if (!selected) {
            setError(true);
            return;
          }
          setSubmitting(true);
          sessionStorage.setItem(TIER_KEY, JSON.stringify(selected));
          setTimeout(() => navigate("/processing"), 900);
        }}
        className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-2xl border-0 bg-[var(--text)] px-4 py-[18px] text-[15px] font-bold tracking-[-0.01em] text-[var(--bg)] transition hover:brightness-90 disabled:opacity-30"
      >
        {submitting ? <Loader size={16} /> : "Confirm Upgrade"}
      </button>

      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        className="mt-3 w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-[18px] text-[15px] font-bold text-[var(--muted)] transition hover:border-[var(--border-bright)] hover:text-[var(--text)]"
      >
        Cancel
      </button>
    </div>
  );
}
