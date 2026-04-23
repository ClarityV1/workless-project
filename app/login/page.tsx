'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleMicrosoftLogin = async () => {
    const origin = window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${origin}/auth/callback`,
        scopes: 'email',
      },
    })
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f1117',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background gradient blobs */}
      <div
        style={{
          position: 'absolute',
          top: '-200px',
          left: '-200px',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(37,87,255,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-150px',
          right: '-150px',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(26,68,224,0.12) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* Login card */}
      <div
        style={{
          width: '420px',
          background: '#141922',
          border: '1px solid #242a38',
          borderRadius: '16px',
          padding: '48px 44px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              background: '#2557ff',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            📋
          </div>
          <span
            style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700,
              fontSize: '20px',
              color: '#f0ede8',
              letterSpacing: '-0.3px',
            }}
          >
            ShiftDesk
          </span>
        </div>

        {/* Heading */}
        <h1
          style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: '26px',
            color: '#f0ede8',
            margin: '0 0 8px 0',
            letterSpacing: '-0.5px',
          }}
        >
          Welcome back
        </h1>
        <p
          style={{
            color: '#7a8199',
            fontSize: '14px',
            margin: '0 0 28px 0',
            lineHeight: '1.5',
          }}
        >
          Sign in to manage your warehouse team
        </p>

        {/* Microsoft button */}
        <button
          onClick={handleMicrosoftLogin}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: '#f4f3ef',
            border: '1px solid #e0ddd6',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            color: '#0f1117',
            marginBottom: '20px',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#e8e5de')}
          onMouseLeave={e => (e.currentTarget.style.background = '#f4f3ef')}
        >
          {/* Microsoft logo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', width: '18px', height: '18px', flexShrink: 0 }}>
            <div style={{ background: '#f25022' }} />
            <div style={{ background: '#7fba00' }} />
            <div style={{ background: '#00a4ef' }} />
            <div style={{ background: '#ffb900' }} />
          </div>
          Continue with Microsoft
        </button>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: '#242a38' }} />
          <span style={{ color: '#4a5168', fontSize: '12px', whiteSpace: 'nowrap', fontFamily: 'DM Mono, monospace' }}>
            or use email
          </span>
          <div style={{ flex: 1, height: '1px', background: '#242a38' }} />
        </div>

        {/* Email/Password form */}
        <form onSubmit={handleEmailLogin}>
          <div style={{ marginBottom: '12px' }}>
            <label
              style={{
                display: 'block',
                color: '#7a8199',
                fontSize: '12px',
                fontFamily: 'DM Mono, monospace',
                marginBottom: '6px',
                letterSpacing: '0.05em',
              }}
            >
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={{
                width: '100%',
                padding: '11px 14px',
                background: '#1e2535',
                border: '1px solid #2a3245',
                borderRadius: '8px',
                color: '#f0ede8',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#2557ff')}
              onBlur={e => (e.currentTarget.style.borderColor = '#2a3245')}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                color: '#7a8199',
                fontSize: '12px',
                fontFamily: 'DM Mono, monospace',
                marginBottom: '6px',
                letterSpacing: '0.05em',
              }}
            >
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '11px 14px',
                background: '#1e2535',
                border: '1px solid #2a3245',
                borderRadius: '8px',
                color: '#f0ede8',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#2557ff')}
              onBlur={e => (e.currentTarget.style.borderColor = '#2a3245')}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(220,38,38,0.15)',
                border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: loading ? '#1a44e0' : '#2557ff',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'background 0.15s',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1a44e0' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#2557ff' }}
          >
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>
        </form>

        {/* Security note */}
        <p
          style={{
            color: '#4a5168',
            fontSize: '12px',
            textAlign: 'center',
            marginTop: '24px',
            lineHeight: '1.5',
          }}
        >
          🔒 Secured with Supabase Auth. Your data is encrypted and protected.
        </p>
      </div>
    </div>
  )
}
