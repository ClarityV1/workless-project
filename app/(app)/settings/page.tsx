'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import type { Profile } from '@/lib/types'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: '#fff',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '14px',
  color: 'var(--ink)',
  fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
  transition: 'border-color 0.15s',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontFamily: 'DM Mono, monospace',
  color: 'var(--text2)',
  marginBottom: '5px',
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
}

export default function SettingsPage() {
  const supabase = createClient()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  const [form, setForm] = useState({
    name: '',
    role: 'Shift Manager',
    site: '',
    gemini_api_key: '',
  })

  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      setUserEmail(user.email || '')

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setForm({
          name: data.name || '',
          role: data.role || 'Shift Manager',
          site: data.site || '',
          gemini_api_key: data.gemini_api_key || '',
        })
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        name: form.name || null,
        role: form.role || 'Shift Manager',
        site: form.site || null,
        gemini_api_key: form.gemini_api_key || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    if (error) {
      showToast('Failed to save settings: ' + error.message, 'error')
    } else {
      showToast('Settings saved successfully', 'success')
    }
    setSaving(false)
  }

  return (
    <div style={{ padding: '40px 48px', maxWidth: '640px' }}>
      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <h1
          style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: '26px',
            color: 'var(--ink)',
            margin: '0 0 4px 0',
            letterSpacing: '-0.5px',
          }}
        >
          Settings
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: '13px', margin: 0 }}>
          Manage your profile and integrations
        </p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text2)', fontSize: '14px' }}>Loading settings...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Profile section */}
          <div
            style={{
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '28px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <h2
              style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: '16px',
                color: 'var(--ink)',
                margin: '0 0 20px 0',
              }}
            >
              Profile
            </h2>

            {userEmail && (
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Account Email</label>
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: 'var(--text2)',
                    fontFamily: 'DM Mono, monospace',
                  }}
                >
                  {userEmail}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Your Name</label>
              <input
                style={inputStyle}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Sarah Johnson"
                onFocus={e => (e.currentTarget.style.borderColor = '#2557ff')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Your Role</label>
              <input
                style={inputStyle}
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                placeholder="e.g. Shift Manager"
                onFocus={e => (e.currentTarget.style.borderColor = '#2557ff')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            <div>
              <label style={labelStyle}>Site / Depot</label>
              <input
                style={inputStyle}
                value={form.site}
                onChange={e => setForm(f => ({ ...f, site: e.target.value }))}
                placeholder="e.g. Birmingham DC, FC2"
                onFocus={e => (e.currentTarget.style.borderColor = '#2557ff')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>
          </div>

          {/* AI Integration section */}
          <div
            style={{
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '28px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <h2
                style={{
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 700,
                  fontSize: '16px',
                  color: 'var(--ink)',
                  margin: '0 0 4px 0',
                }}
              >
                AI Integration
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text2)' }}>
                Connect your Google Gemini API key to enable AI-powered review generation.
              </p>
            </div>

            <div>
              <label style={labelStyle}>Gemini API Key</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  style={{ ...inputStyle, paddingRight: '48px' }}
                  value={form.gemini_api_key}
                  onChange={e => setForm(f => ({ ...f, gemini_api_key: e.target.value }))}
                  placeholder="AIza..."
                  onFocus={e => (e.currentTarget.style.borderColor = '#2557ff')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(v => !v)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text2)',
                    fontSize: '16px',
                    padding: '4px',
                  }}
                >
                  {showApiKey ? '🙈' : '👁'}
                </button>
              </div>
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: '12px',
                  color: 'var(--text2)',
                  fontFamily: 'DM Mono, monospace',
                }}
              >
                Get your key at{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2557ff', textDecoration: 'none' }}
                >
                  aistudio.google.com
                </a>
              </p>
            </div>
          </div>

          {/* Save button */}
          <div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '12px 32px',
                background: '#2557ff',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                fontFamily: 'DM Sans, sans-serif',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#1a44e0' }}
              onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#2557ff' }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
