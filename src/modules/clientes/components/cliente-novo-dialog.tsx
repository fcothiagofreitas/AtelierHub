"use client";

import { useCallback, useState } from "react";
import { Building2, User, UserRoundPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ClienteFormPf } from "@/modules/clientes/components/cliente-form-pf";
import { ClienteFormPj } from "@/modules/clientes/components/cliente-form-pj";

type CorretorOpt = { id: string; name: string };

type Props = {
  storeId: string;
  corretores: CorretorOpt[];
  /** Toolbar: compact. Empty: outline, para estado vazio da lista. Icon: só ícone (ex.: PDV). */
  trigger?: "toolbar" | "empty" | "icon";
  /** Após salvar com sucesso (ex.: `/vendas?pdv=1`). */
  redirectAfterSave?: string;
  disabled?: boolean;
};

export function ClienteNovoDialog({
  storeId,
  corretores,
  trigger = "toolbar",
  redirectAfterSave,
  disabled = false,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipo, setTipo] = useState<"PF" | "PJ" | null>(null);
  const [formKey, setFormKey] = useState(0);

  const openWithTipo = useCallback((t: "PF" | "PJ") => {
    setTipo(t);
    setFormKey((k) => k + 1);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setTipo(null);
  }, []);

  const isToolbar = trigger === "toolbar";
  const isIcon = trigger === "icon";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          className={cn(
            buttonVariants({
              size: isIcon ? "icon-sm" : isToolbar ? "sm" : "default",
              variant: isIcon ? "outline" : isToolbar ? "default" : "outline",
            }),
            !isToolbar && !isIcon && "w-full justify-center gap-2 sm:w-auto",
            (isToolbar || isIcon) && "gap-2",
            isIcon && "shrink-0",
          )}
          aria-label={isIcon ? "Novo cliente" : undefined}
        >
          <UserRoundPlus className="size-4 shrink-0" />
          {!isIcon ? "Novo cliente" : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onClick={() => openWithTipo("PF")}>
            <User className="size-4" />
            Pessoa física
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openWithTipo("PJ")}>
            <Building2 className="size-4" />
            Pessoa jurídica
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={dialogOpen}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next) setTipo(null);
        }}
      >
        <DialogContent
          className={cn(
            "flex max-h-[min(90vh,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0",
            "max-w-2xl",
          )}
        >
          <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12 text-left">
            <DialogTitle>
              {tipo === "PJ" ? "Nova pessoa jurídica" : "Nova pessoa física"}
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {tipo === "PF" && (
              <ClienteFormPf
                key={formKey}
                storeId={storeId}
                corretores={corretores}
                onCancel={closeDialog}
                redirectAfterSave={redirectAfterSave}
              />
            )}
            {tipo === "PJ" && (
              <ClienteFormPj
                key={formKey}
                storeId={storeId}
                corretores={corretores}
                onCancel={closeDialog}
                redirectAfterSave={redirectAfterSave}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
