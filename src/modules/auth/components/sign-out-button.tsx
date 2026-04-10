"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="rounded-xl"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut className="mr-2 size-4" />
      Sair
    </Button>
  );
}
