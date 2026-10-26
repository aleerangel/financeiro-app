import { NextResponse } from 'next/server';
import { loginOrCreateSandboxUser } from '@/lib/actions/dev-sandbox';
import { getSafeRedirectPath } from '@/lib/safe-redirect';

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse(
      'Dev auto-login só está disponível no ambiente local de desenvolvimento.',
      { status: 403 }
    );
  }

  const { searchParams, origin } = new URL(request.url);
  const mode = (searchParams.get('mode') === 'clean' ? 'clean' : 'demo') as 'clean' | 'demo';
  const returnTo = getSafeRedirectPath(searchParams.get('returnTo'), '/dashboard');

  try {
    await loginOrCreateSandboxUser(mode);
    const redirectUrl = new URL(returnTo, origin).toString();
    const response = NextResponse.redirect(redirectUrl);
    response.headers.set(
      'Cache-Control',
      'private, no-cache, no-store, max-age=0, must-revalidate'
    );
    return response;
  } catch (err: unknown) {
    console.error('Erro no auto-login de desenvolvimento:', err);
    return NextResponse.redirect(`${origin}/login?manual=true&error=auto-login-failed`);
  }
}

