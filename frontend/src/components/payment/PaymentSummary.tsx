import { RefreshCw } from "lucide-react";

interface PaymentSummaryProps {
  tier: string;
  price: string;
}

export function PaymentSummary({ tier, price }: PaymentSummaryProps) {
  return (
    <div className="mb-6 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
      <Row label="Requested Level" value={<strong>{tier}</strong>} />
      <Row
        label="Security Status"
        value={
          <strong className="flex items-center gap-1.5 font-mono-data text-[var(--pending)]">
            PENDING <RefreshCw size={14} className="animate-spin-slow" />
          </strong>
        }
      />
      <div className="mt-4 flex items-start justify-between border-t border-[var(--border)] pt-4">
        <div className="flex flex-col">
          <span className="text-sm text-[var(--muted)]">Total Amount Due</span>
          <span className="mt-0.5 text-[10px] text-[var(--muted)] opacity-80">
            Based on your selected plan.
          </span>
        </div>
        <strong className="font-mono-data text-lg">{price}</strong>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex justify-between text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      {value}
    </div>
  );
}
