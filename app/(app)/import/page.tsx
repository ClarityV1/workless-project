'use client'

import { useEffect, useRef, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import type { TeamMember } from '@/lib/types'

type FieldTarget =
  | 'member_name'
  | 'date'
  | 'pick_rate'
  | 'accuracy'
  | 'attendance'
  | 'notes'
  | 'ignore'

const FIELD_OPTIONS: { value: FieldTarget; label: string }[] = [
  { value: 'member_name', label: 'Member Name' },
  { value: 'date', label: 'Date' },
  { value: 'pick_rate', label: 'Pick Rate %' },
  { value: 'accuracy', label: 'Accuracy %' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'notes', label: 'Notes' },
  { value: 'ignore', label: '— Ignore —' },
]

interface ParsedData {
  headers: string[]
  rows: Record<string, string>[]
}

interface MappedRow {
  member_name: string
  date: string
  pick_rate: string
  accuracy: string
  attendance: string
  notes: string
}

interface MatchedRow {
  member_id: string
  member_name: string
  date: string
  pick_rate: number | null
  accuracy: number | null
  attendance: string
  notes: string | null
  matched: boolean
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontFamily: 'DM Mono, monospace',
  color: 'var(--text2)',
  marginBottom: '5px',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
}

export default function ImportPage() {
  const supabase = createClient()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [dragging, setDragging] = useState(false)
  const [parsed, setParsed] = useState<ParsedData | null>(null)
  const [fileName, setFileName] = useState('')
  const [mapping, setMapping] = useState<Record<string, FieldTarget>>({})
  const [matchedRows, setMatchedRows] = useState<MatchedRow[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    const loadMembers = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('team_members')
        .select('*')
        .eq('manager_id', user.id)
      if (data) setMembers(data)
    }
    loadMembers()
  }, [])

  function guessMapping(headers: string[]): Record<string, FieldTarget> {
    const map: Record<string, FieldTarget> = {}
    for (const h of headers) {
      const lower = h.toLowerCase().trim()
      if (lower.includes('name') || lower.includes('member') || lower.includes('employee')) {
        map[h] = 'member_name'
      } else if (lower.includes('date') || lower.includes('week') || lower.includes('day')) {
        map[h] = 'date'
      } else if (lower.includes('pick') || lower.includes('rate') || lower.includes('uph')) {
        map[h] = 'pick_rate'
      } else if (lower.includes('acc') || lower.includes('quality')) {
        map[h] = 'accuracy'
      } else if (lower.includes('attend') || lower.includes('absence')) {
        map[h] = 'attendance'
      } else if (lower.includes('note') || lower.includes('comment')) {
        map[h] = 'notes'
      } else {
        map[h] = 'ignore'
      }
    }
    return map
  }

  function parseFile(file: File) {
    setFileName(file.name)
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: result => {
          const headers = result.meta.fields || []
          const rows = result.data as Record<string, string>[]
          const data: ParsedData = { headers, rows }
          setParsed(data)
          setMapping(guessMapping(headers))
          setStep(2)
        },
        error: () => showToast('Failed to parse CSV file', 'error'),
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[]
          const rows = jsonData.map(r =>
            Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v)]))
          )
          const headers = rows.length > 0 ? Object.keys(rows[0]) : []
          const parsedData: ParsedData = { headers, rows }
          setParsed(parsedData)
          setMapping(guessMapping(headers))
          setStep(2)
        } catch {
          showToast('Failed to parse Excel file', 'error')
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      showToast('Please upload a .csv, .xlsx, or .xls file', 'error')
    }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  function proceedToReview() {
    if (!parsed) return

    const mappedRows: MappedRow[] = parsed.rows.map(row => {
      const out: MappedRow = {
        member_name: '',
        date: '',
        pick_rate: '',
        accuracy: '',
        attendance: '',
        notes: '',
      }
      for (const header of parsed.headers) {
        const target = mapping[header]
        if (target && target !== 'ignore') {
          out[target] = row[header] || ''
        }
      }
      return out
    })

    // Match members
    const matched: MatchedRow[] = mappedRows.map(r => {
      const nameLower = r.member_name.trim().toLowerCase()
      const member = members.find(m => {
        const full = `${m.first_name} ${m.last_name}`.toLowerCase()
        return full === nameLower
      })
      return {
        member_id: member?.id || '',
        member_name: r.member_name,
        date: r.date,
        pick_rate: r.pick_rate ? parseFloat(r.pick_rate) : null,
        accuracy: r.accuracy ? parseFloat(r.accuracy) : null,
        attendance: r.attendance || 'Full week',
        notes: r.notes || null,
        matched: !!member,
      }
    })

    setMatchedRows(matched)
    setStep(3)
  }

  async function handleImport() {
    const readyRows = matchedRows.filter(r => r.matched)
    if (readyRows.length === 0) {
      showToast('No matched rows to import', 'error')
      return
    }

    setImporting(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setImporting(false)
      return
    }

    const inserts = readyRows.map(r => ({
      manager_id: user.id,
      member_id: r.member_id,
      log_date: r.date || new Date().toISOString().split('T')[0],
      pick_rate: r.pick_rate,
      accuracy: r.accuracy,
      attendance: r.attendance || 'Full week',
      notes: r.notes,
    }))

    const { error } = await supabase.from('performance_logs').insert(inserts)
    if (error) {
      showToast('Import failed: ' + error.message, 'error')
    } else {
      showToast(`Successfully imported ${readyRows.length} row${readyRows.length !== 1 ? 's' : ''}`, 'success')
      setStep(1)
      setParsed(null)
      setFileName('')
      setMapping({})
      setMatchedRows([])
    }
    setImporting(false)
  }

  function reset() {
    setStep(1)
    setParsed(null)
    setFileName('')
    setMapping({})
    setMatchedRows([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const readyCount = matchedRows.filter(r => r.matched).length
  const skippedCount = matchedRows.filter(r => !r.matched).length

  return (
    <div style={{ padding: '40px 48px', maxWidth: '1000px' }}>
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
          Import Data
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: '13px', margin: 0 }}>
          Bulk import performance logs from CSV or Excel files
        </p>
      </div>

      {/* Step indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0',
          marginBottom: '32px',
        }}
      >
        {(['Upload', 'Map Columns', 'Review & Import'] as const).map((label, i) => {
          const stepNum = (i + 1) as 1 | 2 | 3
          const isActive = step === stepNum
          const isDone = step > stepNum
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  background: isActive
                    ? '#2557ff'
                    : isDone
                    ? 'rgba(22,163,74,0.12)'
                    : 'rgba(107,104,120,0.1)',
                  transition: 'all 0.2s',
                }}
              >
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: isActive ? 'rgba(255,255,255,0.2)' : isDone ? '#16a34a' : 'rgba(107,104,120,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    color: isActive ? '#fff' : isDone ? '#fff' : 'var(--text2)',
                    fontFamily: 'DM Mono, monospace',
                    fontWeight: 700,
                  }}
                >
                  {isDone ? '✓' : stepNum}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#fff' : isDone ? '#16a34a' : 'var(--text2)',
                  }}
                >
                  {label}
                </span>
              </div>
              {i < 2 && (
                <div
                  style={{
                    width: '32px',
                    height: '1px',
                    background: isDone ? '#16a34a' : 'var(--border)',
                    margin: '0 4px',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* STEP 1 — Upload */}
      {step === 1 && (
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '40px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#2557ff' : 'var(--border)'}`,
              borderRadius: '12px',
              padding: '64px 40px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'rgba(37,87,255,0.04)' : 'var(--surface)',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⬆️</div>
            <div
              style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: '18px',
                color: 'var(--ink)',
                marginBottom: '8px',
              }}
            >
              Drop your file here
            </div>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text2)',
                fontFamily: 'DM Sans, sans-serif',
                marginBottom: '20px',
              }}
            >
              Supports .csv, .xlsx, .xls
            </div>
            <div
              style={{
                display: 'inline-block',
                padding: '8px 20px',
                background: '#2557ff',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Browse files
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />

          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              background: 'rgba(37,87,255,0.04)',
              border: '1px solid rgba(37,87,255,0.12)',
              borderRadius: '10px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontFamily: 'DM Mono, monospace',
                color: '#2557ff',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Expected columns
            </div>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              {['Member Name', 'Date', 'Pick Rate %', 'Accuracy %', 'Attendance', 'Notes'].map(col => (
                <span
                  key={col}
                  style={{
                    padding: '3px 10px',
                    background: 'rgba(37,87,255,0.08)',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontFamily: 'DM Mono, monospace',
                    color: '#2557ff',
                    border: '1px solid rgba(37,87,255,0.15)',
                  }}
                >
                  {col}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 — Column Mapping */}
      {step === 2 && parsed && (
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
            <div>
              <h2
                style={{
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 700,
                  fontSize: '16px',
                  color: 'var(--ink)',
                  margin: '0 0 2px 0',
                }}
              >
                Map Columns
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text2)', margin: 0 }}>
                {fileName} — {parsed.rows.length} rows detected
              </p>
            </div>
            <button
              onClick={reset}
              style={{
                padding: '7px 14px',
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text2)',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              ← Back
            </button>
          </div>

          <div style={{ padding: '24px' }}>
            {/* Mapping table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Detected Column', 'Map to Field'].map(col => (
                    <th
                      key={col}
                      style={{
                        padding: '10px 16px',
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
                {parsed.headers.map(header => (
                  <tr key={header} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontFamily: 'DM Mono, monospace',
                          fontSize: '13px',
                          color: 'var(--ink)',
                          background: 'var(--surface)',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {header}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={mapping[header] || 'ignore'}
                        onChange={e =>
                          setMapping(prev => ({ ...prev, [header]: e.target.value as FieldTarget }))
                        }
                        style={{
                          padding: '7px 10px',
                          background: '#fff',
                          border: '1px solid var(--border)',
                          borderRadius: '7px',
                          fontSize: '13px',
                          color: 'var(--ink)',
                          fontFamily: 'DM Sans, sans-serif',
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        {FIELD_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Preview */}
            <div style={{ marginBottom: '24px' }}>
              <div style={labelStyle}>Preview (first 5 rows)</div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: '#fafaf9' }}>
                      {parsed.headers.map(h => (
                        <th
                          key={h}
                          style={{
                            padding: '8px 12px',
                            textAlign: 'left',
                            fontSize: '11px',
                            fontFamily: 'DM Mono, monospace',
                            color: 'var(--text2)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 5).map((row, i) => (
                      <tr
                        key={i}
                        style={{ borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}
                      >
                        {parsed.headers.map(h => (
                          <td
                            key={h}
                            style={{
                              padding: '8px 12px',
                              fontSize: '13px',
                              color: 'var(--ink)',
                              fontFamily: 'DM Sans, sans-serif',
                              maxWidth: '150px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {row[h] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              onClick={proceedToReview}
              style={{
                padding: '10px 24px',
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
              Next →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — Review & Import */}
      {step === 3 && (
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
            <div>
              <h2
                style={{
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 700,
                  fontSize: '16px',
                  color: 'var(--ink)',
                  margin: '0 0 2px 0',
                }}
              >
                Review & Import
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text2)', margin: 0 }}>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>{readyCount} rows ready to import</span>
                {skippedCount > 0 && (
                  <>, <span style={{ color: '#d97706', fontWeight: 600 }}>{skippedCount} rows skipped</span> (no member match)</>
                )}
              </p>
            </div>
            <button
              onClick={() => setStep(2)}
              style={{
                padding: '7px 14px',
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text2)',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              ← Back
            </button>
          </div>

          {skippedCount > 0 && (
            <div
              style={{
                margin: '16px 24px 0',
                padding: '12px 16px',
                background: 'rgba(217,119,6,0.06)',
                border: '1px solid rgba(217,119,6,0.2)',
                borderRadius: '10px',
                fontSize: '13px',
                color: '#d97706',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              ⚠️ {skippedCount} row{skippedCount !== 1 ? 's' : ''} could not be matched to a team member and will be skipped. Check that names match exactly (first + last name).
            </div>
          )}

          <div style={{ overflowX: 'auto', padding: '16px 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Status', 'Member', 'Date', 'Pick Rate', 'Accuracy', 'Attendance', 'Notes'].map(col => (
                    <th
                      key={col}
                      style={{
                        padding: '10px 16px',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontFamily: 'DM Mono, monospace',
                        color: 'var(--text2)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
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
                {matchedRows.map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: i < matchedRows.length - 1 ? '1px solid var(--border)' : 'none',
                      background: row.matched ? 'transparent' : 'rgba(217,119,6,0.02)',
                    }}
                  >
                    <td style={{ padding: '11px 16px' }}>
                      {row.matched ? (
                        <span
                          style={{
                            fontSize: '12px',
                            color: '#16a34a',
                            fontFamily: 'DM Mono, monospace',
                          }}
                        >
                          ✓ Matched
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '12px',
                            color: '#d97706',
                            fontFamily: 'DM Mono, monospace',
                          }}
                        >
                          ⚠ No match
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span
                        style={{
                          fontSize: '13px',
                          color: row.matched ? 'var(--ink)' : 'var(--text2)',
                          fontFamily: 'DM Sans, sans-serif',
                          fontWeight: row.matched ? 500 : 400,
                        }}
                      >
                        {row.member_name || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--text2)',
                          fontFamily: 'DM Mono, monospace',
                        }}
                      >
                        {row.date || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--ink)', fontFamily: 'DM Mono, monospace' }}>
                        {row.pick_rate !== null ? `${row.pick_rate}%` : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--ink)', fontFamily: 'DM Mono, monospace' }}>
                        {row.accuracy !== null ? `${row.accuracy}%` : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text2)', fontFamily: 'DM Sans, sans-serif' }}>
                        {row.attendance || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--text2)',
                          fontFamily: 'DM Sans, sans-serif',
                          maxWidth: '160px',
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.notes || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={reset}
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
              Start Over
            </button>
            <button
              onClick={handleImport}
              disabled={importing || readyCount === 0}
              style={{
                padding: '9px 24px',
                background: readyCount === 0 ? '#9ca3af' : '#2557ff',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'DM Sans, sans-serif',
                cursor: importing || readyCount === 0 ? 'not-allowed' : 'pointer',
                opacity: importing ? 0.7 : 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => {
                if (!importing && readyCount > 0) e.currentTarget.style.background = '#1a44e0'
              }}
              onMouseLeave={e => {
                if (!importing && readyCount > 0) e.currentTarget.style.background = '#2557ff'
              }}
            >
              {importing ? 'Importing...' : `Import ${readyCount} row${readyCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
