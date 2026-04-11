"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type LoginInput, loginSchema } from "@/modules/auth/schemas/login-schema";

type LoginFormProps = {
  callbackUrl?: string;
};

export function LoginForm({ callbackUrl = "/dashboard" }: LoginFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginInput) {
    setSubmitError(null);

    const result = await signIn("credentials", {
      ...values,
      redirect: false,
      callbackUrl,
    });

    if (!result || result.error) {
      setSubmitError("E-mail ou senha invalidos.");
      return;
    }

    router.push(result.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <Card className="w-full overflow-hidden rounded-lg border-slate-200 bg-white shadow-[0_24px_70px_-36px_rgba(15,23,42,0.2)]">
      <CardHeader className="space-y-5 border-b border-slate-200 bg-slate-50/60 p-7 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-white shadow-sm">
            <LockKeyhole className="size-5" />
          </div>
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            <ShieldCheck className="size-3.5 text-slate-400" />
            Acesso seguro
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-sky-600 text-xs font-semibold text-white">
              AH
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">AtelierHub</p>
              <p className="text-xs text-slate-500">Sistema operacional de loja</p>
            </div>
          </div>
          <CardTitle className="text-[1.625rem] tracking-tight text-slate-950">
            Acessar o painel
          </CardTitle>
          <CardDescription className="text-sm leading-6 text-slate-500">
            Entre com seu e-mail e senha para abrir a operacao da marca.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-7">
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2.5">
            <Label htmlFor="email" className="text-sm font-medium text-slate-700">
              E-mail
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="voce@empresa.com"
                className="h-11 rounded-md border-slate-200 bg-slate-100/80 pl-11 text-slate-950 shadow-none transition focus-visible:border-sky-200 focus-visible:bg-white"
                {...form.register("email")}
              />
            </div>
            {form.formState.errors.email ? (
              <p className="text-sm text-red-600">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">
              Senha
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Sua senha"
              className="h-11 rounded-md border-slate-200 bg-slate-100/80 text-slate-950 shadow-none transition focus-visible:border-sky-200 focus-visible:bg-white"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-sm text-red-600">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          {submitError ? (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          ) : null}

          <Button
            type="submit"
            className="h-11 w-full rounded-md bg-sky-600 text-white shadow-sm transition hover:bg-sky-700"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <>
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
        <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-6 items-center justify-center rounded-md bg-white text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
              1
            </span>
            <div>
              <p className="font-medium text-slate-700">Usuario criado no seed</p>
              <p>Exemplo: `gerente@atelierhub.local`</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-6 items-center justify-center rounded-md bg-white text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
              2
            </span>
            <div>
              <p className="font-medium text-slate-700">Senha padrao</p>
              <p>`12345678`</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
