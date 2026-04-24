'use client'

import Script from 'next/script'
import { useCallback, useEffect, useRef } from 'react'

interface TurnstileWidgetProps {
  siteKey: string
  onSuccess: (token: string) => void
  onError?: () => void
  onExpire?: () => void
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
        }
      ) => string
      reset: (widgetId: string) => void
    }
  }
}

export function TurnstileWidget({ siteKey, onSuccess, onError, onExpire }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  const render = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) return
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onSuccess,
      'error-callback': onError,
      'expired-callback': onExpire,
    })
  }, [siteKey, onSuccess, onError, onExpire])

  useEffect(() => {
    // If the Turnstile script is already loaded, render immediately.
    if (window.turnstile) {
      render()
      return
    }
    // Poll until the script is ready.
    const interval = setInterval(() => {
      if (window.turnstile) {
        clearInterval(interval)
        render()
      }
    }, 100)
    return () => clearInterval(interval)
  }, [render])

  if (!siteKey) {
    return (
      <div className="rounded border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-400">
        Turnstile not configured (dev mode)
      </div>
    )
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />
      <div ref={containerRef} />
    </>
  )
}
