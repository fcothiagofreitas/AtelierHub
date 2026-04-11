"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 w-full rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut className="mr-2 size-4" />
      Sair
    </Button>
  );
}
