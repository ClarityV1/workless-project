'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface ToastMessage {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  let counter = 0

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now() + counter++
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const typeColors: Record<string, { bg: string; border: string; dot: string }> = {
    success: { bg: '#0e1a0e', border: 'rgba(22,163,74,0.4)', dot: '#16a34a' },
    error: { bg: '#1a0e0e', border: 'rgba(220,38,38,0.4)', dot: '#dc2626' },
    info: { bg: '#0f1117', border: 'rgba(37,87,255,0.4)', dot: '#2557ff' },
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(toast => {
          const colors = typeColors[toast.type]
          return (
            <div
              key={toast.id}
              style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                minWidth: '260px',
                maxWidth: '380px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                animation: 'slideInToast 0.25s ease-out',
                pointerEvents: 'auto',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: colors.dot,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: '#f0ede8',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {toast.message}
              </span>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes slideInToast {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
