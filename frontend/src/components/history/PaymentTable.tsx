import { CreditCard } from "lucide-react";
import type { PaymentRecord } from "@/types/payment";

const STATUS_COLOR: Record<PaymentRecord["status"], string> = {
  Approved: "text-[var(--success)]",
  Pending: "text-[var(--pending)]",
  Rejected: "text-[#ef4444]",
  "Under Review": "text-[#3b82f6]",
};

export function PaymentTable({ 
  rows,
  onSelect
}: { 
  rows: PaymentRecord[]
  onSelect: (id: string) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">
        No payment history yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-[var(--border)]">
      {rows.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect(p.id)}
          className="w-full text-left flex items-start gap-4 px-5 py-4 transition active:scale-[0.985] hover:bg-[var(--surface)] cursor-pointer"
        >
          {/* Left: Icon with optional unread dot */}
          <div className="relative flex-shrink-0 pt-0.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface)] border border-[var(--border)]">
              <CreditCard size={20} className="text-[var(--muted)]" />
            </div>
            {!p.read && (
              <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-blue-500 border-2 border-[var(--background)]" />
            )}
          </div>

          {/* Main Content */}
          <div className="min-w-0 flex-1">
            {/* Header: Tier + Amount */}
            <div className="flex items-center justify-between">
              <div className="font-semibold text-[var(--text)]">{p.tier}</div>
              <strong className="font-mono-data text-base">{p.amount}</strong>
            </div>

            {/* Date only - simplified */}
            <div className="mt-0.5 text-xs text-[var(--muted)]">
              {p.date}
            </div>

            {/* Status */}
            <div className={`mt-1 text-xs font-bold uppercase tracking-wider ${STATUS_COLOR[p.status]}`}>
              {p.status}
            </div>
          </div>

          {/* Right Chevron */}
          <div className="flex-shrink-0 self-center text-[var(--muted)] text-lg leading-none opacity-60">
            ›
          </div>
        </button>
      ))}
    </div>
  );
}
