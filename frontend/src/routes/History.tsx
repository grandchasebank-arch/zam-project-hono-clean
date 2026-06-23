import { useState } from 'react'
import { Loader } from '@/components/shared/Loader'
import { PaymentTable } from '@/components/history/PaymentTable'
import { PaymentPreview } from '@/components/history/PaymentPreview'
import { useHistory } from '@/hooks/useHistory'
import { Sheet, SheetContent } from '@/components/ui/sheet'

export default function History() {
  const { data, isLoading } = useHistory()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <>
      <div className="mb-6 animate-slide-up">
        <h1 className="mb-1 text-[28px] font-semibold tracking-[-0.02em]">
          Payment History
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Records of your tier upgrades and contributions
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center pt-12">
          <Loader size={24} />
        </div>
      ) : (
        <PaymentTable rows={data ?? []} onSelect={setSelectedId} />
      )}

      {/* Payment Detail Drawer */}
      <Sheet open={selectedId !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 overflow-hidden">
          {selectedId && (
            <PaymentPreviewDrawer id={selectedId} />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

function PaymentPreviewDrawer({ id }: { id: string }) {
  return (
    <div className="h-full overflow-y-auto">
      <PaymentPreview id={id} />
    </div>
  )
}
