import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getActiveStoreContext } from "@/lib/session";
import { AppShell } from "@/modules/shell/components/app-shell";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { session, stores, activeStore, needsStoreSelection } =
    await getActiveStoreContext();

  if (stores.length === 0) redirect("/login");

  if (needsStoreSelection) redirect("/select-store");

  return (
    <AppShell
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
