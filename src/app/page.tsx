import { redirect } from 'next/navigation'

type RootPageProps = {
  searchParams?: Promise<{
    code?: string
    next?: string
  }>
}

export default async function RootPage({ searchParams }: RootPageProps) {
  const params = await searchParams

  if (params?.code) {
    const callbackUrl = new URL('/api/auth/callback', 'http://localhost')
    callbackUrl.searchParams.set('code', params.code)

    if (params.next) {
      callbackUrl.searchParams.set('next', params.next)
    }

    redirect(`${callbackUrl.pathname}${callbackUrl.search}`)
  }

  redirect('/login')
}
