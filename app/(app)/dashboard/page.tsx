'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import type { TeamMember, PerformanceLog, Review, Template, Profile } from '@/lib/types'

interface ActivityItem {
  id: string
  type: 'performance' | 'review'
  date: string
  memberName: string
  description: string
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DashboardPage() {
  const supabase = createClient()
  const { showToast } = useToast()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [logs, setLogs] = useState<PerformanceLog[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const [profileRes, membersRes, logsRes, reviewsRes, templatesRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('team_members').select('*').eq('manager_id', user.id),
          supabase
            .from('performance_logs')
            .select('*, team_members(first_name, last_name)')
            .eq('manager_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('reviews')
            .select('*, team_members(first_name, last_name)')
            .eq('manager_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase.from('templates').select('*').eq('manager_id', user.id),
        ])

        if (profileRes.data) setProfile(profileRes.data)
        if (membersRes.data) setMembers(membersRes.data)
        if (logsRes.data) setLogs(logsRes.data as PerformanceLog[])
        if (reviewsRes.data) setReviews(reviewsRes.data as Review[])
        if (templatesRes.data) setTemplates(templatesRes.data)
      } catch (err) {
        showToast('Failed to load dashboard data', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Count reviews this month
  const now = new Date()
  const reviewsThisMonth = reviews.filter(r => {
    const d = new Date(r.review_date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const onProbation = members.filter(m => m.status === 'Probation').length

  // Build activity feed
  const activity: ActivityItem[] = [
    ...logs.map(l => ({
      id: l.id,
      type: 'performance' as const,
      date: l.created_at,
      memberName: l.team_members
        ? `${l.team_members.first_name} ${l.team_members.last_name}`
        : 'Unknown',
      description: `Performance logged — Pick rate: ${l.pick_rate ?? 'N/A'}%`,
    })),
    ...reviews.map(r => ({
      id: r.id,
      type: 'review' as const,
      date: r.created_at,
      memberName: r.team_members
        ? `${r.team_members.first_name} ${r.team_members.last_name}`
        : 'Unknown',
      description: `${r.review_type} review created`,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  const greeting = getGreeting()
  const displayName = profile?.name?.split(' ')[0] || 'Manager'
  const todayStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const stats = [
    {
      label: 'Team Size',
      value: members.length,
      icon: '👥',
      color: '#2557ff',
      bg: 'rgba(37,87,255,0.08)',
    },
    {
      label: 'Reviews This Month',
      value: reviewsThisMonth,
      icon: '📝',
      color: '#16a34a',
      bg: 'rgba(22,163,74,0.08)',
    },
    {
      label: 'On Probation',
      value: onProbation,
      icon: '⚠',
      color: '#d97706',
      bg: 'rgba(217,119,6,0.08)',
    },
    {
      label: 'Templates',
      value: templates.length,
      icon: '📂',
      color: '#7c3aed',
      bg: 'rgba(124,58,237,0.08)',
    },
  ]

  return (
    <div style={{ padding: '40px 48px', maxWidth: '1100px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '36px',
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
            {greeting}, {displayName} 👋
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: '14px', margin: 0, fontFamily: 'DM Mono, monospace' }}>
            {todayStr}
          </p>
        </div>
        <Link
          href="/performance"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: '#2557ff',
            border: 'none',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'DM Sans, sans-serif',
            textDecoration: 'none',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1a44e0')}
          onMouseLeave={e => (e.currentTarget.style.background = '#2557ff')}
        >
          + Log Performance
        </Link>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '36px',
          }}
        >
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '24px',
                height: '100px',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '36px',
          }}
        >
          {stats.map(stat => (
            <div
              key={stat.label}
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '24px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: stat.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  marginBottom: '12px',
                }}
              >
                {stat.icon}
              </div>
              <div
                style={{
                  fontSize: '32px',
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 700,
                  color: stat.color,
                  lineHeight: 1,
                  marginBottom: '4px',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text2)',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activity feed */}
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
            padding: '20px 24px',
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
            Recent Activity
          </h2>
          <span
            style={{
              fontSize: '12px',
              color: 'var(--text2)',
              fontFamily: 'DM Mono, monospace',
            }}
          >
            Last 10 entries
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text2)' }}>
            Loading...
          </div>
        ) : activity.length === 0 ? (
          <div
            style={{
              padding: '48px',
              textAlign: 'center',
              color: 'var(--text2)',
              fontSize: '14px',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
            No activity yet. Start by logging performance or creating a review.
          </div>
        ) : (
          <div>
            {activity.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '14px 24px',
                  borderBottom: idx < activity.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background:
                      item.type === 'performance'
                        ? 'rgba(37,87,255,0.08)'
                        : 'rgba(22,163,74,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    flexShrink: 0,
                  }}
                >
                  {item.type === 'performance' ? '📈' : '📝'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--ink)',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    {item.memberName}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text2)',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    {item.description}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text2)',
                    fontFamily: 'DM Mono, monospace',
                    flexShrink: 0,
                  }}
                >
                  {formatDate(item.date)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
