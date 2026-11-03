import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncAndGenerateNotifications } from '@/lib/actions/notifications';

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  // 1. Validação do segredo de autorização
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'financeiro_cron_secret_key_2026';
  const url = new URL(req.url);
  const secretQuery = url.searchParams.get('secret');

  const isAuthorized =
    (authHeader && authHeader === `Bearer ${cronSecret}`) ||
    secretQuery === cronSecret ||
    // Permite chamadas locais em desenvolvimento
    process.env.NODE_ENV === 'development';

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.' },
      { status: 500 }
    );
  }

  try {
    // 2. Busca todos os usuários com preferências de notificação ativas
    const { data: usersWithPrefs, error } = await adminClient
      .from('user_notification_preferences')
      .select('user_id')
      .or('push_notifications_enabled.eq.true,notify_bills.eq.true,notify_credits.eq.true');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let processedCount = 0;
    let totalAlertsGenerated = 0;

    for (const record of usersWithPrefs || []) {
      try {
        const res = await syncAndGenerateNotifications(record.user_id);
        totalAlertsGenerated += res.createdCount;
        processedCount++;
      } catch (userErr) {
        console.warn(`Erro ao processar notificações do usuário ${record.user_id}:`, userErr);
      }
    }

    return NextResponse.json({
      success: true,
      processedUsers: processedCount,
      totalAlertsGenerated,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno do cron' },
      { status: 500 }
    );
  }
}
