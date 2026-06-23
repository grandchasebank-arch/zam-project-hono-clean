import { useNavigate } from 'react-router-dom'
import { ChevronRight, Clock, LogOut, Shield } from 'lucide-react'
import { useState } from 'react'
import { Loader } from '@/components/shared/Loader'
import { useMember } from '@/hooks/useMember'
import { useSignOut } from '@/hooks/useAuth'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function Profile() {
  const { data: member, isLoading } = useMember()
  const navigate = useNavigate()
  const signOut = useSignOut()
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  if (isLoading || !member) {
    return (
      <div className="flex justify-center pt-20">
        <Loader size={28} />
      </div>
    )
  }

  const links = [
    { label: 'Payment History', icon: Clock, to: '/history' },
    { label: 'Upgrade Clearance', icon: Shield, to: '/upgrade' },
  ]

  return (
    <>
      <div className="mb-6 animate-slide-up">
        <h1 className="mb-1 text-[28px] font-semibold tracking-[-0.02em]">
          Profile
        </h1>
        <p className="text-sm text-[var(--muted)]">{member.email}</p>
      </div>

      <div className="mb-6 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-4 p-5">
          <div
            className="h-14 w-14 rounded-full border border-[var(--border)] bg-cover bg-center"
            style={{ backgroundImage: `url('${member.avatarUrl}')` }}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold">{member.name}</div>
            <div className="text-xs text-[var(--muted)]">
              {member.tier} · {member.clearance}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
        {links.map(({ label, icon: Icon, to }) => (
          <button
            key={to}
            type="button"
            onClick={() => navigate(to)}
            className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 text-left transition last:border-b-0 hover:bg-white/5"
          >
            <div className="flex items-center gap-3 text-sm font-medium">
              <Icon size={18} className="text-[var(--muted)]" />
              {label}
            </div>
            <ChevronRight size={16} className="text-[var(--muted)]" />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setLogoutDialogOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-transparent px-4 py-[18px] text-[15px] font-bold text-[#ef4444] transition hover:border-[var(--border-bright)]"
      >
        <LogOut size={16} /> Sign Out
      </button>

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Sign Out</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to sign out?
          </AlertDialogDescription>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await signOut.mutateAsync()
                navigate('/login')
              }}
              className="bg-[#ef4444] hover:bg-[#dc2626]"
            >
              Sign Out
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
