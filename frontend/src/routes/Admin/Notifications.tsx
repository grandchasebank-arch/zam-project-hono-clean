import { useState } from 'react'
import { Loader } from '@/components/shared/Loader'
import * as api from '@/lib/api'

export default function AdminNotifications() {
  const [memberId, setMemberId] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; t: string } | null>(null)

  const submit = async () => {
    if (!memberId || !message) {
      setStatus({ ok: false, t: 'Member ID and message are required.' })
      return
    }
    setSending(true)
    setStatus(null)
    try {
      await api.adminNotifyMember(memberId, message)
      setStatus({ ok: true, t: 'Notification sent.' })
      setMessage('')
    } catch {
      setStatus({ ok: false, t: 'Failed to send notification.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="mb-6 animate-slide-up">
        <h1 className="mb-1 text-[28px] font-semibold tracking-[-0.02em]">
          Notify Member
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Send a direct notification to a member&apos;s portal.
        </p>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-4">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
            Member ID
          </label>
          <input
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            placeholder="mbr_..."
            className="w-full rounded-xl border border-[var(--border-bright)] bg-white/[0.03] px-3.5 py-3 text-sm text-[var(--text)] outline-none transition focus:border-white/20"
          />
        </div>
        <div className="mb-4">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Your message..."
            className="w-full resize-none rounded-xl border border-[var(--border-bright)] bg-white/[0.03] px-3.5 py-3 text-sm text-[var(--text)] outline-none transition focus:border-white/20"
          />
        </div>

        {status && (
          <p
            className="mb-3 text-center text-xs font-semibold"
            style={{
              color: status.ok ? 'var(--success)' : '#ef4444',
            }}
          >
            {status.t}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={sending}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[var(--text)] px-4 py-[18px] text-[15px] font-bold text-[var(--bg)] transition hover:brightness-90 disabled:opacity-30"
        >
          {sending ? <Loader size={16} /> : 'Send Notification'}
        </button>
      </div>
    </>
  )
}
