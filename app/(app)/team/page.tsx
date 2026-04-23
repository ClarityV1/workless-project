'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import Modal from '@/components/Modal'
import type { TeamMember, PerformanceLog, Review } from '@/lib/types'

const MEMBER_COLORS = [
  '#2557ff',
  '#16a34a',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#be185d',
  '#059669',
]

const SHIFTS = ['Night', 'Day', 'Twilight', 'Flexi'] as const
const STATUSES = ['Active', 'Probation', 'Absence', 'Performance Plan'] as const

function getStatusStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'Active':
      return { background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)' }
    case 'Probation':
      return { background: 'rgba(217,119,6,0.1)', color: '#d97706', border: '1px solid rgba(217,119,6,0.2)' }
    case 'Absence':
      return { background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }
    case 'Performance Plan':
      return { background: 'rgba(37,87,255,0.1)', color: '#2557ff', border: '1px solid rgba(37,87,255,0.2)' }
    default:
      return { background: 'rgba(107,104,120,0.1)', color: '#6b6878', border: '1px solid rgba(107,104,120,0.2)' }
  }
}

function getInitials(first: string, last: string) {
  return `${first[0] || ''}${last[0] || ''}`.toUpperCase()
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
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

export default function TeamPage() {
  const supabase = createClient()
  const { showToast } = useToast()

  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [memberLogs, setMemberLogs] = useState<PerformanceLog[]>([])
  const [memberReviews, setMemberReviews] = useState<Review[]>([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    role: 'Operative',
    shift: 'Night' as typeof SHIFTS[number],
    start_date: '',
    status: 'Active' as typeof STATUSES[number],
    notes: '',
    probation_end_date: '',
  })

  const loadMembers = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('manager_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      showToast('Failed to load team members', 'error')
    } else {
      setMembers(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const handleAddMember = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      showToast('First name and last name are required', 'error')
      return
    }

    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const colorIndex = members.length % MEMBER_COLORS.length
    const { error } = await supabase.from('team_members').insert({
      manager_id: user.id,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      role: form.role || 'Operative',
      shift: form.shift,
      start_date: form.start_date || null,
      status: form.status,
      notes: form.notes || null,
      color: MEMBER_COLORS[colorIndex],
      probation_end_date: form.status === 'Probation' && form.probation_end_date ? form.probation_end_date : null,
    })

    if (error) {
      showToast('Failed to add member: ' + error.message, 'error')
    } else {
      showToast('Team member added successfully', 'success')
      setAddOpen(false)
      setForm({
        first_name: '',
        last_name: '',
        role: 'Operative',
        shift: 'Night',
        start_date: '',
        status: 'Active',
        notes: '',
        probation_end_date: '',
      })
      loadMembers()
    }
    setSaving(false)
  }

  const handleRemoveMember = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from your team? This cannot be undone.`)) return

    const { error } = await supabase.from('team_members').delete().eq('id', id)
    if (error) {
      showToast('Failed to remove member', 'error')
    } else {
      showToast(`${name} removed`, 'success')
      loadMembers()
    }
  }

  const handleOpenProfile = async (member: TeamMember) => {
    setSelectedMember(member)
    setProfileOpen(true)

    const [logsRes, reviewsRes] = await Promise.all([
      supabase
        .from('performance_logs')
        .select('*')
        .eq('member_id', member.id)
        .order('log_date', { ascending: false })
        .limit(5),
      supabase
        .from('reviews')
        .select('*')
        .eq('member_id', member.id)
        .order('review_date', { ascending: false })
        .limit(5),
    ])

    setMemberLogs((logsRes.data || []) as PerformanceLog[])
    setMemberReviews((reviewsRes.data || []) as Review[])
  }

  return (
    <div style={{ padding: '40px 48px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px',
        }}
      >
        <div>
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
            My Team
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: '13px', margin: 0 }}>
            {members.length} team member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          style={{
            padding: '10px 20px',
            background: '#2557ff',
            border: 'none',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'DM Sans, sans-serif',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1a44e0')}
          onMouseLeave={e => (e.currentTarget.style.background = '#2557ff')}
        >
          + Add Member
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text2)' }}>
            Loading team...
          </div>
        ) : members.length === 0 ? (
          <div
            style={{
              padding: '64px 48px',
              textAlign: 'center',
              color: 'var(--text2)',
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>👤</div>
            <div
              style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 600,
                fontSize: '16px',
                color: 'var(--ink)',
                marginBottom: '8px',
              }}
            >
              No team members yet
            </div>
            <div style={{ fontSize: '14px', marginBottom: '24px' }}>
              Add your first team member to get started.
            </div>
            <button
              onClick={() => setAddOpen(true)}
              style={{
                padding: '10px 24px',
                background: '#2557ff',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Add Member
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Role', 'Shift', 'Status', 'Start Date', 'Actions'].map(col => (
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
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((member, idx) => (
                <tr
                  key={member.id}
                  style={{
                    borderBottom: idx < members.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Name */}
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: member.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: 700,
                          fontFamily: 'DM Mono, monospace',
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(member.first_name, member.last_name)}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: 'var(--ink)',
                            fontFamily: 'DM Sans, sans-serif',
                          }}
                        >
                          {member.first_name} {member.last_name}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td style={{ padding: '14px 20px' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        color: 'var(--text2)',
                        fontFamily: 'DM Sans, sans-serif',
                      }}
                    >
                      {member.role}
                    </span>
                  </td>

                  {/* Shift */}
                  <td style={{ padding: '14px 20px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        background: 'rgba(107,104,120,0.1)',
                        color: 'var(--text2)',
                        fontSize: '12px',
                        fontFamily: 'DM Mono, monospace',
                        border: '1px solid rgba(107,104,120,0.15)',
                      }}
                    >
                      {member.shift}
                    </span>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '14px 20px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontFamily: 'DM Mono, monospace',
                        fontWeight: 500,
                        ...getStatusStyle(member.status),
                      }}
                    >
                      {member.status}
                    </span>
                  </td>

                  {/* Start Date */}
                  <td style={{ padding: '14px 20px' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        color: 'var(--text2)',
                        fontFamily: 'DM Mono, monospace',
                      }}
                    >
                      {formatDate(member.start_date)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleOpenProfile(member)}
                        style={{
                          padding: '6px 14px',
                          background: 'rgba(37,87,255,0.08)',
                          border: '1px solid rgba(37,87,255,0.2)',
                          borderRadius: '7px',
                          color: '#2557ff',
                          fontSize: '12px',
                          fontFamily: 'DM Sans, sans-serif',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(37,87,255,0.15)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(37,87,255,0.08)'
                        }}
                      >
                        Profile
                      </button>
                      <button
                        onClick={() =>
                          handleRemoveMember(
                            member.id,
                            `${member.first_name} ${member.last_name}`
                          )
                        }
                        style={{
                          padding: '6px 14px',
                          background: 'rgba(220,38,38,0.06)',
                          border: '1px solid rgba(220,38,38,0.15)',
                          borderRadius: '7px',
                          color: '#dc2626',
                          fontSize: '12px',
                          fontFamily: 'DM Sans, sans-serif',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(220,38,38,0.12)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(220,38,38,0.06)'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Member Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Team Member"
        footer={
          <>
            <button
              onClick={() => setAddOpen(false)}
              style={{
                padding: '9px 20px',
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text2)',
                fontSize: '14px',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAddMember}
              disabled={saving}
              style={{
                padding: '9px 24px',
                background: '#2557ff',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Adding...' : 'Add Member'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>First Name *</label>
            <input
              style={inputStyle}
              value={form.first_name}
              onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              placeholder="John"
              onFocus={e => (e.currentTarget.style.borderColor = '#2557ff')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>
          <div>
            <label style={labelStyle}>Last Name *</label>
            <input
              style={inputStyle}
              value={form.last_name}
              onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              placeholder="Smith"
              onFocus={e => (e.currentTarget.style.borderColor = '#2557ff')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <input
              style={inputStyle}
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              placeholder="Operative"
              onFocus={e => (e.currentTarget.style.borderColor = '#2557ff')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>
          <div>
            <label style={labelStyle}>Shift</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.shift}
              onChange={e => setForm(f => ({ ...f, shift: e.target.value as typeof SHIFTS[number] }))}
            >
              {SHIFTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Start Date</label>
            <input
              type="date"
              style={inputStyle}
              value={form.start_date}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              onFocus={e => (e.currentTarget.style.borderColor = '#2557ff')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof STATUSES[number] }))}
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {form.status === 'Probation' && (
            <div>
              <label style={labelStyle}>Probation End Date</label>
              <input
                type="date"
                style={inputStyle}
                value={form.probation_end_date}
                onChange={e => setForm(f => ({ ...f, probation_end_date: e.target.value }))}
                onFocus={e => (e.currentTarget.style.borderColor = '#2557ff')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{
                ...inputStyle,
                minHeight: '80px',
                resize: 'vertical',
              }}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any additional notes..."
              onFocus={e => (e.currentTarget.style.borderColor = '#2557ff')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>
        </div>
      </Modal>

      {/* Profile Modal */}
      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title={selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}` : ''}
        wide
      >
        {selectedMember && (
          <div>
            {/* Member details */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '24px',
                padding: '20px',
                background: 'var(--surface)',
                borderRadius: '12px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: selectedMember.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '20px',
                  fontWeight: 700,
                  fontFamily: 'DM Mono, monospace',
                  flexShrink: 0,
                }}
              >
                {getInitials(selectedMember.first_name, selectedMember.last_name)}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'Syne, sans-serif',
                    fontWeight: 700,
                    fontSize: '18px',
                    color: 'var(--ink)',
                    marginBottom: '4px',
                  }}
                >
                  {selectedMember.first_name} {selectedMember.last_name}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '13px', color: 'var(--text2)' }}>
                    {selectedMember.role}
                  </span>
                  <span style={{ color: 'var(--border2)', fontSize: '12px' }}>•</span>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontFamily: 'DM Mono, monospace',
                      ...getStatusStyle(selectedMember.status),
                    }}
                  >
                    {selectedMember.status}
                  </span>
                  <span style={{ color: 'var(--border2)', fontSize: '12px' }}>•</span>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontFamily: 'DM Mono, monospace',
                      background: 'rgba(107,104,120,0.1)',
                      color: 'var(--text2)',
                    }}
                  >
                    {selectedMember.shift} shift
                  </span>
                </div>
                {selectedMember.start_date && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text2)',
                      fontFamily: 'DM Mono, monospace',
                      marginTop: '4px',
                    }}
                  >
                    Started: {formatDate(selectedMember.start_date)}
                  </div>
                )}
                {selectedMember.probation_end_date && (
                  <div
                    style={{
                      fontSize: '12px',
                      fontFamily: 'DM Mono, monospace',
                      color: '#dc2626',
                      marginTop: '4px',
                    }}
                  >
                    Probation ends: {formatDate(selectedMember.probation_end_date)}
                  </div>
                )}
              </div>
            </div>

            {selectedMember.notes && (
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontFamily: 'DM Mono, monospace',
                    color: 'var(--text2)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}
                >
                  Notes
                </div>
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--text2)',
                    fontFamily: 'DM Sans, sans-serif',
                    lineHeight: 1.6,
                    margin: 0,
                    padding: '12px 16px',
                    background: 'var(--surface)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  {selectedMember.notes}
                </p>
              </div>
            )}

            {/* Recent Performance */}
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontFamily: 'DM Mono, monospace',
                  color: 'var(--text2)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                }}
              >
                Recent Performance
              </div>
              {memberLogs.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text2)', fontStyle: 'italic' }}>
                  No performance logs yet.
                </p>
              ) : (
                <div
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                  }}
                >
                  {memberLogs.map((log, i) => (
                    <div
                      key={log.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: i < memberLogs.length - 1 ? '1px solid var(--border)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        fontSize: '13px',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'DM Mono, monospace',
                          color: 'var(--text2)',
                          minWidth: '90px',
                        }}
                      >
                        {formatDate(log.log_date)}
                      </span>
                      <span style={{ color: 'var(--text2)' }}>
                        Pick: <strong style={{ color: 'var(--ink)' }}>{log.pick_rate ?? '—'}%</strong>
                      </span>
                      <span style={{ color: 'var(--text2)' }}>
                        Acc: <strong style={{ color: 'var(--ink)' }}>{log.accuracy ?? '—'}%</strong>
                      </span>
                      <span style={{ color: 'var(--text2)' }}>{log.attendance}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Saved Reviews */}
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontFamily: 'DM Mono, monospace',
                  color: 'var(--text2)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                }}
              >
                Saved Reviews
              </div>
              {memberReviews.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text2)', fontStyle: 'italic' }}>
                  No reviews saved yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {memberReviews.map(review => (
                    <div
                      key={review.id}
                      style={{
                        padding: '12px 16px',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        fontSize: '13px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 500,
                            color: 'var(--ink)',
                            fontFamily: 'DM Sans, sans-serif',
                          }}
                        >
                          {review.review_type}
                        </span>
                        <span
                          style={{
                            color: 'var(--text2)',
                            fontFamily: 'DM Mono, monospace',
                            fontSize: '12px',
                          }}
                        >
                          {formatDate(review.review_date)}
                        </span>
                      </div>
                      <p
                        style={{
                          color: 'var(--text2)',
                          margin: 0,
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {review.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
