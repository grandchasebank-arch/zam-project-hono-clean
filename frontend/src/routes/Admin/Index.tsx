import { useNavigate } from 'react-router-dom'
import { ArrowRight, Bell, Users } from 'lucide-react'

export default function AdminHome() {
  const navigate = useNavigate()

  return (
    <>
      <div className="mb-6 animate-slide-up">
        <h1 className="mb-1 text-[28px] font-semibold tracking-[-0.02em]">
          HQ Control
        </h1>
        <p className="text-sm text-[var(--muted)]">Restricted administrative tools</p>
      </div>

      <div className="flex flex-col gap-3">
        <AdminLink
          onClick={() => navigate('/admin/notifications')}
          icon={<Bell size={20} />}
          title="Notify Member"
          description="Push a notification to a specific member account."
        />
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Users size={18} className="text-[var(--muted)]" /> Member Directory
          </div>
          <p className="mt-2 text-[13px] text-[var(--muted)]">
            Coming soon. Use the member portal to inspect a member.
          </p>
        </div>
      </div>
    </>
  )
}

function AdminLink({
  onClick,
  icon,
  title,
  description,
}: {
  onClick: () => void
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--border-bright)] text-left w-full"
    >
      <div>
        <div className="flex items-center gap-3 text-sm font-semibold">
          {icon} {title}
        </div>
        <p className="mt-2 text-[13px] text-[var(--muted)]">{description}</p>
      </div>
      <ArrowRight size={18} className="text-[var(--muted)]" />
    </button>
  )
}
