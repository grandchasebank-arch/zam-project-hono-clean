import type { TierOption } from "@/types/upgrade";
import { TierCard } from "./TierCard";

interface TierListProps {
  tiers: TierOption[];
  selectedId: string | null;
  pendingToTiers?: string[];
  onSelect: (tier: TierOption) => void;
}

export function TierList({ tiers, selectedId, pendingToTiers = [], onSelect }: TierListProps) {
  return (
    <div>
      {tiers.map((t) => (
        <TierCard
          key={t.id}
          tier={t}
          selected={selectedId === t.id}
          isPendingReview={pendingToTiers.includes(t.name)} // FIX: only pending for requested tier
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
