import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { ToastProvider } from '@/components/Toast'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <ToastProvider>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main
          style={{
            flex: 1,
            marginLeft: '220px',
            minHeight: '100vh',
            background: 'var(--surface)',
          }}
        >
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
