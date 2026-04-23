'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import type { TeamMember, PerformanceLog } from '@/lib/types'

const ATTENDANCE_OPTIONS = [
  'Full week',
  'Late arrival',
  'Early departure',
  'Absent – authorised',
  'Absent – unauthorised',
  'Partial week',
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: '#fff',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '14px',
  color: 'var(--ink)',
  fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
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

function getPickRateColor(value: number | null): string {
  if (value === null) return '#d0cdc4'
  if (value >= 95) return '#16a34a'
  if (value >= 85) return '#d97706'
  return '#dc2626'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PerformancePage() {
  const supabase = createClient()
  const { showToast } = useToast()

  const [members, setMembers] = useState<TeamMember[]>([])
  const [logs, setLogs] = useState<PerformanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    member_id: '',
    pick_rate: '',
    accuracy: '',
    attendance: 'Full week',
    notes: '',
    log_date: new Date().toISOString().split('T')[0],
  })

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const [membersRes, logsRes] = await Promise.all([
      supabase
        .from('team_members')
        .select('*')
        .eq('manager_id', user.id)
        .order('first_name'),
      supabase
        .from('performance_logs')
        .select('*, team_members(first_name, last_name)')
        .eq('manager_id', user.id)
        .order('log_date', { ascending: false })
        .limit(50),
    ])

    if (membersRes.data) setMembers(membersRes.data)
    if (logsRes.data) setLogs(logsRes.data as PerformanceLog[])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSave = async () => {
    if (!form.member_id) {
      showToast('Please select a team member', 'error')
      return
    }

    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('performance_logs').insert({
      manager_id: user.id,
      member_id: form.member_id,
      log_date: form.log_date,
      pick_rate: form.pick_rate ? parseFloat(form.pick_rate) : null,
      accuracy: form.accuracy ? parseFloat(form.accuracy) : null,
      attendance: form.attendance,
      notes: form.notes || null,
    })

    if (error) {
      showToast('Failed to save log: ' + error.message, 'error')
    } else {
      showToast('Performance logged successfully', 'success')
      setForm({
        member_id: '',
        pick_rate: '',
        accuracy: '',
        attendance: 'Full week',
        notes: '',
        log_date: new Date().toISOString().split('T')[0],
      })
      loadData()
    }
    setSaving(false)
  }

  return (
    <div style={{ padding: '40px 48px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
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
          Performance
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: '13px', margin: 0 }}>
          Log and track team performance metrics
        </p>
      </div>

      {/* Log form card */}
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '28px',
          marginBottom: '28px',
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
          Log Performance Entry
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          <div>
            <label style={labelStyle}>Team Member *</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.member_id}
              onChange={e => setForm(f => ({ ...f, member_id: e.target.value }))}
              onFocus={e => (e.currentTarget.style.borderColor = '#2557ff')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <option value="">Select member...</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              style={inputStyle}
              value={form.log_date}
              onChange={e => setForm(f => ({ ...f, log_date: e.target.value }))}
              onFocus={e => (e.currentTarget.style.borderColor = '#2557ff')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          <div>
            <label style={labelStyle}>Attendance</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.attendance}
              onChange={e => setForm(f => ({ ...f, attendance: e.target.value }))}
              onFocus={e => (e.currentTarget.style.borderColor = '#2557ff')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {ATTENDANCE_OPTIONS.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Pick Rate %</label>
            <input
              type="number"
              min="0"
              max="200"
              step="0.1"
              style={inputStyle}
              value={form.pick_rate}
              onChange={e => setForm(f => ({ ...f, pick_rate: e.target.value }))}
              placeholder="e.g. 98.5"
              onFocus={e => (e.currentTarget.style.borderColor = '#2557ff')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          <div>
            <label style={labelStyle}>Accuracy %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              style={inputStyle}
              value={form.accuracy}
              onChange={e => setForm(f => ({ ...f, accuracy: e.target.value }))}
              placeholder="e.g. 99.2"
              onFocus={e => (e.currentTarget.style.borderColor = '#2557ff')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            style={{
              ...inputStyle,
              minHeight: '80px',
              resize: 'vertical',
            }}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Any additional notes about this entry..."
            onFocus={e => (e.currentTarget.style.borderColor = '#2557ff')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 28px',
            background: '#2557ff',
            border: 'none',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'DM Sans, sans-serif',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#1a44e0' }}
          onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#2557ff' }}
        >
          {saving ? 'Saving...' : 'Save Entry'}
        </button>
      </div>

      {/* History table */}
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700,
              fontSize: '16px',
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            Performance History
          </h2>
          <span
            style={{
              fontSize: '12px',
              color: 'var(--text2)',
              fontFamily: 'DM Mono, monospace',
            }}
          >
            {logs.length} entries
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text2)' }}>
            Loading...
          </div>
        ) : logs.length === 0 ? (
          <div
            style={{
              padding: '48px',
              textAlign: 'center',
              color: 'var(--text2)',
              fontSize: '14px',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
            No performance logs yet. Log your first entry above.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Member', 'Date', 'Pick Rate', 'Accuracy', 'Attendance', 'Notes'].map(col => (
                    <th
                      key={col}
                      style={{
                        padding: '12px 20px',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontFamily: 'DM Mono, monospace',
                        color: 'var(--text2)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        fontWeight: 500,
                        background: '#fafaf9',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => {
                  const pickColor = getPickRateColor(log.pick_rate)
                  const accColor = getPickRateColor(log.accuracy)
                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: idx < logs.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 20px' }}>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: 'var(--ink)',
                            fontFamily: 'DM Sans, sans-serif',
                          }}
                        >
                          {log.team_members
                            ? `${log.team_members.first_name} ${log.team_members.last_name}`
                            : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            color: 'var(--text2)',
                            fontFamily: 'DM Mono, monospace',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatDate(log.log_date)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '120px' }}>
                          <div
                            style={{
                              flex: 1,
                              height: '6px',
                              background: 'var(--surface)',
                              borderRadius: '3px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${Math.min(log.pick_rate ?? 0, 100)}%`,
                                background: pickColor,
                                borderRadius: '3px',
                                transition: 'width 0.3s',
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: '13px',
                              fontFamily: 'DM Mono, monospace',
                              color: pickColor,
                              minWidth: '42px',
                              textAlign: 'right',
                            }}
                          >
                            {log.pick_rate !== null ? `${log.pick_rate}%` : '—'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '120px' }}>
                          <div
                            style={{
                              flex: 1,
                              height: '6px',
                              background: 'var(--surface)',
                              borderRadius: '3px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${Math.min(log.accuracy ?? 0, 100)}%`,
                                background: accColor,
                                borderRadius: '3px',
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: '13px',
                              fontFamily: 'DM Mono, monospace',
                              color: accColor,
                              minWidth: '42px',
                              textAlign: 'right',
                            }}
                          >
                            {log.accuracy !== null ? `${log.accuracy}%` : '—'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            color: 'var(--text2)',
                            fontFamily: 'DM Sans, sans-serif',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {log.attendance}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            color: 'var(--text2)',
                            fontFamily: 'DM Sans, sans-serif',
                            maxWidth: '200px',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={log.notes ?? ''}
                        >
                          {log.notes || '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
