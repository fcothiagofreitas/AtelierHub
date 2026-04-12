"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authorization";
import { assertStoreInSession } from "@/modules/estoque/estoque-auth";
import {
  ajusteConferenciaEstoque,
  entradaManualEstoque,
  findVariacaoIdByEan13,
  saidaDefeitoEstoque,
  transferenciaEstoque,
} from "@/modules/estoque/estoque-service";
import { ESTOQUE_ROLES_ESCRITA } from "@/modules/estoque/estoque-roles";

export type EstoqueActionResult = { error?: string; ok?: boolean };

function revalidateEstoque() {
  revalidatePath("/admin/estoque");
  revalidatePath("/admin/estoque/consulta");
  revalidatePath("/admin/estoque/historico");
}

export async function estoqueEntradaManual(
  _prev: EstoqueActionResult | null,
  formData: FormData,
): Promise<EstoqueActionResult> {
  const session = await requireRole(ESTOQUE_ROLES_ESCRITA);
  const tenantId = session.user.tenantId;
  const storeId = String(formData.get("storeId") || "");
  const ean = String(formData.get("ean") || "");
  const qRaw = String(formData.get("quantidade") || "");
  const quantidade = Number.parseInt(qRaw, 10);

  try {
    assertStoreInSession(session, storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return { error: "Informe uma quantidade inteira positiva." };
  }

  const variacaoId =
    (await findVariacaoIdByEan13(tenantId, ean)) ??
    (String(formData.get("produtoVariacaoId") || "").trim() || null);
  if (!variacaoId) {
    return { error: "Informe um EAN-13 válido ou selecione a variação." };
  }

  try {
    await entradaManualEstoque({
      tenantId,
      userId: session.user.id,
      storeId,
      produtoVariacaoId: variacaoId,
      quantidade,
    });
    revalidateEstoque();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha ao registar entrada." };
  }
}

export async function estoqueSaidaDefeito(
  _prev: EstoqueActionResult | null,
  formData: FormData,
): Promise<EstoqueActionResult> {
  const session = await requireRole(ESTOQUE_ROLES_ESCRITA);
  const tenantId = session.user.tenantId;
  const storeId = String(formData.get("storeId") || "");
  const ean = String(formData.get("ean") || "");
  const qRaw = String(formData.get("quantidade") || "");
  const quantidade = Number.parseInt(qRaw, 10);
  const motivo = String(formData.get("motivo") || "").trim() || null;

  try {
    assertStoreInSession(session, storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return { error: "Informe uma quantidade inteira positiva." };
  }

  const variacaoId =
    (await findVariacaoIdByEan13(tenantId, ean)) ??
    (String(formData.get("produtoVariacaoId") || "").trim() || null);
  if (!variacaoId) {
    return { error: "Informe um EAN-13 válido ou a variação." };
  }

  try {
    await saidaDefeitoEstoque({
      tenantId,
      userId: session.user.id,
      storeId,
      produtoVariacaoId: variacaoId,
      quantidade,
      motivo,
    });
    revalidateEstoque();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha ao registar saída." };
  }
}

export async function estoqueTransferencia(
  _prev: EstoqueActionResult | null,
  formData: FormData,
): Promise<EstoqueActionResult> {
  const session = await requireRole(ESTOQUE_ROLES_ESCRITA);
  const tenantId = session.user.tenantId;
  const origem = String(formData.get("storeOrigemId") || "");
  const destino = String(formData.get("storeDestinoId") || "");
  const ean = String(formData.get("ean") || "");
  const qRaw = String(formData.get("quantidade") || "");
  const quantidade = Number.parseInt(qRaw, 10);

  try {
    assertStoreInSession(session, origem);
    assertStoreInSession(session, destino);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return { error: "Informe uma quantidade inteira positiva." };
  }

  const variacaoId =
    (await findVariacaoIdByEan13(tenantId, ean)) ??
    (String(formData.get("produtoVariacaoId") || "").trim() || null);
  if (!variacaoId) {
    return { error: "Informe um EAN-13 válido ou a variação." };
  }

  try {
    await transferenciaEstoque({
      tenantId,
      userId: session.user.id,
      storeOrigemId: origem,
      storeDestinoId: destino,
      produtoVariacaoId: variacaoId,
      quantidade,
    });
    revalidateEstoque();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha na transferência." };
  }
}

export async function estoqueAjusteConferencia(
  _prev: EstoqueActionResult | null,
  formData: FormData,
): Promise<EstoqueActionResult> {
  const session = await requireRole(ESTOQUE_ROLES_ESCRITA);
  const tenantId = session.user.tenantId;
  const storeId = String(formData.get("storeId") || "");
  const ean = String(formData.get("ean") || "");
  const dRaw = String(formData.get("delta") || "");
  const delta = Number.parseInt(dRaw, 10);
  const motivo = String(formData.get("motivo") || "").trim() || null;

  try {
    assertStoreInSession(session, storeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  if (!Number.isFinite(delta) || delta === 0) {
    return { error: "Informe um ajuste inteiro (positivo ou negativo), diferente de zero." };
  }

  const variacaoId =
    (await findVariacaoIdByEan13(tenantId, ean)) ??
    (String(formData.get("produtoVariacaoId") || "").trim() || null);
  if (!variacaoId) {
    return { error: "Informe um EAN-13 válido ou a variação." };
  }

  try {
    await ajusteConferenciaEstoque({
      tenantId,
      userId: session.user.id,
      storeId,
      produtoVariacaoId: variacaoId,
      delta,
      motivo,
    });
    revalidateEstoque();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha no ajuste." };
  }
}
