import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { cookieSecureForApp } from "@/lib/cookie-secure";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  /** Alinha com HTTP (ex.: VPS por IP sem TLS): cookies Secure só com HTTPS. */
  useSecureCookies: cookieSecureForApp(),
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findFirst({
          where: {
            email: credentials.email.toLowerCase().trim(),
            isActive: true,
          },
          include: {
            colaborador: {
              include: {
                stores: {
                  where: { store: { isActive: true } },
                  orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
                  select: { storeId: true, isDefault: true },
                },
              },
            },
          },
        });

        if (!user || !user.colaborador) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );
        if (!passwordMatch) return null;

        const storeIds = user.colaborador.stores.map((s) => s.storeId);
        const defaultStore = user.colaborador.stores.find((s) => s.isDefault);

        return {
          id: user.id,
          colaboradorId: user.colaborador.id,
          name: user.colaborador.name,
          email: user.email,
          tenantId: user.tenantId,
          role: user.colaborador.role,
          storeIds,
          defaultStoreId: defaultStore?.storeId ?? storeIds[0] ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.colaboradorId = user.colaboradorId;
        token.tenantId = user.tenantId;
        token.role = user.role;
        token.storeIds = user.storeIds;
        token.defaultStoreId = user.defaultStoreId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.colaboradorId = token.colaboradorId;
      session.user.tenantId = token.tenantId;
      session.user.role = token.role;
      session.user.storeIds = token.storeIds;
      session.user.defaultStoreId = token.defaultStoreId;
      return session;
    },
  },
};
