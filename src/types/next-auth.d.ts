import type { UserRole } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      colaboradorId: string;
      name?: string | null;
      email?: string | null;
      tenantId: string;
      role: UserRole;
      storeIds: string[];
      defaultStoreId: string | null;
    };
  }

  interface User {
    id: string;
    colaboradorId: string;
    tenantId: string;
    role: UserRole;
    storeIds: string[];
    defaultStoreId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    colaboradorId: string;
    tenantId: string;
    role: UserRole;
    storeIds: string[];
    defaultStoreId: string | null;
  }
}
