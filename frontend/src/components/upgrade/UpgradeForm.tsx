import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Loader } from "@/components/shared/Loader";
import { useMember } from "@/hooks/useMember";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import {
  usePendingRequests,
  useSubmitUpgrade,
  useUpgradeTiers,
} from "@/hooks/useUpgrade";
import { REQUEST_SESSION_KEY, TIER_SESSION_KEY } from "@/lib/upgradeSession";
import { TierList } from "./TierList";
import type { TierOption } from "@/types/upgrade";

export function UpgradeForm() {
  const { data: tiers = [], isLoading } = useUpgradeTiers();
  const { data: pendingRequests = [] } = usePendingRequests();
  const { data: member } = useMember();
  const paymentInstructions = useFeatureFlag("payment_instructions");
  const submit = useSubmitUpgrade();
  const [selected, setSelected] = useState<TierOption | null>(null);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  if (isLoading || !member) {
    return (
      <div className="flex justify-center py-12">
        <Loader size={28} />
      </div>
    );
  }

  const handleConfirm = async () => {
    if (!selected) {
      setError(true);
      return;
    }

    sessionStorage.setItem(TIER_SESSION_KEY, JSON.stringify(selected));

    if (!paymentInstructions) {
      navigate("/payment");
      return;
    }

    const existing = pendingRequests.find((r) => r.to_tier === selected.name);
    if (existing) {
      sessionStorage.setItem(REQUEST_SESSION_KEY, existing.id);
      navigate("/payment");
      return;
    }

    try {
      const created = await submit.mutateAsync({
        current_tier: member.tier,
        requested_tier: selected.name,
      });
      sessionStorage.setItem(REQUEST_SESSION_KEY, created.id);
      navigate("/payment");
    } catch {
      // toasts handled in mutation
    }
  };

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
        pendingToTiers={pendingRequests.map((r) => r.to_tier)}
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
        disabled={submit.isPending}
        onClick={handleConfirm}
        className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-2xl border-0 bg-[var(--text)] px-4 py-[18px] text-[15px] font-bold tracking-[-0.01em] text-[var(--bg)] transition hover:brightness-90 disabled:opacity-30"
      >
        {submit.isPending ? <Loader size={16} /> : "Confirm Upgrade"}
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
