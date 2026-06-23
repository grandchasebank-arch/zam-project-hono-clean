import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { BenefitsList } from '@/components/payment/BenefitsList'
import { PaymentSummary } from '@/components/payment/PaymentSummary'
import { SuccessState } from '@/components/payment/SuccessState'
import { Loader } from '@/components/shared/Loader'
import { useSubmitUpgrade } from '@/hooks/useUpgrade'
import { useMember } from '@/hooks/useMember'
import type { TierOption } from '@/types/upgrade'

const TIER_KEY = 'spacex_selected_tier'

export default function Payment() {
  const navigate = useNavigate()
  const { data: member } = useMember()
  const submit = useSubmitUpgrade()
  const [tier, setTier] = useState<TierOption | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = sessionStorage.getItem(TIER_KEY)
    if (!raw) {
      navigate('/upgrade')
      return
    }
    try {
      setTier(JSON.parse(raw) as TierOption)
    } catch {
      navigate('/upgrade')
    }
  }, [navigate])

  if (!tier || !member) {
    return (
      <div className="flex justify-center pt-20">
        <Loader size={28} />
      </div>
    )
  }

  if (done) {
    return <SuccessState />
  }

  const handleSubmit = async () => {
    setError(null)
    try {
      await submit.mutateAsync({
        member_id: member.id,
        member_email: member.email,
        member_name: member.name,
        current_tier: member.tier,
        requested_tier: tier.name,
      })
      sessionStorage.removeItem(TIER_KEY)
      setDone(true)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to submit. Please try again.',
      )
    }
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="mb-1 text-2xl font-semibold tracking-[-0.02em]">
          Complete Enrollment
        </h2>
        <p className="mt-1 text-sm font-medium text-[var(--text)] opacity-90">
          You&apos;re one step away from activating your {tier.name} membership
        </p>
      </div>

      <BenefitsList benefits={tier.benefits} />
      <PaymentSummary tier={tier.name} price={tier.price} />

      <div className="mb-4 text-center">
        <p className="px-2.5 text-[11px] leading-[1.5] text-[var(--muted)]">
          Submit your request and our team will review it within 24 hours.
        </p>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submit.isPending}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[var(--text)] px-4 py-[18px] text-[15px] font-bold text-[var(--bg)] transition hover:brightness-90 disabled:opacity-30"
      >
        {submit.isPending ? <Loader size={16} /> : 'Submit Upgrade Request'}
      </button>

      {error && (
        <p className="mt-3 text-center text-[11px] text-[#ef4444]">{error}</p>
      )}
    </>
  )
}
