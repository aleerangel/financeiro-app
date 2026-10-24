import { redirect } from 'next/navigation';

export default function MensalidadesPage() {
  redirect('/clientes?tab=subscriptions');
}
