import { statusDisplayLabel } from "@/lib/upgradeStatus";

interface PaymentSummaryProps {
  tier: string;
  price: string;
  status?: string;
  totalAmount?: number;
  amountPaid?: number;
}

export function PaymentSummary({
  tier,
  price,
  status = "AWAITING_PAYMENT",
  totalAmount,
  amountPaid,
}: PaymentSummaryProps) {
  const showProgress =
    totalAmount != null &&
    totalAmount > 0 &&
    amountPaid != null &&
    amountPaid > 0;

  return (
    <div className="mb-6 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
      <Row label="Requested Level" value={<strong>{tier}</strong>} />
      <Row
        label="Status"
        value={
          <strong className="font-mono-data text-[var(--pending)]">
            {statusDisplayLabel(status)}
          </strong>
        }
      />
      <div className="mt-4 flex items-start justify-between border-t border-[var(--border)] pt-4">
        <div className="flex flex-col">
          <span className="text-sm text-[var(--muted)]">Total Amount Due</span>
          <span className="mt-0.5 text-[10px] text-[var(--muted)] opacity-80">
            {showProgress ? "Payment progress" : "Based on your selected plan."}
          </span>
        </div>
        <strong className="font-mono-data text-lg">
          {showProgress
            ? `$${amountPaid!.toLocaleString()} / $${totalAmount!.toLocaleString()}`
            : totalAmount && totalAmount > 0
              ? `$${totalAmount.toLocaleString()}`
              : price}
        </strong>
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
