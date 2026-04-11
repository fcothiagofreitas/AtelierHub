import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/modules/auth/schemas/login-schema";

type AuthorizedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  storeIds: string[];
  defaultStoreId: string | null;
};

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: {
            email: parsed.data.email.toLowerCase(),
            isActive: true,
          },
          include: {
            stores: {
              include: {
                store: true,
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

        if (!user) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );

        if (!passwordMatches) {
          return null;
        }

        const storeIds = user.stores.map((access) => access.storeId);
        const defaultAccess =
          user.stores.find((access) => access.isDefault) ?? user.stores[0];

        const authorizedUser: AuthorizedUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          storeIds,
          defaultStoreId: defaultAccess?.storeId ?? null,
        };

        return authorizedUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authorizedUser = user as AuthorizedUser;

        token.role = authorizedUser.role;
        token.tenantId = authorizedUser.tenantId;
        token.storeIds = authorizedUser.storeIds;
        token.defaultStoreId = authorizedUser.defaultStoreId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role;
        session.user.tenantId = token.tenantId;
        session.user.storeIds = token.storeIds;
        session.user.defaultStoreId = token.defaultStoreId;
      }

      return session;
    },
  },
};
