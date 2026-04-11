import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";

export default async function StoreSelectLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireSession();
  if (!session?.user?.id) redirect("/login");
  return <>{children}</>;
}
