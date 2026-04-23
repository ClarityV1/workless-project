'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/team', label: 'My Team', icon: '👥' },
  { href: '/calendar', label: 'Calendar', icon: '📅' },
  { href: '/performance', label: 'Performance', icon: '📈' },
  { href: '/import', label: 'Import Data', icon: '⬆️' },
  { href: '/reviews', label: 'Reviews & 1-2-1s', icon: '📝' },
  { href: '/templates', label: 'Templates', icon: '📂' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setUserEmail(user.email ?? '')

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) setProfile(data)
    }
    loadProfile()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const displayName = profile?.name || userEmail.split('@')[0] || 'Manager'
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      style={{
        width: '220px',
        minWidth: '220px',
        background: '#0f1117',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #1a1f2e',
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid #1a1f2e',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              background: '#2557ff',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              flexShrink: 0,
            }}
          >
            📋
          </div>
          <span
            style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700,
              fontSize: '17px',
              color: '#f0ede8',
              letterSpacing: '-0.3px',
            }}
          >
            ShiftDesk
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {navItems.map(item => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 20px',
                fontSize: '13.5px',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: isActive ? 500 : 400,
                color: isActive ? '#f0ede8' : '#6b7280',
                textDecoration: 'none',
                borderLeft: isActive ? '2px solid #2557ff' : '2px solid transparent',
                background: isActive ? '#1a1f2e' : 'transparent',
                transition: 'all 0.15s',
                marginBottom: '2px',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.color = '#d1d5db'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.color = '#6b7280'
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <span style={{ fontSize: '15px', flexShrink: 0, width: '20px', textAlign: 'center' }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User chip */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid #1a1f2e',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '10px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#2557ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'DM Mono, monospace',
              flexShrink: 0,
            }}
          >
            {initials || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: '#f0ede8',
                fontSize: '13px',
                fontWeight: 500,
                fontFamily: 'DM Sans, sans-serif',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                color: '#4a5168',
                fontSize: '11px',
                fontFamily: 'DM Mono, monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {profile?.role || 'Shift Manager'}
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            width: '100%',
            padding: '7px 10px',
            background: 'transparent',
            border: '1px solid #242a38',
            borderRadius: '7px',
            color: '#6b7280',
            fontSize: '12px',
            fontFamily: 'DM Sans, sans-serif',
            cursor: 'pointer',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#1a1f2e'
            e.currentTarget.style.color = '#f0ede8'
            e.currentTarget.style.borderColor = '#2a3245'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#6b7280'
            e.currentTarget.style.borderColor = '#242a38'
          }}
        >
          <span style={{ fontSize: '13px' }}>→</span>
          Sign out
        </button>
      </div>
    </div>
  )
}
