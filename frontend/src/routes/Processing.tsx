import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Loader } from '@/components/shared/Loader'

export default function Processing() {
  const navigate = useNavigate()
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setWidth(100), 50)
    const t2 = setTimeout(() => navigate('/payment'), 5100)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [navigate])

  return (
    <div className="px-5 py-16 text-center">
      <div className="mx-auto mb-5 inline-block">
        <Loader size={40} />
      </div>
      <h2 className="mb-3 text-2xl font-semibold">Syncing Credentials</h2>
      <p className="text-sm text-[var(--muted)]">
        Establishing secure handshake with SpaceX Neural Link...
      </p>
      <div className="my-8 h-1.5 w-full overflow-hidden rounded-[10px] bg-white/5">
        <div
          className="h-full bg-[var(--text)] transition-[width] duration-[5000ms] ease-linear"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}
