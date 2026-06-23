import { useEffect, useState } from "react";
import type { Member } from "@/types/user";

const COVER_URL =
  "https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&w=800&q=80";

export function ProfileCard({ member }: { member: Member }) {
  const [clock, setClock] = useState("00:00:00");

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toTimeString().split(" ")[0] ?? "00:00:00");
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mb-6 overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] animate-slide-up">
      <div
        className="h-[140px] bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(var(--bg-rgb),0) 0%, var(--bg) 100%), url('${COVER_URL}')`,
        }}
      />
      <div className="-mt-12 px-6 pb-6">
        <div className="relative mb-4 h-[88px] w-[88px] rounded-full bg-[var(--surface)] p-1">
          <div
            className="h-full w-full rounded-full border border-[var(--border)] bg-cover bg-center"
            style={{ backgroundImage: `url('${member.avatarUrl}')` }}
          />
          <div
            className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 rounded-full border-[3px] border-[var(--surface)] bg-[var(--success)] animate-pulse-ring"
          />
        </div>

        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-[-0.02em]">
            {member.name}
          </h1>
          <p className="text-sm text-[var(--muted)]">{member.subtitle}</p>
          <p className="mt-1 text-xs font-medium text-[var(--muted)] opacity-70">
            {member.joined}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-[var(--border)] pt-6">
          <Stat label="Clearance" value={member.clearance} />
          <Stat label="Status" value={member.status} />
          <Stat label="System Time" value={clock} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </span>
      <strong className="flex items-center gap-1.5 font-mono-data text-sm font-medium">
        {value}
      </strong>
    </div>
  );
}
