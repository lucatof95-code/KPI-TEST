import { Toast as ToastType } from '../../hooks/useToast'

interface ToastContainerProps {
  toasts: ToastType[]
  onRemove: (id: number) => void
}

const colors = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${colors[t.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 pointer-events-auto animate-fade-in max-w-sm`}
          onClick={() => onRemove(t.id)}
        >
          <span className="text-sm font-medium">{t.message}</span>
        </div>
      ))}
    </div>
  )
}
