"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { colaboradorFormSchema } from "@/modules/admin/schemas/colaborador-form-schema";

export type ColaboradorActionResult = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const ALLOWED: ["ADMIN_DA_MARCA", "ADMINISTRATIVO"] = [
  "ADMIN_DA_MARCA",
  "ADMINISTRATIVO",
];

const DEFAULT_RESET_PASSWORD = process.env.DEFAULT_RESET_PASSWORD ?? "Mudar@123";

export async function upsertColaborador(
  _prev: ColaboradorActionResult | null,
  formData: FormData,
): Promise<ColaboradorActionResult> {
  const session = await requireRole(ALLOWED);

  const parsed = colaboradorFormSchema.safeParse({
    id: String(formData.get("id") || "") || undefined,
    name: String(formData.get("name") || ""),
    cpf: String(formData.get("cpf") || "") || undefined,
    phone: String(formData.get("phone") || "") || undefined,
    role: String(formData.get("role") || ""),
    minCommission: formData.get("minCommission") ?? 0,
    admissionAt: String(formData.get("admissionAt") || "") || undefined,
    isActive: formData.get("isActive") === "on",
    storeIds: formData.getAll("storeIds").map(String).filter(Boolean),
    defaultStoreId: String(formData.get("defaultStoreId") || ""),
    hasSystemAccess: formData.get("hasSystemAccess") === "on",
    email: String(formData.get("email") || "") || undefined,
    password: String(formData.get("password") || "") || undefined,
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: Object.fromEntries(
        Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? ""]),
      ),
    };
  }

  const {
    id,
    name,
    cpf,
    phone,
    role,
    minCommission,
    admissionAt,
    isActive,
    storeIds,
    defaultStoreId,
    hasSystemAccess,
    email,
    password,
  } = parsed.data;

  let dbError: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      let userId: string | undefined;

      if (hasSystemAccess && email) {
        const normalizedEmail = email.toLowerCase().trim();

        if (id) {
          // Edição: buscar colaborador existente para saber se já tem User
          const existing = await tx.colaborador.findUnique({
            where: { id },
            select: { userId: true },
          });

          if (existing?.userId) {
            // Já tem user: atualizar email e senha se fornecida
            const updateData: { email?: string; passwordHash?: string } = {};
            if (email) updateData.email = normalizedEmail;
            if (password) updateData.passwordHash = await bcrypt.hash(password, 10);
            await tx.user.update({ where: { id: existing.userId }, data: updateData });
            userId = existing.userId;
          } else {
            // Não tem user: criar
            const hash = password
              ? await bcrypt.hash(password, 10)
              : await bcrypt.hash(DEFAULT_RESET_PASSWORD, 10);
            const newUser = await tx.user.create({
              data: {
                tenantId: session.user.tenantId,
                email: normalizedEmail,
                passwordHash: hash,
                isActive,
              },
            });
            userId = newUser.id;
          }
        } else {
          // Criação: sempre cria User novo
          const hash = password
            ? await bcrypt.hash(password, 10)
            : await bcrypt.hash(DEFAULT_RESET_PASSWORD, 10);
          const newUser = await tx.user.create({
            data: {
              tenantId: session.user.tenantId,
              email: normalizedEmail,
              passwordHash: hash,
              isActive,
            },
          });
          userId = newUser.id;
        }
      } else if (id) {
        // Acesso removido: desvincular User sem deletar (preserva histórico)
        const existing = await tx.colaborador.findUnique({
          where: { id },
          select: { userId: true },
        });
        if (existing?.userId) {
          await tx.colaborador.update({
            where: { id },
            data: { userId: null },
          });
          // Desativa o User para bloquear login
          await tx.user.update({
            where: { id: existing.userId },
            data: { isActive: false },
          });
        }
      }

      // Upsert do Colaborador
      if (id) {
        await tx.colaborador.update({
          where: { id },
          data: {
            name,
            cpf: cpf ?? null,
            phone: phone ?? null,
            role,
            minCommission,
            admissionAt: admissionAt ? new Date(admissionAt) : null,
            isActive,
            ...(userId !== undefined ? { userId } : {}),
          },
        });
        await tx.colaboradorStore.deleteMany({ where: { colaboradorId: id } });
        await tx.colaboradorStore.createMany({
          data: storeIds.map((storeId) => ({
            colaboradorId: id,
            storeId,
            isDefault: storeId === defaultStoreId,
          })),
        });
      } else {
        const colaborador = await tx.colaborador.create({
          data: {
            tenantId: session.user.tenantId,
            name,
            cpf: cpf ?? null,
            phone: phone ?? null,
            role,
            minCommission,
            admissionAt: admissionAt ? new Date(admissionAt) : null,
            isActive,
            userId: userId ?? null,
          },
        });
        await tx.colaboradorStore.createMany({
          data: storeIds.map((storeId) => ({
            colaboradorId: colaborador.id,
            storeId,
            isDefault: storeId === defaultStoreId,
          })),
        });
      }
    });
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return { fieldErrors: { email: "Já existe um usuário com este e-mail" } };
    }
    dbError = "Erro ao salvar. Tente novamente.";
  }

  if (dbError) return { error: dbError };

  revalidatePath("/admin/colaboradores");
  revalidatePath("/admin");
  redirect("/admin/colaboradores");
}

export async function toggleColaboradorActive(formData: FormData) {
  await requireRole(ALLOWED);

  const id = String(formData.get("id") || "");
  const isActive = formData.get("isActive") === "true";
  if (!id) redirect("/admin/colaboradores");

  try {
    await prisma.$transaction(async (tx) => {
      const colaborador = await tx.colaborador.update({
        where: { id },
        data: { isActive },
        select: { userId: true },
      });
      // Sincroniza o isActive do User vinculado
      if (colaborador.userId) {
        await tx.user.update({ where: { id: colaborador.userId }, data: { isActive } });
      }
    });
  } catch {
    // ignore
  }

  revalidatePath("/admin/colaboradores");
  redirect("/admin/colaboradores");
}

export async function resetColaboradorPassword(formData: FormData) {
  await requireRole(ALLOWED);

  const id = String(formData.get("id") || "");
  if (!id) redirect("/admin/colaboradores");

  try {
    const colaborador = await prisma.colaborador.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (colaborador?.userId) {
      await prisma.user.update({
        where: { id: colaborador.userId },
        data: { passwordHash: await bcrypt.hash(DEFAULT_RESET_PASSWORD, 10) },
      });
    }
  } catch {
    // ignore
  }

  revalidatePath("/admin/colaboradores");
  redirect("/admin/colaboradores?reset=ok");
}
