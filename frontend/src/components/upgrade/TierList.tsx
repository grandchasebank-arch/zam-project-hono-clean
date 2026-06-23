import type { TierOption } from "@/types/upgrade";
import { TierCard } from "./TierCard";

interface TierListProps {
  tiers: TierOption[];
  selectedId: string | null;
  onSelect: (tier: TierOption) => void;
}

export function TierList({ tiers, selectedId, onSelect }: TierListProps) {
  return (
    <div>
      {tiers.map((t) => (
        <TierCard
          key={t.id}
          tier={t}
          selected={selectedId === t.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
