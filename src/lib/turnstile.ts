/**
 * Verify a Cloudflare Turnstile token server-side.
 * Returns true when the token is valid (or when the secret key is not
 * configured, so that local development works without Turnstile set up).
 */
export async function verifyTurnstile(
  token: string | undefined | null,
  ip?: string
): Promise<boolean> {
  if (!token) return false

  const secretKey = process.env.TURNSTILE_SECRET_KEY
  if (!secretKey) {
    // Allow requests in development when the secret key is absent.
    console.warn('[turnstile] TURNSTILE_SECRET_KEY not set – skipping verification (dev mode)')
    return true
  }

  const formData = new FormData()
  formData.append('secret', secretKey)
  formData.append('response', token)
  if (ip) formData.append('remoteip', ip)

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    })
    const data = (await res.json()) as { success: boolean }
    return data.success === true
  } catch {
    return false
  }
}
