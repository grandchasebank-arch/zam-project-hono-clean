import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Clock, XCircle } from "lucide-react";
import { usePaymentById } from "@/hooks/useHistory";
import { Loader } from "@/components/shared/Loader";
import { InvoiceExport } from "./InvoiceExport";

const STATUS_ICON_MAP = {
  Approved: CheckCircle,
  Pending: Clock,
  Rejected: XCircle,
};

const STATUS_COLOR_MAP = {
  Approved: "#10b981",
  Pending: "#f59e0b",
  Rejected: "#ef4444",
};

export default function PaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: payment, isLoading } = usePaymentById(id || "");

  if (isLoading) {
    return (
      <div className="flex justify-center pt-12">
        <Loader size={24} />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
        <p className="text-sm text-[var(--muted)]">Payment not found</p>
      </div>
    );
  }

  const IconComponent =
    STATUS_ICON_MAP[payment.status as keyof typeof STATUS_ICON_MAP] ||
    CheckCircle;
  const color =
    STATUS_COLOR_MAP[payment.status as keyof typeof STATUS_COLOR_MAP];

  return (
    <>
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-bright)] bg-[var(--surface)] text-[var(--text)] transition hover:opacity-80"
        aria-label="Back"
      >
        <ArrowLeft size={18} />
      </button>

      <div className="animate-slide-up space-y-6">
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8">
          <div className="mb-6 flex items-start gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10"
              style={{ backgroundColor: `${color}20` }}
            >
              <IconComponent size={24} style={{ color }} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[var(--text)]">
                Payment Invoice
              </h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Reference: {payment.reference}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-[var(--muted)]">Date</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                {payment.date}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--muted)]">Tier</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                {payment.tier}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--muted)]">Amount</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                {payment.amount}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--muted)]">Status</p>
              <p
                className="mt-1 text-sm font-semibold"
                style={{ color }}
              >
                {payment.status}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8">
          <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">
            Export Invoice
          </h2>
          <p className="mb-6 text-sm text-[var(--muted)]">
            Download your invoice in PDF or CSV format for your records.
          </p>
          {payment && <InvoiceExport payment={payment} />}
        </div>

        <button
          onClick={() => navigate(-1)}
          className="rounded-xl border border-[var(--border-bright)] bg-transparent px-4 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-white/5"
        >
          Back to History
        </button>
      </div>
    </>
  );
}
