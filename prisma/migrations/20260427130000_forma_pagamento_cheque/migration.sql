-- Enum `FormaPagamento` em 20260420120000_pagamento não incluía CHEQUE; o schema Prisma tem.
ALTER TYPE "FormaPagamento" ADD VALUE 'CHEQUE';
