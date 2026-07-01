import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Loader } from "@/components/shared/Loader";
import { useUploadReceipt } from "@/hooks/useReceipts";

interface ReceiptUploadFormProps {
  requestId: string;
  totalAmount: number;
  splitPaymentEnabled: boolean;
  onSuccess: () => void;
}

export function ReceiptUploadForm({
  requestId,
  totalAmount,
  splitPaymentEnabled,
  onSuccess,
}: ReceiptUploadFormProps) {
  const upload = useUploadReceipt(requestId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState(
    splitPaymentEnabled ? "" : String(totalAmount || "")
  );
  const [note, setNote] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLocalError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setLocalError("Please choose a PDF or image file.");
      return;
    }

    const amountClaimed = Number(amount);
    if (!Number.isFinite(amountClaimed) || amountClaimed <= 0) {
      setLocalError("Enter a valid amount for this receipt.");
      return;
    }

    if (!splitPaymentEnabled && totalAmount > 0 && amountClaimed !== totalAmount) {
      setLocalError(
        `This receipt must cover the full amount ($${totalAmount.toLocaleString()}).`
      );
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("amount_claimed", String(amountClaimed));
    if (note.trim()) formData.append("member_note", note.trim());

    try {
      await upload.mutateAsync(formData);
      onSuccess();
    } catch {
      // toast handled in hook
    }
  };

  return (
    <div className="mt-6 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
      <h3 className="mb-1 text-base font-semibold">Upload receipt</h3>
      <p className="mb-4 text-xs text-[var(--muted)]">
        PDF or image (max 10 MB). We&apos;ll review it within 24 hours.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-bright)] bg-white/[0.02] px-4 py-8 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--text)] hover:text-[var(--text)]"
      >
        <Upload size={18} />
        {fileName ?? "Choose file"}
      </button>

      <label className="mb-3 block text-xs font-medium text-[var(--muted)]">
        Amount this receipt covers
        <input
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          readOnly={!splitPaymentEnabled && totalAmount > 0}
          className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--border-bright)]"
        />
      </label>

      <label className="mb-4 block text-xs font-medium text-[var(--muted)]">
        Note (optional)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="mt-1.5 w-full resize-none rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--border-bright)]"
          placeholder="Reference number, payment method, etc."
        />
      </label>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={upload.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border-bright)] bg-white/[0.04] px-4 py-[16px] text-[15px] font-bold text-[var(--text)] transition hover:bg-white/[0.08] disabled:opacity-40"
      >
        {upload.isPending ? <Loader size={16} /> : "Submit receipt"}
      </button>

      {localError && (
        <p className="mt-3 text-center text-[11px] text-[#ef4444]">{localError}</p>
      )}
    </div>
  );
}
