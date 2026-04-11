import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getActiveStoreContext } from "@/lib/session";
import { ProtectedShell } from "@/modules/auth/components/protected-shell";

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedLayout({
  children,
}: ProtectedLayoutProps) {
  const { session, availableStores, activeStore } = await getActiveStoreContext();

  if (availableStores.length === 0) {
    redirect("/login");
  }

  return (
    <ProtectedShell
      userName={session.user.name}
      userEmail={session.user.email}
      role={session.user.role}
      currentStoreId={activeStore?.id ?? null}
      currentStoreName={activeStore?.name ?? "Nenhuma loja selecionada"}
      stores={availableStores.map((store) => ({
        id: store.id,
        name: store.name,
        kind: store.kind,
      }))}
    >
      {children}
    </ProtectedShell>
  );
}
