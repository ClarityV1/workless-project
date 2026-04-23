'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TeamMember, PerformanceLog } from '@/lib/types'

const SHIFT_COLORS: Record<string, string> = {
  Night: '#2557ff',
  Day: '#16a34a',
  Twilight: '#d97706',
  Flexi: '#7c3aed',
}

const SHIFT_BG: Record<string, string> = {
  Night: 'rgba(37,87,255,0.1)',
  Day: 'rgba(22,163,74,0.1)',
  Twilight: 'rgba(217,119,6,0.1)',
  Flexi: 'rgba(124,58,237,0.1)',
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getInitials(first: string, last: string) {
  return `${first[0] || ''}${last[0] || ''}`.toUpperCase()
}

function formatProbDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isoDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function CalendarPage() {
  const supabase = createClient()

  const [members, setMembers] = useState<TeamMember[]>([])
  const [logs, setLogs] = useState<PerformanceLog[]>([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth()) // 0-indexed

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const [membersRes, logsRes] = await Promise.all([
        supabase.from('team_members').select('*').eq('manager_id', user.id),
        supabase
          .from('performance_logs')
          .select('*, team_members(first_name, last_name)')
          .eq('manager_id', user.id),
      ])

      if (membersRes.data) setMembers(membersRes.data)
      if (logsRes.data) setLogs(logsRes.data as PerformanceLog[])
      setLoading(false)
    }
    load()
  }, [])

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(y => y - 1)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(y => y + 1)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay = new Date(viewYear, viewMonth + 1, 0)
  const daysInMonth = lastDay.getDate()

  // Monday-first: getDay() returns 0=Sun,1=Mon,...,6=Sat
  // We want Mon=0,...,Sun=6
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7
  const cellCount = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7

  const cells: (number | null)[] = []
  for (let i = 0; i < cellCount; i++) {
    const dayNum = i - firstDayOfWeek + 1
    cells.push(dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null)
  }

  // Index events by date string
  const probationByDate: Record<string, TeamMember[]> = {}
  for (const m of members) {
    if (m.probation_end_date) {
      const key = m.probation_end_date.split('T')[0]
      if (!probationByDate[key]) probationByDate[key] = []
      probationByDate[key].push(m)
    }
  }

  const logsByDate: Record<string, PerformanceLog[]> = {}
  for (const log of logs) {
    const key = log.log_date.split('T')[0]
    if (!logsByDate[key]) logsByDate[key] = []
    logsByDate[key].push(log)
  }

  const monthName = firstDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const todayStr = isoDateStr(now.getFullYear(), now.getMonth(), now.getDate())

  return (
    <div style={{ padding: '40px 48px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
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
          Calendar
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: '13px', margin: 0 }}>
          Shift patterns and key dates
        </p>
      </div>

      {/* Month navigation + legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={prevMonth}
            style={{
              padding: '7px 14px',
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--ink)',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            ← Prev
          </button>
          <span
            style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700,
              fontSize: '17px',
              color: 'var(--ink)',
              minWidth: '160px',
              textAlign: 'center',
            }}
          >
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            style={{
              padding: '7px 14px',
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--ink)',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            Next →
          </button>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {Object.entries(SHIFT_COLORS).map(([shift, color]) => (
            <div key={shift} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '3px',
                  background: color,
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  fontFamily: 'DM Mono, monospace',
                  color: 'var(--text2)',
                }}
              >
                {shift}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '3px',
                background: '#dc2626',
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontFamily: 'DM Mono, monospace',
                color: 'var(--text2)',
              }}
            >
              Probation
            </span>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          marginBottom: '28px',
        }}
      >
        {/* Day labels */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {DAY_LABELS.map(d => (
            <div
              key={d}
              style={{
                padding: '10px 0',
                textAlign: 'center',
                fontSize: '11px',
                fontFamily: 'DM Mono, monospace',
                color: 'var(--text2)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: '#fafaf9',
                borderRight: '1px solid var(--border)',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text2)' }}>
            Loading...
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
            }}
          >
            {cells.map((day, idx) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${idx}`}
                    style={{
                      minHeight: '120px',
                      background: '#fafaf9',
                      borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
                      borderBottom: idx < cellCount - 7 ? '1px solid var(--border)' : 'none',
                    }}
                  />
                )
              }

              const dateKey = isoDateStr(viewYear, viewMonth, day)
              const dayProbs = probationByDate[dateKey] || []
              const dayLogs = logsByDate[dateKey] || []
              const isToday = dateKey === todayStr
              const hasProbation = dayProbs.length > 0

              return (
                <div
                  key={dateKey}
                  style={{
                    minHeight: '120px',
                    padding: '8px',
                    borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
                    borderBottom: idx < cellCount - 7 ? '1px solid var(--border)' : 'none',
                    background: hasProbation
                      ? 'rgba(220,38,38,0.03)'
                      : isToday
                      ? 'rgba(37,87,255,0.02)'
                      : 'transparent',
                    position: 'relative',
                  }}
                >
                  {/* Day number */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginBottom: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        fontFamily: 'DM Mono, monospace',
                        color: isToday ? '#fff' : 'var(--text2)',
                        background: isToday ? '#2557ff' : 'transparent',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: isToday ? 700 : 400,
                      }}
                    >
                      {day}
                    </span>
                  </div>

                  {/* Probation events */}
                  {dayProbs.map(m => (
                    <div
                      key={m.id}
                      title={`${m.first_name} ${m.last_name} — Probation ends`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        background: 'rgba(220,38,38,0.1)',
                        border: '1px solid rgba(220,38,38,0.2)',
                        borderRadius: '12px',
                        marginBottom: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      <span style={{ fontSize: '10px' }}>🔴</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: 'DM Mono, monospace',
                          color: '#dc2626',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {getInitials(m.first_name, m.last_name)} — Probation ends
                      </span>
                    </div>
                  ))}

                  {/* Performance log pills */}
                  {dayLogs.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        background: 'rgba(107,104,120,0.08)',
                        border: '1px solid rgba(107,104,120,0.15)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: 'DM Mono, monospace',
                          color: 'var(--text2)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {dayLogs.length === 1
                          ? `${dayLogs[0].team_members ? getInitials(dayLogs[0].team_members.first_name, dayLogs[0].team_members.last_name) : '?'} logged`
                          : `${dayLogs.length} logs`}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Team Shifts section */}
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
            Team Shifts
          </h2>
          <span
            style={{
              fontSize: '12px',
              color: 'var(--text2)',
              fontFamily: 'DM Mono, monospace',
            }}
          >
            {members.length} member{members.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text2)' }}>
            Loading...
          </div>
        ) : members.length === 0 ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--text2)',
              fontSize: '14px',
            }}
          >
            No team members yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Member', 'Shift', 'Status', 'Probation End Date'].map(col => (
                  <th
                    key={col}
                    style={{
                      padding: '10px 20px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontFamily: 'DM Mono, monospace',
                      color: 'var(--text2)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
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
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: member.color,
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
                        {getInitials(member.first_name, member.last_name)}
                      </div>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: 'var(--ink)',
                          fontFamily: 'DM Sans, sans-serif',
                        }}
                      >
                        {member.first_name} {member.last_name}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        background: SHIFT_BG[member.shift] || 'rgba(107,104,120,0.1)',
                        color: SHIFT_COLORS[member.shift] || 'var(--text2)',
                        fontSize: '12px',
                        fontFamily: 'DM Mono, monospace',
                        fontWeight: 500,
                        border: `1px solid ${SHIFT_COLORS[member.shift] || 'rgba(107,104,120,0.2)'}30`,
                      }}
                    >
                      {member.shift}
                    </span>
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontFamily: 'DM Mono, monospace',
                        color: 'var(--text2)',
                      }}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    {member.probation_end_date ? (
                      <span
                        style={{
                          fontSize: '12px',
                          fontFamily: 'DM Mono, monospace',
                          color: '#dc2626',
                          background: 'rgba(220,38,38,0.06)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {formatProbDate(member.probation_end_date)}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '12px',
                          fontFamily: 'DM Mono, monospace',
                          color: 'var(--text2)',
                        }}
                      >
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
