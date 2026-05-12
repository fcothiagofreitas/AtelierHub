-- Insere "Cliente Avulso" para cada loja operacional que ainda não tenha um cliente padrão de venda avulsa.
INSERT INTO "Cliente" (
  id,
  "tenantId",
  "storeId",
  tipo,
  nome,
  "isActive",
  "isBlocked",
  "vendaRapidaPadrao",
  "creditoTroca",
  "ieIsento",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  s."tenantId",
  s.id,
  'PF',
  'Cliente Avulso',
  true,
  false,
  true,
  0,
  false,
  NOW(),
  NOW()
FROM "Store" s
WHERE s.kind = 'OPERATIONAL'
  AND NOT EXISTS (
    SELECT 1 FROM "Cliente" c
    WHERE c."storeId" = s.id AND c."vendaRapidaPadrao" = true
  );
