import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ToastContainer } from '../ui/Toast'
import { useToast } from '../../hooks/useToast'

// Global toast context
import { createContext, useContext } from 'react'
import type { ToastType } from '../../hooks/useToast'

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void
}
const ToastContext = createContext<ToastContextValue>({ addToast: () => {} })
export const useGlobalToast = () => useContext(ToastContext)

export function Layout() {
  const { toasts, addToast, removeToast } = useToast()
  return (
    <ToastContext.Provider value={{ addToast }}>
      <div className="flex min-h-screen bg-gray-950">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </ToastContext.Provider>
  )
}
