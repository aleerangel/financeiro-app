import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      let redirectUrl = `${origin}${next}`;
      if (!isLocalEnv && forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`;
      }
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
