import type { ReactNode } from "react";
import { NavHeader } from "./nav-header";

type StoreOption = {
  id: string;
  name: string;
  kind: "ADMINISTRATIVE" | "OPERATIONAL";
};

type FocusShellProps = {
  children: ReactNode;
  userName: string | null | undefined;
  stores: StoreOption[];
  activeStoreId: string | null;
  activeStoreName: string;
};

/**
 * Layout de tela cheia sem sidebar (ex.: cadastro longo com foco no formulário).
 */
export function FocusShell({
  children,
  userName,
  stores,
  activeStoreId,
  activeStoreName,
}: FocusShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <NavHeader
        userName={userName}
        stores={stores}
        activeStoreId={activeStoreId}
        activeStoreName={activeStoreName}
      />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
