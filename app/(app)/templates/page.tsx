'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import type { Template } from '@/lib/types'

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf': return '📄'
    case 'doc':
    case 'docx': return '📝'
    case 'txt': return '📃'
    default: return '📎'
  }
}

export default function TemplatesPage() {
  const supabase = createClient()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const loadTemplates = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('manager_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      showToast('Failed to load templates', 'error')
    } else {
      setTemplates(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const uploadFile = async (file: File) => {
    if (!file) return

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]

    if (!allowedTypes.includes(file.type)) {
      showToast('Only PDF, DOC, DOCX, and TXT files are allowed', 'error')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('File must be under 10MB', 'error')
      return
    }

    setUploading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const fileName = `${user.id}/${Date.now()}_${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('templates')
      .upload(fileName, file)

    if (uploadError) {
      showToast('Upload failed: ' + uploadError.message, 'error')
      setUploading(false)
      return
    }

    const { error: dbError } = await supabase.from('templates').insert({
      manager_id: user.id,
      name: file.name,
      size: file.size,
      storage_path: fileName,
    })

    if (dbError) {
      showToast('Failed to save template metadata: ' + dbError.message, 'error')
    } else {
      showToast(`"${file.name}" uploaded successfully`, 'success')
      loadTemplates()
    }
    setUploading(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  const handleDelete = async (template: Template) => {
    if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return

    if (template.storage_path) {
      await supabase.storage.from('templates').remove([template.storage_path])
    }

    const { error } = await supabase.from('templates').delete().eq('id', template.id)
    if (error) {
      showToast('Failed to delete template', 'error')
    } else {
      showToast(`"${template.name}" deleted`, 'success')
      loadTemplates()
    }
  }

  return (
    <div style={{ padding: '40px 48px', maxWidth: '900px' }}>
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
          Templates
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: '13px', margin: 0 }}>
          Upload and manage HR document templates
        </p>
      </div>

      {/* Upload zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? '#2557ff' : 'var(--border2)'}`,
          borderRadius: '14px',
          padding: '40px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: dragging ? 'rgba(37,87,255,0.04)' : '#fff',
          transition: 'all 0.2s',
          marginBottom: '28px',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={uploading}
        />
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'rgba(37,87,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            margin: '0 auto 16px',
          }}
        >
          {uploading ? '⟳' : '📤'}
        </div>
        {uploading ? (
          <div>
            <div
              style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 600,
                fontSize: '16px',
                color: 'var(--ink)',
                marginBottom: '4px',
              }}
            >
              Uploading...
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text2)' }}>
              Please wait
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 600,
                fontSize: '16px',
                color: 'var(--ink)',
                marginBottom: '4px',
              }}
            >
              {dragging ? 'Drop file here' : 'Click to upload or drag & drop'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text2)' }}>
              PDF, DOC, DOCX, TXT — max 10MB
            </div>
          </div>
        )}
      </div>

      {/* Template list */}
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
            Uploaded Templates
          </h2>
          <span
            style={{
              fontSize: '12px',
              color: 'var(--text2)',
              fontFamily: 'DM Mono, monospace',
            }}
          >
            {templates.length} file{templates.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text2)' }}>
            Loading...
          </div>
        ) : templates.length === 0 ? (
          <div
            style={{
              padding: '48px',
              textAlign: 'center',
              color: 'var(--text2)',
              fontSize: '14px',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📂</div>
            No templates uploaded yet. Upload your first document above.
          </div>
        ) : (
          <div>
            {templates.map((template, idx) => (
              <div
                key={template.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 24px',
                  borderBottom: idx < templates.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(37,87,255,0.06)',
                    border: '1px solid rgba(37,87,255,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0,
                  }}
                >
                  {getFileIcon(template.name)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--ink)',
                      fontFamily: 'DM Sans, sans-serif',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {template.name}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      marginTop: '2px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--text2)',
                        fontFamily: 'DM Mono, monospace',
                      }}
                    >
                      {formatFileSize(template.size)}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--text2)',
                        fontFamily: 'DM Mono, monospace',
                      }}
                    >
                      {formatDate(template.created_at)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(template)}
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
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.06)')}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
