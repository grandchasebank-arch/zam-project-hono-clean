import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useSendOTP, useVerifyOTP } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { Loader } from '@/components/shared/Loader'

export default function LoginPage() {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
  const [emailMsg, setEmailMsg] = useState<{ t: string; type: string } | null>(
    null,
  )
  const [otpMsg, setOtpMsg] = useState<{ t: string; type: string } | null>(
    null,
  )
  const [countdown, setCountdown] = useState(600)
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const sendOTP = useSendOTP()
  const verifyOTP = useVerifyOTP()

  useEffect(() => {
    if (step !== 'otp') return
    const id = setInterval(() => setCountdown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [step])

  const submitEmail = async () => {
    if (!/.+@.+\..+/.test(email)) {
      setEmailMsg({ t: 'Enter a valid email address.', type: 'error' })
      return
    }
    setEmailMsg(null)
    try {
      await sendOTP.mutateAsync(email)
      setStep('otp')
      setCountdown(600)
      setTimeout(() => refs.current[0]?.focus(), 100)
    } catch {
      setEmailMsg({ t: 'Failed to send code. Try again.', type: 'error' })
    }
  }

  const submitOTP = async () => {
    const code = otp.join('')
    if (code.length !== 6) {
      setOtpMsg({ t: 'Enter all 6 digits.', type: 'error' })
      return
    }
    setOtpMsg(null)
    try {
      await verifyOTP.mutateAsync({ email, code })
      navigate('/dashboard')
    } catch {
      setOtpMsg({ t: 'Invalid or expired code.', type: 'error' })
    }
  }

  const mm = String(Math.floor(countdown / 60))
  const ss = String(countdown % 60).padStart(2, '0')

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <button
        type="button"
        onClick={toggle}
        aria-label="Toggle theme"
        className="fixed right-5 top-5 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-bright)] bg-white/[0.06] text-[var(--muted)] transition hover:text-[var(--text)]"
      >
        {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
      </button>

      <div className="w-[90%] max-w-[420px] overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] animate-slide-up">
        <div className="p-8">
          <div className="mb-7 flex items-center gap-3">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/2/2e/SpaceX_logo_black.svg"
              alt="SpaceX"
              className="h-[18px]"
              style={{
                filter:
                  theme === 'light'
                    ? 'brightness(0)'
                    : 'brightness(0) invert(1)',
              }}
            />
            <div className="h-4 w-px bg-[var(--border-bright)]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
              Member Portal
            </span>
          </div>

          {step === 'email' ? (
            <>
              <div className="mb-6">
                <h2 className="mb-1.5 text-2xl font-semibold tracking-[-0.02em]">
                  Access Portal
                </h2>
                <p className="text-sm leading-[1.6] text-[var(--muted)]">
                  Enter your registered email address to receive a one-time
                  verification code.
                </p>
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitEmail()}
                  placeholder="your@email.com"
                  className="w-full rounded-xl border border-[var(--border-bright)] bg-white/[0.03] px-3.5 py-3 text-sm text-[var(--text)] outline-none transition focus:border-white/20"
                />
              </div>

              {emailMsg && (
                <div className="mb-3 text-center text-xs font-semibold text-[#ef4444]">
                  {emailMsg.t}
                </div>
              )}

              <button
                type="button"
                onClick={submitEmail}
                disabled={sendOTP.isPending}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[var(--text)] px-4 py-[18px] text-[15px] font-bold text-[var(--bg)] transition hover:brightness-90 disabled:opacity-30"
              >
                {sendOTP.isPending ? <Loader size={16} /> : 'Send Verification Code'}
              </button>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="mb-1.5 text-2xl font-semibold tracking-[-0.02em]">
                  Check your email
                </h2>
                <p className="text-sm leading-[1.6] text-[var(--muted)]">
                  We sent a 6-digit code to{' '}
                  <strong className="text-[var(--text)]">{email}</strong>. Enter
                  it below to continue.
                </p>
              </div>

              <div className="mb-6 flex justify-center gap-3">
                {otp.map((v, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      refs.current[i] = el
                    }}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={v}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, '').slice(0, 1)
                      const next = [...otp]
                      next[i] = d
                      setOtp(next)
                      if (d && i < 5) refs.current[i + 1]?.focus()
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otp[i] && i > 0) {
                        const next = [...otp]
                        next[i - 1] = ''
                        setOtp(next)
                        refs.current[i - 1]?.focus()
                      }
                      if (e.key === 'Enter') submitOTP()
                    }}
                    className="h-[58px] w-11 rounded-xl border border-[var(--border-bright)] bg-white/[0.03] text-center font-mono-data text-2xl font-semibold text-[var(--text)] outline-none transition focus:border-white/20"
                  />
                ))}
              </div>

              <div className="mb-5 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Code expires in
                </span>
                <span
                  className="font-mono-data text-[13px] font-semibold"
                  style={{
                    color: countdown < 60 ? 'var(--danger)' : 'var(--text)',
                  }}
                >
                  {mm}:{ss}
                </span>
              </div>

              {otpMsg && (
                <div className="mb-3 text-center text-xs font-semibold text-[#ef4444]">
                  {otpMsg.t}
                </div>
              )}

              <button
                type="button"
                onClick={submitOTP}
                disabled={verifyOTP.isPending}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[var(--text)] px-4 py-[18px] text-[15px] font-bold text-[var(--bg)] transition hover:brightness-90 disabled:opacity-30"
              >
                {verifyOTP.isPending ? <Loader size={16} /> : 'Verify & Sign In'}
              </button>

              <hr className="my-6 border-0 border-t border-[var(--border)]" />

              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setOtp(Array(6).fill(''))
                }}
                className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-[18px] text-[15px] font-bold text-[var(--muted)] transition hover:border-[var(--border-bright)] hover:text-[var(--text)]"
              >
                Use a different email
              </button>
            </>
          )}
        </div>

        <p className="border-t border-[var(--border)] px-8 py-4 text-center font-mono-data text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
          SpaceX HQ — Restricted Access
        </p>
      </div>
    </div>
  )
}
