import { CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SuccessStateProps {
  variant?: "request" | "receipt";
}

export function SuccessState({ variant = "request" }: SuccessStateProps) {
  const navigate = useNavigate();
  const isReceipt = variant === "receipt";

  return (
    <div className="px-0 py-6 text-center">
      <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.1)]">
        <CheckCircle size={24} className="text-[#10b981]" />
      </div>
      <h3 className="mb-2 text-base font-bold text-[var(--text)]">
        {isReceipt ? "Receipt submitted" : "Request submitted"}
      </h3>
      <p className="mx-auto mb-6 max-w-[280px] text-xs leading-[1.6] text-[var(--muted)]">
        {isReceipt
          ? "Your receipt is under review. We'll notify you within 24 hours."
          : "Your upgrade request has been received. You'll be notified once it's reviewed."}
      </p>
      <button
        type="button"
        onClick={() => navigate(isReceipt ? "/history" : "/dashboard")}
        className="mb-2 w-full rounded-2xl bg-[var(--text)] px-4 py-[18px] text-[15px] font-bold text-[var(--bg)] transition hover:brightness-90"
      >
        {isReceipt ? "View status in History" : "Back to Home"}
      </button>
      {!isReceipt && (
        <button
          type="button"
          onClick={() => navigate("/history")}
          className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-[16px] text-[14px] font-bold text-[var(--muted)] transition hover:border-[var(--border-bright)] hover:text-[var(--text)]"
        >
          View History
        </button>
      )}
    </div>
  );
}
