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
  const [copied, setCopied] = useState(false)
  const url = `${appUrl}/p/${pollId}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const el = document.createElement('input')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={
        className ??
        'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50'
      }
      aria-label="Copy poll link"
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}
