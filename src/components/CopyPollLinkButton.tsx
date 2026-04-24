'use client'

import { useState } from 'react'

interface CopyPollLinkButtonProps {
  pollId: string
  appUrl: string
  className?: string
  label?: string
}

export function CopyPollLinkButton({
  pollId,
  appUrl,
  className,
  label = 'Copy link',
}: CopyPollLinkButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const url = `${appUrl}/p/${pollId}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setStatus('copied')
      setTimeout(() => setStatus('idle'), 2000)
      return
    } catch {
      // try legacy fallback
    }

    try {
      const el = document.createElement('input')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setStatus('copied')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('failed')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <div>
      <button
        onClick={handleCopy}
        className={
          className ??
          'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50'
        }
        aria-label="Copy poll link"
      >
        {status === 'copied' ? 'Copied!' : status === 'failed' ? 'Copy failed' : label}
      </button>
    </div>
  )
}
