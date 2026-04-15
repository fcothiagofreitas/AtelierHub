import { requireRole } from "@/lib/authorization";
import { GradeTamanhoNovoForm } from "@/modules/catalogo/components/grade-tamanho-novo-form";

export default async function NovaGradeTamanhoPage() {
  await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);

  return <GradeTamanhoNovoForm />;
}
