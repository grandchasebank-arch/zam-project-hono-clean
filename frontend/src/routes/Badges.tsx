import { Lock } from 'lucide-react'
import { useState } from 'react'
import { Loader } from '@/components/shared/Loader'
import { useBadges } from '@/hooks/useBadges'
import { useMember } from '@/hooks/useMember'
import type { Badge } from '@/types/badge'
import { isBadgeUnlocked } from '@/types/badge'
import type { Tier } from '@/types/user'

export default function Badges() {
  const { data: member, isLoading: memberLoading } = useMember()
  const { data: badges, isLoading: badgesLoading } = useBadges()

  const isLoading = memberLoading || badgesLoading

  return (
    <>
      <div className="mb-6 animate-slide-up">
        <h1 className="mb-1 text-[28px] font-semibold tracking-[-0.02em]">
          Badges
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {member
            ? `Your ${member.tier} tier unlocks badges up to your clearance level.`
            : 'Membership badges earned through tier progression.'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center pt-12">
          <Loader size={24} />
        </div>
      ) : !badges?.length ? (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
          <p className="text-sm text-[var(--muted)]">No badges available yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {badges.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              memberTier={member?.tier ?? 'Explorer'}
            />
          ))}
        </div>
      )}
    </>
  )
}

function BadgeCard({
  badge,
  memberTier,
}: {
  badge: Badge
  memberTier: Tier
}) {
  const unlocked = isBadgeUnlocked(memberTier, badge.tierRequired)
  const [iconFailed, setIconFailed] = useState(false)

  return (
    <div
      className={[
        'relative overflow-hidden rounded-[20px] border bg-[var(--surface)] p-5 transition-opacity',
        unlocked
          ? 'border-[var(--border)]'
          : 'border-[var(--border)] opacity-50 grayscale',
      ].join(' ')}
    >
      <div className="flex items-start gap-4">
        <div
          className={[
            'flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border',
            unlocked
              ? 'border-[var(--border-bright)] bg-white/[0.04]'
              : 'border-[var(--border)] bg-white/[0.02]',
          ].join(' ')}
        >
          {badge.iconUrl && !iconFailed ? (
            <img
              src={badge.iconUrl}
              alt=""
              className="h-9 w-9 object-contain"
              onError={() => setIconFailed(true)}
            />
          ) : (
            <span className="text-lg font-bold text-[var(--muted)]">
              {badge.name.charAt(0)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-3">
            <h2 className="text-[17px] font-semibold text-[var(--text)]">
              {badge.name}
            </h2>
            {!unlocked && (
              <div className="flex shrink-0 items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--pending)]">
                <Lock size={11} />
                Locked
              </div>
            )}
          </div>
          <p className="mb-3 text-[13px] leading-[1.5] text-[var(--muted)]">
            {badge.description}
          </p>
          <span className="inline-block rounded-lg border border-[var(--border-bright)] bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold uppercase text-[var(--muted)]">
            {unlocked ? 'Earned' : `Requires ${badge.tierRequired}`}
          </span>
        </div>
      </div>
    </div>
  )
}
