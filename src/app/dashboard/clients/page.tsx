import { listClientsAction } from "@/modules/clients/client.actions";
import { ClientsPageClient } from "./_components/ClientsPageClient";

export default async function ClientsPage() {
  const result = await listClientsAction();
  const clients = result.success ? result.data : [];

  return <ClientsPageClient initialClients={clients} />;
}
