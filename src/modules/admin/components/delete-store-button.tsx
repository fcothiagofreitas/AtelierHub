"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteStore } from "@/modules/admin/actions/store-actions";

export function DeleteStoreButton({
  storeId,
  storeName,
}: {
  storeId: string;
  storeName: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>
        <span
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-destructive hover:text-destructive hover:bg-destructive/10",
          )}
        >
          <Trash2 className="size-4" />
        </span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir loja</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir{" "}
            <span className="font-medium text-foreground">{storeName}</span>?
            Essa ação remove todos os vínculos de usuários com essa loja e não
            pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <form action={deleteStore}>
            <input type="hidden" name="id" value={storeId} />
            <AlertDialogAction
              type="submit"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full"
            >
              Excluir
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
