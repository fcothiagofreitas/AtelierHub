import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getActiveStoreContext } from "@/lib/session";
import { AppShell } from "@/modules/shell/components/app-shell";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/admin/lojas": "Lojas",
  "/admin/usuarios": "Usuários",
  "/vendas": "Vendas",
  "/estoque": "Estoque",
  "/configuracoes": "Configurações",
};

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { session, stores, activeStore } = await getActiveStoreContext();

  if (stores.length === 0) redirect("/login");

  if (stores.length > 1 && !activeStore) redirect("/select-store");

  return (
    <AppShell
      pageTitle="AtelierHub"
      userName={session.user.name}
      userEmail={session.user.email}
      userRole={session.user.role}
      stores={stores.map((s) => ({
        id: s.id,
        name: s.name,
        kind: s.kind,
      }))}
      activeStoreId={activeStore?.id ?? null}
      activeStoreName={activeStore?.name ?? "Nenhuma loja selecionada"}
    >
      {children}
    </AppShell>
  );
}
