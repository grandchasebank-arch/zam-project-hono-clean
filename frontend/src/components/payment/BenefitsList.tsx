import { CheckCircle } from "lucide-react";

export function BenefitsList({ benefits }: { benefits: string[] }) {
  return (
    <div className="mb-6 rounded-[20px] border border-[var(--border)] bg-white/[0.02] p-5">
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {benefits.map((b, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 text-xs text-[var(--text)] opacity-80"
          >
            <CheckCircle
              size={14}
              className="mt-0.5 shrink-0 text-[var(--success)]"
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
