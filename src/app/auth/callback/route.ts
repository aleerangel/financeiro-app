import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSafeRedirectPath } from '@/lib/safe-redirect';

const SAFE_HOST_REGEX = /^[a-zA-Z0-9.-]+(?::\d+)?$/;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const safeNext = getSafeRedirectPath(searchParams.get('next'), '/dashboard');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      let baseOrigin = origin;
      if (!isLocalEnv && forwardedHost && SAFE_HOST_REGEX.test(forwardedHost)) {
        baseOrigin = `https://${forwardedHost}`;
      }
      const redirectUrl = new URL(safeNext, baseOrigin).toString();
      const response = NextResponse.redirect(redirectUrl);
      response.headers.set(
        'Cache-Control',
        'private, no-cache, no-store, max-age=0, must-revalidate'
      );
      return response;
    }
  }

  // Se houver erro, redireciona de volta para o login
  return NextResponse.redirect(`${origin}/login?error=auth-failed`);
}
