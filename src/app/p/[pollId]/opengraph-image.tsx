import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_URL } from '@/lib/config'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Props {
  params: Promise<{ pollId: string }>
}

export default async function OpengraphImage({ params }: Props) {
  const { pollId } = await params
  const supabase = createAdminClient()
  const { data: poll } = await supabase
    .from('polls')
    .select('question, yes_count, no_count, total_count')
    .eq('short_id', pollId)
    .single()

  const question = poll?.question ?? 'Vote now!'
  const total = poll?.total_count ?? 0
  const yesP = total > 0 ? Math.round(((poll?.yes_count ?? 0) / total) * 100) : 50
  const noP = total > 0 ? 100 - yesP : 50

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #312e81 0%, #4338ca 50%, #6366f1 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Logo */}
        <div style={{ color: '#a5b4fc', fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>
          🗳 DemocracyLive
        </div>

        {/* Question */}
        <div
          style={{
            color: 'white',
            fontSize: question.length > 80 ? '36px' : '48px',
            fontWeight: 800,
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: '1000px',
            marginBottom: '48px',
          }}
        >
          {question}
        </div>

        {/* Bars */}
        <div style={{ display: 'flex', gap: '24px', width: '100%', maxWidth: '900px', marginBottom: '32px' }}>
          {/* YES */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', fontSize: '28px', fontWeight: 700 }}>
              <span>👍 YES</span>
              <span>{yesP}%</span>
            </div>
            <div style={{ height: '20px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${yesP}%`, background: '#4ade80', borderRadius: '10px' }} />
            </div>
          </div>

          {/* NO */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', fontSize: '28px', fontWeight: 700 }}>
              <span>👎 NO</span>
              <span>{noP}%</span>
            </div>
            <div style={{ height: '20px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${noP}%`, background: '#f87171', borderRadius: '10px' }} />
            </div>
          </div>
        </div>

        {/* Total votes */}
        <div style={{ color: '#c7d2fe', fontSize: '20px', marginBottom: '24px' }}>
          {total.toLocaleString()} vote{total !== 1 ? 's' : ''} cast
        </div>

        {/* CTA */}
        <div
          style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '14px 28px',
            color: 'white',
            fontSize: '22px',
            fontWeight: 600,
          }}
        >
          Vote now: {APP_URL}/p/{pollId}
        </div>
      </div>
    ),
    { ...size }
  )
}
