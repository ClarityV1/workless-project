import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions)
            )
          },
        },
      }
    )

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { member_id, review_type } = body

    if (!member_id || !review_type) {
      return NextResponse.json({ error: 'member_id and review_type are required' }, { status: 400 })
    }

    // Get profile with Gemini API key
    const { data: profile } = await supabase
      .from('profiles')
      .select('gemini_api_key, name, role, site')
      .eq('id', user.id)
      .single()

    if (!profile?.gemini_api_key) {
      return NextResponse.json(
        { error: 'No Gemini API key configured. Please add your API key in Settings.' },
        { status: 400 }
      )
    }

    // Get team member
    const { data: member } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', member_id)
      .eq('manager_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Get last 6 performance logs
    const { data: logs } = await supabase
      .from('performance_logs')
      .select('*')
      .eq('member_id', member_id)
      .eq('manager_id', user.id)
      .order('log_date', { ascending: false })
      .limit(6)

    // Build performance summary
    const perfSummary =
      logs && logs.length > 0
        ? logs
            .map(
              l =>
                `- ${l.log_date}: Pick Rate ${l.pick_rate ?? 'N/A'}%, Accuracy ${l.accuracy ?? 'N/A'}%, Attendance: ${l.attendance}${l.notes ? ` (${l.notes})` : ''}`
            )
            .join('\n')
        : 'No performance data recorded yet.'

    const startDate = member.start_date
      ? new Date(member.start_date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'not recorded'

    const managerName = profile.name || 'the manager'
    const site = profile.site || 'the site'

    const prompt = `You are an experienced warehouse shift manager named ${managerName} at ${site}.
Write a professional ${review_type} document for the following team member.

TEAM MEMBER DETAILS:
- Name: ${member.first_name} ${member.last_name}
- Role: ${member.role}
- Shift: ${member.shift}
- Status: ${member.status}
- Start Date: ${startDate}
${member.notes ? `- Manager Notes: ${member.notes}` : ''}

RECENT PERFORMANCE DATA (last 6 entries):
${perfSummary}

REVIEW TYPE: ${review_type}

Please write a complete, professional ${review_type} document. The document should:
1. Have a clear header with the review type, employee name, date, and manager name
2. Cover key performance areas relevant to a warehouse operative (pick rate, accuracy, attendance, teamwork, adherence to H&S)
3. Be balanced, constructive and professional in tone
4. Include specific action points or next steps where appropriate
5. Be suitable for an HR file
6. Be written in UK English
7. Be approximately 400-600 words

Format the document clearly with appropriate sections. Do not use markdown — use plain text with clear section headings in UPPERCASE.`

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${profile.gemini_api_key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json().catch(() => ({}))
      const errorMessage =
        errorData?.error?.message || `Gemini API error: ${geminiResponse.status}`
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

    const geminiData = await geminiResponse.json()
    const generatedText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!generatedText) {
      return NextResponse.json({ error: 'No content generated from Gemini' }, { status: 500 })
    }

    return NextResponse.json({ text: generatedText })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
