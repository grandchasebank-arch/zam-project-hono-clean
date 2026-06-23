import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useMember } from '@/hooks/useMember'
import { ProfileCard } from '@/components/dashboard/ProfileCard'
import { LockedAssetsGrid } from '@/components/dashboard/LockedAssetsGrid'
import { Loader } from '@/components/shared/Loader'

export default function Dashboard() {
  const { data: member, isLoading } = useMember()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  if (isLoading || !member) {
    return (
      <div className="flex justify-center pt-20">
        <Loader size={28} />
      </div>
    )
  }

  return (
    <>
      <ProfileCard member={member} />
      <div className="mb-4 ml-1 mt-10 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
        Restricted Ecosystem Assets
      </div>
      <LockedAssetsGrid />
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          setLoading(true)
          setTimeout(() => navigate('/upgrade'), 900)
        }}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[var(--text)] px-4 py-[18px] text-[15px] font-bold tracking-[-0.01em] text-[var(--bg)] transition hover:brightness-90 disabled:opacity-30"
      >
        {loading ? <Loader size={16} /> : 'Upgrade Clearance'}
      </button>
    </>
  )
}
