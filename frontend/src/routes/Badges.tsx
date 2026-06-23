export default function Badges() {
  return (
    <>
      <div className="mb-6 animate-slide-up">
        <h1 className="mb-1 text-[28px] font-semibold tracking-[-0.02em]">
          Badges
        </h1>
        <p className="text-sm text-[var(--muted)]">Your earned badges will appear here.</p>
      </div>

      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
        <p className="text-sm text-[var(--muted)]">No badges earned yet.</p>
      </div>
    </>
  )
}
