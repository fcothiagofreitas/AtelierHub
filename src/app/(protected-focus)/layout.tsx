import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getActiveStoreContext } from "@/lib/session";
import { FocusShell } from "@/modules/shell/components/focus-shell";

export default async function ProtectedFocusLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { session, stores, activeStore, needsStoreSelection } =
    await getActiveStoreContext();

  if (stores.length === 0) redirect("/login");

  if (needsStoreSelection) redirect("/select-store");

  return (
    <FocusShell
      userName={session.user.name}
      stores={stores.map((s) => ({
        id: s.id,
        name: s.name,
        kind: s.kind,
      }))}
      activeStoreId={activeStore?.id ?? null}
      activeStoreName={activeStore?.name ?? "Nenhuma loja selecionada"}
    >
      {children}
    </FocusShell>
  );
}
