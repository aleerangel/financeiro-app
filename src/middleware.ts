import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Caso o Supabase redirecione o ?code= do OAuth para a raiz (/), encaminha para /auth/callback
  if (pathname === '/' && request.nextUrl.searchParams.has('code')) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = '/auth/callback';
    return NextResponse.redirect(callbackUrl);
  }

  const isAuthPage = pathname.startsWith('/login');
  const isPwaFile =
    pathname === '/sw.js' ||
    pathname === '/manifest.webmanifest' ||
    pathname.startsWith('/icons/') ||
    pathname === '/favicon.ico';
  const isPublicRoute = isAuthPage || pathname.startsWith('/auth') || isPwaFile;

  // Otimização de alta velocidade: se não há cookies de autenticação do Supabase,
  // evita chamadas externas de rede desnecessárias.
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.startsWith('sb-') && (c.name.includes('auth-token') || c.name.endsWith('-token'))
  );

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Não autenticado tentando acessar rota privada -> redireciona direto sem latência de rede
  if (!hasAuthCookie && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Visitando rota pública sem autenticação -> libera imediatamente
  if (!hasAuthCookie && isPublicRoute) {
    if (!isPwaFile) {
      response.headers.set(
        'Cache-Control',
        'private, no-cache, no-store, max-age=0, must-revalidate'
      );
    }
    return response;
  }

  // Usuário possui cookie de autenticação: valida e atualiza tokens de sessão
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redireciona quem não está logado para o login se tentar acessar qualquer rota privada
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url, { headers: response.headers });
  }

  // Redireciona quem já está logado para o dashboard se tentar abrir o login
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url, { headers: response.headers });
  }

  // Impede qualquer cache de páginas autenticadas no navegador, CDN ou proxy
  if (!isPwaFile) {
    response.headers.set(
      'Cache-Control',
      'private, no-cache, no-store, max-age=0, must-revalidate'
    );
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)',
  ],
};
