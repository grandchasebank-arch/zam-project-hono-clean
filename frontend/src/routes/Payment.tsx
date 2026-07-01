import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { BenefitsList } from "@/components/payment/BenefitsList";
import { PaymentInstructions } from "@/components/payment/PaymentInstructions";
import { PaymentSummary } from "@/components/payment/PaymentSummary";
import { ReceiptUploadForm } from "@/components/payment/ReceiptUploadForm";
import { SuccessState } from "@/components/payment/SuccessState";
import { Loader } from "@/components/shared/Loader";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { useSubmitUpgrade, useUpgradeRequest } from "@/hooks/useUpgrade";
import { useMember } from "@/hooks/useMember";
import { REQUEST_SESSION_KEY, TIER_SESSION_KEY } from "@/lib/upgradeSession";
import type { TierOption } from "@/types/upgrade";

export default function Payment() {
  const navigate = useNavigate();
  const { data: member } = useMember();
  const { data: flags, isLoading: flagsLoading } = useFeatureFlags();
  const { data: settings } = usePublicSettings();
  const submit = useSubmitUpgrade();

  const [tier, setTier] = useState<TierOption | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [receiptDone, setReceiptDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paymentInstructions = flags?.payment_instructions ?? false;
  const receiptUpload = flags?.receipt_upload ?? false;
  const splitPayment = flags?.split_payment ?? false;

  const { data: request, isLoading: requestLoading } = useUpgradeRequest(
    paymentInstructions ? requestId : null
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(TIER_SESSION_KEY);
    if (!raw) {
      navigate("/upgrade");
      return;
    }
    try {
      setTier(JSON.parse(raw) as TierOption);
    } catch {
      navigate("/upgrade");
      return;
    }
    const rid = sessionStorage.getItem(REQUEST_SESSION_KEY);
    if (rid) setRequestId(rid);
  }, [navigate]);

  if (flagsLoading || !tier || !member) {
    return (
      <div className="flex justify-center pt-20">
        <Loader size={28} />
      </div>
    );
  }

  if (receiptDone) {
    return <SuccessState variant="receipt" />;
  }

  if (done) {
    return <SuccessState variant="request" />;
  }

  // ── New flow: payment instructions + optional receipt upload ──
  if (paymentInstructions) {
    if (!requestId) {
      return (
        <div className="py-12 text-center">
          <p className="mb-4 text-sm text-[var(--muted)]">
            No active upgrade request found. Confirm your tier selection first.
          </p>
          <button
            type="button"
            onClick={() => navigate("/upgrade")}
            className="rounded-2xl bg-[var(--text)] px-6 py-3 text-sm font-bold text-[var(--bg)]"
          >
            Back to tier selection
          </button>
        </div>
      );
    }

    if (requestLoading || !request) {
      return (
        <div className="flex justify-center pt-20">
          <Loader size={28} />
        </div>
      );
    }

    const uploadableStatuses = [
      "REQUESTED",
      "AWAITING_PAYMENT",
      "PENDING",
      "REJECTED",
    ];
    if (splitPayment) uploadableStatuses.push("PARTIALLY_PAID");

    const canUpload =
      receiptUpload &&
      request.status !== "APPROVED" &&
      uploadableStatuses.includes(request.status);

    return (
      <>
        <PaymentInstructions
          tier={tier}
          request={request}
          supportEmail={settings?.support_email}
          siteName={settings?.site_name}
        />

        {canUpload && (
          <ReceiptUploadForm
            requestId={requestId}
            totalAmount={Number(request.total_amount) || tier.priceValue || 0}
            splitPaymentEnabled={splitPayment}
            onSuccess={() => {
              sessionStorage.removeItem(TIER_SESSION_KEY);
              sessionStorage.removeItem(REQUEST_SESSION_KEY);
              setReceiptDone(true);
            }}
          />
        )}

        {receiptUpload && request.status === "PAYMENT_SUBMITTED" && !canUpload && (
          <button
            type="button"
            onClick={() => navigate("/history")}
            className="mt-4 w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-[16px] text-[15px] font-bold text-[var(--text)]"
          >
            View status in History
          </button>
        )}
      </>
    );
  }

  // ── Legacy flow: submit request on this page ──
  const handleSubmit = async () => {
    setError(null);
    try {
      await submit.mutateAsync({
        current_tier: member.tier,
        requested_tier: tier.name,
      });
      sessionStorage.removeItem(TIER_SESSION_KEY);
      sessionStorage.removeItem(REQUEST_SESSION_KEY);
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to submit. Please try again."
      );
    }
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="mb-1 text-2xl font-semibold tracking-[-0.02em]">
          Complete Enrollment
        </h2>
        <p className="mt-1 text-sm font-medium text-[var(--text)] opacity-90">
          You&apos;re one step away from activating your {tier.name} membership
        </p>
      </div>

      <BenefitsList benefits={tier.benefits} />
      <PaymentSummary tier={tier.name} price={tier.price} />

      <div className="mb-4 text-center">
        <p className="px-2.5 text-[11px] leading-[1.5] text-[var(--muted)]">
          Submit your request and our team will review it within 24 hours.
        </p>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submit.isPending}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[var(--text)] px-4 py-[18px] text-[15px] font-bold text-[var(--bg)] transition hover:brightness-90 disabled:opacity-30"
      >
        {submit.isPending ? <Loader size={16} /> : "Submit Upgrade Request"}
      </button>

      {error && (
        <p className="mt-3 text-center text-[11px] text-[#ef4444]">{error}</p>
      )}
    </>
  );
}
