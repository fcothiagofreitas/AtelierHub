import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: UserRole;
      tenantId?: string;
      storeIds?: string[];
      defaultStoreId?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    tenantId?: string;
    storeIds?: string[];
    defaultStoreId?: string | null;
  }
}
