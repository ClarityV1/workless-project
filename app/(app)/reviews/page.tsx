'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import type { TeamMember, Review } from '@/lib/types'

const REVIEW_TYPES = [
  '1-2-1 Discussion',
  'Probation Review',
  'Performance Review',
  'Return to Work',
  'Disciplinary',
]

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ReviewsPage() {
  const supabase = createClient()
  const { showToast } = useToast()

  const [members, setMembers] = useState<TeamMember[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  const [selectedMember, setSelectedMember] = useState('')
  const [reviewType, setReviewType] = useState(REVIEW_TYPES[0])
  const [generatedText, setGeneratedText] = useState('')
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().split('T')[0])

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const [membersRes, reviewsRes] = await Promise.all([
      supabase
        .from('team_members')
        .select('*')
        .eq('manager_id', user.id)
        .order('first_name'),
      supabase
        .from('reviews')
        .select('*, team_members(first_name, last_name)')
        .eq('manager_id', user.id)
        .order('created_at', { ascending: false }),
    ])

    if (membersRes.data) setMembers(membersRes.data)
    if (reviewsRes.data) setReviews(reviewsRes.data as Review[])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleGenerate = async () => {
    if (!selectedMember) {
      showToast('Please select a team member', 'error')
      return
    }

    setGenerating(true)
    setGeneratedText('')

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: selectedMember,
          review_type: reviewType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed')
      }

      setGeneratedText(data.text)
      showToast('Review generated successfully', 'success')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate review'
      showToast(message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedText) return
    await navigator.clipboard.writeText(generatedText)
    showToast('Copied to clipboard', 'success')
  }

  const handleSave = async () => {
    if (!selectedMember || !generatedText) {
      showToast('Generate a review first', 'error')
      return
    }

    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('reviews').insert({
      manager_id: user.id,
      member_id: selectedMember,
      review_type: reviewType,
      content: generatedText,
      review_date: reviewDate,
    })

    if (error) {
      showToast('Failed to save review: ' + error.message, 'error')
    } else {
      showToast('Review saved', 'success')
      loadData()
    }
    setSaving(false)
  }

  const handleDeleteReview = async (id: string) => {
    if (!confirm('Delete this review?')) return
    const { error } = await supabase.from('reviews').delete().eq('id', id)
    if (error) {
      showToast('Failed to delete review', 'error')
    } else {
      showToast('Review deleted', 'success')
      loadData()
    }
  }

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: '#1e2535',
    border: '1px solid #2a3245',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#f0ede8',
    fontFamily: 'DM Sans, sans-serif',
    outline: 'none',
    cursor: 'pointer',
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
          Reviews & 1-2-1s
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: '13px', margin: 0 }}>
          AI-powered review generation and record keeping
        </p>
      </div>

      {/* AI Panel */}
      <div
        style={{
          background: '#0f1117',
          border: '1px solid #1a1f2e',
          borderRadius: '16px',
          padding: '28px',
          marginBottom: '28px',
        }}
      >
        {/* Panel header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#16a34a',
              boxShadow: '0 0 8px #16a34a',
              animation: 'pulse-green 2s infinite',
            }}
          />
          <span
            style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700,
              fontSize: '16px',
              color: '#f0ede8',
            }}
          >
            AI Review Generator
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '11px',
              fontFamily: 'DM Mono, monospace',
              color: '#4a5168',
              padding: '3px 8px',
              background: '#1a1f2e',
              borderRadius: '6px',
            }}
          >
            Gemini 1.5 Flash
          </span>
        </div>

        {/* Controls */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            gap: '12px',
            marginBottom: '20px',
            alignItems: 'end',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontFamily: 'DM Mono, monospace',
                color: '#4a5168',
                marginBottom: '5px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase' as const,
              }}
            >
              Team Member
            </label>
            <select
              style={selectStyle}
              value={selectedMember}
              onChange={e => setSelectedMember(e.target.value)}
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
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontFamily: 'DM Mono, monospace',
                color: '#4a5168',
                marginBottom: '5px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase' as const,
              }}
            >
              Review Type
            </label>
            <select
              style={selectStyle}
              value={reviewType}
              onChange={e => setReviewType(e.target.value)}
            >
              {REVIEW_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: '10px 24px',
              background: generating ? '#1a44e0' : '#2557ff',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif',
              cursor: generating ? 'not-allowed' : 'pointer',
              opacity: generating ? 0.7 : 1,
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={e => { if (!generating) e.currentTarget.style.background = '#1a44e0' }}
            onMouseLeave={e => { if (!generating) e.currentTarget.style.background = '#2557ff' }}
          >
            {generating ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                Generating...
              </>
            ) : (
              <>Generate ✦</>
            )}
          </button>
        </div>

        {/* Output area */}
        <div
          style={{
            background: '#0a0d14',
            border: '1px solid #1a1f2e',
            borderRadius: '10px',
            padding: '20px',
            minHeight: '200px',
            marginBottom: '16px',
            position: 'relative',
          }}
        >
          {generating ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '160px',
                gap: '12px',
                color: '#4a5168',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  animation: 'spin 1s linear infinite',
                  fontSize: '20px',
                }}
              >
                ⟳
              </span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '13px' }}>
                Generating review with Gemini AI...
              </span>
            </div>
          ) : generatedText ? (
            <pre
              style={{
                margin: 0,
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
                color: '#d1d5db',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {generatedText}
            </pre>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '160px',
                color: '#2a3245',
                fontFamily: 'DM Mono, monospace',
                fontSize: '13px',
              }}
            >
              Select a member and click Generate ✦
            </div>
          )}
        </div>

        {/* Actions row */}
        {generatedText && (
          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
            }}
          >
            <button
              onClick={handleCopy}
              style={{
                padding: '8px 18px',
                background: 'transparent',
                border: '1px solid #2a3245',
                borderRadius: '8px',
                color: '#9096a8',
                fontSize: '13px',
                fontFamily: 'DM Sans, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#1a1f2e'
                e.currentTarget.style.color = '#f0ede8'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#9096a8'
              }}
            >
              📋 Copy
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <input
                type="date"
                value={reviewDate}
                onChange={e => setReviewDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: '#1e2535',
                  border: '1px solid #2a3245',
                  borderRadius: '8px',
                  color: '#f0ede8',
                  fontSize: '13px',
                  fontFamily: 'DM Mono, monospace',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '8px 18px',
                  background: '#16a34a',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#15803d' }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#16a34a' }}
              >
                {saving ? 'Saving...' : '💾 Save Review'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Saved reviews */}
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
            Saved Reviews
          </h2>
          <span
            style={{
              fontSize: '12px',
              color: 'var(--text2)',
              fontFamily: 'DM Mono, monospace',
            }}
          >
            {reviews.length} total
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text2)' }}>
            Loading...
          </div>
        ) : reviews.length === 0 ? (
          <div
            style={{
              padding: '48px',
              textAlign: 'center',
              color: 'var(--text2)',
              fontSize: '14px',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📝</div>
            No saved reviews yet. Generate and save your first review above.
          </div>
        ) : (
          <div>
            {reviews.map((review, idx) => (
              <div
                key={review.id}
                style={{
                  padding: '20px 24px',
                  borderBottom: idx < reviews.length - 1 ? '1px solid var(--border)' : 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '6px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontWeight: 600,
                          fontSize: '14px',
                          color: 'var(--ink)',
                        }}
                      >
                        {review.team_members
                          ? `${review.team_members.first_name} ${review.team_members.last_name}`
                          : 'Unknown'}
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          background: 'rgba(37,87,255,0.08)',
                          border: '1px solid rgba(37,87,255,0.15)',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontFamily: 'DM Mono, monospace',
                          color: '#2557ff',
                        }}
                      >
                        {review.review_type}
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--text2)',
                          fontFamily: 'DM Mono, monospace',
                        }}
                      >
                        {formatDate(review.review_date)}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        color: 'var(--text2)',
                        lineHeight: 1.6,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontFamily: 'DM Sans, sans-serif',
                      }}
                    >
                      {review.content}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteReview(review.id)}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(220,38,38,0.06)',
                      border: '1px solid rgba(220,38,38,0.15)',
                      borderRadius: '7px',
                      color: '#dc2626',
                      fontSize: '12px',
                      fontFamily: 'DM Sans, sans-serif',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.12)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.06)')}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse-green {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #16a34a; }
          50% { opacity: 0.6; box-shadow: 0 0 16px #16a34a; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
