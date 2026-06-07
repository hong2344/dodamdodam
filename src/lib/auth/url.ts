export function getSiteOrigin(request?: Request) {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  }

  if (request) {
    const requestUrl = new URL(request.url)
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https'

    if (forwardedHost) {
      const host = forwardedHost.split(',')[0]?.trim()
      const proto = forwardedProto.split(',')[0]?.trim() || 'https'

      if (host) {
        return `${proto}://${host}`
      }
    }

    return requestUrl.origin
  }

  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return ''
}

export function getSiteUrl(path: string, request?: Request) {
  return `${getSiteOrigin(request)}${path}`
}
