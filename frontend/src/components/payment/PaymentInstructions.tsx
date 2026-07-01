import { Mail, Shield } from "lucide-react";
import { PaymentSummary } from "@/components/payment/PaymentSummary";
import { statusMessage } from "@/lib/upgradeStatus";
import type { TierOption } from "@/types/upgrade";
import type { UpgradeRequestDetail } from "@/types/receipt";

interface PaymentInstructionsProps {
  tier: TierOption;
  request: UpgradeRequestDetail;
  supportEmail?: string | null;
  siteName?: string;
}

export function PaymentInstructions({
  tier,
  request,
  supportEmail,
  siteName,
}: PaymentInstructionsProps) {
  const mailto = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent(
        `Tier upgrade payment — ${tier.name}`
      )}`
    : undefined;

  return (
    <>
      <div className="mb-6">
        <h2 className="mb-1 text-2xl font-semibold tracking-[-0.02em]">
          Payment instructions
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Upgrades are personally reviewed by our team
          {siteName ? ` at ${siteName}` : ""}.
        </p>
      </div>

      <div className="mb-4 flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <Shield size={20} className="mt-0.5 shrink-0 text-[var(--muted)]" />
        <p className="text-sm leading-relaxed text-[var(--text)]">
          {statusMessage(request.status, request.admin_notes)}
        </p>
      </div>

      <PaymentSummary
        tier={tier.name}
        price={tier.price}
        status={request.status}
        totalAmount={request.total_amount}
        amountPaid={request.amount_paid}
      />

      <p className="mb-4 text-center text-[11px] leading-[1.6] text-[var(--muted)]">
        Contact us to receive secure payment instructions. Once you&apos;ve paid,
        upload your receipt below.
      </p>

      {mailto ? (
        <a
          href={mailto}
          className="mb-3 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[var(--text)] px-4 py-[18px] text-[15px] font-bold text-[var(--bg)] transition hover:brightness-90"
        >
          <Mail size={18} />
          Contact our team
        </a>
      ) : (
        <p className="mb-3 text-center text-xs text-[var(--muted)]">
          Support email is not configured yet. Check back soon.
        </p>
      )}
    </>
  );
}
