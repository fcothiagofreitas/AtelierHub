"use client";

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
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type ConfirmActionButtonProps = {
  title: string;
  description: string;
  actionLabel: string;
  triggerLabel: string;
  triggerClassName?: string;
  actionClassName?: string;
  formAction: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string>;
};

export function ConfirmActionButton({
  title,
  description,
  actionLabel,
  triggerLabel,
  triggerClassName,
  actionClassName,
  formAction,
  hiddenFields,
}: ConfirmActionButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>
        <span className={cn(buttonVariants({ variant: "ghost", size: "sm" }), triggerClassName)}>
          {triggerLabel}
        </span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <form action={formAction}>
            {Object.entries(hiddenFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <AlertDialogAction type="submit" className={cn("w-full", actionClassName)}>
              {actionLabel}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
