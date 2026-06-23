import { useState } from 'react'
import { Loader } from '@/components/shared/Loader'
import { NotificationList } from '@/components/notifications/NotificationList'
import { NotificationPreview } from '@/components/notifications/NotificationPreview'
import { useNotifications, useMarkAllRead } from '@/hooks/useNotifications'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export default function Notifications() {
  const { data, isLoading } = useNotifications()
  const markAll = useMarkAllRead()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <>
      <div className="mb-6 animate-slide-up">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="mb-1 text-[28px] font-semibold tracking-[-0.02em]">
              Notifications
            </h1>
            <p className="text-sm text-[var(--muted)]">
              Latest activity from your portal
            </p>
          </div>
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="rounded-[10px] border border-[var(--border-bright)] bg-transparent px-4 py-2 text-xs font-semibold text-[var(--muted)] transition hover:border-white/20 hover:text-[var(--text)]"
          >
            Mark all read
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center pt-12">
          <Loader size={24} />
        </div>
      ) : (
        <NotificationList items={data ?? []} onSelect={setSelectedId} />
      )}

      {/* Notification Detail Drawer */}
      <Sheet open={selectedId !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 overflow-hidden">
          {selectedId && (
            <NotificationPreviewDrawer id={selectedId} />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

function NotificationPreviewDrawer({ id }: { id: string }) {
  return (
    <div className="h-full overflow-y-auto">
      <NotificationPreview id={id} />
    </div>
  )
}
