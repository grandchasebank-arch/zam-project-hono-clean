import { CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function SuccessState() {
  const navigate = useNavigate();
  return (
    <div className="px-0 py-6 text-center">
      <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.1)]">
        <CheckCircle size={24} className="text-[#10b981]" />
      </div>
      <h3 className="mb-2 text-base font-bold text-[var(--text)]">
        Request Submitted
      </h3>
      <p className="mx-auto mb-6 max-w-[280px] text-xs leading-[1.6] text-[var(--muted)]">
        Your upgrade request has been received. You&apos;ll be notified once it&apos;s
        reviewed.
      </p>
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-[18px] text-[15px] font-bold text-[var(--muted)] transition hover:border-[var(--border-bright)] hover:text-[var(--text)]"
      >
        Back to Profile
      </button>
    </div>
  );
}
